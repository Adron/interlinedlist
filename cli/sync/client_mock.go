package sync

import (
	"fmt"
	"sync"
	"time"
)

// MockSyncClient is an in-memory implementation of SyncClient for testing.
type MockSyncClient struct {
	mu         sync.Mutex
	Folders    []syncFolder
	Documents  []syncDocument
	Uploaded   map[string][]byte // documentID -> image data (for assertions)
	SyncPostCalls [][]syncOp      // record of all SyncPost calls
}

// NewMockSyncClient returns a MockSyncClient with empty state.
func NewMockSyncClient() *MockSyncClient {
	return &MockSyncClient{
		Uploaded:     make(map[string][]byte),
		SyncPostCalls: nil,
	}
}

// SyncGet returns the in-memory folders and documents.
func (m *MockSyncClient) SyncGet(lastSyncAt string) (*syncGetResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	folders := make([]syncFolder, len(m.Folders))
	copy(folders, m.Folders)
	documents := make([]syncDocument, len(m.Documents))
	copy(documents, m.Documents)
	return &syncGetResponse{
		Folders:    folders,
		Documents:  documents,
		LastSyncAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// SyncPost applies operations to in-memory state.
func (m *MockSyncClient) SyncPost(operations []syncOp) (lastSyncAt string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.SyncPostCalls = append(m.SyncPostCalls, operations)
	pathToID := make(map[string]string)
	for _, f := range m.Folders {
		if f.ParentID == nil || *f.ParentID == "" {
			pathToID[f.Name] = f.ID
		} else {
			for p, pid := range pathToID {
				if pid == *f.ParentID {
					pathToID[p+"/"+f.Name] = f.ID
					break
				}
			}
		}
	}
	for _, op := range operations {
		switch op.Type {
		case "folder":
			if op.Op == "create" {
				data, _ := op.Data.(map[string]interface{})
				id := ""
				if data != nil {
					if v, ok := data["id"].(string); ok {
						id = v
					}
				}
				if id == "" {
					id = deterministicUUID(op.Path)
				}
				name := op.Path
				var parentID *string
				for i := len(op.Path) - 1; i >= 0; i-- {
					if op.Path[i] == '/' {
						name = op.Path[i+1:]
						parentPath := op.Path[:i]
						if pid, ok := pathToID[parentPath]; ok {
							parentID = &pid
						}
						break
					}
				}
				pathToID[op.Path] = id
				m.Folders = append(m.Folders, syncFolder{ID: id, ParentID: parentID, Name: name})
			}
		case "document":
			if op.Op == "create" || op.Op == "update" {
				data, _ := op.Data.(map[string]interface{})
				if data == nil {
					continue
				}
				id, _ := data["id"].(string)
				relativePath, _ := data["relativePath"].(string)
				if id == "" && relativePath != "" {
					id = deterministicUUID(relativePath)
				}
				title, _ := data["title"].(string)
				content, _ := data["content"].(string)
				var folderID *string
				if fid, ok := data["folderId"].(string); ok && fid != "" {
					folderID = &fid
				}
				found := false
				for i := range m.Documents {
					if m.Documents[i].ID == id {
						if title != "" {
							m.Documents[i].Title = title
						}
						if content != "" {
							m.Documents[i].Content = content
						}
						if folderID != nil {
							m.Documents[i].FolderID = folderID
						}
						if relativePath != "" {
							m.Documents[i].RelativePath = relativePath
						}
						found = true
						break
					}
				}
				if !found && id != "" {
					if relativePath == "" {
						relativePath = op.Path
					}
					m.Documents = append(m.Documents, syncDocument{
						ID:           id,
						FolderID:     folderID,
						Title:        title,
						Content:      content,
						RelativePath: relativePath,
					})
				}
			}
		}
	}
	return time.Now().UTC().Format(time.RFC3339), nil
}

// UploadImage stores the image data and returns a fake blob URL.
func (m *MockSyncClient) UploadImage(documentID, filePath string, data []byte) (blobURL string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Uploaded[documentID] = data
	return fmt.Sprintf("https://blob.vercel-storage.com/test/%s/%s", documentID, filePath), nil
}
