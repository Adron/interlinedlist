package sync

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// blobURLRegex matches ![alt](https://...blob.vercel-storage.com/...)
var blobURLRegex = regexp.MustCompile(`!\[([^\]]*)\]\((https?://[^)]+)\)`)

func (e *Engine) pull() {
	if e.cfg.AuthToken == "" {
		log.Printf("Pull skipped: no API key configured")
		return
	}

	resp, err := e.client.SyncGet(e.cfg.LastSyncAt)
	if err != nil {
		log.Printf("Pull failed: %v", err)
		return
	}

	// Build folder path -> id for parent resolution
	folderPathByID := make(map[string]string)
	folderIDByPath := make(map[string]string)
	for _, f := range resp.Folders {
		if f.ParentID == nil || *f.ParentID == "" {
			folderPathByID[f.ID] = f.Name
			folderIDByPath[f.Name] = f.ID
		}
	}
	// Resolve nested paths
	for changed := true; changed; {
		changed = false
		for _, f := range resp.Folders {
			if f.ParentID == nil || *f.ParentID == "" {
				continue
			}
			parentPath, ok := folderPathByID[*f.ParentID]
			if !ok {
				continue
			}
			fullPath := parentPath + "/" + f.Name
			if folderPathByID[f.ID] != fullPath {
				folderPathByID[f.ID] = fullPath
				folderIDByPath[fullPath] = f.ID
				changed = true
			}
		}
	}

	// Create folders locally
	for _, path := range folderPathByID {
		if path == "" {
			continue
		}
		localPath := filepath.Join(e.cfg.SyncRoot, filepath.FromSlash(path))
		if err := os.MkdirAll(localPath, 0755); err != nil {
			log.Printf("Pull: mkdir %s: %v", path, err)
		}
	}

	// Create/update documents
	for _, d := range resp.Documents {
		relPath := d.RelativePath
		localPath := filepath.Join(e.cfg.SyncRoot, filepath.FromSlash(relPath))
		dir := filepath.Dir(localPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("Pull: mkdir %s: %v", dir, err)
			continue
		}

		content := d.Content
		// Download blob images and rewrite to relative paths
		content = blobURLRegex.ReplaceAllStringFunc(content, func(match string) string {
			subs := blobURLRegex.FindStringSubmatch(match)
			if len(subs) < 3 {
				return match
			}
			alt, url := subs[1], subs[2]
			if !strings.Contains(url, "blob.vercel-storage.com") {
				return match
			}
			// Download image
			req, err := http.NewRequest("GET", url, nil)
			if err != nil {
				return match
			}
			resp, err := http.DefaultClient.Do(req)
			if err != nil || resp.StatusCode != 200 {
				return match
			}
			defer resp.Body.Close()
			// Extract filename from URL or use generic
			base := "image"
			if idx := strings.LastIndex(url, "/"); idx >= 0 {
				base = url[idx+1:]
			}
			imgPath := filepath.Join(dir, base)
			f, err := os.Create(imgPath)
			if err != nil {
				return match
			}
			_, _ = f.ReadFrom(resp.Body)
			f.Close()
			relImg := filepath.Base(base)
			return "![" + alt + "](" + relImg + ")"
		})

		if err := os.WriteFile(localPath, []byte(content), 0644); err != nil {
			log.Printf("Pull: write %s: %v", relPath, err)
		}
	}

	e.cfg.LastSyncAt = resp.LastSyncAt
	if err := SaveConfig(e.cfg); err != nil {
		log.Printf("Pull: save config: %v", err)
	}
	log.Printf("Pull complete (%d folders, %d documents)", len(resp.Folders), len(resp.Documents))
}
