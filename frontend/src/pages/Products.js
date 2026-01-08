import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [sortBy, setSortBy] = useState("alfabetica-az");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState([{ ingredient_id: "", quantity: "" }]);
  const [recipePackaging, setRecipePackaging] = useState([{ ingredient_id: "", quantity: "" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchIngredients();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, getAuthHeader());
      setProducts(response.data);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setSalePrice("");
    setRecipeIngredients([{ ingredient_id: "", quantity: "" }]);
    setRecipePackaging([{ ingredient_id: "", quantity: "" }]);
    setEditMode(false);
    setCurrentProductId(null);
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setCurrentProductId(product.id);
    setName(product.name);
    setDescription(product.description || "");
    setSalePrice(product.sale_price ? product.sale_price.toString() : "");
    
    // Separar ingredientes e embalagens baseado no item_type
    const ingredients = product.recipe
      .filter((r) => r.item_type === "ingredient")
      .map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: r.quantity.toString(),
      }));
    
    const packaging = product.recipe
      .filter((r) => r.item_type === "packaging")
      .map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: r.quantity.toString(),
      }));
    
    setRecipeIngredients(ingredients.length > 0 ? ingredients : [{ ingredient_id: "", quantity: "" }]);
    setRecipePackaging(packaging.length > 0 ? packaging : [{ ingredient_id: "", quantity: "" }]);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combinar ingredientes e embalagens com item_type
      const allRecipe = [
        ...recipeIngredients
          .filter((r) => r.ingredient_id && r.quantity)
          .map((r) => ({
            ingredient_id: r.ingredient_id,
            quantity: parseFloat(r.quantity),
            item_type: "ingredient",
          })),
        ...recipePackaging
          .filter((r) => r.ingredient_id && r.quantity)
          .map((r) => ({
            ingredient_id: r.ingredient_id,
            quantity: parseFloat(r.quantity),
            item_type: "packaging",
          })),
      ];

      const productData = {
        name,
        description: description || null,
        sale_price: salePrice ? parseFloat(salePrice) : null,
        recipe: allRecipe,
      };

      if (editMode) {
        await axios.put(
          `${API}/products/${currentProductId}`,
          productData,
          getAuthHeader()
        );
        toast.success("Produto atualizado!");
      } else {
        await axios.post(`${API}/products`, productData, getAuthHeader());
        toast.success("Produto criado!");
      }

      resetForm();
      setOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error("Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`${API}/products/${productToDelete.id}`, getAuthHeader());
      toast.success("Produto excluído!");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error("Erro ao excluir produto");
    }
  };

  const confirmDelete = (id, name) => {
    setProductToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const addRecipeItem = (type) => {
    if (type === "ingredient") {
      setRecipeIngredients([...recipeIngredients, { ingredient_id: "", quantity: "" }]);
    } else {
      setRecipePackaging([...recipePackaging, { ingredient_id: "", quantity: "" }]);
    }
  };

  const removeRecipeItem = (index, type) => {
    if (type === "ingredient") {
      setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
    } else {
      setRecipePackaging(recipePackaging.filter((_, i) => i !== index));
    }
  };

  const updateRecipeItem = (index, field, value, type) => {
    if (type === "ingredient") {
      const updated = [...recipeIngredients];
      updated[index][field] = value;
      setRecipeIngredients(updated);
    } else {
      const updated = [...recipePackaging];
      updated[index][field] = value;
      setRecipePackaging(updated);
    }
  };

  const getIngredientDetails = (ingredientId) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    return ing || { name: "-", unit: "", average_price: 0 };
  };

  const getIngredientUnit = (ingredient) => {
    if (ingredient.units_per_package && ingredient.units_per_package > 0) {
      return "un";
    }
    if (ingredient.unit_weight && ingredient.unit_weight > 0) {
      return "un";
    }
    return ingredient.unit;
  };

  const toggleProduct = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const getSortedProducts = () => {
    const sorted = [...products];
    
    switch (sortBy) {
      case "alfabetica-az":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "alfabetica-za":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "cmv-maior":
        return sorted.sort((a, b) => b.cmv - a.cmv);
      case "cmv-menor":
        return sorted.sort((a, b) => a.cmv - b.cmv);
      case "margem-maior":
        return sorted.sort((a, b) => (b.profit_margin || 0) - (a.profit_margin || 0));
      case "margem-menor":
        return sorted.sort((a, b) => (a.profit_margin || 0) - (b.profit_margin || 0));
      case "preco-maior":
        return sorted.sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0));
      case "preco-menor":
        return sorted.sort((a, b) => (a.sale_price || 0) - (b.sale_price || 0));
      default:
        return sorted;
    }
  };

  const sortedProducts = getSortedProducts();

  return (
    <div className="p-8" data-testid="products-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Produtos
            </h1>
            <p className="text-muted-foreground mt-1">
              Cadastre produtos com suas fichas técnicas e calcule o CMV
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                data-testid="add-product-button"
                className="shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editMode ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">
                    Nome do Produto
                  </Label>
                  <Input
                    id="name"
                    data-testid="product-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: X-Burger Clássico"
                    required
                    className="mt-1 h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="description">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    data-testid="product-description-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve descrição do produto"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="salePrice">
                    Preço de Venda (R$) - opcional
                  </Label>
                  <Input
                    id="salePrice"
                    data-testid="product-sale-price-input"
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 h-11"
                  />
                </div>

                <Tabs defaultValue="ingredients" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                    <TabsTrigger value="packaging">Embalagens</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ingredients" className="space-y-3 mt-4">
                    <Label>Ingredientes da Receita</Label>
                    {recipeIngredients.map((item, index) => {
                      const selectedIng = getIngredientDetails(item.ingredient_id);
                      const displayUnit = getIngredientUnit(selectedIng);
                      
                      return (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1">
                            <Select
                              value={item.ingredient_id}
                              onValueChange={(value) =>
                                updateRecipeItem(index, "ingredient_id", value, "ingredient")
                              }
                            >
                              <SelectTrigger
                                data-testid={`recipe-ingredient-${index}`}
                                className="h-11"
                              >
                                <SelectValue placeholder="Ingrediente" />
                              </SelectTrigger>
                              <SelectContent>
                                {ingredients.map((ing) => (
                                  <SelectItem key={ing.id} value={ing.id}>
                                    {ing.name} ({getIngredientUnit(ing)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-40">
                            <Input
                              data-testid={`recipe-quantity-${index}`}
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateRecipeItem(index, "quantity", e.target.value, "ingredient")
                              }
                              placeholder={`Qtd (${displayUnit})`}
                              className="h-11"
                            />
                          </div>
                          {recipeIngredients.length > 1 && (
                            <Button
                              type="button"
                              data-testid={`remove-recipe-${index}`}
                              onClick={() => removeRecipeItem(index, "ingredient")}
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      data-testid="add-ingredient-item-button"
                      onClick={() => addRecipeItem("ingredient")}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Adicionar Ingrediente
                    </Button>
                  </TabsContent>

                  <TabsContent value="packaging" className="space-y-3 mt-4">
                    <Label>Embalagens</Label>
                    {recipePackaging.map((item, index) => {
                      const selectedIng = getIngredientDetails(item.ingredient_id);
                      const displayUnit = getIngredientUnit(selectedIng);
                      
                      return (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1">
                            <Select
                              value={item.ingredient_id}
                              onValueChange={(value) =>
                                updateRecipeItem(index, "ingredient_id", value, "packaging")
                              }
                            >
                              <SelectTrigger
                                data-testid={`recipe-packaging-${index}`}
                                className="h-11"
                              >
                                <SelectValue placeholder="Embalagem" />
                              </SelectTrigger>
                              <SelectContent>
                                {ingredients.map((ing) => (
                                  <SelectItem key={ing.id} value={ing.id}>
                                    {ing.name} ({getIngredientUnit(ing)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-40">
                            <Input
                              data-testid={`recipe-packaging-quantity-${index}`}
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateRecipeItem(index, "quantity", e.target.value, "packaging")
                              }
                              placeholder={`Qtd (${displayUnit})`}
                              className="h-11"
                            />
                          </div>
                          {recipePackaging.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeRecipeItem(index, "packaging")}
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      onClick={() => addRecipeItem("packaging")}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Adicionar Embalagem
                    </Button>
                  </TabsContent>
                </Tabs>

                <Button
                  type="submit"
                  data-testid="save-product-button"
                  disabled={loading}
                  className="w-full h-11 font-medium shadow-sm transition-all active:scale-95"
                >
                  {loading ? "Salvando..." : editMode ? "Atualizar" : "Criar Produto"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros de Ordenação */}
        {products.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <Label htmlFor="sort-products" className="text-sm font-medium">
              Ordenar por:
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-products" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alfabetica-az">Nome (A → Z)</SelectItem>
                <SelectItem value="alfabetica-za">Nome (Z → A)</SelectItem>
                <SelectItem value="cmv-maior">Maior CMV</SelectItem>
                <SelectItem value="cmv-menor">Menor CMV</SelectItem>
                <SelectItem value="margem-maior">Maior Margem</SelectItem>
                <SelectItem value="margem-menor">Menor Margem</SelectItem>
                <SelectItem value="preco-maior">Maior Preço de Venda</SelectItem>
                <SelectItem value="preco-menor">Menor Preço de Venda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="bg-card rounded-xl border shadow-sm p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
              </p>
            </div>
          ) : (
            sortedProducts.map((product) => {
              const isExpanded = expandedProducts.has(product.id);
              
              return (
                <div
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Linha Principal - Sempre Visível */}
                  <div 
                    className="flex items-center px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleProduct(product.id)}
                  >
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 font-bold text-lg">
                        {product.name}
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CMV</div>
                        <div className="text-lg font-bold font-mono text-primary">
                          R$ {product.cmv.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Preço Venda</div>
                        <div className="text-lg font-bold font-mono">
                          {product.sale_price ? `R$ ${product.sale_price.toFixed(2)}` : "-"}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Margem</div>
                        <div className="text-lg font-bold font-mono text-green-600">
                          {product.profit_margin ? `${product.profit_margin.toFixed(1)}%` : "-"}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {isExpanded && (
                    <div className="border-t bg-muted/50 px-6 py-4">
                      {product.description && (
                        <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-6">
                        {/* Ingredientes */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Ingredientes
                          </h4>
                          <div className="space-y-2">
                            {product.recipe.map((item, idx) => {
                              const ingredient = getIngredientDetails(item.ingredient_id);
                              const displayUnit = getIngredientUnit(ingredient);
                              
                              // Calcular custo baseado no tipo de ingrediente
                              let itemCost;
                              let displayQuantity = item.quantity;
                              
                              if (ingredient.unit_weight && ingredient.unit_weight > 0) {
                                // Para ingredientes com peso por unidade (hambúrguer)
                                // item.quantity está em kg, converter para unidades
                                displayQuantity = item.quantity / ingredient.unit_weight;
                                itemCost = ingredient.average_price * item.quantity;
                              } else {
                                itemCost = ingredient.average_price * item.quantity;
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0"
                                >
                                  <span className="font-medium flex-1">
                                    {ingredient.name}
                                  </span>
                                  <span className="font-mono mx-4">
                                    {displayUnit === "un" 
                                      ? Math.round(displayQuantity) 
                                      : displayQuantity.toFixed(2)
                                    } {displayUnit}
                                  </span>
                                  <span className="font-mono font-medium">
                                    R$ {itemCost.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Embalagens (por enquanto vazio, mas estrutura pronta) */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Embalagens
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Adicione embalagens ao cadastrar o produto
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6 pt-4 border-t">
                        <Button
                          data-testid={`edit-product-${product.id}`}
                          onClick={() => handleEdit(product)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Editar
                        </Button>
                        <Button
                          data-testid={`delete-product-${product.id}`}
                          onClick={() => confirmDelete(product.id, product.name)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* AlertDialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o produto <strong>{productToDelete?.name}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
