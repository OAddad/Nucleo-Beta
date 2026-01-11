import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CardapioPublico from "./pages/CardapioPublico";
import { Toaster } from "./components/ui/sonner";
import { initApiConfig, getSettings } from "./config/api";
import "./App.css";

// Componente wrapper para o Cardápio com navegação
function CardapioWrapper({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <CardapioPublico onLoginClick={handleLoginClick} />
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [skipLogin, setSkipLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Inicializar configuração da API (detecta ambiente desktop/web)
      await initApiConfig();
      
      // Verificar modo sem login
      const settings = getSettings();
      if (settings.skipLogin) {
        setSkipLogin(true);
        setIsAuthenticated(true);
      } else {
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
          
          {/* Login */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/admin" replace />
              ) : (
                <Login setIsAuthenticated={setIsAuthenticated} />
              )
            }
          />
          
          {/* Dashboard Admin - Requer autenticação */}
          <Route
            path="/admin/*"
            element={
              isAuthenticated || skipLogin ? (
                <Dashboard setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          {/* Rota raiz - redireciona para cardápio público */}
          <Route
            path="/"
            element={<Navigate to="/cardapio" replace />}
          />
          
          {/* Rotas antigas do dashboard - redireciona para /admin */}
          <Route
            path="/*"
            element={
              isAuthenticated || skipLogin ? (
                <Navigate to="/admin" replace />
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
