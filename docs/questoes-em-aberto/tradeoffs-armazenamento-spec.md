# Trade-offs de Armazenamento da Spec de Agentes

Este documento detalha a discussão sobre as decisões de design de banco de dados para o armazenamento da especificação (spec) de camadas dos agentes.

> Relacionado: [`tradeoffs-armazenamento-tools.md`](./tradeoffs-armazenamento-tools.md) (tools como relação forte),
> [`tradeoffs-armazenamento-templates.md`](./tradeoffs-armazenamento-templates.md) (copy-on-write de template)
> e [`heranca-de-specs.md`](./heranca-de-specs.md) (herança entre agentes).

## Contexto
A especificação de um agente na Fábrica de Agentes é composta por camadas cognitivas distintas: Identity, Behavior, Security, Context, Memory, Planning, Action e Response (ver [`../camadas-da-spec.md`](../camadas-da-spec.md)). Durante o desenho do banco de dados, surgiu a questão: **Quais são os trade-offs de armazenar toda a especificação em um único campo do tipo JSON/JSONB na tabela de agentes versus ter tabelas dedicadas para cada camada (relacionamento 1:1)?**

> Nota: a dúvida costuma ser colocada como "JSON único **vs.** tabela por camada", mas na prática existem **três** níveis de granularidade — ver a seção de recomendação. O padrão de fato da indústria (2025/2026) para plataformas de agentes é **documento (JSON/YAML), não normalização por camada**; nenhuma plataforma relevante (OpenAI Agents SDK, Bedrock, LangGraph, ADK, CrewAI, Dify) modela a spec como tabela-por-atributo.

---

## Opção A: Coluna Única JSON/JSONB (`agents.spec`)
Neste modelo, toda a especificação de 7 camadas do agente é serializada e armazenada sob a forma de um objeto estruturado em uma única coluna na tabela principal de agentes.

### Vantagens (Prós)
- **Flexibilidade e Agilidade de Desenvolvimento:** Prompt engineering e arquitetura de LLMs evoluem rapidamente. Se uma nova configuração for necessária em qualquer camada (ex: uma nova flag em `security`), ela pode ser adicionada sem a necessidade de rodar migrações de banco de dados (`DDL`).
- **Simplicidade de CRUD:** Operações de leitura e escrita são efetuadas em um único registro. Não há necessidade de construir `JOINs` complexos para recuperar a especificação completa para o motor de runtime.
- **Versionamento e Snapshots Simples:** Armazenar a spec como um blob JSON torna a criação de um histórico de versões de agentes (ex: para auditoria ou rollbacks) extremamente simples através de uma tabela histórica simples (`agent_id`, `version`, `spec_json`, `created_at`).
- **Clonagem Eficiente:** Duplicar as especificações de um agente para criar outro requer apenas um insert simples de uma linha.

### Desvantagens (Contras)
- **Ausência de Integridade de Chaves Estrangeiras:** Se a camada de `Context` apontar para arquivos (`document_ids`) ou `Action` apontar para ferramentas (`tool_ids`), o banco de dados não consegue impor restrições de integridade referencial (`FK`) dentro do JSON. A integridade precisa ser controlada na aplicação.
- **Validação de Schema Fraca no Banco de Dados:** Não há validação nativa automática de tipos e obrigatoriedade de campos sem implementar mecanismos complexos de JSON Schema.
- **Concorrência:** Atualizações simultâneas em diferentes camadas do agente no mesmo registro podem sofrer de problemas de colisão ("race conditions"), exigindo estratégias de locking otimista baseadas em número de versão ou timestamp.
- **Dificuldade de Compartilhamento e Reuso:** Dificulta a reutilização direta de uma mesma camada (ex: regras de segurança ou comportamento padronizadas) entre múltiplos agentes. Para reaproveitar, é necessário duplicar os dados no JSON ou criar lógica complexa de herança/mesclagem na aplicação.

---

## Opção B: Tabelas Separadas por Camada (`agent_identity`, `agent_security`...)
Neste modelo, cada uma das 7 camadas da especificação é representada por uma tabela dedicada com relacionamentos individuais de chave estrangeira vinculados à tabela `agents`.

### Vantagens (Prós)
- **Integridade Referencial Estrita:** Permite o uso de tipos de dados rigorosos, constraints de banco de dados (`NOT NULL`, `CHECK`) e chaves estrangeiras clássicas. A deleção de um documento ou ferramenta associada pode ser controlada com `ON DELETE RESTRICT` ou `ON DELETE CASCADE`.
- **Garantia de Tipagem no Banco:** O schema do próprio banco de dados dita a estrutura correta de cada camada, servindo também como documentação viva e limpa.
- **Concorrência Isolada:** Lógica diferente do sistema pode ler ou gravar em `agent_security` sem interferir ou travar dados de `agent_identity`.
- **Reaproveitamento Dinâmico de Camadas (DRY):** Facilita o compartilhamento de registros de camadas comuns entre múltiplos agentes via relacionamentos de chaves estrangeiras.
  - *Exemplo Prático:* Você pode criar uma única configuração de segurança restrita e robusta (ex: "Política de Segurança Padrão ACME V1") e associá-la a 50 agentes diferentes. Se a equipe de segurança atualizar essa política na tabela \`agent_security\`, a alteração é propagada instantaneamente para todos os 50 agentes sem duplicar dados.

### Desvantagens (Contras)
- **Alta Rigidez de Schema:** Qualquer alteração conceitual na spec do agente (como a adição de uma nova camada de Memória ou novos parâmetros em Planejamento) exige a elaboração e execução de migrações de banco, reduzindo a agilidade do time.
- **Sobrecarga de Queries (Múltiplos JOINs):** Para carregar o agente completo com suas configurações para execução, é necessário um `JOIN` de 8 tabelas (`agents` mais as 7 camadas), degradando a performance e gerando queries verbosas.
- **Versionamento Complexo:** Salvar e gerenciar o histórico de modificações do agente exige a replicação e controle de histórico em 8 tabelas de forma sincronizada, aumentando consideravelmente a complexidade do sistema de versionamento.

---

---

## Os três níveis de granularidade (não são dois)
A escolha real não é binária. Existem três abordagens:

| | Modelo | O que é | Veredito |
|---|---|---|---|
| **A** | **Blob JSON único** | Tudo (inclusive tools/KBs) num `config_json` | ❌ Perde integridade referencial de tools/KBs |
| **B** | **Híbrido** ⭐ | `config_json` (JSONB) para as camadas cognitivas **+ tabelas associativas** para tools/KBs **+ colunas tipadas** para metadados consultáveis | ✅ **Recomendado** |
| **C** | **Tabela por camada** | `agent_identity`, `agent_behavior`… (1:1 com `agents`) | ❌ Over-engineering; rigidez alta (Opção B acima) |

O único benefício real da normalização por camada — **integridade referencial** — só importa de verdade para **tools e knowledge_bases**. Esses dois se resolvem com tabelas associativas *sem* normalizar o resto.

## Por que os atributos MUDAM (argumento a favor do JSONB)
A preocupação de que "a estrutura do JSON pode quebrar" é legítima, mas os cenários de mudança **favorecem** o JSON, desde que haja versionamento de schema. Exemplos já presentes no próprio projeto:

1. **Adição de camada inteira** — o bloco `Memory` proposto em [`../nota-correcao-spec.md`](../nota-correcao-spec.md). Com JSON é mudança **aditiva** (zero migration); com tabela-por-camada exige nova tabela + backfill.
2. **Atributo que evolui de tipo** — `action.tools` hoje é `string[]`; no backend real vira `object[]` (YAML com método/path/schema — ver [`tradeoffs-armazenamento-tools.md`](./tradeoffs-armazenamento-tools.md)).
3. **Enum que ganha valores** — `memory.summary_strategy` (`rolling`/`on_overflow`/`manual`) ganhando novas estratégias.
4. **Flags novas de segurança/comportamento** — prompt engineering evolui rápido.

---

## Recomendação de Design (Abordagem Híbrida — Opção B)
Em virtude da natureza altamente experimental e iterativa dos agentes baseados em LLMs, a abordagem **híbrida com coluna JSONB para a spec** é a mais recomendada:

1. **`config_json` (JSONB)** guarda as camadas cognitivas (texto/prompts/flags) — flexível e aditivo.
2. **Validação via Aplicação:** A rigidez da tipagem é delegada à camada de aplicação com **Zod** (TypeScript) ou **Pydantic** (Python) — o schema forte vive no código, versionado junto com a app, não no DDL.
3. **`schema_version` embutido no `config_json`** desde o dia 1, com um *registry* de migrations e **migração lazy** (ao ler uma spec antiga, sobe para a versão atual em memória). Todo formato sério (Letta `.af`, Google A2A, Copilot manifest) carrega esse campo.
4. **Relacionamentos Híbridos:** Relacionamentos fortes e críticos (ferramentas, bases de conhecimento) **saem do JSON** e viram tabelas associativas clássicas (ex.: `agent_tools`, `agent_knowledge_bases`) para garantir integridade referencial — ver [`tradeoffs-armazenamento-tools.md`](./tradeoffs-armazenamento-tools.md).
5. **Colunas tipadas para o consultável:** o que você filtra/ordena com frequência (`tenant_id`, `name`, `status`, `model`) fica em **coluna própria**, fora do JSONB.
6. **Promoção sob demanda:** se um atributo dentro do JSONB "esquentar" (virar muito filtrado), promova-o a **coluna gerada** (`GENERATED ALWAYS AS (config_json->>'...')`) e indexe.

> ⚠️ **Caveat de performance (JSONB):** filtrar *dentro* de JSONB pode ser ordens de magnitude mais lento que uma coluna indexada (o planner do Postgres não tem estatísticas por chave) e ocupa ~2× em disco. Por isso: **o que se consulta vira coluna; o resto da spec fica no JSONB.**

### Refinamento opcional: uma coluna JSONB *por camada*
Em vez de um `config_json` único, pode-se ter `identity JSONB, behavior JSONB, security JSONB…`. Ganho: updates parciais e escrita concorrente por camada sem colisão. **Recomendação para o piloto: não fazer ainda** — manter um `config_json` único (snapshot trivial). Migrar para coluna-por-camada só se surgir contenção real de escrita concorrente; é uma refatoração aditiva e barata.

### Versionamento
Padrão universal da indústria: **versões imutáveis numeradas + ponteiro mutável** (alias/label como "production"). Cada versão é uma linha *append-only* contendo a **spec resolvida e congelada**. Isso torna snapshot/rollback triviais — uma das vantagens centrais do blob JSON.

```sql
agent_versions (agent_id FK, version INT, config_json JSONB /*resolvida*/, created_at)  -- append-only
-- um alias/label mutável aponta para uma version específica
```

> Para como isso interage com herança entre agentes (pin de versão do pai, evitar `pai@latest`), ver [`heranca-de-specs.md`](./heranca-de-specs.md).

---

## Referências (pesquisa 2025/2026)

Fontes que embasam as recomendações acima, agrupadas por tema.

### Como as plataformas persistem specs
- [OpenAI — Assistants API migration guide](https://developers.openai.com/api/docs/assistants/migration) — Assistant é objeto server-side JSON, em deprecação rumo à Responses API + Prompts.
- [OpenAI — Agents SDK reference](https://openai.github.io/openai-agents-python/agents/) — SDK code-first e stateless; spec vive no código, versionada por Git.
- [Anthropic — Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — Skills filesystem-native (SKILL.md + frontmatter YAML).
- [Anthropic — Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — estrutura de pasta da skill.
- [anthropics/skills (GitHub)](https://github.com/anthropics/skills) — skills versionadas em Git.
- [LangGraph — Assistant versioning](https://langchain-ai.github.io/langgraphjs/cloud/how-tos/assistant_versioning/) — Assistant é objeto de config JSON com versionamento de 1ª classe.
- [LangGraph — Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) — checkpointers persistem estado de thread, não a spec.
- [Microsoft Copilot Studio — solutions import/export](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-solutions-import-export) — agentes normalizados em tabelas Dataverse.
- [Microsoft AutoGen](https://microsoft.github.io/autogen/) — framework code-first; persistência é do desenvolvedor.
- [Google — ADK no Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/use/adk) — ADK code-first; persiste sessões/memória, não spec declarativa.
- [Google ADK — deploy to Agent Engine](https://google.github.io/adk-docs/deploy/agent-engine/) — deploy via `adk deploy`.
- [CrewAI — Agents / YAML config](https://docs.crewai.com/en/concepts/agents) — spec declarativa em agents.yaml/tasks.yaml.
- [Amazon Bedrock — manage agent versions](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-version-manage.html) — DRAFT mutável + versão imutável numerada.
- [Amazon Bedrock — deploy agent (aliases)](https://docs.aws.amazon.com/bedrock/latest/userguide/deploy-agent.html) — alias tira snapshot imutável.
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/) — config como IaC (CDK/CloudFormation).
- [Dify — app management / DSL](https://docs.dify.ai/en/use-dify/workspace/app-management) — forma portátil é o Dify DSL (blob YAML).
- [Flowise — Chatflows API](https://docs.flowiseai.com/api-reference/chatflows) — grafo em JSON no banco.
- [n8n — AI Agent node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent) — workflow serializado a blob JSON único.
- [Ironclad/rivet (GitHub)](https://github.com/Ironclad/rivet) — agentes em grafo salvos como `.rivet-project` YAML.

### Spec declarativa / Agent File
- [agents.md](https://agents.md/) — convenção Markdown de contexto; sem schema nem versão.
- [Letta — Agent File (.af) guide](https://docs.letta.com/guides/agents/agent-file/) — JSON único que serializa o estado inteiro, com campo `version`.
- [letta-ai/agent-file (GitHub)](https://github.com/letta-ai/agent-file) — spec do formato .af e suas camadas.
- [Letta — pydantic_agent_schema.py](https://github.com/letta-ai/letta/blob/main/letta/serialize_schemas/pydantic_agent_schema.py) — campos top-level exatos (system, llm_config, core_memory, tools, messages…).
- [A2A protocol — specification](https://a2a-protocol.org/latest/specification/) — contrato de capacidade com `version`/`protocolVersion`.
- [A2A — Agent Card concept](https://agent2agent.info/docs/concepts/agentcard/) — campos do Agent Card servido em `/.well-known/`.
- [Microsoft — declarative agent manifest 1.5](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.5) — manifesto JSON versionado.
- [Microsoft — declarative-agent v1.5 JSON schema](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.5/schema.json) — schema formal com `$schema` + `version`.
- [CrewAI YAML configuration (DeepWiki)](https://deepwiki.com/crewAIInc/crewAI/8.2-yaml-configuration) — detalhe dos campos de agents.yaml/tasks.yaml.

### Trade-offs JSONB vs. normalização (e evolução de schema)
- [Heap.io — When To Avoid JSONB In A PostgreSQL Schema](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema) — benchmark ~2000× mais lento, bloat ~2×, cegueira do planner.
- [sqlpad.io — JSONB vs Columns performance](https://sqlpad.io/tutorial/postgresql-jsonb-vs-columns-performance-guide/) — framework de decisão coluna vs JSONB; recomendação híbrida.
- [wirekat — Practical guide to JSONB in Postgres](https://www.wirekat.com/a-practical-guide-to-using-the-jsonb-type-in-postgres/) — casos de dados de formato variável.
- [DEV — PostgreSQL JSONB Indexing](https://dev.to/philip_mcclarence_2ef9475/postgresql-jsonb-indexing-gin-expression-partial-index-strategies-i11) — estratégias de índice.
- [pganalyze — Understanding Postgres GIN Indexes](https://pganalyze.com/blog/gin-index) — operadores e overhead de escrita.
- [PostgreSQL docs — GIN Indexes](https://www.postgresql.org/docs/current/gin.html) — referência oficial.
- [richyen — Making JSONB More Queryable with Generated Columns](https://richyen.com/postgres/2026/05/11/generated_columns_jsonb.html) — colunas geradas para chaves quentes.
- [jsonic.io — JSON Schema Migration Strategy](https://jsonic.io/guides/json-migrations) — schemaVersion embutido, migration registry, migração lazy.
- [Medium/Jai Garg — Zero-Downtime PostgreSQL JSONB Migration](https://medium.com/@shinyjai2011/zero-downtime-postgresql-jsonb-migration-a-practical-guide-for-scalable-schema-evolution-9f74124ef4a1) — coluna nulável + backfill em lotes.
- [DEV — Migrating From a JSON Column to a Proper Schema](https://dev.to/gabrielanhaia/migrating-from-a-json-column-to-a-proper-schema-in-postgres-4o9e) — promoção de blob para schema relacional.
- [Martin Fowler — Evolutionary Database Design](https://martinfowler.com/articles/evodb.html) — migrations versionadas.
- [Martin Fowler — Schemaless Data Structures](https://martinfowler.com/articles/schemaless.html) — armadilha do "schema implícito". *(404 na leitura direta; pontos via evodb.html + resumos indexados — tratar com cautela extra.)*
- [AWS in Plain English — Schema-on-Write vs Schema-on-Read](https://aws.plainenglish.io/schema-on-write-vs-schema-on-read-a-comparative-analysis-14a73d1ed4f2) — comparação dos modelos.

### Herança / composição / overlay
- [Copilot Studio — template fundamentals](https://learn.microsoft.com/en-us/microsoft-copilot-studio/template-fundamentals) — templates são scaffolding; copy-on-create, sem link vivo.
- [Microsoft — agent templates overview](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-templates-overview) — updates de template não propagam.
- [Google ADK — Agent Config](https://google.github.io/adk-docs/agents/config/) — composição por referência (sub_agents), não herança de spec.
- [Google ADK — AgentConfig API](https://google.github.io/adk-docs/api-reference/agentconfig/) — árvore pai-filho de delegação.
- [Kubernetes — Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/) — modelo base + overlay resolvido no build.
- [oneuptime — Kustomize Strategic Merge Patches](https://oneuptime.com/blog/post/2026-02-09-kustomize-strategic-merge-patches/view) — merge schema-aware, list por merge-key.
- [openillumi — Helm/ArgoCD values merge & override](https://openillumi.com/en/en-helm-argocd-values-merge-override/) — maps deep-merge, arrays substituem.
- [helm#3486 (GitHub)](https://github.com/helm/helm/issues/3486) — a dor do array-replace no Helm.
- [RFC 7386 — JSON Merge Patch](https://tools.ietf.org/html/rfc7386) — deep-merge, null=deletar, arrays substituídos inteiros.
- [erosb — JSON Patch vs Merge Patch](https://erosb.github.io/json-patch-vs-merge-patch/) — RFC 6902 vs 7386.
- [Zuplo — JSON Patch vs JSON Merge Patch](https://zuplo.com/learning-center/json-patch-vs-json-merge-patch) — quando usar cada um.
- [python-patterns.guide — Composition over Inheritance](https://python-patterns.guide/gang-of-four/composition-over-inheritance/) — princípio GoF.
- [Vue — Options: Composition (mixins)](https://vuejs.org/api/options-composition) — mixins como merge de fragmentos parciais.
- [Eric Elliott — Concatenative inheritance](https://medium.com/javascript-scene/the-heart-soul-of-prototypal-oo-concatenative-inheritance-a3b64cb27819) — mixins/herança por concatenação.
- [javascript.info — Prototypal inheritance](https://javascript.info/prototype-inheritance) — herança viva vs. cópia.
- [The Syntax Diaries — Lodash merge guide](https://thesyntaxdiaries.com/lodash-merge-a-comprehensive-guide) — pitfalls de merge de array/null.

### Versionamento / imutabilidade / snapshots
- [Amazon Bedrock — deploy agent (versions & aliases)](https://docs.aws.amazon.com/bedrock/latest/userguide/deploy-agent.html) — versão imutável = snapshot; alias = ponteiro mutável.
- [AWS Builder — Bedrock Agent Versioning guide](https://community.aws/content/2tgaWN2cB7eYWNJpiXaS9ueEvHW/amazon-bedrock-agent-versioning-complete-guide) — "versão = snapshot imutável".
- [LangSmith — manage prompts](https://docs.langchain.com/langsmith/manage-prompts) — commits estilo Git + tags/environments.
- [LangSmith — prompt tags announcement](https://changelog.langchain.com/announcements/prompt-tags-in-langsmith-for-version-control) — tags para controle de versão.
- [PromptLayer — Release Labels](https://docs.promptlayer.com/features/prompt-registry/release-labels) — labels prod/staging + dynamic labels p/ A/B.
- [Langfuse — Prompt Version Control](https://langfuse.com/docs/prompt-management/features/prompt-version-control) — versões imutáveis + labels.
- [Langfuse — Prompt data model](https://langfuse.com/docs/prompt-management/data-model) — modelo de versões e labels.
- [Vertex AI — prompt classes / management](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/prompt-classes) — versão imutável por save.
- [Vertex AI — restore_version sample](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-prompt-restore-version) — restore cria versão nova.
- [OpenAI — Prompt management in Playground](https://help.openai.com/en/articles/9824968-prompt-management-in-playground) — draft + versão publicada.
- [SQL Server — system-versioned temporal tables](https://learn.microsoft.com/en-us/sql/relational-databases/tables/creating-a-system-versioned-temporal-table) — histórico automático + `FOR SYSTEM_TIME AS OF`.
- [Azure — Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) — stream imutável de eventos.
- [oneuptime — Event Snapshotting](https://oneuptime.com/blog/post/2026-01-30-event-snapshotting/view) — snapshots periódicos.
- [Vulert — Dependency Pinning vs Floating Versions](https://vulert.com/blog/dependency-pinning-vs-floating-versions/) — pin vs float.
- [arXiv 2502.06662 — pinning/floating em dependências](https://arxiv.org/html/2502.06662v1) — implicações transitivas.
- [nesbitt.io — Lockfile format design and tradeoffs](https://nesbitt.io/2026/01/17/lockfile-format-design-and-tradeoffs.html) — resolve-e-congela no build.
