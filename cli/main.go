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
	// Subcommand: init (check before flag parse)
	if len(os.Args) >= 2 && os.Args[1] == "init" {
		if err := sync.RunInit(); err != nil {
			fmt.Fprintf(os.Stderr, "Init failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	flag.Parse()

	cfg, err := sync.LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Config error: %v\n", err)
		os.Exit(1)
	}
	if cfg == nil || cfg.SyncRoot == "" || cfg.ServerURL == "" || cfg.AuthToken == "" {
		fmt.Println("Config not found. Enter your sync settings:")
		if err := sync.RunInit(); err != nil {
			fmt.Fprintf(os.Stderr, "Setup failed: %v\n", err)
			os.Exit(1)
		}
		cfg, err = sync.LoadConfig()
		if err != nil || cfg == nil || cfg.SyncRoot == "" || cfg.ServerURL == "" {
			fmt.Fprintln(os.Stderr, "Config still invalid after setup.")
			os.Exit(1)
		}
	}

	if *install {
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
