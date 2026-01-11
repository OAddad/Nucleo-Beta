import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, Bike, ShoppingBag, Truck, Check, Phone, MapPin,
  Clock, RefreshCw, Navigation, DollarSign, ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";

const API = '/api';

export default function EntregadorDetalhe() {
  const { entregadorId } = useParams();
  const navigate = useNavigate();
  
  const [entregador, setEntregador] = useState(null);
  const [pedidos, setPedidos] = useState({ na_bag: [], em_rota: [] });
  const [loading, setLoading] = useState(true);

  // Voltar para a aba Delivery
  const handleVoltar = () => {
    // Força recarregar a página do delivery
    window.location.href = '/#/admin/vendas/entregas';
  };

  const fetchData = useCallback(async () => {
    try {
      const [entregadorRes, pedidosRes] = await Promise.all([
        axios.get(`${API}/entregadores/${entregadorId}`),
        axios.get(`${API}/entregadores/${entregadorId}/pedidos`)
      ]);
      
      setEntregador(entregadorRes.data);
      setPedidos({
        na_bag: pedidosRes.data.filter(p => p.status === 'na_bag'),
        em_rota: pedidosRes.data.filter(p => p.status === 'em_rota')
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do entregador");
    } finally {
      setLoading(false);
    }
  }, [entregadorId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleEnviarParaRota = async (pedidoId) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=em_rota`);
      toast.success("Pedido enviado para rota!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao enviar para rota");
    }
  };

  const handleConcluirEntrega = async (pedidoId) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=concluido`);
      toast.success("Entrega concluída!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao concluir entrega");
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!entregador) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
        <Bike className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground mb-6 text-lg">Entregador não encontrado</p>
        <Button onClick={handleVoltar} size="lg">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar para Delivery
        </Button>
      </div>
    );
  }

  const totalPedidos = pedidos.na_bag.length + pedidos.em_rota.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          {/* Navegação */}
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleVoltar}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="icon" onClick={fetchData} className="h-9 w-9">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Card do Entregador */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Bike className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">{entregador.nome}</h1>
                {entregador.telefone && (
                  <a 
                    href={`tel:${entregador.telefone}`}
                    className="text-sm text-muted-foreground flex items-center gap-1 mt-1 hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {entregador.telefone}
                  </a>
                )}
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-background/60 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{totalPedidos}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-background/60 backdrop-blur rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <ShoppingBag className="w-4 h-4 text-blue-500" />
                  <span className="text-2xl font-bold">{pedidos.na_bag.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">Na Bag</div>
              </div>
              <div className="bg-background/60 backdrop-blur rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Truck className="w-4 h-4 text-purple-500" />
                  <span className="text-2xl font-bold">{pedidos.em_rota.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">Em Rota</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          
          {/* Seção EM ROTA */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Em Rota de Entrega</h2>
                <p className="text-xs text-muted-foreground">Pedidos a caminho do cliente</p>
              </div>
              <span className="bg-purple-500/10 text-purple-600 px-3 py-1 rounded-full text-sm font-bold">
                {pedidos.em_rota.length}
              </span>
            </div>
            
            {pedidos.em_rota.length === 0 ? (
              <div className="p-8 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
                <Truck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum pedido em rota</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.em_rota.map(pedido => (
                  <div key={pedido.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    {/* Header do Card */}
                    <div className="bg-purple-500/5 px-4 py-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">
                          {pedido.codigo}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(pedido.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-purple-600">
                        <Navigation className="w-4 h-4" />
                        <span className="text-xs font-medium">Em rota</span>
                      </div>
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{pedido.cliente_nome}</h3>
                      
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">
                              {pedido.endereco_rua}{pedido.endereco_numero && `, ${pedido.endereco_numero}`}
                            </p>
                            {pedido.endereco_bairro && <p>{pedido.endereco_bairro}</p>}
                            {pedido.endereco_complemento && (
                              <p className="text-xs italic">{pedido.endereco_complemento}</p>
                            )}
                          </div>
                        </div>
                        
                        {pedido.cliente_telefone && (
                          <a 
                            href={`tel:${pedido.cliente_telefone}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            <span>{pedido.cliente_telefone}</span>
                          </a>
                        )}
                      </div>
                      
                      {/* Footer do Card */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">{pedido.items?.length || 0} item(s)</p>
                          <p className="font-bold text-xl text-primary flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {(pedido.total || 0).toFixed(2)}
                          </p>
                        </div>
                        <Button 
                          onClick={() => handleConcluirEntrega(pedido.id)} 
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                          <Check className="w-5 h-5" />
                          Entregue
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Seção NA BAG */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Na Bag</h2>
                <p className="text-xs text-muted-foreground">Pedidos aguardando envio</p>
              </div>
              <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                {pedidos.na_bag.length}
              </span>
            </div>
            
            {pedidos.na_bag.length === 0 ? (
              <div className="p-8 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum pedido na bag</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.na_bag.map(pedido => (
                  <div key={pedido.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    {/* Header do Card */}
                    <div className="bg-blue-500/5 px-4 py-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                          {pedido.codigo}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(pedido.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-xs font-medium">Na bag</span>
                      </div>
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{pedido.cliente_nome}</h3>
                      
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">
                              {pedido.endereco_rua}{pedido.endereco_numero && `, ${pedido.endereco_numero}`}
                            </p>
                            {pedido.endereco_bairro && <p>{pedido.endereco_bairro}</p>}
                            {pedido.endereco_complemento && (
                              <p className="text-xs italic">{pedido.endereco_complemento}</p>
                            )}
                          </div>
                        </div>
                        
                        {pedido.cliente_telefone && (
                          <a 
                            href={`tel:${pedido.cliente_telefone}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            <span>{pedido.cliente_telefone}</span>
                          </a>
                        )}
                      </div>
                      
                      {/* Footer do Card */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">{pedido.items?.length || 0} item(s)</p>
                          <p className="font-bold text-xl text-primary flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {(pedido.total || 0).toFixed(2)}
                          </p>
                        </div>
                        <Button 
                          onClick={() => handleEnviarParaRota(pedido.id)} 
                          size="lg"
                          variant="outline"
                          className="gap-2 border-purple-500/50 text-purple-600 hover:bg-purple-500/10"
                        >
                          <Truck className="w-5 h-5" />
                          Enviar
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          
          {/* Espaço extra no final para scroll em mobile */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
