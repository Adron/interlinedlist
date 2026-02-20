package sync

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

// deterministicUUID returns a stable UUID-like string from a path (for sync idempotency)
func deterministicUUID(path string) string {
	h := sha256.Sum256([]byte(path))
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		h[0:4], h[4:6], h[6:8], h[8:10], h[10:16])
}

type syncFolder struct {
	ID       string  `json:"id"`
	ParentID *string `json:"parentId"`
	Name     string  `json:"name"`
}

type syncDocument struct {
	ID           string  `json:"id"`
	FolderID     *string `json:"folderId"`
	Title        string  `json:"title"`
	Content      string  `json:"content"`
	RelativePath string  `json:"relativePath"`
	ContentHash  string  `json:"contentHash,omitempty"`
}

type syncGetResponse struct {
	Folders   []syncFolder   `json:"folders"`
	Documents []syncDocument `json:"documents"`
	LastSyncAt string        `json:"lastSyncAt"`
}

type syncOp struct {
	Op   string      `json:"op"`
	Type string      `json:"type"`
	Path string      `json:"path"`
	Data interface{} `json:"data,omitempty"`
}

func (c *Config) doRequest(method, path string, body io.Reader) (*http.Response, error) {
	base, err := url.Parse(strings.TrimSuffix(c.ServerURL, "/"))
	if err != nil {
		return nil, err
	}
	u, _ := base.Parse(path)
	req, err := http.NewRequest(method, u.String(), body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.AuthToken)
	}
	return http.DefaultClient.Do(req)
}

func (c *Config) SyncGet(lastSyncAt string) (*syncGetResponse, error) {
	path := "/api/documents/sync"
	if lastSyncAt != "" {
		path += "?lastSyncAt=" + url.QueryEscape(lastSyncAt)
	}
	resp, err := c.doRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sync GET %d: %s", resp.StatusCode, string(b))
	}
	var out syncGetResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Config) SyncPost(operations []syncOp) (lastSyncAt string, err error) {
	body, err := json.Marshal(map[string]interface{}{"operations": operations})
	if err != nil {
		return "", err
	}
	resp, err := c.doRequest("POST", "/api/documents/sync", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("sync POST %d: %s", resp.StatusCode, string(b))
	}
	var out struct {
		LastSyncAt string `json:"lastSyncAt"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.LastSyncAt, nil
}

func (c *Config) UploadImage(documentID, filePath string, data []byte) (blobURL string, err error) {
	base, err := url.Parse(strings.TrimSuffix(c.ServerURL, "/"))
	if err != nil {
		return "", err
	}
	u, _ := base.Parse("/api/documents/" + documentID + "/images/upload")

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	fw, err := w.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		return "", err
	}
	if _, err := fw.Write(data); err != nil {
		return "", err
	}
	contentType := w.FormDataContentType()
	if err := w.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", u.String(), &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", contentType)
	if c.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.AuthToken)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("image upload %d: %s", resp.StatusCode, string(b))
	}
	var out struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.URL, nil
}
