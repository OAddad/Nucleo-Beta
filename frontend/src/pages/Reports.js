import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, ShoppingBag, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [priceHistory, setPriceHistory] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchIngredients();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedIngredient) {
      fetchPriceHistory(selectedIngredient);
    }
  }, [selectedIngredient]);

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
      setPriceHistory(response.data.history);
    } catch (error) {
      toast.error("Erro ao carregar histórico de preços");
    }
  };

  const cmvChartData = products.map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
    cmv: p.cmv,
    venda: p.sale_price || 0,
  }));

  return (
    <div className="p-8" data-testid="reports-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Relatórios e Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Visualize estatísticas, CMV dos produtos e evolução de preços
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-rose-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-rose-700" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {stats.total_ingredients}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Ingredientes
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-amber-700" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {stats.total_products}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Produtos
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-700" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {stats.total_purchases}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Compras Registradas
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-700" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 font-mono">
                R$ {stats.avg_cmv.toFixed(2)}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                CMV Médio
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              CMV por Produto
            </h2>
            {products.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cmvChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cmv" fill="#BE123C" name="CMV" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="venda"
                    fill="#10B981"
                    name="Preço Venda"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Nenhum produto cadastrado
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Histórico de Preços
              </h2>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger className="w-[200px] h-9 border-slate-200">
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
            {priceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#BE123C"
                    strokeWidth={2}
                    dot={{ fill: "#BE123C", r: 4 }}
                    name="Preço Unitário"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                {ingredients.length === 0
                  ? "Nenhum ingrediente cadastrado"
                  : "Nenhuma compra registrada para este ingrediente"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}