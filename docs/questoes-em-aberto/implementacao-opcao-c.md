# Implementação Técnica: Opção C (SQLAlchemy 2.0 + Pydantic V2)

Este guia detalha a implementação da **Opção C (Colunas JSONB por Camada)** no ecossistema Python, utilizando **Pydantic V2** para a modelagem/validação e **SQLAlchemy 2.0** (com tipagem estrita `Mapped`) para persistência no PostgreSQL.

---

## 1. Definição dos Schemas de Validação (Pydantic V2)

Mapeamos as 7 camadas da especificação cognitiva do agente em modelos isolados.

```python
from typing import List, Optional
from pydantic import BaseModel, Field

class IdentitySpec(BaseModel):
    agent_name: str = Field(..., min_length=2, max_length=100)
    agent_profile: str = Field(..., description="Perfil conceitual do agente")
    agent_introduction: str = Field(..., description="Frase de saudação inicial")
    agent_goal: str = Field(..., description="Objetivo principal")

class BehaviorSpec(BaseModel):
    max_chars: int = Field(1000, ge=100, le=5000)
    max_questions_per_message: int = Field(1, ge=1, le=5)
    language: str = Field("Português")
    allowed_emojis: bool = Field(True)
    behaviour_rules: str = Field(..., description="Regras de tom e estilo de escrita")

class SecuritySpec(BaseModel):
    security_rules: str = Field(...)
    forbid_final_answer: bool = Field(False)
    anti_prompt_injection: bool = Field(True)
    jailbreak_response: str = Field("Operação bloqueada pelas diretrizes de segurança.")

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

# Schema completo recebido no POST
class AgentCreatePayload(BaseModel):
    name: str
    status: str
    identity: IdentitySpec
    behavior: BehaviorSpec
    security: SecuritySpec
    context: ContextSpec
    planning: PlanningSpec
    action: ActionSpec
    response: ResponseSpec
```

---

## 2. TypeDecorator do SQLAlchemy (Serialização Automática)

Para evitar termos que converter manualmente modelos Pydantic em dicionários Python antes de cada gravação e vice-versa na leitura, criamos um **TypeDecorator** customizado do SQLAlchemy. 

Ele intercepta as operações e faz a conversão de forma transparente no nível do driver de banco.

```python
import json
from typing import Type, Any
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB

class PydanticJSONB(TypeDecorator):
    """
    Traduz automaticamente uma coluna PostgreSQL JSONB para um model Pydantic V2.
    """
    impl = JSONB
    cache_ok = True

    def __init__(self, pydantic_model: Type[BaseModel]):
        super().__init__()
        self.pydantic_model = pydantic_model

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        # Executado ao gravar no banco (Python -> DB)
        if value is None:
            return None
        if isinstance(value, self.pydantic_model):
            return value.model_dump()
        return value  # Se já for um dict

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        # Executado ao ler do banco (DB -> Python)
        if value is None:
            return None
        return self.pydantic_model.model_validate(value)
```

---

## 3. Modelo do Banco de Dados (SQLAlchemy Declarativo)

Definimos a entidade mapeando cada camada para uma coluna JSONB tipada com o nosso decorador.

```python
import uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    status: Mapped[str]

    # As colunas são serializadas de/para Pydantic automaticamente
    identity: Mapped[IdentitySpec] = mapped_column(PydanticJSONB(IdentitySpec), nullable=False)
    behavior: Mapped[BehaviorSpec] = mapped_column(PydanticJSONB(BehaviorSpec), nullable=False)
    security: Mapped[SecuritySpec] = mapped_column(PydanticJSONB(SecuritySpec), nullable=False)
    context: Mapped[ContextSpec] = mapped_column(PydanticJSONB(ContextSpec), nullable=False)
    planning: Mapped[PlanningSpec] = mapped_column(PydanticJSONB(PlanningSpec), nullable=False)
    action: Mapped[ActionSpec] = mapped_column(PydanticJSONB(ActionSpec), nullable=False)
    response: Mapped[ResponseSpec] = mapped_column(PydanticJSONB(ResponseSpec), nullable=False)
```

---

## 4. Operações CRUD no Backend

### A) Criar Agente (POST)
```python
from sqlalchemy.orm import Session

def create_new_agent(db: Session, payload: AgentCreatePayload) -> Agent:
    # Cria o objeto SQLAlchemy mapeando as instâncias Pydantic diretamente
    db_agent = Agent(
        name=payload.name,
        status=payload.status,
        identity=payload.identity,
        behavior=payload.behavior,
        security=payload.security,
        context=payload.context,
        planning=payload.planning,
        action=payload.action,
        response=payload.response
    )
    
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent
```

### B) Leitura no Runtime (GET - Motor do Chat)
```python
def get_agent_for_chat(db: Session, agent_id: uuid.UUID) -> Agent:
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    # As propriedades já são objetos Pydantic validados!
    # Exemplo de acesso direto:
    # print(agent.identity.agent_name)
    # print(agent.behavior.allowed_emojis)
    
    return agent
```

### C) Atualização Parcial de Camada (PATCH / UPDATE de Planejamento)
O motor de execução do chat atualiza apenas o estado de planejamento. Validamos e atualizamos exclusivamente aquela coluna:
```python
from pydantic import ValidationError

def update_agent_planning(db: Session, agent_id: uuid.UUID, raw_planning: dict):
    # 1. Carrega o registro do banco
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not db_agent:
        raise ValueError("Agente não encontrado")
        
    try:
        # 2. Valida apenas o JSON da camada correspondente
        planning_validated = PlanningSpec.model_validate(raw_planning)
        
        # 3. Atualiza estritamente aquela coluna
        db_agent.planning = planning_validated
        db.commit()
        
    except ValidationError as e:
        return {"status": "error", "detail": e.errors()}
        
    return {"status": "success"}
```
