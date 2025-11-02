# Script para criar e configurar o frontend

Write-Host "🚀 Configurando Frontend..." -ForegroundColor Cyan

# Verificar se já existe frontend
if (Test-Path "frontend") {
    Write-Host "⚠️  Pasta frontend já existe. Deseja continuar mesmo assim? (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "❌ Cancelado." -ForegroundColor Red
        exit
    }
}

# Criar projeto Vite
Write-Host "📦 Criando projeto React com Vite..." -ForegroundColor Cyan
npm create vite@latest frontend -- --template react-ts --yes

# Entrar na pasta frontend
Set-Location frontend

# Instalar dependências base
Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
npm install

# Instalar dependências extras
Write-Host "📦 Instalando dependências extras (lucide-react, tailwindcss)..." -ForegroundColor Cyan
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer

# Inicializar Tailwind
Write-Host "🎨 Configurando Tailwind CSS..." -ForegroundColor Cyan
npx tailwindcss init -p --yes

# Configurar tailwind.config.js
Write-Host "📝 Configurando tailwind.config.js..." -ForegroundColor Cyan
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

# Configurar index.css
Write-Host "📝 Configurando index.css..." -ForegroundColor Cyan
$indexCss = @"
@tailwind base;
@tailwind components;
@tailwind utilities;
"@
Set-Content -Path "src/index.css" -Value $indexCss

# Copiar App.tsx
Write-Host "📋 Copiando componente principal..." -ForegroundColor Cyan
if (Test-Path "..\cs2-demo-analyzer.tsx") {
    Copy-Item "..\cs2-demo-analyzer.tsx" -Destination "src\App.tsx" -Force
    Write-Host "✅ App.tsx copiado!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Arquivo cs2-demo-analyzer.tsx não encontrado na raiz!" -ForegroundColor Yellow
}

Write-Host "`n✅ Frontend configurado com sucesso!" -ForegroundColor Green
Write-Host "`nPara rodar o frontend, execute:" -ForegroundColor Cyan
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "`nPara rodar o backend, execute:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White

Set-Location ..


