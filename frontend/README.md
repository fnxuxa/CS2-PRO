# 🚀 CS2 PRO Frontend - Como Rodar

## Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn instalado

## Passo a Passo

### 1. Instalar dependências (primeira vez)

```powershell
cd frontend
npm install
```

### 2. Rodar o servidor de desenvolvimento

```powershell
npm run dev
```

O frontend estará disponível em: **http://localhost:3000**

## Comandos Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento (hot reload)
- `npm run build` - Compila o projeto para produção
- `npm run start` - Inicia o servidor de produção (após build)
- `npm run lint` - Executa o linter

## ⚠️ Importante

Certifique-se de que o **backend está rodando** em `http://localhost:4000` antes de usar o frontend.

Para rodar o backend:
```powershell
cd backend
npm run dev
```

## Estrutura do Projeto

```
frontend/
├── app/
│   ├── layout.tsx      # Layout raiz do Next.js
│   ├── page.tsx        # Página principal (componente principal)
│   └── globals.css     # Estilos globais com Tailwind
├── package.json        # Dependências do projeto
├── next.config.js      # Configuração do Next.js
├── tailwind.config.js  # Configuração do Tailwind CSS
└── tsconfig.json       # Configuração do TypeScript
```

