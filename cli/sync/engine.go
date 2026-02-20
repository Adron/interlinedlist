package sync

import (
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

type Engine struct {
	cfg      *Config
	client   SyncClient
	watcher  *fsnotify.Watcher
	stopCh   chan struct{}
	mu       sync.Mutex
	watched  map[string]bool
	watchedMu sync.RWMutex
}

func NewEngine(cfg *Config) (*Engine, error) {
	return NewEngineWithClient(cfg, cfg)
}

func NewEngineWithClient(cfg *Config, client SyncClient) (*Engine, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	return &Engine{
		cfg:     cfg,
		client:  client,
		watcher: watcher,
		stopCh:  make(chan struct{}),
		watched: make(map[string]bool),
	}, nil
}

// addRecursive adds path and all its subdirectories to the watcher
func (e *Engine) addRecursive(path string) error {
	return filepath.Walk(path, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			e.watchedMu.Lock()
			if e.watched[p] {
				e.watchedMu.Unlock()
				return nil
			}
			e.watchedMu.Unlock()
			if err := e.watcher.Add(p); err != nil {
				return nil
			}
			e.watchedMu.Lock()
			e.watched[p] = true
			e.watchedMu.Unlock()
		}
		return nil
	})
}

func (e *Engine) removeWatched(path string) {
	e.watchedMu.Lock()
	defer e.watchedMu.Unlock()
	if e.watched[path] {
		_ = e.watcher.Remove(path)
		delete(e.watched, path)
	}
}

func (e *Engine) Run() error {
	if err := e.addRecursive(e.cfg.SyncRoot); err != nil {
		return err
	}
	log.Printf("Watching %s (recursive)", e.cfg.SyncRoot)

	debounce := time.NewTimer(0)
	<-debounce.C
	debounce = time.NewTimer(3 * time.Second)
	pullTicker := time.NewTicker(30 * time.Second)

	for {
		select {
		case <-e.stopCh:
			e.watcher.Close()
			debounce.Stop()
			pullTicker.Stop()
			return nil
		case event, ok := <-e.watcher.Events:
			if !ok {
				return nil
			}
			if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Remove) != 0 {
				debounce.Stop()
				debounce = time.NewTimer(3 * time.Second)
			}
			// Recursive: add new directories to watcher, remove deleted ones
			if event.Op&fsnotify.Create != 0 {
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					_ = e.addRecursive(event.Name)
				}
			}
			if event.Op&fsnotify.Remove != 0 {
				e.removeWatched(event.Name)
			}
		case err, ok := <-e.watcher.Errors:
			if !ok {
				return nil
			}
			log.Printf("Watcher error: %v", err)
		case <-debounce.C:
			e.push()
			debounce = time.NewTimer(3 * time.Second)
		case <-pullTicker.C:
			e.pull()
		}
	}
}

func (e *Engine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	select {
	case <-e.stopCh:
	default:
		close(e.stopCh)
	}
}

