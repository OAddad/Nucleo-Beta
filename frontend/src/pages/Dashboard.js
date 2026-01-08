import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Package, ShoppingCart, FileText, BarChart3, LogOut, Shield, Settings, Menu, X, ChevronDown, ChevronRight, Home, DollarSign, ClipboardList, Truck, Users, UtensilsCrossed, UserRound, Bike, MessageCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import DarkModeToggle from "../components/DarkModeToggle";
import Overview from "./Overview";
import Ingredients from "./Ingredients";
import Purchases from "./Purchases";
import Products from "./Products";
import Reports from "./Reports";
import Moderation from "./Moderation";

// Ícone do WhatsApp customizado
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function Dashboard({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTopMenu, setActiveTopMenu] = useState(null); // null = nenhuma aba superior ativa
  const [stockControlExpanded, setStockControlExpanded] = useState(true);
  const [salesExpanded, setSalesExpanded] = useState(true);

  // Configuração das abas superiores com ícones
  const topMenuItems = [
    { id: 'mesas', label: 'Mesas', icon: UtensilsCrossed },
    { id: 'balcao', label: 'Balcão', icon: UserRound },
    { id: 'delivery', label: 'Delivery', icon: Bike },
    { id: 'chatbot', label: 'ChatBot', icon: WhatsAppIcon },
  ];

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

  // Estrutura hierárquica de Vendas
  const salesModule = {
    label: "Vendas",
    icon: DollarSign,
    expanded: salesExpanded,
    toggle: () => setSalesExpanded(!salesExpanded),
    children: [
      { path: "/vendas/relatorio", label: "Relatório de Vendas", icon: BarChart3 },
      { path: "/vendas/pedidos", label: "Pedidos", icon: ClipboardList },
      { path: "/vendas/entregas", label: "Entregas", icon: Truck },
      { path: "/vendas/clientes", label: "Clientes", icon: Users },
    ]
  };


  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isStockControlActive = () => {
    return ["/produtos", "/estoque", "/compras"].some(path => location.pathname.startsWith(path));
  };

  const isSalesActive = () => {
    return location.pathname.startsWith("/vendas");
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

          {/* Vendas (Hierárquico) */}
          <div>
            {/* Header do módulo */}
            <button
              onClick={() => setSalesExpanded(!salesExpanded)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isSalesActive()
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? salesModule.label : ''}
            >
              <DollarSign className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{salesModule.label}</span>
                  {salesExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {/* Sub-itens de Vendas */}
            {sidebarOpen && salesExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {salesModule.children.map((child) => {
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
        <header className="bg-card border-b flex items-stretch">
          {/* Área do botão hamburguer - mesmo tamanho da logo */}
          <div className={`flex items-center justify-center border-r transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* Mini Menu com ícones */}
          <div className="flex-1 flex items-center px-4 py-2 gap-2">
            {topMenuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTopMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTopMenu(isActive ? null : item.id)}
                  className={`
                    flex flex-col items-center gap-1 px-4 py-2 rounded-lg font-medium text-xs whitespace-nowrap
                    transition-all duration-200 min-w-[70px]
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted hover:bg-muted/80'
                    }
                  `}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center pr-4">
            <DarkModeToggle />
          </div>
        </header>

        {/* Conteúdo das Rotas */}
        <main className="flex-1 overflow-auto">
          {/* Se uma aba superior está ativa, mostrar "Em breve" */}
          {activeTopMenu ? (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center">
                {topMenuItems.find(item => item.id === activeTopMenu) && (
                  <>
                    {(() => {
                      const item = topMenuItems.find(i => i.id === activeTopMenu);
                      const IconComponent = item.icon;
                      return <IconComponent className="w-20 h-20 mx-auto text-muted-foreground/30 mb-6" />;
                    })()}
                    <h1 className="text-3xl font-bold mb-2">
                      {topMenuItems.find(item => item.id === activeTopMenu)?.label}
                    </h1>
                  </>
                )}
                <p className="text-muted-foreground text-lg mb-6">Em breve...</p>
                <div className="p-6 bg-muted/50 rounded-xl border max-w-md">
                  <p className="text-muted-foreground">Esta funcionalidade está em desenvolvimento.</p>
                </div>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Reports />} />
              <Route path="/ingredientes" element={<Ingredients />} />
              <Route path="/estoque" element={<Ingredients />} />
              <Route path="/compras" element={<Purchases />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/moderacao" element={<Moderation />} />
              <Route path="/configuracao" element={<div className="p-8"><h1 className="text-3xl font-bold">Configuração</h1><p className="text-muted-foreground mt-2">Em breve...</p></div>} />
              {/* Rotas de Vendas */}
              <Route path="/vendas/relatorio" element={
                <div className="p-8">
                  <h1 className="text-3xl font-bold">Relatório de Vendas</h1>
                  <p className="text-muted-foreground mt-2">Em breve...</p>
                  <div className="mt-8 p-6 bg-muted/50 rounded-xl border text-center">
                    <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Esta funcionalidade está em desenvolvimento.</p>
                  </div>
                </div>
              } />
              <Route path="/vendas/pedidos" element={
                <div className="p-8">
                  <h1 className="text-3xl font-bold">Pedidos</h1>
                  <p className="text-muted-foreground mt-2">Em breve...</p>
                  <div className="mt-8 p-6 bg-muted/50 rounded-xl border text-center">
                    <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Esta funcionalidade está em desenvolvimento.</p>
                  </div>
                </div>
              } />
              <Route path="/vendas/entregas" element={
                <div className="p-8">
                  <h1 className="text-3xl font-bold">Entregas</h1>
                  <p className="text-muted-foreground mt-2">Em breve...</p>
                  <div className="mt-8 p-6 bg-muted/50 rounded-xl border text-center">
                    <Truck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Esta funcionalidade está em desenvolvimento.</p>
                  </div>
                </div>
              } />
              <Route path="/vendas/clientes" element={
                <div className="p-8">
                  <h1 className="text-3xl font-bold">Clientes</h1>
                  <p className="text-muted-foreground mt-2">Em breve...</p>
                  <div className="mt-8 p-6 bg-muted/50 rounded-xl border text-center">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Esta funcionalidade está em desenvolvimento.</p>
                  </div>
                </div>
              } />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}