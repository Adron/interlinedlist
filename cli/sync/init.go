package sync

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func RunInit() error {
	cfg, _ := LoadConfig()
	if cfg == nil {
		cfg = &Config{}
	}

	reader := bufio.NewReader(os.Stdin)

	fmt.Print("Sync root path (e.g. ~/my-docs): ")
	root, _ := reader.ReadString('\n')
	root = strings.TrimSpace(root)
	if root != "" {
		if strings.HasPrefix(root, "~/") {
			home, _ := os.UserHomeDir()
			root = filepath.Join(home, root[2:])
		}
		cfg.SyncRoot = root
	}

	fmt.Print("Server URL (e.g. https://app.example.com): ")
	url, _ := reader.ReadString('\n')
	url = strings.TrimSpace(url)
	if url != "" {
		cfg.ServerURL = url
	}

	fmt.Print("API key (create at /settings → Sync, or POST /api/user/sync-tokens): ")
	token, _ := reader.ReadString('\n')
	token = strings.TrimSpace(token)
	if token != "" {
		cfg.AuthToken = token
	}

	if cfg.SyncRoot == "" || cfg.ServerURL == "" {
		return fmt.Errorf("sync root and server URL are required")
	}

	if err := SaveConfig(cfg); err != nil {
		return err
	}

	fmt.Println("Config saved successfully.")
	return nil
}
