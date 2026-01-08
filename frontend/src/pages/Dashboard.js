import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Package, ShoppingCart, FileText, BarChart3, LogOut, Shield, Settings, Menu, X, ChevronDown, ChevronRight, Home, DollarSign, ClipboardList, Truck, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import DarkModeToggle from "../components/DarkModeToggle";
import Overview from "./Overview";
import Ingredients from "./Ingredients";
import Purchases from "./Purchases";
import Products from "./Products";
import Reports from "./Reports";
import Moderation from "./Moderation";

export default function Dashboard({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTopMenu, setActiveTopMenu] = useState("mesas");
  const [stockControlExpanded, setStockControlExpanded] = useState(true); // Controla expansão do Controle de Estoque
  const [salesExpanded, setSalesExpanded] = useState(true); // Controla expansão de Vendas

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
    if (window.innerWidth < 1024) { // Fecha apenas em mobile
      setSidebarOpen(false);
    }
  };

  // Estrutura de navegação principal
  const mainTabs = [
    { path: "/", label: "Visão Geral", icon: Home, type: "single" },
  ];

  // Adicionar Moderação apenas para proprietários e administradores
  if (currentUser?.role === "proprietario" || currentUser?.role === "administrador") {
    mainTabs.push({ path: "/moderacao", label: "Moderação", icon: Shield, type: "single" });
  }
  
  // Adicionar Configuração (disponível para todos)
  mainTabs.push({ path: "/configuracao", label: "Configuração", icon: Settings, type: "single" });


  // Estrutura hierárquica de Controle de Estoque
  const stockControlModule = {
    label: "Controle de Estoque",
    icon: BarChart3,
    expanded: stockControlExpanded,
    toggle: () => setStockControlExpanded(!stockControlExpanded),
    children: [
      { path: "/produtos", label: "Produtos", icon: FileText },
      { path: "/estoque", label: "Estoque", icon: Package },
      { path: "/compras", label: "Compras", icon: ShoppingCart },
    ]
  };


  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isStockControlActive = () => {
    return ["/produtos", "/estoque", "/compras"].some(path => location.pathname.startsWith(path));
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Sempre relativo, empurra o conteúdo */}
      <aside className={`
        bg-sidebar text-sidebar-foreground flex-col border-r
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'}
        ${sidebarOpen ? 'flex' : 'hidden lg:flex'}
      `}>
        {/* Conteúdo do Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden lg:block'} w-64 lg:w-full`}>
          <div className="p-6 border-b flex items-center justify-between">
            <button 
              onClick={() => navigate("/")}
              className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${sidebarOpen ? '' : 'lg:justify-center lg:w-full'}`}
            >
              <div className="bg-primary p-2 rounded-lg flex-shrink-0">
                <ChefHat className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
              </div>
              {sidebarOpen && (
                <div className="text-left">
                  <h1 className="text-sidebar-foreground font-bold text-lg tracking-tight">Núcleo</h1>
                  <p className="text-xs text-muted-foreground">o centro da sua gestão</p>
                </div>
              )}
            </button>
          </div>

        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {/* Tabs Principais */}
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground font-medium shadow-lg"
                    : "text-sidebar-foreground hover:bg-muted"
                } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
                title={!sidebarOpen ? tab.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                {sidebarOpen && <span className="text-sm">{tab.label}</span>}
              </button>
            );
          })}

          {/* Controle de Estoque (Hierárquico) */}
          <div>
            {/* Header do módulo */}
            <button
              onClick={() => setStockControlExpanded(!stockControlExpanded)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isStockControlActive()
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? stockControlModule.label : ''}
            >
              <BarChart3 className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{stockControlModule.label}</span>
                  {stockControlExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {/* Sub-itens */}
            {sidebarOpen && stockControlExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {stockControlModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path);
                  return (
                    <button
                      key={child.path}
                      onClick={() => navigate(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted"
                      }`}
                    >
                      <ChildIcon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                      <span>{child.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t space-y-2">
          {sidebarOpen && (
            <div className="flex justify-center pb-2">
              <DarkModeToggle />
            </div>
          )}
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className={`w-full hover:bg-muted ${sidebarOpen ? 'justify-start' : 'lg:justify-center lg:px-2'}`}
            title={!sidebarOpen ? 'Sair' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
            {sidebarOpen && <span className="ml-3">Sair</span>}
          </Button>
        </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header com Botão Hamburguer e Mini Menu */}
        <header className="bg-card border-b p-4 flex items-center gap-4">
          {/* Botão Hamburguer */}
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="icon"
            variant="ghost"
            className="flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mini Menu */}
          <div className="flex gap-2 overflow-x-auto">
            {['Mesas', 'Balcão', 'Delivery', 'ChatBot'].map((item) => (
              <button
                key={item}
                onClick={() => setActiveTopMenu(item.toLowerCase())}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap
                  transition-all duration-200
                  ${activeTopMenu === item.toLowerCase()
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80'
                  }
                `}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <DarkModeToggle />
          </div>
        </header>

        {/* Conteúdo das Rotas */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Reports />} />
            <Route path="/ingredientes" element={<Ingredients />} />
            <Route path="/estoque" element={<Ingredients />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/moderacao" element={<Moderation />} />
            <Route path="/configuracao" element={<div className="p-8"><h1 className="text-3xl font-bold">Configuração</h1><p className="text-muted-foreground mt-2">Em breve...</p></div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}