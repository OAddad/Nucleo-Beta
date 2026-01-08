import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Edit } from "lucide-react";
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
  const [purchaseBatches, setPurchaseBatches] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  
  // Form states
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  // Cart states
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
      const response = await axios.get(`${API}/purchases/grouped`, getAuthHeader());
      setPurchaseBatches(response.data);
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

  const resetForm = () => {
    setCart([]);
    setSupplier("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setEditMode(false);
    setCurrentBatchId(null);
  };

  const handleEdit = (batch) => {
    setEditMode(true);
    setCurrentBatchId(batch.batch_id);
    setSupplier(batch.supplier || "");
    setPurchaseDate(new Date(batch.purchase_date).toISOString().split("T")[0]);
    
    // Load items into cart
    const cartItems = batch.items.map((item, index) => ({
      id: `edit-${index}`,
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      ingredient_unit: item.ingredient_unit,
      quantity: item.quantity,
      price: item.price,
      unit_price: item.unit_price,
    }));
    setCart(cartItems);
    setOpen(true);
  };

  const finalizePurchase = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    if (!supplier.trim()) {
      toast.error("Informe o nome do fornecedor");
      return;
    }

    setLoading(true);
    try {
      const items = cart.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const payload = {
        supplier: supplier,
        purchase_date: new Date(purchaseDate).toISOString(),
        items: items,
      };

      if (editMode) {
        await axios.put(`${API}/purchases/batch/${currentBatchId}`, payload, getAuthHeader());
        toast.success("Compra atualizada com sucesso!");
      } else {
        await axios.post(`${API}/purchases/batch`, payload, getAuthHeader());
        toast.success("Compra finalizada com sucesso!");
      }
      
      resetForm();
      setOpen(false);
      fetchPurchases();
    } catch (error) {
      toast.error(editMode ? "Erro ao atualizar compra" : "Erro ao finalizar compra");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("Deseja realmente excluir toda esta compra?")) return;

    try {
      await axios.delete(`${API}/purchases/batch/${batchId}`, getAuthHeader());
      toast.success("Compra excluída!");
      fetchPurchases();
    } catch (error) {
      toast.error("Erro ao excluir compra");
    }
  };

  const toggleBatch = (batchId) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-8" data-testid="purchases-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Compras
            </h1>
            <p className="text-muted-foreground mt-1">
              Registre compras agrupadas por fornecedor
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-purchase-button"
                className="shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Lançar Compras
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Lançar Compras</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier">
                      Fornecedor
                    </Label>
                    <Input
                      id="supplier"
                      data-testid="purchase-supplier-input"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Ex: Supermercado BH"
                      required
                      className="mt-1 h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">
                      Data da Compra
                    </Label>
                    <Input
                      id="date"
                      data-testid="purchase-date-input"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      required
                      className="mt-1 h-11"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Adicionar itens</h3>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                        <SelectTrigger
                          data-testid="purchase-ingredient-select"
                          className="h-11"
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
                        className="h-11"
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
                        className="h-11"
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

                {cart.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">
                      Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
                    </h3>
                    <div className="bg-muted rounded-lg p-3 max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground uppercase">
                            <th className="pb-2">Item</th>
                            <th className="pb-2 text-right">Qtd</th>
                            <th className="pb-2 text-right">Preço</th>
                            <th className="pb-2 text-right">Unit.</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.id} className="border-t border-border">
                              <td className="py-2">
                                {item.ingredient_name}
                              </td>
                              <td className="py-2 text-right font-mono">
                                {item.quantity.toFixed(2)}
                              </td>
                              <td className="py-2 text-right font-mono">
                                R$ {item.price.toFixed(2)}
                              </td>
                              <td className="py-2 text-right font-mono text-muted-foreground text-xs">
                                R$ {item.unit_price.toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                <Button
                                  data-testid={`remove-cart-item-${item.id}`}
                                  onClick={() => removeFromCart(item.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-border font-semibold">
                            <td className="py-2">Total</td>
                            <td className="py-2 text-right font-mono">
                              {cartTotalQty.toFixed(2)}
                            </td>
                            <td className="py-2 text-right font-mono">
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
                      setSupplier("");
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
                    className="flex-1 shadow-sm transition-all active:scale-95"
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

        {/* Grouped Purchases Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          {purchaseBatches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma compra registrada. Clique em "Lançar Compras" para começar.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {purchaseBatches.map((batch) => {
                const isExpanded = expandedBatches.has(batch.batch_id);
                return (
                  <div key={batch.batch_id} data-testid={`purchase-batch-${batch.batch_id}`}>
                    {/* Batch Summary Row */}
                    <div className="flex items-center px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div 
                        className="flex-1 grid grid-cols-12 gap-4 items-center cursor-pointer"
                        onClick={() => toggleBatch(batch.batch_id)}
                      >
                        <div className="col-span-3 text-muted-foreground">
                          {formatDate(batch.purchase_date)}
                        </div>
                        <div className="col-span-3 font-medium">
                          {batch.supplier || "Sem fornecedor"}
                        </div>
                        <div className="col-span-2 text-right font-mono">
                          {batch.total_quantity.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold">
                          R$ {batch.total_price.toFixed(2)}
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          data-testid={`delete-batch-${batch.batch_id}`}
                          onClick={() => handleDeleteBatch(batch.batch_id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Items */}
                    {isExpanded && (
                      <div className="bg-muted/50 px-6 py-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border">
                              <th className="pb-2">Item</th>
                              <th className="pb-2 text-right">Quantidade</th>
                              <th className="pb-2 text-right">Preço Total</th>
                              <th className="pb-2 text-right">Preço Unitário</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batch.items.map((item) => (
                              <tr key={item.id} className="border-b border-border/50">
                                <td className="py-2">
                                  {item.ingredient_name}
                                </td>
                                <td className="py-2 text-right font-mono">
                                  {item.quantity.toFixed(2)} {item.ingredient_unit}
                                </td>
                                <td className="py-2 text-right font-mono font-medium">
                                  R$ {item.price.toFixed(2)}
                                </td>
                                <td className="py-2 text-right font-mono text-muted-foreground">
                                  R$ {item.unit_price.toFixed(2)}/{item.ingredient_unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
