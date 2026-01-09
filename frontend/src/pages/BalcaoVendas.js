import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, ImageOff, ShoppingBasket } from "lucide-react";
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

// URL relativa - funciona em qualquer domínio
const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// Componente de card do produto com gerenciamento de erro de imagem via estado React
function ProductCard({ product, onClick }) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={() => onClick(product)}
      className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all text-left group"
    >
      {/* Imagem do produto */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {product.photo_url && !imageError ? (
          <img
            src={`${BACKEND_URL}/api${product.photo_url}`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
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
  );
}

// Popup de Produto (estilo similar ao da imagem)
function ProductPopup({ product, open, onClose, onAddToCart }) {
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [customPrice, setCustomPrice] = useState(product?.sale_price || 0);
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  // Reset quando abrir com novo produto
  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setObservation("");
      setCustomPrice(product.sale_price || 0);
      setIsEditingPrice(false);
      setImageError(false);
    }
  }, [open, product]);

  if (!product) return null;

  const totalPrice = customPrice * quantity;

  const handleAdd = () => {
    onAddToCart({
      ...product,
      sale_price: customPrice,
      quantity,
      observation: observation.trim() || null
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header com X */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="rounded-full p-2 bg-background/80 hover:bg-background border shadow-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Foto e Info lado a lado */}
          <div className="flex gap-6 mb-6">
            {/* Foto Grande */}
            <div className="w-44 h-44 rounded-xl bg-muted overflow-hidden flex-shrink-0 border shadow-sm">
              {product.photo_url && !imageError ? (
                <img
                  src={`${BACKEND_URL}/api${product.photo_url}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="w-12 h-12" />
                  <span className="text-xs mt-2">Sem foto</span>
                </div>
              )}
            </div>

            {/* Info do Produto */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
              {product.description && (
                <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
              )}
              
              {/* Preço editável */}
              <div className="flex items-center gap-2">
                {isEditingPrice ? (
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-xl">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                      onBlur={() => setIsEditingPrice(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingPrice(false)}
                      autoFocus
                      className="w-28 h-10 text-xl font-bold text-primary"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPrice(true)}
                    className="flex items-center gap-1 text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
                  >
                    R$ {customPrice.toFixed(2)}
                    <span className="text-xs text-muted-foreground ml-1">✏️</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Campo de Observação */}
          <div className="mb-6">
            <Label className="text-base font-medium mb-2 block">Alguma observação?</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: tirar cebola, maionese à parte, etc..."
              className="resize-none"
              maxLength={255}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {observation.length} / 255
            </p>
          </div>
        </div>

        {/* Footer Fixo - Quantidade e Botão Adicionar */}
        <div className="border-t bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Controle de Quantidade */}
            <div className="flex items-center gap-1 bg-background rounded-full border p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full hover:bg-muted"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <span className="w-10 text-center text-xl font-bold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full hover:bg-muted"
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
              <ShoppingBasket className="w-6 h-6 mr-2" />
              Adicionar  R$ {totalPrice.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BalcaoVendas() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Estado do popup de produto
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productPopupOpen, setProductPopupOpen] = useState(false);

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

  // Abrir popup do produto
  const openProductPopup = (product) => {
    setSelectedProduct(product);
    setProductPopupOpen(true);
  };

  // Adicionar ao carrinho (com suporte a quantidade e observação)
  const addToCart = (productWithDetails) => {
    const { quantity = 1, observation = null, ...product } = productWithDetails;
    
    // Se tiver observação, sempre adiciona como novo item
    if (observation) {
      setCart([...cart, { ...product, quantity, observation, cartItemId: Date.now() }]);
      toast.success(`${product.name} adicionado!`);
      return;
    }
    
    // Sem observação, verifica se já existe item igual
    const existingItem = cart.find(item => item.id === product.id && !item.observation);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id && !item.observation
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity, cartItemId: Date.now() }]);
    }
    toast.success(`${product.name} adicionado!`);
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
                <ProductCard key={product.id} product={product} onClick={openProductPopup} />
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
                <div key={item.cartItemId || item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
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
                    {item.observation && (
                      <p className="text-xs text-orange-500 truncate">📝 {item.observation}</p>
                    )}
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
                      onClick={() => updateQuantity(item.cartItemId || item.id, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.cartItemId || item.id, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Remover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(item.cartItemId || item.id)}
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

      {/* Popup de Produto */}
      <ProductPopup
        product={selectedProduct}
        open={productPopupOpen}
        onClose={() => {
          setProductPopupOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={addToCart}
      />
    </div>
  );
}
