## Como rodar o projeto localmente

### Pré-requisitos

- Node.js 18 ou superior instalado na máquina (`node -v`).
- NPM 9+ (instalado junto com o Node). Se preferir, pode usar `pnpm` ou `yarn` — nos exemplos abaixo uso NPM.
- Git (opcional, mas recomendado).

### 1. Backend (API + fila simulada)

O backend em Express/TypeScript expõe endpoints para upload, criação de jobs, status de processamento e o chatbot RUSH.

1. Abra um terminal na pasta do projeto e vá para a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor em modo desenvolvimento:
   ```bash
   npm run dev
   ```

O servidor sobe na porta `4000` (`http://localhost:4000`). Endpoints principais:

- `POST /upload` — recebe arquivo `.dem` (campo `demo`).
- `POST /analysis/start` — inicia job (corpo `{ uploadId, type: "player" | "team" }`).
- `GET /analysis/:jobId/status` — progresso do job.
- `GET /analysis/:jobId/result` — resultados finais.
- `POST /chat/rush` — chatbot contextual.

### 2. Front-end

O arquivo `cs2-demo-analyzer.tsx` representa o componente principal. Para rodá-lo você pode:

1. Criar uma app React (Vite ou Next.js). Exemplo com Vite:
   ```bash
   npm create vite@latest cs2-frontend -- --template react-ts
   cd cs2-frontend
   npm install
   ```
2. Substitua o conteúdo de `src/App.tsx` pelo de `cs2-demo-analyzer.tsx` (ajuste os imports se necessário). Garanta que o arquivo está usando Tailwind ou estilização equivalente — o layout assume classes Tailwind.
3. Configure Tailwind (se ainda não estiver) seguindo a doc oficial (`https://tailwindcss.com/docs/guides/vite`).
4. Rode a aplicação:
   ```bash
   npm run dev
   ```
5. Abra `http://localhost:5173` (ou a porta exibida) e use a interface:
   - Faça upload da demo (`Upload`).
   - Escolha análise player/team.
   - Acompanhe o progresso na tela `Processing`.
   - Veja os resultados no dashboard.
   - Converse com o RUSH (requisições caem no backend).

### 3. Variáveis de ambiente

Por padrão o front aponta para `http://localhost:4000`. Se for hospedar o backend em outro domínio, troque a constante `API_BASE_URL` em `cs2-demo-analyzer.tsx` ou exponha uma env (`VITE_API_BASE_URL`).

### 4. Testando o fluxo

1. Start backend (`npm run dev`) e deixe rodando.
2. Start front.
3. Envie um arquivo `.dem` real (ou qualquer arquivo para testar fluxo). O backend salva em `storage/uploads/` e cria um job simulado.
4. Acompanhe o progresso; ao finalizar você verá o relatório mockado.
5. Pergunte ao RUSH por “status”, “heatmap”, “economia” etc. Ele usa o backend para responder.

### 5. Deploy / Hospedagem

#### Backend

- **Railway/Render/Fly.io**: suba o backend facilmente com Dockerfile (pode gerar depois) ou script `npm start`. Crie volume para `storage/` se quiser persistir uploads.
- **VPS (DigitalOcean / Hetzner)**: instale Node, configure PM2 ou systemd para rodar `npm start`. Use Nginx como reverse proxy + HTTPS (Certbot).
- **Containers**: crie `Dockerfile` simples (copie `package.json`, `npm install`, `npm run build`, `npm start`). Orquestre com Docker Compose se quiser adicionar Redis/Postgres futuramente.

#### Front-end

- Hospede facilmente no **Vercel** (recomendado se migrar para Next.js) ou **Netlify** (Vite/React). Configure variável `VITE_API_BASE_URL` apontando pro backend público.
- Em VPS, sirva build estática (`npm run build && npm run preview` ou deploy via Nginx).

### 6. Próximos passos / Melhorias

- Substituir mock por pipeline real em Go usando `demoinfocs-golang` (worker lê arquivo de `storage/uploads`, processa e grava estatísticas no banco).
- Conectar RUSH a um LLM real (OpenAI, Claude, Gemini) usando vector store (Pinecone/Qdrant/Postgres pgvector) com embeddings dos insights.
- Implementar autenticação (Clerk/Auth0/NextAuth) e billing (Stripe) para operar como SaaS.
- Automatizar com filas reais (BullMQ + Redis, RabbitMQ, SQS) e mover jobs para workers separados.
- Para automações low-code (n8n): é possível orquestrar ingestão chamando o backend via HTTP nodes; ainda assim recomendo manter processamento pesado em workers Go/Python conforme arquitetura.

### 7. Troubleshooting rápido

- **Erro CORS**: confirme que o backend está rodando em `localhost:4000` e que `cors()` está habilitado (já está no código).
- **Upload falha**: verifique tamanho (limitado a 1GB) e se o campo utilizado é `demo`.
- **Backend porta ocupada**: altere `PORT` via `export PORT=5000` antes de `npm run dev` e ajuste `API_BASE_URL` no front.
- **Tailwind não aplicado**: confirme que importou `index.css` com diretivas `@tailwind` e que `content` no `tailwind.config` aponta para `src/**/*.{ts,tsx}`.
