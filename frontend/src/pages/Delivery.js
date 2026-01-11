import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Check, Clock, ChefHat, Package, Truck, User, Phone, MapPin,
  ArrowLeft, X, RefreshCw, ToggleLeft, ToggleRight, Bike, ShoppingBag,
  Store, CreditCard, DollarSign, Banknote
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

// Status dos pedidos com cores
const statusConfig = {
  aguardando_aceite: { label: "Aguardando Aceite", color: "bg-orange-500", textColor: "text-orange-700" },
  producao: { label: "Em Produção", color: "bg-yellow-500", textColor: "text-yellow-700" },
  pronto: { label: "Pronto", color: "bg-green-500", textColor: "text-green-700" },
  na_bag: { label: "Na Bag", color: "bg-blue-500", textColor: "text-blue-700" },
  em_rota: { label: "Em Rota", color: "bg-purple-500", textColor: "text-purple-700" },
  concluido: { label: "Concluído", color: "bg-gray-500", textColor: "text-gray-700" },
  cancelado: { label: "Cancelado", color: "bg-red-500", textColor: "text-red-700" },
};

export default function Delivery() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  
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
    if (autoAccept) {
      const pedidosAguardando = pedidos.filter(p => p.status === 'aguardando_aceite');
      pedidosAguardando.forEach(async (pedido) => {
        try {
          await axios.patch(`${API}/pedidos/${pedido.id}/status?status=producao`);
          fetchData();
        } catch (error) {
          console.error("Erro no aceite automático:", error);
        }
      });
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
      toast.error("Erro ao alterar configuração");
    }
  };

  // Aceitar pedido
  const handleAceitar = async (pedidoId) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=producao`);
      toast.success("Pedido aceito!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao aceitar pedido");
    }
  };

  // Marcar como pronto
  const handleMarcarPronto = async (pedidoId) => {
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

  // Toggle seleção de pedido na coluna PRONTO
  const togglePedidoSelecionado = (pedidoId) => {
    setPedidosSelecionados(prev => {
      if (prev.includes(pedidoId)) {
        return prev.filter(id => id !== pedidoId);
      } else {
        return [...prev, pedidoId];
      }
    });
  };

  // Selecionar/deselecionar todos os pedidos prontos
  const toggleSelecionarTodos = () => {
    const pedidosProntos = getPedidosByStatus('pronto');
    if (pedidosSelecionados.length === pedidosProntos.length) {
      setPedidosSelecionados([]);
    } else {
      setPedidosSelecionados(pedidosProntos.map(p => p.id));
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

  // Ir para cardápio para novo pedido
  const handleNovoPedido = () => {
    // Navegar para a aba do cardápio
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

  // Verificar se é pedido de retirada
  const isRetirada = (pedido) => pedido.tipo_entrega === 'pickup';

  // Abrir modal de pagamento para retirada
  const handleAbrirPagamento = (pedido) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header com botão NOVO PEDIDO */}
      <div className="p-4">
        <button
          onClick={handleNovoPedido}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
        >
          <Plus className="w-6 h-6" />
          NOVO PEDIDO
        </button>
      </div>

      {/* Área principal com 4 colunas */}
      <div className="flex-1 flex gap-4 p-4 pt-0 overflow-hidden">
        {/* Coluna 1: AGUARDANDO ACEITE */}
        <div className="flex-1 flex flex-col bg-card rounded-xl border overflow-hidden min-w-0">
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">AGUARDANDO ACEITE</h3>
              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {getPedidosByStatus('aguardando_aceite').length}
              </span>
            </div>
            
            {/* Switch de aceite automático */}
            <button
              onClick={handleToggleAutoAccept}
              className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                autoAccept 
                  ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700' 
                  : 'bg-muted/50 border-muted'
              }`}
            >
              <span className={autoAccept ? 'text-green-700 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                Aceite automático
              </span>
              {autoAccept ? (
                <ToggleRight className="w-5 h-5 text-green-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
          
          <div className={`flex-1 overflow-auto p-2 space-y-2 ${autoAccept ? 'opacity-50' : ''}`}>
            {getPedidosByStatus('aguardando_aceite').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <p>Nenhum pedido aguardando</p>
              </div>
            ) : (
              getPedidosByStatus('aguardando_aceite').map(pedido => (
                <div 
                  key={pedido.id} 
                  className={`bg-background rounded-lg border p-3 shadow-sm ${
                    isRetirada(pedido) 
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isRetirada(pedido) && (
                        <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          RETIRADA
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">{pedido.codigo}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(pedido.created_at)}</span>
                  </div>
                  <p className="font-semibold text-sm truncate">{pedido.cliente_nome || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {isRetirada(pedido) ? "Retirada no local" : (pedido.endereco_rua || "Sem endereço")}
                  </p>
                  <p className="font-bold text-primary text-sm mb-2">R$ {(pedido.total || 0).toFixed(2)}</p>
                  
                  {!autoAccept && (
                    <Button 
                      size="sm" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleAceitar(pedido.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aceitar
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 2: EM PRODUÇÃO */}
        <div className="flex-1 flex flex-col bg-card rounded-xl border overflow-hidden min-w-0">
          <div className="p-3 border-b bg-muted/30">
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
                <div key={pedido.id} className="bg-background rounded-lg border p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted-foreground">{pedido.codigo}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(pedido.created_at)}</span>
                  </div>
                  <p className="font-semibold text-sm truncate">{pedido.cliente_nome || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {pedido.items?.length || 0} item(s)
                  </p>
                  <p className="font-bold text-primary text-sm mb-2">R$ {(pedido.total || 0).toFixed(2)}</p>
                  
                  <Button 
                    size="sm" 
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => handleMarcarPronto(pedido.id)}
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Pronto
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 3: PRONTO */}
        <div className="flex-1 flex flex-col bg-card rounded-xl border overflow-hidden min-w-0">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">PRONTO</h3>
              <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {getPedidosByStatus('pronto').length}
              </span>
            </div>
            
            {/* Seletor de entregador para envio em lote */}
            {getPedidosByStatus('pronto').length > 0 && (
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
                    {pedidosSelecionados.length === getPedidosByStatus('pronto').length ? 'Desmarcar' : 'Marcar'} Todos
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
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
                <div 
                  key={pedido.id} 
                  className={`bg-background rounded-lg border p-3 shadow-sm cursor-pointer transition-all ${
                    pedidosSelecionados.includes(pedido.id) 
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
                      : 'hover:border-muted-foreground/30'
                  }`}
                  onClick={() => togglePedidoSelecionado(pedido.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={pedidosSelecionados.includes(pedido.id)}
                      onChange={() => togglePedidoSelecionado(pedido.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{pedido.codigo}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatTime(pedido.created_at)}</span>
                  </div>
                  <p className="font-semibold text-sm truncate">{pedido.cliente_nome || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{pedido.endereco_rua || "Sem endereço"}</p>
                  <p className="font-bold text-primary text-sm">R$ {(pedido.total || 0).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 4: ENTREGADORES */}
        <div className="flex-1 flex flex-col bg-card rounded-xl border overflow-hidden min-w-0">
          <div className="p-3 border-b bg-muted/30">
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
                    className="w-full bg-background rounded-lg border p-3 shadow-sm hover:border-primary/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bike className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{entregador.nome}</p>
                        {entregador.telefone && (
                          <p className="text-xs text-muted-foreground">{entregador.telefone}</p>
                        )}
                      </div>
                      {bagCount > 0 && (
                        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
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
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bike className="w-6 h-6 text-primary" />
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
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-b">
                <h4 className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  EM ROTA DE ENTREGA
                  <span className="ml-auto bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full text-xs">
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
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b">
                <h4 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  NA BAG
                  <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs">
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
                        className="bg-purple-600 hover:bg-purple-700"
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
    </div>
  );
}
