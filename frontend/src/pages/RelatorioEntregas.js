import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Truck, Calendar, DollarSign, User, TrendingUp, Filter, Download
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function RelatorioEntregas() {
  const [entregadores, setEntregadores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros de data
  const [dataInicio, setDataInicio] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primeiro dia do mês
    return date.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [bairros, setBairros] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entregadoresRes, pedidosRes, bairrosRes] = await Promise.all([
        axios.get(`${API}/entregadores`, getAuthHeader()),
        axios.get(`${API}/pedidos`, getAuthHeader()),
        axios.get(`${API}/bairros`, getAuthHeader())
      ]);
      setEntregadores(entregadoresRes.data.filter(e => e.ativo));
      setPedidos(pedidosRes.data);
      setBairros(bairrosRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar pedidos por período e status concluído
  const pedidosFiltrados = pedidos.filter(p => {
    if (p.status !== 'concluido') return false;
    if (p.tipo_entrega !== 'delivery') return false;
    if (!p.entregador_id) return false;
    
    const dataPedido = new Date(p.created_at).toISOString().split('T')[0];
    return dataPedido >= dataInicio && dataPedido <= dataFim;
  });

  // Calcular estatísticas por entregador
  const estatisticasEntregadores = entregadores.map(entregador => {
    const entregas = pedidosFiltrados.filter(p => p.entregador_id === entregador.id);
    const totalEntregas = entregas.length;
    
    // Calcular valor total das entregas (soma dos valores de entrega dos bairros)
    const valorTotal = entregas.reduce((acc, p) => {
      // Usar o valor de entrega do pedido ou buscar do bairro
      let valorEntrega = p.valor_entrega;
      if (!valorEntrega && valorEntrega !== 0) {
        // Buscar valor do bairro se não tiver no pedido
        const bairro = bairros.find(b => b.nome === p.endereco_bairro);
        valorEntrega = bairro?.valor_entrega || 0;
      }
      return acc + (valorEntrega || 0);
    }, 0);

    return {
      ...entregador,
      totalEntregas,
      valorTotal
    };
  }).sort((a, b) => b.totalEntregas - a.totalEntregas);

  // Totais gerais
  const totalGeral = {
    entregas: estatisticasEntregadores.reduce((acc, e) => acc + e.totalEntregas, 0),
    valor: estatisticasEntregadores.reduce((acc, e) => acc + e.valorTotal, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary" />
            Relatório de Entregas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe o desempenho dos entregadores
          </p>
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Filtrar por Período</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => {
              const hoje = new Date();
              setDataInicio(hoje.toISOString().split('T')[0]);
              setDataFim(hoje.toISOString().split('T')[0]);
            }}>
              Hoje
            </Button>
            <Button variant="outline" onClick={() => {
              const hoje = new Date();
              const inicioSemana = new Date(hoje);
              inicioSemana.setDate(hoje.getDate() - hoje.getDay());
              setDataInicio(inicioSemana.toISOString().split('T')[0]);
              setDataFim(hoje.toISOString().split('T')[0]);
            }}>
              Esta Semana
            </Button>
            <Button variant="outline" onClick={() => {
              const hoje = new Date();
              const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
              setDataInicio(inicioMes.toISOString().split('T')[0]);
              setDataFim(hoje.toISOString().split('T')[0]);
            }}>
              Este Mês
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl border border-blue-500/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Entregas</p>
              <p className="text-3xl font-bold text-blue-600">{totalGeral.entregas}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl border border-green-500/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Pago</p>
              <p className="text-3xl font-bold text-green-600">R$ {totalGeral.valor.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl border border-purple-500/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Entregadores Ativos</p>
              <p className="text-3xl font-bold text-purple-600">{entregadores.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Entregadores */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Desempenho por Entregador
          </h3>
        </div>

        {estatisticasEntregadores.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum entregador cadastrado</p>
          </div>
        ) : (
          <div className="divide-y">
            {estatisticasEntregadores.map((entregador, index) => (
              <div key={entregador.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Posição */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                    index === 1 ? 'bg-gray-300/30 text-gray-600' :
                    index === 2 ? 'bg-orange-500/20 text-orange-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}º
                  </div>

                  {/* Avatar e Nome */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{entregador.nome}</p>
                      <p className="text-xs text-muted-foreground">{entregador.telefone}</p>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{entregador.totalEntregas}</p>
                      <p className="text-xs text-muted-foreground">entregas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">R$ {entregador.valorTotal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">ganhos</p>
                    </div>
                  </div>
                </div>

                {/* Barra de progresso visual */}
                {totalGeral.entregas > 0 && (
                  <div className="mt-3 ml-12">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                        style={{ width: `${(entregador.totalEntregas / totalGeral.entregas) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((entregador.totalEntregas / totalGeral.entregas) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info sobre valor de entrega */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>💡 Nota:</strong> O valor de cada entrega é calculado com base no valor de entrega do bairro configurado em Localização → Bairros.
          Entregas sem bairro cadastrado usam o valor padrão de R$ 5,00.
        </p>
      </div>
    </div>
  );
}
