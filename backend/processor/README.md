# Processador de Demos CS2

Este módulo Go processa arquivos `.dem` do Counter-Strike 2 e gera análises estruturadas.

## Pré-requisitos

- Go 1.21 ou superior instalado
- Acesso à internet (para baixar dependências)

## Como compilar

### Windows
```bash
cd backend/processor
build.bat
```

### Linux/Mac
```bash
cd backend/processor
chmod +x build.sh
./build.sh
```

Ou manualmente:
```bash
cd backend/processor
go mod download
go build -o demo-processor.exe main.go  # Windows
go build -o demo-processor main.go      # Linux/Mac
```

## Como usar

O processador é executado automaticamente pelo backend Node.js quando uma análise é iniciada.

Para testar manualmente:
```bash
./demo-processor.exe <caminho_para_demo.dem> <player|team>
```

O output será um JSON com a análise completa, compatível com o formato `AnalysisData` do TypeScript.

## Estrutura

- `main.go` - Código principal do processador
- `go.mod` - Dependências do projeto
- `build.bat` / `build.sh` - Scripts de compilação

## Dependências

- `github.com/markus-wa/demoinfocs-golang/v4` - Biblioteca para parsing de arquivos .dem

