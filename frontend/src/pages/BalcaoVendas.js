import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, ImageOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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

export default function BalcaoVendas() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/products/for-sale`, getAuthHeader());
      setProducts(response.data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, getAuthHeader());
      setCategories(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} adicionado!`);
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    toast.info("Carrinho limpo");
  };

  const cartTotal = cart.reduce((total, item) => total + (item.sale_price || 0) * item.quantity, 0);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }
    setPaymentDialogOpen(true);
    setSelectedPayment(null);
    setCashReceived("");
  };

  const confirmPayment = () => {
    if (!selectedPayment) {
      toast.error("Selecione uma forma de pagamento!");
      return;
    }

    // Aqui seria a integração com o backend para registrar a venda
    toast.success(`Venda de R$ ${cartTotal.toFixed(2)} finalizada com ${selectedPayment}!`);
    setCart([]);
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
    setCashReceived("");
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

  return (
    <div className="flex h-full">
      {/* Área de Produtos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filtro de Categorias */}
        <div className="p-4 border-b bg-card">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.name ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.name)}
                className="whitespace-nowrap"
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
              <div className="text-muted-foreground">Carregando produtos...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ImageOff className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">Nenhum produto disponível</p>
              <p className="text-muted-foreground text-sm mt-1">
                Cadastre produtos na aba "Produtos" do menu lateral
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all text-left group"
                >
                  {/* Imagem do produto */}
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {product.photo_url ? (
                      <img
                        src={`${BACKEND_URL}/api${product.photo_url}`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ImageOff className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  {/* Info do produto */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                    {product.category && (
                      <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                    )}
                    <p className="text-lg font-bold text-primary">
                      {product.sale_price ? `R$ ${product.sale_price.toFixed(2)}` : "Sem preço"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carrinho - Lateral Direita */}
      <div className="w-96 border-l bg-card flex flex-col">
        {/* Header do Carrinho */}
        <div className="p-4 border-b flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">Carrinho</h2>
            <p className="text-sm text-muted-foreground">{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}</p>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Itens do Carrinho */}
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground mt-1">Clique em um produto para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {/* Mini imagem */}
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.photo_url ? (
                      <img
                        src={`${BACKEND_URL}/api${item.photo_url}`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-sm text-primary font-bold">
                      R$ {((item.sale_price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  {/* Controles de quantidade */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Remover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer do Carrinho - Total e Pagamento */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium">Total</span>
            <span className="text-2xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
          </div>
          <Button
            className="w-full h-12 text-lg font-semibold"
            disabled={cart.length === 0}
            onClick={handlePayment}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Finalizar Venda
          </Button>
        </div>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Total */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-3xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</p>
            </div>

            {/* Métodos de pagamento */}
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

            {/* Campo de valor recebido para dinheiro */}
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

            {/* Botão de confirmar */}
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
