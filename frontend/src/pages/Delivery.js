import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Check, Clock, ChefHat, Package, Truck, User, Phone, MapPin,
  ArrowLeft, X, RefreshCw, ToggleLeft, ToggleRight, Bike, ShoppingBag,
  Store, CreditCard, DollarSign, Banknote, Eye, FileText, MessageSquare,
  Navigation, Calendar, Hash
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  
  // Modal de entregador
  const [entregadorModalOpen, setEntregadorModalOpen] = useState(false);
  const [selectedEntregador, setSelectedEntregador] = useState(null);
  const [entregadorPedidos, setEntregadorPedidos] = useState({ na_bag: [], em_rota: [] });
  
  // Modal de designar entregador
  const [designarModalOpen, setDesignarModalOpen] = useState(false);
  const [pedidoParaDesignar, setPedidoParaDesignar] = useState(null);
  const [entregadorSelecionado, setEntregadorSelecionado] = useState("");
  
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

  // Abrir modal para designar entregador
  const handleAbrirDesignar = (pedido) => {
    setPedidoParaDesignar(pedido);
    setEntregadorSelecionado("");
    setDesignarModalOpen(true);
  };

  // Designar entregador e enviar para BAG
  const handleDesignarEntregador = async () => {
    if (!entregadorSelecionado || !pedidoParaDesignar) return;
    
    try {
      await axios.patch(
        `${API}/pedidos/${pedidoParaDesignar.id}/entregador?entregador_id=${entregadorSelecionado}`,
        {},
        getAuthHeader()
      );
      toast.success("Pedido enviado para a BAG do entregador!");
      setDesignarModalOpen(false);
      setPedidoParaDesignar(null);
      fetchData();
    } catch (error) {
      toast.error("Erro ao designar entregador");
    }
  };

  // Abrir modal do entregador
  const handleAbrirEntregador = async (entregador) => {
    setSelectedEntregador(entregador);
    
    try {
      const res = await axios.get(`${API}/entregadores/${entregador.id}/pedidos`);
      const pedidosEntregador = res.data;
      
      setEntregadorPedidos({
        na_bag: pedidosEntregador.filter(p => p.status === 'na_bag'),
        em_rota: pedidosEntregador.filter(p => p.status === 'em_rota')
      });
      
      setEntregadorModalOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar pedidos do entregador");
    }
  };

  // Enviar para rota
  const handleEnviarParaRota = async (pedidoId) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=em_rota`);
      toast.success("Pedido enviado para rota de entrega!");
      
      // Atualizar dados do modal
      if (selectedEntregador) {
        const res = await axios.get(`${API}/entregadores/${selectedEntregador.id}/pedidos`);
        setEntregadorPedidos({
          na_bag: res.data.filter(p => p.status === 'na_bag'),
          em_rota: res.data.filter(p => p.status === 'em_rota')
        });
      }
      
      fetchData();
    } catch (error) {
      toast.error("Erro ao enviar para rota");
    }
  };

  // Marcar entrega concluída
  const handleConcluirEntrega = async (pedidoId) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=concluido`);
      toast.success("Entrega concluída!");
      
      // Atualizar dados do modal
      if (selectedEntregador) {
        const res = await axios.get(`${API}/entregadores/${selectedEntregador.id}/pedidos`);
        setEntregadorPedidos({
          na_bag: res.data.filter(p => p.status === 'na_bag'),
          em_rota: res.data.filter(p => p.status === 'em_rota')
        });
      }
      
      fetchData();
    } catch (error) {
      toast.error("Erro ao concluir entrega");
    }
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
      // Enviar cada pedido para o entregador
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
      // Atualizar forma de pagamento se necessário
      if (formaPagamentoSelecionada !== pedidoParaPagamento.forma_pagamento) {
        await axios.put(`${API}/pedidos/${pedidoParaPagamento.id}`, {
          forma_pagamento: formaPagamentoSelecionada
        }, getAuthHeader());
      }
      
      // Marcar como concluído
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

  // Abrir detalhes do pedido
  const handleAbrirDetalhes = (pedido) => {
    setPedidoDetalhes(pedido);
    setDetalhesModalOpen(true);
  };

  // Ir para cardápio para novo pedido
  const handleNovoPedido = () => {
    window.dispatchEvent(new CustomEvent('setActiveTopMenu', { detail: 'cardapio' }));
    toast.info("Selecione os produtos no cardápio para criar um novo pedido");
  };

  // Filtrar pedidos por status - inclui pedidos de delivery E retirada
  // Pedidos de retirada ficam no topo (destacados)
  const getPedidosByStatus = (status) => {
    const filtered = pedidos.filter(p => 
      p.status === status && 
      (p.modulo === 'Delivery' || p.tipo_entrega === 'delivery' || p.tipo_entrega === 'pickup')
    );
    
    // Ordenar: retirada primeiro, depois delivery
    return filtered.sort((a, b) => {
      if (a.tipo_entrega === 'pickup' && b.tipo_entrega !== 'pickup') return -1;
      if (a.tipo_entrega !== 'pickup' && b.tipo_entrega === 'pickup') return 1;
      return 0;
    });
  };

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

  // Renderizar etapas do pedido
  const renderEtapas = (status) => {
    const etapas = [
      { key: 'aguardando_aceite', label: 'Aguardando' },
      { key: 'producao', label: 'Produção' },
      { key: 'pronto', label: 'Pronto' },
      { key: 'na_bag', label: 'Na Bag' },
      { key: 'em_rota', label: 'Em Rota' },
      { key: 'concluido', label: 'Concluído' },
    ];
    
    const currentStep = statusConfig[status]?.step || 0;
    
    return (
      <div className="flex items-center gap-1">
        {etapas.map((etapa, index) => (
          <div key={etapa.key} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index + 1 <= currentStep 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {index + 1 <= currentStep ? <Check className="w-3 h-3" /> : index + 1}
            </div>
            {index < etapas.length - 1 && (
              <div className={`w-4 h-0.5 ${
                index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
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
            className={`w-full ${
              buttonType === 'aceitar' ? 'bg-green-600 hover:bg-green-700' :
              buttonType === 'pronto' ? 'bg-amber-600 hover:bg-amber-700' :
              buttonType === 'finalizar' ? 'bg-emerald-600 hover:bg-emerald-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
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
        <button
          onClick={handleNovoPedido}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xl py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
        >
          <Plus className="w-6 h-6" />
          NOVO PEDIDO
        </button>
      </div>

      {/* Área principal com 4 colunas */}
      <div className="flex-1 flex gap-3 p-4 pt-0 overflow-hidden">
        
        {/* Coluna 1: AGUARDANDO ACEITE */}
        <div className={`flex flex-col rounded-xl border bg-card overflow-hidden min-w-0 transition-all ${
          autoAccept ? 'flex-[0.3]' : 'flex-1'
        }`}>
          <div className={`p-3 bg-muted/50 border-b ${autoAccept ? 'py-2' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-bold ${autoAccept ? 'text-xs' : 'text-sm'}`}>AGUARDANDO ACEITE</h3>
              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {getPedidosByStatus('aguardando_aceite').length}
              </span>
            </div>
            
            {/* Switch de aceite automático */}
            <button
              onClick={handleToggleAutoAccept}
              className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                autoAccept 
                  ? 'bg-green-500 border-green-400 text-white' 
                  : 'bg-background border-input hover:bg-muted/50'
              }`}
            >
              <span className="font-medium">
                {autoAccept ? '✓ Auto-aceite ATIVO' : 'Aceite automático'}
              </span>
              {autoAccept ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
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
                <RefreshCw className="w-6 h-6 mx-auto mb-1 animate-spin" />
                <p className="text-xs font-medium">Aceitando automaticamente</p>
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2: EM PRODUÇÃO */}
        <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden min-w-0">
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
        <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden min-w-0">
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

        {/* Coluna 4: ENTREGADORES */}
        <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden min-w-0">
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
            {entregadores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Bike className="w-8 h-8 mb-2 opacity-30" />
                <p>Nenhum entregador cadastrado</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => setCriarEntregadorModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Cadastrar
                </Button>
              </div>
            ) : (
              entregadores.map(entregador => {
                const bagCount = getEntregadorBagCount(entregador.id);
                return (
                  <button
                    key={entregador.id}
                    onClick={() => handleAbrirEntregador(entregador)}
                    className="w-full bg-background rounded-lg border p-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Bike className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{entregador.nome}</p>
                        {entregador.telefone && (
                          <p className="text-xs text-muted-foreground">{entregador.telefone}</p>
                        )}
                      </div>
                      {bagCount > 0 && (
                        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full">
                          <ShoppingBag className="w-3 h-3" />
                          <span className="text-xs font-bold">{bagCount}</span>
                        </div>
                      )}
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
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm px-3 py-1 rounded-full font-bold flex items-center gap-1">
                    <Store className="w-4 h-4" />
                    RETIRADA
                  </span>
                )}
              </div>

              {/* Etapas */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Etapas do Pedido
                </h4>
                {renderEtapas(pedidoDetalhes.status)}
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                  <span>Aguard.</span>
                  <span>Produção</span>
                  <span>Pronto</span>
                  <span>Bag</span>
                  <span>Rota</span>
                  <span>Entregue</span>
                </div>
              </div>

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
                    {pedidoDetalhes.endereco_rua && (
                      <span>{pedidoDetalhes.endereco_rua}</span>
                    )}
                    {pedidoDetalhes.endereco_numero && (
                      <span>, {pedidoDetalhes.endereco_numero}</span>
                    )}
                  </p>
                  {pedidoDetalhes.endereco_complemento && (
                    <p className="text-sm text-muted-foreground">{pedidoDetalhes.endereco_complemento}</p>
                  )}
                  {pedidoDetalhes.endereco_bairro && (
                    <p className="text-sm text-muted-foreground">{pedidoDetalhes.endereco_bairro}</p>
                  )}
                  {pedidoDetalhes.endereco_cep && (
                    <p className="text-sm text-muted-foreground">CEP: {pedidoDetalhes.endereco_cep}</p>
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
                          R$ {((item.preco_unitario || item.price || 0) * (item.quantidade || item.qty || 1)).toFixed(2)}
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
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Bike className="w-4 h-4" /> Entregador
                  </h4>
                  <p className="text-sm font-medium">{pedidoDetalhes.entregador_nome}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Designar Entregador */}
      <Dialog open={designarModalOpen} onOpenChange={setDesignarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Designar Entregador</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {pedidoParaDesignar && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-mono text-sm">{pedidoParaDesignar.codigo}</p>
                <p className="font-semibold">{pedidoParaDesignar.cliente_nome}</p>
                <p className="text-sm text-muted-foreground">{pedidoParaDesignar.endereco_rua}</p>
              </div>
            )}
            
            <div>
              <Label>Selecione o Entregador</Label>
              <Select value={entregadorSelecionado} onValueChange={setEntregadorSelecionado}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Escolha um entregador" />
                </SelectTrigger>
                <SelectContent>
                  {entregadores.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDesignarModalOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleDesignarEntregador} disabled={!entregadorSelecionado} className="flex-1">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Enviar para BAG
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal do Entregador - BAG e EM ROTA */}
      <Dialog open={entregadorModalOpen} onOpenChange={setEntregadorModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Bike className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedEntregador?.nome}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {entregadorPedidos.na_bag.length + entregadorPedidos.em_rota.length} pedido(s) na BAG e em entrega
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 overflow-auto">
            {/* Seção EM ROTA DE ENTREGA */}
            <div className="border rounded-lg">
              <div className="p-3 bg-muted/30 border-b">
                <h4 className="font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  EM ROTA DE ENTREGA
                  <span className="ml-auto bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                    {entregadorPedidos.em_rota.length}
                  </span>
                </h4>
              </div>
              <div className="p-3 space-y-2 max-h-48 overflow-auto">
                {entregadorPedidos.em_rota.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido em rota</p>
                ) : (
                  entregadorPedidos.em_rota.map(pedido => (
                    <div key={pedido.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{pedido.codigo}</p>
                        <p className="font-semibold text-sm truncate">{pedido.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{pedido.endereco_rua}</p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleConcluirEntrega(pedido.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Entregue
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Seção NA BAG */}
            <div className="border rounded-lg">
              <div className="p-3 bg-muted/30 border-b">
                <h4 className="font-bold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  NA BAG
                  <span className="ml-auto bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                    {entregadorPedidos.na_bag.length}
                  </span>
                </h4>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-auto">
                {entregadorPedidos.na_bag.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido na bag</p>
                ) : (
                  entregadorPedidos.na_bag.map(pedido => (
                    <div key={pedido.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{pedido.codigo}</p>
                        <p className="font-semibold text-sm truncate">{pedido.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{pedido.endereco_rua}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleEnviarParaRota(pedido.id)}
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  ))
                )}
              </div>
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
              <DollarSign className="w-5 h-5 text-green-600" />
              Finalizar Pedido - Retirada
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {pedidoParaPagamento && (
              <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 rounded-lg border-2 border-amber-400">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
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
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <Banknote className={`w-6 h-6 ${formaPagamentoSelecionada === 'dinheiro' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'dinheiro' ? 'text-green-700' : ''}`}>Dinheiro</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('pix')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'pix'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <svg className={`w-6 h-6 ${formaPagamentoSelecionada === 'pix' ? 'text-green-600' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L18.36 18.55L13.13 22.19M5.64 12.5L1.81 10.87L5.45 5.64L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M19.36 8.1L21.82 5.64L18.19 1.81L16.56 5.45C17.67 6.19 18.64 7.09 19.36 8.1M6.64 15.36L5.27 19.55L1.64 18.18L5.09 12.82L6.64 15.36M12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8M17.36 6.64L12.82 5.09L18.18 1.64L19.55 5.27L17.36 6.64M15.36 17.36L19.55 18.73L18.18 22.36L12.82 18.91L15.36 17.36M8.64 6.64L5.27 4.45L4.45 5.27L6.64 8.64L8.64 6.64Z"/>
                  </svg>
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'pix' ? 'text-green-700' : ''}`}>PIX</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('credito')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'credito'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${formaPagamentoSelecionada === 'credito' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'credito' ? 'text-green-700' : ''}`}>Crédito</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormaPagamentoSelecionada('debito')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    formaPagamentoSelecionada === 'debito'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${formaPagamentoSelecionada === 'debito' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${formaPagamentoSelecionada === 'debito' ? 'text-green-700' : ''}`}>Débito</span>
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
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
