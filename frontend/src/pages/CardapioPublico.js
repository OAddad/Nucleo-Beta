import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Search, ShoppingCart, ShoppingBag, Plus, Minus, Trash2, X, Clock, Star, ChevronLeft, ChevronRight, ChevronDown, User, ImageOff, MapPin, Store, Truck, CreditCard, Banknote, QrCode, Check, Home, Building, Edit2, Package, Send, ChefHat, Timer, Bike, CheckCircle, MessageCircle, ExternalLink, Gift, Crown, ClipboardList, UtensilsCrossed } from "lucide-react";
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

// Componente de Acompanhamento de Pedido
function OrderTrackingScreen({ pedido: pedidoInicial, onClose, darkMode }) {
  const [currentStatus, setCurrentStatus] = useState('enviado');
  const [pedido, setPedido] = useState(pedidoInicial);
  
  // Polling para atualizar status do pedido a cada 5 segundos
  useEffect(() => {
    if (!pedidoInicial?.id) return;
    
    const fetchPedidoStatus = async () => {
      try {
        const res = await axios.get(`${API}/pedidos/${pedidoInicial.id}`);
        if (res.data) {
          setPedido(res.data);
        }
      } catch (error) {
        console.log("Erro ao buscar status do pedido:", error);
      }
    };
    
    // Buscar imediatamente
    fetchPedidoStatus();
    
    // Polling a cada 5 segundos
    const interval = setInterval(fetchPedidoStatus, 5000);
    
    return () => clearInterval(interval);
  }, [pedidoInicial?.id]);
  
  // Verificar se é retirada no local
  const isPickup = pedido?.tipo_entrega === 'pickup';
  
  // Etapas do pedido para ENTREGA (delivery)
  const deliverySteps = [
    { id: 'enviado', label: 'Pedido Enviado', icon: Send, description: 'Seu pedido foi enviado para o restaurante' },
    { id: 'aceito', label: 'Pedido Aceito', icon: Check, description: 'O restaurante aceitou seu pedido' },
    { id: 'producao', label: 'Em Produção', icon: ChefHat, description: 'Seu pedido está sendo preparado' },
    { id: 'aguardando_entregador', label: 'Aguardando Entregador', icon: Timer, description: 'Aguardando um entregador disponível' },
    { id: 'bag_entregador', label: 'Na Bag do Entregador', icon: Package, description: 'Seu pedido está com o entregador' },
    { id: 'em_rota', label: 'Em Rota de Entrega', icon: Bike, description: 'O entregador está a caminho', showTracking: true },
    { id: 'entregue', label: 'Pedido Entregue', icon: CheckCircle, description: 'Seu pedido foi entregue!' },
  ];
  
  // Etapas do pedido para RETIRADA (pickup)
  const pickupSteps = [
    { id: 'enviado', label: 'Pedido Enviado', icon: Send, description: 'Seu pedido foi enviado para o restaurante' },
    { id: 'aceito', label: 'Pedido Aceito', icon: Check, description: 'O restaurante aceitou seu pedido' },
    { id: 'producao', label: 'Pedido em Produção', icon: ChefHat, description: 'Seu pedido está sendo preparado' },
    { id: 'pronto', label: 'Pedido Pronto', icon: Store, description: 'Seu pedido está pronto para retirada!', showAddress: true },
    { id: 'retirado', label: 'Pedido Retirado', icon: CheckCircle, description: 'Pedido retirado com sucesso!' },
  ];
  
  // Selecionar etapas baseado no tipo de entrega
  const steps = isPickup ? pickupSteps : deliverySteps;

  // Mapear status do pedido para as etapas
  useEffect(() => {
    if (pedido?.status) {
      if (isPickup) {
        // Mapeamento para retirada
        const statusMap = {
          'aguardando_aceite': 'enviado',
          'aceito': 'aceito',
          'producao': 'producao',
          'pronto': 'pronto',
          'retirado': 'retirado',
          'concluido': 'retirado',
        };
        setCurrentStatus(statusMap[pedido.status] || 'enviado');
      } else {
        // Mapeamento para entrega
        const statusMap = {
          'aguardando_aceite': 'enviado',
          'aceito': 'aceito',
          'producao': 'producao',
          'pronto': 'aguardando_entregador',
          'na_bag': 'bag_entregador',
          'em_rota': 'em_rota',
          'concluido': 'entregue',
          'entregue': 'entregue',
        };
        setCurrentStatus(statusMap[pedido.status] || 'enviado');
      }
    }
  }, [pedido, isPickup]);

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.id === currentStatus);
  };

  const t = {
    bg: darkMode ? 'bg-zinc-900' : 'bg-gray-50',
    bgCard: darkMode ? 'bg-zinc-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    border: darkMode ? 'border-zinc-700' : 'border-gray-200',
  };

  // Endereço do estabelecimento (futuro: buscar do backend)
  const establishmentAddress = {
    name: "Nosso Restaurante",
    address: "Rua Principal, 123 - Centro",
    city: "Sua Cidade - UF",
    // Coordenadas para o Google Maps (exemplo)
    lat: -23.5505199,
    lng: -46.6333094,
  };

  const openMapsLink = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${establishmentAddress.lat},${establishmentAddress.lng}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className={`fixed inset-0 z-[100] ${t.bg} overflow-y-auto`}>
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-lg">Acompanhar Pedido</h1>
            <p className="text-white font-bold text-xl mt-1">{pedido?.codigo}</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-40">
        {/* Info do Pedido */}
        <div className={`${t.bgCard} rounded-xl p-4 mb-6 border ${t.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-bold text-2xl ${t.text}`}>{pedido?.codigo}</p>
              <p className={`text-sm ${t.textMuted}`}>
                {pedido?.created_at ? new Date(pedido.created_at).toLocaleString('pt-BR') : 'Agora'}
              </p>
              {isPickup && (
                <span className="inline-flex items-center gap-1 mt-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                  <Store className="w-4 h-4" />
                  Retirada no Local
                </span>
              )}
            </div>
            <div className="text-right">
              <p className={`text-sm ${t.textMuted}`}>Total</p>
              <p className="font-bold text-orange-500 text-xl">
                R$ {(pedido?.total || 0).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline de Etapas */}
        <div className={`${t.bgCard} rounded-xl p-6 mb-6 border ${t.border}`}>
          <h2 className={`font-bold text-lg mb-6 ${t.text}`}>Status do Pedido</h2>
          
          <div className="relative">
            {steps.map((step, index) => {
              const isCompleted = index <= getCurrentStepIndex();
              const isCurrent = index === getCurrentStepIndex();
              const StepIcon = step.icon;
              
              return (
                <div key={step.id} className="flex items-start mb-6 last:mb-0">
                  {/* Linha vertical */}
                  {index < steps.length - 1 && (
                    <div 
                      className={`absolute left-5 w-0.5 h-12 mt-10 -ml-px ${
                        index < getCurrentStepIndex() ? 'bg-green-500' : t.border
                      }`}
                      style={{ top: `${index * 72 + 40}px` }}
                    />
                  )}
                  
                  {/* Ícone */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10
                    ${isCompleted 
                      ? 'bg-green-500 text-white' 
                      : `${darkMode ? 'bg-zinc-700' : 'bg-gray-200'} ${t.textMuted}`
                    }
                    ${isCurrent ? 'ring-4 ring-green-500/30 animate-pulse' : ''}
                  `}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  
                  {/* Texto */}
                  <div className="ml-4 flex-1">
                    <p className={`font-medium ${isCompleted ? t.text : t.textMuted}`}>
                      {step.label}
                    </p>
                    <p className={`text-sm ${t.textMuted}`}>
                      {step.description}
                    </p>
                    {isCurrent && (
                      <span className="inline-block mt-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                        Atual
                      </span>
                    )}
                    {/* Mostrar endereço do estabelecimento na etapa Pedido Pronto (retirada) */}
                    {step.showAddress && isPickup && (
                      <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                        <p className={`font-semibold text-sm ${t.text}`}>
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Local de Retirada
                        </p>
                        <p className={`text-sm mt-1 ${t.textMuted}`}>{establishmentAddress.name}</p>
                        <p className={`text-sm ${t.textMuted}`}>{establishmentAddress.address}</p>
                        <p className={`text-sm ${t.textMuted}`}>{establishmentAddress.city}</p>
                        <button
                          onClick={openMapsLink}
                          className="mt-2 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                        >
                          <MapPin className="w-4 h-4" />
                          Ver no Google Maps
                        </button>
                      </div>
                    )}
                    
                    {/* Espaço para link de rastreio quando em rota (futuro) */}
                    {step.showTracking && isCurrent && (
                      <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                        <p className={`font-semibold text-sm ${t.text}`}>
                          <Bike className="w-4 h-4 inline mr-1" />
                          Rastreio em Tempo Real
                        </p>
                        {pedido?.tracking_url ? (
                          <a
                            href={pedido.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Acompanhar Entregador
                          </a>
                        ) : (
                          <p className={`text-sm mt-1 ${t.textMuted}`}>
                            O entregador está a caminho do seu endereço
                          </p>
                        )}
                        {pedido?.entregador_nome && (
                          <p className={`text-sm mt-2 ${t.text}`}>
                            <User className="w-4 h-4 inline mr-1" />
                            Entregador: {pedido.entregador_nome}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Itens do Pedido */}
        <div className={`${t.bgCard} rounded-xl p-4 mb-6 border ${t.border}`}>
          <h3 className={`font-bold mb-3 ${t.text}`}>Itens do Pedido</h3>
          <div className="space-y-2">
            {pedido?.items?.map((item, idx) => (
              <div key={idx} className={`flex justify-between py-2 border-b last:border-0 ${t.border}`}>
                <span className={t.text}>{item.quantidade}x {item.nome}</span>
                <span className={t.textMuted}>R$ {((item.preco || 0) * item.quantidade).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card WhatsApp Fixo no Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <a
          href="https://web.whatsapp.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-2xl mx-auto"
        >
          <div className="bg-green-500 hover:bg-green-600 transition-colors rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-center gap-4">
              <MessageCircle className="w-10 h-10" />
              <div className="text-center">
                <h3 className="font-bold text-xl">Acompanhar meu pedido via WhatsApp</h3>
                <p className="text-white/80 text-sm">Clique para abrir o WhatsApp</p>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

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
    bgMuted: darkMode ? 'bg-zinc-800' : 'bg-gray-50',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    border: darkMode ? 'border-zinc-700' : 'border-gray-100',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md p-0 gap-0 overflow-hidden ${t.bg} border-0 rounded-2xl w-[92vw] sm:w-full max-h-[90vh] flex flex-col`}>
        {/* Imagem Grande no Topo */}
        <div className="relative w-full h-48 sm:h-56 bg-gradient-to-b from-orange-100 to-orange-50 dark:from-zinc-800 dark:to-zinc-900">
          {product.photo_url && !imageError ? (
            <img
              src={getImageUrl(product.photo_url)}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-orange-300">
              <span className="text-6xl">🍽️</span>
            </div>
          )}
          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* Nome e Preço */}
          <div className="mb-4">
            <h2 className={`text-xl font-bold ${t.text} mb-1`}>{product.name}</h2>
            {product.description && (
              <p className={`${t.textMuted} text-sm leading-relaxed`}>{product.description}</p>
            )}
          </div>
          
          {/* Preço Destacado */}
          <div className="text-2xl font-bold text-orange-500 mb-5">
            R$ {(product.sale_price || 0).toFixed(2).replace('.', ',')}
          </div>

          {/* Campo de Observação - Compacto */}
          <div>
            <label className={`text-sm font-medium mb-1.5 block ${t.textMuted}`}>Observação (opcional)</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: sem cebola, molho à parte..."
              className={`w-full resize-none rounded-xl p-3 text-sm ${t.bgMuted} ${t.text} border-0 focus:ring-2 focus:ring-orange-500 outline-none`}
              maxLength={200}
              rows={2}
            />
          </div>
        </div>

        {/* Footer Fixo - Clean */}
        <div className={`p-4 ${t.bgMuted} flex items-center gap-3`}>
          {/* Controle de Quantidade - Compacto */}
          <div className={`flex items-center gap-0 ${t.bg} rounded-full border ${t.border} overflow-hidden`}>
            <button
              className={`w-10 h-10 flex items-center justify-center hover:bg-orange-50 dark:hover:bg-zinc-700 transition-colors ${quantity <= 1 ? 'opacity-30' : ''}`}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={`w-8 text-center font-bold ${t.text}`}>{quantity}</span>
            <button
              className="w-10 h-10 flex items-center justify-center hover:bg-orange-50 dark:hover:bg-zinc-700 transition-colors"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Adicionar */}
          <button
            onClick={handleAdd}
            className="flex-1 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/20"
          >
            Adicionar • R$ {totalPrice.toFixed(2).replace('.', ',')}
          </button>
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
  
  // Estado para popup de confirmação de deletar endereço
  const [deleteAddressDialog, setDeleteAddressDialog] = useState({ open: false, addressId: null, addressLabel: '' });
  
  // Estados para autocomplete de bairros e ruas
  const [bairros, setBairros] = useState([]);
  const [ruasSugestoes, setRuasSugestoes] = useState([]);
  const [bairrosSugestoes, setBairrosSugestoes] = useState([]);
  const [valorEntrega, setValorEntrega] = useState(0);

  // Carregar bairros
  useEffect(() => {
    const fetchBairros = async () => {
      try {
        const res = await axios.get(`${API}/bairros`);
        setBairros(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Erro ao carregar bairros:", error);
        setBairros([]);
      }
    };
    fetchBairros();
  }, []);

  // Buscar sugestões de ruas
  const handleRuaChange = async (value) => {
    setNewAddress(prev => ({ ...prev, endereco: value }));
    if (value.length >= 2) {
      try {
        const res = await axios.get(`${API}/ruas/search?termo=${encodeURIComponent(value)}`);
        setRuasSugestoes(res.data);
      } catch (error) {
        setRuasSugestoes([]);
      }
    } else {
      setRuasSugestoes([]);
    }
  };

  // Filtrar sugestões de bairros
  const handleBairroChange = (value) => {
    setNewAddress(prev => ({ ...prev, bairro: value }));
    if (value.length >= 1) {
      const filtered = bairros.filter(b => 
        b.nome.toLowerCase().includes(value.toLowerCase())
      );
      setBairrosSugestoes(filtered);
    } else {
      setBairrosSugestoes([]);
    }
    // Limpar valor de entrega se mudar bairro
    setValorEntrega(0);
  };

  // Selecionar rua da sugestão
  const handleSelectRua = (rua) => {
    setNewAddress(prev => ({ 
      ...prev, 
      endereco: rua.nome,
      bairro: rua.bairro_nome || prev.bairro,
      cep: rua.bairro_cep || rua.cep || prev.cep
    }));
    setRuasSugestoes([]);
    // Se tem bairro, buscar valor de entrega
    if (rua.bairro_nome) {
      const bairro = bairros.find(b => b.nome === rua.bairro_nome);
      if (bairro) {
        setValorEntrega(bairro.valor_entrega || 0);
      }
    }
  };

  // Selecionar bairro da sugestão
  const handleSelectBairro = (bairro) => {
    setNewAddress(prev => ({ 
      ...prev, 
      bairro: bairro.nome,
      cep: bairro.cep || prev.cep
    }));
    setBairrosSugestoes([]);
    setShowBairroDropdown(false);
    setValorEntrega(bairro.valor_entrega || 0);
  };

  // Estado para dropdown de bairros
  const [showBairroDropdown, setShowBairroDropdown] = useState(false);
  
  // Verificar se CEP único está ativo (todos os bairros têm o mesmo CEP)
  const cepUnicoAtivo = Array.isArray(bairros) && bairros.length > 0 && bairros.every(b => b.cep && b.cep === bairros[0].cep);
  const cepUnicoValue = cepUnicoAtivo ? bairros[0].cep : '';

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

  // Abrir popup de confirmação para deletar endereço
  const handleDeleteAddressClick = (e, addr) => {
    e.stopPropagation(); // Evita selecionar o endereço ao clicar no delete
    setDeleteAddressDialog({ open: true, addressId: addr.id, addressLabel: addr.label });
  };

  // Confirmar deleção do endereço
  const handleConfirmDeleteAddress = async () => {
    const { addressId } = deleteAddressDialog;
    try {
      await axios.delete(`${API}/client-addresses/${addressId}`);
      setAddresses(prev => prev.filter(a => a.id !== addressId));
      if (selectedAddress === addressId) {
        setSelectedAddress(null);
      }
      toast.success("Endereço removido!");
    } catch (error) {
      toast.error("Erro ao remover endereço");
    } finally {
      setDeleteAddressDialog({ open: false, addressId: null, addressLabel: '' });
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
        observacao: item.observation || null,
        photo_url: item.photo_url || null
      })),
      total: cartTotal,
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
      modulo: "Cardapio",
      valor_entrega: deliveryType === 'delivery' ? valorEntrega : 0
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
      <DialogContent className={`sm:max-w-lg p-0 gap-0 overflow-hidden ${t.bg} ${t.text} border-0 w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
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
                      <div
                        key={addr.id}
                        className={`relative w-full p-4 rounded-xl border-2 transition-all text-left cursor-pointer
                          ${selectedAddress === addr.id 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : `${t.border} hover:border-orange-300`
                          }
                        `}
                        onClick={() => setSelectedAddress(addr.id)}
                      >
                        {/* Botão de deletar */}
                        <button
                          onClick={(e) => handleDeleteAddressClick(e, addr)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors z-10"
                          title="Remover endereço"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>

                        <div className="flex items-start gap-3 pr-8">
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
                      </div>
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

                    {/* Campo Rua com autocomplete */}
                    <div className="relative">
                      <Input
                        placeholder="Rua, Avenida..."
                        value={newAddress.endereco}
                        onChange={e => handleRuaChange(e.target.value)}
                        className={t.input}
                      />
                      {ruasSugestoes.length > 0 && (
                        <div className={`absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {ruasSugestoes.map(rua => (
                            <button
                              key={rua.id}
                              onClick={() => handleSelectRua(rua)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-500/10 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}
                            >
                              <span className="font-medium">{rua.nome}</span>
                              {rua.bairro_nome && <span className="text-gray-500 ml-2">- {rua.bairro_nome}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

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

                    {/* Campo Bairro - Input com autocomplete */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="relative">
                          <Input
                            placeholder="Digite o bairro *"
                            value={newAddress.bairro}
                            onChange={e => {
                              setNewAddress(prev => ({ ...prev, bairro: e.target.value }));
                              setShowBairroDropdown(true);
                            }}
                            onFocus={() => setShowBairroDropdown(true)}
                            className={t.input}
                          />
                          <button
                            type="button"
                            onClick={() => setShowBairroDropdown(!showBairroDropdown)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                            title="Ver todos os bairros"
                          >
                            <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-transform ${showBairroDropdown ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {showBairroDropdown && (
                          <>
                            {/* Overlay para fechar ao clicar fora */}
                            <div className="fixed inset-0 z-40" onClick={() => setShowBairroDropdown(false)} />
                            <div className={`absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                              {bairros.length === 0 ? (
                                <div className={`px-3 py-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Nenhum bairro cadastrado
                                </div>
                              ) : (
                                <>
                                  {bairros
                                    .filter(b => !newAddress.bairro || b.nome.toLowerCase().includes(newAddress.bairro.toLowerCase()))
                                    .map(bairro => (
                                      <button
                                        key={bairro.id}
                                        onClick={() => handleSelectBairro(bairro)}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-500/10 transition-colors flex items-center justify-between ${darkMode ? 'text-white' : 'text-gray-900'} ${newAddress.bairro === bairro.nome ? 'bg-orange-500/20' : ''}`}
                                      >
                                        <span className="font-medium">{bairro.nome}</span>
                                        {bairro.valor_entrega > 0 && (
                                          <span className="text-green-500 text-xs">+R$ {bairro.valor_entrega.toFixed(2)}</span>
                                        )}
                                      </button>
                                    ))
                                  }
                                  {bairros.filter(b => !newAddress.bairro || b.nome.toLowerCase().includes(newAddress.bairro.toLowerCase())).length === 0 && (
                                    <div className={`px-3 py-3 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Nenhum bairro encontrado
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <Input
                        placeholder="CEP"
                        value={cepUnicoAtivo ? cepUnicoValue : newAddress.cep}
                        onChange={e => !cepUnicoAtivo && setNewAddress(prev => ({ ...prev, cep: e.target.value }))}
                        className={`${t.input} ${cepUnicoAtivo ? 'opacity-70 cursor-not-allowed' : ''}`}
                        readOnly={cepUnicoAtivo}
                      />
                    </div>

                    {/* Mostrar valor de entrega do bairro */}
                    {valorEntrega > 0 && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Taxa de entrega: <strong>R$ {valorEntrega.toFixed(2)}</strong>
                        </p>
                      </div>
                    )}

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

        {/* Dialog de Confirmação de Deletar Endereço */}
        {deleteAddressDialog.open && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className={`${t.bg} rounded-2xl p-6 max-w-sm w-full shadow-xl`}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className={`text-xl font-bold ${t.text}`}>Remover endereço?</h3>
                <p className={`${t.textMuted} text-sm mt-2`}>
                  Deseja remover o endereço <span className="font-bold">"{deleteAddressDialog.addressLabel}"</span>?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setDeleteAddressDialog({ open: false, addressId: null, addressLabel: '' })}
                  variant="outline"
                  className={`h-12 ${t.border}`}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmDeleteAddress}
                  className="h-12 bg-red-500 hover:bg-red-600 text-white"
                >
                  Remover
                </Button>
              </div>
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
  // Estado da tela de acompanhamento
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  // Configurações da empresa
  const [companySettings, setCompanySettings] = useState({
    company_name: "Núcleo",
    slogan: "O Centro da sua Gestão",
    logo_url: null,
    fantasy_name: ""
  });

  // State para controlar header visível em mobile
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  // State para aba ativa do menu inferior
  const [activeTab, setActiveTab] = useState('cardapio');
  // State para busca expandida
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  // State para pedidos do cliente
  const [clientPedidos, setClientPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);

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
    setCheckoutOpen(false);
    // Abrir tela de acompanhamento
    setCurrentOrder(orderData);
    setTrackingOpen(true);
    // Atualizar lista de pedidos
    if (loggedClient) {
      fetchClientPedidos();
    }
  };

  // Buscar pedidos do cliente
  const fetchClientPedidos = async () => {
    if (!loggedClient?.id) return;
    setLoadingPedidos(true);
    try {
      const response = await axios.get(`${API}/pedidos/cliente/${loggedClient.id}`);
      const pedidosOrdenados = (response.data || []).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setClientPedidos(pedidosOrdenados);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setClientPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Buscar pedidos quando mudar para aba de pedidos
  useEffect(() => {
    if (activeTab === 'pedidos' && loggedClient) {
      fetchClientPedidos();
    }
  }, [activeTab, loggedClient]);

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

  // Buscar configurações da empresa
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const res = await axios.get(`${API}/company/settings`);
        if (res.data) {
          setCompanySettings(res.data);
          // Atualizar título do documento
          document.title = res.data.fantasy_name || res.data.company_name || "Núcleo";
        }
      } catch (error) {
        console.error("Erro ao buscar configurações da empresa:", error);
      }
    };
    fetchCompanySettings();
  }, []);

  // Detectar scroll para esconder header em mobile
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false); // Rolando para baixo
      } else {
        setHeaderVisible(true); // Rolando para cima
      }
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBusinessHours();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await fetchWithFallback('/public/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithFallback('/public/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategories([]);
    }
  };

  const fetchBusinessHours = async () => {
    try {
      const data = await fetchWithFallback('/public/business-hours');
      setBusinessHours(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar horários:", error);
      setBusinessHours([]);
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
    <div className={`min-h-screen ${t.bg} ${t.text} pb-16`}>
      {/* Header Fixo - Estilo Burger King */}
      <header className="fixed top-0 left-0 right-0 z-40">
        {/* Barra Principal - Laranja */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-3 py-2.5">
          <div className="flex items-center justify-between">
            {/* Lado Esquerdo - Nome + Pontos */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">
                Oi, {loggedClient?.nome?.split(' ')[0] || 'Visitante'}!
              </span>
              <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                <Crown className="w-3.5 h-3.5 fill-white text-white" />
                <span className="text-xs font-bold text-white">{loggedClient?.pontos || 0}</span>
              </div>
            </div>
            
            {/* Lado Direito - Lupa + Foto/Entrar */}
            <div className="flex items-center gap-2">
              {/* Botão Lupa */}
              <button 
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  if (!searchOpen) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${searchOpen ? 'bg-white text-orange-500' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                <Search className="w-4 h-4" />
              </button>
              
              {/* Foto ou Botão Entrar */}
              {loggedClient ? (
                <ProfileMenu 
                  client={loggedClient} 
                  onLogout={handleLogout} 
                  onClientUpdate={handleClientUpdate} 
                  darkMode={darkMode} 
                  onToggleTheme={toggleTheme}
                  onNavigateToPedidos={() => setActiveTab('pedidos')}
                />
              ) : (
                <Button onClick={() => setShowLoginModal(true)} className="bg-white hover:bg-gray-100 text-orange-600 font-semibold px-4 h-7 text-xs">
                  ENTRAR
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Barra de Status - Verde (Aberto) ou Vermelha (Fechado) */}
        {isOpen ? (
          /* Barra VERDE - Fininha quando aberto */
          <div className="bg-green-500 px-3 py-0.5 flex items-center justify-center gap-1">
            <span className="text-white text-[10px] font-medium">
              Aberto{closingTime && `, fecha às ${closingTime}`}
            </span>
          </div>
        ) : (
          /* Barra VERMELHA - Maior quando fechado */
          <div className="bg-red-600 px-3 py-2 flex items-center justify-center">
            <div className="text-center">
              <span className="text-white text-sm font-bold block">
                FECHADO
              </span>
              <span className="text-white/90 text-xs">
                Estamos descansando{nextOpenTime ? `, voltamos às ${nextOpenTime}` : ', volte em breve!'}
              </span>
            </div>
          </div>
        )}
        
        {/* Categorias - Logo abaixo do status */}
        {categoriesWithProducts.length > 0 && activeTab === 'cardapio' && (
          <div className={`px-3 py-2 ${t.bg} border-b ${t.border}`}>
            <p className={`text-[10px] ${t.textMuted} mb-1.5`}>Navegue pelas categorias</p>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: 'none' }}>
              <button 
                onClick={() => setSelectedCategory(null)} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full font-medium text-xs transition-all ${!selectedCategory ? 'bg-orange-500 text-white shadow-md' : t.btnCat}`}
              >
                Todos
              </button>
              {categoriesWithProducts.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.name)} 
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full font-medium text-xs transition-all ${selectedCategory === cat.name ? 'bg-orange-500 text-white shadow-md' : t.btnCat}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Campo de Busca Expandível */}
        {searchOpen && (
          <div className={`px-3 py-2 ${t.bg} border-b ${t.border}`}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted2}`} />
              <Input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar produto..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`pl-9 pr-9 ${t.bgInput} ${t.text} h-9 rounded-lg text-sm`} 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted2}`}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className={`pb-4 ${
        activeTab === 'cardapio' && categoriesWithProducts.length > 0 
          ? (searchOpen ? 'pt-[130px]' : (isOpen ? 'pt-[90px]' : 'pt-[110px]'))
          : (searchOpen ? 'pt-[100px]' : (isOpen ? 'pt-[52px]' : 'pt-[72px]'))
      }`}>
        {/* Aba Cardápio */}
        {activeTab === 'cardapio' && (
          <>
            {/* Produtos por Categoria */}
            <div className="px-4 space-y-6 mt-2">
              {Object.keys(productsByCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className={`w-16 h-16 ${t.bgCard} rounded-full flex items-center justify-center mb-4`}>
                    <Search className={`w-6 h-6 ${t.textMuted2}`} />
                  </div>
                  <h3 className={`text-base font-semibold ${t.textMuted} mb-2`}>Nenhum produto encontrado</h3>
                  <p className={`${t.textMuted2} text-center text-sm`}>
                    {searchTerm ? `Não encontramos "${searchTerm}"` : "Cardápio vazio"}
                  </p>
                </div>
              ) : (
                Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                  <div key={category}>
                    {/* Título da Categoria */}
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base lg:text-lg font-bold text-orange-500 uppercase">{category}</h2>
                      <span className={`text-xs ${t.textMuted}`}>{categoryProducts.length} itens</span>
                    </div>
                    
                    {/* Mobile: Scroll Horizontal 2.5 itens | Desktop: Grade */}
                    <div className="relative">
                      <div 
                        className="flex lg:grid gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 snap-x snap-mandatory lg:snap-none scrollbar-hide lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                      >
                        {categoryProducts.map(product => (
                          <div 
                            key={product.id} 
                            className={`${t.bgCard} rounded-xl overflow-hidden border ${t.border} cursor-pointer snap-start flex-shrink-0 lg:flex-shrink hover:shadow-lg transition-shadow cardapio-item-mobile`}
                            onClick={() => openProductPopup(product)}
                          >
                          {/* Imagem - Menor no desktop */}
                          <div className={`aspect-square lg:aspect-[4/3] ${t.bgMuted} relative overflow-hidden`}>
                            {product.photo_url ? (
                              <img 
                                src={getImageUrl(product.photo_url)} 
                                alt={product.name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-2xl lg:text-xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2 lg:p-2.5">
                            <h3 className={`font-semibold ${t.text} text-sm lg:text-xs line-clamp-2 leading-tight mb-1`}>{product.name}</h3>
                            <span className="text-orange-500 font-bold text-sm lg:text-xs">
                              R$ {product.sale_price?.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      ))}
                      </div>
                      {/* Indicador visual de scroll - só no mobile */}
                      <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent pointer-events-none lg:hidden" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Aba Ofertas */}
        {activeTab === 'ofertas' && (
          <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
            <div className={`w-20 h-20 ${t.bgCard} rounded-full flex items-center justify-center mb-4 border ${t.border}`}>
              <Gift className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className={`text-xl font-bold ${t.text} mb-2`}>Ofertas</h2>
            <p className={`${t.textMuted} text-center text-sm`}>Em breve ofertas exclusivas para você!</p>
          </div>
        )}

        {/* Aba Clube Addad */}
        {activeTab === 'clube' && (
          <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
            <div className={`w-20 h-20 ${t.bgCard} rounded-full flex items-center justify-center mb-4 border ${t.border}`}>
              <Crown className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className={`text-xl font-bold ${t.text} mb-2`}>Clube Addad</h2>
            <p className={`${t.textMuted} text-center text-sm mb-4`}>Acumule pontos e ganhe recompensas!</p>
            {loggedClient ? (
              <div className={`${t.bgCard} rounded-xl p-4 border ${t.border} w-full max-w-sm`}>
                <div className="text-center">
                  <p className={`text-3xl font-bold text-orange-500`}>{loggedClient.pontos || 0}</p>
                  <p className={`text-sm ${t.textMuted}`}>pontos acumulados</p>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowLoginModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                Entrar para participar
              </Button>
            )}
          </div>
        )}

        {/* Aba Pedidos - Histórico Completo */}
        {activeTab === 'pedidos' && (
          <div className="px-4 py-4">
            <h2 className={`text-lg font-bold ${t.text} mb-4 flex items-center gap-2`}>
              <ClipboardList className="w-5 h-5 text-orange-500" />
              Meus Pedidos
            </h2>
            
            {!loggedClient ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`w-16 h-16 ${t.bgCard} rounded-full flex items-center justify-center mb-4 border ${t.border}`}>
                  <User className="w-8 h-8 text-orange-500" />
                </div>
                <p className={`${t.textMuted} text-center text-sm mb-4`}>Faça login para ver seus pedidos</p>
                <Button onClick={() => setShowLoginModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                  Entrar
                </Button>
              </div>
            ) : loadingPedidos ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                <p className={t.textMuted}>Carregando pedidos...</p>
              </div>
            ) : clientPedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`w-16 h-16 ${t.bgCard} rounded-full flex items-center justify-center mb-4 border ${t.border}`}>
                  <ClipboardList className="w-8 h-8 text-orange-500/50" />
                </div>
                <p className={`${t.textMuted} text-center text-sm`}>Você ainda não fez nenhum pedido</p>
              </div>
            ) : selectedPedido ? (
              /* Detalhes do Pedido */
              <div className={`${t.bgCard} rounded-xl border ${t.border} overflow-hidden`}>
                {/* Header com botão voltar */}
                <div className={`p-3 border-b ${t.border} flex items-center gap-3 bg-orange-500`}>
                  <button 
                    onClick={() => setSelectedPedido(null)}
                    className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div>
                    <h3 className="font-bold text-white">{selectedPedido.codigo}</h3>
                    <p className="text-xs text-white/80">
                      {new Date(selectedPedido.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedPedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                {/* Status */}
                <div className="p-3 border-b border-dashed">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium ${
                    selectedPedido.status === 'concluido' ? 'bg-green-500' :
                    selectedPedido.status === 'cancelado' ? 'bg-red-500' :
                    selectedPedido.status === 'em_rota' || selectedPedido.status === 'transito' ? 'bg-purple-500' :
                    selectedPedido.status === 'producao' ? 'bg-orange-500' :
                    selectedPedido.status === 'pronto' || selectedPedido.status === 'na_bag' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}>
                    <span>{
                      selectedPedido.status === 'aguardando_aceite' ? '⏳ Aguardando' :
                      selectedPedido.status === 'producao' ? '🍳 Em Produção' :
                      selectedPedido.status === 'pronto' ? '✅ Pronto' :
                      selectedPedido.status === 'na_bag' ? '📦 Na Bag' :
                      selectedPedido.status === 'em_rota' || selectedPedido.status === 'transito' ? '🛵 Em Rota' :
                      selectedPedido.status === 'concluido' ? '🎉 Entregue' :
                      selectedPedido.status === 'cancelado' ? '❌ Cancelado' :
                      selectedPedido.status
                    }</span>
                  </div>
                </div>
                
                {/* Itens */}
                <div className="p-3 space-y-2">
                  <h4 className={`text-xs font-semibold ${t.textMuted} uppercase`}>Itens do Pedido</h4>
                  {selectedPedido.items?.map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-2 ${t.bgMuted} rounded-lg`}>
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {item.quantidade}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${t.text}`}>{item.nome}</p>
                        {item.observacao && <p className={`text-xs ${t.textMuted}`}>📝 {item.observacao}</p>}
                      </div>
                      <span className="text-sm font-semibold text-orange-500">
                        R$ {(item.preco_unitario * item.quantidade).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Tipo Entrega e Endereço */}
                <div className={`p-3 border-t ${t.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedPedido.tipo_entrega === 'delivery' ? (
                      <Truck className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Store className="w-4 h-4 text-orange-500" />
                    )}
                    <span className={`text-sm font-medium ${t.text}`}>
                      {selectedPedido.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada no Local'}
                    </span>
                  </div>
                  {selectedPedido.tipo_entrega === 'delivery' && selectedPedido.endereco_entrega && (
                    <p className={`text-xs ${t.textMuted} ml-6`}>
                      {selectedPedido.endereco_entrega}
                    </p>
                  )}
                </div>
                
                {/* Pagamento */}
                <div className={`p-3 border-t ${t.border}`}>
                  <div className="flex items-center gap-2">
                    {selectedPedido.forma_pagamento === 'pix' ? <QrCode className="w-4 h-4 text-orange-500" /> :
                     selectedPedido.forma_pagamento === 'cartao' ? <CreditCard className="w-4 h-4 text-orange-500" /> :
                     <Banknote className="w-4 h-4 text-orange-500" />}
                    <span className={`text-sm font-medium ${t.text}`}>
                      {selectedPedido.forma_pagamento === 'pix' ? 'PIX' :
                       selectedPedido.forma_pagamento === 'cartao' ? 'Cartão' : 'Dinheiro'}
                    </span>
                  </div>
                </div>
                
                {/* Total */}
                <div className="p-3 bg-orange-500">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Total</span>
                    <span className="text-white font-bold text-xl">
                      R$ {(selectedPedido.total || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de Pedidos */
              <div className="space-y-3">
                {clientPedidos.map((pedido) => (
                  <div 
                    key={pedido.id}
                    onClick={() => setSelectedPedido(pedido)}
                    className={`${t.bgCard} rounded-xl p-3 border ${t.border} cursor-pointer hover:border-orange-500/50 transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className={`font-bold ${t.text}`}>{pedido.codigo}</span>
                        <p className={`text-xs ${t.textMuted}`}>
                          {new Date(pedido.created_at).toLocaleDateString('pt-BR')} às {new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-white text-[10px] font-medium ${
                        pedido.status === 'concluido' ? 'bg-green-500' :
                        pedido.status === 'cancelado' ? 'bg-red-500' :
                        pedido.status === 'em_rota' || pedido.status === 'transito' ? 'bg-purple-500' :
                        pedido.status === 'producao' ? 'bg-orange-500' :
                        pedido.status === 'pronto' || pedido.status === 'na_bag' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}>
                        {pedido.status === 'aguardando_aceite' ? 'Aguardando' :
                         pedido.status === 'producao' ? 'Produção' :
                         pedido.status === 'pronto' ? 'Pronto' :
                         pedido.status === 'na_bag' ? 'Na Bag' :
                         pedido.status === 'em_rota' || pedido.status === 'transito' ? 'Em Rota' :
                         pedido.status === 'concluido' ? 'Entregue' :
                         pedido.status === 'cancelado' ? 'Cancelado' :
                         pedido.status}
                      </div>
                    </div>
                    
                    <div className={`text-xs ${t.textMuted} mb-2 line-clamp-1`}>
                      {pedido.items?.slice(0, 2).map((item, idx) => (
                        <span key={idx}>{item.quantidade}x {item.nome}{idx < Math.min(pedido.items.length, 2) - 1 ? ', ' : ''}</span>
                      ))}
                      {pedido.items?.length > 2 && <span className="text-orange-500"> +{pedido.items.length - 2}</span>}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${t.textMuted}`}>
                        {pedido.tipo_entrega === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-orange-500 text-sm">
                          R$ {(pedido.total || 0).toFixed(2).replace('.', ',')}
                        </span>
                        <ChevronRight className={`w-4 h-4 ${t.textMuted}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Overlay do Carrinho */}
      {cartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Carrinho Expansível - Mais estreito e mais alto */}
      <div className={`fixed bottom-14 right-3 z-50 transition-all duration-300 ${cartOpen ? 'w-72 sm:w-80' : 'w-12 h-12'}`}>
        {cartOpen ? (
          /* Carrinho Expandido */
          <div className={`${t.bgCart} rounded-2xl shadow-2xl border ${t.border} overflow-hidden flex flex-col`} style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {/* Header do Carrinho */}
            <div className={`p-3 border-b ${t.border} flex items-center justify-between bg-orange-500`}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-white text-sm">Meu Carrinho</h3>
                  <p className="text-[10px] text-white/80">{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}</p>
                </div>
              </div>
              <button 
                onClick={() => setCartOpen(false)} 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            
            {/* Itens do Carrinho */}
            <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart className={`w-10 h-10 ${t.textMuted2} mb-3`} />
                  <p className={`text-sm ${t.textMuted}`}>Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.cartItemId || item.id} className={`${t.bgCartItem} rounded-lg p-2 flex gap-2`}>
                      <div className={`w-12 h-12 ${t.bgMuted} rounded-lg flex-shrink-0 overflow-hidden`}>
                        {item.photo_url ? (
                          <img src={getImageUrl(item.photo_url)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${t.text} text-xs truncate`}>{item.name}</h4>
                        <p className="text-orange-500 font-semibold text-xs">
                          R$ {(item.sale_price * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <button 
                            onClick={() => updateQuantity(item.cartItemId || item.id, -1)} 
                            className={`w-5 h-5 ${t.bgMuted} rounded flex items-center justify-center`}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className={`${t.text} font-medium text-xs w-4 text-center`}>{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.cartItemId || item.id, 1)} 
                            className={`w-5 h-5 ${t.bgMuted} rounded flex items-center justify-center`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={() => removeFromCart(item.cartItemId || item.id)} 
                            className="w-5 h-5 bg-red-500/20 rounded flex items-center justify-center ml-auto"
                          >
                            <Trash2 className="w-2.5 h-2.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer do Carrinho */}
            {cart.length > 0 && (
              <div className={`p-2.5 border-t ${t.border} ${t.bgCartItem}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${t.textMuted}`}>Total</span>
                  <span className="text-lg font-bold text-orange-500">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <Button 
                  onClick={handleMakeOrder} 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-9 text-sm"
                >
                  Fazer Pedido
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Botão do Carrinho Minimizado - Carrinho de compras */
          <button 
            onClick={() => setCartOpen(true)} 
            className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {cartItemsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Menu Inferior Fixo - Mais fino */}
      <nav className={`fixed bottom-0 left-0 right-0 ${t.bgCard} border-t ${t.border} z-30`}>
        <div className="flex items-center justify-around py-1.5">
          <button 
            onClick={() => setActiveTab('cardapio')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${activeTab === 'cardapio' ? 'text-orange-500' : t.textMuted}`}
          >
            <UtensilsCrossed className="w-5 h-5" />
            <span className="text-[10px] font-medium">Cardápio</span>
          </button>
          <button 
            onClick={() => setActiveTab('ofertas')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${activeTab === 'ofertas' ? 'text-orange-500' : t.textMuted}`}
          >
            <Gift className="w-5 h-5" />
            <span className="text-[10px] font-medium">Ofertas</span>
          </button>
          <button 
            onClick={() => setActiveTab('clube')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${activeTab === 'clube' ? 'text-orange-500' : t.textMuted}`}
          >
            <Crown className="w-5 h-5" />
            <span className="text-[10px] font-medium">Clube</span>
          </button>
          <button 
            onClick={() => setActiveTab('pedidos')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${activeTab === 'pedidos' ? 'text-orange-500' : t.textMuted}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-medium">Pedidos</span>
          </button>
        </div>
      </nav>

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
      
      {/* Tela de Acompanhamento do Pedido */}
      {trackingOpen && currentOrder && (
        <OrderTrackingScreen
          pedido={currentOrder}
          onClose={() => setTrackingOpen(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
