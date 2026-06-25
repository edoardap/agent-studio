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
