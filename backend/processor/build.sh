#!/bin/bash
# Script para compilar o processador Go

cd "$(dirname "$0")"

echo "📦 Baixando dependências Go..."
go mod download

echo "🔨 Compilando processador..."
go build -o demo-processor main.go

if [ $? -eq 0 ]; then
    echo "✅ Compilação concluída! Binário: demo-processor"
else
    echo "❌ Erro na compilação"
    exit 1
fi



