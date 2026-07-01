# Trade-offs de Armazenamento da Spec de Agentes

Este documento detalha a discussão sobre as decisões de design de banco de dados para o armazenamento da especificação (spec) de 7 camadas dos agentes.

## Contexto
A especificação de um agente na Fábrica de Agentes é composta por 7 camadas distintas: Identity, Behavior, Security, Context, Planning, Action e Response. Durante o desenho do banco de dados, surgiu a questão: **Quais são os trade-offs de armazenar toda a especificação em um único campo do tipo JSON/JSONB na tabela de agentes versus ter tabelas dedicadas para cada camada (relacionamento 1:1)?**

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

---

## Opção B: Tabelas Separadas por Camada (`agent_identity`, `agent_security`...)
Neste modelo, cada uma das 7 camadas da especificação é representada por uma tabela dedicada com relacionamentos individuais de chave estrangeira vinculados à tabela `agents`.

### Vantagens (Prós)
- **Integridade Referencial Estrita:** Permite o uso de tipos de dados rigorosos, constraints de banco de dados (`NOT NULL`, `CHECK`) e chaves estrangeiras clássicas. A deleção de um documento ou ferramenta associada pode ser controlada com `ON DELETE RESTRICT` ou `ON DELETE CASCADE`.
- **Garantia de Tipagem no Banco:** O schema do próprio banco de dados dita a estrutura correta de cada camada, servindo também como documentação viva e limpa.
- **Concorrência Isolada:** Lógica diferente do sistema pode ler ou gravar em `agent_security` sem interferir ou travar dados de `agent_identity`.

### Desvantagens (Contras)
- **Alta Rigidez de Schema:** Qualquer alteração conceitual na spec do agente (como a adição de uma nova camada de Memória ou novos parâmetros em Planejamento) exige a elaboração e execução de migrações de banco, reduzindo a agilidade do time.
- **Sobrecarga de Queries (Múltiplos JOINs):** Para carregar o agente completo com suas configurações para execução, é necessário um `JOIN` de 8 tabelas (`agents` mais as 7 camadas), degradando a performance e gerando queries verbosas.
- **Versionamento Complexo:** Salvar e gerenciar o histórico de modificações do agente exige a replicação e controle de histórico em 8 tabelas de forma sincronizada, aumentando consideravelmente a complexidade do sistema de versionamento.

---

## Recomendação de Design (Abordagem JSONB + Validação na Aplicação)
Em virtude da natureza altamente experimental e iterativa dos agentes baseados em LLMs, a abordagem com **coluna única JSON/JSONB** é a mais recomendada pelas seguintes razões:

1. **Validação via Aplicação:** A rigidez da tipagem pode ser delegada à camada de aplicação utilizando bibliotecas de validação de schemas de dados, como **Zod** (TypeScript) ou **Pydantic** (Python).
2. **Relacionamentos Híbridos:** Campos de dados e prompts livres ficam no JSONB do agente, enquanto relacionamentos fortes e críticos (como ferramentas ou bases de conhecimento associadas) devem ser mapeados em tabelas associativas clássicas (ex: `agent_tools`, `agent_documents`) para garantir a integridade referencial do banco.
