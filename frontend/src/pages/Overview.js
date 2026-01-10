import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  BarChart3, Package, ShoppingCart, FileText, TrendingUp, DollarSign, 
  Percent, PieChart, Filter, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
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

export default function Overview() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, ingredientsRes, categoriesRes, purchasesRes] = await Promise.all([
        axios.get(`${API}/products`, getAuthHeader()),
        axios.get(`${API}/ingredients`, getAuthHeader()),
        axios.get(`${API}/categories`, getAuthHeader()),
        axios.get(`${API}/purchases/grouped`, getAuthHeader()),
      ]);
      
      setProducts(productsRes.data);
      setIngredients(ingredientsRes.data);
      setCategories(categoriesRes.data);
      setPurchases(purchasesRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar produtos por categoria
  const filteredProducts = useMemo(() => {
    if (categoryFilter === "all") return products;
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);
  
  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    const activeProducts = filteredProducts.filter(p => p.is_active !== false);
    const activeIngredients = ingredients.filter(i => i.is_active !== false);
    
    // Contar produtos e ingredientes
    const totalProducts = activeProducts.length;
    const totalIngredients = activeIngredients.length;
    
    // Valor em estoque
    const stockValue = activeIngredients.reduce((sum, ing) => {
      const qty = ing.stock_quantity || 0;
      const price = ing.average_price || 0;
      return sum + (qty * price);
    }, 0);
    
    // Compras do mês atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const purchasesThisMonth = purchases.filter(p => {
      const date = new Date(p.purchase_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const purchasesTotal = purchasesThisMonth.reduce((sum, p) => sum + (p.total_price || 0), 0);
    
    return {
      totalProducts,
      totalIngredients,
      stockValue,
      purchasesTotal,
      purchasesCount: purchasesThisMonth.length
    };
  }, [filteredProducts, ingredients, purchases]);
  
  // Calcular médias dos produtos
  const productAverages = useMemo(() => {
    const activeProducts = filteredProducts.filter(p => p.is_active !== false && p.sale_price > 0);
    
    if (activeProducts.length === 0) {
      return {
        avgSalePrice: 0,
        avgProductionCost: 0,
        avgProfit: 0,
        avgCMV: 0,
        avgMargin: 0
      };
    }
    
    let totalSalePrice = 0;
    let totalProductionCost = 0;
    let totalProfit = 0;
    let totalCMVPercent = 0;
    let totalMargin = 0;
    let countWithCMV = 0;
    
    activeProducts.forEach(product => {
      const salePrice = product.sale_price || 0;
      const productionCost = product.unit_cost || product.production_cost || 0;
      const profit = salePrice - productionCost;
      
      totalSalePrice += salePrice;
      totalProductionCost += productionCost;
      totalProfit += profit;
      
      if (salePrice > 0 && productionCost > 0) {
        const cmvPercent = (productionCost / salePrice) * 100;
        const marginPercent = (profit / salePrice) * 100;
        totalCMVPercent += cmvPercent;
        totalMargin += marginPercent;
        countWithCMV++;
      }
    });
    
    const count = activeProducts.length;
    
    return {
      avgSalePrice: totalSalePrice / count,
      avgProductionCost: totalProductionCost / count,
      avgProfit: totalProfit / count,
      avgCMV: countWithCMV > 0 ? totalCMVPercent / countWithCMV : 0,
      avgMargin: countWithCMV > 0 ? totalMargin / countWithCMV : 0
    };
  }, [filteredProducts]);
  
  // Distribuição de CMV por faixas
  const cmvDistribution = useMemo(() => {
    const activeProducts = filteredProducts.filter(p => 
      p.is_active !== false && p.sale_price > 0 && (p.unit_cost > 0 || p.production_cost > 0)
    );
    
    const ranges = {
      "0-20%": 0,
      "20-30%": 0,
      "30-40%": 0,
      "40-50%": 0,
      "50%+": 0
    };
    
    activeProducts.forEach(product => {
      const cost = product.unit_cost || product.production_cost || 0;
      const cmv = (cost / product.sale_price) * 100;
      
      if (cmv <= 20) ranges["0-20%"]++;
      else if (cmv <= 30) ranges["20-30%"]++;
      else if (cmv <= 40) ranges["30-40%"]++;
      else if (cmv <= 50) ranges["40-50%"]++;
      else ranges["50%+"]++;
    });
    
    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
      percentage: activeProducts.length > 0 ? (count / activeProducts.length) * 100 : 0
    }));
  }, [filteredProducts]);
  
  // Top 5 produtos com maior e menor CMV
  const cmvRanking = useMemo(() => {
    const activeProducts = filteredProducts.filter(p => 
      p.is_active !== false && p.sale_price > 0 && (p.unit_cost > 0 || p.production_cost > 0)
    ).map(p => ({
      ...p,
      cmv: ((p.unit_cost || p.production_cost || 0) / p.sale_price) * 100
    }));
    
    const sorted = [...activeProducts].sort((a, b) => b.cmv - a.cmv);
    
    return {
      highest: sorted.slice(0, 5),
      lowest: sorted.slice(-5).reverse()
    };
  }, [filteredProducts]);
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header com filtro */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe os principais indicadores do seu negócio
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de Resumo Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground">Estoque</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stats.totalIngredients}</h3>
            <p className="text-sm text-muted-foreground">Itens ativos</p>
            <p className="text-xs text-emerald-600 font-medium mt-2">
              {formatCurrency(stats.stockValue)} em estoque
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-muted-foreground">Produtos</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stats.totalProducts}</h3>
            <p className="text-sm text-muted-foreground">
              {categoryFilter === "all" ? "Fichas técnicas" : `em ${categoryFilter}`}
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs text-muted-foreground">Compras</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatCurrency(stats.purchasesTotal)}</h3>
            <p className="text-sm text-muted-foreground">{stats.purchasesCount} compras este mês</p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg">
                <Percent className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs text-muted-foreground">CMV Médio</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{productAverages.avgCMV.toFixed(1)}%</h3>
            <p className="text-sm text-muted-foreground">
              {productAverages.avgCMV <= 35 ? (
                <span className="text-green-600">✓ Dentro do ideal</span>
              ) : (
                <span className="text-amber-600">⚠ Acima do ideal (35%)</span>
              )}
            </p>
          </div>
        </div>

        {/* Cards de Médias Detalhadas */}
        <div className="bg-card border rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Médias dos Produtos
            {categoryFilter !== "all" && (
              <span className="text-sm font-normal text-muted-foreground">
                — {categoryFilter}
              </span>
            )}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Preço de Venda</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(productAverages.avgSalePrice)}</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Custo de Produção</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(productAverages.avgProductionCost)}</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Lucro Médio</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(productAverages.avgProfit)}</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">CMV Médio</p>
              <p className={`text-xl font-bold ${productAverages.avgCMV <= 35 ? 'text-green-600' : 'text-amber-600'}`}>
                {productAverages.avgCMV.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Margem Média</p>
              <p className={`text-xl font-bold ${productAverages.avgMargin >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                {productAverages.avgMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Distribuição de CMV */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Distribuição de CMV
            </h2>
            
            <div className="space-y-3">
              {cmvDistribution.map((item, index) => {
                const colors = [
                  "bg-green-500",
                  "bg-emerald-500", 
                  "bg-amber-500",
                  "bg-orange-500",
                  "bg-red-500"
                ];
                return (
                  <div key={item.range}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.range}</span>
                      <span className="font-medium">{item.count} produtos ({item.percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[index]} transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              💡 O ideal é manter o CMV abaixo de 35% para garantir boa margem de lucro
            </p>
          </div>

          {/* Ranking de CMV */}
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Ranking de CMV
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Maior CMV */}
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  Maior CMV
                </h3>
                <div className="space-y-2">
                  {cmvRanking.highest.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">
                        {index + 1}. {product.name}
                      </span>
                      <span className="font-mono text-red-600 font-medium">
                        {product.cmv.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {cmvRanking.highest.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum produto</p>
                  )}
                </div>
              </div>
              
              {/* Menor CMV */}
              <div>
                <h3 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" />
                  Menor CMV
                </h3>
                <div className="space-y-2">
                  {cmvRanking.lowest.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">
                        {index + 1}. {product.name}
                      </span>
                      <span className="font-mono text-green-600 font-medium">
                        {product.cmv.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {cmvRanking.lowest.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum produto</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dicas e Insights */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            💡 Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {productAverages.avgCMV > 35 && (
              <div className="flex items-start gap-2">
                <span className="text-amber-500">⚠️</span>
                <p>Seu CMV médio está acima de 35%. Considere renegociar com fornecedores ou revisar receitas.</p>
              </div>
            )}
            {productAverages.avgMargin < 50 && (
              <div className="flex items-start gap-2">
                <span className="text-amber-500">⚠️</span>
                <p>Margem média abaixo de 50%. Avalie aumentar preços ou reduzir custos.</p>
              </div>
            )}
            {cmvRanking.highest.length > 0 && cmvRanking.highest[0].cmv > 50 && (
              <div className="flex items-start gap-2">
                <span className="text-red-500">🔴</span>
                <p>Produto "{cmvRanking.highest[0].name}" tem CMV de {cmvRanking.highest[0].cmv.toFixed(1)}%. Revise a precificação.</p>
              </div>
            )}
            {productAverages.avgCMV <= 35 && productAverages.avgMargin >= 50 && (
              <div className="flex items-start gap-2">
                <span className="text-green-500">✅</span>
                <p>Seus indicadores estão saudáveis! Continue monitorando regularmente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
