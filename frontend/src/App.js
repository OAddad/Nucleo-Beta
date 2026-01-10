import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "./components/ui/sonner";
import { initApiConfig, getSettings } from "./config/api";
import "./App.css";

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
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login setIsAuthenticated={setIsAuthenticated} />
              )
            }
          />
          <Route
            path="/*"
            element={
              isAuthenticated || skipLogin ? (
                <Dashboard setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/login" replace />
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