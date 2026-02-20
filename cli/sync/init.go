package sync

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/term"
)

func readPassword(prompt string) (string, error) {
	fmt.Print(prompt)
	defer fmt.Println()
	b, err := term.ReadPassword(int(os.Stdin.Fd()))
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(b)), nil
}

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

	if cfg.SyncRoot == "" || cfg.ServerURL == "" {
		return fmt.Errorf("sync root and server URL are required")
	}

	fmt.Print("Email: ")
	email, _ := reader.ReadString('\n')
	email = strings.TrimSpace(email)
	if email == "" {
		return fmt.Errorf("email is required")
	}

	password, err := readPassword("Password: ")
	if err != nil {
		fmt.Print("Password: ")
		pw, _ := reader.ReadString('\n')
		password = strings.TrimSpace(pw)
	}
	if password == "" {
		return fmt.Errorf("password is required")
	}

	fmt.Println("Authenticating...")
	token, err := FetchSyncToken(cfg.ServerURL, email, password)
	if err != nil {
		return fmt.Errorf("authentication failed: %w", err)
	}
	cfg.AuthToken = token

	if err := SaveConfig(cfg); err != nil {
		return err
	}

	fmt.Println("Config saved successfully.")
	return nil
}
