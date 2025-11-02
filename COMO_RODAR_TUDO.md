# 🚀 Como Rodar Tudo - Frontend + Backend

## Passo 1: Configurar e Rodar o Backend

### 1.1 - Instalar dependências (se ainda não fez):
```powershell
cd backend
npm install
```

### 1.2 - Compilar TypeScript:
```powershell
npm run build
```

### 1.3 - Rodar o backend:
```powershell
npm run dev
```

✅ O backend deve estar rodando em `http://localhost:4000`

---

## Passo 2: Criar o Frontend (Primeira vez)

### 2.1 - Criar projeto React com Vite:
```powershell
cd ..  # Volta para a raiz do projeto
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### 2.2 - Instalar dependências extras:
```powershell
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2.3 - Configurar Tailwind CSS:

Edite `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edite `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 2.4 - Copiar o componente principal:

Substitua o conteúdo de `frontend/src/App.tsx` pelo conteúdo de `cs2-demo-analyzer.tsx`:
```powershell
# Na raiz do projeto
Copy-Item cs2-demo-analyzer.tsx frontend/src/App.tsx
```

### 2.5 - Rodar o frontend:
```powershell
cd frontend
npm run dev
```

✅ O frontend deve estar rodando em `http://localhost:5173` (ou outra porta)

---

## Passo 3: Compilar o Processador Go (Opcional - tem fallback para mock)

Se você tiver Go instalado, pode compilar o processador:

```powershell
cd backend\processor
go mod download
go build -o demo-processor.exe main.go
```

⚠️ **Nota**: Se não compilar o Go, o sistema vai usar dados mock automaticamente.

---

## Passo 4: Testar Tudo

### 4.1 - Verificar se backend está rodando:
Acesse: http://localhost:4000/health
Deve retornar: `{"status":"ok",...}`

### 4.2 - Verificar se frontend está rodando:
Acesse: http://localhost:5173
Deve abrir a interface do CS2 Analyzer

### 4.3 - Testar upload:
1. Na interface, clique em "UPLOAD"
2. Selecione um arquivo `.dem`
3. Aguarde upload
4. Escolha "Análise Individual" ou "Análise de Time"
5. Aguarde processamento
6. Veja os resultados!

---

## ⚠️ Problemas Comuns

### Backend não inicia:
- Verifique se a porta 4000 está livre: `netstat -ano | findstr :4000`
- Se estiver em uso, encerre o processo ou mude a porta no `server.ts`

### Frontend não conecta ao backend:
- Verifique se `API_BASE_URL` em `App.tsx` está como `http://localhost:4000`
- Verifique se o backend está rodando

### Erro ao processar demo:
- Se o Go não estiver compilado, vai usar mock (ok para testar)
- Para usar Go real, compile primeiro: `go build -o demo-processor.exe main.go`

---

## 📝 Resumo Rápido

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Terminal 3 - Compilar Go (opcional):**
```powershell
cd backend\processor
go build -o demo-processor.exe main.go
```

Acesse: http://localhost:5173


