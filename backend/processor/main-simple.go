package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	demoinfocs "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs"
	common "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/common"
	events "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/events"
)

// Análise completa com todos os dados
type SimpleAnalysis struct {
	Metadata     MatchMetadata   `json:"metadata"`
	Events       []DetailedEvent  `json:"events"`
	Players      []SimplePlayer   `json:"players"`
	Summary      SimpleSummary   `json:"summary"`
	Heatmap      HeatmapData     `json:"heatmap"`
	RadarReplay  []RadarSnapshot  `json:"radarReplay"`
	TargetPlayer *PlayerAnalysis `json:"targetPlayer,omitempty"`
}

type MatchMetadata struct {
	Map      string `json:"map"`
	Duration string `json:"duration"`
	Rounds   int    `json:"rounds"`
	ScoreT   int    `json:"scoreT"`
	ScoreCT  int    `json:"scoreCT"`
}

type DetailedEvent struct {
	Type   string                 `json:"type"`
	Time   float64                `json:"time"`
	Tick   int                    `json:"tick"`
	Round  int                    `json:"round"`
	Data   map[string]interface{} `json:"data,omitempty"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type ViewAngles struct {
	Pitch float64 `json:"pitch"`
	Yaw   float64 `json:"yaw"`
}

type SimplePlayer struct {
	SteamID uint64 `json:"steamID"`
	Name    string `json:"name"`
	Team    string `json:"team"`
	Kills   int    `json:"kills"`
	Deaths  int    `json:"deaths"`
	Assists int    `json:"assists"`
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
	Type      string  `json:"type"` // "kill", "death", "bomb", "grenade", etc.
}

type RadarSnapshot struct {
	Tick    int               `json:"tick"`
	Time    float64           `json:"time"`
	Round   int               `json:"round"`
	Players []RadarPlayerData `json:"players"`
}

type RadarPlayerData struct {
	SteamID    uint64     `json:"steamID"`
	Name       string     `json:"name"`
	Team       string     `json:"team"`
	Position   Position   `json:"position"`
	ViewAngles ViewAngles `json:"viewAngles"`
	Health     int        `json:"health"`
	Armor      int        `json:"armor"`
	Money      int        `json:"money"`
	IsAlive    bool       `json:"isAlive"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Uso: %s <demo_path> [steam_id]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  demo_path: caminho para o arquivo .dem\n")
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

	if _, err := os.Stat(demoPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Erro: arquivo não encontrado: %s\n", demoPath)
		os.Exit(1)
	}

	f, err := os.Open(demoPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao abrir arquivo: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	fileInfo, err := f.Stat()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao obter informações do arquivo: %v\n", err)
		os.Exit(1)
	}
	if fileInfo.Size() == 0 {
		fmt.Fprintf(os.Stderr, "Erro: arquivo está vazio\n")
		os.Exit(1)
	}

	p := demoinfocs.NewParser(f)
	defer p.Close()

	analysis := &SimpleAnalysis{
		Events:      []DetailedEvent{},
		Players:     []SimplePlayer{},
		Heatmap:     HeatmapData{Points: []HeatmapPoint{}},
		RadarReplay: []RadarSnapshot{},
	}

	playerMap := make(map[uint64]*SimplePlayer)
	playerStats := make(map[uint64]*PlayerStats)
	heatmapPoints := make(map[string]*HeatmapPoint) // "x,y,z,type" -> point
	var roundCount int
	var currentRound int
	lastSnapshotTick := 0
	snapshotInterval := 512 // A cada 512 ticks (~8 segundos em 64 tick) - reduzir frequência

	// Função auxiliar para obter posição
	getPosition := func(p *common.Player) Position {
		if p == nil {
			return Position{}
		}
		pos := p.Position()
		return Position{X: pos.X, Y: pos.Y, Z: pos.Z}
	}

	// Função auxiliar para obter view angles
	getViewAngles := func(p *common.Player) ViewAngles {
		if p == nil {
			return ViewAngles{}
		}
		// ViewDirectionX() retorna float32 (direção X do view vector)
		// Para obter pitch/yaw completos, precisaríamos de mais dados
		// Por enquanto retornamos valores básicos
		return ViewAngles{
			Pitch: 0, // Precisaríamos calcular do vector completo
			Yaw:   0,
		}
	}

	// Função para adicionar ponto ao heatmap
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

	// Função para criar snapshot do radar
	createRadarSnapshot := func() {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		gs := p.GameState()
		if gs == nil {
			return
		}

		tick := gs.IngameTick()
		if tick-lastSnapshotTick < snapshotInterval {
			return
		}
		lastSnapshotTick = tick

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		snapshot := RadarSnapshot{
			Tick:    tick,
			Time:    timeSeconds,
			Round:   currentRound,
			Players: []RadarPlayerData{},
		}

		// Coletar dados de todos os jogadores
		for _, player := range gs.Participants().All() {
			if player == nil {
				continue
			}

			pos := getPosition(player)
			view := getViewAngles(player)

			playerData := RadarPlayerData{
				SteamID:    player.SteamID64,
				Name:       player.Name,
				Team:       teamToString(player.Team),
				Position:   pos,
				ViewAngles: view,
				Health:     player.Health(),
				Armor:      player.Armor(),
				Money:      player.Money(),
				IsAlive:    player.IsAlive(),
			}

			snapshot.Players = append(snapshot.Players, playerData)
		}

		analysis.RadarReplay = append(analysis.RadarReplay, snapshot)
	}

	// Evento: RoundStart
	p.RegisterEventHandler(func(e events.RoundStart) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		currentRound++
		roundCount++

		gs := p.GameState()
		tick := 0
		if gs != nil {
			tick = gs.IngameTick()
		}

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		event := DetailedEvent{
			Type:  "round_start",
			Time:  timeSeconds,
			Tick:  tick,
			Round: currentRound,
			Data: map[string]interface{}{
				"round": currentRound,
			},
		}
		analysis.Events = append(analysis.Events, event)

		// Snapshot do radar apenas no início do round
		createRadarSnapshot()
	})

	// Evento: RoundEnd
	p.RegisterEventHandler(func(e events.RoundEnd) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		winner := "T"
		if e.Winner == common.TeamCounterTerrorists {
			winner = "CT"
		}

		gs := p.GameState()
		tick := 0
		if gs != nil {
			tick = gs.IngameTick()
		}

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		event := DetailedEvent{
			Type:  "round_end",
			Time:  timeSeconds,
			Tick:  tick,
			Round: currentRound,
			Data: map[string]interface{}{
				"round":  currentRound,
				"winner": winner,
				"reason": int(e.Reason),
			},
		}
		analysis.Events = append(analysis.Events, event)

		// Snapshot do radar apenas no final do round
		createRadarSnapshot()
	})

	// Evento: Kill (com posições completas)
	p.RegisterEventHandler(func(e events.Kill) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		gs := p.GameState()
		tick := 0
		if gs != nil {
			tick = gs.IngameTick()
		}

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		// Atualizar stats
		if e.Killer != nil {
			updatePlayer(e.Killer, playerMap, true, false, false)
			if e.IsHeadshot {
				updatePlayerStats(e.Killer, playerStats, true, false, false)
			}
		}
		if e.Victim != nil {
			updatePlayer(e.Victim, playerMap, false, true, false)
		}
		if e.Assister != nil {
			updatePlayer(e.Assister, playerMap, false, false, true)
		}

		weaponStr := "unknown"
		if e.Weapon != nil {
			weaponStr = e.Weapon.Type.String()
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

		event := DetailedEvent{
			Type:  "kill",
			Time:  timeSeconds,
			Tick:  tick,
			Round: currentRound,
			Data: map[string]interface{}{
				"killer": map[string]interface{}{
					"name":     getName(e.Killer),
					"steamID":  getSteamID(e.Killer),
					"position": killerPos,
				},
				"victim": map[string]interface{}{
					"name":     getName(e.Victim),
					"steamID":  getSteamID(e.Victim),
					"position": victimPos,
				},
				"assister": getName(e.Assister),
				"headshot": e.IsHeadshot,
				"weapon":   weaponStr,
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Evento: PlayerHurt (apenas atualizar stats, sem criar evento)
	p.RegisterEventHandler(func(e events.PlayerHurt) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		// Apenas atualizar dano para estatísticas, sem criar evento
		if e.Attacker != nil && e.Attacker.IsAlive() {
			updatePlayerDamage(e.Attacker, playerStats, e.HealthDamage)
		}
	})

	// WeaponFire removido - não capturar todos os disparos, apenas em kills

	// Evento: BombPlanted (com posição e timer)
	p.RegisterEventHandler(func(e events.BombPlanted) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		if e.Player == nil {
			return
		}

		gs := p.GameState()
		tick := 0
		if gs != nil {
			tick = gs.IngameTick()
		}

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		playerPos := getPosition(e.Player)
		site := "unknown"
		// Tentar determinar site pela posição (simplificado)
		if playerPos.Z < 100 {
			site = "A"
		} else {
			site = "B"
		}

		addHeatmapPoint(playerPos, "bomb_planted")

		event := DetailedEvent{
			Type:  "bomb_planted",
			Time:  timeSeconds,
			Tick:  tick,
			Round: currentRound,
			Data: map[string]interface{}{
				"player": map[string]interface{}{
					"name":     getName(e.Player),
					"steamID":  getSteamID(e.Player),
					"position": playerPos,
				},
				"site":    site,
				"timer":   40.0, // 40 segundos padrão
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Evento: BombDefused
	p.RegisterEventHandler(func(e events.BombDefused) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		if e.Player == nil {
			return
		}

		gs := p.GameState()
		tick := 0
		if gs != nil {
			tick = gs.IngameTick()
		}

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		playerPos := getPosition(e.Player)

		event := DetailedEvent{
			Type:  "bomb_defused",
			Time:  timeSeconds,
			Tick:  tick,
			Round: currentRound,
			Data: map[string]interface{}{
				"player": map[string]interface{}{
					"name":     getName(e.Player),
					"steamID":  getSteamID(e.Player),
					"position": playerPos,
				},
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Evento: BombExplode
	p.RegisterEventHandler(func(e events.BombExplode) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()

		gs := p.GameState()
		tick := 0
		if gs != nil {
			tick = gs.IngameTick()
		}

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		// Tentar obter posição da bomba (se disponível no GameState)
		bombPos := Position{}
		bombEntity := gs.Bomb()
		if bombEntity != nil {
			bombPos = Position{
				X: bombEntity.Position().X,
				Y: bombEntity.Position().Y,
				Z: bombEntity.Position().Z,
			}
			addHeatmapPoint(bombPos, "bomb_exploded")
		}

		event := DetailedEvent{
			Type:  "bomb_exploded",
			Time:  timeSeconds,
			Tick:  tick,
			Round: currentRound,
			Data: map[string]interface{}{
				"position": bombPos,
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Evento: Grenade (usando eventos disponíveis na v5)
	// Na v5, eventos de granada podem estar em outros eventos ou precisam ser rastreados via GameState
	// Por enquanto, rastreamos através de equipamentos e eventos de dano de granada
	// TODO: Implementar tracking completo de granadas quando disponível na API v5

	// Parsear demo
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "Erro fatal ao processar demo: %v\n", r)
			fmt.Fprintf(os.Stderr, "A demo pode estar corrompida, ser de versão antiga ou formato não suportado\n")
			os.Exit(1)
		}
	}()

	err = p.ParseToEnd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao processar demo: %v\n", err)
		// Continuar com o que conseguiu processar
	}

	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "Erro ao acessar dados após parsing: %v\n", r)
			os.Exit(1)
		}
	}()

	gs := p.GameState()
	if gs == nil {
		fmt.Fprintf(os.Stderr, "Erro: GameState não disponível após parsing\n")
		os.Exit(1)
	}

	duration := p.CurrentTime()

	// Tentar obter nome do mapa de várias formas
	mapName := "unknown"
	// Tentar do GameState através dos participantes
	for _, participant := range gs.Participants().All() {
		if participant != nil && participant.IsAlive() {
			// O nome do mapa pode estar em outras propriedades
			// Por enquanto deixamos como unknown se não conseguirmos
			break
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

	analysis.Metadata = MatchMetadata{
		Map:      mapName,
		Duration: formatDuration(duration),
		Rounds:   roundCount,
		ScoreT:   scoreT,
		ScoreCT:  scoreCT,
	}

	// Converter heatmap points para array
	analysis.Heatmap.Map = mapName
	for _, point := range heatmapPoints {
		analysis.Heatmap.Points = append(analysis.Heatmap.Points, *point)
	}

	for _, player := range playerMap {
		analysis.Players = append(analysis.Players, *player)
	}

	if targetSteamID != 0 {
		targetPlayer := findPlayerAnalysis(targetSteamID, playerMap, playerStats, roundCount)
		if targetPlayer != nil {
			analysis.TargetPlayer = targetPlayer
		}
	}

	var mvp *SimplePlayer
	var topRating float64
	for _, player := range analysis.Players {
		if player.Kills > 0 {
			rating := float64(player.Kills) / float64(max(player.Deaths, 1))
			if rating > topRating {
				topRating = rating
				mvp = &player
			}
		}
	}

	mvpName := "N/A"
	if mvp != nil {
		mvpName = mvp.Name
	}

	analysis.Summary = SimpleSummary{
		MVP:    mvpName,
		Rating: topRating,
	}

	jsonData, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao serializar: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(string(jsonData))
}

type PlayerStats struct {
	Kills        int
	Deaths       int
	Assists      int
	HSKills      int
	Damage       int
	RoundsPlayed int
}

func updatePlayer(p *common.Player, playerMap map[uint64]*SimplePlayer, isKill, isDeath, isAssist bool) {
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

func updatePlayerStats(p *common.Player, playerStats map[uint64]*PlayerStats, isHS, isKill, isDeath bool) {
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

func updatePlayerDamage(p *common.Player, playerStats map[uint64]*PlayerStats, damage int) {
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
		Recommendations: generateRecommendations(stats, hsRate, adr, kdRatio),
	}
}

func generateRecommendations(stats *PlayerStats, hsRate, adr, kdRatio float64) []string {
	recs := []string{}

	if hsRate < 30 {
		recs = append(recs, "Trabalhe em mira mais precisa para aumentar taxa de headshots")
	}
	if adr < 60 {
		recs = append(recs, "Foque em causar mais dano por round (ADR)")
	}
	if kdRatio < 1.0 {
		recs = append(recs, "Melhore posicionamento para evitar mortes desnecessárias")
	}
	if stats.Damage > 0 && stats.Kills == 0 {
		recs = append(recs, "Converte dano em kills - finalize as trocas")
	}

	if len(recs) == 0 {
		recs = append(recs, "Mantenha o bom desempenho!")
	}

	return recs
}

func getName(p *common.Player) string {
	if p == nil {
		return ""
	}
	return p.Name
}

func getSteamID(p *common.Player) uint64 {
	if p == nil {
		return 0
	}
	return p.SteamID64
}

func getWeaponName(w *common.Equipment) string {
	if w == nil {
		return "unknown"
	}
	return w.Type.String()
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

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
