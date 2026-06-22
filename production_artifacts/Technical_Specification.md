# Technical Specification: Agent Factory Frontend

## Executive Summary
This document specifies the technical design for the **Agent Factory Studio** frontend. The frontend is a React + TypeScript application that lets users interact with a **Creator Agent** to construct custom AI agents. Once created, users can view their list of agents, chat with them directly, and configure their integrations/distribution channels.
The design adopts a premium, modern multi-column layout with a refined light lilac, white, and deep indigo color scheme, micro-animations, and glassmorphism details, directly inspired by the user's style preference.

---

## Requirements

### Functional Requirements
1. **Sidebar Navigation**:
   - Navigation between different spaces: "Início" (Dashboard/Home), "Fábrica de Agentes" (Creator Agent Chat), "Agentes Criados" (List of agents), and "Configurações".
   - Tenant selector at the top (e.g. ACME Holding, etc.) as depicted in the reference design.
   - User profile indicator at the bottom.
2. **Fábrica de Agentes (Creator Agent Chat)**:
   - Three-column layout:
     - Left column: Main Navigation.
     - Middle column: Chat history with the Creator Agent, quick templates, and spec drafting status.
     - Right/Main panel: Chat interface with the Creator Agent.
   - As the user chats with the Creator Agent, a "Specification Outline" card updates dynamically to show what properties have been defined (e.g., Name, Model, Persona, Skills, Integrations).
   - Once all specs are complete, a "Build Agent" action is unlocked, creating the agent and transitioning to the Agent dashboard.
3. **Agentes Criados (Created Agents Dashboard)**:
   - Grid and list view of all created agents.
   - Filter by status, model (Gemini 3.5 Flash, Gemini 3.5 Pro), and tags.
   - Quick actions per agent:
     - **Conversar (Chat)**: Opens a dedicated chat view with that specific agent.
     - **Disponibilizar (Deploy/Integrate)**: Opens a modal with toggle integrations (Web Widget, Discord, Telegram, Slack, WhatsApp) and API key generation.
4. **Chat Interface with Created Agent**:
   - High-fidelity chat bubble UI mirroring the provided screenshot.
   - AI response cards showing confidence rates, sources/references, and a collapsible "Como cheguei aqui" (thinking process) accordion.
   - Chat input supporting attachment mockups and filters.

### Non-Functional Requirements
- **Scalability**: Clean separation of concerns with structured directories.
- **Responsiveness**: Fluid layout responsive to desktop and tablet viewports.
- **Aesthetics**: Premium color scheme, custom typography (Inter / Outfit), soft borders, light lilac backgrounds (`#F3F4FB` / `#E8EAF6`), deep indigo/violet accents (`#3B44B1`), and smooth transitions.

---

## Architecture & Tech Stack

- **Core**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS with CSS Variables for consistent design tokens (Colors, Typography, Spacing, Shadows).
- **Icons**: Lucide React for outline-based premium icons.
- **State Management**: React Context API for global application state (Tenant context, Agent list, active chats).

---

## Scalable Directory Structure
To support long-term growth and clean division of responsibilities, we will use the following structure under `app_build/`:

```
app_build/
├── public/
├── src/
│   ├── assets/             # Images, static vectors
│   ├── components/         # Reusable presentation components
│   │   ├── common/         # Button, Input, Modal, Sidebar, Card
│   │   ├── chat/           # ChatBubble, ChatInput, ChatArea
│   │   ├── dashboard/      # AgentCard, AgentGrid, TenantSelector
│   │   └── integrations/   # IntegrationCard, IntegrationModal
│   ├── context/            # React contexts for state sharing (AgentContext, TenantContext)
│   ├── hooks/              # Custom React hooks (useAgent, useChat)
│   ├── layouts/            # MainLayout structure
│   ├── pages/              # Page components representing views
│   │   ├── Home.tsx        # Dashboard / Início
│   │   ├── Factory.tsx     # Creator Agent Chat (Fábrica)
│   │   └── AgentsList.tsx  # Grid/List of Created Agents
│   ├── services/           # API clients/mock service layers
│   │   ├── agentService.ts
│   │   └── chatService.ts
│   ├── styles/             # Global styles and variables
│   │   ├── variables.css
│   │   └── global.css
│   ├── types/              # TypeScript interface & type definitions
│   │   └── index.ts
│   ├── App.tsx             # Main router and shell
│   ├── main.tsx            # Entrypoint
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Design System & Styling Tokens
We will define styling variables in `src/styles/variables.css`:

```css
:root {
  --primary-color: #3b44b1;
  --primary-hover: #2d3494;
  --bg-sidebar: #eef1f9;
  --bg-sub-sidebar: #ffffff;
  --bg-main: #ffffff;
  --bg-app: #f5f7fc;
  --text-main: #1a1e36;
  --text-muted: #5e668c;
  --border-color: #e2e5f1;
  --success-color: #10b981;
  --accent-light: #eff1ff;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

---

## Data Models (TypeScript Types)

```typescript
export interface Tenant {
  id: string;
  name: string;
}

export interface AgentSpec {
  identity: {
    agent_name: string;
    agent_profile: string;
    agent_introduction: string;
    agent_goal: string;
  };
  behavior: {
    max_chars: number;
    max_questions_per_message: number;
    language: string;
    allowed_emojis: boolean;
    behaviour_rules: string;
  };
  security: {
    security_rules: string;
    forbid_final_answer: boolean;
    anti_prompt_injection: boolean;
    jailbreak_response: string;
  };
  context: {
    company_name: string;
    segment: string;
    opening_hours: string;
    user_general_defaults: string;
    crm_information: string;
  };
  planning: {
    roteiro: string;
    decision_rules: string;
    default_current_goal: string;
    default_agent_stage: string;
    default_next_action: string;
  };
  action: {
    action_general_infos: string;
    tools: string[];
  };
  response: {
    task: string;
    output_rules: string;
  };
}

export interface Agent {
  id: string;
  spec: AgentSpec;
  status: 'active' | 'draft' | 'building';
  createdAt: string;
  integrations: {
    discord: boolean;
    telegram: boolean;
    slack: boolean;
    whatsapp: boolean;
    webWidget: boolean;
  };
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'creator';
  content: string;
  timestamp: string;
  confidence?: number;
  sources?: string[];
  reasoning?: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}
```

---

## Verification Plan
1. **Linter & Compiler Checks**:
   - `npm run lint` or `tsc --noEmit` to verify type safety.
2. **Visual Verification**:
   - Run the development server and verify rendering of sidebar, multi-column layouts, chat bubbles, buttons, and responsive breakpoints.
