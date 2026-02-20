package sync

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

type Config struct {
	SyncRoot    string `json:"syncRoot"`
	ServerURL   string `json:"serverUrl"`
	AuthToken   string `json:"authToken"`
	LastSyncAt  string `json:"lastSyncAt,omitempty"`
}

func configPath() (string, error) {
	if runtime.GOOS == "windows" {
		dir := os.Getenv("APPDATA")
		if dir == "" {
			dir = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
		}
		return filepath.Join(dir, "InterlinedList", "sync.json"), nil
	}
	dir := os.Getenv("XDG_CONFIG_HOME")
	if dir == "" {
		dir = filepath.Join(os.Getenv("HOME"), ".config")
	}
	return filepath.Join(dir, "interlinedlist", "sync.json"), nil
}

func LoadConfig() (*Config, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func SaveConfig(cfg *Config) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	mode := os.FileMode(0644)
	if runtime.GOOS != "windows" {
		mode = 0600
	}
	return os.WriteFile(path, data, mode)
}
