import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, ShoppingBag, Plus, Minus, Trash2, X, Clock, Star, ChevronLeft, ChevronRight, User, ImageOff, MapPin, Store, Truck, CreditCard, Banknote, QrCode, Check, Home, Building, Edit2 } from "lucide-react";
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

// Componente de Checkout (Endereço + Pagamento)
function CheckoutModal({ open, onClose, cart, cartTotal, client, darkMode, onOrderComplete }) {
  const [step, setStep] = useState(1); // 1 = Tipo entrega, 2 = Endereço (se delivery), 3 = Pagamento
  const [deliveryType, setDeliveryType] = useState(null); // 'pickup' ou 'delivery'
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Casa',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: ''
  });
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  // Estados para popup de troco
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [needsChange, setNeedsChange] = useState(null); // null = não respondeu, true = precisa, false = não precisa
  const [changeAmount, setChangeAmount] = useState('');

  // Reset quando abrir
  useEffect(() => {
    if (open && client) {
      setStep(1);
      setDeliveryType(null);
      setSelectedAddress(null);
      setPaymentMethod(null);
      setShowNewAddressForm(false);
      setShowChangeDialog(false);
      setNeedsChange(null);
      setChangeAmount('');
      fetchAddresses();
    }
  }, [open, client]);

  const fetchAddresses = async () => {
    if (!client?.id) return;
    setLoadingAddresses(true);
    try {
      const response = await axios.get(`${API}/client-addresses/${client.id}`);
      setAddresses(response.data);
      // Selecionar o endereço padrão
      const defaultAddr = response.data.find(a => a.is_default);
      if (defaultAddr) setSelectedAddress(defaultAddr.id);
    } catch (error) {
      console.error("Erro ao carregar endereços:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.endereco || !newAddress.bairro) {
      toast.error("Preencha o endereço e bairro");
      return;
    }
    setSavingAddress(true);
    try {
      const response = await axios.post(`${API}/client-addresses`, {
        client_id: client.id,
        ...newAddress,
        is_default: addresses.length === 0
      });
      setAddresses(prev => [response.data, ...prev]);
      setSelectedAddress(response.data.id);
      setShowNewAddressForm(false);
      setNewAddress({ label: 'Casa', endereco: '', numero: '', complemento: '', bairro: '', cep: '' });
      toast.success("Endereço salvo!");
    } catch (error) {
      toast.error("Erro ao salvar endereço");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSelectDeliveryType = (type) => {
    setDeliveryType(type);
    if (type === 'pickup') {
      setStep(3); // Pula direto para pagamento
    } else {
      setStep(2); // Vai para seleção de endereço
    }
  };

  const handleConfirmAddress = () => {
    if (!selectedAddress && !showNewAddressForm) {
      toast.error("Selecione um endereço ou cadastre um novo");
      return;
    }
    setStep(3);
  };

  // Quando seleciona forma de pagamento
  const handleSelectPayment = (method) => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setShowChangeDialog(true);
    }
  };

  // Confirmar troco e finalizar
  const handleConfirmChange = () => {
    if (needsChange && (!changeAmount || parseFloat(changeAmount) <= cartTotal)) {
      toast.error("Informe um valor maior que o total do pedido");
      return;
    }
    setShowChangeDialog(false);
    finalizeOrder();
  };

  const handleFinishOrder = () => {
    if (!paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }
    
    // Se for dinheiro e ainda não respondeu sobre troco
    if (paymentMethod === 'cash' && needsChange === null) {
      setShowChangeDialog(true);
      return;
    }
    
    finalizeOrder();
  };

  const finalizeOrder = async () => {
    const selectedAddr = addresses.find(a => a.id === selectedAddress);
    
    // Mapear forma de pagamento para o formato esperado
    const paymentMap = {
      'pix': 'pix',
      'credit': 'cartao',
      'debit': 'cartao',
      'cash': 'dinheiro'
    };

    // Criar pedido via API (banco de dados)
    const pedidoData = {
      cliente_id: client.id,
      cliente_nome: client.nome,
      cliente_telefone: client.telefone,
      cliente_email: client.email,
      items: cart.map(item => ({
        id: item.id,
        nome: item.name,
        quantidade: item.quantity,
        preco: item.sale_price,
        observacao: item.observation || null
      })),
      total: cartTotal,
      status: "producao",
      forma_pagamento: paymentMap[paymentMethod],
      troco_precisa: paymentMethod === 'cash' ? needsChange : false,
      troco_valor: paymentMethod === 'cash' && needsChange ? parseFloat(changeAmount) : null,
      tipo_entrega: deliveryType,
      endereco_label: deliveryType === 'delivery' && selectedAddr ? selectedAddr.label : null,
      endereco_rua: deliveryType === 'delivery' && selectedAddr ? selectedAddr.endereco : null,
      endereco_numero: deliveryType === 'delivery' && selectedAddr ? selectedAddr.numero : null,
      endereco_complemento: deliveryType === 'delivery' && selectedAddr ? selectedAddr.complemento : null,
      endereco_bairro: deliveryType === 'delivery' && selectedAddr ? selectedAddr.bairro : null,
      endereco_cep: deliveryType === 'delivery' && selectedAddr ? selectedAddr.cep : null,
      modulo: "Cardapio"
    };

    try {
      const response = await axios.post(`${API}/pedidos`, pedidoData);
      const newPedido = response.data;
      
      // Disparar evento para atualizar outras abas/componentes
      window.dispatchEvent(new Event('pedidosUpdated'));

      toast.success(`Pedido ${newPedido.codigo} realizado com sucesso! 🎉`);
      onOrderComplete(newPedido);
      onClose();
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido. Tente novamente.");
    }
  };

  const t = {
    bg: darkMode ? 'bg-zinc-900' : 'bg-white',
    bgCard: darkMode ? 'bg-zinc-800' : 'bg-gray-50',
    bgMuted: darkMode ? 'bg-zinc-800' : 'bg-gray-100',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    border: darkMode ? 'border-zinc-700' : 'border-gray-200',
    input: darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900',
  };

  const paymentMethods = [
    { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-teal-500' },
    { id: 'credit', label: 'Cartão de Crédito', icon: CreditCard, color: 'text-blue-500' },
    { id: 'debit', label: 'Cartão de Débito', icon: CreditCard, color: 'text-purple-500' },
    { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-green-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-lg p-0 gap-0 overflow-hidden ${t.bg} ${t.text} border-0 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button 
                onClick={() => setStep(step === 3 && deliveryType === 'pickup' ? 1 : step - 1)} 
                className="text-white hover:bg-white/20 p-1 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <h2 className="text-xl font-bold text-white">
              {step === 1 && "Tipo de Entrega"}
              {step === 2 && "Endereço de Entrega"}
              {step === 3 && "Forma de Pagamento"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 border-b border-orange-200/20">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= s ? 'bg-orange-500 text-white' : `${t.bgMuted} ${t.textMuted}`}
              `}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-orange-500' : t.bgMuted}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Tipo de Entrega */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <p className={`${t.textMuted} text-center mb-6`}>Como você prefere receber seu pedido?</p>
            
            <button
              onClick={() => handleSelectDeliveryType('pickup')}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4
                ${deliveryType === 'pickup' 
                  ? 'border-orange-500 bg-orange-500/10' 
                  : `${t.border} hover:border-orange-300`
                }
              `}
            >
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Store className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-left flex-1">
                <h3 className={`font-bold text-lg ${t.text}`}>Retirar no Local</h3>
                <p className={`text-sm ${t.textMuted}`}>Retire seu pedido no estabelecimento</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectDeliveryType('delivery')}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4
                ${deliveryType === 'delivery' 
                  ? 'border-orange-500 bg-orange-500/10' 
                  : `${t.border} hover:border-orange-300`
                }
              `}
            >
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Truck className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-left flex-1">
                <h3 className={`font-bold text-lg ${t.text}`}>Entrega</h3>
                <p className={`text-sm ${t.textMuted}`}>Receba no conforto da sua casa</p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Endereço */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            {loadingAddresses ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {/* Endereços existentes */}
                {addresses.length > 0 && !showNewAddressForm && (
                  <div className="space-y-3">
                    <p className={`${t.textMuted} text-sm`}>Selecione um endereço:</p>
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left
                          ${selectedAddress === addr.id 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : `${t.border} hover:border-orange-300`
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedAddress === addr.id ? 'bg-orange-500' : t.bgMuted}`}>
                            {addr.label === 'Casa' ? <Home className={`w-5 h-5 ${selectedAddress === addr.id ? 'text-white' : t.textMuted}`} /> 
                            : <Building className={`w-5 h-5 ${selectedAddress === addr.id ? 'text-white' : t.textMuted}`} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{addr.label}</span>
                              {addr.is_default && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Padrão</span>}
                            </div>
                            <p className={`text-sm ${t.textMuted} mt-1`}>
                              {addr.endereco}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}
                            </p>
                            <p className={`text-sm ${t.textMuted}`}>{addr.bairro} - {addr.cep}</p>
                          </div>
                          {selectedAddress === addr.id && (
                            <Check className="w-6 h-6 text-orange-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Botão para novo endereço */}
                {!showNewAddressForm && (
                  <button
                    onClick={() => setShowNewAddressForm(true)}
                    className={`w-full p-4 rounded-xl border-2 border-dashed ${t.border} hover:border-orange-500 transition-all flex items-center justify-center gap-2 ${t.textMuted}`}
                  >
                    <Plus className="w-5 h-5" />
                    Cadastrar novo endereço
                  </button>
                )}

                {/* Form de novo endereço */}
                {showNewAddressForm && (
                  <div className={`p-4 rounded-xl ${t.bgCard} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Novo Endereço</h3>
                      <button onClick={() => setShowNewAddressForm(false)} className={t.textMuted}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setNewAddress(prev => ({ ...prev, label: 'Casa' }))}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all
                          ${newAddress.label === 'Casa' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : `${t.border}`}
                        `}
                      >
                        🏠 Casa
                      </button>
                      <button
                        onClick={() => setNewAddress(prev => ({ ...prev, label: 'Trabalho' }))}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all
                          ${newAddress.label === 'Trabalho' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : `${t.border}`}
                        `}
                      >
                        🏢 Trabalho
                      </button>
                    </div>

                    <Input
                      placeholder="Rua, Avenida..."
                      value={newAddress.endereco}
                      onChange={e => setNewAddress(prev => ({ ...prev, endereco: e.target.value }))}
                      className={t.input}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Número"
                        value={newAddress.numero}
                        onChange={e => setNewAddress(prev => ({ ...prev, numero: e.target.value }))}
                        className={t.input}
                      />
                      <Input
                        placeholder="Complemento"
                        value={newAddress.complemento}
                        onChange={e => setNewAddress(prev => ({ ...prev, complemento: e.target.value }))}
                        className={t.input}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Bairro"
                        value={newAddress.bairro}
                        onChange={e => setNewAddress(prev => ({ ...prev, bairro: e.target.value }))}
                        className={t.input}
                      />
                      <Input
                        placeholder="CEP"
                        value={newAddress.cep}
                        onChange={e => setNewAddress(prev => ({ ...prev, cep: e.target.value }))}
                        className={t.input}
                      />
                    </div>

                    <Button
                      onClick={handleSaveNewAddress}
                      disabled={savingAddress}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {savingAddress ? "Salvando..." : "Salvar Endereço"}
                    </Button>
                  </div>
                )}

                {/* Botão continuar */}
                {!showNewAddressForm && selectedAddress && (
                  <Button
                    onClick={handleConfirmAddress}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold mt-4"
                  >
                    Continuar para Pagamento
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Pagamento */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            {/* Resumo */}
            <div className={`p-4 rounded-xl ${t.bgCard}`}>
              <div className="flex items-center gap-2 mb-2">
                {deliveryType === 'pickup' ? <Store className="w-5 h-5 text-orange-500" /> : <Truck className="w-5 h-5 text-orange-500" />}
                <span className="font-semibold">{deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega'}</span>
              </div>
              {deliveryType === 'delivery' && selectedAddress && (
                <p className={`text-sm ${t.textMuted}`}>
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {addresses.find(a => a.id === selectedAddress)?.endereco}, {addresses.find(a => a.id === selectedAddress)?.numero}
                </p>
              )}
            </div>

            <p className={`${t.textMuted} text-sm`}>Selecione a forma de pagamento:</p>

            {/* Métodos de pagamento */}
            <div className="space-y-3">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => handleSelectPayment(method.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4
                    ${paymentMethod === method.id 
                      ? 'border-orange-500 bg-orange-500/10' 
                      : `${t.border} hover:border-orange-300`
                    }
                  `}
                >
                  <method.icon className={`w-6 h-6 ${method.color}`} />
                  <span className="font-medium flex-1 text-left">{method.label}</span>
                  {paymentMethod === method.id && <Check className="w-5 h-5 text-orange-500" />}
                </button>
              ))}
            </div>

            {/* Info troco se selecionou dinheiro */}
            {paymentMethod === 'cash' && needsChange !== null && (
              <div className={`p-3 rounded-lg ${t.bgCard} border ${t.border}`}>
                <p className={`text-sm ${t.textMuted}`}>
                  💵 {needsChange 
                    ? `Troco para R$ ${parseFloat(changeAmount).toFixed(2).replace('.', ',')}` 
                    : 'Não precisa de troco'}
                </p>
              </div>
            )}

            {/* Total e Finalizar */}
            <div className={`p-4 rounded-xl ${t.bgCard} mt-6`}>
              <div className="flex justify-between items-center mb-4">
                <span className={t.textMuted}>Total do Pedido</span>
                <span className="text-2xl font-bold text-orange-500">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <Button
                onClick={handleFinishOrder}
                disabled={!paymentMethod || (paymentMethod === 'cash' && needsChange === null)}
                className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg disabled:opacity-50"
              >
                Finalizar Pedido
              </Button>
            </div>
          </div>
        )}

        {/* Dialog de Troco */}
        {showChangeDialog && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className={`${t.bg} rounded-2xl p-6 max-w-sm w-full shadow-xl`}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Banknote className="w-8 h-8 text-green-600" />
                </div>
                <h3 className={`text-xl font-bold ${t.text}`}>Vai precisar de troco?</h3>
                <p className={`${t.textMuted} text-sm mt-2`}>
                  Total do pedido: <span className="font-bold text-orange-500">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                </p>
              </div>

              {needsChange === null ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setNeedsChange(false)}
                    variant="outline"
                    className={`h-12 ${t.border}`}
                  >
                    Não preciso
                  </Button>
                  <Button
                    onClick={() => setNeedsChange(true)}
                    className="h-12 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Sim, preciso
                  </Button>
                </div>
              ) : needsChange ? (
                <div className="space-y-4">
                  <div>
                    <Label className={`text-sm ${t.textMuted}`}>Troco para quanto?</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-green-600">R$</span>
                      <Input
                        type="number"
                        value={changeAmount}
                        onChange={(e) => setChangeAmount(e.target.value)}
                        placeholder="0,00"
                        className={`pl-12 h-14 text-xl font-bold ${t.input}`}
                        autoFocus
                      />
                    </div>
                    {changeAmount && parseFloat(changeAmount) > cartTotal && (
                      <p className={`text-sm text-green-600 mt-2`}>
                        Troco: R$ {(parseFloat(changeAmount) - cartTotal).toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => { setNeedsChange(null); setChangeAmount(''); }}
                      variant="outline"
                      className={t.border}
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleConfirmChange}
                      disabled={!changeAmount || parseFloat(changeAmount) <= cartTotal}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleConfirmChange}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Continuar
                </Button>
              )}
            </div>
          </div>
        )}
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
  // Estado do checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Abrir popup do produto
  const openProductPopup = (product) => {
    setSelectedProduct(product);
    setProductPopupOpen(true);
  };
  
  // Handler para fazer pedido
  const handleMakeOrder = () => {
    if (!loggedClient) {
      setShowLoginModal(true);
    } else {
      setCheckoutOpen(true);
    }
  };

  // Callback quando o pedido é completado
  const handleOrderComplete = (orderData) => {
    console.log("Pedido realizado:", orderData);
    setCart([]);
    setCartOpen(false);
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
    const qty = product.quantity || 1;
    setCart(prev => {
      // Se tem observação, sempre adiciona como novo item
      if (product.observation) {
        return [...prev, { ...product, quantity: qty, cartItemId: Date.now() }];
      }
      // Sem observação, agrupa por id
      const existing = prev.find(item => item.id === product.id && !item.observation);
      if (existing) {
        return prev.map(item => 
          item.id === product.id && !item.observation 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { ...product, quantity: qty, cartItemId: Date.now() }];
    });
    toast.success(`${product.name} adicionado!`);
    setCartOpen(true);
  };

  const removeFromCart = (cartItemId) => setCart(prev => prev.filter(item => (item.cartItemId || item.id) !== cartItemId));

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if ((item.cartItemId || item.id) === cartItemId) {
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
    if (type === "admin" && onAdminLogin) {
      onAdminLogin(userData);
    } else {
      setLoggedClient(userData);
      // Se tem itens no carrinho, abrir checkout automaticamente
      if (cart.length > 0) {
        setShowLoginModal(false);
        setTimeout(() => setCheckoutOpen(true), 300);
      }
    }
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
                {!isOpen && nextOpenTime && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <Clock className="w-3 h-3" />
                    <span>Abre às {nextOpenTime}</span>
                  </div>
                )}
                {!isOpen && !nextOpenTime && todayHours && !todayHours.is_open && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <Clock className="w-3 h-3" />
                    <span>Fechado hoje</span>
                  </div>
                )}
                {!isOpen && !nextOpenTime && todayHours && todayHours.is_open && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <Clock className="w-3 h-3" />
                    <span>Encerrado por hoje</span>
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
                      <div 
                        key={product.id} 
                        className={`${t.bgCard} rounded-xl overflow-hidden hover:ring-2 hover:ring-orange-500/50 transition-all group border ${t.border} cursor-pointer`}
                        onClick={() => openProductPopup(product)}
                      >
                        <div className={`aspect-square ${t.bgMuted} relative overflow-hidden`}>
                          {product.photo_url ? <img src={getImageUrl(product.photo_url)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🍽️</span></div>}
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                            className="absolute bottom-2 right-2 w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Plus className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        <div className="p-3">
                          <h3 className={`font-semibold ${t.text} text-sm mb-1 line-clamp-2`}>{product.name}</h3>
                          {product.description && <p className={`${t.textMuted} text-xs mb-2 line-clamp-2`}>{product.description}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-orange-500 font-bold">R$ {product.sale_price?.toFixed(2).replace('.', ',')}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                              className={`text-xs ${t.bgMuted} hover:bg-orange-500 hover:text-white px-3 py-1 rounded-full transition-colors`}
                            >
                              Adicionar
                            </button>
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
                  <div key={item.cartItemId || item.id} className={`${t.bgCartItem} rounded-lg p-3`}>
                    <div className="flex gap-3">
                      <div className={`w-16 h-16 ${t.bgMuted} rounded-lg flex-shrink-0 overflow-hidden`}>
                        {item.photo_url ? <img src={getImageUrl(item.photo_url)} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-2xl">🍽️</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${t.text} text-sm truncate`}>{item.name}</h4>
                        {item.observation && (
                          <p className={`text-xs ${t.textMuted} truncate mt-0.5`}>📝 {item.observation}</p>
                        )}
                        <p className="text-orange-500 font-semibold text-sm mt-1">R$ {(item.sale_price * item.quantity).toFixed(2).replace('.', ',')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.cartItemId || item.id, -1)} className={`w-7 h-7 ${t.bgMuted} rounded flex items-center justify-center hover:opacity-80`}><Minus className="w-3 h-3" /></button>
                          <span className={`${t.text} font-medium w-6 text-center`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartItemId || item.id, 1)} className={`w-7 h-7 ${t.bgMuted} rounded flex items-center justify-center hover:opacity-80`}><Plus className="w-3 h-3" /></button>
                          <button onClick={() => removeFromCart(item.cartItemId || item.id)} className="w-7 h-7 bg-red-500/20 hover:bg-red-500/30 rounded flex items-center justify-center ml-auto"><Trash2 className="w-3 h-3 text-red-400" /></button>
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
            <Button onClick={handleMakeOrder} disabled={cart.length === 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 disabled:opacity-50">{cart.length === 0 ? 'Adicione itens para continuar' : 'Fazer Pedido'}</Button>
          </div>
        </aside>
      </div>

      {/* Cart Toggle */}
      <button onClick={() => setCartOpen(!cartOpen)} className={`fixed bottom-4 right-4 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-orange-600 transition-colors ${cartOpen ? 'hidden' : ''}`}>
        <ShoppingBag className="w-6 h-6 text-white" />
        {cartItemsCount > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white">{cartItemsCount}</span>}
      </button>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLoginSuccess={handleLoginSuccess} />
      
      {/* Popup de Produto */}
      <ProductPopup
        product={selectedProduct}
        open={productPopupOpen}
        onClose={() => setProductPopupOpen(false)}
        onAddToCart={addToCart}
        darkMode={darkMode}
      />
      
      {/* Modal de Checkout */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        client={loggedClient}
        darkMode={darkMode}
        onOrderComplete={handleOrderComplete}
      />
    </div>
  );
}
