import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchIngredients();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(`${API}/purchases`, getAuthHeader());
      setPurchases(response.data);
    } catch (error) {
      toast.error("Erro ao carregar compras");
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await axios.get(`${API}/ingredients`, getAuthHeader());
      setIngredients(response.data);
    } catch (error) {
      toast.error("Erro ao carregar ingredientes");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${API}/purchases`,
        {
          ingredient_id: ingredientId,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          purchase_date: new Date(purchaseDate).toISOString(),
        },
        getAuthHeader()
      );
      toast.success("Compra lançada!");
      setIngredientId("");
      setQuantity("");
      setPrice("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setOpen(false);
      fetchPurchases();
    } catch (error) {
      toast.error("Erro ao lançar compra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta compra?")) return;

    try {
      await axios.delete(`${API}/purchases/${id}`, getAuthHeader());
      toast.success("Compra excluída!");
      fetchPurchases();
    } catch (error) {
      toast.error("Erro ao excluir compra");
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-8" data-testid="purchases-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Compras
            </h1>
            <p className="text-slate-500 mt-1">
              Registre as compras de ingredientes para calcular o preço médio
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-purchase-button"
                className="bg-rose-700 hover:bg-rose-800 shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Lançar Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-slate-900">Lançar Compra</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="ingredient" className="text-slate-700">
                    Ingrediente
                  </Label>
                  <Select value={ingredientId} onValueChange={setIngredientId} required>
                    <SelectTrigger
                      data-testid="purchase-ingredient-select"
                      className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                    >
                      <SelectValue placeholder="Selecione um ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity" className="text-slate-700">
                    Quantidade
                  </Label>
                  <Input
                    id="quantity"
                    data-testid="purchase-quantity-input"
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    required
                    className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                  />
                </div>

                <div>
                  <Label htmlFor="price" className="text-slate-700">
                    Preço Total (R$)
                  </Label>
                  <Input
                    id="price"
                    data-testid="purchase-price-input"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                  />
                </div>

                <div>
                  <Label htmlFor="date" className="text-slate-700">
                    Data da Compra
                  </Label>
                  <Input
                    id="date"
                    data-testid="purchase-date-input"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                    className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="create-purchase-button"
                  disabled={loading}
                  className="w-full bg-rose-700 hover:bg-rose-800 h-11 font-medium shadow-sm transition-all active:scale-95"
                >
                  {loading ? "Lançando..." : "Lançar Compra"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full" data-testid="purchases-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ingrediente
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Preço Total
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Preço Unitário
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    Nenhuma compra registrada. Clique em "Lançar Compra" para começar.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    data-testid={`purchase-row-${purchase.id}`}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-6 text-slate-600">
                      {formatDate(purchase.purchase_date)}
                    </td>
                    <td className="py-3 px-6 text-slate-700 font-medium">
                      {purchase.ingredient_name}
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-slate-900">
                      {purchase.quantity.toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-slate-900 font-medium">
                      R$ {purchase.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-slate-700">
                      R$ {purchase.unit_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Button
                        data-testid={`delete-purchase-${purchase.id}`}
                        onClick={() => handleDelete(purchase.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}