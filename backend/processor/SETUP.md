# Setup do Processador Go

## Onde o Código Go Deve Estar?

### **Resposta: SIM, pode estar na pasta do backend!**

### **OPÇÃO 1: Binário Local (Recomendado para começar)**
```
backend/
├── processor/
│   ├── main.go          # Código Go
│   ├── go.mod           # Dependências
│   ├── demo-processor.exe  # Binário compilado (Windows)
│   └── demo-processor       # Binário compilado (Linux)
├── src/
│   └── jobManager.ts   # Chama demo-processor.exe
```

**Vantagens:**
- ✅ Simples: tudo junto
- ✅ Fácil de testar
- ✅ Backend chama diretamente: `./processor/demo-processor.exe`

### **OPÇÃO 2: Serviço Separado (Produção)**
```
VM/Container 1: Backend Node.js
VM/Container 2: Processador Go (API HTTP/gRPC)
```

## Como Compilar

### Windows:
```powershell
cd backend\processor
go mod download
go build -o demo-processor.exe main.go
```

### Linux (na VM):
```bash
cd backend/processor
go mod download
GOOS=linux GOARCH=amd64 go build -o demo-processor main.go
```

## Como o Backend Chama

O `jobManager.ts` já está configurado para chamar:

```typescript
const processorName = process.platform === 'win32' ? 'demo-processor.exe' : 'demo-processor';
const processorPath = path.resolve(process.cwd(), 'processor', processorName);

const { stdout } = await execFileAsync(processorPath, [upload.path, job.type]);
const analysisData = JSON.parse(stdout);
```

## Fluxo Completo

1. **Frontend** → Upload demo → **Backend** (salva em `storage/uploads/`)
2. **Frontend** → Inicia análise → **Backend** (cria job)
3. **Backend** → Chama `demo-processor.exe demo.dem player`
4. **Processador Go** → Lê .dem, processa, retorna JSON no stdout
5. **Backend** → Recebe JSON, salva no job
6. **Frontend** → Busca resultado → Mostra análise completa

## Deploy na VM

1. Compilar Go na VM ou transferir binário:
   ```bash
   # Na sua máquina (com Go instalado)
   cd backend/processor
   GOOS=linux GOARCH=amd64 go build -o demo-processor main.go
   
   # Transferir para VM
   scp demo-processor user@vm:/opt/cs2-analyzer/backend/processor/
   ```

2. No backend Node.js:
   ```bash
   cd /opt/cs2-analyzer/backend
   npm install
   npm run build
   pm2 start dist/server.js
   ```

3. O backend automaticamente encontrará o binário em `processor/demo-processor`

## Próximos Passos

1. ✅ Compilar o Go: `go build -o demo-processor.exe main.go`
2. ✅ Testar: `./demo-processor.exe storage/uploads/demo.dem player`
3. ✅ Backend já está configurado para chamar automaticamente!

