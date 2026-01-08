import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Home, Clock, Truck, Plus, Search, X, Phone, MapPin, User, Package, 
  ChevronLeft, ChevronRight, RefreshCw, ImageOff, Minus, ShoppingBasket,
  CreditCard, Banknote, QrCode, Check, Edit, MoreVertical, Trash2, Mail
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// Tabs do menu lateral
const tabs = [
  { id: "inicio", label: "Início", icon: Home, color: "bg-blue-500" },
  { id: "aguardando", label: "Aguardando", icon: Clock, color: "bg-orange-500" },
  { id: "transito", label: "Em trânsito", icon: Truck, color: "bg-red-500" },
];

export default function Delivery() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("inicio");
  const [pedidos, setPedidos] = useState([]);
  const [selectedPedido, setSelectedPedido] = useState(null);
  
  // Novo Pedido
  const [novoPedidoMode, setNovoPedidoMode] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showClienteForm, setShowClienteForm] = useState(false);
  
  // Form novo cliente - Campos expandidos
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");
  const [novoClienteEmail, setNovoClienteEmail] = useState("");
  const [novoClienteCpf, setNovoClienteCpf] = useState("");
  const [novoClienteDataNascimento, setNovoClienteDataNascimento] = useState("");
  const [novoClienteGenero, setNovoClienteGenero] = useState("");
  const [novoClienteFoto, setNovoClienteFoto] = useState("");
  const [novoClienteEndereco, setNovoClienteEndereco] = useState("");
  const [novoClienteNumero, setNovoClienteNumero] = useState("");
  const [novoClienteComplemento, setNovoClienteComplemento] = useState("");
  const [novoClienteBairro, setNovoClienteBairro] = useState("");
  const [novoClienteCep, setNovoClienteCep] = useState("");
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  
  // Carrinho
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Popup de produto
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productObservation, setProductObservation] = useState("");
  const [productPrice, setProductPrice] = useState(0);
  
  // Pagamento
  const [observacoes, setObservacoes] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");

  // Carregar dados
  useEffect(() => {
    fetchPedidos();
    fetchClientes();
  }, []);

  const fetchPedidos = () => {
    // Carregar pedidos do localStorage
    const savedPedidos = localStorage.getItem("delivery_pedidos");
    if (savedPedidos) {
      setPedidos(JSON.parse(savedPedidos));
    }
  };

  const savePedidos = (newPedidos) => {
    setPedidos(newPedidos);
    localStorage.setItem("delivery_pedidos", JSON.stringify(newPedidos));
  };

  const fetchClientes = () => {
    const savedClientes = localStorage.getItem("clientes");
    if (savedClientes) {
      setClientes(JSON.parse(savedClientes));
    }
  };

  const saveClientes = (newClientes) => {
    setClientes(newClientes);
    localStorage.setItem("clientes", JSON.stringify(newClientes));
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/products/for-sale`, getAuthHeader()),
        axios.get(`${API}/categories`, getAuthHeader())
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Filtrar clientes pela busca (Nome, CPF, Email e Telefone)
  const filteredClientes = clienteSearch.trim() 
    ? clientes.filter(c => 
        c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
        (c.telefone && c.telefone.includes(clienteSearch)) ||
        (c.email && c.email.toLowerCase().includes(clienteSearch.toLowerCase())) ||
        (c.cpf && c.cpf.includes(clienteSearch))
      )
    : [];

  // Verificar se deve mostrar sugestão de cadastro
  const showCadastroSuggestion = clienteSearch.trim().length >= 2 && filteredClientes.length === 0;

  // Funções de formatação
  const formatTelefone = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const formatData = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Abrir dialog de cadastro de cliente
  const handleOpenClienteDialog = () => {
    // Se estava pesquisando por nome, preencher automaticamente
    if (clienteSearch.trim() && !clienteSearch.includes("@") && !/^\d/.test(clienteSearch)) {
      setNovoClienteNome(clienteSearch);
    } else {
      setNovoClienteNome("");
    }
    setNovoClienteTelefone("");
    setNovoClienteEmail("");
    setNovoClienteCpf("");
    setNovoClienteDataNascimento("");
    setNovoClienteGenero("");
    setNovoClienteFoto("");
    setNovoClienteEndereco("");
    setNovoClienteNumero("");
    setNovoClienteComplemento("");
    setNovoClienteBairro("");
    setNovoClienteCep("");
    setClienteDialogOpen(true);
  };

  // Handle foto change
  const handleClienteFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNovoClienteFoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtrar pedidos por status
  const getPedidosByStatus = (status) => {
    if (status === "inicio") return pedidos;
    if (status === "aguardando") return pedidos.filter(p => p.status === "aguardando" || p.status === "producao");
    if (status === "transito") return pedidos.filter(p => p.status === "transito");
    return pedidos;
  };

  // Iniciar novo pedido
  const handleNovoPedido = () => {
    setNovoPedidoMode(true);
    setSelectedCliente(null);
    setCart([]);
    setObservacoes("");
    setFormaPagamento("");
    setClienteSearch("");
    fetchProducts();
  };

  // Selecionar cliente
  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setClienteSearch("");
  };

  // Criar novo cliente (dialog completo)
  const handleNovoCliente = () => {
    if (!novoClienteNome || !novoClienteTelefone) {
      toast.error("Preencha nome e telefone do cliente");
      return;
    }

    const novoCliente = {
      id: `cliente-${Date.now()}`,
      nome: novoClienteNome,
      telefone: novoClienteTelefone,
      email: novoClienteEmail,
      cpf: novoClienteCpf,
      data_nascimento: novoClienteDataNascimento,
      genero: novoClienteGenero,
      foto: novoClienteFoto,
      endereco: novoClienteEndereco,
      numero: novoClienteNumero,
      complemento: novoClienteComplemento,
      bairro: novoClienteBairro,
      cep: novoClienteCep,
      created_at: new Date().toISOString(),
      pedidos_count: 0,
      total_gasto: 0
    };

    const updatedClientes = [...clientes, novoCliente];
    saveClientes(updatedClientes);
    setSelectedCliente(novoCliente);
    setClienteDialogOpen(false);
    setShowClienteForm(false);
    setNovoClienteNome("");
    setNovoClienteTelefone("");
    setNovoClienteEmail("");
    setNovoClienteCpf("");
    setNovoClienteDataNascimento("");
    setNovoClienteGenero("");
    setNovoClienteFoto("");
    setNovoClienteEndereco("");
    setNovoClienteNumero("");
    setNovoClienteComplemento("");
    setNovoClienteBairro("");
    setNovoClienteCep("");
    setClienteSearch("");
    toast.success("Cliente cadastrado!");
  };

  // Produtos
  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(p => p.category === selectedCategory);

  const openProductPopup = (product) => {
    setSelectedProduct(product);
    setProductQuantity(1);
    setProductObservation("");
    setProductPrice(product.sale_price || 0);
    setProductPopupOpen(true);
  };

  const addProductToCart = () => {
    if (!selectedProduct) return;
    
    const productToAdd = {
      ...selectedProduct,
      sale_price: productPrice,
      quantity: productQuantity,
      observation: productObservation.trim() || null,
      cartItemId: Date.now()
    };
    
    setCart([...cart, productToAdd]);
    toast.success(`${selectedProduct.name} adicionado!`);
    setProductPopupOpen(false);
    setSelectedProduct(null);
  };

  const updateCartQuantity = (cartItemId, delta) => {
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartItemId) => {
    setCart(cart.filter(item => item.cartItemId !== cartItemId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.sale_price || 0) * item.quantity, 0);

  // Gerar código único de 5 dígitos
  const generateUniqueCode = () => {
    const existingCodes = new Set(pedidos.map(p => p.codigo));
    let code;
    let attempts = 0;
    const maxAttempts = 100000;
    
    do {
      const num = Math.floor(Math.random() * 100000);
      code = `#${num.toString().padStart(5, '0')}`;
      attempts++;
    } while (existingCodes.has(code) && attempts < maxAttempts);
    
    return code;
  };

  // Finalizar pedido
  const handleFinalizarPedido = () => {
    if (!selectedCliente) {
      toast.error("Selecione um cliente");
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione produtos ao pedido");
      return;
    }
    if (!formaPagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    const novoPedido = {
      id: `pedido-${Date.now()}`,
      codigo: generateUniqueCode(),
      cliente: selectedCliente,
      items: cart,
      total: cartTotal,
      status: "producao",
      formaPagamento,
      observacoes,
      created_at: new Date().toISOString()
    };

    savePedidos([...pedidos, novoPedido]);
    toast.success(`Pedido ${novoPedido.codigo} criado com sucesso!`);
    
    // Reset
    setNovoPedidoMode(false);
    setSelectedCliente(null);
    setCart([]);
    setObservacoes("");
    setFormaPagamento("");
  };

  // Alterar status do pedido
  const handleStatusChange = (pedidoId, newStatus) => {
    const updatedPedidos = pedidos.map(p => 
      p.id === pedidoId ? { ...p, status: newStatus } : p
    );
    savePedidos(updatedPedidos);
    if (newStatus === "concluido") {
      toast.success("Pedido concluído!");
    } else if (newStatus === "transito") {
      toast.success("Pedido em trânsito!");
    }
  };

  // Cancelar pedido
  const handleCancelarPedido = (pedidoId) => {
    savePedidos(pedidos.filter(p => p.id !== pedidoId));
    setSelectedPedido(null);
    toast.success("Pedido cancelado");
  };

  const paymentMethods = [
    { id: "dinheiro", label: "Dinheiro", icon: Banknote },
    { id: "credito", label: "Crédito", icon: CreditCard },
    { id: "debito", label: "Débito", icon: CreditCard },
    { id: "pix", label: "PIX", icon: QrCode },
  ];

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Menu Lateral Sobreposto */}
      <div className={`
        absolute inset-y-0 left-0 z-30 bg-card border-r shadow-lg
        transition-all duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'w-56' : 'w-0'}
      `}>
        {sidebarOpen && (
          <>
            {/* Header do Menu */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Entrega</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>

            {/* Tabs de Status */}
            <div className="p-3 space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const count = getPedidosByStatus(tab.id).length;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setNovoPedidoMode(false); setSelectedPedido(null); }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                      ${isActive 
                        ? `${tab.color} text-white` 
                        : 'hover:bg-muted text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left text-sm font-medium">{tab.label}</span>
                    {count > 0 && (
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs font-bold
                        ${isActive ? 'bg-white/20' : 'bg-muted-foreground/20'}
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Botão Novo Pedido */}
            <div className="p-3">
              <Button 
                onClick={handleNovoPedido}
                className="w-full h-12 text-base font-semibold shadow-md"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo pedido
              </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />
          </>
        )}
      </div>

      {/* Botão para reabrir menu */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-2 z-20 p-2 bg-card border rounded-lg shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Área Principal */}
      <div className={`flex-1 flex transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-0'}`}>
        {/* Lista de Pedidos / Produtos */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          {novoPedidoMode && selectedCliente ? (
            // Tela de seleção de produtos
            <>
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{selectedCliente.nome}</h3>
                    <p className="text-xs text-muted-foreground">{selectedCliente.endereco}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCliente(null)}>
                    Trocar Cliente
                  </Button>
                </div>
                
                {/* Filtro de Categorias */}
                <div className="flex gap-2 overflow-x-auto mt-3">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    onClick={() => setSelectedCategory("all")}
                    size="sm"
                  >
                    Todos
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.name ? "default" : "outline"}
                      onClick={() => setSelectedCategory(cat.name)}
                      size="sm"
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grid de Produtos */}
              <div className="flex-1 overflow-auto p-3">
                {loadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Carregando...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => openProductPopup(product)}
                        className="bg-card rounded-lg border p-2 hover:shadow-md hover:border-primary/50 transition-all text-left"
                      >
                        <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden">
                          {product.photo_url ? (
                            <img
                              src={`${BACKEND_URL}/api${product.photo_url}`}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-xs truncate">{product.name}</p>
                        <p className="text-primary font-bold text-sm">R$ {(product.sale_price || 0).toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : novoPedidoMode ? (
            // Estado vazio - aguardando seleção de cliente
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Selecione um cliente para iniciar o pedido</p>
              <p className="text-xs text-muted-foreground mt-1">Use a busca no painel à direita</p>
            </div>
          ) : (
            // Lista de Pedidos
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold">
                  {activeTab === "inicio" && "Todos os Pedidos"}
                  {activeTab === "aguardando" && "Aguardando"}
                  {activeTab === "transito" && "Em Trânsito"}
                </h3>
                <Button variant="ghost" size="icon" onClick={fetchPedidos}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto">
                {getPedidosByStatus(activeTab).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Nenhum pedido para entrega</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={handleNovoPedido}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Pedido
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {getPedidosByStatus(activeTab).map(pedido => (
                      <button
                        key={pedido.id}
                        onClick={() => setSelectedPedido(pedido)}
                        className={`
                          w-full p-4 text-left hover:bg-muted/50 transition-colors
                          ${selectedPedido?.id === pedido.id ? 'bg-primary/10' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{pedido.cliente.nome}</p>
                            <p className="text-xs text-muted-foreground">{pedido.cliente.endereco}</p>
                          </div>
                          <span className={`
                            px-2 py-1 rounded-full text-xs font-medium
                            ${pedido.status === 'aguardando' ? 'bg-orange-100 text-orange-700' : ''}
                            ${pedido.status === 'transito' ? 'bg-blue-100 text-blue-700' : ''}
                            ${pedido.status === 'entregue' ? 'bg-green-100 text-green-700' : ''}
                          `}>
                            {pedido.status === 'aguardando' && 'Aguardando'}
                            {pedido.status === 'transito' && 'Em trânsito'}
                            {pedido.status === 'entregue' && 'Entregue'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {pedido.items.length} item(s)
                          </span>
                          <span className="font-bold text-primary">
                            R$ {pedido.total.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Painel Direito - Detalhes/Cliente */}
        <div className="w-80 flex flex-col bg-muted/10">
          <div className="p-4 border-b">
            <h3 className="font-bold">
              {novoPedidoMode ? "Entrega" : (selectedPedido ? "Detalhes do Pedido" : "Entrega")}
            </h3>
          </div>

          {novoPedidoMode ? (
            // Modo Novo Pedido
            <div className="flex-1 flex flex-col overflow-hidden">
              {!selectedCliente ? (
                // Busca de Cliente
                <div className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, CPF, email ou telefone..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Lista de clientes */}
                  {filteredClientes.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {filteredClientes.map(cliente => (
                        <button
                          key={cliente.id}
                          onClick={() => handleSelectCliente(cliente)}
                          className="w-full p-3 text-left bg-card rounded-lg border hover:border-primary/50 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                              {cliente.foto ? (
                                <img src={cliente.foto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{cliente.nome}</p>
                              <p className="text-xs text-muted-foreground">{cliente.telefone}</p>
                            </div>
                          </div>
                          {cliente.endereco && (
                            <p className="text-xs text-muted-foreground mt-1 truncate pl-10">{cliente.endereco}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sugestão de cadastro quando não encontrar */}
                  {showCadastroSuggestion && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-center text-orange-800 dark:text-orange-200 mb-3">
                        Nenhum cliente encontrado para "{clienteSearch}"
                      </p>
                      <Button 
                        className="w-full"
                        onClick={handleOpenClienteDialog}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Cadastrar Novo Cliente
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // Carrinho e Finalização
                <>
                  <div className="flex-1 overflow-auto p-3">
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBasket className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum item</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cart.map(item => (
                          <div key={item.cartItemId} className="flex items-center gap-2 p-2 bg-card rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              {item.observation && (
                                <p className="text-xs text-orange-500 truncate">📝 {item.observation}</p>
                              )}
                              <p className="text-xs text-primary font-bold">
                                R$ {((item.sale_price || 0) * item.quantity).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateCartQuantity(item.cartItemId, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-5 text-center text-xs">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateCartQuantity(item.cartItemId, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeFromCart(item.cartItemId)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Observações */}
                        <div className="mt-4">
                          <Label className="text-xs">Observações</Label>
                          <Textarea
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Observações do pedido..."
                            className="mt-1 resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Forma de Pagamento */}
                        <div className="mt-3">
                          <Label className="text-xs">Forma de Pagamento</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {paymentMethods.map(method => {
                              const Icon = method.icon;
                              return (
                                <button
                                  key={method.id}
                                  onClick={() => setFormaPagamento(method.id)}
                                  className={`
                                    p-2 rounded-lg border text-xs flex items-center gap-2 transition-all
                                    ${formaPagamento === method.id 
                                      ? 'border-primary bg-primary/10' 
                                      : 'hover:border-muted-foreground/30'
                                    }
                                  `}
                                >
                                  <Icon className="w-4 h-4" />
                                  {method.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer - Total e Botão */}
                  <div className="p-4 border-t bg-background">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => { setNovoPedidoMode(false); setSelectedCliente(null); setCart([]); }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleFinalizarPedido}
                        disabled={cart.length === 0 || !formaPagamento}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Finalizar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : selectedPedido ? (
            // Detalhes do Pedido Selecionado
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Cliente */}
                <div className="p-3 bg-card rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedPedido.cliente.nome}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {selectedPedido.cliente.telefone}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {selectedPedido.cliente.endereco}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Itens */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Itens do Pedido</h4>
                  <div className="space-y-2">
                    {selectedPedido.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-card rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{item.quantity}x {item.name}</p>
                          {item.observation && (
                            <p className="text-xs text-orange-500">📝 {item.observation}</p>
                          )}
                        </div>
                        <p className="font-bold text-sm">R$ {((item.sale_price || 0) * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagamento */}
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium capitalize">{selectedPedido.formaPagamento}</p>
                </div>

                {selectedPedido.observacoes && (
                  <div className="p-3 bg-card rounded-lg border">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm">{selectedPedido.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Footer - Ações */}
              <div className="p-4 border-t bg-background">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-primary">R$ {selectedPedido.total.toFixed(2)}</span>
                </div>
                
                {selectedPedido.status === "aguardando" && (
                  <Button 
                    className="w-full"
                    onClick={() => handleStatusChange(selectedPedido.id, "transito")}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Enviar para Entrega
                  </Button>
                )}
                
                {selectedPedido.status === "transito" && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange(selectedPedido.id, "entregue")}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Entrega
                  </Button>
                )}

                {selectedPedido.status !== "entregue" && (
                  <Button 
                    variant="outline"
                    className="w-full mt-2 text-destructive hover:text-destructive"
                    onClick={() => handleCancelarPedido(selectedPedido.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancelar Pedido
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Estado vazio
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Selecione um pedido</p>
              <p className="text-xs text-muted-foreground mt-1">ou crie um novo</p>
            </div>
          )}

          {/* Total fixo quando não está em modo de novo pedido */}
          {!novoPedidoMode && !selectedPedido && (
            <div className="p-4 border-t bg-background">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold text-green-600">R$ 0,00</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Produto */}
      <Dialog open={productPopupOpen} onOpenChange={setProductPopupOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setProductPopupOpen(false)} 
              className="rounded-full p-2 bg-background/80 hover:bg-background border shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedProduct && (
            <>
              <div className="p-6">
                <div className="flex gap-4 mb-4">
                  <div className="w-28 h-28 rounded-xl bg-muted overflow-hidden flex-shrink-0 border">
                    {selectedProduct.photo_url ? (
                      <img
                        src={`${BACKEND_URL}/api${selectedProduct.photo_url}`}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageOff className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1">{selectedProduct.name}</h2>
                    <p className="text-2xl font-bold text-primary">
                      R$ {productPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="text-sm">Observação</Label>
                  <Textarea
                    value={productObservation}
                    onChange={(e) => setProductObservation(e.target.value)}
                    placeholder="Ex: tirar cebola..."
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 bg-background rounded-full border p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                      disabled={productQuantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center text-lg font-bold">{productQuantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => setProductQuantity(productQuantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={addProductToCart}
                    className="flex-1 h-12 text-base font-bold rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  >
                    <ShoppingBasket className="w-5 h-5 mr-2" />
                    Adicionar R$ {(productPrice * productQuantity).toFixed(2)}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Cadastro de Cliente */}
      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Primeira Linha: Foto, Nome e Gênero */}
            <div className="flex gap-6">
              {/* Foto do Cliente */}
              <div className="flex-shrink-0">
                <Label className="text-sm text-muted-foreground">Foto do Cliente</Label>
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed overflow-hidden bg-muted flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                      {novoClienteFoto ? (
                        <img
                          src={novoClienteFoto}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <ImageOff className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center px-2">Clique para adicionar</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleClienteFotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 text-center">1080x1080px</p>
                </div>
              </div>

              {/* Nome e Email */}
              <div className="flex-1 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Nome *</Label>
                    <Input
                      value={novoClienteNome}
                      onChange={(e) => setNovoClienteNome(e.target.value)}
                      placeholder="Ex: Thais Addad"
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Gênero */}
                  <div className="w-48">
                    <Label>Gênero</Label>
                    <div className="mt-1 flex rounded-lg border overflow-hidden h-10">
                      <button
                        type="button"
                        onClick={() => setNovoClienteGenero("masculino")}
                        className={`flex-1 text-sm font-medium transition-colors ${
                          novoClienteGenero === "masculino" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovoClienteGenero("feminino")}
                        className={`flex-1 text-sm font-medium transition-colors border-l ${
                          novoClienteGenero === "feminino" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        Feminino
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={novoClienteEmail}
                    onChange={(e) => setNovoClienteEmail(e.target.value)}
                    placeholder="Ex: thaisaddad@gmail.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Segunda Linha: Telefone, CPF e Data de Nascimento */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(formatTelefone(e.target.value))}
                  placeholder="(XX) 9.XXXX-XXXX"
                  className="mt-1"
                  maxLength={16}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={novoClienteCpf}
                  onChange={(e) => setNovoClienteCpf(formatCPF(e.target.value))}
                  placeholder="XXX.XXX.XXX-XX"
                  className="mt-1"
                  maxLength={14}
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  value={novoClienteDataNascimento}
                  onChange={(e) => setNovoClienteDataNascimento(formatData(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  className="mt-1"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Terceira Linha: Endereços */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Endereço</Label>
              <div className="grid grid-cols-12 gap-3 mt-3">
                <div className="col-span-6">
                  <Label className="text-sm">Rua/Logradouro</Label>
                  <Input
                    value={novoClienteEndereco}
                    onChange={(e) => setNovoClienteEndereco(e.target.value)}
                    placeholder="Ex: Rua das Flores"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">Número</Label>
                  <Input
                    value={novoClienteNumero}
                    onChange={(e) => setNovoClienteNumero(e.target.value)}
                    placeholder="123"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-sm">Complemento</Label>
                  <Input
                    value={novoClienteComplemento}
                    onChange={(e) => setNovoClienteComplemento(e.target.value)}
                    placeholder="Apt 101, Bloco A..."
                    className="mt-1"
                  />
                </div>
                <div className="col-span-5">
                  <Label className="text-sm">Bairro</Label>
                  <Input
                    value={novoClienteBairro}
                    onChange={(e) => setNovoClienteBairro(e.target.value)}
                    placeholder="Ex: Centro"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-sm">CEP</Label>
                  <Input
                    value={novoClienteCep}
                    onChange={(e) => setNovoClienteCep(formatCEP(e.target.value))}
                    placeholder="XXXXX-XXX"
                    className="mt-1"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setClienteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNovoCliente}>
                Cadastrar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
