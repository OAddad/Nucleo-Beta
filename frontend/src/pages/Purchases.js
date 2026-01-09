import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Edit, Download, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { exportToExcel } from "../lib/utils";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

// URL relativa - funciona em qualquer domínio
const API = '/api';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  
  // Confirmação ao fechar popup
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Filtros e pesquisa
  const [sortOrder, setSortOrder] = useState("desc"); // desc = mais recente primeiro
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("supplier"); // supplier, value, date
  
  // Form states
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  // Cart states
  const [cart, setCart] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientPopoverOpen, setIngredientPopoverOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchIngredients();
  }, []);

  // Detectar mudanças não salvas
  useEffect(() => {
    const hasChanges = cart.length > 0 || supplier.trim() !== "";
    setHasUnsavedChanges(hasChanges);
  }, [cart, supplier]);

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

  // Filtrar ingredientes pela busca
  const filteredIngredients = useMemo(() => {
    if (!ingredientSearch) return ingredients;
    const search = ingredientSearch.toLowerCase();
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes(search) ||
      (ing.code && ing.code.includes(search))
    );
  }, [ingredients, ingredientSearch]);

  const getFilteredAndSortedBatches = () => {
    let filtered = [...purchaseBatches];
    
    // Aplicar pesquisa
    if (searchTerm) {
      filtered = filtered.filter(batch => {
        switch (searchType) {
          case "supplier":
            return batch.supplier.toLowerCase().includes(searchTerm.toLowerCase());
          case "value":
            const totalValue = batch.purchases.reduce((sum, p) => sum + p.price, 0);
            return totalValue.toString().includes(searchTerm);
          case "date":
            const batchDate = batch.purchase_date.split("T")[0];
            return batchDate === searchTerm;
          default:
            return true;
        }
      });
    }
    
    // Aplicar ordenação por data
    filtered.sort((a, b) => {
      const dateA = new Date(a.purchase_date);
      const dateB = new Date(b.purchase_date);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  };

  // Calcular preço total quando preço unitário muda
  const handleUnitPriceChange = (value) => {
    setUnitPrice(value);
    if (value && quantity) {
      const total = parseFloat(value) * parseFloat(quantity);
      setTotalPrice(total.toFixed(2));
    } else {
      setTotalPrice("");
    }
  };

  // Calcular preço unitário quando preço total muda
  const handleTotalPriceChange = (value) => {
    setTotalPrice(value);
    if (value && quantity && parseFloat(quantity) > 0) {
      const unit = parseFloat(value) / parseFloat(quantity);
      setUnitPrice(unit.toFixed(2));
    } else {
      setUnitPrice("");
    }
  };

  // Recalcular quando quantidade muda
  const handleQuantityChange = (value) => {
    setQuantity(value);
    if (value && unitPrice) {
      const total = parseFloat(unitPrice) * parseFloat(value);
      setTotalPrice(total.toFixed(2));
    } else if (value && totalPrice && parseFloat(value) > 0) {
      const unit = parseFloat(totalPrice) / parseFloat(value);
      setUnitPrice(unit.toFixed(2));
    }
  };

  const addToCart = () => {
    if (!selectedIngredient || !quantity || (!unitPrice && !totalPrice)) {
      toast.error("Preencha todos os campos");
      return;
    }

    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    const finalTotalPrice = totalPrice ? parseFloat(totalPrice) : (parseFloat(unitPrice) * parseFloat(quantity));
    const finalUnitPrice = unitPrice ? parseFloat(unitPrice) : (parseFloat(totalPrice) / parseFloat(quantity));
    
    const newItem = {
      id: Date.now().toString(),
      ingredient_id: selectedIngredient,
      ingredient_name: ingredient.name,
      ingredient_unit: ingredient.unit,
      quantity: parseFloat(quantity),
      price: finalTotalPrice,
      unit_price: finalUnitPrice,
    };

    setCart([...cart, newItem]);
    setSelectedIngredient("");
    setIngredientSearch("");
    setQuantity("");
    setUnitPrice("");
    setTotalPrice("");
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
    setSelectedIngredient("");
    setIngredientSearch("");
    setQuantity("");
    setUnitPrice("");
    setTotalPrice("");
    setEditMode(false);
    setCurrentBatchId(null);
    setHasUnsavedChanges(false);
  };

  // Handler para tentar fechar o dialog
  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true);
    } else {
      setOpen(false);
      resetForm();
    }
  };

  // Confirmar fechamento
  const confirmClose = () => {
    setConfirmCloseOpen(false);
    setOpen(false);
    resetForm();
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

  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;

    try {
      await axios.delete(`${API}/purchases/batch/${batchToDelete.id}`, getAuthHeader());
      toast.success("Compra excluída!");
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
      fetchPurchases();
    } catch (error) {
      toast.error("Erro ao excluir compra");
    }
  };

  const confirmDeleteBatch = (batchId, supplier) => {
    setBatchToDelete({ id: batchId, supplier });
    setDeleteDialogOpen(true);
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

  // Obter o ingrediente selecionado para mostrar no input
  const selectedIngredientData = ingredients.find(i => i.id === selectedIngredient);

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

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const flatPurchases = [];
                purchaseBatches.forEach(batch => {
                  if (batch.purchases && batch.purchases.length > 0) {
                    batch.purchases.forEach(p => {
                      flatPurchases.push({
                        data: batch.purchase_date,
                        fornecedor: batch.supplier,
                        ingrediente: p.ingredient_name,
                        quantidade: p.quantity,
                        valor_total: p.price,
                        valor_unitario: p.unit_price
                      });
                    });
                  }
                });
                exportToExcel(flatPurchases, "compras", {
                  data: "Data",
                  fornecedor: "Fornecedor",
                  ingrediente: "Ingrediente",
                  quantidade: "Quantidade",
                  valor_total: "Valor Total",
                  valor_unitario: "Valor Unitário"
                });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            
            <Dialog open={open} onOpenChange={(isOpen) => {
              if (!isOpen) {
                handleCloseAttempt();
              } else {
                setOpen(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-purchase-button"
                  className="shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Lançar Compras
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="sm:max-w-2xl"
                onPointerDownOutside={(e) => {
                  e.preventDefault();
                  handleCloseAttempt();
                }}
                onEscapeKeyDown={(e) => {
                  e.preventDefault();
                  handleCloseAttempt();
                }}
              >
                <DialogHeader>
                  <DialogTitle>{editMode ? "Editar Compra" : "Lançar Compras"}</DialogTitle>
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
                    
                    {/* Seletor de Ingrediente com busca */}
                    <div className="mb-3">
                      <Label>Ingrediente</Label>
                      <Popover open={ingredientPopoverOpen} onOpenChange={setIngredientPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={ingredientPopoverOpen}
                            className="w-full justify-between h-11 mt-1 font-normal"
                          >
                            {selectedIngredientData 
                              ? `${selectedIngredientData.name} (${selectedIngredientData.unit})`
                              : "Selecione ou busque um ingrediente..."
                            }
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Buscar por nome ou código..." 
                              value={ingredientSearch}
                              onValueChange={setIngredientSearch}
                            />
                            <CommandList>
                              <CommandEmpty>Nenhum ingrediente encontrado.</CommandEmpty>
                              <CommandGroup>
                                {filteredIngredients.map((ing) => (
                                  <CommandItem
                                    key={ing.id}
                                    value={ing.name}
                                    onSelect={() => {
                                      setSelectedIngredient(ing.id);
                                      setIngredientPopoverOpen(false);
                                    }}
                                  >
                                    <div className="flex justify-between w-full">
                                      <span>{ing.name}</span>
                                      <span className="text-muted-foreground text-sm">
                                        {ing.code && `#${ing.code} • `}{ing.unit}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Quantidade e Preços */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          data-testid="purchase-quantity-input"
                          type="number"
                          step="0.01"
                          value={quantity}
                          onChange={(e) => handleQuantityChange(e.target.value)}
                          placeholder="Qtd"
                          className="h-11 mt-1"
                        />
                      </div>
                      
                      <div className="col-span-3">
                        <Label className="text-xs">Preço Unitário</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) => handleUnitPriceChange(e.target.value)}
                          placeholder="R$ unit."
                          className="h-11 mt-1"
                        />
                      </div>
                      
                      <div className="col-span-4">
                        <Label className="text-xs">Preço Total</Label>
                        <Input
                          data-testid="purchase-price-input"
                          type="number"
                          step="0.01"
                          value={totalPrice}
                          onChange={(e) => handleTotalPriceChange(e.target.value)}
                          placeholder="R$ total"
                          className="h-11 mt-1"
                        />
                      </div>
                      
                      <div className="col-span-2 flex items-end">
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
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Preencha o preço unitário OU o preço total - o outro será calculado automaticamente.
                    </p>
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
                              <th className="pb-2 text-right">Unit.</th>
                              <th className="pb-2 text-right">Total</th>
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
                                <td className="py-2 text-right font-mono text-muted-foreground text-xs">
                                  R$ {item.unit_price.toFixed(2)}
                                </td>
                                <td className="py-2 text-right font-mono font-medium">
                                  R$ {item.price.toFixed(2)}
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
                              <td className="py-2"></td>
                              <td className="py-2 text-right font-mono">
                                R$ {cartTotal.toFixed(2)}
                              </td>
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
                      onClick={handleCloseAttempt}
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
                        editMode ? "Atualizando..." : "Finalizando..."
                      ) : (
                        <>
                          <Check className="w-5 h-5 mr-2" strokeWidth={1.5} />
                          {editMode ? "Atualizar Compra" : "Finalizar Compra"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros e Pesquisa */}
        {purchaseBatches.length > 0 && (
          <div className="bg-card rounded-xl border shadow-sm p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Ordenação */}
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-order" className="text-sm font-medium whitespace-nowrap">
                  Ordenar:
                </Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger id="sort-order" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Mais Recentes</SelectItem>
                    <SelectItem value="asc">Mais Antigas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Pesquisa */}
              <div className="flex items-center gap-2">
                <Label htmlFor="search-type" className="text-sm font-medium whitespace-nowrap">
                  Buscar por:
                </Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger id="search-type" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Fornecedor</SelectItem>
                    <SelectItem value="value">Valor</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo de Pesquisa */}
              <div className="flex-1">
                {searchType === "date" ? (
                  <Input
                    type="date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10"
                  />
                ) : (
                  <Input
                    placeholder={
                      searchType === "supplier" ? "Digite o nome do fornecedor..." :
                      "Digite o valor..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grouped Purchases Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          {purchaseBatches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma compra registrada. Clique em "Lançar Compras" para começar.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {getFilteredAndSortedBatches().map((batch) => {
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
                          data-testid={`edit-batch-${batch.batch_id}`}
                          onClick={() => handleEdit(batch)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-muted"
                        >
                          <Edit className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                          data-testid={`delete-batch-${batch.batch_id}`}
                          onClick={() => confirmDeleteBatch(batch.batch_id, batch.supplier)}
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
                              <th className="pb-2 text-right">Preço Unitário</th>
                              <th className="pb-2 text-right">Preço Total</th>
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
                                <td className="py-2 text-right font-mono text-muted-foreground">
                                  R$ {item.unit_price.toFixed(2)}/{item.ingredient_unit}
                                </td>
                                <td className="py-2 text-right font-mono font-medium">
                                  R$ {item.price.toFixed(2)}
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
              {getFilteredAndSortedBatches().length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma compra encontrada com os filtros aplicados.
                </div>
              )}
            </div>
          )}
        </div>

        {/* AlertDialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir toda a compra do fornecedor <strong>{batchToDelete?.supplier}</strong>?
                Esta ação não pode ser desfeita e irá remover todos os itens desta compra.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBatch}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog de confirmação ao fechar */}
        <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem alterações não salvas. Tem certeza que deseja sair? 
                Todos os itens adicionados ao carrinho serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmClose}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Descartar e Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
