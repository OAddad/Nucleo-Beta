import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, ShoppingBag, Plus, Minus, Trash2, X, Clock, Star, ChevronLeft, ChevronRight, User, ImageOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { toast } from "sonner";
import LoginModal from "../components/LoginModal";
import ProfileMenu from "../components/ProfileMenu";

const API = '/api';

// Ícone de Moto para a BAG
const MotoIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h1.65l2.77-2.77c-.21.54-.32 1.14-.32 1.77 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.65-1.97-4.77-4.56-4.97zM7.82 15C7.4 16.15 6.28 17 5 17c-1.63 0-3-1.37-3-3s1.37-3 3-3c1.28 0 2.4.85 2.82 2H5v2h2.82zM19 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
  </svg>
);

// Função para obter URL completa de imagem
// Usa /api/uploads para passar pelo proxy do Kubernetes
const getImageUrl = (url) => {
  if (!url) return null;
  // Se já é uma URL completa (http/https), retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Se é uma URL de uploads (/uploads/products/xxx), converte para /api/uploads/products/xxx
  if (url.startsWith('/uploads/')) {
    return `/api${url}`;
  }
  // Outros casos, retorna como está
  return url;
};

// Função helper para fazer requests com fallback
const fetchWithFallback = async (endpoint) => {
  try {
    const response = await axios.get(`${API}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

// Popup de Produto para adicionar ao carrinho
function ProductPopup({ product, open, onClose, onAddToCart, darkMode }) {
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");

  // Reset quando abrir com novo produto
  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setObservation("");
      setImageError(false);
    }
  }, [open, product]);

  if (!product) return null;

  const totalPrice = (product.sale_price || 0) * quantity;

  const handleAdd = () => {
    onAddToCart({
      ...product,
      quantity,
      observation: observation.trim() || null
    });
    onClose();
  };

  const t = {
    bg: darkMode ? 'bg-zinc-900' : 'bg-white',
    bgMuted: darkMode ? 'bg-zinc-800' : 'bg-gray-100',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    border: darkMode ? 'border-zinc-700' : 'border-gray-200',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-lg p-0 gap-0 overflow-hidden ${t.bg} ${t.text} border-0`}>
        {/* Header com X */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className={`rounded-full p-2 ${t.bgMuted} hover:opacity-80 transition-opacity shadow-sm`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Foto e Info lado a lado */}
          <div className="flex gap-6 mb-6">
            {/* Foto Grande */}
            <div className={`w-40 h-40 rounded-xl ${t.bgMuted} overflow-hidden flex-shrink-0 shadow-sm`}>
              {product.photo_url && !imageError ? (
                <img
                  src={getImageUrl(product.photo_url)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center ${t.textMuted}`}>
                  <ImageOff className="w-12 h-12" />
                  <span className="text-xs mt-2">Sem foto</span>
                </div>
              )}
            </div>

            {/* Info do Produto */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
              {product.description && (
                <p className={`${t.textMuted} text-sm mb-4 line-clamp-3`}>{product.description}</p>
              )}
              
              {/* Preço */}
              <div className="text-2xl font-bold text-orange-500">
                R$ {(product.sale_price || 0).toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>

          {/* Campo de Observação */}
          <div className="mb-6">
            <Label className={`text-base font-medium mb-2 block ${t.text}`}>Alguma observação?</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: tirar cebola, maionese à parte, etc..."
              className={`resize-none ${t.bgMuted} ${t.text} ${t.border} border focus:ring-orange-500`}
              maxLength={255}
              rows={3}
            />
            <p className={`text-xs ${t.textMuted} text-right mt-1`}>
              {observation.length} / 255
            </p>
          </div>
        </div>

        {/* Footer Fixo - Quantidade e Botão Adicionar */}
        <div className={`border-t ${t.border} ${t.bgMuted} p-4`}>
          <div className="flex items-center justify-between gap-4">
            {/* Controle de Quantidade */}
            <div className={`flex items-center gap-1 ${t.bg} rounded-full border ${t.border} p-1`}>
              <Button
                variant="ghost"
                size="icon"
                className={`h-12 w-12 rounded-full hover:${t.bgMuted}`}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <span className="w-10 text-center text-xl font-bold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className={`h-12 w-12 rounded-full hover:${t.bgMuted}`}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Botão Adicionar Grande */}
            <Button
              onClick={handleAdd}
              className="flex-1 h-14 text-lg font-bold rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
            >
              <ShoppingBag className="w-6 h-6 mr-2" />
              Adicionar  R$ {totalPrice.toFixed(2).replace('.', ',')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CardapioPublico({ onAdminLogin }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [loggedClient, setLoggedClient] = useState(null);
  // Estado do popup de produto
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productPopupOpen, setProductPopupOpen] = useState(false);

  // Abrir popup do produto
  const openProductPopup = (product) => {
    setSelectedProduct(product);
    setProductPopupOpen(true);
  };

  useEffect(() => {
    const client = localStorage.getItem("client");
    if (client) {
      try { setLoggedClient(JSON.parse(client)); } catch (e) {}
    }
    const savedTheme = localStorage.getItem("cardapio_theme");
    if (savedTheme) setDarkMode(savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("cardapio_theme", newMode ? "dark" : "light");
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBusinessHours();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await fetchWithFallback('/public/products');
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithFallback('/public/categories');
      setCategories(data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const fetchBusinessHours = async () => {
    try {
      const data = await fetchWithFallback('/public/business-hours');
      setBusinessHours(data);
    } catch (error) {
      console.error("Erro ao carregar horários:", error);
    }
  };

  // Função para verificar se está aberto agora (com suporte a múltiplos períodos)
  const getOpenStatus = () => {
    if (businessHours.length === 0) return { isOpen: true, closingTime: '23:59', nextOpenTime: null };
    
    const now = new Date();
    // JavaScript: 0=Domingo, 1=Segunda... precisamos converter para nosso formato (0=Segunda, 6=Domingo)
    let dayOfWeek = now.getDay() - 1;
    if (dayOfWeek < 0) dayOfWeek = 6; // Domingo
    
    const todayHours = businessHours.find(h => h.day_of_week === dayOfWeek);
    
    if (!todayHours || !todayHours.is_open) {
      return { isOpen: false, closingTime: null, nextOpenTime: null, todayHours };
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Converter horários para minutos
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const openTime1 = parseTime(todayHours.opening_time);
    const closeTime1 = parseTime(todayHours.closing_time);
    
    // Verificar primeiro período
    let inFirstPeriod = currentTime >= openTime1 && currentTime < closeTime1;
    
    // Se tem segundo período
    if (todayHours.has_second_period) {
      const openTime2 = parseTime(todayHours.opening_time_2);
      const closeTime2 = parseTime(todayHours.closing_time_2);
      
      // Verificar segundo período
      const inSecondPeriod = currentTime >= openTime2 && currentTime < closeTime2;
      
      if (inFirstPeriod) {
        return { isOpen: true, closingTime: todayHours.closing_time, nextOpenTime: todayHours.opening_time_2, todayHours };
      }
      
      if (inSecondPeriod) {
        return { isOpen: true, closingTime: todayHours.closing_time_2, nextOpenTime: null, todayHours };
      }
      
      // Está no intervalo entre os dois períodos
      if (currentTime >= closeTime1 && currentTime < openTime2) {
        return { isOpen: false, closingTime: null, nextOpenTime: todayHours.opening_time_2, todayHours };
      }
      
      // Ainda não abriu hoje
      if (currentTime < openTime1) {
        return { isOpen: false, closingTime: null, nextOpenTime: todayHours.opening_time, todayHours };
      }
      
      // Já fechou
      return { isOpen: false, closingTime: null, nextOpenTime: null, todayHours };
    }
    
    // Só tem um período
    if (inFirstPeriod) {
      return { isOpen: true, closingTime: todayHours.closing_time, nextOpenTime: null, todayHours };
    }
    
    // Ainda não abriu
    if (currentTime < openTime1) {
      return { isOpen: false, closingTime: null, nextOpenTime: todayHours.opening_time, todayHours };
    }
    
    // Já fechou
    return { isOpen: false, closingTime: null, nextOpenTime: null, todayHours };
  };

  const { isOpen, closingTime, nextOpenTime, todayHours } = getOpenStatus();

  const categoriesWithProducts = useMemo(() => {
    const categorySet = new Set(products.map(p => p.category).filter(Boolean));
    return categories.filter(cat => categorySet.has(cat.name));
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) filtered = filtered.filter(p => p.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term)));
    }
    return filtered;
  }, [products, selectedCategory, searchTerm]);

  const productsByCategory = useMemo(() => {
    const grouped = {};
    filteredProducts.forEach(product => {
      const cat = product.category || "Outros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado!`);
    setCartOpen(true);
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.id !== productId));

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0), [cart]);
  const cartItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const scrollCategories = (direction) => {
    const container = document.getElementById('categories-scroll');
    if (container) container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const handleLoginSuccess = (type, userData) => {
    if (type === "admin" && onAdminLogin) onAdminLogin(userData);
    else setLoggedClient(userData);
  };

  const handleLogout = () => setLoggedClient(null);
  const handleClientUpdate = (updatedClient) => setLoggedClient(updatedClient);

  // Classes de tema
  const t = {
    bg: darkMode ? 'bg-zinc-900' : 'bg-gray-50',
    bgCard: darkMode ? 'bg-zinc-800' : 'bg-white',
    bgHeader: darkMode ? 'bg-zinc-950' : 'bg-white border-b border-gray-100',
    bgInput: darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-300',
    bgMuted: darkMode ? 'bg-zinc-700' : 'bg-gray-100',
    bgCart: darkMode ? 'bg-zinc-800' : 'bg-white',
    bgCartItem: darkMode ? 'bg-zinc-900' : 'bg-gray-50',
    border: darkMode ? 'border-zinc-700' : 'border-gray-200',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    textMuted2: darkMode ? 'text-zinc-500' : 'text-gray-400',
    btnCat: darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${t.bg}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className={t.textMuted}>Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.bg} ${t.text}`}>
      {/* Header */}
      <header className={`${t.bg} border-b ${t.border} sticky top-0 z-40`}>
        <div className={`flex items-center justify-between px-4 py-2 ${t.bgHeader}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-lg">Cardápio</span>
          </div>
          
          {loggedClient ? (
            <ProfileMenu client={loggedClient} onLogout={handleLogout} onClientUpdate={handleClientUpdate} darkMode={darkMode} onToggleTheme={toggleTheme} />
          ) : (
            <Button onClick={() => setShowLoginModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6">ENTRAR</Button>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-4">
          <div className="flex items-start gap-4 max-w-7xl mx-auto">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <img src="/logo-nucleo.png" alt="Logo" className="w-12 h-12 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-orange-500 font-bold text-2xl">N</span>'; }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Núcleo Restaurante</h1>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-xs font-medium">5.0</span>
                </div>
              </div>
              <p className="text-white/80 text-sm">O melhor da culinária</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="text-white/90">{isOpen ? 'Aberto agora' : 'Fechado'}</span>
                </div>
                {isOpen && closingTime && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <Clock className="w-3 h-3" />
                    <span>Fecha às {closingTime}</span>
                  </div>
                )}
                {!isOpen && todayHours && todayHours.is_open && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <Clock className="w-3 h-3" />
                    <span>Abre às {todayHours.opening_time}</span>
                  </div>
                )}
                {!isOpen && (!todayHours || !todayHours.is_open) && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <Clock className="w-3 h-3" />
                    <span>Fechado hoje</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className={`px-4 py-3 ${t.bg} max-w-7xl mx-auto`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${t.textMuted2}`} />
            <Input type="text" placeholder="Busque pelo nome do Produto" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-10 ${t.bgInput} ${t.text} placeholder:${t.textMuted2} h-11`} />
            {searchTerm && <button onClick={() => setSearchTerm("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted2} hover:${t.text}`}><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* Categories */}
        {categoriesWithProducts.length > 0 && (
          <div className={`relative px-4 py-2 ${t.bg} border-t ${t.border}`}>
            <div className="flex items-center gap-2 max-w-7xl mx-auto">
              <button onClick={() => scrollCategories('left')} className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${t.bgCard} rounded-lg hover:opacity-80 ${t.border} border`}><ChevronLeft className="w-4 h-4" /></button>
              <div id="categories-scroll" className="flex-1 overflow-x-auto scrollbar-hide flex gap-2" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setSelectedCategory(null)} className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${!selectedCategory ? 'bg-orange-500 text-white' : t.btnCat}`}>TODOS</button>
                {categoriesWithProducts.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all uppercase ${selectedCategory === cat.name ? 'bg-orange-500 text-white' : t.btnCat}`}>{cat.name}</button>
                ))}
              </div>
              <button onClick={() => scrollCategories('right')} className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${t.bgCard} rounded-lg hover:opacity-80 ${t.border} border`}><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <div className="flex">
        <main className={`flex-1 p-4 transition-all duration-300 ${cartOpen ? 'mr-80' : ''}`}>
          <div className="max-w-7xl mx-auto">
            {Object.keys(productsByCategory).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className={`w-24 h-24 ${t.bgCard} rounded-full flex items-center justify-center mb-4`}><Search className={`w-10 h-10 ${t.textMuted2}`} /></div>
                <h3 className={`text-xl font-semibold ${t.textMuted} mb-2`}>Nenhum produto encontrado</h3>
                <p className={`${t.textMuted2} text-center max-w-md`}>{searchTerm ? `Não encontramos produtos com "${searchTerm}"` : "Ainda não há produtos cadastrados no cardápio"}</p>
              </div>
            ) : (
              Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} className="mb-8">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-orange-500 uppercase">{category}</h2>
                    <p className={`${t.textMuted2} text-sm`}>Confira nossos deliciosos produtos</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {categoryProducts.map(product => (
                      <div key={product.id} className={`${t.bgCard} rounded-xl overflow-hidden hover:ring-2 hover:ring-orange-500/50 transition-all group border ${t.border}`}>
                        <div className={`aspect-square ${t.bgMuted} relative overflow-hidden`}>
                          {product.photo_url ? <img src={getImageUrl(product.photo_url)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🍽️</span></div>}
                          <button onClick={() => addToCart(product)} className="absolute bottom-2 right-2 w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"><Plus className="w-5 h-5 text-white" /></button>
                        </div>
                        <div className="p-3">
                          <h3 className={`font-semibold ${t.text} text-sm mb-1 line-clamp-2`}>{product.name}</h3>
                          {product.description && <p className={`${t.textMuted} text-xs mb-2 line-clamp-2`}>{product.description}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-orange-500 font-bold">R$ {product.sale_price?.toFixed(2).replace('.', ',')}</span>
                            <button onClick={() => addToCart(product)} className={`text-xs ${t.bgMuted} hover:bg-orange-500 hover:text-white px-3 py-1 rounded-full transition-colors`}>Adicionar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {/* Cart */}
        <aside className={`fixed right-0 top-0 h-full w-80 ${t.bgCart} border-l ${t.border} flex flex-col transition-transform duration-300 z-50 ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className={`p-4 border-b ${t.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center"><MotoIcon className="w-6 h-6 text-white" /></div>
              <div><h3 className={`font-bold ${t.text}`}>BAG DO ENTREGADOR</h3><p className={`text-xs ${t.textMuted}`}>{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}</p></div>
            </div>
            <button onClick={() => setCartOpen(false)} className={`w-8 h-8 flex items-center justify-center rounded-lg hover:${t.bgMuted}`}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className={`w-16 h-16 ${t.textMuted2} mb-4`} /><p className={t.textMuted}>Sua sacola está vazia</p><p className={`${t.textMuted2} text-sm`}>Adicione produtos para continuar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className={`${t.bgCartItem} rounded-lg p-3`}>
                    <div className="flex gap-3">
                      <div className={`w-16 h-16 ${t.bgMuted} rounded-lg flex-shrink-0 overflow-hidden`}>
                        {item.photo_url ? <img src={getImageUrl(item.photo_url)} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-2xl">🍽️</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${t.text} text-sm truncate`}>{item.name}</h4>
                        <p className="text-orange-500 font-semibold text-sm mt-1">R$ {(item.sale_price * item.quantity).toFixed(2).replace('.', ',')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className={`w-7 h-7 ${t.bgMuted} rounded flex items-center justify-center hover:opacity-80`}><Minus className="w-3 h-3" /></button>
                          <span className={`${t.text} font-medium w-6 text-center`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className={`w-7 h-7 ${t.bgMuted} rounded flex items-center justify-center hover:opacity-80`}><Plus className="w-3 h-3" /></button>
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-red-500/20 hover:bg-red-500/30 rounded flex items-center justify-center ml-auto"><Trash2 className="w-3 h-3 text-red-400" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`p-4 border-t ${t.border} ${t.bgCartItem}`}>
            <div className="flex items-center justify-between mb-4"><span className={t.textMuted}>Total</span><span className="text-2xl font-bold text-orange-500">R$ {cartTotal.toFixed(2).replace('.', ',')}</span></div>
            <Button onClick={() => { if (!loggedClient) setShowLoginModal(true); else toast.success("Pedido em desenvolvimento!"); }} disabled={cart.length === 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 disabled:opacity-50">{cart.length === 0 ? 'Adicione itens para continuar' : 'Fazer Pedido'}</Button>
          </div>
        </aside>
      </div>

      {/* Cart Toggle */}
      <button onClick={() => setCartOpen(!cartOpen)} className={`fixed bottom-4 right-4 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-orange-600 transition-colors ${cartOpen ? 'hidden' : ''}`}>
        <ShoppingBag className="w-6 h-6 text-white" />
        {cartItemsCount > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white">{cartItemsCount}</span>}
      </button>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
