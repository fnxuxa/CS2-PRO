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

// Versão simplificada que compila
type SimpleAnalysis struct {
	Metadata     MatchMetadata   `json:"metadata"`
	Events       []SimpleEvent   `json:"events"`
	Players      []SimplePlayer  `json:"players"`
	Summary      SimpleSummary   `json:"summary"`
	TargetPlayer *PlayerAnalysis `json:"targetPlayer,omitempty"` // Análise focada no Steam ID fornecido
}

type MatchMetadata struct {
	Map      string `json:"map"`
	Duration string `json:"duration"`
	Rounds   int    `json:"rounds"`
	ScoreT   int    `json:"scoreT"`
	ScoreCT  int    `json:"scoreCT"`
}

type SimpleEvent struct {
	Type string      `json:"type"`
	Time float64     `json:"time"`
	Data interface{} `json:"data,omitempty"`
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

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Uso: %s <demo_path> [steam_id]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  demo_path: caminho para o arquivo .dem\n")
		fmt.Fprintf(os.Stderr, "  steam_id: (opcional) Steam ID64 do jogador para análise focada\n")
		os.Exit(1)
	}

	demoPath := os.Args[1]
	var targetSteamID uint64 = 0

	// Steam ID é opcional
	if len(os.Args) >= 3 {
		_, err := fmt.Sscanf(os.Args[2], "%d", &targetSteamID)
		if err != nil {
			// Se não for número, ignora silenciosamente
			targetSteamID = 0
		}
	}

	// Verificar se arquivo existe
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

	// Verificar se arquivo não está vazio
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
		Events:  []SimpleEvent{},
		Players: []SimplePlayer{},
	}

	playerMap := make(map[uint64]*SimplePlayer)
	playerStats := make(map[uint64]*PlayerStats)
	var roundCount int

	p.RegisterEventHandler(func(e events.RoundStart) {
		defer func() {
			if r := recover(); r != nil {
				// Silenciosamente ignora erros em eventos
				return
			}
		}()
		roundCount++
		gs := p.GameState()
		var tick int
		if gs != nil {
			tick = gs.IngameTick()
		}
		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}
		event := SimpleEvent{
			Type: "round_start",
			Time: timeSeconds,
			Data: map[string]interface{}{
				"round": roundCount,
				"tick":  tick,
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

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

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		event := SimpleEvent{
			Type: "round_end",
			Time: timeSeconds,
			Data: map[string]interface{}{
				"round":  roundCount,
				"winner": winner,
				"reason": int(e.Reason),
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.Kill) {
		defer func() {
			if r := recover(); r != nil {
				// Silenciosamente ignora erros em eventos
				return
			}
		}()
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

		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}

		event := SimpleEvent{
			Type: "kill",
			Time: timeSeconds,
			Data: map[string]interface{}{
				"killer":   getName(e.Killer),
				"victim":   getName(e.Victim),
				"assister": getName(e.Assister),
				"headshot": e.IsHeadshot,
				"weapon":   weaponStr,
			},
		}
		analysis.Events = append(analysis.Events, event)
	})

	p.RegisterEventHandler(func(e events.PlayerHurt) {
		if e.Attacker != nil && e.Attacker.IsAlive() {
			updatePlayerDamage(e.Attacker, playerStats, e.HealthDamage)
		}
	})

	p.RegisterEventHandler(func(e events.BombPlanted) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()
		if e.Player != nil {
			var timeSeconds float64
			if p != nil {
				timeSeconds = p.CurrentTime().Seconds()
			}
			event := SimpleEvent{
				Type: "bomb_planted",
				Time: timeSeconds,
				Data: map[string]interface{}{
					"player": getName(e.Player),
				},
			}
			analysis.Events = append(analysis.Events, event)
		}
	})

	p.RegisterEventHandler(func(e events.BombDefused) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()
		if e.Player != nil {
			var timeSeconds float64
			if p != nil {
				timeSeconds = p.CurrentTime().Seconds()
			}
			event := SimpleEvent{
				Type: "bomb_defused",
				Time: timeSeconds,
				Data: map[string]interface{}{
					"player": getName(e.Player),
				},
			}
			analysis.Events = append(analysis.Events, event)
		}
	})

	p.RegisterEventHandler(func(e events.BombExplode) {
		defer func() {
			if r := recover(); r != nil {
				return
			}
		}()
		var timeSeconds float64
		if p != nil {
			timeSeconds = p.CurrentTime().Seconds()
		}
		event := SimpleEvent{
			Type: "bomb_exploded",
			Time: timeSeconds,
		}
		analysis.Events = append(analysis.Events, event)
	})

	// Parsear com tratamento de erro e recover para panics
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "Erro fatal ao processar demo: %v\n", r)
			fmt.Fprintf(os.Stderr, "A demo pode estar corrompida, ser de versão antiga ou formato não suportado\n")
			os.Exit(1)
		}
	}()

	// Tentar parsing com timeout implícito
	err = p.ParseToEnd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erro ao processar demo: %v\n", err)
		fmt.Fprintf(os.Stderr, "A demo pode estar corrompida ou ser de uma versão não suportada\n")
		// Não sair, tenta continuar com o que conseguiu processar
	}

	// Agora podemos obter o header após o parse - com verificações de segurança
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "Erro ao acessar dados após parsing: %v\n", r)
			os.Exit(1)
		}
	}()

	// Tentar obter gameState com segurança
	gs := p.GameState()
	if gs == nil {
		fmt.Fprintf(os.Stderr, "Erro: GameState não disponível após parsing\n")
		os.Exit(1)
	}

	// Na v5, obter informações do GameState
	duration := p.CurrentTime()
	// Mapa será obtido dos participantes se disponível, senão "unknown"
	mapName := "unknown"
	// Na v5, o nome do mapa pode estar nos participantes ou precisar ser obtido de outra forma
	// Por enquanto, deixamos como unknown até identificar a forma correta na v5

	// Obter scores com segurança
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

	for _, player := range playerMap {
		analysis.Players = append(analysis.Players, *player)
	}

	// Análise focada no player se Steam ID foi fornecido
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
