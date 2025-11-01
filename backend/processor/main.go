package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	demoinfocs "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs"
	common "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/common"
	events "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/events"
	st "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/msgs2"
)

// JSON completo para alimentar IA e visualização
type CompleteDemoAnalysis struct {
	Metadata      MatchMetadata       `json:"metadata"`
	Events        []GameEvent         `json:"events"`
	Rounds        []RoundData         `json:"rounds"`
	Players       []PlayerComplete    `json:"players"`
	Heatmap       HeatmapData         `json:"heatmap"`
	Economy       EconomyAnalysis     `json:"economy"`
	Summary       MatchSummary        `json:"summary"`
	RadarReplay   []RadarFrame        `json:"radarReplay"`
}

type MatchMetadata struct {
	Map            string    `json:"map"`
	Duration       string    `json:"duration"`
	Rounds         int       `json:"rounds"`
	ScoreT         int       `json:"scoreT"`
	ScoreCT        int       `json:"scoreCT"`
	Date           time.Time `json:"date"`
	ServerName     string    `json:"serverName"`
	DemoTickRate   float64   `json:"demoTickRate"`
}

type GameEvent struct {
	Tick           int                   `json:"tick"`
	Time           float64               `json:"time"`
	Type           string                `json:"type"` // "kill", "round_start", "bomb_planted", etc.
	Kill          *KillEvent           `json:"kill,omitempty"`
	RoundStart     *RoundStartEvent      `json:"roundStart,omitempty"`
	RoundEnd       *RoundEndEvent        `json:"roundEnd,omitempty"`
	Grenade        *GrenadeEvent         `json:"grenade,omitempty"`
	Bomb           *BombEvent            `json:"bomb,omitempty"`
	WeaponFire     *WeaponFireEvent      `json:"weaponFire,omitempty"`
}

type KillEvent struct {
	Killer        PlayerInfo  `json:"killer"`
	Victim        PlayerInfo  `json:"victim"`
	Assister      *PlayerInfo  `json:"assister,omitempty"`
	IsHeadshot    bool        `json:"isHeadshot"`
	Weapon        string      `json:"weapon"`
	Distance      float64     `json:"distance"`
	KillerPos     Position    `json:"killerPos"`
	VictimPos     Position    `json:"victimPos"`
}

type RoundStartEvent struct {
	Round        int              `json:"round"`
	Players      []PlayerState     `json:"players"`
	TimeLimit    int               `json:"timeLimit"`
}

type RoundEndEvent struct {
	Round        int              `json:"round"`
	Winner       string           `json:"winner"` // "CT" ou "T"
	Reason       int              `json:"reason"` // 1=TargetBombed, 2=VipEscaped, etc
	ScoreT       int              `json:"scoreT"`
	ScoreCT      int              `json:"scoreCT"`
}

type GrenadeEvent struct {
	Type         string          `json:"type"` // "flashbang", "he", "smoke", "molotov"
	Thrower      PlayerInfo      `json:"thrower"`
	Position     Position        `json:"position"`
	Lifetime     float64         `json:"lifetime,omitempty"`
	Velocity     Vector3         `json:"velocity,omitempty"`
}

type BombEvent struct {
	Type         string          `json:"type"` // "planted", "defused", "exploded"
	Player       PlayerInfo      `json:"player"`
	Position     Position        `json:"position"`
	Time         float64         `json:"time"`
}

type WeaponFireEvent struct {
	Shooter      PlayerInfo      `json:"shooter"`
	Weapon       string         `json:"weapon"`
	Position     Position       `json:"position"`
	ViewAngle    Vector3        `json:"viewAngle"`
}

type PlayerInfo struct {
	SteamID      uint64        `json:"steamID"`
	Name         string        `json:"name"`
	Team         string        `json:"team"` // "CT" ou "T"
	Health       int           `json:"health"`
	Armor        int           `json:"armor"`
	Money        int           `json:"money"`
	Kills        int           `json:"kills"`
	Deaths       int           `json:"deaths"`
	Assists      int           `json:"assists"`
	IsAlive      bool          `json:"isAlive"`
	Position     Position      `json:"position"`
}

type PlayerState struct {
	SteamID      uint64        `json:"steamID"`
	Name         string        `json:"name"`
	Team         string        `json:"team"`
	Health       int           `json:"health"`
	Armor        int           `json:"armor"`
	Money        int           `json:"money"`
	Position     Position      `json:"position"`
}

type Position struct {
	X           float64       `json:"x"`
	Y           float64       `json:"y"`
	Z           float64       `json:"z"`
}

type Vector3 struct {
	X           float64       `json:"x"`
	Y           float64       `json:"y"`
	Z           float64       `json:"z"`
}

type RoundData struct {
	Round        int           `json:"round"`
	StartTick    int           `json:"startTick"`
	EndTick      int           `json:"endTick"`
	Winner       string        `json:"winner"`
	ScoreT       int           `json:"scoreT"`
	ScoreCT      int           `json:"scoreCT"`
	Events       []int         `json:"events"` // Índices dos eventos deste round
	Duration     float64       `json:"duration"`
}

type PlayerComplete struct {
	SteamID      uint64        `json:"steamID"`
	Name         string        `json:"name"`
	Team         string        `json:"team"`
	Kills        int           `json:"kills"`
	Deaths       int           `json:"deaths"`
	Assists      int           `json:"assists"`
	HSKills      int           `json:"hsKills"`
	Damage       int           `json:"damage"`
	ADR          float64       `json:"adr"`
	HSRate       float64       `json:"hsRate"`
	KDRatio      float64       `json:"kdRatio"`
	UtilityDmg   int           `json:"utilityDamage"`
	ClutchWins   int           `json:"clutchWins"`
	ClutchAttempts int         `json:"clutchAttempts"`
	RoundsPlayed int           `json:"roundsPlayed"`
	PositionHistory []Position `json:"positionHistory"`
}

type HeatmapData struct {
	Map          string        `json:"map"`
	Resolution   int           `json:"resolution"`
	Points       []HeatmapPoint `json:"points"`
	Hotspots     []Hotspot     `json:"hotspots"`
}

type HeatmapPoint struct {
	X            float64       `json:"x"`
	Y            float64       `json:"y"`
	Z            float64       `json:"z"`
	Intensity    int           `json:"intensity"` // Quantidade de eventos neste ponto
	EventTypes   []string      `json:"eventTypes"` // ["kill", "bomb_planted", etc]
}

type Hotspot struct {
	Zone         string        `json:"zone"`
	Center       Position      `json:"center"`
	Radius       float64       `json:"radius"`
	Intensity    int           `json:"intensity"`
	EventTypes   []string      `json:"eventTypes"`
	Description  string        `json:"description"`
}

type EconomyAnalysis struct {
	AverageSpendT    float64     `json:"averageSpendT"`
	AverageSpendCT   float64     `json:"averageSpendCT"`
	EconomySwings    []EconomySwing `json:"economySwings"`
}

type EconomySwing struct {
	Round        int           `json:"round"`
	Team         string        `json:"team"`
	Change       string        `json:"change"` // "eco", "force", "buy", "save"
	Reason       string        `json:"reason"`
}

type MatchSummary struct {
	MVP            string      `json:"mvp"`
	Rating         float64     `json:"rating"`
	KeyMoments     []string    `json:"keyMoments"`
	PlayerAnalysis []string    `json:"playerAnalysis"`
	TeamAnalysis   []string    `json:"teamAnalysis"`
}

type RadarFrame struct {
	Tick          int           `json:"tick"`
	Time          float64       `json:"time"`
	Round         int           `json:"round"`
	Players       []RadarPlayer `json:"players"`
}

type RadarPlayer struct {
	SteamID      uint64        `json:"steamID"`
	Name         string        `json:"name"`
	Team         string        `json:"team"`
	Position     Position      `json:"position"`
	Health       int           `json:"health"`
	Weapon       string        `json:"weapon"`
	IsAlive      bool          `json:"isAlive"`
}

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Uso: %s <demo_path> <analysis_type>\n", os.Args[0])
		os.Exit(1)
	}

	demoPath := os.Args[1]
	analysisType := os.Args[2]

	if analysisType != "player" && analysisType != "team" {
		fmt.Fprintf(os.Stderr, "Tipo de análise deve ser 'player' ou 'team'\n")
		os.Exit(1)
	}

	f, err := os.Open(demoPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao abrir demo: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	p := demoinfocs.NewParser(f)
	defer p.Close()

	// Estruturas para coletar dados
	analysis := &CompleteDemoAnalysis{
		Events:      []GameEvent{},
		Rounds:      []RoundData{},
		Players:     []PlayerComplete{},
		Heatmap:     HeatmapData{Points: []HeatmapPoint{}, Hotspots: []Hotspot{}},
		Economy:     EconomyAnalysis{EconomySwings: []EconomySwing{}},
		RadarReplay: []RadarFrame{},
	}

	playerMap := make(map[uint64]*PlayerComplete)
	currentRound := 0
	var roundStartTick int

	// Registrar todos os eventos
	p.RegisterEventHandler(func(e events.Kill) {
		tick := p.CurrentTick()
		event := GameEvent{
			Tick: tick,
			Time: p.CurrentTime().Seconds(),
			Type: "kill",
			Kill: &KillEvent{
				Killer:     playerToInfo(e.Killer),
				Victim:     playerToInfo(e.Victim),
				IsHeadshot: e.IsHeadshot,
				Weapon:     e.Weapon.Type.String(),
				Distance:   distance(e.Killer.Position(), e.Victim.Position()),
				KillerPos:  vecToPosition(e.Killer.Position()),
				VictimPos:  vecToPosition(e.Victim.Position()),
			},
		}
		if e.Assister != nil {
			assister := playerToInfo(e.Assister)
			event.Kill.Assister = &assister
		}
		analysis.Events = append(analysis.Events, event)
		updatePlayerStats(e.Killer, e.Victim, e.Assister, true, false, false, playerMap)
	})

	p.RegisterEventHandler(func(e events.RoundStart) {
		currentRound++
		roundStartTick = p.CurrentTick()
		gs := p.GameState()
		
		players := []PlayerState{}
		for _, player := range gs.Participants().Playing() {
			players = append(players, PlayerState{
				SteamID: player.SteamID64,
				Name:    player.Name,
				Team:    teamToString(player.Team),
				Health:  player.Health(),
				Armor:   player.Armor(),
				Money:   player.Money(),
				Position: vecToPosition(player.Position()),
			})
		}

		event := GameEvent{
			Tick: roundStartTick,
			Time: p.CurrentTime().Seconds(),
			Type: "round_start",
			RoundStart: &RoundStartEvent{
				Round: currentRound,
				Players: players,
				TimeLimit: 115,
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.RoundEnd) {
		gs := p.GameState()
		winner := "T"
		if e.Winner != nil && e.Winner.Team == common.TeamCounterTerrorists {
			winner = "CT"
		}
		if e.Winner != nil && e.Winner.Team == common.TeamTerrorists {
			winner = "T"
		}

		scoreT := gs.TeamTerrorists().Score()
		scoreCT := gs.TeamCounterTerrorists().Score()

		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "round_end",
			RoundEnd: &RoundEndEvent{
				Round: currentRound,
				Winner: winner,
				Reason: int(e.Reason),
				ScoreT: scoreT,
				ScoreCT: scoreCT,
			},
		}
		analysis.Events = append(analysis.Events, event)

		// Salvar round data
		analysis.Rounds = append(analysis.Rounds, RoundData{
			Round: currentRound,
			StartTick: roundStartTick,
			EndTick: p.CurrentTick(),
			Winner: winner,
			ScoreT: scoreT,
			ScoreCT: scoreCT,
			Duration: p.CurrentTime().Seconds(),
		})
	})

	p.RegisterEventHandler(func(e events.GrenadeThrown) {
		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "grenade_thrown",
			Grenade: &GrenadeEvent{
				Type: e.Grenade.Weapon.Type.String(),
				Thrower: playerToInfo(e.Thrower),
				Position: vecToPosition(e.Grenade.Position()),
				Velocity: vec3ToVector3(e.Grenade.Velocity()),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.GrenadeExplode) {
		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "grenade_explode",
			Grenade: &GrenadeEvent{
				Type: e.Grenade.Weapon.Type.String(),
				Thrower: playerToInfo(e.Thrower),
				Position: vecToPosition(e.Grenade.Position()),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.BombPlanted) {
		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "bomb_planted",
			Bomb: &BombEvent{
				Type: "planted",
				Player: playerToInfo(e.Player),
				Position: vecToPosition(e.Site.Position()),
				Time: p.CurrentTime().Seconds(),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.BombDefused) {
		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "bomb_defused",
			Bomb: &BombEvent{
				Type: "defused",
				Player: playerToInfo(e.Player),
				Position: vecToPosition(e.Player.Position()),
				Time: p.CurrentTime().Seconds(),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.BombExplode) {
		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "bomb_exploded",
			Bomb: &BombEvent{
				Type: "exploded",
				Position: vecToPosition(e.Position),
				Time: p.CurrentTime().Seconds(),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.WeaponFire) {
		event := GameEvent{
			Tick: p.CurrentTick(),
			Time: p.CurrentTime().Seconds(),
			Type: "weapon_fire",
			WeaponFire: &WeaponFireEvent{
				Shooter: playerToInfo(e.Shooter),
				Weapon: e.Weapon.Type.String(),
				Position: vecToPosition(e.Shooter.Position()),
				ViewAngle: vec3ToVector3(e.Shooter.ViewDirectionX()),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Coletar dados de posição periodicamente para radar replay
	p.RegisterEventHandler(func(e events.FrameDone) {
		if p.CurrentTick()%128 == 0 { // A cada ~2 segundos (128 ticks a 64 tickrate)
			gs := p.GameState()
			frame := RadarFrame{
				Tick: p.CurrentTick(),
				Time: p.CurrentTime().Seconds(),
				Round: currentRound,
				Players: []RadarPlayer{},
			}

			for _, player := range gs.Participants().Playing() {
				frame.Players = append(frame.Players, RadarPlayer{
					SteamID: player.SteamID64,
					Name: player.Name,
					Team: teamToString(player.Team),
					Position: vecToPosition(player.Position()),
					Health: player.Health(),
					Weapon: "unknown", // Precisa ser implementado
					IsAlive: player.IsAlive(),
				})
			}
			analysis.RadarReplay = append(analysis.RadarReplay, frame)
		}
	})

	err = p.ParseToEnd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao processar demo: %v\n", err)
		os.Exit(1)
	}

	// Preencher metadados
	header := p.Header()
	gs := p.GameState()
	analysis.Metadata = MatchMetadata{
		Map: header.MapName,
		Duration: formatDuration(header.PlaybackTime),
		Rounds: currentRound,
		ScoreT: gs.TeamTerrorists().Score(),
		ScoreCT: gs.TeamCounterTerrorists().Score(),
		Date: header.ParsedAt,
		ServerName: header.ServerName,
		DemoTickRate: float64(header.FrameRate()),
	}

	// Converter map de players para slice
	for _, player := range playerMap {
		analysis.Players = append(analysis.Players, *player)
	}

	// Gerar heatmap
	generateHeatmap(analysis)

	// Gerar resumo
	generateSummary(analysis, analysisType)

	// Output JSON
	jsonData, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao serializar JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(string(jsonData))
}

func playerToInfo(p *common.Player) PlayerInfo {
	if p == nil {
		return PlayerInfo{}
	}
	pos := p.Position()
	return PlayerInfo{
		SteamID: p.SteamID64,
		Name: p.Name,
		Team: teamToString(p.Team),
		Health: p.Health(),
		Armor: p.Armor(),
		Money: p.Money(),
		Kills: p.Kills(),
		Deaths: p.Deaths(),
		Assists: p.Assists(),
		IsAlive: p.IsAlive(),
		Position: vecToPosition(pos),
	}
}

func vecToPosition(v st.Position) Position {
	return Position{X: v.X, Y: v.Y, Z: v.Z}
}

func vec3ToVector3(v common.Vector) Vector3 {
	return Vector3{X: v.X, Y: v.Y, Z: v.Z}
}

func teamToString(t common.Team) string {
	if t == common.TeamTerrorists {
		return "T"
	}
	return "CT"
}

func distance(p1, p2 st.Position) float64 {
	dx := p1.X - p2.X
	dy := p1.Y - p2.Y
	dz := p1.Z - p2.Z
	return float64(dx*dx + dy*dy + dz*dz)
}

func updatePlayerStats(killer, victim, assister *common.Player, isKill, isDeath, isAssist bool, playerMap map[uint64]*PlayerComplete) {
	if killer != nil && isKill {
		player := getOrCreatePlayer(killer, playerMap)
		player.Kills++
		if player.RoundsPlayed == 0 {
			player.RoundsPlayed = 1
		}
	}
	if victim != nil && isDeath {
		player := getOrCreatePlayer(victim, playerMap)
		player.Deaths++
	}
	if assister != nil && isAssist {
		player := getOrCreatePlayer(assister, playerMap)
		player.Assists++
	}
}

func getOrCreatePlayer(p *common.Player, playerMap map[uint64]*PlayerComplete) *PlayerComplete {
	if player, ok := playerMap[p.SteamID64]; ok {
		return player
	}
	player := &PlayerComplete{
		SteamID: p.SteamID64,
		Name: p.Name,
		Team: teamToString(p.Team),
	}
	playerMap[p.SteamID64] = player
	return player
}

func generateHeatmap(analysis *CompleteDemoAnalysis) {
	// Implementação básica - agrupar eventos por posição
	positionMap := make(map[string]*HeatmapPoint)
	for _, event := range analysis.Events {
		var pos Position
		if event.Kill != nil {
			pos = event.Kill.VictimPos
		} else if event.Bomb != nil {
			pos = event.Bomb.Position
		} else if event.Grenade != nil {
			pos = event.Grenade.Position
		} else {
			continue
		}

		key := fmt.Sprintf("%.0f,%.0f", pos.X, pos.Y)
		if point, ok := positionMap[key]; ok {
			point.Intensity++
		} else {
			positionMap[key] = &HeatmapPoint{
				X: pos.X,
				Y: pos.Y,
				Z: pos.Z,
				Intensity: 1,
				EventTypes: []string{event.Type},
			}
		}
	}

	for _, point := range positionMap {
		analysis.Heatmap.Points = append(analysis.Heatmap.Points, *point)
	}
	analysis.Heatmap.Map = analysis.Metadata.Map
}

func generateSummary(analysis *CompleteDemoAnalysis, analysisType string) {
	// Encontrar MVP
	var mvp *PlayerComplete
	var topRating float64
	for i := range analysis.Players {
		if analysis.Players[i].KDRatio > topRating {
			topRating = analysis.Players[i].KDRatio
			mvp = &analysis.Players[i]
		}
	}

	mvpName := "N/A"
	if mvp != nil {
		mvpName = mvp.Name
	}

	analysis.Summary = MatchSummary{
		MVP: mvpName,
		Rating: topRating,
		KeyMoments: []string{
			fmt.Sprintf("Total de %d rounds", analysis.Metadata.Rounds),
			fmt.Sprintf("Score final: %d-%d", analysis.Metadata.ScoreT, analysis.Metadata.ScoreCT),
		},
	}
}

func formatDuration(d time.Duration) string {
	totalSeconds := int(d.Seconds())
	minutes := totalSeconds / 60
	seconds := totalSeconds % 60
	return fmt.Sprintf("%d:%02d", minutes, seconds)
}
