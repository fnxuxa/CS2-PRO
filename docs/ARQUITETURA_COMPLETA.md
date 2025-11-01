# Arquitetura Completa - CS2 Demo Analyzer

## Visão Geral

Sistema SaaS para análise de demos do Counter-Strike 2 com:
- Área de login/pagamento
- Upload e processamento de demos
- Análise completa com IA
- Visualização em tempo real (radar)
- Chatbot RUSH para interação

## Estrutura de Diretórios

```
CS2-PRO/
├── frontend/              # React/Next.js (porta 3000)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── login/     # Login e autenticação
│   │   │   ├── dashboard/ # Dashboard após login
│   │   │   ├── upload/    # Upload de demos
│   │   │   └── analysis/   # Visualização de análise
│   │   └── components/
│   │       ├── ChatRUSH/   # Componente do chatbot
│   │       └── RadarView/  # Visualização do radar
│   └── package.json
│
├── backend/               # Node.js/TypeScript (porta 4000)
│   ├── src/
│   │   ├── server.ts      # API principal
│   │   ├── jobManager.ts  # Gerenciamento de jobs
│   │   ├── rushCoach.ts   # Lógica do chatbot RUSH
│   │   └── auth.ts        # Autenticação/pagamento
│   ├── processor/         # Processador Go (OPÇÃO 1: binário local)
│   │   ├── main.go
│   │   ├── go.mod
│   │   └── demo-processor.exe (ou demo-processor no Linux)
│   └── storage/
│       └── uploads/       # Arquivos .dem salvos
│
└── docs/
    └── ARQUITETURA_COMPLETA.md
```

## Onde Colocar o Código Go?

### **OPÇÃO 1: Binário Local (Recomendado para começar)**
- **Localização:** `backend/processor/demo-processor.exe`
- **Vantagens:**
  - Simples de implementar
  - Fácil de testar localmente
  - Backend Node.js chama diretamente via `execFile`
- **Desvantagens:**
  - Precisa compilar para cada SO (Windows/Linux)
  - Binário incluído no deploy

**Como funciona:**
```typescript
// backend/src/jobManager.ts
const processorPath = path.resolve(process.cwd(), 'processor', 'demo-processor.exe');
const { stdout } = await execFileAsync(processorPath, [demoPath, 'player']);
```

### **OPÇÃO 2: Serviço Go Separado (Recomendado para produção)**
- **Localização:** Servidor separado ou container Docker
- **Vantagens:**
  - Escalável independentemente
  - Pode rodar em múltiplas instâncias
  - Não precisa recompilar backend
- **Desvantagens:**
  - Mais complexo de configurar
  - Requer comunicação via HTTP/gRPC

**Arquitetura:**
```
Frontend (3000) → Backend Node (4000) → API Go Processor (5000)
                                      ↓
                                   Processa .dem
                                      ↓
                                   Retorna JSON
```

### **OPÇÃO 3: Worker Queue (Para alta escala)**
- **Localização:** VM/Container separado consumindo fila
- **Como funciona:**
  1. Frontend faz upload → Backend salva arquivo
  2. Backend cria job e coloca na fila (Redis/RabbitMQ)
  3. Worker Go consome fila, processa demo
  4. Worker salva resultado em banco/cache
  5. Backend busca resultado e retorna

## Fluxo Completo

### 1. Autenticação e Pagamento
```
Usuário → Frontend (/login)
         ↓
      Backend valida credenciais
         ↓
      Verifica pagamento/assinatura
         ↓
      Retorna JWT token
         ↓
      Frontend salva token e redireciona para /dashboard
```

### 2. Upload de Demo
```
Usuário seleciona arquivo .dem → Frontend
                                ↓
      Frontend envia FormData para POST /upload
                                ↓
      Backend salva em storage/uploads/
                                ↓
      Retorna uploadId e informações
```

### 3. Iniciar Análise
```
Usuário clica "Analisar" → Frontend
                          ↓
      POST /analysis/start { uploadId, type: "player" }
                          ↓
      Backend cria job e inicia processamento
                          ↓
      Backend chama: demo-processor.exe <demo_path> <type>
                          ↓
      Processador Go:
        - Lê arquivo .dem
        - Processa todos os eventos
        - Gera JSON completo
        - Retorna stdout (JSON)
                          ↓
      Backend recebe JSON e salva no job
                          ↓
      Job marcado como "completed"
```

### 4. Visualização e Chat
```
Frontend busca resultados via GET /analysis/:jobId/result
                                    ↓
      Backend retorna JSON completo com:
        - Todos os eventos (Kill, RoundStart, etc.)
        - Dados de players completos
        - Heatmap
        - Radar replay (frames)
                                    ↓
      Frontend renderiza:
        - Dashboard com estatísticas
        - Radar em tempo real (playback)
        - Heatmap visual
                                    ↓
      Usuário conversa com RUSH:
        POST /chat/rush { message, uploadId, jobId }
                                    ↓
      Backend usa JSON completo para gerar resposta contextual
```

## Estrutura do JSON Completo

O processador Go retorna um JSON completo com:

```json
{
  "metadata": {
    "map": "de_mirage",
    "duration": "45:30",
    "rounds": 30,
    "scoreT": 16,
    "scoreCT": 14
  },
  "events": [
    {
      "tick": 12345,
      "time": 45.2,
      "type": "kill",
      "kill": {
        "killer": { "steamID": 123, "name": "Player1", "team": "CT", ... },
        "victim": { "steamID": 456, "name": "Player2", "team": "T", ... },
        "isHeadshot": true,
        "weapon": "ak47",
        "killerPos": { "x": 1234.5, "y": 567.8, "z": 72.3 },
        "victimPos": { "x": 1200.0, "y": 580.0, "z": 72.0 }
      }
    },
    // ... mais eventos (round_start, bomb_planted, grenade_thrown, etc.)
  ],
  "players": [
    {
      "steamID": 123,
      "name": "Player1",
      "team": "CT",
      "kills": 28,
      "deaths": 15,
      "assists": 8,
      "adr": 87.3,
      "hsRate": 68.5,
      // ... mais stats
    }
  ],
  "heatmap": {
    "map": "de_mirage",
    "points": [ /* posições com intensidade */ ],
    "hotspots": [ /* áreas de alta atividade */ ]
  },
  "radarReplay": [
    {
      "tick": 10000,
      "time": 10.5,
      "round": 5,
      "players": [ /* estado de cada player neste momento */ ]
    }
  ],
  "summary": {
    "mvp": "Player1",
    "rating": 1.87,
    "keyMoments": [ /* momentos importantes */ ]
  }
}
```

## Integração com IA

### Para Gerar Resumo Automático
1. Backend recebe JSON completo do Go
2. Envia para API de IA (OpenAI/Claude) com prompt:
   ```
   Analise este JSON de partida de CS2 e gere:
   - Resumo geral da partida
   - Pontos fortes e fracos de cada player
   - Recomendações de melhoria
   - Momentos chave da partida
   ```
3. IA retorna análise estruturada
4. Salvo junto com os dados da demo

### Para Chatbot RUSH
1. Usuário faz pergunta: "Como foi minha performance?"
2. Backend busca JSON completo da análise
3. Envia para IA com contexto:
   ```
   Contexto: [JSON completo da partida]
   Pergunta do usuário: "Como foi minha performance?"
   
   Responda como um coach de CS2, sendo específico sobre:
   - Estatísticas do player
   - Momentos importantes
   - Sugestões de melhoria
   ```
4. IA gera resposta contextual
5. Retorna para usuário

## Deploy em VM

### Estrutura Recomendada:

```
/opt/cs2-analyzer/
├── backend/
│   ├── node_modules/
│   ├── dist/
│   ├── processor/
│   │   └── demo-processor (binário compilado)
│   └── storage/
│       └── uploads/
├── frontend/
│   └── build/ (arquivos estáticos)
└── nginx/
    └── nginx.conf (reverse proxy)
```

### Configuração Nginx:
```nginx
# Frontend (porta 80)
server {
    listen 80;
    root /opt/cs2-analyzer/frontend/build;
    location / {
        try_files $uri /index.html;
    }
}

# Backend API (porta 4000)
upstream backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name api.cs2analyzer.com;
    location / {
        proxy_pass http://backend;
    }
}
```

### Processo de Deploy:
1. Compilar binário Go para Linux:
   ```bash
   cd backend/processor
   GOOS=linux GOARCH=amd64 go build -o demo-processor main.go
   ```

2. Transferir para VM:
   ```bash
   scp -r backend/ user@vm:/opt/cs2-analyzer/
   ```

3. Instalar dependências e iniciar:
   ```bash
   cd /opt/cs2-analyzer/backend
   npm install
   npm run build
   pm2 start dist/server.js
   ```

## Próximos Passos

1. ✅ Processador Go capturando todos os eventos
2. ⏳ Integração com IA para resumo automático
3. ⏳ Sistema de autenticação/pagamento
4. ⏳ Visualização de radar em tempo real
5. ⏳ Melhorar heatmap com dados reais do mapa
6. ⏳ Chatbot RUSH com contexto completo

