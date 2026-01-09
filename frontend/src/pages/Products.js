import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, ImageOff, Copy, Download, Camera, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { exportToExcel } from "../lib/utils";
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

// Componente de imagem do produto com gerenciamento de erro via estado React
function ProductThumbnail({ photoUrl, name }) {
  const [imageError, setImageError] = useState(false);

  if (!photoUrl || imageError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <ImageOff className="w-6 h-6 text-muted-foreground mb-1" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground">{imageError ? "Erro" : "Sem foto"}</span>
      </div>
    );
  }

  return (
    <img
      src={`${BACKEND_URL}/api${photoUrl}`}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
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

  // Filtrar produtos baseado no filtro de performance
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    if (performanceFilter === "sem-foto") {
      filtered = filtered.filter(p => !p.photo_url || p.photo_url.trim() === "");
    } else if (performanceFilter === "sem-descricao") {
      filtered = filtered.filter(p => !p.description || p.description.trim() === "");
    }
    
    return filtered;
  };

  useEffect(() => {
    fetchProducts();
    fetchIngredients();
    fetchCategories();
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
    setPhotoUrl(product.photo_url || "");
    setIsInsumo(product.is_insumo || false);
    setIsDivisible(product.is_divisible || false);
    setOrderSteps(product.order_steps || []);
    
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
        photo_url: uploadedPhotoUrl || null,
        recipe: allRecipe,
        is_insumo: isInsumo,
        is_divisible: isDivisible,
        order_steps: orderSteps,
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
        photo_url: productToDuplicate.photo_url || null,
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
      items: []
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

  // Componente do indicador circular de progresso
  const CircularProgress = ({ percent, size = 140, strokeWidth = 8 }) => {
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
  };

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
                          onClick={() => setPerformanceFilter("sem-foto")}
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
                          onClick={() => setPerformanceFilter("sem-descricao")}
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
                
                {/* Badge de filtro ativo */}
                {performanceFilter !== "todos" && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                      <span>
                        {performanceFilter === "sem-foto" 
                          ? `Mostrando ${sortedProducts.length} produto${sortedProducts.length !== 1 ? 's' : ''} sem foto`
                          : `Mostrando ${sortedProducts.length} produto${sortedProducts.length !== 1 ? 's' : ''} sem descrição`
                        }
                      </span>
                      <button 
                        onClick={() => setPerformanceFilter("todos")}
                        className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                      >
                        <span className="sr-only">Remover filtro</span>
                        ✕
                      </button>
                    </div>
                  </div>
                )}
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
                              src={photoFile ? URL.createObjectURL(photoFile) : `${BACKEND_URL}/api${photoUrl}`}
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

                    {/* Preço de Venda */}
                    <div>
                      <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
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

                {/* Abas principais: Ficha Técnica e Etapas */}
                <div className="flex gap-2 border-b pb-2">
                  <Button
                    type="button"
                    variant={activeFormTab === "ficha" ? "default" : "outline"}
                    onClick={() => setActiveFormTab("ficha")}
                    className="flex-1"
                  >
                    Ficha Técnica
                  </Button>
                  <Button
                    type="button"
                    variant={activeFormTab === "etapas" ? "default" : "outline"}
                    onClick={() => setActiveFormTab("etapas")}
                    className="flex-1"
                  >
                    Etapas (para o cliente pedir)
                  </Button>
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
                )}

                {/* Conteúdo da aba Etapas */}
                {activeFormTab === "etapas" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Etapas do Pedido</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure as etapas que o cliente deve seguir ao pedir este produto (adicionais, combos, etc.)
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={addOrderStep}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Etapa
                      </Button>
                    </div>

                    {orderSteps.length === 0 ? (
                      <div className="bg-muted/50 rounded-lg p-8 text-center border border-dashed">
                        <p className="text-muted-foreground">Nenhuma etapa configurada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Clique em "Nova Etapa" para adicionar etapas de pedido
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orderSteps.map((step, stepIndex) => (
                          <div key={stepIndex} className="bg-muted/30 rounded-lg p-4 border space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-4">
                                {/* Linha 1: Nome da Etapa e Tipo */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Nome da Etapa</Label>
                                    <Input
                                      value={step.name}
                                      onChange={(e) => updateOrderStep(stepIndex, "name", e.target.value)}
                                      placeholder="Ex: Adicionais, Acompanhamentos"
                                      className="h-9 mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Tipo de Cálculo</Label>
                                    <Select
                                      value={step.calculation_type || "soma"}
                                      onValueChange={(value) => updateOrderStep(stepIndex, "calculation_type", value)}
                                    >
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="soma">Soma</SelectItem>
                                        <SelectItem value="subtracao">Subtração</SelectItem>
                                        <SelectItem value="minimo">Mínimo</SelectItem>
                                        <SelectItem value="medio">Médio</SelectItem>
                                        <SelectItem value="maximo">Máximo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Linha 2: Qtd Mínima e Máxima */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Quantidade Mínima</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={step.min_selections || 0}
                                      onChange={(e) => updateOrderStep(stepIndex, "min_selections", parseInt(e.target.value) || 0)}
                                      placeholder="0 = sem limite"
                                      className="h-9 mt-1"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-0.5">0 = sem limitador</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Quantidade Máxima</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={step.max_selections || 0}
                                      onChange={(e) => updateOrderStep(stepIndex, "max_selections", parseInt(e.target.value) || 0)}
                                      placeholder="0 = sem limite"
                                      className="h-9 mt-1"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-0.5">0 = sem limitador</p>
                                  </div>
                                </div>

                                {/* Linha 3: Produtos da Etapa */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Produtos da Etapa</Label>
                                  </div>
                                  
                                  {/* Selector para adicionar produto */}
                                  <div className="flex gap-2">
                                    <Select
                                      onValueChange={(value) => addItemToStep(stepIndex, value)}
                                    >
                                      <SelectTrigger className="h-9 flex-1">
                                        <SelectValue placeholder="Selecione um produto para adicionar" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {products
                                          .filter(p => p.id !== currentProductId) // Não incluir o próprio produto
                                          .map((prod) => (
                                            <SelectItem key={prod.id} value={prod.id}>
                                              {prod.code && `#${prod.code} - `}{prod.name} {prod.sale_price ? `(R$ ${prod.sale_price.toFixed(2)})` : ''}
                                            </SelectItem>
                                          ))
                                        }
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Lista de produtos adicionados */}
                                  {(step.items || []).length > 0 ? (
                                    <div className="space-y-2 mt-2">
                                      {(step.items || []).map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex gap-2 items-center bg-background p-2 rounded-lg border">
                                          <div className="flex-1">
                                            <span className="text-sm font-medium">{item.product_name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground">Preço:</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={item.price_override || ""}
                                              onChange={(e) => updateStepItem(stepIndex, itemIndex, "price_override", parseFloat(e.target.value) || 0)}
                                              placeholder="R$"
                                              className="h-8 w-24"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            onClick={() => removeStepItem(stepIndex, itemIndex)}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                      Nenhum produto adicionado. Selecione produtos acima.
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Botão excluir etapa */}
                              <Button
                                type="button"
                                onClick={() => removeOrderStep(stepIndex)}
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                    {/* Foto do produto ou placeholder */}
                    <div className="w-16 h-16 rounded-lg border overflow-hidden bg-muted mr-4 flex-shrink-0 flex items-center justify-center">
                      <ProductThumbnail photoUrl={product.photo_url} name={product.name} />
                    </div>
                    
                    <div className="flex-1 flex items-center gap-6">
                      {/* Nome e código do produto */}
                      <div className="w-[200px] flex-shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">{product.name}</span>
                          {product.code && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              #{product.code}
                            </span>
                          )}
                        </div>
                        {product.is_insumo && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mt-1">
                            Insumo
                          </span>
                        )}
                      </div>
                      
                      {/* Card de Preço, Custo e Lucro - Simétrico */}
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

                      {/* Card de CMV% - Tamanho igual ao de Margem */}
                      <div className="bg-muted/40 rounded-2xl border border-border/50 px-5 py-3 text-center w-[130px] flex-shrink-0">
                        <div className="text-xs text-muted-foreground mb-1">C.M.V.</div>
                        <div className="text-2xl font-bold font-mono text-orange-500">
                          {product.sale_price && product.sale_price > 0 
                            ? `${((product.cmv / product.sale_price) * 100).toFixed(2)}%`
                            : "-"}
                        </div>
                      </div>

                      {/* Card de Margem Contribuição% - Tamanho igual ao de CMV */}
                      <div className="bg-muted/40 rounded-2xl border border-border/50 px-5 py-3 text-center w-[130px] flex-shrink-0">
                        <div className="text-xs text-muted-foreground mb-1">Margem Contr.</div>
                        <div className="text-2xl font-bold font-mono text-orange-500">
                          {product.sale_price && product.sale_price > 0 
                            ? `${(((product.sale_price - product.cmv) / product.sale_price) * 100).toFixed(2)}%`
                            : "-"}
                        </div>
                      </div>

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
            })
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
    </div>
  );
}
