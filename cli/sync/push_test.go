package sync

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPushCreatesFoldersAndDocuments(t *testing.T) {
	dir := t.TempDir()
	cfg := &Config{
		SyncRoot:   dir,
		ServerURL:  "http://test",
		AuthToken:  "test-token",
		LastSyncAt: "",
	}
	mock := NewMockSyncClient()
	engine, err := NewEngineWithClient(cfg, mock)
	if err != nil {
		t.Fatalf("NewEngineWithClient: %v", err)
	}

	// Create folder and document
	if err := os.MkdirAll(filepath.Join(dir, "notes"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "notes", "readme.md"), []byte("# Hello\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Use temp config dir to avoid overwriting real config
	origHome := os.Getenv("XDG_CONFIG_HOME")
	configDir := t.TempDir()
	os.Setenv("XDG_CONFIG_HOME", configDir)
	defer os.Setenv("XDG_CONFIG_HOME", origHome)

	engine.push()

	if len(mock.SyncPostCalls) == 0 {
		t.Fatal("expected at least one SyncPost call")
	}
	ops := mock.SyncPostCalls[0]
	var folderOps, docOps int
	for _, op := range ops {
		if op.Type == "folder" {
			folderOps++
		}
		if op.Type == "document" {
			docOps++
		}
	}
	if folderOps < 1 {
		t.Errorf("expected folder ops, got %d", folderOps)
	}
	if docOps < 1 {
		t.Errorf("expected document ops, got %d", docOps)
	}
	if len(mock.Documents) == 0 {
		t.Error("expected documents in mock state")
	}
}

func TestPushWithLocalImage(t *testing.T) {
	dir := t.TempDir()
	cfg := &Config{
		SyncRoot:   dir,
		ServerURL:  "http://test",
		AuthToken:  "test-token",
		LastSyncAt: "",
	}
	mock := NewMockSyncClient()
	engine, err := NewEngineWithClient(cfg, mock)
	if err != nil {
		t.Fatalf("NewEngineWithClient: %v", err)
	}

	// Create doc with local image ref
	content := "# Doc\n![img](./photo.png)\n"
	if err := os.WriteFile(filepath.Join(dir, "doc.md"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "photo.png"), []byte("fake-png"), 0644); err != nil {
		t.Fatal(err)
	}

	origHome := os.Getenv("XDG_CONFIG_HOME")
	configDir := t.TempDir()
	os.Setenv("XDG_CONFIG_HOME", configDir)
	defer os.Setenv("XDG_CONFIG_HOME", origHome)

	engine.push()

	// Should have created doc, then uploaded image, then updated
	if len(mock.SyncPostCalls) < 1 {
		t.Fatal("expected SyncPost calls")
	}
	// Check that UploadImage was called
	docID := deterministicUUID("doc.md")
	if _, ok := mock.Uploaded[docID]; !ok {
		t.Error("expected image upload for document")
	}
}
