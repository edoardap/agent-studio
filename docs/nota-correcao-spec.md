# Nota de Correção — Spec "Spec to Agent" (Piloto Agent Factory)

> **Status:** proposta de correção · **Escopo:** documento da especificação (não o protótipo)
> **Origem:** inconsistência interna identificada na análise do protótipo `agent-studio`.

## 1. Problema

O documento define **duas taxonomias de camadas que não coincidem**:

- **Seção 8 — "Modelo funcional do agente" (7 camadas cognitivas):**
  `Policy · Identity · Context · Memory · Planning · Action · Response`

- **Seção 10 — "Estrutura mínima da spec do agente" (blocos do `config_json`):**
  `Identity · Behavior · Security · Context · Planning · Action · Response`

As listas divergem em dois pontos:

| Seção 8 (conceitual) | Seção 10 (estrutura concreta) |
|---|---|
| **Policy** | *(ausente — diluído em Behavior/Security)* |
| **Memory** | *(ausente)* |
| *(não existe)* | **Behavior** |
| *(não existe)* | **Security** |

Consequência: quem implementa não sabe qual lista é a verdadeira. O documento promete um modelo conceitual (seção 8) que ele mesmo não entrega na estrutura acionável (seção 10). O protótipo seguiu a seção 10, e teve que tratar a memória **apenas no runtime** (summary/state/janela recente), nunca como bloco configurável da spec — exatamente o que a seção 15 pede.

## 2. Decisão proposta

Adotar **uma única taxonomia canônica de 7 camadas**, reconciliando as duas seções:

```
1. Identity     — identidade do agente
2. Policy        — regras de governança/segurança (absorve Security + parte de Behavior)
3. Behavior      — tom, limites, idioma, formato de interação
4. Context       — empresa, segmento, horário, dados de apoio
5. Memory        — janela recente, summary, fatos a lembrar (NOVO bloco configurável)
6. Planning      — roteiro, regras de decisão, estado inicial
7. Action        — ações/tools disponíveis
8. Response      — tarefa e regras de saída
```

> Observação: se a meta for manter **exatamente 7**, fundir `Policy` dentro de `Behavior`
> (mantendo `security_rules`, `forbid_final_answer`, `anti_prompt_injection`,
> `jailbreak_response` como subcampos). A decisão de design é entre
> **7 camadas (Policy embutido)** ou **8 blocos (Policy explícito)**.

### Mudança mínima obrigatória

Independentemente da escolha acima, **`Memory` deve voltar como bloco da spec** (seção 10),
porque:

1. A seção 15 já define a estratégia de memória (janela de 6–10 mensagens, summary, state).
2. O runtime já consome esses dados — falta apenas torná-los **configuráveis** na spec.

Estrutura sugerida para o bloco `memory` em `config_json`:

```json
"memory": {
  "recent_window_size": 8,
  "enable_summary": true,
  "summary_strategy": "rolling",
  "key_facts_to_remember": []
}
```

### Distinção fundamental: configuração de memória vs. dados de memória

Isto costuma confundir, então é o ponto-chave: existem **dois lados** da memória.

| | O quê | Onde fica | Quem usa |
|---|---|---|---|
| **Configuração de memória** | As **regras** de como o agente lembra | Spec → bloco `memory` (estático) | Definido na criação do agente |
| **Dados de memória** | O **conteúdo** lembrado de uma conversa específica | Runtime → `state_json`, `summary_text`, mensagens recentes | Gerado durante cada conversa |

> O bloco `memory` da spec **não guarda mensagens**. Ele guarda as **regras** que dizem ao
> compilador/runtime *como* lidar com a memória daquela conversa. Os dados de fato (resumo,
> estado, histórico) vivem no runtime, por conversa.

### Detalhe de cada campo do bloco `memory`

- **`recent_window_size`** (número) — Quantas das últimas mensagens entram literalmente no
  prompt compilado. É a "janela recente" da Seção 15 (recomendado 6–10). Controla o equilíbrio
  entre *contexto* (mais mensagens = mais memória curta) e *custo/tamanho do prompt*.
  Ex.: `8` → o compilador injeta as 8 últimas mensagens da conversa no `{{recent_messages}}`.

- **`enable_summary`** (booleano) — Liga/desliga o resumo contínuo da conversa (`summary_text`).
  Com `true`, conversas longas são **condensadas** num resumo em vez de mandar todo o histórico;
  o resumo entra no prompt via `{{summary_text}}`. Com `false`, o agente só usa a janela recente.

- **`summary_strategy`** (texto/enum) — *Como* o resumo é atualizado. Opções típicas:
  - `"rolling"` — o resumo é reescrito a cada N turnos, sempre acumulando o essencial.
  - `"on_overflow"` — só resume quando a janela recente "estoura" (passa de `recent_window_size`).
  - `"manual"` — o resumo só muda quando alguém atualiza explicitamente.

- **`key_facts_to_remember`** (lista de textos) — Fatos **fixos** que o agente deve lembrar
  *sempre*, independente da janela recente ou do resumo. É a memória de longo prazo **simples**
  (sem embeddings/busca vetorial — fora do escopo do piloto, Seção 15).
  Ex.: `["Cliente é Pessoa Jurídica", "Plano contratado: Enterprise"]`.

### Como isso aparece no fluxo (resumido)

1. Na **criação do agente**, o usuário define o bloco `memory` (as regras).
2. Em **cada conversa**, o runtime mantém `state_json` + `summary_text` + mensagens seguindo
   essas regras.
3. O **compilador** lê a configuração e injeta os dados certos no `AGENT_SYSTEM`
   (janela de tamanho `recent_window_size`, summary se `enable_summary`, e os `key_facts`).

> Para o detalhamento de **todas** as camadas da spec (não só memória), ver
> [`camadas-da-spec.md`](./camadas-da-spec.md).

## 3. Texto de substituição para a Seção 8

> Substituir a lista atual da Seção 8 por:
>
> *A spec do agente segue 7 camadas lógicas, alinhadas 1:1 com os blocos do `config_json`
> definidos na Seção 10: **Identity, Behavior (inclui política/segurança), Context, Memory,
> Planning, Action e Response.** Essas camadas não viram tabelas separadas neste piloto —
> existem como estrutura lógica dentro da spec.*

## 4. Impacto

- **Documento:** elimina a contradição Seção 8 ↔ Seção 10; alinha com a Seção 15 (memória).
- **Protótipo:** adiciona um passo "Memória" no formulário de camadas da Fábrica.
- **Backend (futuro):** quando o `config_json` for normalizado em tabelas, cada camada
  vira um agrupamento estável — `memory` já nasce como entidade prevista, sem retrabalho.
- **Compatibilidade:** mudança aditiva (novo bloco opcional); não quebra specs existentes.
