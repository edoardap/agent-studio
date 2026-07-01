# Trade-offs de Armazenamento de Tools

Este documento detalha a discussão sobre as decisões de design de banco de dados para o armazenamento e associação de tools (ferramentas/integrações) nos agentes.

## Contexto
Durante o desenho do sistema de agentes, surgiu a questão: **Quais são os trade-offs de armazenar as tools diretamente em um campo na tabela de agentes versus ter uma tabela dedicada para isso?**

---

## Opção A: Campo JSON na Tabela de Agentes (`agents.tools`)
Neste modelo, as definições e as configurações de execução das tools são salvas em formato estruturado (geralmente um array JSON/JSONB) direto no registro do agente.

### Vantagens (Prós)
- **Simplicidade de Schema:** Elimina a necessidade de tabelas de junção muitos-para-muitos (`N:M`) e relacionamentos complexos no banco de dados.
- **Portabilidade do Agente:** A configuração do agente fica 100% autocontida. Exportar ou clonar um agente vira uma cópia simples de uma linha da tabela, contendo as definições completas de suas ferramentas.
- **Flexibilidade para Tools Dinâmicas (Customizadas):** Caso o usuário queira escrever um script rápido (ex: Javascript ou Python inline) específico para apenas um agente, esse código e seu schema de parâmetros são gravados diretamente no JSON do agente sem poluir tabelas globais.

### Desvantagens (Contras)
- **Insegurança com Credenciais:** Tools frequentemente exigem autenticação (tokens, chaves de API, OAuth). Guardar credenciais ativas em um blob de texto/JSON dificulta a rotação de chaves e o isolamento de segurança.
- **Inconsistência em Alterações de Definição:** Se múltiplas instâncias de agentes usarem a mesma ferramenta do sistema (ex: "Busca Web") e o schema de parâmetros ou a descrição para o LLM precisar de ajustes, é necessário varrer e atualizar os JSONs de todos os agentes afetados.
- **Dificuldade de Auditoria:** Rastrear quais agentes têm acesso ou estão usando uma determinada integração exige buscas de campos dentro de arrays JSON, o que reduz a performance e dificulta a indexação clássica.

---

## Opção B: Tabela Separada (`tools` + Tabela de Junção `agent_tools`)
Neste modelo, existe uma tabela contendo o catálogo de tools disponíveis, e uma tabela intermediária que associa os agentes às ferramentas.

### Vantagens (Prós)
- **Catálogo Centralizado e Padronizado:** A definição da tool (descrição, esqueleto do schema de parâmetros) existe em um único lugar. Melhorias na descrição da ferramenta para ajudar a tomada de decisão do LLM propagam-se instantaneamente para todos os agentes.
- **Gestão Segura de Credenciais:** As credenciais podem ser desacopladas da definição da tool e salvas de forma segura em tabelas dedicadas a conexões/autenticações (criptografadas e controladas de forma centralizada).
- **Auditoria de Relacionamentos Simples:** Saber exatamente quais agentes usam quais ferramentas torna-se uma consulta `JOIN` simples e de alta performance.

### Desvantagens (Contras)
- **Complexidade de Configuração de Instância:** Duas instâncias de agentes podem usar a mesma tool (ex: "Banco de Dados SQL"), mas necessitar de conexões ou parâmetros de configuração diferentes (ex: strings de conexão distintas). Isso obriga a estruturar a tabela intermediária de forma complexa (guardando dados específicos de instância no relacionamento).
- **Sobrecarga de Cadastro para Tools Únicas:** Se um usuário criar um script customizado rápido que serve apenas para o agente dele, salvá-lo no catálogo de tools exige controle extra de visibilidade/escopo (`is_global`, `owner_id`) para evitar poluição do catálogo de outros usuários.

---

## Recomendação de Design (Abordagem Híbrida / Schema Intermediário com JSONB)
Para equilibrar portabilidade, segurança e reaproveitamento, a arquitetura recomendada consiste em:

1. **Tabela de Tools Globais (`tools`):** Catálogo de integrações nativas oferecidas pelo sistema (ex: Web Search, Slack, e-mail).
2. **Tabela de Conexões/Credenciais (`credentials`):** Armazena tokens OAuth ou chaves de API vinculados a um usuário/tenant, e não à definição do agente ou da tool.
3. **Tabela Intermediária com Configuração (`agent_tools`):**
   A associação contém um campo estruturado (`config` em formato JSONB) para parametrizar o uso daquela tool para aquele agente específico.
   
   ```sql
   CREATE TABLE agent_tools (
       agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
       tool_id UUID REFERENCES tools(id),
       config JSONB, -- Parâmetros locais do agente (ex: { "channel_id": "C12345" })
       PRIMARY KEY (agent_id, tool_id)
   );
   ```
4. **Custom Tools (Scripts Inline):** Podem viver em uma tabela `custom_tools` ou, se forem extremamente acopladas, persistidas diretamente no campo JSONB do próprio agente sob demanda.
