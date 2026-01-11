import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, Bike, ShoppingBag, Truck, Check, Phone, MapPin,
  Package, Clock, User, RefreshCw
} from "lucide-react";
import { Button } from "../components/ui/button";

const API = '/api';

export default function EntregadorDetalhe() {
  const { entregadorId } = useParams();
  const navigate = useNavigate();
  
  const [entregador, setEntregador] = useState(null);
  const [pedidos, setPedidos] = useState({ na_bag: [], em_rota: [] });
  const [loading, setLoading] = useState(true);

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
    
    // Auto-refresh a cada 10 segundos
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Enviar para rota
  const handleEnviarParaRota = async (pedidoId) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=em_rota`);
      toast.success("Pedido enviado para rota!");
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
      fetchData();
    } catch (error) {
      toast.error("Erro ao concluir entrega");
    }
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

  if (!entregador) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-muted-foreground mb-4">Entregador não encontrado</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const totalPedidos = pedidos.na_bag.length + pedidos.em_rota.length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Entregador</h1>
          </div>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Info do Entregador */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Bike className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{entregador.nome}</h2>
            {entregador.telefone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="w-4 h-4" />
                {entregador.telefone}
              </p>
            )}
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{totalPedidos}</div>
            <div className="text-xs text-muted-foreground">pedido(s)</div>
          </div>
        </div>
        
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-medium">NA BAG</span>
            </div>
            <div className="text-2xl font-bold">{pedidos.na_bag.length}</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium">EM ROTA</span>
            </div>
            <div className="text-2xl font-bold">{pedidos.em_rota.length}</div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Seção EM ROTA DE ENTREGA */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-primary" />
            <h3 className="font-bold">EM ROTA DE ENTREGA</h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold ml-auto">
              {pedidos.em_rota.length}
            </span>
          </div>
          
          {pedidos.em_rota.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pedido em rota</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.em_rota.map(pedido => (
                <div key={pedido.id} className="bg-card rounded-xl border p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{pedido.codigo}</span>
                      <p className="font-semibold text-lg">{pedido.cliente_nome}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(pedido.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{pedido.endereco_rua}{pedido.endereco_numero && `, ${pedido.endereco_numero}`}</p>
                      {pedido.endereco_bairro && <p>{pedido.endereco_bairro}</p>}
                      {pedido.endereco_complemento && <p className="text-xs">{pedido.endereco_complemento}</p>}
                    </div>
                  </div>
                  
                  {pedido.cliente_telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Phone className="w-4 h-4" />
                      <span>{pedido.cliente_telefone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">{pedido.items?.length || 0} item(s)</p>
                      <p className="font-bold text-primary text-lg">R$ {(pedido.total || 0).toFixed(2)}</p>
                    </div>
                    <Button onClick={() => handleConcluirEntrega(pedido.id)} size="lg">
                      <Check className="w-5 h-5 mr-2" />
                      Entregue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção NA BAG */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h3 className="font-bold">NA BAG</h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold ml-auto">
              {pedidos.na_bag.length}
            </span>
          </div>
          
          {pedidos.na_bag.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pedido na bag</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.na_bag.map(pedido => (
                <div key={pedido.id} className="bg-card rounded-xl border p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{pedido.codigo}</span>
                      <p className="font-semibold text-lg">{pedido.cliente_nome}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(pedido.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{pedido.endereco_rua}{pedido.endereco_numero && `, ${pedido.endereco_numero}`}</p>
                      {pedido.endereco_bairro && <p>{pedido.endereco_bairro}</p>}
                      {pedido.endereco_complemento && <p className="text-xs">{pedido.endereco_complemento}</p>}
                    </div>
                  </div>
                  
                  {pedido.cliente_telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Phone className="w-4 h-4" />
                      <span>{pedido.cliente_telefone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">{pedido.items?.length || 0} item(s)</p>
                      <p className="font-bold text-primary text-lg">R$ {(pedido.total || 0).toFixed(2)}</p>
                    </div>
                    <Button onClick={() => handleEnviarParaRota(pedido.id)} size="lg" variant="outline">
                      <Truck className="w-5 h-5 mr-2" />
                      Enviar para Rota
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
