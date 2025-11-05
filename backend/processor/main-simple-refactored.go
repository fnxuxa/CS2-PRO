package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	demoinfocs "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs"
	common "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/common"
	events "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/events"
)

// Análise completa com todos os dados
type SimpleAnalysis struct {
	Metadata     MatchMetadata   `json:"metadata"`
	Events       []DetailedEvent `json:"events"`
	Players      []SimplePlayer  `json:"players"`
	Summary      SimpleSummary   `json:"summary"`
	Heatmap      HeatmapData     `json:"heatmap"`
	TargetPlayer *PlayerAnalysis `json:"targetPlayer,omitempty"`
}

type MatchMetadata struct {
	Map          string `json:"map"`
	Duration     string `json:"duration"`
	Rounds       int    `json:"rounds"`
	ScoreT       int    `json:"scoreT"`
	ScoreCT      int    `json:"scoreCT"`
	WarmupRounds int    `json:"warmupRounds"`
	KnifeRound   bool   `json:"knifeRound"`
	Source       string `json:"source"` // "GC" ou "Valve"
}

type DetailedEvent struct {
	Type     string                 `json:"type"`
	Time     float64                `json:"time"`
	Tick     int                    `json:"tick"`
	Round    int                    `json:"round"`
	IsWarmup bool                   `json:"isWarmup,omitempty"`
	IsKnife  bool                   `json:"isKnife,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type SimplePlayer struct {
	SteamID uint64  `json:"steamID"`
	Name    string  `json:"name"`
	Team    string  `json:"team"`
	Kills   int     `json:"kills"`
	Deaths  int     `json:"deaths"`
	Assists int     `json:"assists"`
	Damage  int     `json:"damage"`
	ADR     float64 `json:"adr"`
}

type PlayerStats struct {
	Kills   int
	Deaths  int
	HSKills int
	Damage  int
}

type SimpleSummary struct {
	MVP    string  `json:"mvp"`
	Rating float64 `json:"rating"`
}

type HeatmapData struct {
	Map    string         `json:"map"`
	Points []HeatmapPoint `json:"points"`
}

type HeatmapPoint struct {
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Z         float64 `json:"z"`
	Intensity int     `json:"intensity"`
	Type      string  `json:"type"`
}

type PlayerAnalysis struct {
	SteamID         uint64   `json:"steamID"`
	Name            string   `json:"name"`
	Team            string   `json:"team"`
	Kills           int      `json:"kills"`
	Deaths          int      `json:"deaths"`
	Assists         int      `json:"assists"`
	HSKills         int      `json:"hsKills"`
	Damage          int      `json:"damage"`
	ADR             float64  `json:"adr"`
	HSRate          float64  `json:"hsRate"`
	KDRatio         float64  `json:"kdRatio"`
	RoundsPlayed    int      `json:"roundsPlayed"`
	KeyMoments      []string `json:"keyMoments"`
	Recommendations []string `json:"recommendations"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Uso: %s <demo_path> [steam_id]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  demo_path: Caminho para o arquivo .dem\n")
		fmt.Fprintf(os.Stderr, "  steam_id: (opcional) Steam ID64 do jogador para análise focada\n")
		os.Exit(1)
	}

	demoPath := os.Args[1]
	var targetSteamID uint64 = 0
	if len(os.Args) >= 3 {
		_, err := fmt.Sscanf(os.Args[2], "%d", &targetSteamID)
		if err != nil {
			targetSteamID = 0
		}
	}

	f, err := os.Open(demoPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao abrir demo: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	p := demoinfocs.NewParser(f)
	defer p.Close()

	analysis := &SimpleAnalysis{
		Events:  []DetailedEvent{},
		Players: []SimplePlayer{},
		Heatmap: HeatmapData{Points: []HeatmapPoint{}},
	}

	// Variáveis de tracking
	playerMap := make(map[uint64]*SimplePlayer)
	playerStats := make(map[uint64]*PlayerStats)
	heatmapPoints := make(map[string]*HeatmapPoint)

	var currentRound int = 0
	var isGC bool = false
	var officialRoundStart int = -1
	warmupRounds := make(map[int]bool)
	knifeRounds := make(map[int]bool)
	roundKills := make(map[int]int)
	roundKnifeKills := make(map[int]int)
	roundScores := make(map[int]map[string]int)

	startTime := time.Now()

	// Função auxiliar
	getPosition := func(p *common.Player) Position {
		if p == nil {
			return Position{}
		}
		pos := p.Position()
		return Position{X: pos.X, Y: pos.Y, Z: pos.Z}
	}

	addHeatmapPoint := func(pos Position, eventType string) {
		key := fmt.Sprintf("%.1f,%.1f,%.1f,%s", pos.X, pos.Y, pos.Z, eventType)
		point, exists := heatmapPoints[key]
		if !exists {
			point = &HeatmapPoint{
				X:         pos.X,
				Y:         pos.Y,
				Z:         pos.Z,
				Intensity: 0,
				Type:      eventType,
			}
			heatmapPoints[key] = point
		}
		point.Intensity++
	}

	updatePlayer := func(p *common.Player, isKill, isDeath, isAssist bool) {
		if p == nil {
			return
		}
		player, exists := playerMap[p.SteamID64]
		if !exists {
			player = &SimplePlayer{
				SteamID: p.SteamID64,
				Name:    p.Name,
				Team:    teamToString(p.Team),
			}
			playerMap[p.SteamID64] = player
		} else {
			// Atualizar time e nome (pode mudar durante a partida)
			player.Team = teamToString(p.Team)
			if p.Name != "" {
				player.Name = p.Name
			}
		}
		if isKill {
			player.Kills++
		}
		if isDeath {
			player.Deaths++
		}
		if isAssist {
			player.Assists++
		}
	}

	updatePlayerStats := func(p *common.Player, isHS, isKill, isDeath bool) {
		if p == nil {
			return
		}
		stats, exists := playerStats[p.SteamID64]
		if !exists {
			stats = &PlayerStats{}
			playerStats[p.SteamID64] = stats
		}
		if isHS {
			stats.HSKills++
		}
		if isKill {
			stats.Kills++
		}
		if isDeath {
			stats.Deaths++
		}
	}

	updatePlayerDamage := func(p *common.Player, damage int) {
		if p == nil {
			return
		}
		stats, exists := playerStats[p.SteamID64]
		if !exists {
			stats = &PlayerStats{}
			playerStats[p.SteamID64] = stats
		}
		stats.Damage += damage
	}

	// RoundStart
	p.RegisterEventHandler(func(e events.RoundStart) {
		currentRound++
		gs := p.GameState()
		ctScore := 0
		tScore := 0
		if gs != nil {
			if gs.TeamCounterTerrorists() != nil {
				ctScore = gs.TeamCounterTerrorists().Score()
			}
			if gs.TeamTerrorists() != nil {
				tScore = gs.TeamTerrorists().Score()
			}
		}

		// DETECÇÃO DE GC: Se rounds 1-4 têm score 0-0, é GC
		if currentRound <= 4 && ctScore == 0 && tScore == 0 {
			isGC = true
		}

		// LÓGICA DE WARMUP:
		// GC: rounds 1-4 são SEMPRE warmup
		// MM: round 0 é warmup, e rounds com score 0-0 são warmup
		isWarmupRound := false
		if currentRound == 0 {
			isWarmupRound = true
		} else if isGC && currentRound <= 4 {
			isWarmupRound = true
		}

		if isWarmupRound {
			warmupRounds[currentRound] = true
		}

		// Marcar primeiro round oficial
		// GC: round 5 é o primeiro oficial
		// MM: primeiro round com score > 0 ou após warmup
		if !isWarmupRound && officialRoundStart == -1 {
			officialRoundStart = currentRound
		}

		roundKills[currentRound] = 0
		roundKnifeKills[currentRound] = 0
		roundScores[currentRound] = map[string]int{"CT": ctScore, "T": tScore}

		event := DetailedEvent{
			Type: "round_start",
			Time: p.CurrentTime().Seconds(),
			Tick: func() int {
				if gs != nil {
					return gs.IngameTick()
				}
				return 0
			}(),
			Round:    currentRound,
			IsWarmup: isWarmupRound,
			Data:     map[string]interface{}{"round": currentRound},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// RoundEnd
	p.RegisterEventHandler(func(e events.RoundEnd) {
		winner := "T"
		if e.Winner == common.TeamCounterTerrorists {
			winner = "CT"
		}

		gs := p.GameState()
		knifeKills := roundKnifeKills[currentRound]
		totalKills := roundKills[currentRound]
		isKnifeRound := knifeKills >= 3 && totalKills > 0 && float64(knifeKills)/float64(totalKills) > 0.5

		if isKnifeRound {
			knifeRounds[currentRound] = true
		}

		// IMPORTANTE: Para GC, rounds 1-4 são SEMPRE warmup
		isWarmupRound := warmupRounds[currentRound]
		if isGC && currentRound <= 4 {
			isWarmupRound = true
			warmupRounds[currentRound] = true
		}

		// Marcar primeiro round oficial
		if officialRoundStart == -1 && !isWarmupRound && !isKnifeRound {
			officialRoundStart = currentRound
		}

		event := DetailedEvent{
			Type: "round_end",
			Time: p.CurrentTime().Seconds(),
			Tick: func() int {
				if gs != nil {
					return gs.IngameTick()
				}
				return 0
			}(),
			Round:    currentRound,
			IsWarmup: isWarmupRound,
			IsKnife:  isKnifeRound,
			Data: map[string]interface{}{
				"round":  currentRound,
				"winner": winner,
				"reason": int(e.Reason),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Kill
	p.RegisterEventHandler(func(e events.Kill) {
		gs := p.GameState()
		isWarmupRound := warmupRounds[currentRound]
		isKnifeRound := knifeRounds[currentRound]

		// IMPORTANTE: Para GC, sempre ignorar rounds 1-4
		if isGC && currentRound <= 4 {
			return // Não processar kills em rounds de warmup GC
		}

		// Só processar kills em rounds oficiais
		if isWarmupRound || isKnifeRound {
			return
		}

		roundKills[currentRound]++
		weaponStr := "unknown"
		if e.Weapon != nil {
			weaponStr = e.Weapon.Type.String()
		}
		if weaponStr == "Knife" || weaponStr == "knife" || weaponStr == "Bayonet" {
			roundKnifeKills[currentRound]++
		}

		killerPos := Position{}
		victimPos := Position{}
		if e.Killer != nil {
			killerPos = getPosition(e.Killer)
			addHeatmapPoint(killerPos, "kill")
		}
		if e.Victim != nil {
			victimPos = getPosition(e.Victim)
			addHeatmapPoint(victimPos, "death")
		}

		// Capturar time atual do player no momento da kill
		killerTeam := ""
		if e.Killer != nil {
			killerTeam = teamToString(e.Killer.Team)
		}
		victimTeam := ""
		if e.Victim != nil {
			victimTeam = teamToString(e.Victim.Team)
		}

		event := DetailedEvent{
			Type: "kill",
			Time: p.CurrentTime().Seconds(),
			Tick: func() int {
				if gs != nil {
					return gs.IngameTick()
				}
				return 0
			}(),
			Round:    currentRound,
			IsWarmup: isWarmupRound,
			IsKnife:  isKnifeRound,
			Data: map[string]interface{}{
				"killer": map[string]interface{}{
					"name": func() string {
						if e.Killer != nil {
							return e.Killer.Name
						}
						return ""
					}(),
					"steamID": func() uint64 {
						if e.Killer != nil {
							return e.Killer.SteamID64
						}
						return 0
					}(),
					"position": killerPos,
					"team":     killerTeam,
				},
				"victim": map[string]interface{}{
					"name": func() string {
						if e.Victim != nil {
							return e.Victim.Name
						}
						return ""
					}(),
					"steamID": func() uint64 {
						if e.Victim != nil {
							return e.Victim.SteamID64
						}
						return 0
					}(),
					"position": victimPos,
					"team":     victimTeam,
				},
				"assister": func() string {
					if e.Assister != nil {
						return e.Assister.Name
					}
					return ""
				}(),
				"headshot": e.IsHeadshot,
				"weapon":   weaponStr,
			},
		}
		analysis.Events = append(analysis.Events, event)

		// Atualizar stats
		if e.Killer != nil {
			updatePlayer(e.Killer, true, false, false)
			if e.IsHeadshot {
				updatePlayerStats(e.Killer, true, false, false)
			} else {
				updatePlayerStats(e.Killer, false, true, false)
			}
		}
		if e.Victim != nil {
			updatePlayer(e.Victim, false, true, false)
			updatePlayerStats(e.Victim, false, false, true)
		}
		if e.Assister != nil {
			updatePlayer(e.Assister, false, false, true)
		}
	})

	// PlayerHurt (para damage)
	p.RegisterEventHandler(func(e events.PlayerHurt) {
		isWarmupRound := warmupRounds[currentRound]
		isKnifeRound := knifeRounds[currentRound]

		if isGC && currentRound <= 4 {
			return
		}
		if isWarmupRound || isKnifeRound {
			return
		}

		if e.Attacker != nil && e.Attacker.IsAlive() {
			updatePlayerDamage(e.Attacker, e.HealthDamage)
		}
	})

	// BombPlanted
	p.RegisterEventHandler(func(e events.BombPlanted) {
		isWarmupRound := warmupRounds[currentRound]
		isKnifeRound := knifeRounds[currentRound]

		if isGC && currentRound <= 4 {
			return
		}
		if isWarmupRound || isKnifeRound {
			return
		}

		if e.Player == nil {
			return
		}

		playerPos := getPosition(e.Player)
		addHeatmapPoint(playerPos, "bomb_planted")

		event := DetailedEvent{
			Type: "bomb_planted",
			Time: p.CurrentTime().Seconds(),
			Tick: func() int {
				gs := p.GameState()
				if gs != nil {
					return gs.IngameTick()
				}
				return 0
			}(),
			Round: currentRound,
			Data: map[string]interface{}{
				"player": map[string]interface{}{
					"name":     e.Player.Name,
					"steamID":  e.Player.SteamID64,
					"position": playerPos,
				},
				"site":  "unknown",
				"timer": 40.0,
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// BombDefused
	p.RegisterEventHandler(func(e events.BombDefused) {
		isWarmupRound := warmupRounds[currentRound]
		isKnifeRound := knifeRounds[currentRound]

		if isGC && currentRound <= 4 {
			return
		}
		if isWarmupRound || isKnifeRound {
			return
		}

		if e.Player == nil {
			return
		}

		playerPos := getPosition(e.Player)
		event := DetailedEvent{
			Type: "bomb_defused",
			Time: p.CurrentTime().Seconds(),
			Tick: func() int {
				gs := p.GameState()
				if gs != nil {
					return gs.IngameTick()
				}
				return 0
			}(),
			Round: currentRound,
			Data: map[string]interface{}{
				"player": map[string]interface{}{
					"name":     e.Player.Name,
					"steamID":  e.Player.SteamID64,
					"position": playerPos,
				},
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Parsear demo
	err = p.ParseToEnd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao parsear demo: %v\n", err)
		os.Exit(1)
	}

	duration := time.Since(startTime)
	gs := p.GameState()
	if gs == nil {
		fmt.Fprintf(os.Stderr, "Erro: GameState não disponível\n")
		os.Exit(1)
	}

	// Coletar TODOS os players do GameState
	for _, player := range gs.Participants().All() {
		if player != nil && player.SteamID64 > 0 {
			updatePlayer(player, false, false, false)
		}
	}

	// Detectar mapa
	mapName := "unknown"
	if demoPath != "" {
		pathLower := strings.ToLower(demoPath)
		if strings.Contains(pathLower, "de_mirage") {
			mapName = "de_mirage"
		} else if strings.Contains(pathLower, "de_dust2") || strings.Contains(pathLower, "dust2") {
			mapName = "de_dust2"
		} else if strings.Contains(pathLower, "de_inferno") {
			mapName = "de_inferno"
		} else if strings.Contains(pathLower, "de_ancient") {
			mapName = "de_ancient"
		} else if strings.Contains(pathLower, "de_vertigo") {
			mapName = "de_vertigo"
		} else if strings.Contains(pathLower, "de_anubis") {
			mapName = "de_anubis"
		} else if strings.Contains(pathLower, "de_overpass") {
			mapName = "de_overpass"
		} else if strings.Contains(pathLower, "de_nuke") {
			mapName = "de_nuke"
		}
	}

	scoreT := 0
	scoreCT := 0
	if gs.TeamTerrorists() != nil {
		scoreT = gs.TeamTerrorists().Score()
	}
	if gs.TeamCounterTerrorists() != nil {
		scoreCT = gs.TeamCounterTerrorists().Score()
	}

	// Contar rounds oficiais
	officialRounds := 0
	warmupCount := 0
	hasKnifeRound := false
	for r := 0; r <= currentRound; r++ {
		if warmupRounds[r] {
			warmupCount++
		} else if knifeRounds[r] {
			hasKnifeRound = true
		} else {
			officialRounds++
		}
	}

	// Se GC, garantir que rounds 1-4 sejam contados como warmup
	if isGC && warmupCount < 4 {
		warmupCount = 4
	}

	source := "Valve"
	if isGC {
		source = "GC"
	}

	analysis.Metadata = MatchMetadata{
		Map:          mapName,
		Duration:     formatDuration(duration),
		Rounds:       officialRounds,
		ScoreT:       scoreT,
		ScoreCT:      scoreCT,
		WarmupRounds: warmupCount,
		KnifeRound:   hasKnifeRound,
		Source:       source,
	}

	// Converter heatmap
	analysis.Heatmap.Map = mapName
	for _, point := range heatmapPoints {
		analysis.Heatmap.Points = append(analysis.Heatmap.Points, *point)
	}

	// Adicionar damage e ADR aos players
	for _, player := range playerMap {
		stats, hasStats := playerStats[player.SteamID]
		if hasStats {
			player.Damage = stats.Damage
			if officialRounds > 0 {
				player.ADR = float64(stats.Damage) / float64(officialRounds)
			}
		}
		analysis.Players = append(analysis.Players, *player)
	}

	// Calcular MVP
	var mvp *SimplePlayer
	maxRating := 0.0
	for _, player := range analysis.Players {
		kd := 0.0
		if player.Deaths > 0 {
			kd = float64(player.Kills) / float64(player.Deaths)
		} else if player.Kills > 0 {
			kd = float64(player.Kills)
		}
		rating := kd * float64(player.ADR) / 100.0
		if rating > maxRating {
			maxRating = rating
			mvp = &player
		}
	}

	analysis.Summary = SimpleSummary{
		MVP: func() string {
			if mvp != nil {
				return mvp.Name
			}
			return "N/A"
		}(),
		Rating: maxRating,
	}

	// Se tiver targetPlayer, criar análise detalhada
	if targetSteamID != 0 {
		targetPlayer := findPlayerAnalysis(targetSteamID, playerMap, playerStats, officialRounds)
		if targetPlayer != nil {
			analysis.TargetPlayer = targetPlayer
		}
	}

	// Output JSON
	jsonData, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao serializar JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(string(jsonData))
	fmt.Fprintf(os.Stderr, "[DEBUG] Partida processada: %d rounds, %d eventos, %d players\n",
		officialRounds, len(analysis.Events), len(analysis.Players))
	fmt.Fprintf(os.Stderr, "[DEBUG] Tipo: %s, Warmup: %d rounds\n", source, warmupCount)
}

func findPlayerAnalysis(steamID uint64, playerMap map[uint64]*SimplePlayer, playerStats map[uint64]*PlayerStats, rounds int) *PlayerAnalysis {
	player, exists := playerMap[steamID]
	if !exists {
		return nil
	}

	stats, hasStats := playerStats[steamID]
	if !hasStats {
		stats = &PlayerStats{}
	}

	hsRate := 0.0
	if stats.Kills > 0 {
		hsRate = (float64(stats.HSKills) / float64(stats.Kills)) * 100
	}

	adr := 0.0
	if rounds > 0 {
		adr = float64(stats.Damage) / float64(rounds)
	}

	kdRatio := 0.0
	if stats.Deaths > 0 {
		kdRatio = float64(stats.Kills) / float64(stats.Deaths)
	}

	return &PlayerAnalysis{
		SteamID:         steamID,
		Name:            player.Name,
		Team:            player.Team,
		Kills:           stats.Kills,
		Deaths:          stats.Deaths,
		Assists:         player.Assists,
		HSKills:         stats.HSKills,
		Damage:          stats.Damage,
		ADR:             adr,
		HSRate:          hsRate,
		KDRatio:         kdRatio,
		RoundsPlayed:    rounds,
		KeyMoments:      []string{fmt.Sprintf("%d kills com %.1f%% HS rate", stats.Kills, hsRate)},
		Recommendations: []string{"Mantenha o bom desempenho!"},
	}
}

func teamToString(t common.Team) string {
	if t == common.TeamTerrorists {
		return "T"
	}
	return "CT"
}

func formatDuration(d time.Duration) string {
	totalSeconds := int(d.Seconds())
	minutes := totalSeconds / 60
	seconds := totalSeconds % 60
	return fmt.Sprintf("%d:%02d", minutes, seconds)
}
