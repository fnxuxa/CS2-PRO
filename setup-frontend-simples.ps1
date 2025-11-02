# Script SIMPLES para criar frontend usando o cs2-demo-analyzer.tsx

Write-Host "🚀 Criando projeto frontend..." -ForegroundColor Cyan

# Verificar se já existe
if (Test-Path "frontend") {
    Write-Host "⚠️  Pasta frontend já existe!" -ForegroundColor Yellow
    Write-Host "❓ Deseja continuar mesmo assim? Isso pode sobrescrever arquivos. (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "❌ Cancelado." -ForegroundColor Red
        exit
    }
    Remove-Item -Recurse -Force frontend -ErrorAction SilentlyContinue
}

Write-Host "📦 Criando projeto React com Vite..." -ForegroundColor Cyan
npm create vite@latest frontend -- --template react-ts --yes

Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
Set-Location frontend
npm install

Write-Host "📦 Instalando Tailwind e ícones..." -ForegroundColor Cyan
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer

Write-Host "🎨 Configurando Tailwind..." -ForegroundColor Cyan
npx tailwindcss init -p --yes

# Configurar tailwind.config.js
$tailwindConfig = @"
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
"@
Set-Content -Path "tailwind.config.js" -Value $tailwindConfig

# Configurar src/index.css
$indexCss = @"
@tailwind base;
@tailwind components;
@tailwind utilities;
"@
Set-Content -Path "src/index.css" -Value $indexCss

# Copiar cs2-demo-analyzer.tsx para App.tsx
Write-Host "📋 Copiando cs2-demo-analyzer.tsx para App.tsx..." -ForegroundColor Cyan
if (Test-Path "..\cs2-demo-analyzer.tsx") {
    Copy-Item "..\cs2-demo-analyzer.tsx" -Destination "src\App.tsx" -Force
    Write-Host "✅ App.tsx criado a partir de cs2-demo-analyzer.tsx!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Arquivo cs2-demo-analyzer.tsx não encontrado!" -ForegroundColor Yellow
}

Write-Host "`n✅ Frontend criado com sucesso!" -ForegroundColor Green
Write-Host "`nPara rodar:" -ForegroundColor Cyan
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White

Set-Location ..


