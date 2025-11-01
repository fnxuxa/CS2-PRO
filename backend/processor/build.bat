@echo off
REM Script para compilar o processador Go no Windows

cd /d "%~dp0"

echo 📦 Baixando dependências Go...
go mod download

echo 🔨 Compilando processador...
go build -o demo-processor.exe main.go

if %ERRORLEVEL% EQU 0 (
    echo ✅ Compilação concluída! Binário: demo-processor.exe
) else (
    echo ❌ Erro na compilação
    exit /b 1
)

