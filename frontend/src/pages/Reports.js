import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, ShoppingBag, DollarSign, TrendingDown, Percent, PiggyBank, Calculator, Filter } from "lucide-react";
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
  const [categories, setCategories] = useState([]);
  const [timeFilter, setTimeFilter] = useState("30");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cmvCategoryFilter, setCmvCategoryFilter] = useState("all");

  useEffect(() => {
    fetchDashboardStats();
    fetchIngredients();
    fetchProducts();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, getAuthHeader());
      setCategories(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias");
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

  // Filtrar produtos por categoria
  const filteredProducts = useMemo(() => {
    if (categoryFilter === "all") return products;
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  // Filtrar produtos para gráfico CMV por categoria
  const cmvFilteredProducts = useMemo(() => {
    if (cmvCategoryFilter === "all") return products;
    return products.filter(p => p.category === cmvCategoryFilter);
  }, [products, cmvCategoryFilter]);

  // Calcular métricas baseadas nos produtos filtrados
  const metrics = useMemo(() => {
    const prods = filteredProducts.filter(p => p.sale_price > 0 && p.cmv > 0);
    
    if (prods.length === 0) {
      return {
        avgSalePrice: 0,
        avgProductionCost: 0,
        avgProfit: 0,
        avgCMV: 0,
        avgContributionMargin: 0,
        totalProducts: 0
      };
    }

    // Média de Preço de Venda
    const avgSalePrice = prods.reduce((sum, p) => sum + (p.sale_price || 0), 0) / prods.length;
    
    // Média de Custo de Produção (CMV)
    const avgProductionCost = prods.reduce((sum, p) => sum + (p.cmv || 0), 0) / prods.length;
    
    // Média de Lucro (Preço Venda - CMV)
    const avgProfit = avgSalePrice - avgProductionCost;
    
    // Média de CMV (Custo / Venda * 100)
    const avgCMVPercent = prods.reduce((sum, p) => {
      const cmvPercent = p.sale_price > 0 ? (p.cmv / p.sale_price) * 100 : 0;
      return sum + cmvPercent;
    }, 0) / prods.length;
    
    // Média de Margem de Contribuição (Lucro / Venda * 100)
    const avgContributionMargin = prods.reduce((sum, p) => {
      const margin = p.sale_price > 0 ? ((p.sale_price - p.cmv) / p.sale_price) * 100 : 0;
      return sum + margin;
    }, 0) / prods.length;

    return {
      avgSalePrice,
      avgProductionCost,
      avgProfit,
      avgCMV: avgCMVPercent,
      avgContributionMargin,
      totalProducts: prods.length
    };
  }, [filteredProducts]);

  const cmvChartData = cmvFilteredProducts.map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
    cmv: p.cmv || 0,
    venda: p.sale_price || 0,
    lucro: (p.sale_price || 0) - (p.cmv || 0),
  }));

  // Obter categorias únicas dos produtos
  const productCategories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats;
  }, [products]);

  return (
    <div className="p-8" data-testid="reports-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório de Estoque
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise de custos, preços e margens dos produtos
          </p>
        </div>

        {/* Filtro por Categoria */}
        <div className="bg-card rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por Categoria:</span>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {productCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter !== "all" && (
              <span className="text-sm text-muted-foreground">
                Exibindo {metrics.totalProducts} produtos
              </span>
            )}
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Média de Preço de Venda */}
          <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-500/10 p-2.5 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono">
              R$ {metrics.avgSalePrice.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              Média Preço Venda
            </div>
          </div>

          {/* Média de Custo de Produção */}
          <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-red-500/10 p-2.5 rounded-lg">
                <Calculator className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono">
              R$ {metrics.avgProductionCost.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              Média Custo Produção
            </div>
          </div>

          {/* Média de Lucro */}
          <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-lg">
                <PiggyBank className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className={`text-2xl font-bold font-mono ${metrics.avgProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              R$ {metrics.avgProfit.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              Média Lucro
            </div>
          </div>

          {/* Média de CMV % */}
          <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-amber-500/10 p-2.5 rounded-lg">
                <TrendingDown className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono">
              {metrics.avgCMV.toFixed(1)}%
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              Média CMV
            </div>
          </div>

          {/* Margem de Contribuição */}
          <div className="bg-card rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-500/10 p-2.5 rounded-lg">
                <Percent className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className={`text-2xl font-bold font-mono ${metrics.avgContributionMargin >= 30 ? 'text-green-600' : metrics.avgContributionMargin >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
              {metrics.avgContributionMargin.toFixed(1)}%
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              Margem Contribuição
            </div>
          </div>
        </div>

        {/* Cards Secundários */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-lg">
                  <Package className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.total_ingredients}</div>
                  <div className="text-xs text-muted-foreground">Ingredientes</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2.5 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.total_products}</div>
                  <div className="text-xs text-muted-foreground">Produtos</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2.5 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.total_purchases}</div>
                  <div className="text-xs text-muted-foreground">Compras Registradas</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="bg-destructive/10 p-2.5 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">R$ {stats.avg_cmv.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">CMV Médio Geral</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico CMV por Produto */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                CMV por Produto
              </h2>
              <Select value={cmvCategoryFilter} onValueChange={setCmvCategoryFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {productCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cmvFilteredProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cmvChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    className="fill-muted-foreground"
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    formatter={(value, name) => [`R$ ${value.toFixed(2)}`, name]}
                  />
                  <Legend />
                  <Bar dataKey="cmv" fill="hsl(var(--destructive))" name="CMV" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="venda" fill="hsl(142 76% 36%)" name="Preço Venda" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" fill="hsl(var(--primary))" name="Lucro" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum produto cadastrado{cmvCategoryFilter !== "all" ? " nesta categoria" : ""}
              </div>
            )}
          </div>

          {/* Gráfico Histórico de Preços */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                Histórico de Preços
              </h2>
              <div className="flex gap-2">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-[130px] h-9">
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
                  <SelectTrigger className="w-[180px] h-9">
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
                    formatter={(value) => [`R$ ${value.toFixed(2)}`, "Preço"]}
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

        {/* Legenda de indicadores */}
        <div className="mt-6 p-4 bg-muted/50 rounded-xl border">
          <h3 className="font-semibold mb-2 text-sm">Legenda dos Indicadores:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
            <div><strong>CMV:</strong> Custo de Mercadoria Vendida (custo dos ingredientes)</div>
            <div><strong>Margem de Contribuição:</strong> % do lucro sobre o preço de venda</div>
            <div><strong>Lucro:</strong> Preço de Venda - CMV</div>
          </div>
        </div>
      </div>
    </div>
  );
}
