package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	demoinfocs "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs"
	common "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/common"
	events "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/events"
)

// Frame representa um frame de posição dos jogadores
type Frame struct {
	Tick     int          `json:"tick"`
	Time     float64      `json:"time"`
	Round    int          `json:"round"`
	Clock    string       `json:"clock"`
	Players  []PlayerFrame `json:"players"`
	Events   []FrameEvent  `json:"events,omitempty"`
}

type PlayerFrame struct {
	SteamID  uint64    `json:"steamID"`
	Name     string    `json:"name"`
	Team     string    `json:"team"`
	Position Position  `json:"position"`
	IsAlive  bool      `json:"isAlive"`
	Health   int       `json:"health"`
	Armor    int       `json:"armor"`
	Weapon   string    `json:"weapon,omitempty"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type FrameEvent struct {
	Type     string   `json:"type"` // "kill", "bomb_planted", "bomb_defused", "round_end"
	Position Position `json:"position,omitempty"`
	Player   string   `json:"player,omitempty"`
}

type FrameData struct {
	Map    string  `json:"map"`
	Frames []Frame `json:"frames"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Uso: %s <demo_path>\n", os.Args[0])
		os.Exit(1)
	}

	demoPath := os.Args[1]

	f, err := os.Open(demoPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao abrir demo: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	p := demoinfocs.NewParser(f)
	defer p.Close()

	frameData := &FrameData{
		Frames: []Frame{},
		Map:    "unknown",
	}

	// Detectar mapa do nome do arquivo
	pathLower := strings.ToLower(demoPath)
	if strings.Contains(pathLower, "de_mirage") {
		frameData.Map = "de_mirage"
	} else if strings.Contains(pathLower, "de_dust2") || strings.Contains(pathLower, "dust2") {
		frameData.Map = "de_dust2"
	} else if strings.Contains(pathLower, "de_inferno") {
		frameData.Map = "de_inferno"
	} else if strings.Contains(pathLower, "de_ancient") {
		frameData.Map = "de_ancient"
	} else if strings.Contains(pathLower, "de_vertigo") {
		frameData.Map = "de_vertigo"
	} else if strings.Contains(pathLower, "de_anubis") {
		frameData.Map = "de_anubis"
	} else if strings.Contains(pathLower, "de_overpass") {
		frameData.Map = "de_overpass"
	} else if strings.Contains(pathLower, "de_nuke") {
		frameData.Map = "de_nuke"
	}

	var currentRound int = 0
	var currentClock string = "00:00"
	var roundStartTick int = 0
	var tickRate float64 = 64.0

	// Coletar eventos de kill para adicionar aos frames
	killEvents := make(map[int][]FrameEvent) // tick -> events

	// Registrar event handlers ANTES de processar
	p.RegisterEventHandler(func(e events.RoundStart) {
		currentRound++
		roundStartTick = p.GameState().IngameTick()
		currentClock = "01:55" // Round começa com 1:55
	})

	p.RegisterEventHandler(func(e events.Kill) {
		if e.Killer != nil && e.Victim != nil {
			killerPos := e.Killer.Position()
			event := FrameEvent{
				Type: "kill",
				Position: Position{
					X: killerPos.X,
					Y: killerPos.Y,
					Z: killerPos.Z,
				},
				Player: e.Killer.Name,
			}
			tick := p.GameState().IngameTick()
			killEvents[tick] = append(killEvents[tick], event)
		}
	})

	p.RegisterEventHandler(func(e events.BombPlanted) {
		if e.Player != nil {
			pos := e.Player.Position()
			event := FrameEvent{
				Type: "bomb_planted",
				Position: Position{
					X: pos.X,
					Y: pos.Y,
					Z: pos.Z,
				},
				Player: e.Player.Name,
			}
			tick := p.GameState().IngameTick()
			killEvents[tick] = append(killEvents[tick], event)
		}
	})

	p.RegisterEventHandler(func(e events.BombDefused) {
		if e.Player != nil {
			pos := e.Player.Position()
			event := FrameEvent{
				Type: "bomb_defused",
				Position: Position{
					X: pos.X,
					Y: pos.Y,
					Z: pos.Z,
				},
				Player: e.Player.Name,
			}
			tick := p.GameState().IngameTick()
			killEvents[tick] = append(killEvents[tick], event)
		}
	})

	p.RegisterEventHandler(func(e events.RoundEnd) {
		tick := p.GameState().IngameTick()
		event := FrameEvent{
			Type: "round_end",
		}
		killEvents[tick] = append(killEvents[tick], event)
	})

	// Processar frames a cada N ticks (para não gerar muitos dados)
	// Vamos coletar a cada 2 ticks (aproximadamente 32 FPS)
	frameInterval := 2
	lastFrameTick := -1

	// Processar o demo completamente
	err = p.ParseToEnd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao processar demo: %v\n", err)
		os.Exit(1)
	}

	// Agora processar novamente para coletar frames
	f2, err := os.Open(demoPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao reabrir demo: %v\n", err)
		os.Exit(1)
	}
	defer f2.Close()

	p2 := demoinfocs.NewParser(f2)
	defer p2.Close()

	currentRound = 0
	roundStartTick = 0
	currentClock = "00:00"
	lastFrameTick = -1

	p2.RegisterEventHandler(func(e events.RoundStart) {
		currentRound++
		roundStartTick = p2.GameState().IngameTick()
		currentClock = "01:55"
	})

	// Processar frame por frame e coletar dados
	for {
		moreFrames, err := p2.ParseNextFrame()
		if err != nil {
			break
		}
		if !moreFrames {
			break
		}

		tick := p2.GameState().IngameTick()

		// Coletar frame apenas a cada N ticks
		if tick-lastFrameTick < frameInterval && lastFrameTick != -1 {
			continue
		}
		lastFrameTick = tick

		// Atualizar clock (aproximado)
		if roundStartTick > 0 {
			elapsedTicks := tick - roundStartTick
			elapsedSeconds := float64(elapsedTicks) / tickRate
			remainingSeconds := 115.0 - elapsedSeconds // Round dura 115 segundos
			if remainingSeconds < 0 {
				remainingSeconds = 0
			}
			minutes := int(remainingSeconds) / 60
			seconds := int(remainingSeconds) % 60
			currentClock = fmt.Sprintf("%02d:%02d", minutes, seconds)
		}

		// Coletar posições de todos os jogadores
		players := p2.GameState().Participants().Playing()
		playerFrames := []PlayerFrame{}

		for _, player := range players {
			if player == nil {
				continue
			}

			pos := player.Position()
			playerFrame := PlayerFrame{
				SteamID: player.SteamID64,
				Name:    player.Name,
				Team:    teamToString(player.Team),
				Position: Position{
					X: pos.X,
					Y: pos.Y,
					Z: pos.Z,
				},
				IsAlive: player.IsAlive(),
				Health:  player.Health(),
				Armor:   player.Armor(),
			}

			// Obter arma ativa
			if weapon := player.ActiveWeapon(); weapon != nil {
				playerFrame.Weapon = weapon.Type.String()
			}

			playerFrames = append(playerFrames, playerFrame)
		}

		// Adicionar eventos deste tick
		events := killEvents[tick]

		// Criar frame
		frame := Frame{
			Tick:    tick,
			Time:    float64(tick) / tickRate,
			Round:   currentRound,
			Clock:   currentClock,
			Players: playerFrames,
			Events:  events,
		}

		frameData.Frames = append(frameData.Frames, frame)
	}

	// Output JSON
	jsonData, err := json.MarshalIndent(frameData, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao serializar JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(string(jsonData))
}

func teamToString(t common.Team) string {
	if t == common.TeamTerrorists {
		return "T"
	}
	return "CT"
}
