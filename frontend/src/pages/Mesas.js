import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Search, Plus, MoreVertical, Edit, Trash2, X, Users, Receipt, 
  ShoppingCart, ImageOff, Minus, CreditCard, Banknote, QrCode, ShoppingBasket, ArrowLeft
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// Componente de Card da Mesa
function MesaCard({ mesa, onClick, onEdit, onDelete }) {
  const isOpen = mesa.status === "aberta";
  
  return (
    <div
      className={`
        relative bg-card rounded-xl border shadow-sm overflow-hidden 
        transition-all hover:shadow-lg cursor-pointer
        ${isOpen ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : 'hover:border-primary/50'}
      `}
    >
      {/* Menu de Overflow */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(mesa); }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar Mesa
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(mesa); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar Mesa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-6" onClick={() => onClick(mesa)}>
        {/* Número da Mesa */}
        <div className="text-center mb-4">
          <span className="text-4xl font-bold">{String(mesa.numero).padStart(2, '0')}</span>
          <p className="text-sm text-muted-foreground mt-1">{mesa.nome || `Mesa ${mesa.numero}`}</p>
        </div>

        {/* Status */}
        <div className={`
          text-center py-2 rounded-lg text-sm font-medium
          ${isOpen 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-muted text-muted-foreground'
          }
        `}>
          {isOpen ? 'Aberta' : 'Fechada'}
        </div>

        {/* Info adicional se aberta */}
        {isOpen && mesa.comanda && (
          <div className="mt-3 pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comanda:</span>
              <span className="font-medium">#{mesa.comanda}</span>
            </div>
            {mesa.cliente && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium truncate ml-2">{mesa.cliente}</span>
              </div>
            )}
            {mesa.total > 0 && (
              <div className="flex justify-between text-primary font-bold">
                <span>Total:</span>
                <span>R$ {mesa.total.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Principal - Mesas
export default function Mesas() {
  const [mesas, setMesas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mesaDialogOpen, setMesaDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMesa, setCurrentMesa] = useState(null);
  const [mesaNome, setMesaNome] = useState("");
  const [mesaNumero, setMesaNumero] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mesaToDelete, setMesaToDelete] = useState(null);
  
  // Tela de vendas
  const [mesaVendasOpen, setMesaVendasOpen] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clienteNome, setClienteNome] = useState("");
  
  // Popup de produto
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productObservation, setProductObservation] = useState("");
  const [productPrice, setProductPrice] = useState(0);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Pagamento
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cashReceived, setCashReceived] = useState("");

  // Carregar mesas do localStorage
  useEffect(() => {
    const savedMesas = localStorage.getItem("mesas");
    if (savedMesas) {
      setMesas(JSON.parse(savedMesas));
    } else {
      // Criar mesas iniciais (1-10)
      const initialMesas = Array.from({ length: 10 }, (_, i) => ({
        id: `mesa-${i + 1}`,
        numero: i + 1,
        nome: `Mesa ${i + 1}`,
        status: "fechada",
        items: [],
        total: 0,
        cliente: "",
        comanda: null
      }));
      setMesas(initialMesas);
      localStorage.setItem("mesas", JSON.stringify(initialMesas));
    }
  }, []);

  // Salvar mesas no localStorage
  const saveMesas = (newMesas) => {
    setMesas(newMesas);
    localStorage.setItem("mesas", JSON.stringify(newMesas));
  };

  // Filtrar mesas
  const filteredMesas = mesas.filter(mesa => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      String(mesa.numero).includes(search) ||
      (mesa.comanda && String(mesa.comanda).includes(search)) ||
      (mesa.cliente && mesa.cliente.toLowerCase().includes(search)) ||
      (mesa.nome && mesa.nome.toLowerCase().includes(search))
    );
  });

  // Separar abertas e fechadas
  const mesasAbertas = filteredMesas.filter(m => m.status === "aberta").sort((a, b) => a.numero - b.numero);
  const mesasFechadas = filteredMesas.filter(m => m.status === "fechada").sort((a, b) => a.numero - b.numero);

  // Handlers de Mesa
  const handleCreateMesa = () => {
    setEditMode(false);
    setCurrentMesa(null);
    setMesaNome("");
    setMesaNumero(String(mesas.length + 1));
    setMesaDialogOpen(true);
  };

  const handleEditMesa = (mesa) => {
    setEditMode(true);
    setCurrentMesa(mesa);
    setMesaNome(mesa.nome);
    setMesaNumero(String(mesa.numero));
    setMesaDialogOpen(true);
  };

  const handleSaveMesa = () => {
    if (!mesaNumero) {
      toast.error("Informe o número da mesa");
      return;
    }

    const numero = parseInt(mesaNumero);
    
    if (!editMode || (editMode && currentMesa.numero !== numero)) {
      if (mesas.some(m => m.numero === numero)) {
        toast.error("Já existe uma mesa com este número");
        return;
      }
    }

    if (editMode && currentMesa) {
      const updatedMesas = mesas.map(m =>
        m.id === currentMesa.id
          ? { ...m, nome: mesaNome || `Mesa ${numero}`, numero }
          : m
      );
      saveMesas(updatedMesas);
      toast.success("Mesa atualizada!");
    } else {
      const newMesa = {
        id: `mesa-${Date.now()}`,
        numero,
        nome: mesaNome || `Mesa ${numero}`,
        status: "fechada",
        items: [],
        total: 0,
        cliente: "",
        comanda: null
      };
      saveMesas([...mesas, newMesa]);
      toast.success("Mesa criada!");
    }

    setMesaDialogOpen(false);
  };

  const handleDeleteMesa = (mesa) => {
    setMesaToDelete(mesa);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (mesaToDelete) {
      saveMesas(mesas.filter(m => m.id !== mesaToDelete.id));
      toast.success("Mesa deletada!");
    }
    setDeleteDialogOpen(false);
    setMesaToDelete(null);
  };

  // Tela de Vendas
  const handleMesaClick = async (mesa) => {
    setSelectedMesa(mesa);
    setCart(mesa.items || []);
    setClienteNome(mesa.cliente || "");
    setMesaVendasOpen(true);
    
    // Carregar produtos
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/products/for-sale`, getAuthHeader()),
        axios.get(`${API}/categories`, getAuthHeader())
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const closeMesaVendas = () => {
    setMesaVendasOpen(false);
    setSelectedMesa(null);
    setCart([]);
    setClienteNome("");
    setSelectedCategory("all");
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
    setIsEditingPrice(false);
    setImageError(false);
    setProductPopupOpen(true);
  };

  const closeProductPopup = () => {
    setProductPopupOpen(false);
    setSelectedProduct(null);
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
    
    if (productToAdd.observation) {
      setCart([...cart, productToAdd]);
    } else {
      const existingItem = cart.find(item => item.id === selectedProduct.id && !item.observation);
      if (existingItem) {
        setCart(cart.map(item =>
          item.id === selectedProduct.id && !item.observation
            ? { ...item, quantity: item.quantity + productQuantity }
            : item
        ));
      } else {
        setCart([...cart, productToAdd]);
      }
    }
    
    toast.success(`${selectedProduct.name} adicionado!`);
    closeProductPopup();
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(cart.map(item => {
      if ((item.cartItemId || item.id) === cartItemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartItemId) => {
    setCart(cart.filter(item => (item.cartItemId || item.id) !== cartItemId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.sale_price || 0) * item.quantity, 0);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  const handleSaveMesaVendas = () => {
    if (!selectedMesa) return;
    
    const updatedMesa = {
      ...selectedMesa,
      status: cart.length > 0 ? "aberta" : "fechada",
      items: cart,
      total: cartTotal,
      cliente: clienteNome,
      comanda: selectedMesa.comanda || String(Date.now()).slice(-6)
    };
    
    const updatedMesas = mesas.map(m =>
      m.id === updatedMesa.id ? updatedMesa : m
    );
    saveMesas(updatedMesas);
    toast.success("Mesa atualizada!");
    closeMesaVendas();
  };

  // Pagamento
  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error("Nenhum item na mesa!");
      return;
    }
    setPaymentDialogOpen(true);
  };

  const confirmPayment = () => {
    if (!selectedPayment) {
      toast.error("Selecione uma forma de pagamento!");
      return;
    }

    toast.success(`Venda de R$ ${cartTotal.toFixed(2)} finalizada!`);
    
    const updatedMesa = {
      ...selectedMesa,
      status: "fechada",
      items: [],
      total: 0,
      cliente: "",
      comanda: null
    };
    
    const updatedMesas = mesas.map(m =>
      m.id === updatedMesa.id ? updatedMesa : m
    );
    saveMesas(updatedMesas);
    setPaymentDialogOpen(false);
    closeMesaVendas();
  };

  const change = selectedPayment === "dinheiro" && cashReceived
    ? parseFloat(cashReceived) - cartTotal
    : 0;

  const paymentMethods = [
    { id: "dinheiro", label: "Dinheiro", icon: Banknote, color: "bg-green-500" },
    { id: "credito", label: "Crédito", icon: CreditCard, color: "bg-blue-500" },
    { id: "debito", label: "Débito", icon: CreditCard, color: "bg-purple-500" },
    { id: "pix", label: "PIX", icon: QrCode, color: "bg-teal-500" },
  ];

  // Se tela de vendas está aberta, mostrar ela
  if (mesaVendasOpen && selectedMesa) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={closeMesaVendas}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Mesa {String(selectedMesa.numero).padStart(2, '0')}</h2>
              <p className="text-sm text-muted-foreground">{selectedMesa.nome}</p>
            </div>
          </div>
          <Input
            placeholder="Nome do cliente"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            className="w-48"
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Área de Produtos */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filtro de Categorias */}
            <div className="p-3 border-b">
              <div className="flex gap-2 overflow-x-auto">
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
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => openProductPopup(product)}
                      className="bg-card rounded-lg border p-3 hover:shadow-md hover:border-primary/50 transition-all text-left"
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
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-primary font-bold">R$ {(product.sale_price || 0).toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Carrinho da Mesa */}
          <div className="w-80 flex flex-col border-l bg-muted/20">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Pedido</h3>
                <span className="text-sm text-muted-foreground">({cartItemsCount} itens)</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhum item</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.cartItemId || item.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
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
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.cartItemId || item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.cartItemId || item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.cartItemId || item.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total e Botões */}
            <div className="p-4 border-t bg-background">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleSaveMesaVendas}>
                  Salvar
                </Button>
                <Button onClick={handlePayment} disabled={cart.length === 0}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog de Produto */}
        <Dialog open={productPopupOpen} onOpenChange={setProductPopupOpen}>
          <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={closeProductPopup} className="rounded-full p-2 bg-background/80 hover:bg-background border shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedProduct && (
              <>
                <div className="p-6">
                  <div className="flex gap-6 mb-6">
                    <div className="w-44 h-44 rounded-xl bg-muted overflow-hidden flex-shrink-0 border shadow-sm">
                      {selectedProduct.photo_url && !imageError ? (
                        <img
                          src={`${BACKEND_URL}/api${selectedProduct.photo_url}`}
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          <ImageOff className="w-12 h-12" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-1">{selectedProduct.name}</h2>
                      {selectedProduct.description && (
                        <p className="text-muted-foreground text-sm mb-4">{selectedProduct.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {isEditingPrice ? (
                          <div className="flex items-center gap-2">
                            <span className="text-primary text-xl">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={productPrice}
                              onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                              onBlur={() => setIsEditingPrice(false)}
                              autoFocus
                              className="w-28 h-10 text-xl font-bold text-primary"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsEditingPrice(true)}
                            className="flex items-center gap-1 text-2xl font-bold text-primary hover:opacity-80"
                          >
                            R$ {productPrice.toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">✏️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <Label className="text-base font-medium mb-2 block">Alguma observação?</Label>
                    <Textarea
                      value={productObservation}
                      onChange={(e) => setProductObservation(e.target.value)}
                      placeholder="Ex: tirar cebola, maionese à parte, etc..."
                      className="resize-none"
                      maxLength={255}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">{productObservation.length} / 255</p>
                  </div>
                </div>

                <div className="border-t bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-background rounded-full border p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                        disabled={productQuantity <= 1}
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <span className="w-10 text-center text-xl font-bold">{productQuantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() => setProductQuantity(productQuantity + 1)}
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>

                    <Button
                      onClick={addProductToCart}
                      className="flex-1 h-14 text-lg font-bold rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                    >
                      <ShoppingBasket className="w-6 h-6 mr-2" />
                      Adicionar R$ {(productPrice * productQuantity).toFixed(2)}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Pagamento */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Forma de Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-3xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`
                        p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                        ${selectedPayment === method.id
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent bg-muted hover:border-muted-foreground/30'
                        }
                      `}
                    >
                      <div className={`p-2 rounded-lg ${method.color} text-white`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {selectedPayment === "dinheiro" && (
                <div className="space-y-2">
                  <Label>Valor Recebido</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="h-12 text-lg"
                  />
                  {cashReceived && parseFloat(cashReceived) >= cartTotal && (
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Troco</p>
                      <p className="text-xl font-bold text-green-600">R$ {change.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full h-12 text-lg"
                onClick={confirmPayment}
                disabled={!selectedPayment || (selectedPayment === "dinheiro" && (!cashReceived || parseFloat(cashReceived) < cartTotal))}
              >
                Confirmar Pagamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Tela principal de Mesas
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mesas</h1>
        <p className="text-muted-foreground mt-1">Gerencie as mesas do seu estabelecimento</p>
      </div>

      {/* Barra de Pesquisa e Ações */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por número, comanda ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreateMesa}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {/* Mesas Abertas */}
      {mesasAbertas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            Mesas Abertas ({mesasAbertas.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mesasAbertas.map(mesa => (
              <MesaCard
                key={mesa.id}
                mesa={mesa}
                onClick={handleMesaClick}
                onEdit={handleEditMesa}
                onDelete={handleDeleteMesa}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mesas Fechadas */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
          Mesas Disponíveis ({mesasFechadas.length})
        </h2>
        {mesasFechadas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Todas as mesas estão ocupadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mesasFechadas.map(mesa => (
              <MesaCard
                key={mesa.id}
                mesa={mesa}
                onClick={handleMesaClick}
                onEdit={handleEditMesa}
                onDelete={handleDeleteMesa}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog Criar/Editar Mesa */}
      <Dialog open={mesaDialogOpen} onOpenChange={setMesaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Mesa" : "Nova Mesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Número da Mesa</Label>
              <Input
                type="number"
                value={mesaNumero}
                onChange={(e) => setMesaNumero(e.target.value)}
                placeholder="Ex: 1"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nome (opcional)</Label>
              <Input
                value={mesaNome}
                onChange={(e) => setMesaNome(e.target.value)}
                placeholder="Ex: Mesa VIP, Varanda..."
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveMesa} className="w-full">
              {editMode ? "Salvar" : "Criar Mesa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a mesa {mesaToDelete?.numero}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
