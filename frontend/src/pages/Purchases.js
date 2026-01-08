import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Check } from "lucide-react";
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
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  // Carrinho de compras
  const [cart, setCart] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
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

  const addToCart = () => {
    if (!selectedIngredient || !quantity || !price) {
      toast.error("Preencha todos os campos");
      return;
    }

    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    const newItem = {
      id: Date.now().toString(),
      ingredient_id: selectedIngredient,
      ingredient_name: ingredient.name,
      ingredient_unit: ingredient.unit,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      unit_price: parseFloat(price) / parseFloat(quantity),
    };

    setCart([...cart, newItem]);
    setSelectedIngredient("");
    setQuantity("");
    setPrice("");
    toast.success("Item adicionado ao carrinho!");
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success("Item removido do carrinho");
  };

  const finalizePurchase = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    setLoading(true);
    try {
      // Enviar todas as compras do carrinho
      for (const item of cart) {
        await axios.post(
          `${API}/purchases`,
          {
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            price: item.price,
            purchase_date: new Date(purchaseDate).toISOString(),
          },
          getAuthHeader()
        );
      }
      
      toast.success(`${cart.length} compra(s) lançada(s) com sucesso!`);
      setCart([]);
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setOpen(false);
      fetchPurchases();
    } catch (error) {
      toast.error("Erro ao finalizar compras");
      console.error(error);
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

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

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
                Lançar Compras
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900">Lançar Compras</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
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

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Adicionar itens</h3>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                        <SelectTrigger
                          data-testid="purchase-ingredient-select"
                          className="h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                        >
                          <SelectValue placeholder="Ingrediente" />
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
                    
                    <div className="col-span-3">
                      <Input
                        data-testid="purchase-quantity-input"
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Quantidade"
                        className="h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="col-span-3">
                      <Input
                        data-testid="purchase-price-input"
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Preço (R$)"
                        className="h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Button
                        type="button"
                        data-testid="add-to-cart-button"
                        onClick={addToCart}
                        className="h-11 w-full bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-5 h-5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Carrinho */}
                {cart.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                      Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 uppercase">
                            <th className="pb-2">Ingrediente</th>
                            <th className="pb-2 text-right">Qtd</th>
                            <th className="pb-2 text-right">Preço</th>
                            <th className="pb-2 text-right">Unit.</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.id} className="border-t border-slate-200">
                              <td className="py-2 text-slate-700">
                                {item.ingredient_name} ({item.ingredient_unit})
                              </td>
                              <td className="py-2 text-right font-mono text-slate-900">
                                {item.quantity.toFixed(2)}
                              </td>
                              <td className="py-2 text-right font-mono text-slate-900">
                                R$ {item.price.toFixed(2)}
                              </td>
                              <td className="py-2 text-right font-mono text-slate-600 text-xs">
                                R$ {item.unit_price.toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                <Button
                                  data-testid={`remove-cart-item-${item.id}`}
                                  onClick={() => removeFromCart(item.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-300 font-semibold">
                            <td className="py-2 text-slate-900">Total</td>
                            <td></td>
                            <td className="py-2 text-right font-mono text-slate-900">
                              R$ {cartTotal.toFixed(2)}
                            </td>
                            <td></td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setCart([]);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    data-testid="finalize-purchase-button"
                    onClick={finalizePurchase}
                    disabled={loading || cart.length === 0}
                    className="flex-1 bg-rose-700 hover:bg-rose-800 shadow-sm transition-all active:scale-95"
                  >
                    {loading ? (
                      "Finalizando..."
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" strokeWidth={1.5} />
                        Finalizar Compra
                      </>
                    )}
                  </Button>
                </div>
              </div>
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
                    Nenhuma compra registrada. Clique em "Lançar Compras" para começar.
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
