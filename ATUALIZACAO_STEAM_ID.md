# Atualização: Steam ID em vez de Player/Team

## ✅ O que foi alterado

### 1. **Processador Go** (`backend/processor/main.go`)
- ✅ Removida validação de "player" ou "team"
- ✅ Agora aceita: `demo-processor.exe <demo_path> [steam_id]`
- ✅ Steam ID é **opcional** - se não fornecido, faz análise geral
- ✅ Se fornecido, gera análise focada no jogador com Steam ID

### 2. **Backend** (`backend/src/server.ts` e `jobManager.ts`)
- ✅ Endpoint `/analysis/start` agora aceita `steamId` em vez de `type`
- ✅ Se `steamId` não for fornecido, faz análise geral
- ✅ Passa Steam ID para o processador Go

## 📝 Mudanças no Frontend

Você precisa atualizar o frontend para pedir Steam ID:

### Antes:
```typescript
// Enviava: { uploadId, type: "player" | "team" }
const response = await fetch(`${API_BASE_URL}/analysis/start`, {
  method: 'POST',
  body: JSON.stringify({ uploadId: uploadedDemo.id, type: 'player' }),
});
```

### Agora:
```typescript
// Envia: { uploadId, steamId?: string }
const steamId = prompt('Digite seu Steam ID64 (opcional):') || undefined;

const response = await fetch(`${API_BASE_URL}/analysis/start`, {
  method: 'POST',
  body: JSON.stringify({ 
    uploadId: uploadedDemo.id, 
    steamId: steamId || undefined 
  }),
});
```

## 🎨 Exemplo de UI no Frontend

Adicione um campo para Steam ID (opcional):

```tsx
const [steamId, setSteamId] = useState<string>('');

// No componente de seleção de análise:
<div>
  <label>Steam ID64 (opcional - para análise focada)</label>
  <input
    type="text"
    value={steamId}
    onChange={(e) => setSteamId(e.target.value)}
    placeholder="76561198012345678"
  />
  <button onClick={() => startAnalysis(steamId || undefined)}>
    Iniciar Análise
  </button>
</div>
```

## 🔍 Como obter o Steam ID64?

1. **Steam Profile URL**: `https://steamcommunity.com/profiles/76561198012345678`
   - Os números no final são o Steam ID64

2. **Steam ID Finder**: Sites como `steamid.io` podem converter Steam ID3/ID64

3. **No jogo**: Alguns comandos de console podem mostrar

## ✅ Teste

1. Compile o Go: `cd backend/processor && go build -o demo-processor.exe main.go`
2. Reinicie o backend
3. Atualize o frontend conforme acima
4. Teste:
   - Sem Steam ID: análise geral
   - Com Steam ID: análise focada no jogador

## 📋 Resumo

- ❌ **Removido**: `type: "player" | "team"`
- ✅ **Adicionado**: `steamId?: string` (opcional)
- ✅ Se Steam ID fornecido: análise focada no jogador
- ✅ Se não fornecido: análise geral da partida

