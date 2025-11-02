# ⚡ Início Rápido - Rodar Tudo

## 🎯 Passo a Passo Simples

### 1️⃣ Rodar o Backend

Abra um terminal e execute:

```powershell
cd backend
npm run dev
```

✅ Deve aparecer: `⚡ CS2 analyzer backend rodando em http://localhost:4000`

**DEIXE ESTE TERMINAL RODANDO!**

---

### 2️⃣ Criar o Frontend (só na primeira vez)

Abra um **NOVO TERMINAL** e execute:

**Opção A - Automático (mais fácil):**
```powershell
# Na raiz do projeto
.\setup-frontend.ps1
```

**Opção B - Manual:**
```powershell
# Na raiz do projeto
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Depois configure Tailwind (veja COMO_RODAR_TUDO.md para detalhes) e copie:
```powershell
Copy-Item ..\cs2-demo-analyzer.tsx src\App.tsx
```

---

### 3️⃣ Rodar o Frontend

**No mesmo terminal do passo 2:**
```powershell
cd frontend
npm run dev
```

✅ Deve aparecer algo como: `Local: http://localhost:5173`

---

### 4️⃣ Abrir no Navegador

Abra: **http://localhost:5173**

Você deve ver a interface do CS2 Analyzer!

---

### 5️⃣ Testar Upload

1. Clique no botão **"UPLOAD"**
2. Selecione um arquivo `.dem`
3. Aguarde o upload
4. Digite **"player"** ou **"team"** no chat ou clique nos botões
5. Aguarde a análise (mesmo sem Go compilado, vai usar mock)
6. Veja os resultados!

---

## 🔧 Se der Problema

### Backend não conecta:
- Verifique se está rodando em `http://localhost:4000`
- Teste: http://localhost:4000/health

### Frontend não conecta ao backend:
- Verifique se `API_BASE_URL` em `App.tsx` está como `http://localhost:4000`

### Erro ao criar frontend:
- Execute manualmente os comandos do passo 2B

---

## 📝 Resumo Ultra-Rápido

**Terminal 1:**
```powershell
cd backend
npm run dev
```

**Terminal 2:**
```powershell
cd frontend
npm run dev
```

**Acesse:** http://localhost:5173

**Pronto!** 🎉


