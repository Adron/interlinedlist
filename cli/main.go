package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/interlinedlist/cli/sync"
)

var (
	version  = "dev"
	install  = flag.Bool("install", false, "Install as OS daemon")
	verify   = flag.Bool("verify", false, "Verify daemon is installed and running")
)

func main() {
	// Subcommand: sync init (check before flag parse)
	if len(os.Args) >= 3 && os.Args[1] == "sync" && os.Args[2] == "init" {
		if err := sync.RunInit(); err != nil {
			fmt.Fprintf(os.Stderr, "Init failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	flag.Parse()

	if *install {
		cfg, err := sync.LoadConfig()
		if err != nil || cfg == nil || cfg.SyncRoot == "" || cfg.ServerURL == "" {
			fmt.Fprintln(os.Stderr, "Config missing or invalid. Run 'il-sync sync init' to configure.")
			os.Exit(1)
		}
		if err := sync.InstallService(); err != nil {
			fmt.Fprintf(os.Stderr, "Install failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Daemon installed successfully.")
		return
	}

	if *verify {
		if err := sync.VerifyService(); err != nil {
			fmt.Fprintf(os.Stderr, "Verify failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Daemon is installed and running.")
		return
	}

	// Default: run sync daemon
	cfg, err := sync.LoadConfig()
	if err != nil || cfg == nil || cfg.SyncRoot == "" || cfg.ServerURL == "" {
		fmt.Fprintln(os.Stderr, "Config missing or invalid. Run 'il-sync sync init' to configure.")
		os.Exit(1)
	}

	engine, err := sync.NewEngine(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start: %v\n", err)
		os.Exit(1)
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		engine.Stop()
	}()

	if err := engine.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Sync error: %v\n", err)
		os.Exit(1)
	}
}
