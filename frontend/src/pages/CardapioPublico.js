import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, ShoppingBag, Plus, Minus, Trash2, X, Clock, Star, ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import LoginModal from "../components/LoginModal";
import ProfileMenu from "../components/ProfileMenu";

const API = '/api';

// Ícone do motoboy/entregador
const DeliveryIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 9.5c-.17 0-.34.02-.5.05V7c0-.55-.45-1-1-1h-3V4.5C15 3.67 14.33 3 13.5 3S12 3.67 12 4.5V6H9C8.45 6 8 6.45 8 7v2.55c-.16-.03-.33-.05-.5-.05C5.46 9.5 4 11.96 4 14v2c0 1.1.9 2 2 2h1c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h1c1.1 0 2-.9 2-2v-2c0-2.04-1.46-4.5-3.5-4.5zM10 19c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
  </svg>
);

export default function CardapioPublico({ onAdminLogin }) {
  // Estados
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  
  // Verificar se há cliente logado
  const [loggedClient, setLoggedClient] = useState(null);

  // Carregar dados do cliente logado e preferência de tema
  useEffect(() => {
    const client = localStorage.getItem("client");
    if (client) {
      try {
        setLoggedClient(JSON.parse(client));
      } catch (e) {}
    }
    
    // Carregar preferência de tema
    const savedTheme = localStorage.getItem("cardapio_theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    }
  }, []);

  // Função para alternar tema
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("cardapio_theme", newMode ? "dark" : "light");
  };

  // Carregar produtos e categorias
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      const publicProducts = response.data.filter(p => 
        p.sale_price && p.sale_price > 0 && !p.is_insumo
      );
      setProducts(publicProducts);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  // Categorias que têm produtos
  const categoriesWithProducts = useMemo(() => {
    const categorySet = new Set(products.map(p => p.category).filter(Boolean));
    return categories.filter(cat => categorySet.has(cat.name));
  }, [categories, products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // Produtos agrupados por categoria
  const productsByCategory = useMemo(() => {
    const grouped = {};
    filteredProducts.forEach(product => {
      const cat = product.category || "Outros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  // Funções do carrinho
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado!`);
    setCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Scroll das categorias
  const scrollCategories = (direction) => {
    const container = document.getElementById('categories-scroll');
    if (container) {
      container.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  };

  // Handle login success
  const handleLoginSuccess = (type, userData) => {
    if (type === "admin") {
      // Admin logou - redirecionar para dashboard
      if (onAdminLogin) {
        onAdminLogin(userData);
      }
    } else {
      // Cliente logou
      setLoggedClient(userData);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setLoggedClient(null);
  };

  // Handle client update
  const handleClientUpdate = (updatedClient) => {
    setLoggedClient(updatedClient);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header Fixo */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-lg">Cardápio</span>
          </div>
          
          {/* Botão Entrar ou Menu de Perfil */}
          {loggedClient ? (
            <ProfileMenu 
              client={loggedClient} 
              onLogout={handleLogout}
              onClientUpdate={handleClientUpdate}
            />
          ) : (
            <Button 
              onClick={() => setShowLoginModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6"
            >
              ENTRAR
            </Button>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-4">
          <div className="flex items-start gap-4 max-w-7xl mx-auto">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <img 
                src="/logo-nucleo.png" 
                alt="Logo" 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-orange-500 font-bold text-2xl">N</span>';
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Núcleo Restaurante</h1>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">5.0</span>
                </div>
              </div>
              <p className="text-white/80 text-sm">O melhor da culinária</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white/90">Aberto agora</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-white/80">
                  <Clock className="w-3 h-3" />
                  <span>Fecha às 23:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 bg-zinc-900 max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              type="text"
              placeholder="Busque pelo nome do Produto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        {categoriesWithProducts.length > 0 && (
          <div className="relative px-4 py-2 bg-zinc-900 border-t border-zinc-800">
            <div className="flex items-center gap-2 max-w-7xl mx-auto">
              <button onClick={() => scrollCategories('left')} className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div id="categories-scroll" className="flex-1 overflow-x-auto scrollbar-hide flex gap-2" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${!selectedCategory ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                >
                  TODOS
                </button>
                {categoriesWithProducts.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all uppercase ${selectedCategory === cat.name ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <button onClick={() => scrollCategories('right')} className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Products Grid */}
        <main className={`flex-1 p-4 transition-all duration-300 ${cartOpen ? 'mr-80' : ''}`}>
          <div className="max-w-7xl mx-auto">
            {Object.keys(productsByCategory).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">Nenhum produto encontrado</h3>
                <p className="text-zinc-500 text-center max-w-md">
                  {searchTerm ? `Não encontramos produtos com "${searchTerm}"` : "Ainda não há produtos cadastrados no cardápio"}
                </p>
              </div>
            ) : (
              Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} className="mb-8">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-orange-500 uppercase">{category}</h2>
                    <p className="text-zinc-500 text-sm">Confira nossos deliciosos produtos</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {categoryProducts.map(product => (
                      <div key={product.id} className="bg-zinc-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-orange-500/50 transition-all group">
                        <div className="aspect-square bg-zinc-700 relative overflow-hidden">
                          {product.photo_url ? (
                            <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🍽️</span></div>
                          )}
                          <button onClick={() => addToCart(product)} className="absolute bottom-2 right-2 w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100">
                            <Plus className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{product.name}</h3>
                          {product.description && <p className="text-zinc-400 text-xs mb-2 line-clamp-2">{product.description}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-orange-500 font-bold">R$ {product.sale_price?.toFixed(2).replace('.', ',')}</span>
                            <button onClick={() => addToCart(product)} className="text-xs bg-zinc-700 hover:bg-orange-500 px-3 py-1 rounded-full transition-colors">Adicionar</button>
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

        {/* Cart Sidebar */}
        <aside className={`fixed right-0 top-0 h-full w-80 bg-zinc-800 border-l border-zinc-700 flex flex-col transition-transform duration-300 z-50 ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <DeliveryIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">BAG DO ENTREGADOR</h3>
                <p className="text-xs text-zinc-400">{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}</p>
              </div>
            </div>
            <button onClick={() => setCartOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-16 h-16 text-zinc-600 mb-4" />
                <p className="text-zinc-400 mb-2">Sua sacola está vazia</p>
                <p className="text-zinc-500 text-sm">Adicione produtos para continuar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="bg-zinc-900 rounded-lg p-3">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-zinc-700 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.photo_url ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-2xl">🍽️</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm truncate">{item.name}</h4>
                        <p className="text-orange-500 font-semibold text-sm mt-1">R$ {(item.sale_price * item.quantity).toFixed(2).replace('.', ',')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <span className="text-white font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-red-500/20 hover:bg-red-500/30 rounded flex items-center justify-center ml-auto"><Trash2 className="w-3 h-3 text-red-400" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-700 bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400">Total</span>
              <span className="text-2xl font-bold text-orange-500">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <Button 
              onClick={() => {
                if (!loggedClient) {
                  setShowLoginModal(true);
                } else {
                  toast.success("Pedido em desenvolvimento!");
                }
              }}
              disabled={cart.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 disabled:opacity-50"
            >
              {cart.length === 0 ? 'Adicione itens para continuar' : 'Fazer Pedido'}
            </Button>
          </div>
        </aside>
      </div>

      {/* Cart Toggle Button */}
      <button
        onClick={() => setCartOpen(!cartOpen)}
        className={`fixed bottom-4 right-4 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-orange-600 transition-colors ${cartOpen ? 'hidden' : ''}`}
      >
        <ShoppingBag className="w-6 h-6 text-white" />
        {cartItemsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">{cartItemsCount}</span>
        )}
      </button>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
