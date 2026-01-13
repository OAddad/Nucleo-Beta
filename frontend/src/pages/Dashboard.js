import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Package, ShoppingCart, FileText, BarChart3, LogOut, Shield, Settings, Menu, X, ChevronDown, ChevronRight, Home, DollarSign, ClipboardList, Truck, Users, UtensilsCrossed, UserRound, Bike, MessageCircle, Building2, AlertTriangle, Wallet, Receipt, CreditCard, PieChart, Megaphone, Gift, Ticket, Store, Briefcase, MapPin, Route as RouteIcon, MapPinned } from "lucide-react";
import { Button } from "../components/ui/button";
import DarkModeToggle from "../components/DarkModeToggle";
import VisaoGeral from "./VisaoGeral";
import Reports from "./Reports";
import Ingredients from "./Ingredients";
import Purchases from "./Purchases";
import Products from "./Products";
import Moderation from "./Moderation";
import BugsPage from "./BugsPage";
import BalcaoVendas from "./BalcaoVendas";
import Mesas from "./Mesas";
import ChatBot from "./ChatBot";
import Delivery from "./Delivery";
import EntregadorDetalhe from "./EntregadorDetalhe";
import Clientes from "./Clientes";
import Fornecedores from "./Fornecedores";
import Funcionarios from "./Funcionarios";
import Bairros from "./Bairros";
import Ruas from "./Ruas";
import AreaEntrega from "./AreaEntrega";
import Pedidos from "./Pedidos";
import Despesas from "./Despesas";
import ExtratoFinanceiro from "./ExtratoFinanceiro";
import RelatorioOfertas from "./RelatorioOfertas";
import RelatorioEntregas from "./RelatorioEntregas";
import Promocoes from "./Promocoes";
import Sistema from "./Sistema";
import CuponsDesconto from "./CuponsDesconto";
import Campanhas from "./Campanhas";
import CardapioPublico from "./CardapioPublico";
import ConfiguracaoHorarios from "./ConfiguracaoHorarios";

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
  const [stockControlExpanded, setStockControlExpanded] = useState(false);
  const [salesExpanded, setSalesExpanded] = useState(false);
  
  // Configurações da empresa
  const [companySettings, setCompanySettings] = useState({
    company_name: "Núcleo",
    slogan: "O Centro da sua Gestão",
    logo_url: null
  });

  // Configuração das abas superiores com ícones
  const topMenuItems = [
    { id: 'cardapio', label: 'Cardápio', icon: Store },
    { id: 'mesas', label: 'Mesas', icon: UtensilsCrossed },
    { id: 'balcao', label: 'Balcão', icon: UserRound },
    { id: 'delivery', label: 'Delivery', icon: Bike },
    { id: 'chatbot', label: 'ChatBot', icon: WhatsAppIcon },
  ];

  // Buscar configurações da empresa
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/company/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setCompanySettings(data);
          // Atualizar título do documento
          document.title = data.company_name || "Núcleo";
        }
      } catch (error) {
        console.error("Erro ao buscar configurações da empresa:", error);
      }
    };
    fetchCompanySettings();
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Gerenciar activeTopMenu baseado na URL
  useEffect(() => {
    const path = location.pathname;
    
    // Se não estamos em uma das abas do top menu, limpar activeTopMenu
    // Top menu items são: cardapio, balcao, mesas, chatbot, delivery
    // Qualquer outra rota deve limpar o activeTopMenu
    if (activeTopMenu) {
      // Se a URL mudou para qualquer rota do menu lateral, limpar activeTopMenu
      const isTopMenuRoute = false; // Top menu não usa rotas de URL, só estado
      if (!isTopMenuRoute) {
        setActiveTopMenu(null);
      }
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    toast.success("Logout realizado!");
  };

  const handleNavigate = (path) => {
    setActiveTopMenu(null); // Desativa aba superior ao navegar pelo menu lateral
    navigate(`/admin${path}`);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSidebarClick = (path) => {
    setActiveTopMenu(null); // Desativa aba superior
    // Se o sidebar estiver retraído, expandir
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
    // Navega para /admin + path
    navigate(`/admin${path}`);
  };

  // Função para expandir sidebar ao clicar em módulo quando retraído
  const handleModuleClick = (toggleFn) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
    toggleFn();
  };

  const [configExpanded, setConfigExpanded] = useState(false);
  const [clientesFornecedoresExpanded, setClientesFornecedoresExpanded] = useState(false);
  const [financeiroExpanded, setFinanceiroExpanded] = useState(false);
  const [impulsioneVendasExpanded, setImpulsioneVendasExpanded] = useState(false);
  const [localizacaoExpanded, setLocalizacaoExpanded] = useState(false);

  // Função para recolher todas as abas do menu
  const collapseAllMenus = () => {
    setStockControlExpanded(false);
    setSalesExpanded(false);
    setClientesFornecedoresExpanded(false);
    setFinanceiroExpanded(false);
    setImpulsioneVendasExpanded(false);
    setConfigExpanded(false);
    setLocalizacaoExpanded(false);
  };

  // Função para alternar o sidebar e recolher menus quando minimizar
  const toggleSidebar = () => {
    if (sidebarOpen) {
      // Ao minimizar, recolher todas as abas
      collapseAllMenus();
    }
    setSidebarOpen(!sidebarOpen);
  };

  // Estrutura de navegação principal
  const mainTabs = [
    { path: "/", label: "Visão Geral", icon: Home, type: "single" },
  ];

  // Estrutura hierárquica de Controle de Estoque
  const stockControlModule = {
    label: "Controle de Estoque",
    icon: BarChart3,
    expanded: stockControlExpanded,
    toggle: () => setStockControlExpanded(!stockControlExpanded),
    children: [
      { path: "/estoque/relatorio", label: "Relatório de Estoque", icon: PieChart },
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
    ]
  };

  // Estrutura hierárquica de Pessoas e Fornecedores
  const clientesFornecedoresModule = {
    label: "Pessoas e Fornecedores",
    icon: Users,
    expanded: clientesFornecedoresExpanded,
    toggle: () => setClientesFornecedoresExpanded(!clientesFornecedoresExpanded),
    children: [
      { path: "/clientes-fornecedores/clientes", label: "Clientes", icon: UserRound },
      { path: "/clientes-fornecedores/fornecedores", label: "Fornecedores", icon: Building2 },
      { path: "/clientes-fornecedores/funcionarios", label: "Funcionários", icon: Briefcase },
    ]
  };

  // Estrutura hierárquica de Localização
  const localizacaoModule = {
    label: "Localização",
    icon: MapPin,
    expanded: localizacaoExpanded,
    toggle: () => setLocalizacaoExpanded(!localizacaoExpanded),
    children: [
      { path: "/localizacao/bairros", label: "Bairros", icon: MapPin },
      { path: "/localizacao/ruas", label: "Ruas", icon: RouteIcon },
      { path: "/localizacao/area-entrega", label: "Área de Entrega", icon: MapPinned },
    ]
  };

  // Estrutura hierárquica de Configurações
  const configModule = {
    label: "Configurações",
    icon: Settings,
    expanded: configExpanded,
    toggle: () => setConfigExpanded(!configExpanded),
    children: [
      { path: "/configuracoes/horarios", label: "Horários", icon: ClipboardList },
      { path: "/configuracoes/sistema", label: "Sistema", icon: Settings },
      { path: "/configuracoes/auditoria", label: "Auditoria", icon: Shield },
      { path: "/configuracoes/bugs", label: "Bugs & Sistema", icon: AlertTriangle },
    ]
  };

  // Estrutura hierárquica de Financeiro
  const financeiroModule = {
    label: "Financeiro",
    icon: Wallet,
    expanded: financeiroExpanded,
    toggle: () => setFinanceiroExpanded(!financeiroExpanded),
    children: [
      { path: "/financeiro/extrato", label: "Extrato Financeiro", icon: Receipt },
      { path: "/financeiro/despesas", label: "Despesas", icon: CreditCard },
    ]
  };

  // Estrutura hierárquica de Impulsione suas Vendas
  const impulsioneVendasModule = {
    label: "Impulsione suas Vendas",
    icon: Megaphone,
    expanded: impulsioneVendasExpanded,
    toggle: () => setImpulsioneVendasExpanded(!impulsioneVendasExpanded),
    children: [
      { path: "/impulsione/relatorio-ofertas", label: "Relatório de Ofertas", icon: BarChart3 },
      { path: "/impulsione/promocoes", label: "Promoções", icon: Gift },
      { path: "/impulsione/cupons", label: "Cupons de Desconto", icon: Ticket },
      { path: "/impulsione/campanhas", label: "Campanhas", icon: Megaphone },
    ]
  };


  const isActive = (path) => {
    const currentPath = location.pathname.replace('/admin', '');
    if (path === "/") return currentPath === "/" || currentPath === "";
    // Para /estoque, verificar se é exatamente /estoque (não /estoque/relatorio)
    if (path === "/estoque") {
      return currentPath === "/estoque";
    }
    return currentPath.startsWith(path);
  };

  const isStockControlActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return ["/produtos", "/estoque", "/compras", "/estoque/relatorio"].some(path => {
      if (path === "/estoque") {
        return currentPath === "/estoque";
      }
      return currentPath.startsWith(path);
    });
  };

  const isSalesActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return currentPath.startsWith("/vendas");
  };

  const isClientesFornecedoresActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return currentPath.startsWith("/clientes-fornecedores");
  };

  const isConfigActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return currentPath.startsWith("/configuracoes");
  };

  const isFinanceiroActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return currentPath.startsWith("/financeiro");
  };

  const isImpulsioneVendasActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return currentPath.startsWith("/impulsione");
  };

  const isLocalizacaoActive = () => {
    const currentPath = location.pathname.replace('/admin', '');
    return currentPath.startsWith("/localizacao");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Overlay para mobile quando sidebar está aberto */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Fixo com scroll próprio */}
      <aside className={`
        bg-sidebar text-sidebar-foreground flex-col border-r
        transition-transform duration-300 ease-in-out flex-shrink-0
        fixed left-0 top-0 h-screen z-40
        w-[85vw] max-w-[320px] lg:w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'}
        flex
        shadow-2xl lg:shadow-none
      `}>
        {/* Conteúdo do Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden lg:block'} w-full h-full flex flex-col`}>
          {/* Header do Sidebar - com botão fechar em mobile */}
          <div className="p-4 lg:p-6 border-b flex items-center justify-between flex-shrink-0">
            <button 
              onClick={() => {
                setActiveTopMenu(null);
                handleSidebarClick("/");
              }}
              className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${sidebarOpen ? '' : 'lg:justify-center lg:w-full'}`}
            >
              <div className="flex-shrink-0">
                <img 
                  src={companySettings.logo_url ? `${process.env.REACT_APP_BACKEND_URL || ""}${companySettings.logo_url}` : "/logo-nucleo.png"} 
                  alt={companySettings.company_name || "Núcleo"} 
                  className="w-12 h-12 lg:w-10 lg:h-10 object-contain rounded-lg"
                  onError={(e) => { e.target.src = "/logo-nucleo.png"; }}
                />
              </div>
              {sidebarOpen && (
                <div className="text-left">
                  <h1 className="text-sidebar-foreground font-bold text-lg lg:text-lg tracking-tight">{companySettings.company_name || "Núcleo"}</h1>
                  <p className="text-xs text-muted-foreground">{companySettings.slogan || "o centro da sua gestão"}</p>
                </div>
              )}
            </button>
            {/* Botão fechar - apenas mobile - mais visível */}
            {sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted active:bg-muted/80 text-sidebar-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

        <nav className="flex-1 p-3 lg:p-4 space-y-1.5 lg:space-y-1 overflow-y-auto overflow-x-hidden">
          {/* Tabs Principais */}
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path) && !activeTopMenu;
            return (
              <button
                key={tab.path}
                onClick={() => handleSidebarClick(tab.path)}
                className={`w-full flex items-center gap-3 lg:gap-3 px-4 py-4 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground font-medium shadow-lg"
                    : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
                } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
                title={!sidebarOpen ? tab.label : ''}
              >
                <Icon className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={1.5} />
                {sidebarOpen && <span className="text-base lg:text-sm font-medium">{tab.label}</span>}
              </button>
            );
          })}

          {/* Controle de Estoque (Hierárquico) */}
          <div>
            {/* Header do módulo */}
            <button
              onClick={() => handleModuleClick(() => setStockControlExpanded(!stockControlExpanded))}
              className={`w-full flex items-center gap-3 lg:gap-3 px-4 py-4 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isStockControlActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? stockControlModule.label : ''}
            >
              <BarChart3 className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-base lg:text-sm flex-1 text-left">{stockControlModule.label}</span>
                  {stockControlExpanded ? (
                    <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {/* Sub-itens */}
            {sidebarOpen && stockControlExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {stockControlModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg transition-all duration-200 text-base lg:text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
                      }`}
                    >
                      <ChildIcon className="w-5 h-5 lg:w-4 lg:h-4 flex-shrink-0" strokeWidth={1.5} />
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
              onClick={() => handleModuleClick(() => setSalesExpanded(!salesExpanded))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isSalesActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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

          {/* Clientes e Fornecedores (Hierárquico) */}
          <div>
            <button
              onClick={() => handleModuleClick(() => setClientesFornecedoresExpanded(!clientesFornecedoresExpanded))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isClientesFornecedoresActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? clientesFornecedoresModule.label : ''}
            >
              <Users className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{clientesFornecedoresModule.label}</span>
                  {clientesFornecedoresExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {sidebarOpen && clientesFornecedoresExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {clientesFornecedoresModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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

          {/* Financeiro (Hierárquico) */}
          <div>
            <button
              onClick={() => handleModuleClick(() => setFinanceiroExpanded(!financeiroExpanded))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isFinanceiroActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? financeiroModule.label : ''}
            >
              <Wallet className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{financeiroModule.label}</span>
                  {financeiroExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {sidebarOpen && financeiroExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {financeiroModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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

          {/* Localização (Hierárquico) */}
          <div>
            <button
              onClick={() => handleModuleClick(() => setLocalizacaoExpanded(!localizacaoExpanded))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isLocalizacaoActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? localizacaoModule.label : ''}
            >
              <MapPin className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{localizacaoModule.label}</span>
                  {localizacaoExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {sidebarOpen && localizacaoExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {localizacaoModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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

          {/* Impulsione suas Vendas (Hierárquico) */}
          <div>
            <button
              onClick={() => handleModuleClick(() => setImpulsioneVendasExpanded(!impulsioneVendasExpanded))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isImpulsioneVendasActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? impulsioneVendasModule.label : ''}
            >
              <Megaphone className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{impulsioneVendasModule.label}</span>
                  {impulsioneVendasExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {sidebarOpen && impulsioneVendasExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {impulsioneVendasModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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

          {/* Configurações (Hierárquico) */}
          <div>
            {/* Header do módulo */}
            <button
              onClick={() => handleModuleClick(() => setConfigExpanded(!configExpanded))}
              className={`w-full flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-all duration-200 ${
                isConfigActive() && !activeTopMenu
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
              } ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
              title={!sidebarOpen ? configModule.label : ''}
            >
              <Settings className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1 text-left">{configModule.label}</span>
                  {configExpanded ? (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </>
              )}
            </button>

            {/* Sub-itens de Configurações */}
            {sidebarOpen && configExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                {configModule.children.map((child) => {
                  const ChildIcon = child.icon;
                  const active = isActive(child.path) && !activeTopMenu;
                  return (
                    <button
                      key={child.path}
                      onClick={() => handleSidebarClick(child.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted active:bg-muted/80"
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

        <div className="p-3 lg:p-4 border-t space-y-2 flex-shrink-0">
          {sidebarOpen && (
            <div className="flex justify-center pb-2">
              <DarkModeToggle />
            </div>
          )}
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className={`w-full hover:bg-muted active:bg-muted/80 py-3 lg:py-2 ${sidebarOpen ? 'justify-start' : 'lg:justify-center lg:px-2'}`}
            title={!sidebarOpen ? 'Sair' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
            {sidebarOpen && <span className="ml-3">Sair</span>}
          </Button>
        </div>
        </div>
      </aside>

      {/* Espaçador para compensar o sidebar fixo - apenas desktop */}
      <div className={`flex-shrink-0 transition-all duration-300 hidden lg:block ${sidebarOpen ? 'lg:w-64' : 'lg:w-16'}`}></div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header com Botão Hamburguer e Mini Menu - Fixo */}
        <header className="bg-card border-b flex items-stretch flex-shrink-0 sticky top-0 z-30">
          {/* Área do botão hamburguer - responsivo */}
          <div className={`flex items-center justify-center border-r transition-all duration-300 ${sidebarOpen ? 'w-16 lg:w-64' : 'w-16'}`}>
            <Button
              onClick={toggleSidebar}
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* Mini Menu com ícones - scroll horizontal em mobile */}
          <div className="flex-1 flex items-center px-2 sm:px-4 py-2 gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
            {topMenuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTopMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isActive) {
                      // Ao ativar uma aba superior, retrair o menu lateral
                      setSidebarOpen(false);
                    }
                    setActiveTopMenu(isActive ? null : item.id);
                  }}
                  className={`
                    flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-[10px] sm:text-xs whitespace-nowrap
                    transition-all duration-200 min-w-[50px] sm:min-w-[70px] flex-shrink-0
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted hover:bg-muted/80'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden xs:inline sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center pr-2 sm:pr-4 flex-shrink-0">
            <DarkModeToggle />
          </div>
        </header>

        {/* Conteúdo das Rotas */}
        <main className="flex-1 overflow-auto">
          {/* Se a aba Cardápio está ativa, mostrar o cardápio público */}
          {activeTopMenu === "cardapio" ? (
            <CardapioPublico onLoginClick={() => setActiveTopMenu(null)} />
          ) : activeTopMenu === "balcao" ? (
            <BalcaoVendas />
          ) : activeTopMenu === "mesas" ? (
            <Mesas />
          ) : activeTopMenu === "chatbot" ? (
            <ChatBot />
          ) : activeTopMenu === "delivery" ? (
            <Delivery />
          ) : activeTopMenu ? (
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
              <Route path="/" element={<VisaoGeral />} />
              <Route path="/estoque/relatorio" element={<Reports />} />
              <Route path="/ingredientes" element={<Ingredients />} />
              <Route path="/estoque" element={<Ingredients />} />
              <Route path="/compras" element={<Purchases />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/moderacao" element={<Moderation />} />
              <Route path="/configuracao" element={<div className="p-8"><h1 className="text-3xl font-bold">Configuração</h1><p className="text-muted-foreground mt-2">Em breve...</p></div>} />
              {/* Rotas de Clientes e Fornecedores */}
              <Route path="/clientes-fornecedores/clientes" element={<Clientes />} />
              <Route path="/clientes-fornecedores/fornecedores" element={<Fornecedores />} />
              <Route path="/clientes-fornecedores/funcionarios" element={<Funcionarios />} />
              {/* Rotas de Localização */}
              <Route path="/localizacao/bairros" element={<Bairros />} />
              <Route path="/localizacao/ruas" element={<Ruas />} />
              <Route path="/localizacao/area-entrega" element={<AreaEntrega />} />
              {/* Rotas de Vendas */}
              <Route path="/vendas/relatorio" element={
                <div className="p-8">
                  <div className="max-w-7xl">
                    <div className="mb-8">
                      <h1 className="text-3xl font-bold tracking-tight">Relatório de Vendas</h1>
                      <p className="text-muted-foreground mt-1">Análise de vendas e desempenho</p>
                    </div>
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8">
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-primary" strokeWidth={1.5} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mb-3">
                            Em Desenvolvimento
                          </div>
                          <h2 className="text-xl font-bold mb-2">Em breve...</h2>
                          <p className="text-muted-foreground">
                            Esta funcionalidade está em desenvolvimento. Em breve você poderá visualizar relatórios completos de vendas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              } />
              <Route path="/vendas/pedidos" element={<Pedidos />} />
              <Route path="/vendas/entregas" element={<RelatorioEntregas />} />
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
              {/* Rotas de Financeiro */}
              <Route path="/financeiro/extrato" element={<ExtratoFinanceiro />} />
              <Route path="/financeiro/despesas" element={<Despesas />} />
              {/* Rota de Entregador Detalhe */}
              <Route path="/entregador/:entregadorId" element={<EntregadorDetalhe />} />
              {/* Rotas de Impulsione suas Vendas */}
              <Route path="/impulsione/relatorio-ofertas" element={<RelatorioOfertas />} />
              <Route path="/impulsione/promocoes" element={<Promocoes />} />
              <Route path="/impulsione/cupons" element={<CuponsDesconto />} />
              <Route path="/impulsione/campanhas" element={<Campanhas />} />
              {/* Rotas de Configurações */}
              <Route path="/configuracoes/horarios" element={<ConfiguracaoHorarios />} />
              <Route path="/configuracoes/sistema" element={<Sistema />} />
              <Route path="/configuracoes/auditoria" element={<Moderation />} />
              <Route path="/configuracoes/bugs" element={<BugsPage />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}