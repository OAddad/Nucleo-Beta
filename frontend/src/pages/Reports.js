import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, ShoppingBag, DollarSign, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// URL relativa - funciona em qualquer domínio
const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const TIME_FILTERS = [
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "6 meses" },
  { value: "365", label: "1 ano" },
  { value: "all", label: "Desde sempre" },
];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [priceHistory, setPriceHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [timeFilter, setTimeFilter] = useState("30");

  useEffect(() => {
    fetchDashboardStats();
    fetchIngredients();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedIngredient) {
      fetchPriceHistory(selectedIngredient);
    }
  }, [selectedIngredient, timeFilter]);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/reports/dashboard`, getAuthHeader());
      setStats(response.data);
    } catch (error) {
      toast.error("Erro ao carregar estatísticas");
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await axios.get(`${API}/ingredients`, getAuthHeader());
      setIngredients(response.data);
      if (response.data.length > 0) {
        setSelectedIngredient(response.data[0].id);
      }
    } catch (error) {
      toast.error("Erro ao carregar ingredientes");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, getAuthHeader());
      setProducts(response.data);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    }
  };

  const fetchPriceHistory = async (ingredientId) => {
    try {
      const response = await axios.get(
        `${API}/reports/price-history/${ingredientId}`,
        getAuthHeader()
      );
      
      // Filtrar por período
      let filteredHistory = response.data.history;
      if (timeFilter !== "all") {
        const daysAgo = parseInt(timeFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        
        filteredHistory = response.data.history.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= cutoffDate;
        });
      }
      
      setPriceHistory(filteredHistory);
    } catch (error) {
      toast.error("Erro ao carregar histórico de preços");
    }
  };

  const cmvChartData = products.map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
    cmv: p.cmv,
    venda: p.sale_price || 0,
  }));

  // Calcular preço de venda médio
  const avgSalePrice = products.length > 0 
    ? products.filter(p => p.sale_price).reduce((sum, p) => sum + p.sale_price, 0) / products.filter(p => p.sale_price).length
    : 0;

  return (
    <div className="p-8" data-testid="reports-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Relatórios e Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize estatísticas, CMV dos produtos e evolução de preços
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono">
                {stats.total_ingredients}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Ingredientes
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-amber-500/10 p-3 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono">
                {stats.total_products}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Produtos
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono">
                {stats.total_purchases}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Compras Registradas
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-destructive" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono">
                R$ {stats.avg_cmv.toFixed(2)}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                CMV Médio
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-green-500/10 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono">
                R$ {avgSalePrice.toFixed(2)}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Preço Venda Médio
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">
              CMV por Produto
            </h2>
            {products.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cmvChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cmv" fill="hsl(var(--primary))" name="CMV" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="venda"
                    fill="hsl(142 76% 36%)"
                    name="Preço Venda"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum produto cadastrado
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                Histórico de Preços
              </h2>
              <div className="flex gap-2">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_FILTERS.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {priceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    name="Preço Unitário"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {ingredients.length === 0
                  ? "Nenhum ingrediente cadastrado"
                  : "Nenhuma compra registrada para este ingrediente no período selecionado"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
