import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TenantSelector } from './components/dashboard/TenantSelector';
import { Home } from './pages/Home';
import { Factory } from './pages/Factory';
import { AgentsList } from './pages/AgentsList';
import { ChatAgent } from './pages/ChatAgent';
import { Templates } from './pages/Templates';
import './App.css';

function MainAppContent() {
  const { activeView } = useApp();

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <Home />;
      case 'factory':
        return <Factory />;
      case 'agents':
        return <AgentsList />;
      case 'chat-agent':
        return <ChatAgent />;
      case 'templates':
        return <Templates />;
      default:
        return <Home />;
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
