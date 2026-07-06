# Relacionamento entre a Spec Cognitiva e o Template Master

Este documento detalha a discussão sobre o nível de obrigatoriedade dos campos da especificação (spec) de 7 camadas dos agentes em relação aos esqueletos de prompts fornecidos pelos Templates Master.

---

## O Dilema

Durante o acoplamento entre a **especificação do agente** (JSONB com 7 camadas cognitivas) e o **Template Master** (esqueleto do prompt do sistema com placeholders `{{camada.campo}}`), surge a seguinte questão: **Todos os campos da especificação devem ser obrigatórios no banco de dados e no validador (Zod/Pydantic), mesmo que o template em uso não utilize todos os tópicos?**

Duas abordagens arquiteturais principais são viáveis:

---

## Abordagem A: Especificação Estrita (Garantir todos os tópicos)

Neste modelo, o banco de dados e a camada de validação do backend (Pydantic/Zod) exigem que todas as 7 camadas e suas chaves internas estejam presentes no objeto JSON/JSONB no momento da criação ou atualização de qualquer agente, utilizando valores padrão/vazios (`""` ou `null`) quando não houver preenchimento.

### Vantagens (Prós)
- **Portabilidade de Templates (Independência):** Se o usuário alterar o template do agente no futuro (ex: migrar do esqueleto "Vendas" para "Suporte"), o novo template compilará sem quebras de placeholders ausentes, pois o agente carrega o payload completo das 7 camadas desde o início.
- **Robustez do Compilador:** O compilador de prompts executa de forma determinística e segura, sem risco de disparar exceções de chave inexistente (`KeyError` em Python ou `undefined` em JavaScript).
- **Consistência de Dados:** Facilita auditorias, indexações e relatórios estatísticos sobre o comportamento dos agentes, já que a estrutura física do documento é 100% previsível.

### Desvantagens (Contras)
- **Overhead no Banco:** Armazenamento de chaves redundantes preenchidas com valores nulos ou strings vazias.
- **Formulário Poluído:** Pode gerar a percepção de que o usuário precisa preencher dados irrelevantes para o caso de uso atual.

---

## Abordagem B: Especificação Flexível (Campos Opcionais)

Neste modelo, o validador define a maior parte dos campos da especificação como opcionais (`Optional[str] = None`). O JSON do agente no banco armazena apenas as chaves que foram efetivamente preenchidas pelo usuário ou copiloto.

### Vantagens (Prós)
- **Payloads Leves:** Banco de dados limpo e sem redundância de chaves vazias.
- **Criação Minimalista:** Permite criar agentes extremamente rápidos fornecendo apenas nome e objetivo (`identity.agent_name` e `identity.agent_goal`), sem precisar passar pelas outras 5 camadas.

### Desvantagens (Contras)
- **Quebras no Runtime (Silent Failures):** Se um template master avançado exigir `{{planning.roteiro}}` e a chave não existir no JSON do agente, o prompt compilado enviado para o modelo de IA pode conter lacunas vazias ou blocos incompletos, degradando o comportamento do agente.
- **Acoplamento com o Compilador:** O compilador de prompts precisa carregar uma lógica condicional densa para validar a existência física de cada chave antes de injetá-la.

---

## Recomendação de Design (Modelo Híbrido com Defaulting)

Para unir a **consistência** da Abordagem A com a **flexibilidade** da Abordagem B, adota-se a seguinte estratégia integrada:

### 1. Validador com Inicialização de Padrões (Defaulting)
O schema do Pydantic/Zod define as propriedades como opcionais na entrada do cliente, mas **garante valores padrão vazios** na hora de instanciar/salvar no banco de dados.
```python
# Exemplo Pydantic
class SecuritySpec(BaseModel):
    security_rules: str = Field(default="") # Vira "" no banco, nunca None
    anti_prompt_injection: bool = Field(default=True)
```

### 2. Inteligência de Compilação (Limpeza de Markdown)
O compilador de prompt não deve apenas substituir placeholders de texto, mas sim **limpar seções inteiras** cujo conteúdo resolvido seja vazio.
```typescript
// Exemplo no compilador do Studio:
const compileBehaviorSection = (spec: AgentSpec) => {
  if (!spec.behavior.behaviour_rules) return ""; // Ignora a seção
  return `## Diretrizes de Comportamento\n${spec.behavior.behaviour_rules}\n`;
};
```

### 3. Pré-preenchimento via Catálogo (Template `specDefaults`)
A escolha inicial de um template (como "Agente de Suporte") injeta valores padrão diretamente na interface (ex: horários, regras de segurança mínimas). Isso impede que o agente nasça vazio e ensina o usuário a utilizar as 7 camadas de forma orgânica.
