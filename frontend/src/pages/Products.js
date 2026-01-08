import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign } from "lucide-react";
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

export default function Products() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [recipe, setRecipe] = useState([{ ingredient_id: "", quantity: "" }]);
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
    setRecipe([{ ingredient_id: "", quantity: "" }]);
    setEditMode(false);
    setCurrentProductId(null);
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setCurrentProductId(product.id);
    setName(product.name);
    setDescription(product.description || "");
    setSalePrice(product.sale_price ? product.sale_price.toString() : "");
    setRecipe(
      product.recipe.map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: r.quantity.toString(),
      }))
    );
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedRecipe = recipe
        .filter((r) => r.ingredient_id && r.quantity)
        .map((r) => ({
          ingredient_id: r.ingredient_id,
          quantity: parseFloat(r.quantity),
        }));

      const productData = {
        name,
        description: description || null,
        sale_price: salePrice ? parseFloat(salePrice) : null,
        recipe: formattedRecipe,
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

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este produto?")) return;

    try {
      await axios.delete(`${API}/products/${id}`, getAuthHeader());
      toast.success("Produto excluído!");
      fetchProducts();
    } catch (error) {
      toast.error("Erro ao excluir produto");
    }
  };

  const addRecipeItem = () => {
    setRecipe([...recipe, { ingredient_id: "", quantity: "" }]);
  };

  const removeRecipeItem = (index) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const updateRecipeItem = (index, field, value) => {
    const updated = [...recipe];
    updated[index][field] = value;
    setRecipe(updated);
  };

  const getIngredientName = (ingredientId) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    return ing ? `${ing.name} (${ing.unit})` : "-";
  };

  const getIngredientDetails = (ingredientId) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    return ing || { name: "-", unit: "", average_price: 0 };
  };

  return (
    <div className="p-8" data-testid="products-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Produtos
            </h1>
            <p className="text-slate-500 mt-1">
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
                className="bg-rose-700 hover:bg-rose-800 shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-slate-900">
                  {editMode ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-slate-700">
                    Nome do Produto
                  </Label>
                  <Input
                    id="name"
                    data-testid="product-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: X-Burger Clássico"
                    required
                    className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-slate-700">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    data-testid="product-description-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve descrição do produto"
                    className="mt-1 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="salePrice" className="text-slate-700">
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
                    className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                  />
                </div>

                <div>
                  <Label className="text-slate-700 mb-2 block">
                    Ficha Técnica (Receita)
                  </Label>
                  <div className="space-y-3">
                    {recipe.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={item.ingredient_id}
                            onValueChange={(value) =>
                              updateRecipeItem(index, "ingredient_id", value)
                            }
                          >
                            <SelectTrigger
                              data-testid={`recipe-ingredient-${index}`}
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
                        <div className="w-32">
                          <Input
                            data-testid={`recipe-quantity-${index}`}
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateRecipeItem(index, "quantity", e.target.value)
                            }
                            placeholder="Qtd"
                            className="h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                          />
                        </div>
                        {recipe.length > 1 && (
                          <Button
                            type="button"
                            data-testid={`remove-recipe-${index}`}
                            onClick={() => removeRecipeItem(index)}
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    data-testid="add-recipe-item-button"
                    onClick={addRecipeItem}
                    variant="outline"
                    className="mt-3 w-full border-slate-200 hover:bg-slate-50"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Adicionar Ingrediente
                  </Button>
                </div>

                <Button
                  type="submit"
                  data-testid="save-product-button"
                  disabled={loading}
                  className="w-full bg-rose-700 hover:bg-rose-800 h-11 font-medium shadow-sm transition-all active:scale-95"
                >
                  {loading ? "Salvando..." : editMode ? "Atualizar" : "Criar Produto"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {products.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <p className="text-slate-500">
                Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
              </p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                data-testid={`product-card-${product.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-slate-500 text-sm mt-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`edit-product-${product.id}`}
                      onClick={() => handleEdit(product)}
                      variant="outline"
                      size="sm"
                      className="border-slate-200 hover:bg-slate-50"
                    >
                      <Edit className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                    <Button
                      data-testid={`delete-product-${product.id}`}
                      onClick={() => handleDelete(product.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 mb-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Ficha Técnica
                  </h4>
                  <div className="space-y-2">
                    {product.recipe.map((item, idx) => {
                      const ingredient = getIngredientDetails(item.ingredient_id);
                      const itemCost = ingredient.average_price * item.quantity;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0"
                        >
                          <span className="text-slate-700 font-medium flex-1">
                            {ingredient.name} ({ingredient.unit})
                          </span>
                          <span className="font-mono text-slate-900 mx-4">
                            {item.quantity.toFixed(2)} {ingredient.unit}
                          </span>
                          <span className="font-mono text-slate-900 font-medium">
                            R$ {itemCost.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <div className="flex-1 bg-rose-50 rounded-lg p-4">
                    <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">
                      CMV
                    </div>
                    <div className="text-2xl font-bold text-rose-900 font-mono">
                      R$ {product.cmv.toFixed(2)}
                    </div>
                  </div>

                  {product.sale_price && (
                    <>
                      <div className="flex-1 bg-slate-50 rounded-lg p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Preço de Venda
                        </div>
                        <div className="text-2xl font-bold text-slate-900 font-mono">
                          R$ {product.sale_price.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex-1 bg-green-50 rounded-lg p-4">
                        <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
                          Margem
                        </div>
                        <div className="text-2xl font-bold text-green-900 font-mono">
                          {product.profit_margin?.toFixed(1) || "0.0"}%
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}