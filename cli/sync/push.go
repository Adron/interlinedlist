package sync

import (
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// localImageRefRegex matches ![alt](path) where path is not http(s)
var localImageRefRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)

func isLocalPath(ref string) bool {
	ref = strings.TrimSpace(ref)
	return ref != "" && !strings.HasPrefix(ref, "http://") && !strings.HasPrefix(ref, "https://")
}

func (e *Engine) push() {
	if e.cfg.AuthToken == "" {
		log.Printf("Push skipped: no API key configured")
		return
	}

	var folderOps, createDocOps []syncOp
	type docImage struct {
		rel       string
		content   string
		dir       string
		docID     string
	}
	var docsWithImages []docImage

	// Walk and collect folders and documents
	_ = filepath.Walk(e.cfg.SyncRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		rel, err := filepath.Rel(e.cfg.SyncRoot, path)
		if err != nil || rel == "." {
			return nil
		}
		rel = filepath.ToSlash(rel)

		if info.IsDir() {
			folderOps = append(folderOps, syncOp{
				Op:   "create",
				Type: "folder",
				Path: rel,
				Data: map[string]string{"id": deterministicUUID(rel)},
			})
			return nil
		}
		return nil
	})

	// Build folder path -> id (deterministic + server state)
	folderPaths := make([]string, 0, len(folderOps))
	for _, op := range folderOps {
		folderPaths = append(folderPaths, op.Path)
	}
	folderIDByPath := e.buildFolderIDMap(folderPaths)

	// Second walk for documents (need folderIDByPath)
	_ = filepath.Walk(e.cfg.SyncRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(e.cfg.SyncRoot, path)
		if err != nil || rel == "." {
			return nil
		}
		rel = filepath.ToSlash(rel)
		if strings.HasSuffix(strings.ToLower(rel), ".md") {
			content, err := os.ReadFile(path)
			if err != nil {
				log.Printf("Push: read %s: %v", rel, err)
				return nil
			}
			contentStr := string(content)
			dir := filepath.Dir(path)
			dirRel, _ := filepath.Rel(e.cfg.SyncRoot, dir)
			dirRel = filepath.ToSlash(dirRel)
			if dirRel == "." {
				dirRel = ""
			}

			docID := deterministicUUID(rel)
			title := strings.TrimSuffix(filepath.Base(rel), ".md")
			folderID := folderIDByPath[dirRel]
			// Create document first (server requires doc to exist before image upload)
			createData := map[string]interface{}{
				"id":           docID,
				"title":        title,
				"content":      contentStr,
				"relativePath": rel,
			}
			if folderID != "" {
				createData["folderId"] = folderID
			}
			createDocOps = append(createDocOps, syncOp{
				Op:   "create",
				Type: "document",
				Path: rel,
				Data: createData,
			})

			// Track docs with local images for phase 2 (upload after create)
			replacements := localImageRefRegex.FindAllStringSubmatch(contentStr, -1)
			hasLocal := false
			for _, m := range replacements {
				if len(m) >= 3 && isLocalPath(m[2]) {
					hasLocal = true
					break
				}
			}
			if hasLocal {
				docsWithImages = append(docsWithImages, docImage{rel: rel, content: contentStr, dir: dir, docID: docID})
			}
		}
		return nil
	})

	// Phase 1: create folders and documents (parent before child)
	sort.Slice(folderOps, func(i, j int) bool {
		return folderOps[i].Path < folderOps[j].Path
	})
	ops := append(folderOps, createDocOps...)

	if len(ops) > 0 {
		lastSyncAt, err := e.client.SyncPost(ops)
		if err != nil {
			log.Printf("Push failed: %v", err)
			return
		}
		e.cfg.LastSyncAt = lastSyncAt
		// Phase 2: upload images and update documents with blob URLs
		for _, di := range docsWithImages {
			finalContent := di.content
			replacements := localImageRefRegex.FindAllStringSubmatch(di.content, -1)
			for _, m := range replacements {
				if len(m) < 3 || !isLocalPath(m[2]) {
					continue
				}
				alt, ref := m[1], m[2]
				localPath := filepath.Join(di.dir, ref)
				data, err := os.ReadFile(localPath)
				if err != nil {
					log.Printf("Push: image %s: %v", ref, err)
					continue
				}
				blobURL, err := e.client.UploadImage(di.docID, localPath, data)
				if err != nil {
					log.Printf("Push: upload %s: %v", ref, err)
					continue
				}
				old := "![" + alt + "](" + ref + ")"
				new := "![" + alt + "](" + blobURL + ")"
				finalContent = strings.ReplaceAll(finalContent, old, new)
			}
			updateOps := []syncOp{{
				Op:   "update",
				Type: "document",
				Path: di.rel,
				Data: map[string]interface{}{
					"id":      di.docID,
					"content": finalContent,
				},
			}}
			if _, err := e.client.SyncPost(updateOps); err != nil {
				log.Printf("Push: update %s: %v", di.rel, err)
			}
		}
		if err := SaveConfig(e.cfg); err != nil {
			log.Printf("Push: save config: %v", err)
		}
		log.Printf("Push complete (%d ops)", len(ops)+len(docsWithImages))
	}
}

func (e *Engine) buildFolderIDMap(folderPaths []string) map[string]string {
	folderIDByPath := make(map[string]string)
	// Use deterministic IDs for folders we're creating
	for _, p := range folderPaths {
		folderIDByPath[p] = deterministicUUID(p)
	}
	// Override with server state if available
	resp, err := e.client.SyncGet(e.cfg.LastSyncAt)
	if err != nil {
		return folderIDByPath
	}
	type folderInfo struct {
		id       string
		parentID *string
		name     string
	}
	var list []folderInfo
	for _, f := range resp.Folders {
		list = append(list, folderInfo{f.ID, f.ParentID, f.Name})
	}
	for len(list) > 0 {
		done := 0
		for _, f := range list {
			if f.parentID == nil || *f.parentID == "" {
				folderIDByPath[f.name] = f.id
				done++
				continue
			}
			var parentPath string
			for p, id := range folderIDByPath {
				if id == *f.parentID {
					parentPath = p
					break
				}
			}
			if parentPath != "" {
				folderIDByPath[parentPath+"/"+f.name] = f.id
				done++
			}
		}
		if done == 0 {
			break
		}
		var next []folderInfo
		for _, f := range list {
			path := f.name
			if f.parentID != nil && *f.parentID != "" {
				for p, id := range folderIDByPath {
					if id == *f.parentID {
						path = p + "/" + f.name
						break
					}
				}
			}
			if _, ok := folderIDByPath[path]; !ok {
				next = append(next, f)
			}
		}
		list = next
	}
	return folderIDByPath
}
