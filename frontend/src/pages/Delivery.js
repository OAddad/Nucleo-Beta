import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Check, Clock, ChefHat, Package, Truck, User, Phone, MapPin,
  ArrowLeft, X, RefreshCw, ToggleLeft, ToggleRight, Bike, ShoppingBag,
  Store, CreditCard, DollarSign, Banknote, Eye, FileText, MessageSquare,
  Navigation, Calendar, Hash, XCircle, AlertTriangle
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// Status dos pedidos com cores e etapas
const statusConfig = {
  aguardando_aceite: { label: "Aguardando Aceite", color: "bg-orange-500", step: 1 },
  producao: { label: "Em Produção", color: "bg-yellow-500", step: 2 },
  pronto: { label: "Pronto", color: "bg-green-500", step: 3 },
  na_bag: { label: "Na Bag", color: "bg-blue-500", step: 4 },
  em_rota: { label: "Em Rota", color: "bg-purple-500", step: 5 },
  concluido: { label: "Concluído", color: "bg-emerald-600", step: 6 },
  cancelado: { label: "Cancelado", color: "bg-red-500", step: 0 },
};

export default function Delivery() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const autoAcceptProcessing = useRef(false);
  
  // Modal de criar entregador
  const [criarEntregadorModalOpen, setCriarEntregadorModalOpen] = useState(false);
  const [novoEntregadorNome, setNovoEntregadorNome] = useState("");
  const [novoEntregadorTelefone, setNovoEntregadorTelefone] = useState("");

  // Seleção múltipla na coluna PRONTO
  const [entregadorProntoSelecionado, setEntregadorProntoSelecionado] = useState("");
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);

  // Modal de pagamento para retirada
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);
  const [pedidoParaPagamento, setPedidoParaPagamento] = useState(null);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState("");

  // Modal de detalhes do pedido
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);

  // Modal de cancelamento
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  // Modal de novo pedido (cardápio popup)
  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false);

  // Carregar dados
  const fetchData = useCallback(async () => {
    try {
      const [pedidosRes, entregadoresRes, settingsRes] = await Promise.all([
        axios.get(`${API}/pedidos`),
        axios.get(`${API}/entregadores`),
        axios.get(`${API}/system/settings`)
      ]);
      
      setPedidos(pedidosRes.data);
      setEntregadores(entregadoresRes.data);
      setAutoAccept(settingsRes.data.delivery_auto_accept || false);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh a cada 5 segundos
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Processar aceite automático
  useEffect(() => {
    if (autoAccept && !autoAcceptProcessing.current) {
      const pedidosAguardando = pedidos.filter(p => 
        p.status === 'aguardando_aceite' && 
        (p.modulo === 'Delivery' || p.tipo_entrega === 'delivery' || p.tipo_entrega === 'pickup')
      );
      
      if (pedidosAguardando.length > 0) {
        autoAcceptProcessing.current = true;
        
        Promise.all(
          pedidosAguardando.map(pedido =>
            axios.patch(`${API}/pedidos/${pedido.id}/status?status=producao`)
          )
        ).then(() => {
          fetchData();
        }).catch(error => {
          console.error("Erro no aceite automático:", error);
        }).finally(() => {
          autoAcceptProcessing.current = false;
        });
      }
    }
  }, [pedidos, autoAccept, fetchData]);

  // Toggle aceite automático
  const handleToggleAutoAccept = async () => {
    try {
      const newValue = !autoAccept;
      await axios.put(`${API}/system/settings`, {
        delivery_auto_accept: newValue
      }, getAuthHeader());
      setAutoAccept(newValue);
      toast.success(newValue ? "Aceite automático ativado" : "Aceite automático desativado");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao alterar configuração");
    }
  };

  // Aceitar pedido
  const handleAceitar = async (pedidoId, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=producao`);
      toast.success("Pedido aceito!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao aceitar pedido");
    }
  };

  // Marcar como pronto
  const handleMarcarPronto = async (pedidoId, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=pronto`);
      toast.success("Pedido marcado como pronto!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao marcar pedido como pronto");
    }
  };

  // Abrir página do entregador
  const handleAbrirEntregador = (entregador) => {
    // Navegar para página de detalhes do entregador (melhor para mobile)
    // Caminho absoluto para garantir que funcione de qualquer lugar
    console.log("Navegando para entregador:", entregador.id);
    navigate(`/admin/entregador/${entregador.id}`);
  };

  // Criar novo entregador
  const handleCriarEntregador = async () => {
    if (!novoEntregadorNome.trim()) {
      toast.error("Digite o nome do entregador");
      return;
    }
    
    try {
      await axios.post(`${API}/entregadores`, {
        nome: novoEntregadorNome,
        telefone: novoEntregadorTelefone
      }, getAuthHeader());
      
      toast.success("Entregador cadastrado!");
      setCriarEntregadorModalOpen(false);
      setNovoEntregadorNome("");
      setNovoEntregadorTelefone("");
      fetchData();
    } catch (error) {
      toast.error("Erro ao cadastrar entregador");
    }
  };

  // Toggle seleção de pedido na coluna PRONTO (apenas delivery)
  const togglePedidoSelecionado = (pedidoId, e) => {
    if (e) e.stopPropagation();
    setPedidosSelecionados(prev => {
      if (prev.includes(pedidoId)) {
        return prev.filter(id => id !== pedidoId);
      } else {
        return [...prev, pedidoId];
      }
    });
  };

  // Selecionar/deselecionar todos os pedidos prontos (apenas delivery, não retirada)
  const toggleSelecionarTodos = () => {
    const pedidosProntosDelivery = getPedidosByStatus('pronto').filter(p => !isRetirada(p));
    if (pedidosSelecionados.length === pedidosProntosDelivery.length) {
      setPedidosSelecionados([]);
    } else {
      setPedidosSelecionados(pedidosProntosDelivery.map(p => p.id));
    }
  };

  // Enviar pedidos selecionados para o entregador
  const handleEnviarPedidosEmLote = async () => {
    if (!entregadorProntoSelecionado) {
      toast.error("Selecione um entregador");
      return;
    }
    if (pedidosSelecionados.length === 0) {
      toast.error("Selecione pelo menos um pedido");
      return;
    }

    try {
      await Promise.all(pedidosSelecionados.map(pedidoId =>
        axios.patch(
          `${API}/pedidos/${pedidoId}/entregador?entregador_id=${entregadorProntoSelecionado}`,
          {},
          getAuthHeader()
        )
      ));
      
      toast.success(`${pedidosSelecionados.length} pedido(s) enviado(s) para a BAG!`);
      setPedidosSelecionados([]);
      setEntregadorProntoSelecionado("");
      fetchData();
    } catch (error) {
      toast.error("Erro ao enviar pedidos");
    }
  };

  // Verificar se é pedido de retirada
  const isRetirada = (pedido) => pedido.tipo_entrega === 'pickup';

  // Abrir modal de pagamento para retirada
  const handleAbrirPagamento = (pedido, e) => {
    if (e) e.stopPropagation();
    setPedidoParaPagamento(pedido);
    setFormaPagamentoSelecionada(pedido.forma_pagamento || "");
    setPagamentoModalOpen(true);
  };

  // Finalizar pedido de retirada com pagamento
  const handleFinalizarRetirada = async () => {
    if (!pedidoParaPagamento) return;
    
    if (!formaPagamentoSelecionada) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    
    try {
      if (formaPagamentoSelecionada !== pedidoParaPagamento.forma_pagamento) {
        await axios.put(`${API}/pedidos/${pedidoParaPagamento.id}`, {
          forma_pagamento: formaPagamentoSelecionada
        }, getAuthHeader());
      }
      
      await axios.patch(`${API}/pedidos/${pedidoParaPagamento.id}/status?status=concluido`);
      
      toast.success("Pedido finalizado com sucesso!");
      setPagamentoModalOpen(false);
      setPedidoParaPagamento(null);
      setFormaPagamentoSelecionada("");
      fetchData();
    } catch (error) {
      toast.error("Erro ao finalizar pedido");
    }
  };

  // Abrir modal de cancelamento
  const handleAbrirCancelar = (pedido, e) => {
    if (e) e.stopPropagation();
    setPedidoParaCancelar(pedido);
    setMotivoCancelamento("");
    setCancelarModalOpen(true);
  };

  // Cancelar pedido com motivo
  const handleCancelarPedido = async () => {
    if (!pedidoParaCancelar) return;
    
    if (!motivoCancelamento || motivoCancelamento.trim().length < 3) {
      toast.error("Informe o motivo do cancelamento (mínimo 3 caracteres)");
      return;
    }
    
    try {
      await axios.patch(`${API}/pedidos/${pedidoParaCancelar.id}/cancelar`, {
        motivo: motivoCancelamento.trim()
      }, getAuthHeader());
      
      toast.success("Pedido cancelado!");
      setCancelarModalOpen(false);
      setPedidoParaCancelar(null);
      setMotivoCancelamento("");
      setDetalhesModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao cancelar pedido");
    }
  };

  // Abrir detalhes do pedido
  const handleAbrirDetalhes = (pedido) => {
    setPedidoDetalhes(pedido);
    setDetalhesModalOpen(true);
  };

  // Ir para cardápio para novo pedido
  const handleNovoPedido = () => {
    setNovoPedidoModalOpen(true);
  };

  // Filtrar pedidos por status
  const getPedidosByStatus = (status) => {
    const filtered = pedidos.filter(p => 
      p.status === status && 
      (p.modulo === 'Delivery' || p.tipo_entrega === 'delivery' || p.tipo_entrega === 'pickup')
    );
    
    return filtered.sort((a, b) => {
      if (a.tipo_entrega === 'pickup' && b.tipo_entrega !== 'pickup') return -1;
      if (a.tipo_entrega !== 'pickup' && b.tipo_entrega === 'pickup') return 1;
      return 0;
    });
  };

  // Entregadores com pedidos na BAG (filtrados)
  const entregadoresComPedidos = entregadores.filter(e => {
    const count = pedidos.filter(p => 
      p.entregador_id === e.id && 
      (p.status === 'na_bag' || p.status === 'em_rota')
    ).length;
    return count > 0;
  });

  // Calcular pedidos na bag por entregador
  const getEntregadorBagCount = (entregadorId) => {
    return pedidos.filter(p => 
      p.entregador_id === entregadorId && 
      (p.status === 'na_bag' || p.status === 'em_rota')
    ).length;
  };

  // Formatação de data
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Renderizar etapas do pedido (corrigido e simétrico)
  const renderEtapas = (pedido) => {
    const isPickup = isRetirada(pedido);
    const status = pedido.status;
    
    const etapasDelivery = [
      { key: 'aguardando_aceite', label: 'Aceite' },
      { key: 'producao', label: 'Produção' },
      { key: 'pronto', label: 'Pronto' },
      { key: 'na_bag', label: 'Bag' },
      { key: 'em_rota', label: 'Rota' },
      { key: 'concluido', label: 'Entregue' },
    ];
    
    const etapasRetirada = [
      { key: 'aguardando_aceite', label: 'Aceite' },
      { key: 'producao', label: 'Produção' },
      { key: 'pronto', label: 'Pronto' },
      { key: 'concluido', label: 'Retirado' },
    ];
    
    const etapas = isPickup ? etapasRetirada : etapasDelivery;
    const currentIndex = etapas.findIndex(e => e.key === status);
    
    if (status === 'cancelado') {
      return (
        <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
          <XCircle className="w-5 h-5" />
          <span className="font-semibold">Pedido Cancelado</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-between w-full">
        {etapas.map((etapa, index) => (
          <div key={etapa.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                index <= currentIndex 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-muted text-muted-foreground border-muted'
              }`}>
                {index <= currentIndex ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`text-[10px] mt-1 text-center ${
                index <= currentIndex ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                {etapa.label}
              </span>
            </div>
            {index < etapas.length - 1 && (
              <div className={`h-0.5 flex-1 -mt-4 ${
                index < currentIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Card de Pedido reutilizável
  const PedidoCard = ({ pedido, showButton, buttonType, onButtonClick, selectable, selected, onSelect }) => {
    const retirada = isRetirada(pedido);
    
    return (
      <div 
        onClick={() => handleAbrirDetalhes(pedido)}
        className={`rounded-lg border p-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${
          retirada 
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 border-2 border-dashed' 
            : selected 
              ? 'bg-background border-primary ring-2 ring-primary/20'
              : 'bg-background hover:border-primary/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {selectable && !retirada && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect && onSelect(pedido.id, e)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            )}
            {retirada && (
              <span className="bg-amber-500 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">
                <Store className="w-3 h-3" />
                RETIRADA
              </span>
            )}
            <span className="font-mono text-xs text-muted-foreground">{pedido.codigo}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatTime(pedido.created_at)}</span>
        </div>
        
        <p className="font-semibold text-sm truncate">{pedido.cliente_nome || "Cliente"}</p>
        <p className="text-xs text-muted-foreground truncate mb-1">
          {retirada ? (
            <span className="flex items-center gap-1">
              <Store className="w-3 h-3" /> Retirada no local
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {pedido.endereco_rua || "Sem endereço"}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          {pedido.items?.length || 0} item(s)
        </p>
        <p className="font-bold text-primary text-sm mb-2">R$ {(pedido.total || 0).toFixed(2)}</p>
        
        {showButton && (
          <Button 
            size="sm" 
            className="w-full"
            onClick={(e) => onButtonClick && onButtonClick(e)}
          >
            {buttonType === 'aceitar' && <><Check className="w-4 h-4 mr-1" /> Aceitar</>}
            {buttonType === 'pronto' && <><Package className="w-4 h-4 mr-1" /> Pronto</>}
            {buttonType === 'finalizar' && <><DollarSign className="w-4 h-4 mr-1" /> Finalizar</>}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header com botão NOVO PEDIDO */}
      <div className="p-4">
        <Button
          onClick={handleNovoPedido}
          className="w-full h-14 text-lg font-bold"
          size="lg"
        >
          <Plus className="w-6 h-6 mr-2" />
          NOVO PEDIDO
        </Button>
      </div>

      {/* Área principal com 4 colunas */}
      <div className="flex-1 flex gap-3 p-4 pt-0 overflow-hidden">
        
        {/* Coluna 1: AGUARDANDO ACEITE */}
        <div className={`flex flex-col rounded-xl border bg-card overflow-hidden min-w-0 transition-all ${
          autoAccept ? 'flex-[0.5]' : 'flex-1'
        }`}>
          <div className={`p-3 bg-muted/50 border-b`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">AGUARDANDO ACEITE</h3>
              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {getPedidosByStatus('aguardando_aceite').length}
              </span>
            </div>
            
            {/* Switch de aceite automático - MAIOR */}
            <button
              onClick={handleToggleAutoAccept}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-sm transition-all ${
                autoAccept 
                  ? 'bg-green-500 border-green-400 text-white' 
                  : 'bg-background border-input hover:bg-muted/50'
              }`}
            >
              <span className="font-semibold">
                {autoAccept ? '✓ Auto-aceite ATIVO' : 'Aceite automático'}
              </span>
              {autoAccept ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
          </div>
          
          <div className={`flex-1 overflow-auto p-2 space-y-2 ${autoAccept ? 'hidden' : ''}`}>
            {getPedidosByStatus('aguardando_aceite').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <p>Nenhum pedido aguardando</p>
              </div>
            ) : (
              getPedidosByStatus('aguardando_aceite').map(pedido => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  showButton={true}
                  buttonType="aceitar"
                  onButtonClick={(e) => handleAceitar(pedido.id, e)}
                />
              ))
            )}
          </div>
          
          {autoAccept && (
            <div className="flex-1 flex items-center justify-center p-2">
              <div className="text-center text-green-600">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm font-medium">Aceitando automaticamente</p>
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2: EM PRODUÇÃO */}
        <div className="flex-[1.2] flex flex-col rounded-xl border bg-card overflow-hidden min-w-0">
          <div className="p-3 bg-muted/50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">EM PRODUÇÃO</h3>
              <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {getPedidosByStatus('producao').length}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {getPedidosByStatus('producao').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <ChefHat className="w-8 h-8 mb-2 opacity-30" />
                <p>Nenhum pedido em produção</p>
              </div>
            ) : (
              getPedidosByStatus('producao').map(pedido => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  showButton={true}
                  buttonType="pronto"
                  onButtonClick={(e) => handleMarcarPronto(pedido.id, e)}
                />
              ))
            )}
          </div>
        </div>

        {/* Coluna 3: PRONTO */}
        <div className="flex-[1.2] flex flex-col rounded-xl border bg-card overflow-hidden min-w-0">
          <div className="p-3 bg-muted/50 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">PRONTO</h3>
              <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {getPedidosByStatus('pronto').length}
              </span>
            </div>
            
            {/* Seletor de entregador para envio em lote (apenas para delivery) */}
            {getPedidosByStatus('pronto').filter(p => !isRetirada(p)).length > 0 && (
              <div className="space-y-2">
                <Select value={entregadorProntoSelecionado} onValueChange={setEntregadorProntoSelecionado}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar entregador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entregadores.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={toggleSelecionarTodos}
                  >
                    {pedidosSelecionados.length === getPedidosByStatus('pronto').filter(p => !isRetirada(p)).length ? 'Desmarcar' : 'Marcar'} Todos
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 h-7 text-xs"
                    onClick={handleEnviarPedidosEmLote}
                    disabled={!entregadorProntoSelecionado || pedidosSelecionados.length === 0}
                  >
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Enviar ({pedidosSelecionados.length})
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {getPedidosByStatus('pronto').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Package className="w-8 h-8 mb-2 opacity-30" />
                <p>Nenhum pedido pronto</p>
              </div>
            ) : (
              getPedidosByStatus('pronto').map(pedido => (
                isRetirada(pedido) ? (
                  <PedidoCard
                    key={pedido.id}
                    pedido={pedido}
                    showButton={true}
                    buttonType="finalizar"
                    onButtonClick={(e) => handleAbrirPagamento(pedido, e)}
                  />
                ) : (
                  <PedidoCard
                    key={pedido.id}
                    pedido={pedido}
                    showButton={false}
                    selectable={true}
                    selected={pedidosSelecionados.includes(pedido.id)}
                    onSelect={togglePedidoSelecionado}
                  />
                )
              ))
            )}
          </div>
        </div>

        {/* Coluna 4: ENTREGADORES - MENOR */}
        <div className="flex-[0.8] flex flex-col rounded-xl border bg-card overflow-hidden min-w-0">
          <div className="p-3 bg-muted/50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">ENTREGADORES</h3>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 px-2 text-xs"
                onClick={() => setCriarEntregadorModalOpen(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Novo
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {entregadoresComPedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                <Bike className="w-8 h-8 mb-2 opacity-30" />
                <p>Nenhum entregador com pedidos</p>
                <p className="text-xs mt-1">Entregadores aparecem aqui quando têm pedidos na BAG</p>
              </div>
            ) : (
              entregadoresComPedidos.map(entregador => {
                const bagCount = getEntregadorBagCount(entregador.id);
                return (
                  <button
                    key={entregador.id}
                    onClick={() => handleAbrirEntregador(entregador)}
                    className="w-full bg-background rounded-xl border p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Bike className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{entregador.nome}</p>
                        {entregador.telefone && (
                          <p className="text-xs text-muted-foreground">{entregador.telefone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-2 rounded-full">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm font-bold">{bagCount}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Pedido */}
      <Dialog open={detalhesModalOpen} onOpenChange={setDetalhesModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes do Pedido
              {pedidoDetalhes && (
                <span className="font-mono text-sm text-muted-foreground ml-2">
                  {pedidoDetalhes.codigo}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {pedidoDetalhes && (
            <div className="space-y-4">
              {/* Status e Tipo */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusConfig[pedidoDetalhes.status]?.color || 'bg-gray-500'}`}>
                  {statusConfig[pedidoDetalhes.status]?.label || pedidoDetalhes.status}
                </span>
                {isRetirada(pedidoDetalhes) && (
                  <span className="bg-amber-500 text-white text-sm px-3 py-1 rounded-full font-bold flex items-center gap-1">
                    <Store className="w-4 h-4" />
                    RETIRADA
                  </span>
                )}
              </div>

              {/* Etapas - CORRIGIDO */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Etapas do Pedido
                </h4>
                {renderEtapas(pedidoDetalhes)}
              </div>

              {/* Motivo do Cancelamento */}
              {pedidoDetalhes.status === 'cancelado' && pedidoDetalhes.motivo_cancelamento && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Motivo do Cancelamento
                  </h4>
                  <p className="text-sm">{pedidoDetalhes.motivo_cancelamento}</p>
                </div>
              )}

              {/* Cliente */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Cliente
                </h4>
                <p className="font-medium">{pedidoDetalhes.cliente_nome || "Não informado"}</p>
                {pedidoDetalhes.cliente_telefone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {pedidoDetalhes.cliente_telefone}
                  </p>
                )}
              </div>

              {/* Endereço (apenas para delivery) */}
              {!isRetirada(pedidoDetalhes) && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Endereço de Entrega
                  </h4>
                  <p className="text-sm">
                    {pedidoDetalhes.endereco_rua && <span>{pedidoDetalhes.endereco_rua}</span>}
                    {pedidoDetalhes.endereco_numero && <span>, {pedidoDetalhes.endereco_numero}</span>}
                  </p>
                  {pedidoDetalhes.endereco_complemento && (
                    <p className="text-sm text-muted-foreground">{pedidoDetalhes.endereco_complemento}</p>
                  )}
                  {pedidoDetalhes.endereco_bairro && (
                    <p className="text-sm text-muted-foreground">{pedidoDetalhes.endereco_bairro}</p>
                  )}
                </div>
              )}

              {/* Itens */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Itens do Pedido
                </h4>
                <div className="space-y-2">
                  {pedidoDetalhes.items && pedidoDetalhes.items.length > 0 ? (
                    pedidoDetalhes.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-start py-1 border-b border-muted last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {item.quantidade || item.qty || 1}x {item.nome || item.name}
                          </p>
                          {item.observacao && (
                            <p className="text-xs text-muted-foreground">Obs: {item.observacao}</p>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          R$ {((item.preco_unitario || item.preco || item.price || 0) * (item.quantidade || item.qty || 1)).toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum item</p>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-primary text-lg">R$ {(pedidoDetalhes.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Observação */}
              {pedidoDetalhes.observacao && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <MessageSquare className="w-4 h-4" /> Observação
                  </h4>
                  <p className="text-sm">{pedidoDetalhes.observacao}</p>
                </div>
              )}

              {/* Pagamento e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Pagamento</h4>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <CreditCard className="w-4 h-4" />
                    {pedidoDetalhes.forma_pagamento || "Não definido"}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Data/Hora</h4>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(pedidoDetalhes.created_at)} {formatTime(pedidoDetalhes.created_at)}
                  </p>
                </div>
              </div>

              {/* Entregador */}
              {pedidoDetalhes.entregador_nome && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Bike className="w-4 h-4" /> Entregador
                  </h4>
                  <p className="text-sm font-medium">{pedidoDetalhes.entregador_nome}</p>
                </div>
              )}

              {/* Botão de Cancelar */}
              {pedidoDetalhes.status !== 'cancelado' && pedidoDetalhes.status !== 'concluido' && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={(e) => handleAbrirCancelar(pedidoDetalhes, e)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Pedido
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={cancelarModalOpen} onOpenChange={setCancelarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancelar Pedido
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {pedidoParaCancelar && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-mono text-sm">{pedidoParaCancelar.codigo}</p>
                <p className="font-semibold">{pedidoParaCancelar.cliente_nome}</p>
                <p className="text-lg font-bold text-primary mt-1">
                  R$ {(pedidoParaCancelar.total || 0).toFixed(2)}
                </p>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-semibold">
                Motivo do Cancelamento <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                className="mt-2 min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este motivo será visível para o cliente no rastreio do pedido.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCancelarModalOpen(false)} className="flex-1">
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelarPedido} 
                disabled={!motivoCancelamento || motivoCancelamento.trim().length < 3}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Entregador */}
      <Dialog open={criarEntregadorModalOpen} onOpenChange={setCriarEntregadorModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Entregador</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={novoEntregadorNome}
                onChange={(e) => setNovoEntregadorNome(e.target.value)}
                placeholder="Nome do entregador"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Telefone</Label>
              <Input
                value={novoEntregadorTelefone}
                onChange={(e) => setNovoEntregadorTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCriarEntregadorModalOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCriarEntregador} className="flex-1">
                <Plus className="w-4 h-4 mr-1" />
                Cadastrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento para Retirada */}
      <Dialog open={pagamentoModalOpen} onOpenChange={setPagamentoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Finalizar Pedido - Retirada
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {pedidoParaPagamento && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border-2 border-dashed border-amber-400">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    RETIRADA
                  </span>
                  <span className="font-mono text-sm">{pedidoParaPagamento.codigo}</span>
                </div>
                <p className="font-semibold">{pedidoParaPagamento.cliente_nome}</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  R$ {(pedidoParaPagamento.total || 0).toFixed(2)}
                </p>
              </div>
            )}
            
            <div>
              <Label className="text-base font-semibold">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('dinheiro')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'dinheiro'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <Banknote className={`w-6 h-6 ${formaPagamentoSelecionada === 'dinheiro' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'dinheiro' ? 'text-primary' : ''}`}>Dinheiro</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('pix')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'pix'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <svg className={`w-6 h-6 ${formaPagamentoSelecionada === 'pix' ? 'text-primary' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L18.36 18.55L13.13 22.19M5.64 12.5L1.81 10.87L5.45 5.64L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M19.36 8.1L21.82 5.64L18.19 1.81L16.56 5.45C17.67 6.19 18.64 7.09 19.36 8.1M6.64 15.36L5.27 19.55L1.64 18.18L5.09 12.82L6.64 15.36M12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8M17.36 6.64L12.82 5.09L18.18 1.64L19.55 5.27L17.36 6.64M15.36 17.36L19.55 18.73L18.18 22.36L12.82 18.91L15.36 17.36M8.64 6.64L5.27 4.45L4.45 5.27L6.64 8.64L8.64 6.64Z"/>
                  </svg>
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'pix' ? 'text-primary' : ''}`}>PIX</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('credito')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'credito'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${formaPagamentoSelecionada === 'credito' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'credito' ? 'text-primary' : ''}`}>Crédito</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('debito')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'debito'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${formaPagamentoSelecionada === 'debito' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'debito' ? 'text-primary' : ''}`}>Débito</span>
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPagamentoModalOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalizarRetirada} 
                disabled={!formaPagamentoSelecionada}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Pedido - Cardápio Completo */}
      <CardapioPopup 
        open={novoPedidoModalOpen} 
        onClose={() => setNovoPedidoModalOpen(false)}
        onPedidoCriado={() => {
          setNovoPedidoModalOpen(false);
          fetchData();
          toast.success("Pedido criado com sucesso!");
        }}
      />
    </div>
  );
}

// ==================== COMPONENTE CARDÁPIO POPUP ====================
function CardapioPopup({ open, onClose, onPedidoCriado }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  
  // Cliente selecionado ou novo
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "" });
  const [creatingCliente, setCreatingCliente] = useState(false);
  
  // Tipo de entrega e endereço
  const [tipoEntrega, setTipoEntrega] = useState("delivery"); // delivery ou pickup
  const [endereco, setEndereco] = useState({
    rua: "",
    numero: "",
    bairro: "",
    complemento: "",
    referencia: ""
  });
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  
  // Pagamento e observações
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [trocoPara, setTrocoPara] = useState("");
  
  // Etapa do checkout
  const [step, setStep] = useState(1); // 1 = Produtos, 2 = Cliente, 3 = Entrega, 4 = Pagamento
  
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Carregar dados
  useEffect(() => {
    if (open) {
      setLoadingProducts(true);
      Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchClientes(),
        fetchBairros()
      ]).finally(() => setLoadingProducts(false));
    }
  }, [open]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products`, getAuthHeader());
      const prods = Array.isArray(res.data) ? res.data : [];
      // Filtrar produtos que NÃO são insumos (is_insumo = false)
      // Insumos são ingredientes/adicionais internos que não aparecem no cardápio
      setProducts(prods.filter(p => !p.is_insumo));
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProducts([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`, getAuthHeader());
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategories([]);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await axios.get(`${API}/clientes`, getAuthHeader());
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBairros = async () => {
    try {
      const res = await axios.get(`${API}/bairros`, getAuthHeader());
      setBairros(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Erro ao carregar bairros:", error);
      setBairros([]);
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  // Filtrar clientes
  const filteredClientes = clientes.filter(c => 
    c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefone?.includes(clienteSearch)
  ).slice(0, 10);

  // Adicionar ao carrinho
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Remover do carrinho
  const removeFromCart = (productId) => {
    const existing = cart.find(item => item.id === productId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(item => 
        item.id === productId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.id !== productId));
    }
  };

  // Calcular totais
  const subtotal = cart.reduce((acc, item) => acc + (item.selling_price || 0) * item.quantity, 0);
  const total = subtotal + (tipoEntrega === "delivery" ? taxaEntrega : 0);

  // Buscar taxa de entrega pelo bairro
  useEffect(() => {
    if (endereco.bairro && tipoEntrega === "delivery") {
      const bairro = bairros.find(b => b.nome.toLowerCase() === endereco.bairro.toLowerCase());
      if (bairro) {
        setTaxaEntrega(bairro.taxa_entrega || 0);
      }
    }
  }, [endereco.bairro, bairros, tipoEntrega]);

  // Criar cliente
  const handleCriarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    
    setCreatingCliente(true);
    try {
      const res = await axios.post(`${API}/clientes`, {
        nome: novoCliente.nome,
        telefone: novoCliente.telefone
      }, getAuthHeader());
      
      setSelectedCliente(res.data);
      setClientes([...clientes, res.data]);
      setNovoCliente({ nome: "", telefone: "" });
      toast.success("Cliente criado!");
    } catch (error) {
      toast.error("Erro ao criar cliente");
    } finally {
      setCreatingCliente(false);
    }
  };

  // Criar pedido
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Adicione produtos ao carrinho");
      return;
    }
    
    if (!selectedCliente) {
      toast.error("Selecione um cliente");
      return;
    }
    
    if (tipoEntrega === "delivery" && !endereco.rua) {
      toast.error("Informe o endereço de entrega");
      return;
    }
    
    if (!formaPagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    
    setSubmitting(true);
    try {
      const pedidoData = {
        cliente_id: selectedCliente.id,
        cliente_nome: selectedCliente.nome,
        cliente_telefone: selectedCliente.telefone,
        tipo_entrega: tipoEntrega,
        modulo: "Delivery",
        itens: cart.map(item => ({
          produto_id: item.id,
          produto_nome: item.name,
          quantidade: item.quantity,
          preco_unitario: item.selling_price || 0,
          observacao: item.observation || ""
        })),
        subtotal: subtotal,
        taxa_entrega: tipoEntrega === "delivery" ? taxaEntrega : 0,
        total: total,
        forma_pagamento: formaPagamento,
        troco_para: formaPagamento === "dinheiro" && trocoPara ? parseFloat(trocoPara) : null,
        observacao: observacao,
        endereco_entrega: tipoEntrega === "delivery" ? {
          rua: endereco.rua,
          numero: endereco.numero,
          bairro: endereco.bairro,
          complemento: endereco.complemento,
          referencia: endereco.referencia
        } : null,
        status: "aguardando_aceite"
      };
      
      await axios.post(`${API}/pedidos`, pedidoData, getAuthHeader());
      
      // Reset estado
      setCart([]);
      setSelectedCliente(null);
      setEndereco({ rua: "", numero: "", bairro: "", complemento: "", referencia: "" });
      setFormaPagamento("");
      setObservacao("");
      setTrocoPara("");
      setStep(1);
      
      onPedidoCriado();
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset ao fechar
  const handleClose = () => {
    setCart([]);
    setSelectedCliente(null);
    setStep(1);
    setSearchTerm("");
    setSelectedCategory(null);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col bg-background">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <span>Novo Pedido - Delivery</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-normal">
              <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>1. Produtos</span>
              <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>2. Cliente</span>
              <span className={`px-2 py-1 rounded ${step === 3 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>3. Entrega</span>
              <span className={`px-2 py-1 rounded ${step === 4 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>4. Pagamento</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex">
          {/* Área principal */}
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            {/* ETAPA 1: PRODUTOS */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Busca e categorias */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="Buscar produtos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Loading state */}
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="ml-2">Carregando produtos...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto encontrado</p>
                  </div>
                ) : (
                  /* Grid de produtos */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map(product => (
                      <div 
                        key={product.id}
                        className="border rounded-lg p-3 hover:border-orange-500 cursor-pointer transition-all bg-card"
                        onClick={() => addToCart(product)}
                      >
                        {product.photo_url ? (
                          <img 
                            src={`/api${product.photo_url}`} 
                            alt={product.name}
                            className="w-full h-24 object-cover rounded mb-2"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        ) : (
                          <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                        <p className="text-orange-600 font-bold">R$ {(product.sale_price || 0).toFixed(2)}</p>
                        <Button size="sm" className="w-full mt-2 bg-orange-500 hover:bg-orange-600">
                          <Plus className="w-4 h-4 mr-1" /> Adicionar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* ETAPA 2: CLIENTE */}
            {step === 2 && (
              <div className="space-y-4 max-w-xl">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> Selecione o Cliente
                </h3>
                
                {/* Buscar cliente existente */}
                <div className="relative">
                  <Label>Buscar cliente</Label>
                  <Input
                    placeholder="Nome ou telefone..."
                    value={clienteSearch}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setShowClienteDropdown(true);
                    }}
                    onFocus={() => setShowClienteDropdown(true)}
                  />
                  {showClienteDropdown && clienteSearch && filteredClientes.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredClientes.map(cliente => (
                        <div
                          key={cliente.id}
                          className="p-3 hover:bg-muted cursor-pointer flex justify-between"
                          onClick={() => {
                            setSelectedCliente(cliente);
                            setClienteSearch("");
                            setShowClienteDropdown(false);
                          }}
                        >
                          <span className="font-medium">{cliente.nome}</span>
                          <span className="text-muted-foreground">{cliente.telefone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Cliente selecionado */}
                {selectedCliente && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-600">{selectedCliente.nome}</p>
                        <p className="text-green-500">{selectedCliente.telefone}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCliente(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Criar novo cliente */}
                {!selectedCliente && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Ou criar novo cliente:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={novoCliente.nome}
                          onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
                          placeholder="Nome do cliente"
                        />
                      </div>
                      <div>
                        <Label>Telefone *</Label>
                        <Input
                          value={novoCliente.telefone}
                          onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                    <Button 
                      className="mt-3 bg-green-600 hover:bg-green-700"
                      onClick={handleCriarCliente}
                      disabled={creatingCliente}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Criar Cliente
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* ETAPA 3: ENTREGA */}
            {step === 3 && (
              <div className="space-y-4 max-w-xl">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5" /> Tipo de Entrega
                </h3>
                
                {/* Tipo de entrega */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      tipoEntrega === "delivery" ? "border-orange-500 bg-orange-500/10" : "border-border"
                    }`}
                    onClick={() => setTipoEntrega("delivery")}
                  >
                    <Bike className="w-8 h-8 text-orange-500" />
                    <span className="font-medium">Delivery</span>
                    <span className="text-xs text-muted-foreground">Entrega no endereço</span>
                  </button>
                  <button
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      tipoEntrega === "pickup" ? "border-orange-500 bg-orange-500/10" : "border-border"
                    }`}
                    onClick={() => setTipoEntrega("pickup")}
                  >
                    <Store className="w-8 h-8 text-orange-500" />
                    <span className="font-medium">Retirada</span>
                    <span className="text-xs text-muted-foreground">Cliente retira no local</span>
                  </button>
                </div>
                
                {/* Endereço (se delivery) */}
                {tipoEntrega === "delivery" && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Endereço de Entrega
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label>Rua *</Label>
                        <Input
                          value={endereco.rua}
                          onChange={(e) => setEndereco({...endereco, rua: e.target.value})}
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div>
                        <Label>Número *</Label>
                        <Input
                          value={endereco.numero}
                          onChange={(e) => setEndereco({...endereco, numero: e.target.value})}
                          placeholder="Nº"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Bairro *</Label>
                        <Select value={endereco.bairro} onValueChange={(v) => setEndereco({...endereco, bairro: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {bairros.map(b => (
                              <SelectItem key={b.id} value={b.nome}>
                                {b.nome} - R$ {(b.taxa_entrega || 0).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          value={endereco.complemento}
                          onChange={(e) => setEndereco({...endereco, complemento: e.target.value})}
                          placeholder="Apto, bloco..."
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Referência</Label>
                      <Input
                        value={endereco.referencia}
                        onChange={(e) => setEndereco({...endereco, referencia: e.target.value})}
                        placeholder="Próximo a..."
                      />
                    </div>
                    {taxaEntrega > 0 && (
                      <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                        Taxa de entrega: <strong>R$ {taxaEntrega.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* ETAPA 4: PAGAMENTO */}
            {step === 4 && (
              <div className="space-y-4 max-w-xl">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Forma de Pagamento
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "dinheiro", label: "Dinheiro", icon: DollarSign },
                    { id: "pix", label: "PIX", icon: CreditCard },
                    { id: "cartao_credito", label: "Crédito", icon: CreditCard },
                    { id: "cartao_debito", label: "Débito", icon: CreditCard },
                  ].map(fp => (
                    <button
                      key={fp.id}
                      className={`p-3 border-2 rounded-lg flex items-center gap-2 transition-all ${
                        formaPagamento === fp.id ? "border-orange-500 bg-orange-500/10" : "border-border"
                      }`}
                      onClick={() => setFormaPagamento(fp.id)}
                    >
                      <fp.icon className="w-5 h-5" />
                      <span>{fp.label}</span>
                    </button>
                  ))}
                </div>
                
                {formaPagamento === "dinheiro" && (
                  <div>
                    <Label>Troco para (opcional)</Label>
                    <Input
                      type="number"
                      value={trocoPara}
                      onChange={(e) => setTrocoPara(e.target.value)}
                      placeholder="Ex: 50.00"
                    />
                  </div>
                )}
                
                <div>
                  <Label>Observações do pedido</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Alguma observação especial?"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Carrinho lateral */}
          <div className="w-80 border-l bg-muted/30 flex flex-col">
            <div className="p-3 border-b bg-card">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Carrinho ({cart.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-card p-3 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-orange-600 text-sm">R$ {(item.selling_price || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded bg-muted hover:bg-muted/80 flex items-center justify-center"
                        >
                          <span className="text-lg leading-none">-</span>
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => addToCart(item)}
                          className="w-6 h-6 rounded bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center"
                        >
                          <span className="text-lg leading-none">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Resumo e navegação */}
            <div className="p-3 border-t bg-card space-y-3">
              {selectedCliente && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Cliente:</span> {selectedCliente.nome}
                </div>
              )}
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {tipoEntrega === "delivery" && taxaEntrega > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa entrega:</span>
                    <span>R$ {taxaEntrega.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-orange-600">R$ {total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                    Voltar
                  </Button>
                )}
                {step < 4 ? (
                  <Button 
                    onClick={() => setStep(step + 1)} 
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    disabled={step === 1 && cart.length === 0}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={submitting || !formaPagamento}
                  >
                    {submitting ? "Criando..." : "Criar Pedido"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
