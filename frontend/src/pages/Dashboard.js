import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Package, ShoppingCart, FileText, BarChart3, LogOut, Shield, Settings, Menu, X } from "lucide-react";
import { Button } from "../components/ui/button";
import DarkModeToggle from "../components/DarkModeToggle";
import Ingredients from "./Ingredients";
import Purchases from "./Purchases";
import Products from "./Products";
import Reports from "./Reports";
import Moderation from "./Moderation";

export default function Dashboard({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Estado para sidebar (desktop e mobile)
  const [activeTopMenu, setActiveTopMenu] = useState("mesas"); // Estado para mini menu do topo

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    toast.success("Logout realizado!");
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false); // Fecha o menu mobile ao navegar
  };

  const tabs = [
    { path: "/", label: "Relatórios", icon: BarChart3 },
    { path: "/ingredientes", label: "Ingredientes", icon: Package },
    { path: "/compras", label: "Compras", icon: ShoppingCart },
    { path: "/produtos", label: "Produtos", icon: FileText },
  ];

  // Adicionar Moderação apenas para proprietários e administradores
  if (currentUser?.role === "proprietario" || currentUser?.role === "administrador") {
    tabs.push({ path: "/moderacao", label: "Moderação", icon: Shield });
  }
  
  // Adicionar Configuração (disponível para todos)
  tabs.push({ path: "/configuracao", label: "Configuração", icon: Settings });

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Menu Desktop */}
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col border-r">
        <div className="p-6 border-b">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary p-2 rounded-lg">
              <ChefHat className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <h1 className="text-sidebar-foreground font-bold text-lg tracking-tight">Núcleo</h1>
              <p className="text-xs text-muted-foreground">o centro da sua gestão</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                data-testid={`nav-${tab.label.toLowerCase()}`}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground font-medium shadow-lg"
                    : "text-sidebar-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <div className="flex justify-center pb-2">
            <DarkModeToggle />
          </div>
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start hover:bg-muted"
          >
            <LogOut className="w-5 h-5 mr-3" strokeWidth={1.5} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Menu Mobile com Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Overlay escuro */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Lateral */}
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r z-50 md:hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <button 
                onClick={() => handleNavigate("/")}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="bg-primary p-2 rounded-lg">
                  <ChefHat className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <h1 className="text-sidebar-foreground font-bold text-lg tracking-tight">Núcleo</h1>
                  <p className="text-xs text-muted-foreground">o centro da sua gestão</p>
                </div>
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab.path);
                return (
                  <button
                    key={tab.path}
                    onClick={() => handleNavigate(tab.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active
                        ? "bg-primary text-primary-foreground font-medium shadow-lg"
                        : "text-sidebar-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t space-y-2">
              <div className="flex justify-center pb-2">
                <DarkModeToggle />
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full shadow-sm"
              >
                <LogOut className="w-5 h-5 mr-3" strokeWidth={1.5} />
                Sair
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Botão Hamburger Mobile */}
      <div className="md:hidden fixed top-4 left-4 z-30">
        <Button
          onClick={() => setMobileMenuOpen(true)}
          size="icon"
          variant="outline"
          className="shadow-lg bg-background"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Reports />} />
          <Route path="/ingredientes" element={<Ingredients />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/moderacao" element={<Moderation />} />
          <Route path="/configuracao" element={<div className="p-8"><h1 className="text-3xl font-bold">Configuração</h1><p className="text-muted-foreground mt-2">Em breve...</p></div>} />
        </Routes>
      </main>
    </div>
  );
}