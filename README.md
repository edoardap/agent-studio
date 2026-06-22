# AGENTS STUDIO - Fábrica de Agentes (Frontend)

Este projeto é um protótipo em React + TypeScript + Vite que simula o fluxo completo de criação de agentes cognitivos em 7 camadas (Identity, Behavior, Security, Context, Planning, Action e Response), permitindo configurar integrações e interagir diretamente com os agentes criados.

---

## 🛠️ Requisitos Técnicos

*   **Node.js**: Compatível com versões modernas (Node 18+ ou 20+).
    *   *Nota*: O Node padrão do sistema atual é o `v14.15.0`. Para rodar o Vite com sucesso, é **necessário** alternar para o Node v20+ já pré-instalado em sua máquina.

---

## 🚀 Como Executar o Projeto

Antes de rodar os comandos, garanta que está na pasta `app_build/`.

### 1. Ativar a versão correta do Node (NVM)
Execute o comando a seguir no seu terminal para apontar para a versão `v20.20.2` instalada no seu ambiente:

```bash
nvm use 20.20.2
```
*Caso o comando `nvm` não esteja carregado na sua sessão de terminal, você pode exportar o caminho do binário do Node 20 diretamente:*
```bash
export PATH=/home/eduarda/.nvm/versions/node/v20.20.2/bin:$PATH
```

### 2. Instalar as Dependências (já realizado)
```bash
npm install
```

### 3. Rodar o Servidor de Desenvolvimento
Inicie o servidor de desenvolvimento para visualizar a aplicação localmente:
```bash
npm run dev
```
O console exibirá o endereço local, geralmente: **`http://localhost:5173/`**

### 4. Gerar o Build de Produção
Para verificar erros de tipos TypeScript e compilar os assets para produção na pasta `dist/`:
```bash
npm run build
```

---

## 📁 Estrutura de Diretórios Criada

```
src/
├── components/          # Componentes visuais reutilizáveis
│   ├── chat/            # ChatBubble, ChatInput (UI do chat de mensagens)
│   ├── dashboard/       # AgentCard, StepProgress (Visualizadores de spec)
│   └── integrations/    # IntegrationModal (Modais de canais)
├── context/             # AppContext (Provedor do estado global e Copiloto)
├── pages/               # Páginas principais (Home, Fábrica, Lista de Agentes, Chat direto)
├── styles/              # Variáveis CSS de tema e estilos globais
├── types/               # Definições das tipagens de spec e agentes
└── App.tsx              # Roteador básico das telas
```
