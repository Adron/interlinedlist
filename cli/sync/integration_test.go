//go:build integration

package sync

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestIntegrationPushPull(t *testing.T) {
	// Fake sync API server
	var folders []syncFolder
	var documents []syncDocument

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/documents/sync":
			if r.Method == "GET" {
				resp := syncGetResponse{
					Folders:    folders,
					Documents:  documents,
					LastSyncAt: "2024-01-01T00:00:00Z",
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
				return
			}
			if r.Method == "POST" {
				var body struct {
					Operations []syncOp `json:"operations"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					http.Error(w, err.Error(), 400)
					return
				}
				for _, op := range body.Operations {
					if op.Type == "folder" && op.Op == "create" {
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
						for i := len(op.Path) - 1; i >= 0; i-- {
							if op.Path[i] == '/' {
								name = op.Path[i+1:]
								break
							}
						}
						folders = append(folders, syncFolder{ID: id, Name: name})
					}
					if op.Type == "document" && (op.Op == "create" || op.Op == "update") {
						data, _ := op.Data.(map[string]interface{})
						if data == nil {
							continue
						}
						id, _ := data["id"].(string)
						relativePath, _ := data["relativePath"].(string)
						content, _ := data["content"].(string)
						title, _ := data["title"].(string)
						if id == "" {
							id = deterministicUUID(relativePath)
						}
						found := false
						for i := range documents {
							if documents[i].ID == id {
								documents[i].Content = content
								documents[i].Title = title
								found = true
								break
							}
						}
						if !found {
							documents = append(documents, syncDocument{
								ID:           id,
								Title:        title,
								Content:      content,
								RelativePath: relativePath,
							})
						}
					}
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{"lastSyncAt": "2024-01-01T00:00:01Z"})
				return
			}
		default:
			if r.Method == "POST" && len(r.URL.Path) > 20 && r.URL.Path[len(r.URL.Path)-14:] == "/images/upload" {
				// Image upload - return fake blob URL
				blobURL := "http://" + r.Host + "/fake-image.png"
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{"url": blobURL})
				return
			}
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	dir := t.TempDir()
	cfg := &Config{
		SyncRoot:   dir,
		ServerURL:  server.URL,
		AuthToken:  "test-token",
		LastSyncAt: "",
	}

	origHome := os.Getenv("XDG_CONFIG_HOME")
	configDir := t.TempDir()
	os.Setenv("XDG_CONFIG_HOME", configDir)
	defer os.Setenv("XDG_CONFIG_HOME", origHome)

	engine, err := NewEngineWithClient(cfg, cfg)
	if err != nil {
		t.Fatalf("NewEngineWithClient: %v", err)
	}

	// Push: create doc
	if err := os.WriteFile(filepath.Join(dir, "test.md"), []byte("# Test\n"), 0644); err != nil {
		t.Fatal(err)
	}
	engine.push()

	if len(documents) == 0 {
		t.Error("expected document to be created on server")
	}

	// Pull: fetch and write locally
	cfg2 := &Config{
		SyncRoot:   t.TempDir(),
		ServerURL:  server.URL,
		AuthToken:  "test-token",
		LastSyncAt: "",
	}
	engine2, err := NewEngineWithClient(cfg2, cfg2)
	if err != nil {
		t.Fatalf("NewEngineWithClient: %v", err)
	}
	engine2.pull()

	localPath := filepath.Join(cfg2.SyncRoot, "test.md")
	if _, err := os.Stat(localPath); os.IsNotExist(err) {
		t.Errorf("expected file at %s after pull", localPath)
	}
}
