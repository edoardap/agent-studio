import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TenantSelector } from './components/dashboard/TenantSelector';
import { PlannerChat } from './pages/PlannerChat';
import { Factory } from './pages/Factory';
import { AgentsList } from './pages/AgentsList';
import { ChatAgent } from './pages/ChatAgent';
import { Templates } from './pages/Templates';
import { Integrations } from './pages/Integrations';
import { Squads } from './pages/Squads';
import { Marketplace } from './pages/Marketplace';
import { Organograma } from './pages/Organograma';
import { SquadSimulator } from './pages/SquadSimulator';
import './App.css';

function MainAppContent() {
  const { activeView } = useApp();

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <PlannerChat isSidebarMode={false} />;
      case 'factory':
        return (
          <div className="planner-factory-split">
            <PlannerChat isSidebarMode={true} />
            <Factory />
          </div>
        );
      case 'agents':
        return <AgentsList />;
      case 'chat-agent':
        return <ChatAgent />;
      case 'templates':
        return <Templates />;
      case 'integrations':
        return <Integrations />;
      case 'squads':
        return <Squads />;
      case 'marketplace':
        return <Marketplace />;
      case 'organograma':
        return <Organograma />;
      case 'simulator':
        return <SquadSimulator />;
      default:
        return <Organograma />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-container">
        <TenantSelector />
        <div className="content-container">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

export default App;
