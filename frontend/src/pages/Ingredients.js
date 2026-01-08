import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Moon, Sun } from "lucide-react";
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
  DialogDescription,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "../components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Delete warning dialog
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [productsUsingIngredient, setProductsUsingIngredient] = useState([]);
  const [ingredientToDelete, setIngredientToDelete] = useState(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

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
    setUnit("");
    setUnitsPerPackage("");
    setEditMode(false);
    setCurrentIngredientId(null);
  };

  const handleEdit = (ingredient) => {
    setEditMode(true);
    setCurrentIngredientId(ingredient.id);
    setName(ingredient.name);
    setUnit(ingredient.unit);
    setUnitsPerPackage(ingredient.units_per_package ? ingredient.units_per_package.toString() : "");
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { 
        name, 
        unit: unit === "unidade" ? "un" : unit 
      };
      
      if (unitsPerPackage && parseInt(unitsPerPackage) > 0) {
        payload.units_per_package = parseInt(unitsPerPackage);
      }

      if (slicesPerPackage && parseInt(slicesPerPackage) > 0) {
        payload.slices_per_package = parseInt(slicesPerPackage);
      }

      if (editMode) {
        await axios.put(`${API}/ingredients/${currentIngredientId}`, payload, getAuthHeader());
        toast.success("Ingrediente atualizado!");
      } else {
        await axios.post(`${API}/ingredients`, payload, getAuthHeader());
        toast.success("Ingrediente criado!");
      }
      
      resetForm();
      setOpen(false);
      fetchIngredients();
    } catch (error) {
      toast.error(editMode ? "Erro ao atualizar ingrediente" : "Erro ao criar ingrediente");
    } finally {
      setLoading(false);
    }
  };

  const checkUsageAndDelete = async (id, ingredientName) => {
    try {
      const response = await axios.get(`${API}/ingredients/${id}/usage`, getAuthHeader());
      
      if (!response.data.can_delete) {
        setProductsUsingIngredient(response.data.used_in_products);
        setIngredientToDelete(ingredientName);
        setDeleteWarningOpen(true);
      } else {
        // Can delete safely
        if (window.confirm(`Deseja realmente excluir "${ingredientName}"?`)) {
          await handleDelete(id);
        }
      }
    } catch (error) {
      toast.error("Erro ao verificar uso do ingrediente");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/ingredients/${id}`, getAuthHeader());
      toast.success("Ingrediente excluído!");
      fetchIngredients();
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Erro ao excluir ingrediente");
      }
    }
  };

  return (
    <div className="p-8" data-testid="ingredients-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Ingredientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os ingredientes e veja o preço médio calculado
            </p>
          </div>

          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-ingredient-button"
                className="shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Novo Ingrediente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editMode ? "Editar Ingrediente" : "Novo Ingrediente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">
                    Nome do Ingrediente
                  </Label>
                  <Input
                    id="name"
                    data-testid="ingredient-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carne Bovina"
                    required
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">
                    Unidade de Medida
                  </Label>
                  <Select value={unit} onValueChange={setUnit} required>
                    <SelectTrigger
                      data-testid="ingredient-unit-select"
                      className="mt-1 h-11"
                    >
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {unit === "un" && (
                  <div>
                    <Label htmlFor="unitsPerPackage">
                      Unidades por Embalagem (opcional)
                    </Label>
                    <Input
                      id="unitsPerPackage"
                      data-testid="ingredient-units-per-package-input"
                      type="number"
                      value={unitsPerPackage}
                      onChange={(e) => setUnitsPerPackage(e.target.value)}
                      placeholder="Ex: 182 (para caixa com 182 sachês)"
                      className="mt-1 h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use quando comprar caixas/pacotes. O preço será dividido automaticamente.
                    </p>
                  </div>
                )}

                {unit === "kg" && (
                  <div>
                    <Label htmlFor="slicesPerPackage">
                      Fatias/Porções por Embalagem (opcional)
                    </Label>
                    <Input
                      id="slicesPerPackage"
                      data-testid="ingredient-slices-per-package-input"
                      type="number"
                      value={slicesPerPackage}
                      onChange={(e) => setSlicesPerPackage(e.target.value)}
                      placeholder="Ex: 160 (para barra com 160 fatias)"
                      className="mt-1 h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use quando comprar barras/peças que você fatia. O preço será dividido automaticamente pelas fatias.
                    </p>
                  </div>
                )}
                
                <Button
                  type="submit"
                  data-testid="create-ingredient-button"
                  disabled={loading || !unit}
                  className="w-full h-11 font-medium shadow-sm transition-all active:scale-95"
                >
                  {loading ? (editMode ? "Atualizando..." : "Criando...") : (editMode ? "Atualizar Ingrediente" : "Criar Ingrediente")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full" data-testid="ingredients-table">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ingrediente
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Unidade
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preço Médio
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-muted-foreground">
                    Nenhum ingrediente cadastrado. Clique em "Novo Ingrediente" para começar.
                  </td>
                </tr>
              ) : (
                ingredients.map((ingredient) => (
                  <tr
                    key={ingredient.id}
                    data-testid={`ingredient-row-${ingredient.id}`}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-6 font-medium">
                      {ingredient.name}
                      {ingredient.units_per_package && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({ingredient.units_per_package} un/emb)
                        </span>
                      )}
                      {ingredient.slices_per_package && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({ingredient.slices_per_package} fatias/emb)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-muted-foreground">{ingredient.unit}</td>
                    <td className="py-3 px-6 text-right font-mono font-medium">
                      {ingredient.average_price > 0
                        ? `R$ ${ingredient.average_price.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          data-testid={`edit-ingredient-${ingredient.id}`}
                          onClick={() => handleEdit(ingredient)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-muted"
                        >
                          <Edit className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                          data-testid={`delete-ingredient-${ingredient.id}`}
                          onClick={() => checkUsageAndDelete(ingredient.id, ingredient.name)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Dialog */}
      <AlertDialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não é possível excluir este ingrediente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                O ingrediente <strong>{ingredientToDelete}</strong> está sendo usado nos seguintes produtos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {productsUsingIngredient.map((product) => (
                  <li key={product.id}>{product.name}</li>
                ))}
              </ul>
              <p className="text-sm pt-2">
                Para excluir este ingrediente, primeiro remova-o das fichas técnicas dos produtos acima.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
