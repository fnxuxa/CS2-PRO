# 🎯 CS2 PRO Analyzer

Sistema profissional de análise de demos CS2 com IA integrada.

## 🚀 Início Rápido

### Backend

```powershell
cd backend
npm install
npm run dev
```

Backend rodando em: `http://localhost:4000`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend rodando em: `http://localhost:3000`

### Processador Go (Opcional)

```powershell
cd backend/processor
go build -o demo-processor.exe main-simple.go
```

## 📁 Estrutura

```
CS2-PRO/
├── backend/          # Backend Node.js + TypeScript
│   ├── src/         # Código fonte
│   ├── processor/   # Processador Go para demos
│   └── storage/     # Uploads e temporários
├── frontend/         # Frontend Next.js
│   └── app/         # Páginas e componentes
└── docs/            # Documentação técnica
```

## 📝 Funcionalidades

- ✅ Upload e análise de demos CS2
- ✅ Análise de performance individual e por time
- ✅ Heatmap de kills e deaths
- ✅ Chat com IA (RUSH Coach)
- ✅ Estatísticas avançadas (trades, clutches, entry frags)
- ✅ Suporte para GC e Valve Matchmaking

## 🔧 Tecnologias

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: Next.js 16, React, Tailwind CSS
- **Processador**: Go (demoinfocs-golang)
- **IA**: Google Gemini Pro

