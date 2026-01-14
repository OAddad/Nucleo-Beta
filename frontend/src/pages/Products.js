import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, ImageOff, Copy, Download, Camera, FileText, Search, X, ChefHat, Package, GripVertical, Settings2, Eye, Layers } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { exportToExcel } from "../lib/utils";
import TablePagination from "../components/TablePagination";
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

// URL relativa - funciona em qualquer domínio
const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// Componente Combobox com busca e opção de cadastrar novo ingrediente
function IngredientCombobox({ 
  ingredients, 
  value, 
  onChange, 
  placeholder = "Buscar ingrediente...",
  onCreateNew,
  getIngredientUnit
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Encontrar ingrediente selecionado
  const selectedIngredient = ingredients.find(i => i.id === value);
  
  // Filtrar ingredientes baseado na busca
  const filteredIngredients = useMemo(() => {
    if (!searchTerm) return ingredients;
    const term = searchTerm.toLowerCase();
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes(term) ||
      (ing.code && ing.code.includes(term))
    );
  }, [ingredients, searchTerm]);
  
  // Verificar se a busca não encontrou resultados
  const noResults = searchTerm && filteredIngredients.length === 0;
  
  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleSelect = (ingredientId) => {
    onChange(ingredientId);
    setSearchTerm("");
    setIsOpen(false);
  };
  
  const handleCreateNew = () => {
    onCreateNew(searchTerm);
    setSearchTerm("");
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={isOpen ? searchTerm : (selectedIngredient ? `${selectedIngredient.name} (${getIngredientUnit(selectedIngredient)})` : "")}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          placeholder={placeholder}
          className="h-11 pl-9 pr-8"
        />
        {(value || searchTerm) && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearchTerm("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredIngredients.length > 0 && (
            <div className="py-1">
              {filteredIngredients.slice(0, 20).map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => handleSelect(ing.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between ${
                    ing.id === value ? 'bg-muted' : ''
                  }`}
                >
                  <span>{ing.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {getIngredientUnit(ing)}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {noResults && (
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-2">
                Nenhum item encontrado para "{searchTerm}"
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCreateNew}
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar "{searchTerm}"
              </Button>
            </div>
          )}
          
          {!searchTerm && ingredients.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Nenhum ingrediente cadastrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Popup para cadastro rápido de ingrediente - IDÊNTICO ao do Estoque
function QuickIngredientDialog({ open, onOpenChange, initialName, onSuccess, categories }) {
  const [name, setName] = useState(initialName || "");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [unitWeight, setUnitWeight] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setName(initialName || "");
  }, [initialName]);
  
  const resetForm = () => {
    setName("");
    setUnit("");
    setCategory("");
    setUnitsPerPackage("");
    setUnitWeight("");
    setStockMin("");
    setStockMax("");
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !unit) {
      toast.error("Nome e unidade são obrigatórios");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        name,
        unit: unit === "unidade" ? "un" : unit,
        category: category || null,
        stock_min: stockMin ? parseFloat(stockMin) : 0,
        stock_max: stockMax ? parseFloat(stockMax) : 0
      };
      
      if (unitsPerPackage && parseInt(unitsPerPackage) > 0) {
        payload.units_per_package = parseInt(unitsPerPackage);
      }
      
      if (unitWeight && parseFloat(unitWeight) > 0) {
        payload.unit_weight = parseFloat(unitWeight);
      }
      
      const response = await axios.post(`${API}/ingredients`, payload, getAuthHeader());
      toast.success(`Item "${name}" criado com sucesso!`);
      onSuccess(response.data);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar item");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Item de Estoque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="quick-name">Nome do Item</Label>
            <Input
              id="quick-name"
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
              <Label htmlFor="quick-unit">Unidade</Label>
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
              <Label htmlFor="quick-category">Categoria</Label>
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
              <Label htmlFor="quick-unitsPerPackage">Unidades por Embalagem (opcional)</Label>
              <Input
                id="quick-unitsPerPackage"
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
              <Label htmlFor="quick-unitWeight">Peso por Unidade em kg (opcional)</Label>
              <Input
                id="quick-unitWeight"
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
              <Label htmlFor="quick-stockMin">Qtd Mínima</Label>
              <Input
                id="quick-stockMin"
                type="number"
                step="0.01"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                placeholder="0"
                className="mt-1 h-11"
              />
            </div>
            <div>
              <Label htmlFor="quick-stockMax">Qtd Máxima</Label>
              <Input
                id="quick-stockMax"
                type="number"
                step="0.01"
                value={stockMax}
                onChange={(e) => setStockMax(e.target.value)}
                placeholder="0"
                className="mt-1 h-11"
              />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={loading || !unit}
            className="w-full h-11 font-medium shadow-sm"
          >
            {loading ? "Criando..." : "Criar Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente de imagem do produto com gerenciamento de erro via estado React
function ProductThumbnail({ photoUrl, name }) {
  const [imageError, setImageError] = useState(false);

  if (!photoUrl || imageError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-muted">
        <ImageOff className="w-6 h-6 text-muted-foreground mb-1" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground">{imageError ? "Erro" : "Sem foto"}</span>
      </div>
    );
  }

  return (
    <img
      src={`/api${photoUrl}`}
      alt={name}
      className="w-full h-full object-contain"
      onError={() => setImageError(true)}
    />
  );
}

// Componente do indicador circular de progresso (fora do Products para evitar re-renderização)
function CircularProgress({ percent, size = 140, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  
  // Cor baseada na porcentagem
  const getColor = (pct) => {
    if (pct >= 80) return "#22c55e"; // verde
    if (pct >= 50) return "#eab308"; // amarelo
    return "#ef4444"; // vermelho
  };
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Círculo de fundo */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/20"
      />
      {/* Círculo de progresso */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor(percent)}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

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
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState("produto");
  const [salePrice, setSalePrice] = useState("");
  const [simplePrice, setSimplePrice] = useState("");
  const [comboDescription, setComboDescription] = useState("");
  const [simpleDescription, setSimpleDescription] = useState("");
  const [simplePhotoUrl, setSimplePhotoUrl] = useState("");
  const [comboPhotoUrl, setComboPhotoUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [isInsumo, setIsInsumo] = useState(false);
  const [isDivisible, setIsDivisible] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState([{ ingredient_id: "", quantity: "" }]);
  const [recipePackaging, setRecipePackaging] = useState([{ ingredient_id: "", quantity: "" }]);
  const [orderSteps, setOrderSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState("ficha"); // "ficha" ou "etapas"
  
  // Estados para campos de receita (rendimento)
  const [recipeYield, setRecipeYield] = useState("");
  const [recipeYieldUnit, setRecipeYieldUnit] = useState("kg");
  const [linkedIngredientId, setLinkedIngredientId] = useState("");
  
  // Estados para busca de produtos nas etapas
  const [stepProductSearch, setStepProductSearch] = useState({});
  const [stepSearchOpen, setStepSearchOpen] = useState({});
  
  // Estados para cadastro rápido de ingrediente
  const [quickIngredientOpen, setQuickIngredientOpen] = useState(false);
  const [quickIngredientName, setQuickIngredientName] = useState("");
  const [ingredientCategories, setIngredientCategories] = useState([]);
  const [quickIngredientTarget, setQuickIngredientTarget] = useState(null); // {type: "ingredient"|"packaging", index: number}
  
  // Category management states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategoryMode, setEditCategoryMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // Duplicate product states
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [productToDuplicate, setProductToDuplicate] = useState(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicatingProduct, setDuplicatingProduct] = useState(false);
  
  // Filtro de performance (sem-foto, sem-descricao, todos)
  const [performanceFilter, setPerformanceFilter] = useState("todos");
  
  // Novos filtros manuais
  const [filterPhoto, setFilterPhoto] = useState("todos"); // todos, com-foto, sem-foto
  const [filterDescription, setFilterDescription] = useState("todos"); // todos, com-descricao, sem-descricao
  const [filterCategory, setFilterCategory] = useState("todos"); // todos ou nome da categoria
  const [filterName, setFilterName] = useState(""); // Filtro de busca por nome
  const [filterType, setFilterType] = useState("todos"); // todos, produto, combo, receita
  
  // Direção da ordenação (asc/desc) para campos com toggle
  const [sortDirection, setSortDirection] = useState({
    cmv: "desc",
    margem: "desc",
    preco: "desc"
  });

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calcular estatísticas de performance do cardápio
  const cardapioStats = useMemo(() => {
    const total = products.length;
    if (total === 0) {
      return {
        total: 0,
        withPhoto: 0,
        withDescription: 0,
        photoPercent: 0,
        descriptionPercent: 0,
        overallPercent: 0
      };
    }
    
    const withPhoto = products.filter(p => p.photo_url && p.photo_url.trim() !== "").length;
    const withDescription = products.filter(p => p.description && p.description.trim() !== "").length;
    
    const photoPercent = Math.round((withPhoto / total) * 100);
    const descriptionPercent = Math.round((withDescription / total) * 100);
    
    // Média ponderada: foto (50%) + descrição (50%)
    const overallPercent = Math.round((photoPercent + descriptionPercent) / 2);
    
    return {
      total,
      withPhoto,
      withDescription,
      photoPercent,
      descriptionPercent,
      overallPercent
    };
  }, [products]);

  // Filtrar produtos baseado em todos os filtros (performance + manuais)
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    // Filtro de performance (dos indicadores)
    if (performanceFilter === "sem-foto") {
      filtered = filtered.filter(p => !p.photo_url || p.photo_url.trim() === "");
    } else if (performanceFilter === "sem-descricao") {
      filtered = filtered.filter(p => !p.description || p.description.trim() === "");
    }
    
    // Filtro manual de fotos
    if (filterPhoto === "com-foto") {
      filtered = filtered.filter(p => p.photo_url && p.photo_url.trim() !== "");
    } else if (filterPhoto === "sem-foto") {
      filtered = filtered.filter(p => !p.photo_url || p.photo_url.trim() === "");
    }
    
    // Filtro manual de descrição
    if (filterDescription === "com-descricao") {
      filtered = filtered.filter(p => p.description && p.description.trim() !== "");
    } else if (filterDescription === "sem-descricao") {
      filtered = filtered.filter(p => !p.description || p.description.trim() === "");
    }
    
    // Filtro de categoria
    if (filterCategory !== "todos") {
      filtered = filtered.filter(p => p.category === filterCategory);
    }
    
    return filtered;
  };
  
  // Handler para toggle de ordenação
  const handleSortToggle = (field) => {
    const newDirection = sortDirection[field] === "desc" ? "asc" : "desc";
    setSortDirection(prev => ({ ...prev, [field]: newDirection }));
    setSortBy(`${field}-${newDirection === "desc" ? "maior" : "menor"}`);
  };
  
  // Limpar todos os filtros
  const clearAllFilters = () => {
    setPerformanceFilter("todos");
    setFilterPhoto("todos");
    setFilterDescription("todos");
    setFilterCategory("todos");
  };

  // Auto-marcar insumo e divisível quando o tipo é "receita"
  // Também garantir que a aba ativa seja "ficha" (receitas não têm etapas)
  useEffect(() => {
    if (productType === "receita") {
      setIsInsumo(true);
      setIsDivisible(true);
      setActiveFormTab("ficha"); // Receitas não têm aba de etapas
      setSalePrice(""); // Limpar preço de venda
    }
  }, [productType]);

  useEffect(() => {
    fetchProducts();
    fetchIngredients();
    fetchCategories();
    fetchIngredientCategories();
    initializeCategories();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = () => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
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

  // Buscar categorias de ingredientes para o popup de cadastro rápido
  const fetchIngredientCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, getAuthHeader());
      setIngredientCategories(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias de ingredientes");
    }
  };

  // Handler para cadastro rápido de ingrediente
  const handleQuickIngredientCreate = (initialName, targetType, targetIndex) => {
    setQuickIngredientName(initialName);
    setQuickIngredientTarget({ type: targetType, index: targetIndex });
    setQuickIngredientOpen(true);
  };

  // Callback após criar ingrediente rápido - auto-preenche o campo
  const handleQuickIngredientSuccess = (newIngredient) => {
    // Adicionar o novo ingrediente à lista
    setIngredients(prev => [...prev, newIngredient]);
    
    // Auto-preencher o campo que estava sendo editado
    if (quickIngredientTarget) {
      const { type, index } = quickIngredientTarget;
      if (type === "ingredient") {
        setRecipeIngredients(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ingredient_id: newIngredient.id };
          return updated;
        });
      } else if (type === "packaging") {
        setRecipePackaging(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ingredient_id: newIngredient.id };
          return updated;
        });
      }
    }
    
    // Limpar o target
    setQuickIngredientTarget(null);
  };




  const initializeCategories = async () => {
    try {
      await axios.post(`${API}/categories/initialize`, {}, getAuthHeader());
      fetchCategories();
    } catch (error) {
      console.error("Erro ao inicializar categorias:", error);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editCategoryMode) {
        await axios.put(`${API}/categories/${currentCategoryId}`, { name: categoryName }, getAuthHeader());
        toast.success("Categoria atualizada!");
      } else {
        await axios.post(`${API}/categories`, { name: categoryName }, getAuthHeader());
        toast.success("Categoria criada!");
      }
      
      setCategoryName("");
      setCategoryDialogOpen(false);
      setEditCategoryMode(false);
      setCurrentCategoryId(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditCategoryMode(true);
    setCurrentCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await axios.delete(`${API}/categories/${categoryToDelete.id}`, getAuthHeader());
      toast.success("Categoria deletada!");
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao deletar categoria");
    }
  };

  const confirmDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };


  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, getAuthHeader());
      setCategories(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
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
    setProductCode("");
    setDescription("");
    setCategory("");
    setProductType("produto");
    setSalePrice("");
    setPhotoUrl("");
    setPhotoFile(null);
    setIsInsumo(false);
    setIsDivisible(false);
    setRecipeIngredients([{ ingredient_id: "", quantity: "" }]);
    setRecipePackaging([{ ingredient_id: "", quantity: "" }]);
    setOrderSteps([]);
    setEditMode(false);
    setCurrentProductId(null);
    setActiveFormTab("ficha");
    setRecipeYield("");
    setRecipeYieldUnit("kg");
    setLinkedIngredientId("");
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setCurrentProductId(product.id);
    setName(product.name);
    setProductCode(product.code || "");
    setDescription(product.description || "");
    setCategory(product.category || "");
    setProductType(product.product_type || "produto");
    setSalePrice(product.sale_price ? product.sale_price.toString() : "");
    setSimplePrice(product.simple_price ? product.simple_price.toString() : "");
    setComboDescription(product.combo_description || "");
    setSimpleDescription(product.simple_description || "");
    setSimplePhotoUrl(product.simple_photo_url || "");
    setComboPhotoUrl(product.combo_photo_url || "");
    setPhotoUrl(product.photo_url || "");
    setIsInsumo(product.is_insumo || false);
    setIsDivisible(product.is_divisible || false);
    setOrderSteps(product.order_steps || []);
    setRecipeYield(product.recipe_yield ? product.recipe_yield.toString() : "");
    setRecipeYieldUnit(product.recipe_yield_unit || "kg");
    setLinkedIngredientId(product.linked_ingredient_id || "");
    
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

  const handlePhotoUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${API}/upload/product-photo`,
        formData,
        {
          ...getAuthHeader(),
          headers: {
            ...getAuthHeader().headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.photo_url;
    } catch (error) {
      toast.error("Erro ao fazer upload da foto");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload da foto se houver
      let uploadedPhotoUrl = photoUrl;
      if (photoFile) {
        uploadedPhotoUrl = await handlePhotoUpload(photoFile);
        if (!uploadedPhotoUrl) {
          setLoading(false);
          return;
        }
      }

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
        category: category || null,
        product_type: productType || "produto",
        sale_price: salePrice ? parseFloat(salePrice) : null,
        simple_price: simplePrice ? parseFloat(simplePrice) : null,
        combo_description: comboDescription || null,
        simple_description: simpleDescription || null,
        simple_photo_url: simplePhotoUrl || null,
        combo_photo_url: comboPhotoUrl || null,
        photo_url: uploadedPhotoUrl || null,
        recipe: allRecipe,
        is_insumo: isInsumo,
        is_divisible: isDivisible,
        order_steps: orderSteps,
        recipe_yield: recipeYield ? parseFloat(recipeYield) : null,
        recipe_yield_unit: recipeYieldUnit || null,
        linked_ingredient_id: linkedIngredientId || null,
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
      fetchCategories();
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

  // Função para abrir o dialog de duplicação
  const openDuplicateDialog = (product) => {
    setProductToDuplicate(product);
    setDuplicateName(`${product.name} (Cópia)`);
    setDuplicateDialogOpen(true);
  };

  // Função para duplicar o produto
  const handleDuplicateProduct = async () => {
    if (!productToDuplicate || !duplicateName.trim()) {
      toast.error("Digite um nome para o novo produto");
      return;
    }

    // Verificar se já existe produto com mesmo nome na mesma categoria
    const existingProduct = products.find(
      p => p.name.toLowerCase() === duplicateName.trim().toLowerCase() && 
           p.category === productToDuplicate.category
    );

    if (existingProduct) {
      toast.error("Já existe um produto com este nome nesta categoria");
      return;
    }

    setDuplicatingProduct(true);

    try {
      const productData = {
        name: duplicateName.trim(),
        description: productToDuplicate.description || null,
        category: productToDuplicate.category || null,
        product_type: productToDuplicate.product_type || "produto",
        sale_price: productToDuplicate.sale_price || null,
        photo_url: null, // NÃO duplicar a foto
        recipe: productToDuplicate.recipe || [],
        is_insumo: productToDuplicate.is_insumo || false,
        is_divisible: productToDuplicate.is_divisible || false,
        order_steps: productToDuplicate.order_steps || [],
      };

      await axios.post(`${API}/products`, productData, getAuthHeader());
      toast.success(`Produto "${duplicateName}" criado com sucesso!`);
      setDuplicateDialogOpen(false);
      setProductToDuplicate(null);
      setDuplicateName("");
      fetchProducts();
    } catch (error) {
      console.error("Erro ao duplicar produto:", error);
      toast.error(error.response?.data?.detail || "Erro ao duplicar produto");
    } finally {
      setDuplicatingProduct(false);
    }
  };

  // Funções para gerenciar etapas de pedido
  const addOrderStep = () => {
    setOrderSteps([...orderSteps, {
      name: "",
      calculation_type: "soma",
      min_selections: 0,
      max_selections: 0,
      items: [],
      combo_only: false  // Se true, etapa só aparece para combo (ex: bebida)
    }]);
  };

  const updateOrderStep = (index, field, value) => {
    const newSteps = [...orderSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setOrderSteps(newSteps);
  };

  const removeOrderStep = (index) => {
    setOrderSteps(orderSteps.filter((_, i) => i !== index));
  };

  const addItemToStep = (stepIndex, productId) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newSteps = [...orderSteps];
    const items = newSteps[stepIndex].items || [];
    
    // Verificar se o produto já está na lista
    if (items.some(item => item.product_id === productId)) {
      toast.error("Este produto já está na etapa");
      return;
    }
    
    newSteps[stepIndex].items = [...items, {
      product_id: productId,
      product_name: product.name,
      price_override: product.sale_price || 0
    }];
    setOrderSteps(newSteps);
  };

  const updateStepItem = (stepIndex, itemIndex, field, value) => {
    const newSteps = [...orderSteps];
    newSteps[stepIndex].items[itemIndex] = { 
      ...newSteps[stepIndex].items[itemIndex], 
      [field]: value 
    };
    setOrderSteps(newSteps);
  };

  const removeStepItem = (stepIndex, itemIndex) => {
    const newSteps = [...orderSteps];
    newSteps[stepIndex].items = newSteps[stepIndex].items.filter((_, i) => i !== itemIndex);
    setOrderSteps(newSteps);
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

  // Função para calcular custos separados de ingredientes e embalagens
  const calculateRecipeCosts = (recipe) => {
    let ingredientsCost = 0;
    let packagingCost = 0;

    recipe.forEach(item => {
      const ingredient = getIngredientDetails(item.ingredient_id);
      let itemCost;

      if (ingredient.unit_weight && ingredient.unit_weight > 0) {
        itemCost = ingredient.average_price * item.quantity;
      } else {
        itemCost = ingredient.average_price * item.quantity;
      }

      if (item.item_type === "ingredient") {
        ingredientsCost += itemCost;
      } else if (item.item_type === "packaging") {
        packagingCost += itemCost;
      }
    });

    return { ingredientsCost, packagingCost };
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
    // Primeiro aplica o filtro de performance
    const filtered = getFilteredProducts();
    const sorted = [...filtered];
    
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
  
  // Produtos paginados
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, filterPhoto, filterDescription, filterCategory, performanceFilter]);

  return (
    <div className="p-8" data-testid="products-page">
      <div className="max-w-7xl mx-auto">
        {/* Título da Página */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Produtos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre produtos com suas fichas técnicas e calcule o CMV
          </p>
        </div>

        {/* Sub-abas - Container com posição relativa */}
        <div className="relative">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 relative">
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
            
            {/* Indicadores de Performance do Cardápio */}
            {products.length > 0 && (
              <div className="bg-card rounded-2xl border shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Indicador Principal - Cardápio Otimizado */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-2xl border">
                    <div className="relative">
                      <CircularProgress percent={cardapioStats.overallPercent} size={140} strokeWidth={10} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">{cardapioStats.overallPercent}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 text-center font-medium">do cardápio</p>
                    <p className="text-sm text-muted-foreground text-center">otimizado</p>
                  </div>
                  
                  {/* Indicador de Fotos */}
                  <div className="flex flex-col p-4 bg-muted/30 rounded-2xl border">
                    <p className="text-sm text-muted-foreground mb-2">Você tem:</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-background rounded-lg border">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-3xl font-bold">{cardapioStats.photoPercent}%</span>
                        <p className="text-sm text-muted-foreground">do cardápio com fotos</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      {cardapioStats.photoPercent < 100 ? (
                        <Button 
                          variant="outline" 
                          className="w-full rounded-xl"
                          onClick={() => {
                            setPerformanceFilter("todos");
                            setFilterPhoto("sem-foto");
                          }}
                        >
                          Adicione fotos agora
                        </Button>
                      ) : (
                        <div className="text-center text-sm text-green-600 font-medium py-2">
                          ✓ Todos os produtos têm foto!
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicador de Descrições */}
                  <div className="flex flex-col p-4 bg-muted/30 rounded-2xl border">
                    <p className="text-sm text-muted-foreground mb-2">Você tem:</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-background rounded-lg border">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-3xl font-bold">{cardapioStats.descriptionPercent}%</span>
                        <p className="text-sm text-muted-foreground">do cardápio com descrição</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      {cardapioStats.descriptionPercent < 100 ? (
                        <Button 
                          variant="outline" 
                          className="w-full rounded-xl"
                          onClick={() => {
                            setPerformanceFilter("todos");
                            setFilterDescription("sem-descricao");
                          }}
                        >
                          Adicione descrições agora
                        </Button>
                      ) : (
                        <div className="text-center text-sm text-green-600 font-medium py-2">
                          ✓ Todos os produtos têm descrição!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => exportToExcel(products, "produtos", {
                  code: "Código",
                  name: "Nome",
                  category: "Categoria",
                  sale_price: "Preço de Venda",
                  cmv: "Custo (CMV)",
                  profit_margin: "Margem %"
                })}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
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
                {/* Foto e Nome lado a lado */}
                <div className="flex gap-4">
                  {/* Foto do Produto */}
                  <div className="flex-shrink-0">
                    <Label>Foto do Produto</Label>
                    <div className="mt-1">
                      <div className="w-32 h-32 rounded-lg border-2 border-dashed overflow-hidden bg-muted flex items-center justify-center relative">
                        {(photoUrl || photoFile) ? (
                          <>
                            <img
                              src={photoFile ? URL.createObjectURL(photoFile) : `/api${photoUrl}`}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => {
                                setPhotoFile(null);
                                setPhotoUrl("");
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <label htmlFor="photo" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                            <ImageOff className="w-8 h-8 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground text-center px-2">Clique para adicionar</span>
                          </label>
                        )}
                      </div>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setPhotoFile(file);
                          }
                        }}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        1080x1080px
                      </p>
                    </div>
                  </div>

                  {/* Nome do Produto com Código */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="name">Nome do Produto</Label>
                        {editMode && productCode && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            CÓD: {productCode}
                          </span>
                        )}
                      </div>
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

                    {/* Preço de Venda - Oculto para RECEITA */}
                    {productType !== "receita" && (
                      <div>
                        <Label htmlFor="salePrice">
                          {productType === "combo" ? "Preço do COMBO (R$)" : "Preço de Venda (R$)"}
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
                    )}
                  </div>
                </div>

                {/* Categoria e Tipo lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={category || "sem-categoria"} 
                      onValueChange={(value) => setCategory(value === "sem-categoria" ? "" : value)}
                    >
                      <SelectTrigger id="category" className="h-11 mt-1">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem-categoria">Sem categoria</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gerencie categorias na aba "Categorias"
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="productType">Tipo</Label>
                    <Select 
                      value={productType} 
                      onValueChange={setProductType}
                    >
                      <SelectTrigger id="productType" className="h-11 mt-1">
                        <SelectValue placeholder="Selecione o Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="produto">Produto</SelectItem>
                        <SelectItem value="combo">Combo</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
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

                {/* Switches lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Switch Insumo */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <Label htmlFor="isInsumo" className="text-sm font-medium">
                        Este produto é um Insumo?
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Insumos não aparecem no catálogo de vendas
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isInsumo}
                      onClick={() => setIsInsumo(!isInsumo)}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0
                        ${isInsumo ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${isInsumo ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  {/* Switch Divisível */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <Label htmlFor="isDivisible" className="text-sm font-medium">
                        Este produto é Divisível?
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Produtos divisíveis podem ser vendidos fracionados
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDivisible}
                      onClick={() => setIsDivisible(!isDivisible)}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0
                        ${isDivisible ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${isDivisible ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>

                {/* Abas principais: Ficha Técnica e Personalização - Personalização oculta para RECEITA */}
                <div className="flex gap-2 border-b pb-2">
                  <Button
                    type="button"
                    variant={activeFormTab === "ficha" ? "default" : "outline"}
                    onClick={() => setActiveFormTab("ficha")}
                    className={productType === "receita" ? "w-full" : "flex-1"}
                  >
                    Ficha Técnica
                  </Button>
                  {productType !== "receita" && (
                    <Button
                      type="button"
                      variant={activeFormTab === "etapas" ? "default" : "outline"}
                      onClick={() => setActiveFormTab("etapas")}
                      className="flex-1"
                    >
                      ✨ Personalização
                    </Button>
                  )}
                </div>

                {/* Conteúdo da aba Ficha Técnica */}
                {activeFormTab === "ficha" && (
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
                            <IngredientCombobox
                              ingredients={ingredients}
                              value={item.ingredient_id}
                              onChange={(value) =>
                                updateRecipeItem(index, "ingredient_id", value, "ingredient")
                              }
                              placeholder="Buscar ingrediente..."
                              onCreateNew={(name) => handleQuickIngredientCreate(name, "ingredient", index)}
                              getIngredientUnit={getIngredientUnit}
                            />
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
                            <IngredientCombobox
                              ingredients={ingredients}
                              value={item.ingredient_id}
                              onChange={(value) =>
                                updateRecipeItem(index, "ingredient_id", value, "packaging")
                              }
                              placeholder="Buscar embalagem..."
                              onCreateNew={(name) => handleQuickIngredientCreate(name, "packaging", index)}
                              getIngredientUnit={getIngredientUnit}
                            />
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
                )}

                {/* Campo de Rendimento para Receitas */}
                {productType === "receita" && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-amber-600" />
                      <Label className="text-base font-medium text-amber-800 dark:text-amber-300">Configuração da Receita</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recipeYield">Rendimento</Label>
                        <Input
                          id="recipeYield"
                          type="number"
                          step="0.01"
                          value={recipeYield}
                          onChange={(e) => setRecipeYield(e.target.value)}
                          placeholder="Ex: 2"
                          className="mt-1 h-11"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Quantidade que a receita rende
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="recipeYieldUnit">Unidade do Rendimento</Label>
                        <Select value={recipeYieldUnit} onValueChange={setRecipeYieldUnit}>
                          <SelectTrigger className="mt-1 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Quilograma (kg)</SelectItem>
                            <SelectItem value="un">Unidade (un)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="linkedIngredient">Item de Estoque Vinculado</Label>
                      <Select value={linkedIngredientId || "none"} onValueChange={(val) => setLinkedIngredientId(val === "none" ? "" : val)}>
                        <SelectTrigger className="mt-1 h-11">
                          <SelectValue placeholder="Selecione o item no estoque" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        O custo unitário da receita será enviado para este item no estoque
                      </p>
                    </div>
                  </div>
                )}

                {/* Conteúdo da aba PERSONALIZAÇÃO - Cards + Etapas unificados */}
                {activeFormTab === "etapas" && (
                  <div className="space-y-6">
                    
                    {/* SEÇÃO 1: Configuração dos Cards (apenas para COMBO) */}
                    {productType === "combo" && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-5 h-5 text-purple-500" />
                            <h3 className="font-semibold text-purple-700 dark:text-purple-300">Cards de Seleção</h3>
                          </div>
                          <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                            Configure como os cards SIMPLES e COMBO aparecerão para o cliente escolher.
                          </p>
                        </div>
                        
                        {/* Preview dos Cards lado a lado */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Card SIMPLES */}
                          <div className="rounded-xl border-2 border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800">
                            <div className="bg-gray-100 dark:bg-zinc-700 px-3 py-2">
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">🍔 SIMPLES</span>
                            </div>
                            <div className="p-3 space-y-3">
                              {/* Upload Foto */}
                              <label className="cursor-pointer block">
                                <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-zinc-700">
                                  {simplePhotoUrl ? (
                                    <img src={simplePhotoUrl} alt="Simples" className="w-full h-full object-cover" />
                                  ) : photoUrl ? (
                                    <img src={photoUrl} alt="Simples" className="w-full h-full object-contain p-4" />
                                  ) : (
                                    <div className="text-center">
                                      <Camera className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                                      <span className="text-xs text-gray-400">Foto Simples</span>
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (e) => setSimplePhotoUrl(e.target?.result);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {simplePhotoUrl && (
                                <button 
                                  type="button"
                                  onClick={() => setSimplePhotoUrl("")}
                                  className="text-xs text-red-500 hover:underline w-full text-center"
                                >
                                  Remover foto
                                </button>
                              )}
                              {/* Preço */}
                              <div>
                                <Label className="text-xs">Preço (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={simplePrice}
                                  onChange={(e) => setSimplePrice(e.target.value)}
                                  placeholder="25.90"
                                  className="mt-1 h-10 text-lg font-bold text-center"
                                />
                              </div>
                              {/* Descrição */}
                              <div>
                                <Label className="text-xs">Descrição</Label>
                                <Input
                                  type="text"
                                  value={simpleDescription}
                                  onChange={(e) => setSimpleDescription(e.target.value)}
                                  placeholder="Apenas o sanduíche"
                                  className="mt-1 h-9 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Card COMBO */}
                          <div className="rounded-xl border-2 border-green-300 dark:border-green-700 overflow-hidden bg-white dark:bg-zinc-800 relative">
                            <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-[10px] font-bold py-1 text-center">
                              ⭐ RECOMENDADO
                            </div>
                            <div className="bg-green-100 dark:bg-green-900/30 px-3 py-2 mt-6">
                              <span className="text-xs font-bold text-green-700 dark:text-green-300">🍟 COMBO</span>
                            </div>
                            <div className="p-3 space-y-3">
                              {/* Upload Foto */}
                              <label className="cursor-pointer block">
                                <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors overflow-hidden flex items-center justify-center bg-green-50 dark:bg-zinc-700">
                                  {comboPhotoUrl ? (
                                    <img src={comboPhotoUrl} alt="Combo" className="w-full h-full object-cover" />
                                  ) : photoUrl ? (
                                    <img src={photoUrl} alt="Combo" className="w-full h-full object-contain p-4" />
                                  ) : (
                                    <div className="text-center">
                                      <Camera className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                                      <span className="text-xs text-gray-400">Foto Combo</span>
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (e) => setComboPhotoUrl(e.target?.result);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {comboPhotoUrl && (
                                <button 
                                  type="button"
                                  onClick={() => setComboPhotoUrl("")}
                                  className="text-xs text-red-500 hover:underline w-full text-center"
                                >
                                  Remover foto
                                </button>
                              )}
                              {/* Preço */}
                              <div>
                                <Label className="text-xs">Preço (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={salePrice}
                                  onChange={(e) => setSalePrice(e.target.value)}
                                  placeholder="35.90"
                                  className="mt-1 h-10 text-lg font-bold text-center text-green-600"
                                />
                              </div>
                              {/* Descrição */}
                              <div>
                                <Label className="text-xs">Descrição</Label>
                                <Input
                                  type="text"
                                  value={comboDescription}
                                  onChange={(e) => setComboDescription(e.target.value)}
                                  placeholder="+ Batata + Refrigerante"
                                  className="mt-1 h-9 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* SEÇÃO 2: Etapas do Pedido */}
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-orange-500" />
                            <h3 className="font-semibold text-orange-700 dark:text-orange-300">Etapas do Pedido</h3>
                          </div>
                          <Button
                            type="button"
                            onClick={addOrderStep}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Nova Etapa
                          </Button>
                        </div>
                        <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                          {productType === "combo" 
                            ? "Configure as etapas que o cliente seguirá ao montar o pedido. Use 'Só Combo' para etapas exclusivas do combo (ex: Bebida)."
                            : "Configure as etapas que o cliente seguirá ao montar o pedido. Ex: Adicionais, Acompanhamentos."
                          }
                        </p>
                      </div>

                      {orderSteps.length === 0 ? (
                        <div className="bg-muted/30 rounded-xl p-12 text-center border-2 border-dashed border-muted-foreground/20">
                          <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground font-medium">Nenhuma etapa configurada</p>
                          <p className="text-xs text-muted-foreground mt-1 mb-4">
                            Adicione etapas para personalizar o pedido do cliente
                          </p>
                          <Button
                            type="button"
                            onClick={addOrderStep}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeira Etapa
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orderSteps.map((step, stepIndex) => (
                            <div 
                              key={stepIndex} 
                              className={`rounded-xl border-2 overflow-hidden transition-all ${
                                step.combo_only 
                                  ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10' 
                                  : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'
                              }`}
                            >
                              {/* Header da Etapa */}
                              <div className={`px-4 py-3 flex items-center justify-between ${
                                step.combo_only 
                                  ? 'bg-purple-100 dark:bg-purple-900/30' 
                                  : 'bg-gray-50 dark:bg-zinc-800'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                    step.combo_only ? 'bg-purple-500' : 'bg-orange-500'
                                  }`}>
                                    {stepIndex + 1}
                                  </div>
                                  <div>
                                    <Input
                                      value={step.name}
                                      onChange={(e) => updateOrderStep(stepIndex, "name", e.target.value)}
                                      placeholder="Nome da Etapa"
                                      className="h-8 font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 text-base"
                                    />
                                    {step.combo_only && (
                                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                        Somente COMBO
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {productType === "combo" && (
                                    <button
                                      type="button"
                                      onClick={() => updateOrderStep(stepIndex, "combo_only", !step.combo_only)}
                                      className={`text-xs px-2 py-1 rounded-full transition-colors ${
                                        step.combo_only 
                                          ? 'bg-purple-500 text-white' 
                                          : 'bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-purple-100 hover:text-purple-600'
                                      }`}
                                    >
                                      {step.combo_only ? '🍟 Só Combo' : '📦 Todos'}
                                    </button>
                                  )}
                                  <Button
                                    type="button"
                                    onClick={() => removeOrderStep(stepIndex)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Configurações da Etapa */}
                              <div className="p-4 space-y-4">
                                {/* Linha de configurações compacta */}
                                <div className="flex flex-wrap gap-3 items-center">
                                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-700 rounded-lg px-3 py-2">
                                    <span className="text-xs text-muted-foreground">Mín:</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={step.min_selections || 0}
                                      onChange={(e) => updateOrderStep(stepIndex, "min_selections", parseInt(e.target.value) || 0)}
                                      className="h-7 w-14 text-center border-0 bg-white dark:bg-zinc-600"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-700 rounded-lg px-3 py-2">
                                    <span className="text-xs text-muted-foreground">Máx:</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={step.max_selections || 0}
                                      onChange={(e) => updateOrderStep(stepIndex, "max_selections", parseInt(e.target.value) || 0)}
                                      className="h-7 w-14 text-center border-0 bg-white dark:bg-zinc-600"
                                    />
                                  </div>
                                  <Select
                                    value={step.calculation_type || "soma"}
                                    onValueChange={(value) => updateOrderStep(stepIndex, "calculation_type", value)}
                                  >
                                    <SelectTrigger className="h-9 w-32 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="soma">➕ Soma</SelectItem>
                                      <SelectItem value="subtracao">➖ Subtração</SelectItem>
                                      <SelectItem value="maximo">⬆️ Máximo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <span className="text-[10px] text-muted-foreground">
                                    {step.min_selections === 0 && step.max_selections === 0 
                                      ? "Sem limite de seleção" 
                                      : step.min_selections === step.max_selections && step.min_selections > 0
                                        ? `Deve selecionar exatamente ${step.min_selections}`
                                        : `Selecionar de ${step.min_selections || 0} a ${step.max_selections || '∞'}`
                                    }
                                  </span>
                                </div>

                                {/* Busca de Produtos - MELHORADA */}
                                <div className="relative">
                                  <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                                    <Search className="w-4 h-4 text-green-600" />
                                    <Input
                                      value={stepProductSearch[stepIndex] || ""}
                                      onChange={(e) => {
                                        setStepProductSearch({...stepProductSearch, [stepIndex]: e.target.value});
                                        setStepSearchOpen({...stepSearchOpen, [stepIndex]: true});
                                      }}
                                      onFocus={() => setStepSearchOpen({...stepSearchOpen, [stepIndex]: true})}
                                      placeholder="🔍 Buscar produto para adicionar..."
                                      className="h-8 border-0 bg-transparent focus-visible:ring-0 text-sm"
                                    />
                                    {stepProductSearch[stepIndex] && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStepProductSearch({...stepProductSearch, [stepIndex]: ""});
                                          setStepSearchOpen({...stepSearchOpen, [stepIndex]: false});
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Dropdown de Resultados da Busca */}
                                  {stepSearchOpen[stepIndex] && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 rounded-xl border shadow-xl max-h-64 overflow-y-auto">
                                      {products
                                        .filter(p => {
                                          if (p.id === currentProductId) return false;
                                          if ((step.items || []).some(item => item.product_id === p.id)) return false;
                                          const searchTerm = (stepProductSearch[stepIndex] || "").toLowerCase();
                                          if (!searchTerm) return true;
                                          return p.name.toLowerCase().includes(searchTerm) || 
                                                 (p.code && p.code.includes(searchTerm));
                                        })
                                        .slice(0, 10)
                                        .map((prod) => (
                                          <button
                                            key={prod.id}
                                            type="button"
                                            onClick={() => {
                                              addItemToStep(stepIndex, prod.id);
                                              setStepProductSearch({...stepProductSearch, [stepIndex]: ""});
                                              setStepSearchOpen({...stepSearchOpen, [stepIndex]: false});
                                            }}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                                          >
                                            {/* Foto do Produto */}
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                                              {prod.photo_url ? (
                                                <img 
                                                  src={prod.photo_url.startsWith('http') ? prod.photo_url : `${API}${prod.photo_url}`}
                                                  alt={prod.name}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl">
                                                  🍽️
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm truncate">{prod.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {prod.code && `#${prod.code} • `}
                                                {prod.sale_price ? `R$ ${prod.sale_price.toFixed(2)}` : 'Sem preço'}
                                              </p>
                                            </div>
                                            <Plus className="w-5 h-5 text-green-500 flex-shrink-0" />
                                          </button>
                                        ))
                                      }
                                      {products.filter(p => {
                                        if (p.id === currentProductId) return false;
                                        if ((step.items || []).some(item => item.product_id === p.id)) return false;
                                        const searchTerm = (stepProductSearch[stepIndex] || "").toLowerCase();
                                        if (!searchTerm) return true;
                                        return p.name.toLowerCase().includes(searchTerm);
                                      }).length === 0 && (
                                        <div className="p-4 text-center text-muted-foreground text-sm">
                                          Nenhum produto encontrado
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Lista de Produtos Adicionados - COM FOTOS */}
                                {(step.items || []).length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {step.items.length} {step.items.length === 1 ? 'produto' : 'produtos'} na etapa
                                      </span>
                                    </div>
                                    <div className="grid gap-2">
                                      {(step.items || []).map((item, itemIndex) => {
                                        const itemProduct = products.find(p => p.id === item.product_id);
                                        return (
                                          <div 
                                            key={itemIndex} 
                                            className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-zinc-800 border hover:border-orange-300 transition-colors group"
                                          >
                                            {/* Foto do Produto */}
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                                              {itemProduct?.photo_url ? (
                                                <img 
                                                  src={itemProduct.photo_url.startsWith('http') ? itemProduct.photo_url : `${API}${itemProduct.photo_url}`}
                                                  alt={item.product_name}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                                  🍽️
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Info do Produto */}
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm truncate">{item.product_name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {itemProduct?.code && `#${itemProduct.code}`}
                                              </p>
                                            </div>
                                            
                                            {/* Preço Override */}
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-muted-foreground">R$</span>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={item.price_override || ""}
                                                onChange={(e) => updateStepItem(stepIndex, itemIndex, "price_override", parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                className="h-8 w-20 text-center text-sm font-semibold"
                                              />
                                            </div>
                                            
                                            {/* Botão Remover */}
                                            <Button
                                              type="button"
                                              onClick={() => removeStepItem(stepIndex, itemIndex)}
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-muted-foreground">
                                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Nenhum produto adicionado</p>
                                    <p className="text-xs">Use a busca acima para adicionar produtos</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

        {/* Filtros de Ordenação e Filtros Manuais */}
        {products.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Ordenar por - Todos os botões com toggle */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Ordenar:</Label>
                
                {/* Botões de ordenação com toggle */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={sortBy.startsWith("alfabetica") ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => {
                      if (sortBy === "alfabetica-az") {
                        setSortBy("alfabetica-za");
                      } else {
                        setSortBy("alfabetica-az");
                      }
                    }}
                  >
                    Nome {sortBy.startsWith("alfabetica") && (sortBy === "alfabetica-az" ? "A→Z" : "Z→A")}
                  </Button>
                  <Button
                    variant={sortBy.startsWith("cmv") ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => handleSortToggle("cmv")}
                  >
                    CMV {sortBy.startsWith("cmv") && (sortDirection.cmv === "desc" ? "↓" : "↑")}
                  </Button>
                  <Button
                    variant={sortBy.startsWith("margem") ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => handleSortToggle("margem")}
                  >
                    Margem {sortBy.startsWith("margem") && (sortDirection.margem === "desc" ? "↓" : "↑")}
                  </Button>
                  <Button
                    variant={sortBy.startsWith("preco") ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => handleSortToggle("preco")}
                  >
                    Preço {sortBy.startsWith("preco") && (sortDirection.preco === "desc" ? "↓" : "↑")}
                  </Button>
                </div>
              </div>
              
              {/* Separador visual */}
              <div className="h-8 w-px bg-border" />
              
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Filtrar:</Label>
                
                {/* Filtro de Fotos */}
                <Select value={filterPhoto} onValueChange={setFilterPhoto}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Fotos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Fotos</SelectItem>
                    <SelectItem value="com-foto">Com Foto</SelectItem>
                    <SelectItem value="sem-foto">Sem Foto</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Filtro de Descrição */}
                <Select value={filterDescription} onValueChange={setFilterDescription}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Descrição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Descrições</SelectItem>
                    <SelectItem value="com-descricao">Com Descrição</SelectItem>
                    <SelectItem value="sem-descricao">Sem Descrição</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Filtro de Categoria */}
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Botão limpar filtros */}
              {(filterPhoto !== "todos" || filterDescription !== "todos" || filterCategory !== "todos" || performanceFilter !== "todos") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground hover:text-foreground"
                  onClick={clearAllFilters}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
            
            {/* Badge mostrando filtros ativos */}
            {(filterPhoto !== "todos" || filterDescription !== "todos" || filterCategory !== "todos" || performanceFilter !== "todos") && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Mostrando:</span>
                <span className="font-medium text-primary">
                  {sortedProducts.length} de {products.length} produto{products.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
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
            <>
            {paginatedProducts.map((product) => {
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
                    {/* Foto do produto ou placeholder - sem fundo para suportar PNGs transparentes */}
                    <div className="w-16 h-16 rounded-lg border overflow-hidden mr-4 flex-shrink-0 flex items-center justify-center">
                      <ProductThumbnail photoUrl={product.photo_url} name={product.name} />
                    </div>
                    
                    <div className="flex-1 flex items-center gap-6">
                      {/* Nome e código do produto */}
                      <div className="w-[220px] flex-shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {product.code && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              #{product.code}
                            </span>
                          )}
                          {product.category && (
                            <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              {product.category}
                            </span>
                          )}
                          {product.is_insumo && (
                            <span className="text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              Insumo
                            </span>
                          )}
                          {product.product_type === "receita" && (
                            <span className="text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <ChefHat className="w-3 h-3" />
                              Receita
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Card de Preço, Custo e Lucro - Simétrico (oculto para receitas) */}
                      {product.product_type === "receita" ? (
                        /* Card simplificado para receitas - apenas Custo de Produção e Custo Unitário */
                        <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 px-6 py-3 flex items-center justify-between">
                          <div className="text-center flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Custo Total da Receita</div>
                            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                              R${product.cmv.toFixed(2)}
                            </div>
                          </div>
                          {product.recipe_yield && product.recipe_yield > 0 && (
                            <>
                              <div className="w-px h-10 bg-purple-200 dark:bg-purple-700 mx-4"></div>
                              <div className="text-center flex-1">
                                <div className="text-xs text-muted-foreground mb-1">Rendimento</div>
                                <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                                  {product.recipe_yield} {product.recipe_yield_unit || 'kg'}
                                </div>
                              </div>
                              <div className="w-px h-10 bg-purple-200 dark:bg-purple-700 mx-4"></div>
                              <div className="text-center flex-1">
                                <div className="text-xs text-muted-foreground mb-1">Custo por {product.recipe_yield_unit || 'kg'}</div>
                                <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                                  R${(product.cmv / product.recipe_yield).toFixed(2)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        /* Card normal para produtos e combos */
                        <div className="flex-1 bg-muted/40 rounded-2xl border border-border/50 px-6 py-3 flex items-center justify-between">
                          <div className="text-center flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Preço de Venda</div>
                            <div className="text-2xl font-bold font-mono">
                              R${product.sale_price ? product.sale_price.toFixed(2) : "0,00"}
                            </div>
                          </div>
                          <div className="w-px h-10 bg-border mx-4"></div>
                          <div className="text-center flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Custo de Produção</div>
                            <div className="text-2xl font-bold font-mono text-red-500">
                              R${product.cmv.toFixed(2)}
                            </div>
                          </div>
                          <div className="w-px h-10 bg-border mx-4"></div>
                          <div className="text-center flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Lucro</div>
                            <div className="text-2xl font-bold font-mono text-green-500">
                              R${product.sale_price ? (product.sale_price - product.cmv).toFixed(2) : "0,00"}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card de CMV% - Oculto para receitas */}
                      {product.product_type !== "receita" && (
                        <div className="bg-muted/40 rounded-2xl border border-border/50 px-5 py-3 text-center w-[130px] flex-shrink-0">
                          <div className="text-xs text-muted-foreground mb-1">C.M.V.</div>
                          <div className="text-2xl font-bold font-mono text-orange-500">
                            {product.sale_price && product.sale_price > 0 
                              ? `${((product.cmv / product.sale_price) * 100).toFixed(2)}%`
                              : "-"}
                          </div>
                        </div>
                      )}

                      {/* Card de Margem Contribuição% - Oculto para receitas */}
                      {product.product_type !== "receita" && (
                        <div className="bg-muted/40 rounded-2xl border border-border/50 px-5 py-3 text-center w-[130px] flex-shrink-0">
                          <div className="text-xs text-muted-foreground mb-1">Margem Contr.</div>
                          <div className="text-2xl font-bold font-mono text-orange-500">
                            {product.sale_price && product.sale_price > 0 
                              ? `${(((product.sale_price - product.cmv) / product.sale_price) * 100).toFixed(2)}%`
                              : "-"}
                          </div>
                        </div>
                      )}

                      {/* Seta expandir */}
                      <div className="flex-shrink-0 w-8 flex justify-center">
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
                            {product.recipe.filter(item => item.item_type === "ingredient").map((item, idx) => {
                              const ingredient = getIngredientDetails(item.ingredient_id);
                              const displayUnit = getIngredientUnit(ingredient);
                              
                              // Calcular custo baseado no tipo de ingrediente
                              let itemCost;
                              let displayQuantity = item.quantity;
                              let showUnitInfo = false;
                              
                              if (ingredient.unit_weight && ingredient.unit_weight > 0) {
                                // Para ingredientes com peso por unidade (hambúrguer)
                                // item.quantity está em kg, converter para unidades
                                displayQuantity = item.quantity / ingredient.unit_weight;
                                itemCost = ingredient.average_price * item.quantity;
                                showUnitInfo = true;
                              } else {
                                itemCost = ingredient.average_price * item.quantity;
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {ingredient.name}
                                    </div>
                                    {showUnitInfo && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        1 un = {(ingredient.unit_weight * 1000).toFixed(0)}g
                                      </div>
                                    )}
                                  </div>
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
                            {product.recipe.filter(item => item.item_type === "ingredient").length === 0 && (
                              <p className="text-sm text-muted-foreground">Nenhum ingrediente</p>
                            )}
                          </div>
                        </div>

                        {/* Embalagens */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Embalagens
                          </h4>
                          <div className="space-y-2">
                            {product.recipe.filter(item => item.item_type === "packaging").map((item, idx) => {
                              const ingredient = getIngredientDetails(item.ingredient_id);
                              const displayUnit = getIngredientUnit(ingredient);
                              
                              let itemCost;
                              let displayQuantity = item.quantity;
                              let showUnitInfo = false;
                              
                              if (ingredient.unit_weight && ingredient.unit_weight > 0) {
                                displayQuantity = item.quantity / ingredient.unit_weight;
                                itemCost = ingredient.average_price * item.quantity;
                                showUnitInfo = true;
                              } else {
                                itemCost = ingredient.average_price * item.quantity;
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {ingredient.name}
                                    </div>
                                    {showUnitInfo && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        1 un = {(ingredient.unit_weight * 1000).toFixed(0)}g
                                      </div>
                                    )}
                                  </div>
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
                            {product.recipe.filter(item => item.item_type === "packaging").length === 0 && (
                              <p className="text-sm text-muted-foreground">Nenhuma embalagem</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resumo de custos */}
                      {(() => {
                        const { ingredientsCost, packagingCost } = calculateRecipeCosts(product.recipe);
                        return (
                          <div className="mt-4 pt-4 border-t flex items-center justify-center gap-6">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">INGREDIENTES</span>
                              <span className="font-mono font-bold text-primary">R$ {ingredientsCost.toFixed(2)}</span>
                            </div>
                            <span className="text-muted-foreground">|</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">EMBALAGENS</span>
                              <span className="font-mono font-bold text-primary">R$ {packagingCost.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}

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
                          data-testid={`duplicate-product-${product.id}`}
                          onClick={() => openDuplicateDialog(product)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Copy className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Duplicar
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
            })}
            
            {/* Paginação */}
            {sortedProducts.length > 0 && (
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <TablePagination
                  currentPage={currentPage}
                  totalItems={sortedProducts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
            </>
          )}
        </div>

        {/* AlertDialog de confirmação de exclusão de produto */}
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

        {/* Dialog de Duplicar Produto */}
        <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplicar Produto</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Você está duplicando o produto <strong>{productToDuplicate?.name}</strong>.
                </p>
                <p className="text-sm">
                  O novo produto terá a mesma ficha técnica, categoria, preço e configurações.
                </p>
                <div className="pt-2">
                  <Label htmlFor="duplicateName" className="text-foreground">Nome do novo produto</Label>
                  <Input
                    id="duplicateName"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    placeholder="Digite o nome do novo produto"
                    className="mt-2"
                    autoFocus
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={duplicatingProduct}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDuplicateProduct}
                disabled={duplicatingProduct || !duplicateName.trim()}
                className="bg-primary"
              >
                {duplicatingProduct ? "Duplicando..." : "Duplicar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </TabsContent>

          {/* Aba de Categorias */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={categoryDialogOpen} onOpenChange={(isOpen) => {
                setCategoryDialogOpen(isOpen);
                if (!isOpen) {
                  setCategoryName("");
                  setEditCategoryMode(false);
                  setCurrentCategoryId(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="shadow-sm">
                    <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editCategoryMode ? "Editar Categoria" : "Nova Categoria"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="category-name">Nome da Categoria</Label>
                      <Input
                        id="category-name"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Ex: Sanduíches, Bebidas..."
                        required
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (editCategoryMode ? "Atualizando..." : "Criando...") : (editCategoryMode ? "Atualizar" : "Criar")}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="font-medium text-lg">{category.name}</div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditCategory(category)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-muted"
                        >
                          <Edit className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                          onClick={() => confirmDeleteCategory(category)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AlertDialog de confirmação de exclusão de categoria */}
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
                    onClick={handleDeleteCategory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Popup de Cadastro Rápido de Ingrediente */}
      <QuickIngredientDialog
        open={quickIngredientOpen}
        onOpenChange={setQuickIngredientOpen}
        initialName={quickIngredientName}
        onSuccess={handleQuickIngredientSuccess}
        categories={ingredientCategories}
      />
    </div>
  );
}
