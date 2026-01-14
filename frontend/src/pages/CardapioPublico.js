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
function ProductPopup({ product, open, onClose, onAddToCart, darkMode, allProducts = [] }) {
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [comboStep, setComboStep] = useState(0); // 0 = selecionar tipo, 1+ = etapas, último = resumo
  const [selectedComboType, setSelectedComboType] = useState(null); // 'simples' ou 'combo'
  const [stepSelections, setStepSelections] = useState({}); // { stepIndex: [itemIds] }
  const [itemImageErrors, setItemImageErrors] = useState({}); // { itemId: true }

  // Reset quando abrir com novo produto
  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setObservation("");
      setImageError(false);
      setComboStep(0);
      setSelectedComboType(null);
      setStepSelections({});
      setItemImageErrors({});
    }
  }, [open, product]);

  if (!product) return null;

  const isCombo = product.product_type === 'combo';
  const hasOrderSteps = product.order_steps && product.order_steps.length > 0;
  
  // Calcular preço simples como 70% do preço do combo (ou usar campo específico se existir)
  const comboPrice = product.sale_price || 0;
  const simplePrice = product.simple_price || Math.round(comboPrice * 0.7 * 100) / 100;

  // Filtrar etapas baseado no tipo selecionado
  const getRelevantSteps = () => {
    if (!hasOrderSteps) return [];
    return product.order_steps.filter(step => {
      if (selectedComboType === 'simples') {
        return !step.combo_only; // Só etapas que não são exclusivas do combo
      }
      return true; // Combo vê todas as etapas
    });
  };

  const relevantSteps = getRelevantSteps();
  const totalSteps = relevantSteps.length;
  // +1 para a etapa de resumo
  const totalStepsWithSummary = totalSteps + 1;
  const isOnSummaryStep = comboStep > totalSteps && comboStep > 0;

  // Buscar foto do produto pelo ID
  const getProductPhoto = (productId) => {
    const prod = allProducts.find(p => p.id === productId);
    return prod?.photo_url || null;
  };

  // Calcular preço total baseado nas seleções das etapas
  const calculateTotalPrice = () => {
    let basePrice = selectedComboType === 'combo' ? comboPrice : simplePrice;
    
    // Adicionar preços das etapas se houver
    if (hasOrderSteps) {
      relevantSteps.forEach((step, index) => {
        const selectedItems = stepSelections[index] || [];
        
        if (step.calculation_type === 'soma') {
          selectedItems.forEach(itemId => {
            const item = step.items?.find(i => i.product_id === itemId);
            if (item) {
              basePrice += item.price_override || 0;
            }
          });
        } else if (step.calculation_type === 'maior') {
          let maxPrice = 0;
          selectedItems.forEach(itemId => {
            const item = step.items?.find(i => i.product_id === itemId);
            if (item && (item.price_override || 0) > maxPrice) {
              maxPrice = item.price_override || 0;
            }
          });
          basePrice += maxPrice;
        }
      });
    }
    
    return basePrice * quantity;
  };

  const totalPrice = calculateTotalPrice();

  // Verificar se pode avançar para próxima etapa
  const canAdvanceStep = () => {
    if (comboStep === 0) {
      return selectedComboType !== null;
    }
    
    // Se está na etapa de resumo, sempre pode adicionar
    if (isOnSummaryStep) return true;
    
    const currentStepIndex = comboStep - 1;
    const currentStep = relevantSteps[currentStepIndex];
    if (!currentStep) return true;
    
    const selections = stepSelections[currentStepIndex] || [];
    const minSelections = currentStep.min_selections || 0;
    
    return selections.length >= minSelections;
  };

  // Avançar etapa
  const handleNextStep = () => {
    if (comboStep === 0) {
      if (!hasOrderSteps || relevantSteps.length === 0) {
        // Ir direto para resumo se não tem etapas
        setComboStep(1); // Vai para resumo (que será step 1 quando totalSteps = 0)
      } else {
        setComboStep(1);
      }
    } else if (comboStep <= totalSteps) {
      setComboStep(comboStep + 1); // Avança para próxima etapa ou resumo
    } else {
      handleAdd(); // Está no resumo, adiciona ao carrinho
    }
  };

  // Toggle seleção de item - CORRIGIDO para permitir trocar seleção
  const toggleItemSelection = (stepIndex, itemId) => {
    const step = relevantSteps[stepIndex];
    if (!step) return;
    
    const currentSelections = stepSelections[stepIndex] || [];
    const isSelected = currentSelections.includes(itemId);
    const maxSelections = step.max_selections || 999;
    
    if (isSelected) {
      // Desselecionar
      setStepSelections({
        ...stepSelections,
        [stepIndex]: currentSelections.filter(id => id !== itemId)
      });
    } else {
      // Selecionar
      if (maxSelections === 1) {
        // Se só pode selecionar 1, substitui a seleção anterior
        setStepSelections({
          ...stepSelections,
          [stepIndex]: [itemId]
        });
      } else if (currentSelections.length < maxSelections) {
        // Adiciona à seleção
        setStepSelections({
          ...stepSelections,
          [stepIndex]: [...currentSelections, itemId]
        });
      }
    }
  };

  // Obter resumo das seleções para a tela de resumo - COM PREÇOS
  const getSelectionsSummary = () => {
    const summary = [];
    relevantSteps.forEach((step, index) => {
      const selectedItems = stepSelections[index] || [];
      const itemsWithPrices = selectedItems.map(itemId => {
        const item = step.items?.find(i => i.product_id === itemId);
        return {
          name: item?.product_name || '',
          price: item?.price_override || 0
        };
      }).filter(i => i.name);
      
      if (itemsWithPrices.length > 0) {
        summary.push({
          stepName: step.name,
          items: itemsWithPrices,
          stepIndex: index
        });
      }
    });
    return summary;
  };

  const handleAdd = () => {
    onAddToCart({
      ...product,
      quantity,
      observation: observation.trim() || null,
      combo_type: isCombo ? selectedComboType : null,
      step_selections: stepSelections,
      final_price: totalPrice / quantity
    });
    onClose();
  };

  const t = {
    bg: darkMode ? 'bg-zinc-900' : 'bg-white',
    bgMuted: darkMode ? 'bg-zinc-800' : 'bg-gray-50',
    bgCard: darkMode ? 'bg-zinc-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    border: darkMode ? 'border-zinc-700' : 'border-gray-200',
  };

  // TELA DE SELEÇÃO COMBO vs SIMPLES (para produtos tipo combo)
  if (isCombo && comboStep === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={`sm:max-w-xl p-0 gap-0 overflow-hidden ${t.bg} border-0 rounded-2xl w-[95vw] sm:w-full`}>
          {/* Header - Apenas Nome e Descrição */}
          <div className={`p-4 border-b ${t.border}`}>
            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className={`absolute top-3 right-3 w-8 h-8 rounded-full ${t.bgMuted} flex items-center justify-center z-10`}
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="pr-10">
              <h2 className={`text-xl font-bold ${t.text} leading-tight`}>{product.name}</h2>
              {product.description && (
                <p className={`text-sm ${t.textMuted} mt-1`}>{product.description}</p>
              )}
              <p className={`text-xs ${t.textMuted} mt-3 font-medium`}>Escolha como quer seu pedido:</p>
            </div>
          </div>

          {/* Cards de Opção - Dois Cards */}
          <div className="p-4">
            <div className="flex gap-3 items-center">
              {/* Card SIMPLES - 35% da largura */}
              <button
                onClick={() => setSelectedComboType('simples')}
                className={`w-[35%] flex-shrink-0 rounded-xl border-2 transition-all text-left overflow-hidden flex flex-col ${
                  selectedComboType === 'simples' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                    : `${t.border} ${t.bgCard} hover:border-orange-300`
                }`}
              >
                {/* Imagem do Simples */}
                <div className="w-full aspect-square bg-gradient-to-b from-orange-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-700">
                  {(product.simple_photo_url || product.photo_url) && !imageError ? (
                    <img
                      src={getImageUrl(product.simple_photo_url || product.photo_url)}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-orange-300">
                      <span className="text-3xl">🍔</span>
                    </div>
                  )}
                </div>
                
                {/* Info do Simples */}
                <div className="p-2 text-center">
                  <p className={`font-bold ${t.text} text-xs`}>SIMPLES</p>
                  <p className={`text-[9px] ${t.textMuted} mt-0.5`}>{product.simple_description || 'Apenas o produto'}</p>
                  <p className="text-base font-black text-orange-500 mt-1">
                    R$ {simplePrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </button>

              {/* Card COMBO - 65% da largura */}
              <button
                onClick={() => setSelectedComboType('combo')}
                className={`w-[65%] flex-shrink-0 rounded-2xl border-2 transition-all text-left overflow-hidden flex flex-col relative ${
                  selectedComboType === 'combo' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                    : `${t.border} ${t.bgCard} hover:border-orange-300`
                }`}
              >
                {/* Badge Recomendado - Melhorado */}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold py-1.5 text-center z-10 flex items-center justify-center gap-1.5 shadow-md">
                  <span className="text-yellow-300">★</span>
                  RECOMENDADO
                  <span className="text-yellow-300">★</span>
                </div>
                
                {/* Imagem do Combo */}
                <div className="w-full aspect-square bg-gradient-to-b from-orange-100 to-orange-200 dark:from-zinc-700 dark:to-zinc-600 pt-8">
                  {(product.combo_photo_url || product.photo_url) && !imageError ? (
                    <img
                      src={getImageUrl(product.combo_photo_url || product.photo_url)}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-orange-400">
                      <span className="text-5xl">🍔</span>
                    </div>
                  )}
                </div>
                
                {/* Info do Combo */}
                <div className="p-3">
                  <p className={`font-bold ${t.text} text-sm`}>COMBO</p>
                  <p className={`text-[10px] ${t.textMuted} mt-0.5 line-clamp-1`}>
                    {product.combo_description || '+ Batata + Refrigerante'}
                  </p>
                  <p className="text-xl font-black text-orange-500 mt-2">
                    R$ {comboPrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 ${t.bgMuted} border-t ${t.border}`}>
            <button
              onClick={handleNextStep}
              disabled={!canAdvanceStep()}
              className={`w-full h-12 rounded-full font-bold text-white flex items-center justify-center gap-2 transition-all ${
                canAdvanceStep() 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-gray-300 dark:bg-zinc-600 cursor-not-allowed'
              }`}
            >
              {/* Se tem etapas relevantes para o tipo selecionado, mostra "PRÓXIMA ETAPA" */}
              {selectedComboType && hasOrderSteps && product.order_steps.filter(step => {
                if (selectedComboType === 'simples') return !step.combo_only;
                return true;
              }).length > 0 ? (
                <>PRÓXIMA ETAPA <ChevronRight className="w-5 h-5" /></>
              ) : (
                <>Adicionar • R$ {(selectedComboType === 'combo' ? comboPrice : simplePrice).toFixed(2).replace('.', ',')}</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // TELA DE RESUMO (última etapa)
  if (isCombo && isOnSummaryStep) {
    const selectionsSummary = getSelectionsSummary();
    
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={`sm:max-w-md p-0 gap-0 overflow-hidden ${t.bg} border-0 rounded-2xl w-[92vw] sm:w-full max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className={`p-4 border-b ${t.border}`}>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setComboStep(totalSteps > 0 ? totalSteps : 0)}
                className={`w-8 h-8 rounded-full ${t.bgMuted} flex items-center justify-center`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className={`text-sm ${t.textMuted}`}>Resumo do Pedido</span>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full ${t.bgMuted} flex items-center justify-center`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className={`text-lg font-bold ${t.text} text-center`}>Confirme seu pedido</h2>
          </div>

          {/* Conteúdo do Resumo */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Foto e Info do Produto Principal - SEM PREÇO */}
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-orange-50 dark:bg-zinc-700 flex-shrink-0">
                {(selectedComboType === 'combo' ? (product.combo_photo_url || product.photo_url) : (product.simple_photo_url || product.photo_url)) && !imageError ? (
                  <img
                    src={getImageUrl(selectedComboType === 'combo' ? (product.combo_photo_url || product.photo_url) : (product.simple_photo_url || product.photo_url))}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-300">
                    <span className="text-3xl">🍔</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${t.text}`}>{product.name}</h3>
                {product.description && (
                  <p className={`text-xs ${t.textMuted} mt-1 line-clamp-2`}>{product.description}</p>
                )}
              </div>
            </div>

            {/* Resumo das Escolhas - COM TIPO E PREÇOS */}
            <div className={`${t.bgMuted} rounded-xl p-4 space-y-3`}>
              <h4 className={`font-semibold text-sm ${t.text} flex items-center gap-2`}>
                <ClipboardList className="w-4 h-4" />
                Suas Escolhas
              </h4>
              
              {/* Tipo selecionado: COMBO ou SIMPLES */}
              <div className={`flex justify-between items-center py-2 border-b ${t.border}`}>
                <div>
                  <p className={`text-xs font-medium ${t.textMuted}`}>Tipo</p>
                  <p className={`text-sm font-semibold ${t.text}`}>
                    {selectedComboType === 'combo' ? '🍟 COMBO' : '🍔 SIMPLES'}
                  </p>
                </div>
                <span className="text-sm font-bold text-orange-500">
                  R$ {(selectedComboType === 'combo' ? comboPrice : simplePrice).toFixed(2).replace('.', ',')}
                </span>
              </div>
              
              {/* Etapas com itens selecionados */}
              {selectionsSummary.map((selection, idx) => (
                <div key={idx} className={`py-2 ${idx < selectionsSummary.length - 1 ? `border-b ${t.border}` : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-xs font-medium ${t.textMuted}`}>{selection.stepName}</p>
                    <button
                      onClick={() => setComboStep(selection.stepIndex + 1)}
                      className="text-orange-500 text-xs underline"
                    >
                      Alterar
                    </button>
                  </div>
                  {selection.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex justify-between items-center">
                      <p className={`text-sm ${t.text}`}>{item.name}</p>
                      {item.price > 0 ? (
                        <span className="text-sm font-semibold text-orange-500">+R$ {item.price.toFixed(2).replace('.', ',')}</span>
                      ) : (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Incluído</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Campo de Observação */}
            <div>
              <label className={`text-sm font-medium mb-2 block ${t.text}`}>
                Observação (opcional)
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: sem cebola, molho à parte, ponto da carne..."
                className={`w-full resize-none rounded-xl p-3 text-sm ${t.bgMuted} ${t.text} border ${t.border} focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none`}
                maxLength={200}
                rows={3}
              />
              <p className={`text-xs ${t.textMuted} mt-1 text-right`}>{observation.length}/200</p>
            </div>

            {/* Quantidade - CENTRALIZADO E MAIS INTUITIVO */}
            <div className={`${t.bgMuted} rounded-xl p-4`}>
              <p className={`text-sm font-medium ${t.text} text-center mb-3`}>Quantidade</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  className={`w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center transition-all active:scale-95 ${quantity <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-orange-200 dark:hover:bg-orange-900/50'}`}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </button>
                <span className={`text-3xl font-bold ${t.text} w-16 text-center`}>{quantity}</span>
                <button
                  className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/30"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer - Botão Adicionar */}
          <div className={`p-4 ${t.bgMuted} border-t ${t.border}`}>
            <button
              onClick={handleAdd}
              className="w-full h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
              <ShoppingCart className="w-5 h-5" />
              Adicionar • R$ {totalPrice.toFixed(2).replace('.', ',')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // TELA DE ETAPAS (order_steps) - Para COMBO e SIMPLES - COM FOTOS
  if (isCombo && comboStep > 0 && comboStep <= totalSteps && relevantSteps.length > 0) {
    const currentStepIndex = comboStep - 1;
    const currentStep = relevantSteps[currentStepIndex];
    const selections = stepSelections[currentStepIndex] || [];
    
    // Se não existe essa etapa, vai para resumo
    if (!currentStep) {
      setComboStep(totalSteps + 1);
      return null;
    }
    
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={`sm:max-w-md p-0 gap-0 overflow-hidden ${t.bg} border-0 rounded-2xl w-[92vw] sm:w-full max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className={`p-4 border-b ${t.border}`}>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setComboStep(comboStep - 1)}
                className={`w-8 h-8 rounded-full ${t.bgMuted} flex items-center justify-center`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className={`text-sm ${t.textMuted}`}>Etapa {comboStep} de {totalStepsWithSummary}</span>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full ${t.bgMuted} flex items-center justify-center`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className={`text-lg font-bold ${t.text} text-center`}>{currentStep.name || `Etapa ${comboStep}`}</h2>
            {(currentStep.min_selections > 0 || currentStep.max_selections > 0) && (
              <p className={`text-xs ${t.textMuted} text-center mt-1`}>
                {currentStep.min_selections > 0 && currentStep.max_selections > 0 && currentStep.min_selections === currentStep.max_selections 
                  ? `Selecione ${currentStep.min_selections} ${currentStep.min_selections === 1 ? 'opção' : 'opções'}`
                  : currentStep.min_selections > 0 && currentStep.max_selections > 0
                    ? `Selecione de ${currentStep.min_selections} a ${currentStep.max_selections} opções`
                    : currentStep.min_selections > 0 
                      ? `Selecione no mínimo ${currentStep.min_selections} ${currentStep.min_selections === 1 ? 'opção' : 'opções'}`
                      : currentStep.max_selections > 0 
                        ? `Selecione até ${currentStep.max_selections} ${currentStep.max_selections === 1 ? 'opção' : 'opções'}`
                        : 'Selecione suas opções'
                }
              </p>
            )}
          </div>

          {/* Itens da Etapa - COM FOTOS */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {currentStep.items?.map((item) => {
              const isSelected = selections.includes(item.product_id);
              const itemPhoto = getProductPhoto(item.product_id);
              const hasImageError = itemImageErrors[item.product_id];
              
              return (
                <button
                  key={item.product_id}
                  onClick={() => toggleItemSelection(currentStepIndex, item.product_id)}
                  className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' 
                      : `${t.border} ${t.bgCard} hover:border-orange-300`
                  }`}
                >
                  {/* Foto do Item */}
                  <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${isSelected ? 'ring-2 ring-orange-500' : ''}`}>
                    {itemPhoto && !hasImageError ? (
                      <img
                        src={getImageUrl(itemPhoto)}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        onError={() => setItemImageErrors(prev => ({ ...prev, [item.product_id]: true }))}
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isSelected ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-zinc-700'}`}>
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Info do Item */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 dark:border-zinc-500'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`font-medium ${t.text} truncate`}>{item.product_name}</span>
                    </div>
                    {item.price_override > 0 && (
                      <p className="text-sm text-orange-500 font-semibold mt-1 ml-7">
                        +R$ {item.price_override.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    {item.price_override === 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1 ml-7">
                        Incluído
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`p-4 ${t.bgMuted} border-t ${t.border}`}>
            <button
              onClick={handleNextStep}
              disabled={!canAdvanceStep()}
              className={`w-full h-12 rounded-full font-bold text-white flex items-center justify-center gap-2 transition-all ${
                canAdvanceStep() 
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20' 
                  : 'bg-gray-300 dark:bg-zinc-600 cursor-not-allowed'
              }`}
            >
              {comboStep < totalSteps ? (
                <>PRÓXIMA ETAPA <ChevronRight className="w-5 h-5" /></>
              ) : (
                <>REVISAR PEDIDO <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // TELA PADRÃO (produtos normais ou última etapa)
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md p-0 gap-0 overflow-hidden ${t.bg} border-0 rounded-2xl w-[92vw] sm:w-full max-h-[90vh] flex flex-col`}>
        {/* Imagem Quadrada no Topo */}
        <div className="relative w-full aspect-square bg-gradient-to-b from-orange-100 to-orange-50 dark:from-zinc-800 dark:to-zinc-900">
          {product.photo_url && !imageError ? (
            <img
              src={getImageUrl(product.photo_url)}
              alt={product.name}
              className="w-full h-full object-contain"
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

// Componente Clube Addad
function ClubeAddadTab({ loggedClient, onLogin, onClientUpdate, darkMode, t, clubeConfigProp }) {
  const [etapa, setEtapa] = useState('inicial'); // 'inicial', 'cadastro', 'whatsapp', 'regras', 'membro'
  const [formData, setFormData] = useState({ cpf: '', data_nascimento: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [clubeStatus, setClubeStatus] = useState(null);
  
  // Usar config passada como prop ou valores padrão
  const clubeConfig = clubeConfigProp || { clube_nome: 'Addad', pontos_por_real: 1 };

  // Buscar status do clube quando o cliente estiver logado
  useEffect(() => {
    if (loggedClient?.id) {
      fetchClubeStatus();
    }
  }, [loggedClient?.id]);

  const fetchClubeStatus = async () => {
    try {
      const response = await axios.get(`/api/public/cliente/${loggedClient.id}/clube`);
      setClubeStatus(response.data);
      if (response.data.membro_clube === 1) {
        setEtapa('membro');
      }
    } catch (error) {
      console.error('Erro ao buscar status do clube:', error);
    }
  };

  // Formatar CPF
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  // Formatar Data
  const formatData = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
  };

  // Validar email
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validar CPF
  const isValidCPF = (cpf) => cpf.replace(/\D/g, '').length === 11;

  // Validar data
  const isValidData = (data) => {
    const parts = data.split('/');
    if (parts.length !== 3) return false;
    const [dia, mes, ano] = parts.map(Number);
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900 || ano > 2020) return false;
    return true;
  };

  const handleCadastro = async () => {
    if (!isValidCPF(formData.cpf)) {
      toast.error('CPF inválido');
      return;
    }
    if (!isValidData(formData.data_nascimento)) {
      toast.error('Data de nascimento inválida');
      return;
    }
    if (!isValidEmail(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/public/clube/registrar/${loggedClient.id}`, formData);
      setEtapa('whatsapp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsappResponse = async (aceita) => {
    setLoading(true);
    try {
      await axios.post(`/api/public/clube/whatsapp/${loggedClient.id}`, { aceita });
      toast.success(aceita ? 'Você agora receberá nossas ofertas!' : 'Preferência salva!');
      // Atualizar cliente
      if (onClientUpdate) {
        const response = await axios.get(`/api/public/cliente/${loggedClient.id}/clube`);
        onClientUpdate({ ...loggedClient, ...response.data, membro_clube: 1 });
      }
      setEtapa('membro');
    } catch (error) {
      toast.error('Erro ao salvar preferência');
    } finally {
      setLoading(false);
    }
  };

  // Se não está logado
  if (!loggedClient) {
    return (
      <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className={`w-20 h-20 ${t.bgCard} rounded-full flex items-center justify-center mb-4 border ${t.border}`}>
          <Crown className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className={`text-xl font-bold ${t.text} mb-2`}>Clube Addad</h2>
        <p className={`${t.textMuted} text-center text-sm mb-4`}>Faça login para participar do nosso clube!</p>
        <Button onClick={onLogin} className="bg-orange-500 hover:bg-orange-600 text-white">
          Entrar
        </Button>
      </div>
    );
  }

  // Etapa: Membro do clube - Visual bonito
  if (etapa === 'membro' || clubeStatus?.membro_clube === 1) {
    const pontos = loggedClient?.pontos || clubeStatus?.pontuacao || 0;
    return (
      <div className="px-4 py-6 min-h-[70vh] flex flex-col">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 rounded-2xl p-6 mb-4 text-center shadow-xl relative overflow-hidden">
          {/* Decoração de fundo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-3">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <p className="text-white/80 text-xs uppercase tracking-widest mb-1">Membro do</p>
            <h2 className="text-2xl font-black text-white mb-1">Clube {clubeConfig.clube_nome}</h2>
            <p className="text-white/90 text-sm">{loggedClient?.nome}</p>
          </div>
        </div>

        {/* Card de Pontos */}
        <div className={`${t.bgCard} rounded-2xl p-6 border-2 border-orange-200 shadow-lg mb-4`}>
          <div className="text-center">
            <p className={`text-xs ${t.textMuted} uppercase tracking-wider mb-1`}>Seus pontos</p>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
              <p className="text-5xl font-black text-orange-500">{pontos}</p>
            </div>
            <p className={`text-sm ${t.textMuted} mt-2`}>
              Continue comprando para acumular mais!
            </p>
          </div>
        </div>

        {/* Benefícios */}
        <div className="flex-1 space-y-3">
          <h3 className={`font-bold ${t.text} text-sm uppercase tracking-wider`}>Seus Benefícios</h3>
          
          <div className={`flex items-center gap-4 ${t.bgCard} rounded-xl p-4 border ${t.border}`}>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className={`${t.text} font-semibold text-sm`}>Acúmulo de Pontos</p>
              <p className={`${t.textMuted} text-xs`}>R$ 1,00 = {clubeConfig.pontos_por_real} {clubeConfig.pontos_por_real === 1 ? 'ponto' : 'pontos'}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-4 ${t.bgCard} rounded-xl p-4 border ${t.border}`}>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎁</span>
            </div>
            <div>
              <p className={`${t.text} font-semibold text-sm`}>Ofertas Exclusivas</p>
              <p className={`${t.textMuted} text-xs`}>Promoções só para membros do clube</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-4 ${t.bgCard} rounded-xl p-4 border ${t.border}`}>
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎂</span>
            </div>
            <div>
              <p className={`${t.text} font-semibold text-sm`}>Presente de Aniversário</p>
              <p className={`${t.textMuted} text-xs`}>Surpresas especiais no seu dia</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Etapa: Regras do WhatsApp
  if (etapa === 'regras') {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setEtapa('whatsapp')} className={`w-8 h-8 rounded-full ${t.bgMuted} flex items-center justify-center`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className={`text-lg font-bold ${t.text}`}>Política de Comunicação</h2>
        </div>
        
        <div className={`${t.bgCard} rounded-xl p-4 border ${t.border} text-sm ${t.textMuted} space-y-4`}>
          <p>Ao aceitar receber mensagens pelo WhatsApp, você autoriza o <strong className={t.text}>estabelecimento</strong> a manter contato com você utilizando exclusivamente os dados informados acima.</p>
          
          <p>Esse contato será feito de forma consciente e responsável, seguindo os princípios abaixo:</p>
          
          <div className="space-y-1">
            <p className="text-green-600">✔ Mensagens ocasionais, com motivo claro.</p>
            <p className="text-green-600">✔ Comunicação apenas com clientes que já tiveram relacionamento conosco.</p>
            <p className="text-green-600">✔ Uso do WhatsApp para novidades, promoções pontuais e informações relevantes sobre pedidos.</p>
            <p className="text-green-600">✔ Nenhum compartilhamento de dados com terceiros.</p>
          </div>
          
          <p className="font-semibold">O que não fazemos:</p>
          <div className="space-y-1">
            <p className="text-red-500">✖ Não enviamos spam.</p>
            <p className="text-red-500">✖ Não insistimos se você não responder.</p>
            <p className="text-red-500">✖ Não continuamos enviando mensagens após solicitação de cancelamento.</p>
          </div>
          
          <p className="font-semibold">Controle total é seu:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Você pode cancelar a qualquer momento entrando em contato pelo nosso canal de atendimento e solicitar a exclusão.</li>
            <li>Pode solicitar a remoção saindo do clube.</li>
            <li>Caso fique um longo período sem interação, podemos interromper os envios automaticamente.</li>
          </ul>
          
          <p className="text-xs italic border-t pt-3 mt-3">Este registro fica armazenado como comprovante do seu consentimento.</p>
        </div>
        
        <Button onClick={() => setEtapa('whatsapp')} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white">
          Voltar
        </Button>
      </div>
    );
  }

  // Etapa: Pergunta sobre WhatsApp
  if (etapa === 'whatsapp') {
    return (
      <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-xl font-bold ${t.text} mb-2 text-center`}>Quase lá!</h2>
        <p className={`${t.textMuted} text-center text-sm mb-2`}>Deseja receber informações e ofertas via WhatsApp?</p>
        <button onClick={() => setEtapa('regras')} className="text-orange-500 text-sm underline mb-6">
          LEIA MAIS
        </button>
        
        <div className="flex items-center justify-center gap-6 w-full max-w-xs">
          <button 
            onClick={() => handleWhatsappResponse(false)} 
            disabled={loading}
            className="text-red-500 underline text-sm font-medium hover:text-red-600"
          >
            Não
          </button>
          <Button 
            onClick={() => handleWhatsappResponse(true)} 
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12"
          >
            {loading ? '...' : 'SIM'}
          </Button>
        </div>
      </div>
    );
  }

  // Etapa: Formulário de cadastro
  if (etapa === 'cadastro') {
    return (
      <div className="px-4 py-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-xl font-bold ${t.text} mb-1`}>Complete seu cadastro</h2>
          <p className={`${t.textMuted} text-sm`}>Precisamos de algumas informações</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className={`text-sm ${t.textMuted} mb-1 block`}>CPF *</Label>
            <Input
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              className={`${t.bgInput} ${t.text} h-12`}
            />
          </div>

          <div>
            <Label className={`text-sm ${t.textMuted} mb-1 block`}>Data de Nascimento *</Label>
            <Input
              value={formData.data_nascimento}
              onChange={(e) => setFormData({ ...formData, data_nascimento: formatData(e.target.value) })}
              placeholder="DD/MM/AAAA"
              className={`${t.bgInput} ${t.text} h-12`}
            />
          </div>

          <div>
            <Label className={`text-sm ${t.textMuted} mb-1 block`}>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
              className={`${t.bgInput} ${t.text} h-12`}
            />
          </div>

          <Button 
            onClick={handleCadastro} 
            disabled={loading || !formData.cpf || !formData.data_nascimento || !formData.email}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 mt-4"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar-se'}
          </Button>

          <button onClick={() => setEtapa('inicial')} className={`w-full text-sm ${t.textMuted} mt-2`}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Etapa: Inicial (não é membro ainda) - Visual melhorado e centralizado
  return (
    <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[70vh]">
      {/* Ícone do Clube */}
      <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
        <Crown className="w-12 h-12 text-white" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <p className={`text-sm ${t.textMuted} uppercase tracking-widest mb-1`}>Conheça o</p>
        <h1 className="text-3xl font-black text-orange-500 uppercase tracking-wide">
          Clube {clubeConfig.clube_nome}
        </h1>
      </div>

      {/* Card de Pontos */}
      <div className={`${t.bgCard} rounded-2xl p-6 border-2 border-orange-200 shadow-lg mb-6 w-full max-w-sm`}>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <span className={`text-sm ${t.textMuted}`}>A cada</span>
            <div className="flex items-baseline justify-center">
              <span className={`text-lg ${t.textMuted}`}>R$</span>
              <span className="text-5xl font-black text-orange-500">1</span>
            </div>
            <span className={`text-xs ${t.textMuted}`}>em compras</span>
          </div>
          
          <div className="text-4xl text-orange-400 font-bold">=</div>
          
          <div className="text-center">
            <span className={`text-sm ${t.textMuted}`}>Você ganha</span>
            <div className="text-5xl font-black text-orange-500">{clubeConfig.pontos_por_real}</div>
            <span className="text-orange-500 font-bold text-sm uppercase">
              {clubeConfig.pontos_por_real === 1 ? 'PONTO' : 'PONTOS'}
            </span>
          </div>
        </div>
      </div>

      {/* Benefícios */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        <div className={`flex items-center gap-4 ${t.bgCard} rounded-xl p-4 border ${t.border}`}>
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold">1</span>
          </div>
          <p className={`${t.text} text-sm`}>
            <strong>Identifique-se</strong> ao fazer seu pedido para acumular pontos
          </p>
        </div>
        
        <div className={`flex items-center gap-4 ${t.bgCard} rounded-xl p-4 border ${t.border}`}>
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-purple-600 font-bold">2</span>
          </div>
          <p className={`${t.text} text-sm`}>
            <strong>Troque seus pontos</strong> por recompensas deliciosas
          </p>
        </div>
        
        <div className={`flex items-center gap-4 ${t.bgCard} rounded-xl p-4 border ${t.border}`}>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-orange-600" />
          </div>
          <p className={`${t.text} text-sm`}>
            <strong>Receba ofertas exclusivas</strong> e promoções especiais
          </p>
        </div>
      </div>

      {/* Botão Entrar no Clube */}
      <Button 
        onClick={() => setEtapa('cadastro')} 
        className="w-full max-w-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-lg py-6 rounded-full uppercase tracking-wider shadow-xl"
      >
        🎉 Entrar no Clube
      </Button>
      
      <p className={`text-xs ${t.textMuted} mt-4 text-center`}>
        É rápido, gratuito e cheio de benefícios!
      </p>
    </div>
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
  const [statusBarVisible, setStatusBarVisible] = useState(true);
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
  // State para configurações do clube
  const [clubeConfig, setClubeConfig] = useState({ clube_nome: 'Addad', pontos_por_real: 1 });

  // Buscar configurações do clube
  useEffect(() => {
    const fetchClubeConfig = async () => {
      try {
        const response = await axios.get(`${API}/public/clube/config`);
        if (response.data) {
          setClubeConfig(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar config do clube:', error);
      }
    };
    fetchClubeConfig();
  }, []);

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

  // Detectar scroll para esconder header e barra de status em mobile
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false); // Rolando para baixo
        setStatusBarVisible(false); // Esconder barra de status quando aberto
      } else {
        setHeaderVisible(true); // Rolando para cima
        setStatusBarVisible(true); // Mostrar barra de status
      }
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar busca ao clicar fora (só se não tiver texto)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchOpen && !searchTerm) {
        const searchContainer = document.getElementById('search-container');
        const searchButton = document.getElementById('search-button');
        if (searchContainer && !searchContainer.contains(e.target) && 
            searchButton && !searchButton.contains(e.target)) {
          setSearchOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen, searchTerm]);

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
    // Filtrar e ordenar alfabeticamente
    return categories
      .filter(cat => categorySet.has(cat.name))
      .sort((a, b) => a.name.localeCompare(b.name));
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

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + ((item.final_price || item.sale_price) * item.quantity), 0), [cart]);
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
        {/* Barra Principal - Laranja - Mais fina */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-3 py-1.5">
          <div className="flex items-center justify-between">
            {/* Lado Esquerdo - Nome + Pontos */}
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-semibold">
                Oi, {loggedClient?.nome?.split(' ')[0] || 'Visitante'}!
              </span>
              <div className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-full">
                <Crown className="w-3 h-3 fill-white text-white" />
                <span className="text-[10px] font-bold text-white">{loggedClient?.pontos || 0}</span>
              </div>
            </div>
            
            {/* Lado Direito - Lupa + Foto/Entrar */}
            <div className="flex items-center gap-2">
              {/* Botão Lupa */}
              <button 
                id="search-button"
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  if (!searchOpen) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${searchOpen ? 'bg-white text-orange-500' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                <Search className="w-3.5 h-3.5" />
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
                  clubeNome={clubeConfig.clube_nome}
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
          /* Barra VERDE - Fininha quando aberto - Esconde ao rolar */
          <div className={`bg-green-500 px-3 py-0.5 flex items-center justify-center gap-1 transition-all duration-300 ${statusBarVisible ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0 overflow-hidden py-0'}`}>
            <span className="text-white text-[10px] font-medium">
              Aberto{closingTime && `, fecha às ${closingTime}`}
            </span>
          </div>
        ) : (
          /* Barra VERMELHA - Maior quando fechado - Sempre visível */
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
          <div id="search-container" className={`px-3 py-2 ${t.bg} border-b ${t.border}`}>
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
          ? (searchOpen ? 'pt-[160px]' : (isOpen && statusBarVisible ? 'pt-[115px]' : isOpen ? 'pt-[100px]' : 'pt-[130px]'))
          : (searchOpen ? 'pt-[110px]' : (isOpen && statusBarVisible ? 'pt-[55px]' : isOpen ? 'pt-[40px]' : 'pt-[75px]'))
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
                    
                    {/* Mobile: Scroll Horizontal 2.5 itens | Desktop: Grade maior */}
                    <div 
                      className="flex lg:grid gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 snap-x snap-mandatory lg:snap-none scrollbar-hide lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 lg:gap-4"
                    >
                      {categoryProducts.map(product => (
                        <div 
                          key={product.id} 
                          className={`${t.bgCard} rounded-xl overflow-hidden border ${t.border} cursor-pointer snap-start flex-shrink-0 lg:flex-shrink hover:shadow-lg transition-shadow cardapio-item-mobile`}
                          onClick={() => openProductPopup(product)}
                        >
                          {/* Imagem */}
                          <div className={`aspect-square lg:aspect-[4/3] ${t.bgMuted} relative overflow-hidden`}>
                            {product.photo_url ? (
                              <img 
                                src={getImageUrl(product.photo_url)} 
                                alt={product.name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-2xl lg:text-3xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-2.5 lg:p-3">
                            <h3 className={`font-semibold ${t.text} text-sm lg:text-base line-clamp-1 lg:line-clamp-2 leading-tight mb-1`}>{product.name}</h3>
                            {product.description && (
                              <p className={`${t.textMuted} text-[11px] lg:text-xs line-clamp-2 mb-1.5 leading-relaxed`}>{product.description}</p>
                            )}
                            <span className="text-orange-500 font-bold text-sm lg:text-base">
                              R$ {product.sale_price?.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      ))}
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
          <ClubeAddadTab 
            loggedClient={loggedClient}
            onLogin={() => setShowLoginModal(true)}
            onClientUpdate={handleClientUpdate}
            darkMode={darkMode}
            t={t}
            clubeConfigProp={clubeConfig}
          />
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
                  {cart.map(item => {
                    // Montar resumo das etapas selecionadas
                    const getStepsSummary = () => {
                      if (!item.step_selections || !item.order_steps) return [];
                      const summary = [];
                      
                      // Filtrar etapas baseado no tipo
                      const relevantSteps = item.order_steps.filter(step => {
                        if (item.combo_type === 'simples') return !step.combo_only;
                        return true;
                      });
                      
                      relevantSteps.forEach((step, index) => {
                        const selectedItems = item.step_selections[index] || [];
                        if (selectedItems.length > 0) {
                          const itemNames = selectedItems.map(itemId => {
                            const stepItem = step.items?.find(i => i.product_id === itemId);
                            return stepItem?.product_name || '';
                          }).filter(Boolean);
                          
                          if (itemNames.length > 0) {
                            summary.push({
                              stepName: step.name,
                              items: itemNames
                            });
                          }
                        }
                      });
                      return summary;
                    };
                    
                    const stepsSummary = getStepsSummary();
                    
                    return (
                      <div key={item.cartItemId || item.id} className={`${t.bgCartItem} rounded-lg p-2`}>
                        <div className="flex gap-2">
                          <div className={`w-12 h-12 ${t.bgMuted} rounded-lg flex-shrink-0 overflow-hidden`}>
                            {item.photo_url ? (
                              <img src={getImageUrl(item.photo_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <h4 className={`font-medium ${t.text} text-xs truncate`}>{item.name}</h4>
                              {item.combo_type && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${
                                  item.combo_type === 'combo' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {item.combo_type === 'combo' ? 'COMBO' : 'SIMPLES'}
                                </span>
                              )}
                            </div>
                            <p className="text-orange-500 font-semibold text-xs">
                              R$ {((item.final_price || item.sale_price) * item.quantity).toFixed(2).replace('.', ',')}
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
                        
                        {/* Etapas Selecionadas */}
                        {stepsSummary.length > 0 && (
                          <div className={`mt-2 pt-2 border-t ${t.border} space-y-1`}>
                            {stepsSummary.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className={`text-[9px] ${t.textMuted} flex-shrink-0`}>{step.stepName}:</span>
                                <span className={`text-[9px] ${t.text}`}>{step.items.join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Observação */}
                        {item.observation && (
                          <div className={`mt-2 pt-2 border-t ${t.border}`}>
                            <p className={`text-[9px] ${t.textMuted} italic`}>
                              📝 {item.observation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${activeTab === 'clube' ? 'text-orange-500' : t.textMuted}`}
          >
            <Crown className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight text-center">Clube {clubeConfig.clube_nome}</span>
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
        allProducts={products}
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
