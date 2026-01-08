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

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/ingredients`, { name, unit }, getAuthHeader());
      toast.success("Ingrediente criado!");
      setName("");
      setUnit("");
      setOpen(false);
      fetchIngredients();
    } catch (error) {
      toast.error("Erro ao criar ingrediente");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este ingrediente?")) return;

    try {
      await axios.delete(`${API}/ingredients/${id}`, getAuthHeader());
      toast.success("Ingrediente excluído!");
      fetchIngredients();
    } catch (error) {
      toast.error("Erro ao excluir ingrediente");
      console.error(error);
    }
  };

  return (
    <div className="p-8" data-testid="ingredients-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Ingredientes
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie os ingredientes e veja o preço médio calculado
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-ingredient-button"
                className="bg-rose-700 hover:bg-rose-800 shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Novo Ingrediente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-slate-900">Novo Ingrediente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-slate-700">
                    Nome do Ingrediente
                  </Label>
                  <Input
                    id="name"
                    data-testid="ingredient-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carne Bovina"
                    required
                    className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                  />
                </div>
                <div>
                  <Label htmlFor="unit" className="text-slate-700">
                    Unidade de Medida
                  </Label>
                  <Select value={unit} onValueChange={setUnit} required>
                    <SelectTrigger
                      data-testid="ingredient-unit-select"
                      className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                    >
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="unidade">Unidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  data-testid="create-ingredient-button"
                  disabled={loading || !unit}
                  className="w-full bg-rose-700 hover:bg-rose-800 h-11 font-medium shadow-sm transition-all active:scale-95"
                >
                  {loading ? "Criando..." : "Criar Ingrediente"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full" data-testid="ingredients-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ingrediente
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Unidade
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Preço Médio
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-slate-500">
                    Nenhum ingrediente cadastrado. Clique em "Novo Ingrediente" para começar.
                  </td>
                </tr>
              ) : (
                ingredients.map((ingredient) => (
                  <tr
                    key={ingredient.id}
                    data-testid={`ingredient-row-${ingredient.id}`}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-6 text-slate-700 font-medium">
                      {ingredient.name}
                    </td>
                    <td className="py-3 px-6 text-slate-600">{ingredient.unit}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-900 font-medium">
                      {ingredient.average_price > 0
                        ? `R$ ${ingredient.average_price.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Button
                        data-testid={`delete-ingredient-${ingredient.id}`}
                        onClick={() => handleDelete(ingredient.id)}
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