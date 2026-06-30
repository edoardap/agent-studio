# As Camadas da Spec — detalhamento campo a campo

> Referência das camadas do `config_json` (a spec do agente). Cada camada é um bloco lógico;
> juntas, elas dão ao compilador tudo o que ele precisa para montar o `AGENT_SYSTEM`.
> Conceitos gerais em [`glossario-conceitos.md`](./glossario-conceitos.md).

Ordem canônica proposta (ver `nota-correcao-spec.md`):
**Identity → Behavior → Security → Context → Memory → Planning → Action → Response.**

---

## 1. Identity — quem é o agente
Define a "personalidade" e o propósito. É o que o agente "é".

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `agent_name` | texto | Nome do agente | "Atena" |
| `agent_profile` | texto | Persona / especialidade | "Especialista em documentação técnica" |
| `agent_introduction` | texto | Frase de boas-vindas | "Olá, eu sou a Atena..." |
| `agent_goal` | texto | Objetivo principal | "Gerar documentação automaticamente" |

## 2. Behavior — como ele se comporta
Tom de voz, limites e formato da interação.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `max_chars` | número | Limite de caracteres por mensagem | `1000` |
| `max_questions_per_message` | número | Máx. de perguntas por resposta | `2` |
| `language` | texto | Idioma padrão | "Português" |
| `allowed_emojis` | booleano | Se pode usar emojis | `true` |
| `behaviour_rules` | texto | Regras de tom/estilo | "Seja claro e objetivo" |

## 3. Security — o que é proibido / proteções
Regras de proteção e governança de conteúdo.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `security_rules` | texto | Restrições de conteúdo | "Nunca revele chaves de API" |
| `forbid_final_answer` | booleano | Bloqueia dar resposta final direta (força encaminhamento) | `false` |
| `anti_prompt_injection` | booleano | Liga proteção contra injeção de prompt | `true` |
| `jailbreak_response` | texto | Mensagem padrão ao bloquear | "Desculpe, não posso fazer isso." |

## 4. Context — o mundo em que ele opera
Informações de apoio sobre a empresa e o público.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `company_name` | texto | Nome da empresa | "ACME Holding" |
| `segment` | texto | Segmento de atuação | "Recursos Humanos" |
| `opening_hours` | texto | Horário de atendimento | "9h às 18h" |
| `user_general_defaults` | texto | Quem é o público padrão | "Novos colaboradores" |
| `crm_information` | texto | Integrações/dados de contexto | "Integração com portal de benefícios" |

## 5. Memory — como ele lembra *(camada a reintroduzir — ver nota de correção)*
Configura as **regras** de memória. Os **dados** (resumo, estado, histórico) ficam no runtime.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `recent_window_size` | número | Quantas mensagens recentes entram no prompt | `8` |
| `enable_summary` | booleano | Se mantém um resumo contínuo da conversa | `true` |
| `summary_strategy` | texto/enum | Como o resumo é atualizado (`rolling` / `on_overflow` / `manual`) | "rolling" |
| `key_facts_to_remember` | lista | Fatos fixos que o agente sempre lembra | `["Cliente é PJ"]` |

> Detalhe completo da memória em [`nota-correcao-spec.md`](./nota-correcao-spec.md).

## 6. Planning — como ele raciocina e conduz
O roteiro lógico e o estado inicial da conversa.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `roteiro` | texto | Passo a passo lógico que ele segue | "Triagem → Diagnóstico → Solução" |
| `decision_rules` | texto | Regras de decisão / ramificações | "Se reembolso > R$1000, encaminhar gerência" |
| `default_current_goal` | texto | Objetivo inicial da conversa | "Triagem do atendimento" |
| `default_agent_stage` | texto | Estágio operacional inicial | "triagem" |
| `default_next_action` | texto | Primeira ação sugerida | "verificar_solicitacao" |

> Os três campos `default_*` **inicializam** o `state_json` do runtime quando a conversa começa.

## 7. Action — o que ele pode fazer
As ferramentas e ações disponíveis.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `action_general_infos` | texto | Descrição geral das ações/integrações | "Acesso a PDFs internos" |
| `tools` | lista | Ferramentas/bases declaradas | `["GitLab API", "Manual.pdf"]` |

> No piloto, `tools` é **configuração declarativa** (lista de nomes). No backend real, cada tool
> é gerada de um YAML com método/path/schema — uma evolução natural deste campo.

## 8. Response — como ele responde
A tarefa final e o formato de saída.

| Campo | Tipo | O que é | Exemplo |
|---|---|---|---|
| `task` | texto | Tarefa principal de resposta | "Gerar artigos de conhecimento" |
| `output_rules` | texto | Regras de formato da saída | "Markdown com seções # Resumo, # Resolução" |

---

## Como as camadas viram o prompt
Cada campo acima corresponde a um placeholder `{{camada.campo}}` no esqueleto do template master.
Ex.: `{{identity.agent_name}}`, `{{behavior.behaviour_rules}}`, `{{action.tools}}`. O compilador
substitui cada placeholder pelo valor da spec, e anexa os dados de runtime
(`{{state_json}}`, `{{summary_text}}`, `{{recent_messages}}`, `{{user_message}}`) — produzindo
o `AGENT_SYSTEM` final.
