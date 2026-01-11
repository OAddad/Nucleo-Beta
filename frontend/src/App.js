import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CardapioPublico from "./pages/CardapioPublico";
import { Toaster } from "./components/ui/sonner";
import { initApiConfig, getSettings } from "./config/api";
import "./App.css";

// Componente wrapper para o Cardápio com navegação
function CardapioWrapper({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleAdminLogin = (userData) => {
    setIsAuthenticated(true);
    // Redirecionar para o dashboard admin
    navigate("/admin/");
  };

  return (
    <CardapioPublico onAdminLogin={handleAdminLogin} />
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Verificar token no estado inicial
    return !!localStorage.getItem("token");
  });
  const [skipLogin, setSkipLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Inicializar configuração da API
      await initApiConfig();
      
      // Verificar modo sem login
      const settings = getSettings();
      if (settings.skipLogin) {
        setSkipLogin(true);
        setIsAuthenticated(true);
      } else {
        // Verificar se há token de admin
        const token = localStorage.getItem("token");
        setIsAuthenticated(!!token);
      }
      
      setLoading(false);
    };
    
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando Núcleo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <HashRouter>
        <Routes>
          {/* Cardápio Público - Tela Inicial */}
          <Route
            path="/cardapio"
            element={<CardapioWrapper setIsAuthenticated={setIsAuthenticated} />}
          />
          
          {/* Dashboard Admin - Requer autenticação */}
          <Route
            path="/admin/*"
            element={
              isAuthenticated || skipLogin ? (
                <Dashboard setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/cardapio" replace />
              )
            }
          />
          
          {/* Rota raiz - redireciona para cardápio público */}
          <Route
            path="/"
            element={<Navigate to="/cardapio" replace />}
          />
          
          {/* Qualquer outra rota */}
          <Route
            path="/*"
            element={
              isAuthenticated || skipLogin ? (
                <Navigate to="/admin/" replace />
              ) : (
                <Navigate to="/cardapio" replace />
              )
            }
          />
        </Routes>
      </HashRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
