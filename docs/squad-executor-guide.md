# SquadExecutor — Guia Completo

> A camada que **orquestra e executa** as Squads em tempo real.

## 📍 Contexto

O projeto tinha:
- ✅ **Factory** — criar agentes
- ✅ **Marketplace** — clonar templates
- ✅ **Organograma** — desenhar squads
- ✅ **Simulador** — testar (mock)
- ❌ **[FALTA] Executor** — rodar de verdade

O `SquadExecutor` é a peça que faltava.

> **Onde ele mora na UI:** não é uma página separada. Ele fica **embutido no próprio
> Organograma** — mesmo canvas onde você desenha a squad, no estilo n8n/Relevance: um botão
> "Testar Squad (Executar)" no painel de detalhe abre um drawer de chat sobre o canvas, e os
> nós do fluxograma acendem (glow ciano pulsante) conforme a execução passa por cada agente.
> Isso substitui a ideia inicial de uma página `SquadLive` isolada — ficar preso a
> "desenhar aqui, rodar noutro lugar" quebra a analogia com ferramentas reais de workflow.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────┐
│   USER MESSAGE              │
└──────────────┬──────────────┘
               ↓
    ┌──────────────────────┐
    │ SquadExecutor.execute│
    └──────────┬───────────┘
               ↓
    ┌──────────────────────────────────┐
    │ 1. RuleEngine                    │
    │    Avalia conditions             │
    │    Decide: Orq? Delegado? Fim?   │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ 2. StateManager                  │
    │    Gerencia memory compartilhada │
    │    Histórico de msgs             │
    │    Log de execução               │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ 3. AgentCaller                   │
    │    Chama Orq + Agentes           │
    │    Injeta context                │
    │    Coleta respostas              │
    └──────────┬───────────────────────┘
               ↓
    ┌──────────────────────────────────┐
    │ ExecutionResult                  │
    │ • publicResponse                 │
    │ • internalDelegations            │
    │ • updatedState                   │
    │ • executionTime                  │
    └─────────────────────────────────┘
```

---

## 🔧 Componentes

### 1. RuleEngine

**Responsabilidade:** Avaliar as regras de atribuição e decidir pra onde delegar.

```typescript
const ruleEngine = new RuleEngine();
const result = ruleEngine.evaluate(
  squad.assignmentRules,  // [{ condition, action }, ...]
  state,                   // { memory, messages, ... }
  squad
);

// result = {
//   matched: true,
//   targetRole: 'especialista',
//   reason: 'Condição "memory.priority == P1" atendida'
// }
```

**Sintaxe de condições:**
```
memory.priority == 'P1'
memory.issue_type == 'billing'
memory.urgency > 5
```

**Sintaxe de ações:**
```
atribuir_para(triagem)
atribuir_para(especialista)
atribuir_para(executor)
```

---

### 2. StateManager

**Responsabilidade:** Manter o estado compartilhado (memory) que flui entre agentes.

```typescript
const stateManager = new StateManager();

// Criar novo estado
const state = stateManager.createState(
  squadId,
  userId,
  userMessage
);

// Atualizar memory (o que passa entre agentes)
const updatedState = stateManager.updateMemory(state, {
  destination: 'Paris',
  budget: 20000,
  priority: 'P1'
});

// Adicionar mensagens ao histórico
const msgState = stateManager.addMessage(state, 'agent', 'Resposta...', 'Orquestrador');

// Registrar no log de execução
const logState = stateManager.addLogEntry(state, {
  step: 2,
  agentName: 'Orquestrador',
  agentRole: 'orchestrator',
  action: 'responded',
  output: 'Recebi sua solicitação...'
});
```

---

### 3. AgentCaller

**Responsabilidade:** Chamar os agentes reais (ou simulados) com o contexto correto.

```typescript
const agentCaller = new AgentCaller();

const result = await agentCaller.callAgent(
  agent,              // Agent object
  message,            // Mensagem pra passar
  state,              // ConversationState (com memory)
  internalOnly        // true = delegação interna
);

// result = {
//   response: "Roteiro montado: ...",
//   updatedMemory: { roteiro_gerado: true, days: 5 }
// }
```

**Fluxo:**
1. Injeta a memory atual na chamada do agente
2. LLM processa com contexto completo
3. Retorna resposta + possíveis atualizações de memory

---

### 4. SquadExecutor (Main)

**Responsabilidade:** Orquestrar todo o fluxo.

```typescript
const executor = new SquadExecutor();

const result = await executor.execute(
  squad,           // Squad object
  agents,          // Array de agentes disponíveis
  userMessage,     // Mensagem do cliente
  userId,          // ID do usuário
  existingState?   // Estado anterior (para multi-turn)
);

// result = ExecutionResult {
//   success: true,
//   publicResponse: "Tudo pronto! Seu pacote custa R$21.500...",
//   internalDelegations: [
//     { from: 'Orq', to: 'Roteirista', message: '...', response: '...' },
//     { from: 'Orq', to: 'Emissor', message: '...', response: '...' }
//   ],
//   updatedState: {...},
//   executionTime: 4200 // ms
// }
```

---

## 🎯 Fluxo de Execução Passo-a-Passo

### Exemplo: Cliente pergunta "Quero viajar pra Paris"

```
┌─────────────────────────────────────────────────────────────┐
│ SQUAD DE VIAGENS                                            │
│ • Orquestrador (Concierge)                                  │
│ • Roteirista (Especialista)                                 │
│ • Emissor (Executor)                                        │
│                                                             │
│ RULES:                                                      │
│ • SE budget < 25k → delegar para Roteirista                │
│ • ENTÃO → Emissor                                           │
└─────────────────────────────────────────────────────────────┘

PASSO 1: Sistema recebe mensagem
  message = "Quero viajar pra Paris em Agosto, casal, R$20k"
  
PASSO 2: Criar estado
  state = {
    conversationId: 'conv-xxx',
    memory: {},
    messages: [{ user, "Quero viajar..." }],
    executionLog: []
  }

PASSO 3: Chamar Orquestrador (SEMPRE primeiro)
  ├─ Injeta message + memory vazio
  ├─ Orquestrador: "Recebi! Vou montar tudo."
  └─ Atualizar state:
     • memory = {}
     • messages += [{ agent, "Recebi!..." }]
     • executionLog += [Orq respondeu]

PASSO 4: Avaliar Regras
  ├─ budget < 25k? 
  ├─ memory.budget = "20k" → SIM!
  └─ targetRole = "especialista" (Roteirista)

PASSO 5: Delegação Interna 1
  ├─ Orquestrador → Roteirista
  ├─ Delegação: "Favor montar roteiro..."
  ├─ Injeta memory atual (ainda vazio, mas tem contexto)
  ├─ Roteirista: "Dia 1 Torre Eiffel, Dia 2 Louvre..."
  └─ Atualizar state:
     • memory += { roteiro: [...], days: 5 }
     • messages += [{ agent, "Dia 1..." }]
     • executionLog += [Roteirista respondeu - INTERNO]

PASSO 6: Delegação Interna 2
  ├─ Orquestrador → Emissor
  ├─ Delegação: "Gere orçamento com roteiro acima..."
  ├─ Injeta memory (agora com roteiro)
  ├─ Emissor: "Orçamento: Voos R$12k, Hotel R$7k, Tours R$2.5k"
  └─ Atualizar state:
     • memory += { budget_estimate: 21500 }
     • executionLog += [Emissor respondeu - INTERNO]

PASSO 7: Agregação
  ├─ Orquestrador compila tudo
  ├─ "Tudo pronto! Roteiro + Orçamento..."
  └─ Atualizar state:
     • messages += [{ agent, "Tudo pronto!..." }]
     • currentStep = 'complete'

RETORNO:
  {
    success: true,
    publicResponse: "Tudo pronto! Roteiro + Orçamento...",
    internalDelegations: [
      { from: 'Orq', to: 'Roteirista', ... },
      { from: 'Orq', to: 'Emissor', ... }
    ],
    updatedState: {
      memory: {
        roteiro: [...],
        days: 5,
        budget_estimate: 21500
      },
      messages: [...],
      executionLog: [...]
    },
    executionTime: 3500
  }
```

---

## 🎮 Como Usar na Prática

### No Organograma (`src/pages/Organograma.tsx`)

O botão **"Testar Squad (Executar)"** no painel de detalhe (aside, ao lado do canvas) abre um
drawer de chat. Ao enviar uma mensagem, o `onStep` do executor é usado para acender o nó
correspondente no ReactFlow em tempo real — é o que dá a sensação de "rodar o fluxo desenhado",
como no n8n:

```tsx
import { SquadExecutor, type ConversationState } from '../services/SquadExecutor';

const executorRef = useRef(new SquadExecutor());
const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
const [conversationState, setConversationState] = useState<ConversationState>();

const handleTestSend = async () => {
  const result = await executorRef.current.execute(
    selectedSquad,
    agents,
    userMessage,
    'test-user',
    conversationState,     // multi-turn: passa o state da mensagem anterior
    (entry) => {
      // Disparado a cada passo — usa agentNodeMap (agentId → nodeId do ReactFlow)
      // pra saber qual nó do canvas acender.
      const nodeId = entry.agentId ? agentNodeMap[`${squad.id}::${entry.agentId}`] : null;
      setExecutingNodeId(nodeId ?? null);
    }
  );

  setConversationState(result.updatedState);
};
```

O highlight do nó ativo é aplicado via um `useEffect` que observa `executingNodeId` e marca
`data.isExecuting = true` no nó correspondente (CSS: `.rf-node.executing`, glow ciano pulsante).

---

## 🔗 Integração com Backend

### Como conectar ao Backend Real (ai-agents)

Hoje o `AgentCaller` é mockado. Pra conectar ao backend:

```typescript
// Em AgentCaller.ts
async callAgent(agent: Agent, message: string, context: ConversationState): Promise<...> {
  // ← AQUI faria a chamada real:
  
  const response = await fetch(`/api/agents/${agent.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      state_json: context.memory,
      conversation_history: context.messages.slice(-10) // últimas 10 msgs
    })
  });

  const data = await response.json();
  return {
    response: data.response,
    updatedMemory: data.state_json // Se o backend retornar novo state
  };
}
```

### Contrato da API (proposta)

```
POST /api/agents/{agentId}/execute

Request:
{
  "message": "Quero viajar pra Paris",
  "state_json": { "budget": 20000, "dates": "Agosto" },
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}

Response:
{
  "response": "Roteiro montado: ...",
  "state_json": { "roteiro": [...], "days": 5 },
  "confidence": 0.95,
  "internal_reasoning": "Peguei o orçamento, criei 5 dias de roteiro romanticamente pensado..."
}
```

---

## 📊 Estrutura de ConversationState

```typescript
interface ConversationState {
  conversationId: string;        // ID único da conversa
  squadId: string;               // Qual squad está executando
  userId: string;                // Quem perguntou
  
  memory: Record<string, any>;   // ← O que FLUI entre agentes
  messages: Array<{              // ← Histórico
    role: 'user' | 'agent';
    sender?: string;             // Nome do agente que respondeu
    content: string;
    timestamp: string;
  }>;
  
  currentStep: string;           // 'triagem' | 'processing' | 'delegation' | 'aggregation' | 'complete'
  assignedAgent: SquadMember | null;
  
  executionLog: Array<{          // ← Auditoria completa
    timestamp: string;
    step: number;
    agentName: string;
    agentRole: string;
    action: string;              // 'received', 'delegated', 'processed', 'responded'
    input?: string;
    output?: string;
    internalOnly?: boolean;
  }>;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 🚀 Próximos Passos

### 1. Conectar ao backend real (ai-agents)
Editar `AgentCaller.callAgent()` pra chamar `/api/agents/{id}/execute`

### 2. Persistência (opcional)
Guardar `ConversationState` em BD para:
- Histórico de conversas
- Analytics
- Debugging

### 3. Escalabilidade (futuro)
- Message Queue (Redis/RabbitMQ)
- Workers paralelos
- State cache distribuído

---

## 🧪 Testando Localmente

```bash
cd app_build
npm run dev

# Abrir http://localhost:5173
# Ir em "Organograma" no menu lateral
# Selecionar uma squad no canvas (clique num nó ou na lista)
# Clicar em "Testar Squad (Executar)" no painel de detalhe
# Digitar uma mensagem no drawer que abre sobre o canvas
# Ver os nós do organograma acenderem conforme a execução avança!
```

Console mostrará:
```
=== Resultado da Execução ===
Sucesso: true
Tempo: 3500 ms
Memória compartilhada: { roteiro: [...], budget: 21500 }
Delegações: [{ from: 'Orq', to: 'Roteirista', ... }, ...]
Estado final: { conversationId, messages, executionLog, ... }
```

---

## ❓ FAQ

**P: E se não haver Orquestrador na squad?**
R: O executor vai errar. Uma squad PRECISA ter um orchestrator member.

**P: Pode ter múltiplas delegações paralelas?**
R: Hoje é sequencial (Orq → Roteirista → Orq → Emissor). Paralelizar é futuro.

**P: Como o state flui entre agentes?**
R: Via `state.memory`. Cada agente pode ler + atualizar.

**P: E se um agente falhar?**
R: A execução inteira falha. Retry/fallback é futuro.

**P: Posso chamar a squad via API?**
R: Sim! Depois conectar ao backend, fica: `POST /api/squads/{id}/execute`

**P: Visível pra quem?**
R: `publicResponse` é pra cliente. `internalDelegations` só pra admin/auditoria.

---

## 📚 Referências

- `services/SquadExecutor.ts` — Implementação completa
- `pages/Organograma.tsx` — Canvas + drawer de teste + highlight de nós
- `types/index.ts` — Tipos (Squad, Agent, etc)
