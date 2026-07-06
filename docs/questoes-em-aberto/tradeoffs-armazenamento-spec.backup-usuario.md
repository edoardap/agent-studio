# Trade-offs de Armazenamento da Spec de Agentes

Este documento detalha a discussão sobre as decisões de design de banco de dados para o armazenamento da especificação (spec) de 7 camadas dos agentes.

## Contexto e Definição do Problema
A especificação de um agente na Fábrica de Agentes é composta por 7 camadas cognitivas distintas: Identity, Behavior, Security, Context, Planning, Action e Response. 

A discussão central deste documento **não** se resume a um debate simplista de "JSON vs. Relacional". A questão arquitetural é: **Como persistir uma estrutura cognitiva complexa, cujos componentes evoluem constantemente e cuja leitura é altamente acoplada no runtime?**

---

## Modelo Conceitual e Domínio (DDD)
Sob a ótica de *Domain-Driven Design* (DDD), o **Agent** é a nossa **Aggregate Root** (Raiz de Agregado). As 7 camadas cognitivas (Identity, Behavior, Planning, etc.) não possuem ciclo de vida próprio e nem identidade independente fora do contexto do Agente. Elas existem unicamente para compor a especificação do Agente.

Além disso, o motor de execução do runtime do chat **sempre consome a especificação completa** de uma vez para compilar o prompt do sistema enviado à LLM. O runtime nunca executa ou lê apenas a camada de `Identity` ou de `Security` isoladamente. Conceitualmente, a especificação é um **único documento agregado** e não sete entidades separadas. Portanto, mapear essa estrutura em múltiplas tabelas físicas gera um descompasso de impedância em relação ao modelo de domínio e ao perfil de acesso em runtime.

---

## Requisitos do Sistema de Armazenamento

Antes de analisar as estratégias de persistência, definimos os requisitos de arquitetura que a camada de dados precisa satisfazer:
1. **Evolução Frequente da Spec:** Capacidade de adicionar, alterar ou remover chaves de prompts e comportamentos com agilidade à medida que as LLMs e técnicas de prompt evoluem.
2. **Leitura Altamente Frequente no Runtime:** O motor do chat consulta a especificação completa de forma síncrona em todas as interações.
3. **Escrita Parcial por Diferentes Módulos:** Diferentes partes do sistema (painel administrativo, copiloto de planejamento de runtime) atualizam seções distintas da especificação de forma concorrente.
4. **Versionamento e Snapshots:** Facilidade para tirar fotos do estado completo do agente para auditoria ou rollback.
5. **Reuso de Componentes (Possibilidade Futura):** Permitir que configurações globais (ex: uma política de segurança ou conjunto de ferramentas corporativas) sejam compartilhadas entre múltiplos agentes sem redundância excessiva.
6. **Simplicidade Operacional:** Minimizar o overhead de manutenção do banco (migrações de DDL, locks de tabela, monitoramento de performance).

---

## Opção A: Coluna Única JSON/JSONB (`agents.spec`)

Neste modelo, toda a especificação de 7 camadas do agente é serializada e armazenada sob a forma de um objeto estruturado em uma única coluna na tabela principal de agentes.

### Vantagens (Prós)
* **Simplicidade da Aplicação:**
  - **Mapeamento Simplificado:** O ORM mapeia diretamente o objeto spec para uma única propriedade no backend.
  - **Versionamento Direto:** Salvar o histórico de versões requer apenas copiar o JSON completo para uma tabela histórica simples (`agent_id`, `version`, `spec_json`).
  - **Clonagem Eficiente:** Duplicar um agente exige um único insert de uma linha.
* **Performance:**
  - **Leitura O(1):** Recuperação instantânea da especificação completa em uma única query simples, sem JOINs.
* **Evolução:**
  - **Esquema Livre:** Adicionar ou remover chaves em qualquer subcamada cognitiva ocorre instantaneamente na aplicação, sem necessidade de alterações no banco de dados.

### Desvantagens (Contras)
* **Consistência e Validação:**
  - **Ausência de Integridade no Banco:** O banco de dados não consegue impor integridade referencial nativa (`Foreign Keys`) para ferramentas ou bases de conhecimento mencionadas dentro do JSON.
* **Gravação e Concorrência:**
  - **Risco de Conflitos de Escrita:** Atualizações concorrentes em subchaves diferentes (ex: o chat salvando o estado de `Planning` e o usuário alterando a `Identity` no painel) podem causar sobreposição de dados se a aplicação gravar o JSON completo de volta, exigindo controle complexo de concorrência otimista.

---

## Opção B: Tabelas Separadas por Camada (`agent_identity`, `agent_security`...)

Neste modelo, cada uma das 7 camadas da especificação é representada por uma tabela dedicada com relacionamentos individuais de chave estrangeira vinculados à tabela `agents`.

### Vantagens (Prós)
* **Consistência:**
  - **Integridade Referencial Estrita:** Uso de constraints clássicas (`NOT NULL`, `CHECK`) e Foreign Keys nativas no banco para garantir que relacionamentos (como ferramentas e documentos) sejam válidos.
* **Gravação e Concorrência:**
  - **Isolamento de Escrita:** Lógicas independentes gravam nas tabelas das subcamadas sem nenhum conflito de concorrência física no banco.
* **Evolução:**
  - **Reuso Nativo (DRY):** Facilidade de fazer múltiplos agentes apontarem para o mesmo registro de configuração padrão (ex: associar 50 agentes à mesma linha na tabela `agent_security` contendo regras corporativas).

### Desvantagens (Contras)
* **Performance:**
  - **Sobrecarga de Queries (JOINs):** Para compilar o prompt de sistema em runtime, é necessário fazer JOIN de 8 tabelas, aumentando o consumo de recursos do banco e a latência de rede.
* **Simplicidade da Aplicação:**
  - **Versionamento Complexo:** Criar um histórico de versões exige coordenar transações e cópias históricas em 8 tabelas de forma sincronizada.
* **Evolução:**
  - **Rigidez Extrema:** Qualquer alteração trivial (como uma nova flag de comportamento) exige rodar migrações DDL e reescrever schemas do ORM em múltiplos arquivos.

### Quando a Opção B é a melhor escolha?
A Opção B (Tabelas Relacionais por Camada) torna-se a decisão arquitetural correta nos seguintes cenários:
1. **Reuso Massivo de Camadas com Herança:** Se o modelo de negócios exigir que múltiplos agentes (ex: 10.000 agentes) compartilhem exatamente a mesma configuração de segurança ou comportamento (ex: uma política global de compliance). Um único update na linha da tabela `agent_security` propaga-se instantaneamente para todos os agentes associados por chave estrangeira, sem redundância de dados ou necessidade de rodar updates em milhares de colunas JSONB.
2. **Dependência Crítica de Integridade Referencial (FKs Cascading):** Se a especificação referenciar recursos complexos do sistema (como bases de dados de clientes, credenciais restritas ou ferramentas integradas) que exigem controle transacional rígido do banco de dados (ex: impedir a exclusão de uma ferramenta se algum agente a estiver utilizando via `ON DELETE RESTRICT`).
3. **BI, Analytics e Relatórios Complexos:** Se a equipe de analistas ou auditoria precisar rodar queries de agregação analítica cruzando dezenas de filtros (ex: agrupar limites de mensagens por departamento), as ferramentas de BI convencionais (PowerBI, Tableau, Metabase) performam infinitamente melhor sobre dados normalizados e indexados do que extraindo chaves de documentos JSONB.
4. **Maturidade Extrema do Produto:** Quando a estrutura e os parâmetros da especificação cognitiva do agente estiverem consolidados e estáveis na empresa, tornando o benefício de flexibilidade do JSONB secundário em relação à segurança de tipo estrita fornecida pelo DDL relacional.

---

## Opção C: Colunas JSONB Individuais por Camada (`agents.identity`, `agents.behavior`...)

Neste modelo híbrido, a tabela principal de agentes contém colunas separadas do tipo JSONB para cada uma das 7 camadas cognitivas da especificação.

### Vantagens (Prós)
* **Gravação e Concorrência:**
  - **Redução de Conflitos de Escrita:** Reduz consideravelmente conflitos entre atualizações independentes de diferentes camadas (ex: atualizações na coluna `planning` não geram locks ou conflitos na coluna `identity` ou `security`).
* **Performance:**
  - **Leitura Direta Sem JOINs:** Recuperação completa do agregado em uma query `SELECT * FROM agents` sem JOINs.
  - **Probabilidade de Armazenamento Inline:** Fatiando a especificação em 7 colunas JSONB menores, aumenta a probabilidade de que cada documento permaneça armazenado inline na linha principal do PostgreSQL, reduzindo a necessidade de leituras secundárias na tabela TOAST (que ocorrem quando valores únicos ultrapassam ~2KB).
* **Evolução:**
  - **Flexibilidade Interna:** Novos atributos internos nas camadas são resolvidos em código, exigindo DDL apenas se criarmos uma camada cognitiva totalmente nova.
* **Simplicidade da Aplicação:**
  - **Modularidade de Validação:** A API pode receber e validar payloads parciais correspondentes a apenas uma camada usando schemas granulares do Pydantic/Zod.

### Desvantagens (Contras)
* **Evolução:**
  - **Rigidez Estrutural Moderada:** Exige DDL se adicionarmos ou removermos uma camada raiz (`ALTER TABLE agents ADD COLUMN memory JSONB`).
* **Consistência:**
  - **Duplicação de Dados:** Salvar as propriedades inline em colunas JSONB dificulta o compartilhamento.

### Possibilidade de Reuso Híbrido Futuro
Adotar a Opção C não impossibilita o reaproveitamento de componentes no futuro. Se decidirmos padronizar regras de segurança, podemos migrar para uma estrutura híbrida onde o agente armazena ou a especificação inline em `agents.security` ou um ponteiro para um template compartilhado em `agents.security_template_id`, preservando a flexibilidade e evitando a normalização precoce de todas as camadas.

---

## Comparativo Geral das Abordagens

| Característica / Custo | Opção A: JSONB Único | Opção B: Tabelas Separadas (1:1) | Opção C: Colunas JSONB por Camada |
| :--- | :--- | :--- | :--- |
| **Estrutura Física no Banco** | 1 Tabela / 1 Coluna JSONB. | 8 Tabelas relacionadas via FK. | 1 Tabela / 7 Colunas JSONB. |
| **Performance de Leitura (Runtime)** | **Excelente:** SELECT de 1 linha. | **Média:** JOIN de 8 tabelas. | **Excelente:** SELECT de 1 linha. |
| **UPDATE Parcial** | **Alto:** Reescreve o JSON de 7 camadas inteiro. | **Baixo:** Atualiza a tabela da camada. | **Baixo:** Atualiza a coluna da camada. |
| **Concorrência de Escrita** | **Risco Alto:** Race conditions entre módulos. | **Seguro:** Isolado por tabela. | **Seguro:** Isolado por coluna. |
| **Integridade Referencial (FKs)** | **Não:** Controlado na aplicação. | **Sim:** Banco de dados garante. | **Não:** Controlado na aplicação. |
| **Reuso / DRY de Camadas** | **Difícil:** Duplicação de JSONs. | **Excelente:** Relacionamentos N:1. | **Difícil:** Duplicação de JSONs (suporta híbrido). |
| **Evolução (Novos Campos)** | **Instantânea:** Sem DDL. | **Rígida:** Exige DDL para qualquer campo. | **Fácil:** Exige DDL apenas se criar nova camada. |
| **Versionamento / Snapshots** | **Simples:** Cópia simples do JSON. | **Complexo:** Cópia coordenada em 8 tabelas. | **Simples:** Cópia simples das colunas. |

---

## Por que não JSON Único (Opção A)?

Embora a Opção A pareça a mais simples à primeira vista, sob a ótica de banco de dados e persistência, ela apresenta problemas graves em produção quando comparada com a Opção C:
1. **Sobrecarga de Escrita e WAL (Write-Ahead Log):** Qualquer atualização em um campo pequeno (ex: alterar um booleano de segurança) exige reescrever o JSON completo no PostgreSQL. Isso gera um payload de escrita desnecessariamente grande que precisa ser gravado no disco físico e propagado no WAL (Write-Ahead Logging).
2. **Amplificação de MVCC:** O PostgreSQL utiliza controle de concorrência multiversão (MVCC). Um update cria uma cópia inteira do registro físico da linha. Gravar um JSONB único gigante faz com que o tamanho da linha física duplicada seja significativamente maior, acelerando a fragmentação do banco (bloat).
3. **Custo de Serialização:** A aplicação e o driver de banco precisam serializar e desserializar o documento inteiro de 7 camadas em toda escrita parcial, consumindo tempo de CPU desnecessário.

---

## Custo de Refatoração de Schema (Exemplo: Renomear um Campo)

Caso precise renomear um campo cognitivo (por exemplo, alterar `agent_goal` para `agent_objective` na camada de Identidade):

### 1. Se for uma Tabela Relacional (Opção B)
O PostgreSQL apenas altera o catálogo de metadados (`pg_attribute`) em uma operação de **custo O(1)** que executa em milissegundos, independentemente do volume de dados. A tabela física não é reescrita.

### 2. Se for Coluna JSONB (Opções A e C)
Não há suporte a RENAME nativo. O banco precisa executar um comando de custo de processamento **O(N)** que reescreve fisicamente todas as linhas:
```sql
UPDATE agents 
SET identity = (identity - 'agent_goal') || jsonb_build_object('agent_objective', identity->'agent_goal')
WHERE identity->'agent_goal' IS NOT NULL;
```
Esse comando gera alto I/O de disco, lock temporário da tabela e MVCC Bloat.

---

## Indexação em JSONB
Ao contrário do mito de que dados em JSONB não podem ser indexados de forma eficiente, o PostgreSQL oferece suporte completo a indexações estruturadas:
* **Índices GIN (Generalized Inverted Index):** Ideais para buscas por qualquer chave ou valor em campos JSONB complexos (ex: buscar agentes que possuam a ferramenta "GitLab API" dentro da lista de ferramentas na coluna `action`).
  ```sql
  CREATE INDEX idx_agents_action_gin ON agents USING gin (action);
  ```
* **Índices Funcionais / Expressivos:** Se um determinado atributo aninhado for muito utilizado em filtros (ex: filtrar agentes pelo estágio de planejamento `planning->>'default_agent_stage'`), podemos indexar diretamente essa expressão:
  ```sql
  CREATE INDEX idx_agents_planning_stage ON agents ((planning->>'default_agent_stage'));
  ```

---

## Validação de Dados: Mudança de Responsabilidade
Optar pelas colunas JSONB **não significa abrir mão de validação**. Ocorre uma mudança de responsabilidade: a validação estrutural rígida deixa de ser um encargo do banco de dados (através de restrições DDL) e passa a ser controlada de forma centralizada e robusta na **camada de aplicação** utilizando bibliotecas declarativas como **Pydantic** (Python) e **Zod** (TypeScript). Isso garante a integridade dos dados antes da escrita física no banco de dados.

---

## Decisão Arquitetural
A **Opção C (Colunas JSONB por Camada)** representa o melhor equilíbrio entre flexibilidade de evolução da especificação, simplicidade operacional, desempenho do runtime e custo de manutenção do sistema.
