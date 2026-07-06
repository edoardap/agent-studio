# Implementação Técnica: Armazenamento da Spec de Agentes

Este documento detalha o impacto prático de cada abordagem de banco de dados (Coluna Única JSONB vs. Tabelas Separadas) em DDLs, payloads de API, transações e códigos de validação.

---

## Opção A: Coluna Única JSONB (`agents.spec`)

### 1. Schema do Banco de Dados (DDL)
Muito simples. Uma única tabela centralizadora.
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    spec JSONB NOT NULL, -- Contém as 7 camadas estruturadas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Contrato do Payload da API (POST /agents)
O JSON enviado pelo frontend é gravado diretamente sem mapeamento complexo:
```json
{
  "name": "Assistente Atena",
  "status": "active",
  "spec": {
    "identity": {
      "agent_name": "Atena",
      "agent_profile": "Especialista em documentação...",
      "agent_introduction": "Olá, sou a Atena...",
      "agent_goal": "Gerar docs..."
    },
    "behavior": {
      "max_chars": 1000,
      "language": "Português",
      "allowed_emojis": true,
      "behaviour_rules": "Seja objetiva..."
    },
    "security": {
      "security_rules": "Não exponha chaves...",
      "forbid_final_answer": false,
      "anti_prompt_injection": true,
      "jailbreak_response": "Bloqueado."
    },
    "context": {
      "company_name": "ACME Holding",
      "segment": "TI",
      "opening_hours": "24/7"
    },
    "planning": {
      "roteiro": "Triagem -> Resposta",
      "decision_rules": "..."
    },
    "action": {
      "tools": ["GitLab API"],
      "knowledge_bases": [{"id": "kb-eng", "name": "Engenharia"}]
    },
    "response": {
      "task": "Gerar markdown...",
      "output_rules": "Use títulos..."
    }
  }
}
```

### 3. CRUD e Transações no Backend (Node.js/ORM Exemplo)
Escrita direta e leitura instantânea em uma única query.
```typescript
// INSERT (POST)
await db.insert(agents).values({ name, status, spec });

// SELECT (GET - Usado pelo motor de execução no chat)
const agent = await db.select().from(agents).where(eq(agents.id, id)).first();
const prompt = compile(agent.spec); // Acesso imediato a todas as camadas
```

### 4. Exemplo de Validação de Schema com Pydantic (Python / FastAPI)
Para garantir a integridade dos dados antes da gravação no JSONB, podemos usar o **Pydantic** (V2) no backend para validar recursivamente os campos das 7 camadas:
```python
from typing import List, Optional
from pydantic import BaseModel, Field, conint, ValidationError

class IdentitySpec(BaseModel):
    agent_name: str = Field(..., min_length=2, max_length=100)
    agent_profile: str = Field(..., description="Perfil/Persona do agente")
    agent_introduction: str = Field(..., description="Saudação inicial")
    agent_goal: str = Field(..., description="Objetivo principal")

class BehaviorSpec(BaseModel):
    max_chars: int = Field(1000, ge=100, le=5000)
    max_questions_per_message: int = Field(1, ge=1, le=5)
    language: str = Field("Português")
    allowed_emojis: bool = Field(True)
    behaviour_rules: str = Field(...)

class SecuritySpec(BaseModel):
    security_rules: str = Field(...)
    forbid_final_answer: bool = Field(False)
    anti_prompt_injection: bool = Field(True)
    jailbreak_response: str = Field("Operação bloqueada.")

class ContextSpec(BaseModel):
    company_name: str = Field(...)
    segment: str = Field(...)
    opening_hours: str = Field("9h às 18h")
    user_general_defaults: Optional[str] = None
    crm_information: Optional[str] = None

class PlanningSpec(BaseModel):
    roteiro: str = Field(...)
    decision_rules: Optional[str] = None
    default_current_goal: str = Field(...)
    default_agent_stage: str = Field("triagem")
    default_next_action: str = Field("aguardar_mensagem")

class KnowledgeBaseRef(BaseModel):
    id: str
    name: str

class ActionSpec(BaseModel):
    action_general_infos: Optional[str] = None
    tools: List[str] = Field(default_factory=list)
    knowledge_bases: List[KnowledgeBaseRef] = Field(default_factory=list)

class ResponseSpec(BaseModel):
    task: str = Field(...)
    output_rules: str = Field(...)

class AgentSpec(BaseModel):
    identity: IdentitySpec
    behavior: BehaviorSpec
    security: SecuritySpec
    context: ContextSpec
    planning: PlanningSpec
    action: ActionSpec
    response: ResponseSpec

# Como validar no endpoint da API:
def create_agent(payload: dict):
    try:
        # Pydantic valida recursivamente todas as 7 camadas
        spec_validada = AgentSpec.model_validate(payload["spec"])
        # Gravação direta no banco (SQLAlchemy / SQLModel / Prisma)
        # db.execute("INSERT INTO agents (name, spec) VALUES (:name, :spec)", ...)
        return {"status": "success", "spec": spec_validada.model_dump()}
    except ValidationError as e:
        return {"status": "error", "detail": e.errors()}
```

---

## Opção B: Tabelas Separadas (Relacionamento 1:1)

### 1. Schema do Banco de Dados (DDL)
Exige a criação de 8 tabelas com chaves estrangeiras vinculadas à tabela de agentes.
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_identity (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    agent_name VARCHAR(255) NOT NULL,
    agent_profile TEXT NOT NULL,
    agent_introduction TEXT NOT NULL,
    agent_goal TEXT NOT NULL
);

CREATE TABLE agent_behavior (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    max_chars INT NOT NULL DEFAULT 1000,
    language VARCHAR(50) NOT NULL DEFAULT 'Português',
    allowed_emojis BOOLEAN NOT NULL DEFAULT true,
    behaviour_rules TEXT NOT NULL
);

CREATE TABLE agent_security (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    security_rules TEXT NOT NULL,
    forbid_final_answer BOOLEAN NOT NULL DEFAULT false,
    anti_prompt_injection BOOLEAN NOT NULL DEFAULT true,
    jailbreak_response TEXT NOT NULL
);

-- (Repete-se para agent_context, agent_planning, agent_action e agent_response)
```

### 2. Contrato do Payload da API (POST /agents)
O payload enviado pelo cliente pode manter o formato aninhado da Opção A, mas o backend precisará desmembrá-lo e orquestrar as inserções.

### 3. CRUD e Transações no Backend (Node.js/ORM Exemplo)
Exige controle transacional rigoroso de escrita em lote e queries de leitura pesadas.
```typescript
// INSERT (POST - Exige Transaction e 8 INSERTs sequenciais)
await db.transaction(async (tx) => {
  const [newAgent] = await tx.insert(agents).values({ name, status }).returning({ id: agents.id });
  
  await tx.insert(agentIdentity).values({ agent_id: newAgent.id, ...spec.identity });
  await tx.insert(agentBehavior).values({ agent_id: newAgent.id, ...spec.behavior });
  await tx.insert(agentSecurity).values({ agent_id: newAgent.id, ...spec.security });
  await tx.insert(agentContext).values({ agent_id: newAgent.id, ...spec.context });
  await tx.insert(agentPlanning).values({ agent_id: newAgent.id, ...spec.planning });
  await tx.insert(agentAction).values({ agent_id: newAgent.id, ...spec.action });
  await tx.insert(agentResponse).values({ agent_id: newAgent.id, ...spec.response });
});

// SELECT (GET - Exige JOIN de 8 tabelas para carregar o agente no motor)
const agentData = await db.select()
  .from(agents)
  .leftJoin(agentIdentity, eq(agents.id, agentIdentity.agent_id))
  .leftJoin(agentBehavior, eq(agents.id, agentBehavior.agent_id))
  .leftJoin(agentSecurity, eq(agents.id, agentSecurity.agent_id))
  .leftJoin(agentContext, eq(agents.id, agentContext.agent_id))
  .leftJoin(agentPlanning, eq(agents.id, agentPlanning.agent_id))
  .leftJoin(agentAction, eq(agents.id, agentAction.agent_id))
  .leftJoin(agentResponse, eq(agents.id, agentResponse.agent_id))
  .where(eq(agents.id, id))
  .first();
```

---

## Opção C: Colunas JSONB Individuais por Camada (`agents.identity`, `agents.behavior`...)

Esta opção foi escolhida como a decisão de design arquitetural final do projeto. A documentação técnica detalhada de implementação desta abordagem (utilizando **SQLAlchemy 2.0** e **Pydantic V2** no ecossistema Python) foi isolada no seguinte arquivo:

👉 **[Visualizar Guia de Implementação da Opção C (Python)](file:///home/eduarda/agent-factory-studio/docs/questoes-em-aberto/implementacao-opcao-c.md)**
