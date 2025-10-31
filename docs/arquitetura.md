## Visão Geral

Este documento resume uma proposta de arquitetura para o SaaS de análise de demos de Counter-Strike 2 (CS2), cobrindo ingestão de arquivos `.dem`, geração de estatísticas avançadas, visualizações (heatmaps, radar 2D) e o chatbot **RUSH** alimentado pelos dados extraídos.

## Objetivos do Produto

- Ingestão confiável de demos (.dem) com suporte a uploads grandes.
- Processamento automatizado para extrair estatísticas individuais e de time, eventos (kills, granadas, rotações etc.) e metadados de rounds.
- Visualizações ricas: heatmaps, linha do tempo de rounds, reprodução em radar 2D.
- Chatbot RUSH atuando como coach virtual treinado nos dados da partida.
- Plataforma multi-tenant (SaaS) com planos/limites, auditoria e billing.

## Macro Arquitetura

- **Front-end Web** (Next.js + React + Tailwind + Zustand/React Query): upload, dashboards, playback, chat RUSH.
- **API Gateway/BFF** (TypeScript/Node ou Go): autenticação, orquestração de chamadas aos microserviços, WebSockets/SSE para progresso.
- **Serviço de Ingestão** (Go): validação inicial, armazenamento bruto em objeto (S3/GCS), geração de job no *Message Broker*.
- **Pipeline de Processamento**:
  - Workers em Go usando [`demoinfocs-golang`](https://github.com/markus-wa/demoinfocs-golang) para parsing frame-a-frame.
  - Enriquecimento em etapas (stat collector, events timeline, heatmap builder, tactical map).
  - Orquestração via fila (Kafka/NATS/SQS) + status persistido.
- **Serviço de Estatísticas & Insights** (Go/Python): consolida métricas (HS%, ADR, clutch %, economia etc.) e gera insights em linguagem natural.
- **Serviço de Visualização** (Python + OpenCV/Matplotlib): cria assets (heatmaps como imagens e dados brutos) e dados de radar 2D (JSON com frames).
- **Camada IA / RUSH Coach**:
  - Indexação das estatísticas e insights em *Vector Store* (Pinecone, Qdrant, pgvector).
  - Prompt Orchestrator (LangChain, LlamaIndex ou Go middleware) conectando-se ao LLM (OpenAI, Claude, Gemini).
- **Armazenamentos**:
  - Object Storage (S3/GCS/MinIO) para demos originais, assets gerados e relatórios.
  - Postgres para metadados (usuários, partidas, jobs, billing).
  - Redis para cache/status em tempo real.
  - Timeseries (ClickHouse/Timescale) para eventos de rounds e consultas analíticas rápidas.
  - Vector DB para IA do RUSH.
- **Infraestrutura**: Docker + Kubernetes (ou ECS) com CI/CD (GitHub Actions), observability (Prometheus, Grafana, OpenTelemetry), feature flags (Unleash), secrets (Vault).

## Fluxo de Dados

1. **Upload** (`POST /demos`): arquivo enviado para API, que gera URL pré-assinada S3, registra job e retorna `job_id`.
2. **Ingestão**: serviço `ingest-worker` baixa demo, valida e envia mensagem `demo.ready`.
3. **Parsing**: `analysis-worker` usa `demoinfocs`:
   - Extrai ticks, eventos (kills, bomb plant, grenades, flash duration etc.).
   - Normaliza posições para coordenadas globais do mapa.
4. **Aggregation**: estatísticas calculadas e salvas.
5. **Heatmap Builder**: gera matriz de densidade e transforma em PNG (color map) e JSON para canvas.
6. **Radar Replay**: exporta frames com posições dos jogadores/objetos por tick para playback.
7. **Inference Prep**: gera resumo textual, dicas personalizadas e insere tudo no Vector Store.
8. **Notificação**: API gateway informa cliente via WebSocket/SSE `job.status`.
9. **Front-end** consome `GET /analysis/:id` para renderizar painéis, heatmap e inicia sessão com RUSH (`POST /chat/rush`).

## Design dos Serviços

### API Gateway / BFF

- Next.js API routes ou NestJS/Fastify como BFF.
- Responsável por autenticação (JWT), controle de planos, rate limiting (Redis + `*rl`).
- Proxy para serviços internos (gRPC/REST) + WebSocket/SSE para progresso.
- Exporta endpoints:
  - `POST /demos`, `GET /jobs/:id/status`;
  - `GET /analysis/:id`, `GET /analysis/:id/heatmap`, `GET /analysis/:id/radar`;
  - `POST /chat/rush`, `POST /feedback`;
  - `GET /players/:id/history`, dashboards, billing.

### Worker de Parsing (Go)

- Conectado à fila `demo.ready` -> `demo.parsed`.
- Usa `demoinfocs` para stream de eventos:
  - Hooks para `OnGameEvents`, `OnKill`, `OnBombPlanted`, `OnGrenade`.
  - Converte coordenadas para layout oficial de mapas (usar dataset Valve maps).
  - Persiste JSON bruto em ClickHouse/Postgres.

### Enriquecimento / Insights

- Microserviço (Go ou Python) consumindo `demo.parsed` para gerar estatísticas agregadas.
- Implementa pipelines configuráveis por persona (player, team, coach).
- Aplica regras (e.g. detectar padrões de erros, “morreu 5x em A Main CT”).
- Gera output JSON estruturado:
  ```json
  {
    "overview": {"score": "16-12", "duration": 2850, ...},
    "player_stats": [...],
    "rounds": [{"round": 12, "event": "Clutch 1v3", ...}],
    "recommendations": ["Trabalhar controle de recoil em AK"],
    "heatmap": {"url": "s3://.../heatmap.png", "matrix": [[...]]}
  }
  ```

### RUSH Coach

- Serviço Node/TypeScript (LangChain) ou Python (LlamaIndex).
- Tarefas:
  - Converter insights em chunks (embeddings) e subir no Vector Store.
  - Manter contexto de conversa por usuário/partida.
  - Prompt template com persona (“Coach agressivo, mas construtivo”).
  - Integração com LLM (OpenAI GPT-4.1, Claude, Gemini, Groq LLaMA).
- Endpoint `POST /chat/rush` mantendo `conversation_id`.

### Gerador de Visualização

- Serviço Python com tasks Celery/Argo Workflows.
- Gera assets:
  - **Heatmap**: Matplotlib/Seaborn ou `datashader` -> PNG + JSON.
  - **Radar Replay**: gera sprites (SVG/JSON) e timeline (array de ticks) para front.
- Pub `demo.visuals.ready` -> triggers notificação.

## Front-end

- Next.js 14 (App Router) + React Server Components.
- UI kit Tailwind + Radix + Framer Motion.
- Páginas-chave:
  - Landing marketing (já existente, otimizar copy/perf).
  - Dashboard com lista de demos, status dos jobs (React Query).
  - Página de análise com abas: Overview, Heatmap, Radar Replay, Recomendações.
  - Chat RUSH com contexto (mensagens render + streaming).
- Integração com APIs através de hooks (`useDemoUpload`, `useAnalysis`, `useRushChat`).
- Uso de Canvas/WebGL (Three.js/React Three Fiber) para radar 2D.

## Segurança & Compliance

- Multi-tenant: usar `organization_id` em todas as entidades.
- Upload assinado + verificação de tipo/virus scan (ClamAV/Lambda).
- RBAC (owner, coach, player).
- Auditoria de acesso, logs estruturados.
- Consentimento GDPR/LGPD, retention policy, opção de exclusão.

## Roadmap de Implementação

1. **MVP (4-6 semanas)**
   - Upload + ingestão + parsing básico (kills, rounds, scoreboard).
   - Estatísticas essenciais (ADR, K/D, utilidade de granada).
   - Heatmap simples + dashboard overview.
   - RUSH com prompt fixo (sem embeddings, apenas resumo).

2. **Versão Beta (6-10 semanas)**
   - Radar 2D com playback.
   - Recomendações automáticas por persona.
   - Integração com Vector Store, chat contextual.
   - Suporte multi-mapa, multi-demo.

3. **GA (12+ semanas)**
   - Billing (Stripe), planos e quotas.
   - Gamificação (achievements, comparativos com pros).
   - API pública, integrações com times/torneios.
   - Monitoramento full observability + SLOs.

## KPIs Técnicos

- Tempo médio de processamento < 3 minutos/demos 40min.
- Precisão das coordenadas (erro < 1%) e sincronização radar < 50 ms.
- Disponibilidade 99.5% / RPO < 15 min.
- Score de satisfação RUSH (>80% respostas úteis via feedback).

## Próximos Passos

- Validar requisitos de produto com stakeholders (personas: player individual, coach de time, organização).
- Definir budget de infraestrutura e escolha de LLM (custo vs qualidade).
- Construir POC do parser (Go) + pipeline e conectar com front para upload/progresso.
- Medir performance das demos maiores (>200MB) e otimizar (streaming/parsing incremental).
