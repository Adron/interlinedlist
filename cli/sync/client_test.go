package sync

import (
	"testing"
)

func TestDeterministicUUID(t *testing.T) {
	path := "notes/readme.md"
	u1 := deterministicUUID(path)
	u2 := deterministicUUID(path)
	if u1 != u2 {
		t.Errorf("deterministicUUID not stable: %q != %q", u1, u2)
	}
	if len(u1) != 36 {
		t.Errorf("expected UUID format (36 chars), got %d: %q", len(u1), u1)
	}
	// Different paths produce different IDs
	other := deterministicUUID("other/path.md")
	if u1 == other {
		t.Errorf("different paths should produce different IDs")
	}
}

func TestIsLocalPath(t *testing.T) {
	tests := []struct {
		ref    string
		expect bool
	}{
		{"./image.png", true},
		{"image.png", true},
		{"path/to/image.jpg", true},
		{"http://example.com/img.png", false},
		{"https://blob.vercel-storage.com/x", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isLocalPath(tt.ref)
		if got != tt.expect {
			t.Errorf("isLocalPath(%q) = %v, want %v", tt.ref, got, tt.expect)
		}
	}
}

func TestLocalImageRefRegex(t *testing.T) {
	content := "![alt](./photo.png) and ![x](https://example.com/a.png)"
	matches := localImageRefRegex.FindAllStringSubmatch(content, -1)
	if len(matches) != 2 {
		t.Fatalf("expected 2 matches, got %d", len(matches))
	}
	if matches[0][2] != "./photo.png" {
		t.Errorf("first match path = %q, want ./photo.png", matches[0][2])
	}
	if matches[1][2] != "https://example.com/a.png" {
		t.Errorf("second match path = %q", matches[1][2])
	}
}
