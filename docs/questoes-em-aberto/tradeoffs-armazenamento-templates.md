# Trade-offs de Armazenamento de Templates Master

Este documento detalha a discussão sobre as decisões de design de banco de dados para o armazenamento de templates de prompt master dos agentes.

## Contexto
Durante a modelagem da arquitetura do banco de dados para a Fábrica de Agentes, surgiu a questão: **Quais os trade-offs de armazenar o template master diretamente em um campo na tabela de agentes versus ter uma tabela específica (relacionada) para isso?**

---

## Opção A: Campo na Tabela de Agentes (`agents.master_template`)
Neste modelo, o esqueleto/template do prompt master é salvo diretamente como um campo de texto ou JSON em cada registro da tabela de agentes.

### Vantagens (Prós)
- **Simplicidade de Schema:** Sem tabelas adicionais ou relacionamentos complexos.
- **Isolamento de Alterações:** Se o template de um agente for modificado pelo usuário, a alteração afeta apenas ele. Não há risco de quebrar outros agentes por acidente.
- **Performance de Leitura Rápida:** Um único `SELECT * FROM agents` retorna o agente com seu template completo em uma única operação.
- **Facilidade para Customização Inline:** Permite que o usuário faça pequenos ajustes manuais no template base para o seu agente sem precisar criar um novo template global.

### Desvantagens (Contras)
- **Duplicação de Dados (Redundância):** Se múltiplos agentes utilizarem o mesmo template de prompt (ex: "Suporte"), o texto completo estará replicado em várias linhas do banco.
- **Dificuldade de Atualização em Massa:** Se um bug for descoberto no prompt master, corrigi-lo exigirá um script de `UPDATE` em lote em toda a tabela de agentes, aumentando a chance de inconsistências.
- **Falta de Histórico/Versionamento do Template:** É difícil rastrear alterações globais do template ou saber quais agentes estão utilizando uma versão desatualizada de um prompt.

---

## Opção B: Tabela Específica de Templates (`templates` ou `master_templates`)
Neste modelo, os templates master ficam em uma tabela dedicada e a tabela de agentes referencia o ID do template via chave estrangeira.

### Vantagens (Prós)
- **Normalização (DRY):** O template é armazenado em um único lugar, eliminando redundâncias.
- **Atualização Centralizada:** Melhorias no prompt master propagam-se instantaneamente para todos os agentes que o utilizam.
- **Versionamento e Governança:** Facilita a manutenção de versões do template (ex: `v1.0`, `v2.0`) e rastreabilidade de quais agentes usam qual versão.
- **Catálogo/Marketplace:** Torna muito simples a criação de uma biblioteca/galeria de templates padrão para o usuário escolher no momento da criação do agente.

### Desvantagens (Contras)
- **Efeito Cascata Indesejado:** Atualizar um template master diretamente na tabela pode alterar de forma imprevista o comportamento de agentes de produção ativos de outros usuários.
- **Maior Complexidade de Queries:** Exige a utilização de `JOINs` para recuperar o prompt final do agente.
- **Rigidez para Customizações Locais:** Se um agente precisar de uma pequena variação do prompt, o banco não permite fazê-lo diretamente sem criar um novo registro na tabela de templates ou adicionar lógica de override.

---

## Recomendação de Design (Abordagem Híbrida / Copy-on-Write)
Para plataformas de agentes de IA, a abordagem recomendada costuma ser **híbrida**:

1. Mantém-se uma tabela de `master_templates` para servir como **catálogo/biblioteca** de templates padrão.
2. Quando o usuário cria um agente baseado em um template master, o sistema **copia o conteúdo** do template master para uma coluna de prompt local na tabela de `agents` (instanciação / copy-on-write).
3. O agente mantém uma referência (`master_template_id`) apenas para fins de auditoria e telemetria, mas executa e edita sua própria cópia local do template. Isso preserva o isolamento de cada agente e permite a personalização completa sem perder os benefícios de um catálogo centralizado.

---

## Simplicidade vs. Avançado (Exposição Progressiva)

Para equilibrar a facilidade de uso do usuário iniciante com o controle necessário para desenvolvedores avançados, adota-se a seguinte estratégia na interface:

- **Modo Simples:** O conceito de "Template Master" é ocultado do fluxo. O sistema assume um **template master padrão fixo** (único) nos bastidores. O usuário foca apenas no preenchimento de suas necessidades via linguagem natural no copiloto ou formulários.
- **Modo Avançado:** Habilita-se a seleção do catálogo de templates master disponíveis no banco de dados e abre-se a possibilidade de criar e customizar novos templates master globais (ou desmembrar um agente em múltiplos templates independentes/compostos).
