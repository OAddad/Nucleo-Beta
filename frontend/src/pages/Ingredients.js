import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Package, AlertTriangle, ArrowUp, ArrowDown, Download, Copy, Search, X, ArrowUpDown, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { exportToExcel } from "../lib/utils";
import TablePagination from "../components/TablePagination";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

// URL relativa - funciona em qualquer domínio
const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [unitWeight, setUnitWeight] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estado para "É receita"
  const [isRecipe, setIsRecipe] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all"); // all, low, normal, high
  
  // Ordenação
  const [sortField, setSortField] = useState(null); // average_price, stock_quantity, stock_min, stock_max
  const [sortDirection, setSortDirection] = useState("asc"); // asc, desc
  
  // Category management states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategoryMode, setEditCategoryMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // Stock adjustment dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockIngredient, setStockIngredient] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [stockOperation, setStockOperation] = useState("add");
  const [stockReason, setStockReason] = useState("");
  
  // Delete warning dialog (when ingredient is in use)
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [productsUsingIngredient, setProductsUsingIngredient] = useState([]);
  
  // Delete confirmation dialog (normal delete)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState(null);
  
  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [ingredientToDuplicate, setIngredientToDuplicate] = useState(null);
  const [duplicateName, setDuplicateName] = useState("");

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Aba ativa (ativos ou desativados)
  const [activeTab, setActiveTab] = useState("ativos");
  
  // Valor total em estoque
  const [stockValue, setStockValue] = useState({ total_value: 0, items_with_stock: 0, total_items: 0 });

  useEffect(() => {
    fetchIngredients();
    fetchCategories();
    loadCurrentUser();
    ensureRecipeCategory();
    fetchStockValue();
  }, []);

  const loadCurrentUser = () => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  };

  // Garantir que a categoria "Receita" existe
  const ensureRecipeCategory = async () => {
    try {
      const response = await axios.get(`${API}/categories`, getAuthHeader());
      const existingCategories = response.data;
      const recipeCategory = existingCategories.find(c => c.name === "Receita");
      if (!recipeCategory) {
        await axios.post(`${API}/categories`, { name: "Receita" }, getAuthHeader());
      }
    } catch (error) {
      console.error("Erro ao verificar categoria Receita:", error);
    }
  };

  // Criar produto receita automaticamente
  const createRecipeProduct = async (ingredientName, ingredientId) => {
    try {
      const productName = `RECEITA - ${ingredientName}`;
      const productPayload = {
        name: productName,
        category: "Receita",
        product_type: "receita",
        is_insumo: false,
        is_divisible: false,
        recipe: [{
          ingredient_id: ingredientId,
          ingredient_name: ingredientName,
          quantity: 1
        }],
        linked_ingredient_id: ingredientId
      };
      
      await axios.post(`${API}/products`, productPayload, getAuthHeader());
      toast.success(`Produto "${productName}" criado automaticamente!`);
    } catch (error) {
      console.error("Erro ao criar produto receita:", error);
      toast.error("Erro ao criar produto receita");
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

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, getAuthHeader());
      setCategories(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias");
    }
  };
  
  const fetchStockValue = async () => {
    try {
      const response = await axios.get(`${API}/ingredients/stats/stock-value`, getAuthHeader());
      setStockValue(response.data);
    } catch (error) {
      console.error("Erro ao carregar valor do estoque");
    }
  };
  
  const handleToggleActive = async (ingredient) => {
    try {
      await axios.patch(`${API}/ingredients/${ingredient.id}/toggle-active`, {}, getAuthHeader());
      toast.success(ingredient.is_active ? "Item desativado!" : "Item ativado!");
      fetchIngredients();
      fetchStockValue();
    } catch (error) {
      toast.error("Erro ao alterar status do item");
    }
  };

  // Filtrar ingredientes
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ingredient => {
      // Filtro por ativo/desativado (baseado na aba)
      const isActive = ingredient.is_active !== false;
      if (activeTab === "ativos" && !isActive) return false;
      if (activeTab === "desativados" && isActive) return false;
      
      // Filtro por texto (nome ou código)
      const matchesSearch = searchTerm === "" || 
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ingredient.code && ingredient.code.includes(searchTerm));
      
      // Filtro por categoria
      const matchesCategory = filterCategory === "all" || 
        ingredient.category === filterCategory ||
        (filterCategory === "none" && !ingredient.category);
      
      // Filtro por status de estoque
      let matchesStock = true;
      if (filterStock !== "all") {
        const qty = ingredient.stock_quantity || 0;
        const min = ingredient.stock_min || 0;
        const max = ingredient.stock_max || 0;
        
        if (filterStock === "low") {
          matchesStock = min > 0 && qty <= min;
        } else if (filterStock === "high") {
          matchesStock = max > 0 && qty >= max;
        } else if (filterStock === "normal") {
          matchesStock = (min === 0 || qty > min) && (max === 0 || qty < max);
        }
      }
      
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [ingredients, searchTerm, filterCategory, filterStock, activeTab]);
  
  // Ingredientes ordenados
  const sortedIngredients = useMemo(() => {
    if (!sortField) return filteredIngredients;
    
    return [...filteredIngredients].sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      
      if (sortDirection === "asc") {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });
  }, [filteredIngredients, sortField, sortDirection]);

  // Ingredientes paginados
  const paginatedIngredients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedIngredients.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedIngredients, currentPage, itemsPerPage]);
  
  // Função para alternar ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStock, activeTab]);
  
  // Calcular valor necessário para completar estoque mínimo
  const stockDeficitValue = useMemo(() => {
    let totalDeficit = 0;
    let itemsWithDeficit = 0;
    
    ingredients.filter(i => i.is_active !== false).forEach(ing => {
      const qty = ing.stock_quantity || 0;
      const min = ing.stock_min || 0;
      const price = ing.average_price || 0;
      
      if (min > 0 && qty < min) {
        const deficit = min - qty;
        totalDeficit += deficit * price;
        itemsWithDeficit++;
      }
    });
    
    return { value: totalDeficit, items: itemsWithDeficit };
  }, [ingredients]);

  const resetForm = () => {
    setName("");
    setUnit("");
    setCategory("");
    setUnitsPerPackage("");
    setUnitWeight("");
    setStockMin("");
    setStockMax("");
    setIsRecipe(false);
    setEditMode(false);
    setCurrentIngredientId(null);
  };

  const handleEdit = (ingredient) => {
    setEditMode(true);
    setCurrentIngredientId(ingredient.id);
    setName(ingredient.name);
    setUnit(ingredient.unit);
    setCategory(ingredient.category || "");
    setUnitsPerPackage(ingredient.units_per_package ? ingredient.units_per_package.toString() : "");
    setUnitWeight(ingredient.unit_weight ? ingredient.unit_weight.toString() : "");
    setStockMin(ingredient.stock_min ? ingredient.stock_min.toString() : "");
    setStockMax(ingredient.stock_max ? ingredient.stock_max.toString() : "");
    setIsRecipe(ingredient.is_recipe || false);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { 
        name, 
        unit: unit === "unidade" ? "un" : unit,
        category: category || null,
        stock_min: stockMin ? parseFloat(stockMin) : 0,
        stock_max: stockMax ? parseFloat(stockMax) : 0,
        is_recipe: isRecipe
      };
      
      if (unitsPerPackage && parseInt(unitsPerPackage) > 0) {
        payload.units_per_package = parseInt(unitsPerPackage);
      }

      if (unitWeight && parseFloat(unitWeight) > 0) {
        payload.unit_weight = parseFloat(unitWeight);
      }

      let createdIngredientId = currentIngredientId;

      if (editMode) {
        await axios.put(`${API}/ingredients/${currentIngredientId}`, payload, getAuthHeader());
        toast.success("Item atualizado!");
      } else {
        const response = await axios.post(`${API}/ingredients`, payload, getAuthHeader());
        createdIngredientId = response.data.id;
        toast.success("Item criado!");
        
        // Se "É receita" está marcado, criar produto automaticamente
        if (isRecipe && createdIngredientId) {
          await createRecipeProduct(name, createdIngredientId);
        }
      }
      
      resetForm();
      setOpen(false);
      fetchIngredients();
    } catch (error) {
      console.error("Erro:", error.response?.data || error);
      toast.error(error.response?.data?.detail || (editMode ? "Erro ao atualizar item" : "Erro ao criar item"));
    } finally {
      setLoading(false);
    }
  };

  // Duplicar item
  const openDuplicateDialog = (ingredient) => {
    setIngredientToDuplicate(ingredient);
    setDuplicateName(`${ingredient.name} (Cópia)`);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateIngredient = async () => {
    if (!ingredientToDuplicate || !duplicateName.trim()) {
      toast.error("Nome do item é obrigatório");
      return;
    }

    // Verificar se já existe um item com o mesmo nome
    const exists = ingredients.some(
      i => i.name.toLowerCase() === duplicateName.trim().toLowerCase()
    );

    if (exists) {
      toast.error("Já existe um item com este nome");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: duplicateName.trim(),
        unit: ingredientToDuplicate.unit,
        category: ingredientToDuplicate.category || null,
        units_per_package: ingredientToDuplicate.units_per_package || 0,
        unit_weight: ingredientToDuplicate.unit_weight || 0,
        stock_min: ingredientToDuplicate.stock_min || 0,
        stock_max: ingredientToDuplicate.stock_max || 0,
        // Não copiar estoque atual nem preço médio
      };

      await axios.post(`${API}/ingredients`, payload, getAuthHeader());
      toast.success(`Item "${duplicateName}" criado com sucesso!`);
      setDuplicateDialogOpen(false);
      setIngredientToDuplicate(null);
      setDuplicateName("");
      fetchIngredients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao duplicar item");
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
        setIngredientToDelete({ id, name: ingredientName });
        setDeleteConfirmOpen(true);
      }
    } catch (error) {
      toast.error("Erro ao verificar uso do item");
    }
  };

  const confirmDelete = async () => {
    if (!ingredientToDelete) return;
    
    try {
      await axios.delete(`${API}/ingredients/${ingredientToDelete.id}`, getAuthHeader());
      toast.success("Item excluído!");
      setDeleteConfirmOpen(false);
      setIngredientToDelete(null);
      fetchIngredients();
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Erro ao excluir item");
      }
    }
  };

  // Stock adjustment
  const openStockDialog = (ingredient) => {
    setStockIngredient(ingredient);
    setStockAdjustment("");
    setStockOperation("add");
    setStockReason("");
    setStockDialogOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!stockIngredient || !stockAdjustment) return;
    
    try {
      await axios.put(
        `${API}/ingredients/${stockIngredient.id}/stock`,
        {
          quantity: parseFloat(stockAdjustment),
          operation: stockOperation,
          reason: stockReason || null
        },
        getAuthHeader()
      );
      toast.success(`Estoque ${stockOperation === "add" ? "adicionado" : "removido"} com sucesso!`);
      setStockDialogOpen(false);
      fetchIngredients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao ajustar estoque");
    }
  };

  // Category management functions
  const resetCategoryForm = () => {
    setCategoryName("");
    setEditCategoryMode(false);
    setCurrentCategoryId(null);
  };

  const handleEditCategory = (cat) => {
    setEditCategoryMode(true);
    setCurrentCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    
    try {
      if (editCategoryMode) {
        await axios.put(`${API}/categories/${currentCategoryId}`, { name: categoryName }, getAuthHeader());
        toast.success("Categoria atualizada!");
      } else {
        await axios.post(`${API}/categories`, { name: categoryName }, getAuthHeader());
        toast.success("Categoria criada!");
      }
      resetCategoryForm();
      setCategoryDialogOpen(false);
      fetchCategories();
      fetchIngredients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar categoria");
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      await axios.delete(`${API}/categories/${categoryToDelete.id}`, getAuthHeader());
      toast.success("Categoria excluída!");
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao excluir categoria");
    }
  };

  const canEdit = currentUser?.role === "proprietario" || currentUser?.role === "administrador";

  const getStockStatus = (ingredient) => {
    const qty = ingredient.stock_quantity || 0;
    const min = ingredient.stock_min || 0;
    const max = ingredient.stock_max || 0;
    
    if (min > 0 && qty <= min) {
      return { color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", icon: AlertTriangle, label: "Baixo" };
    }
    if (max > 0 && qty >= max) {
      return { color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", icon: Package, label: "Alto" };
    }
    return { color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20", icon: Package, label: "Normal" };
  };

  // Contadores para os filtros
  const stockCounts = useMemo(() => {
    const counts = { low: 0, normal: 0, high: 0 };
    ingredients.filter(i => i.is_active !== false).forEach(ing => {
      const status = getStockStatus(ing);
      if (status.label === "Baixo") counts.low++;
      else if (status.label === "Alto") counts.high++;
      else counts.normal++;
    });
    return counts;
  }, [ingredients]);
  
  // Contadores de ativos/desativados
  const activeCounts = useMemo(() => {
    const active = ingredients.filter(i => i.is_active !== false).length;
    const inactive = ingredients.filter(i => i.is_active === false).length;
    return { active, inactive };
  }, [ingredients]);

  return (
    <div className="p-8" data-testid="ingredients-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os itens de estoque e suas categorias
          </p>
        </div>
        
        {/* Cards de Valor Total em Estoque */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Valor Total em Estoque</p>
                <p className="text-3xl font-bold mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stockValue.total_value)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="text-emerald-100 text-xs mt-2">
              {stockValue.items_with_stock} itens com estoque de {stockValue.total_items} ativos
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Necessário p/ Estoque Mín.</p>
                <p className="text-3xl font-bold mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stockDeficitValue.value)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>
            <p className="text-blue-100 text-xs mt-2">
              {stockDeficitValue.items} itens abaixo do mínimo
            </p>
          </div>
          
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-red-600">{stockCounts.low}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Itens Desativados</p>
                <p className="text-2xl font-bold text-amber-600">{activeCounts.inactive}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="estoque" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>

          {/* Tab: Estoque */}
          <TabsContent value="estoque">
            {/* Sub-abas: Ativos / Desativados */}
            <div className="flex items-center gap-4 mb-4">
              <div className="inline-flex rounded-lg border p-1 bg-muted/50">
                <button
                  onClick={() => setActiveTab("ativos")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "ativos" 
                      ? "bg-background shadow text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ativos ({activeCounts.active})
                </button>
                <button
                  onClick={() => setActiveTab("desativados")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "desativados" 
                      ? "bg-background shadow text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Desativados ({activeCounts.inactive})
                </button>
              </div>
            </div>
            
            {/* Barra de Filtros */}
            <div className="bg-card rounded-xl border shadow-sm p-4 mb-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Busca */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Filtro por Categoria */}
                <div className="w-full lg:w-48">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      <SelectItem value="none">Sem Categoria</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro por Status de Estoque */}
                <div className="w-full lg:w-52">
                  <Select value={filterStock} onValueChange={setFilterStock}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Status Estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          Estoque Baixo ({stockCounts.low})
                        </span>
                      </SelectItem>
                      <SelectItem value="normal">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Estoque Normal ({stockCounts.normal})
                        </span>
                      </SelectItem>
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Estoque Alto ({stockCounts.high})
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Indicador de resultados */}
              <div className="mt-3 text-sm text-muted-foreground">
                Mostrando {filteredIngredients.length} de {ingredients.length} itens
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <Button 
                variant="outline" 
                onClick={() => exportToExcel(ingredients, "estoque", {
                  code: "Código",
                  name: "Nome",
                  category: "Categoria", 
                  unit: "Unidade",
                  average_price: "Preço Médio (últimas 5 compras)",
                  stock_quantity: "Qtd Estoque",
                  stock_min: "Estoque Mín",
                  stock_max: "Estoque Máx"
                })}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
              {canEdit && (
                <Dialog open={open} onOpenChange={(isOpen) => {
                  setOpen(isOpen);
                  if (!isOpen) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-ingredient-button" className="shadow-sm">
                      <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Novo Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editMode ? "Editar Item" : "Novo Item de Estoque"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name">Nome do Item</Label>
                        <Input
                          id="name"
                          data-testid="ingredient-name-input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Carne Bovina"
                          required
                          className="mt-1 h-11"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          O código será gerado automaticamente
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="unit">Unidade</Label>
                          <Select value={unit} onValueChange={setUnit} required>
                            <SelectTrigger className="mt-1 h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">Quilograma (kg)</SelectItem>
                              <SelectItem value="un">Unidade (un)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="category">Categoria</Label>
                          <Select value={category || "none"} onValueChange={(val) => setCategory(val === "none" ? "" : val)}>
                            <SelectTrigger className="mt-1 h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem categoria</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {unit === "un" && (
                        <div>
                          <Label htmlFor="unitsPerPackage">Unidades por Embalagem (opcional)</Label>
                          <Input
                            id="unitsPerPackage"
                            type="number"
                            value={unitsPerPackage}
                            onChange={(e) => setUnitsPerPackage(e.target.value)}
                            placeholder="Ex: 182"
                            className="mt-1 h-11"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Use quando comprar caixas/pacotes.
                          </p>
                        </div>
                      )}

                      {unit === "kg" && (
                        <div>
                          <Label htmlFor="unitWeight">Peso por Unidade em kg (opcional)</Label>
                          <Input
                            id="unitWeight"
                            type="number"
                            step="0.001"
                            value={unitWeight}
                            onChange={(e) => setUnitWeight(e.target.value)}
                            placeholder="Ex: 0.130"
                            className="mt-1 h-11"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: 1 hambúrguer = 0.130kg
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="stockMin">Qtd Mínima</Label>
                          <Input
                            id="stockMin"
                            type="number"
                            step="0.01"
                            value={stockMin}
                            onChange={(e) => setStockMin(e.target.value)}
                            placeholder="0"
                            className="mt-1 h-11"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stockMax">Qtd Máxima</Label>
                          <Input
                            id="stockMax"
                            type="number"
                            step="0.01"
                            value={stockMax}
                            onChange={(e) => setStockMax(e.target.value)}
                            placeholder="0"
                            className="mt-1 h-11"
                          />
                        </div>
                      </div>
                      
                      {/* Switch "É receita" */}
                      {!editMode && (
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                          <div>
                            <Label htmlFor="isRecipe" className="text-sm font-medium">É receita?</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Cria automaticamente um produto na aba Produtos
                            </p>
                          </div>
                          <button
                            type="button"
                            id="isRecipe"
                            role="switch"
                            aria-checked={isRecipe}
                            onClick={() => setIsRecipe(!isRecipe)}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                              ${isRecipe ? 'bg-primary' : 'bg-muted-foreground/30'}
                            `}
                          >
                            <span
                              className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow
                                ${isRecipe ? 'translate-x-6' : 'translate-x-1'}
                              `}
                            />
                          </button>
                        </div>
                      )}
                      
                      <Button
                        type="submit"
                        data-testid="create-ingredient-button"
                        disabled={loading || !unit}
                        className="w-full h-11 font-medium shadow-sm"
                      >
                        {loading ? (editMode ? "Atualizando..." : "Criando...") : (editMode ? "Atualizar Item" : "Criar Item")}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="ingredients-table">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Código
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Ingrediente
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Unidade
                      </th>
                      <th 
                        className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 select-none transition-colors"
                        onClick={() => handleSort("average_price")}
                        title="Clique para ordenar"
                      >
                        <span className="flex items-center justify-end gap-1">
                          <span title="Média das últimas 5 compras">Preço Médio*</span>
                          {sortField === "average_price" ? (
                            sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                          )}
                        </span>
                      </th>
                      <th 
                        className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 select-none transition-colors"
                        onClick={() => handleSort("stock_quantity")}
                        title="Clique para ordenar"
                      >
                        <span className="flex items-center justify-center gap-1">
                          Qtd Estoque
                          {sortField === "stock_quantity" ? (
                            sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                          )}
                        </span>
                      </th>
                      <th 
                        className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 select-none transition-colors"
                        onClick={() => handleSort("stock_max")}
                        title="Clique para ordenar"
                      >
                        <span className="flex items-center justify-center gap-1">
                          Qtd Máx
                          {sortField === "stock_max" ? (
                            sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                          )}
                        </span>
                      </th>
                      <th 
                        className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 select-none transition-colors"
                        onClick={() => handleSort("stock_min")}
                        title="Clique para ordenar"
                      >
                        <span className="flex items-center justify-center gap-1">
                          Qtd Mín
                          {sortField === "stock_min" ? (
                            sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                          )}
                        </span>
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-12 text-muted-foreground">
                          {ingredients.length === 0 
                            ? 'Nenhum item cadastrado. Clique em "Novo Item" para começar.'
                            : 'Nenhum item encontrado com os filtros aplicados.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedIngredients.map((ingredient) => {
                        const stockStatus = getStockStatus(ingredient);
                        const StockIcon = stockStatus.icon;
                        
                        return (
                          <tr
                            key={ingredient.id}
                            data-testid={`ingredient-row-${ingredient.id}`}
                            className="border-b hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono text-sm text-muted-foreground">
                              {ingredient.code || "-"}
                            </td>
                            <td className="py-3 px-4 font-medium">
                              <div className="flex items-center gap-2">
                                {ingredient.name}
                                {Number(ingredient.units_per_package) > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({ingredient.units_per_package} un/emb)
                                  </span>
                                )}
                                {Number(ingredient.unit_weight) > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    (1 un = {ingredient.unit_weight}kg)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {ingredient.category ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  {ingredient.category}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {ingredient.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {ingredient.average_price > 0
                                ? `R$ ${ingredient.average_price.toFixed(2)}`
                                : "-"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${stockStatus.bg}`}>
                                <StockIcon className={`w-4 h-4 ${stockStatus.color}`} />
                                <span className={`font-mono font-medium ${stockStatus.color}`}>
                                  {(ingredient.stock_quantity || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                              {ingredient.stock_max > 0 ? ingredient.stock_max.toFixed(2) : "-"}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                              {ingredient.stock_min > 0 ? ingredient.stock_min.toFixed(2) : "-"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {canEdit ? (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    onClick={() => openStockDialog(ingredient)}
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-green-100 dark:hover:bg-green-900/30"
                                    title="Ajustar Estoque"
                                  >
                                    <Package className="w-4 h-4 text-green-600" strokeWidth={1.5} />
                                  </Button>
                                  <Button
                                    onClick={() => openDuplicateDialog(ingredient)}
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    title="Duplicar Item"
                                  >
                                    <Copy className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                                  </Button>
                                  <Button
                                    data-testid={`edit-ingredient-${ingredient.id}`}
                                    onClick={() => handleEdit(ingredient)}
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-muted"
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" strokeWidth={1.5} />
                                  </Button>
                                  <div 
                                    className="flex items-center px-2"
                                    title={ingredient.is_active !== false ? "Desativar item" : "Ativar item"}
                                  >
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={ingredient.is_active !== false}
                                      onClick={() => handleToggleActive(ingredient)}
                                      className={`
                                        relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                                        ${ingredient.is_active !== false ? 'bg-green-500' : 'bg-muted-foreground/30'}
                                      `}
                                    >
                                      <span
                                        className={`
                                          inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow
                                          ${ingredient.is_active !== false ? 'translate-x-5' : 'translate-x-1'}
                                        `}
                                      />
                                    </button>
                                  </div>
                                  <Button
                                    data-testid={`delete-ingredient-${ingredient.id}`}
                                    onClick={() => checkUsageAndDelete(ingredient.id, ingredient.name)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Somente leitura</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Paginação */}
              {filteredIngredients.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredIngredients.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              )}
              
              {/* Nota sobre o preço médio */}
              <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
                * O Preço Médio é calculado com base na <strong>média das últimas 5 compras</strong> registradas para cada item.
              </div>
            </div>
          </TabsContent>

          {/* Tab: Categorias */}
          <TabsContent value="categorias">
            <div className="flex justify-end mb-4">
              {canEdit && (
                <Dialog open={categoryDialogOpen} onOpenChange={(isOpen) => {
                  setCategoryDialogOpen(isOpen);
                  if (!isOpen) resetCategoryForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="shadow-sm">
                      <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editCategoryMode ? "Editar Categoria" : "Nova Categoria"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="categoryName">Nome da Categoria</Label>
                        <Input
                          id="categoryName"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="Ex: Carnes, Embalagens, etc."
                          required
                          className="mt-1 h-11"
                        />
                      </div>
                      <Button type="submit" className="w-full h-11 font-medium shadow-sm">
                        {editCategoryMode ? "Atualizar Categoria" : "Criar Categoria"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="text-center py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Itens
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-12 text-muted-foreground">
                        Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => {
                      const itemCount = ingredients.filter(i => i.category === cat.name).length;
                      return (
                        <tr key={cat.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-6 font-medium">{cat.name}</td>
                          <td className="py-3 px-6 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted">
                              {itemCount} {itemCount === 1 ? "item" : "itens"}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right">
                            {canEdit ? (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={() => handleEditCategory(cat)}
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-muted"
                                >
                                  <Edit className="w-4 h-4" strokeWidth={1.5} />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setCategoryToDelete(cat);
                                    setDeleteCategoryDialogOpen(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Somente leitura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {stockIngredient?.name} - Estoque atual: {(stockIngredient?.stock_quantity || 0).toFixed(2)} {stockIngredient?.unit}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={stockOperation === "add" ? "default" : "outline"}
                onClick={() => setStockOperation("add")}
                className="h-12"
              >
                <ArrowUp className="w-5 h-5 mr-2" />
                Entrada
              </Button>
              <Button
                type="button"
                variant={stockOperation === "remove" ? "default" : "outline"}
                onClick={() => setStockOperation("remove")}
                className="h-12"
              >
                <ArrowDown className="w-5 h-5 mr-2" />
                Saída
              </Button>
            </div>
            
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.01"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-11"
              />
            </div>
            
            <div>
              <Label>Motivo (opcional)</Label>
              <Input
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Ex: Perda, Ajuste de inventário, etc"
                className="mt-1 h-11"
              />
            </div>
            
            <Button
              onClick={handleStockAdjustment}
              disabled={!stockAdjustment || parseFloat(stockAdjustment) <= 0}
              className="w-full h-11"
            >
              Confirmar Ajuste
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Criando cópia de: <strong>{ingredientToDuplicate?.name}</strong>
            </p>
            <div>
              <Label htmlFor="duplicateName">Nome do novo item</Label>
              <Input
                id="duplicateName"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Digite o nome do novo item"
                className="mt-1 h-11"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A cópia terá as mesmas configurações (unidade, categoria, limites de estoque), 
              mas começará com estoque zerado e preço médio zerado.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDuplicateDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDuplicateIngredient}
                disabled={loading || !duplicateName.trim()}
                className="flex-1"
              >
                {loading ? "Duplicando..." : "Duplicar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog - Ingredient in use */}
      <AlertDialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não é possível excluir este item</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                O item <strong>{ingredientToDelete}</strong> está sendo usado nos seguintes produtos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {productsUsingIngredient.map((product) => (
                  <li key={product.id}>{product.name}</li>
                ))}
              </ul>
              <p className="text-sm pt-2">
                Para excluir este item, primeiro remova-o das fichas técnicas dos produtos acima.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item <strong>{ingredientToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{categoryToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
