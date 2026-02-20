package sync

import (
	"fmt"
	"os"

	"github.com/kardianos/service"
)

var svcConfig = &service.Config{
	Name:        "il-sync",
	DisplayName: "InterlinedList Sync",
	Description: "Bidirectional sync for InterlinedList documents",
}

type program struct {
	engine *Engine
}

func (p *program) Start(s service.Service) error {
	cfg, err := LoadConfig()
	if err != nil || cfg == nil || cfg.SyncRoot == "" || cfg.ServerURL == "" {
		return fmt.Errorf("config missing or invalid")
	}
	p.engine, err = NewEngine(cfg)
	if err != nil {
		return err
	}
	go p.engine.Run()
	return nil
}

func (p *program) Stop(s service.Service) error {
	if p.engine != nil {
		p.engine.Stop()
	}
	return nil
}

func InstallService() error {
	prg := &program{}
	svc, err := service.New(prg, svcConfig)
	if err != nil {
		return err
	}
	return svc.Install()
}

func VerifyService() error {
	prg := &program{}
	svc, err := service.New(prg, svcConfig)
	if err != nil {
		return err
	}
	status, err := svc.Status()
	if err != nil {
		return err
	}
	if status != service.StatusRunning {
		return fmt.Errorf("daemon is not running (status: %v)", status)
	}
	return nil
}

func init() {
	svcConfig.WorkingDirectory, _ = os.Getwd()
	svcConfig.Executable, _ = os.Executable()
}
