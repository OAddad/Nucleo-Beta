import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Trash2, Edit, Check, X, Search, Download, Filter, 
  Calendar, DollarSign, Building2, Truck, ChevronDown, ChevronRight,
  FileText, Paperclip, RefreshCw, CreditCard, AlertCircle, CheckCircle2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { exportToExcel } from "../lib/utils";
import TablePagination from "../components/TablePagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";

const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Despesas() {
  // State para classificações
  const [classifications, setClassifications] = useState([]);
  const [classificationDialogOpen, setClassificationDialogOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState(null);
  const [classificationName, setClassificationName] = useState("");
  const [classificationToDelete, setClassificationToDelete] = useState(null);
  const [deleteClassificationDialogOpen, setDeleteClassificationDialogOpen] = useState(false);
  
  // State para despesas
  const [expenses, setExpenses] = useState([]);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleteExpenseDialogOpen, setDeleteExpenseDialogOpen] = useState(false);
  const [deleteRecurringDialogOpen, setDeleteRecurringDialogOpen] = useState(false); // Novo dialog para despesas recorrentes
  
  // State para fornecedores (do localStorage)
  const [fornecedores, setFornecedores] = useState([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  
  // State para estatísticas
  const [stats, setStats] = useState({ total: 0, pending_count: 0, pending_value: 0, paid_count: 0, paid_value: 0 });
  
  // Form states para despesa
  const [expenseName, setExpenseName] = useState("");
  const [expenseClassificationId, setExpenseClassificationId] = useState("");
  const [expenseSupplier, setExpenseSupplier] = useState("");
  const [expenseValue, setExpenseValue] = useState("");
  const [expenseDueDate, setExpenseDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseIsPaid, setExpenseIsPaid] = useState(false);
  const [expenseNotes, setExpenseNotes] = useState("");
  
  // State para criar classificação inline
  const [newClassificationName, setNewClassificationName] = useState("");
  const [showNewClassificationInput, setShowNewClassificationInput] = useState(false);
  
  // Form states avançados
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expenseIsRecurring, setExpenseIsRecurring] = useState(false);
  const [expenseRecurringPeriod, setExpenseRecurringPeriod] = useState("monthly");
  const [expenseInstallments, setExpenseInstallments] = useState("");
  
  // Filtros e ordenação
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, paid
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Active tab
  const [activeTab, setActiveTab] = useState("despesas");
  
  useEffect(() => {
    fetchClassifications();
    fetchExpenses();
    fetchStats();
    loadFornecedores();
  }, []);
  
  const loadFornecedores = () => {
    const saved = localStorage.getItem("fornecedores");
    if (saved) {
      setFornecedores(JSON.parse(saved));
    }
  };
  
  const fetchClassifications = async () => {
    try {
      const response = await axios.get(`${API}/expense-classifications`, getAuthHeader());
      setClassifications(response.data);
    } catch (error) {
      console.error("Erro ao carregar classificações:", error);
    }
  };
  
  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses`, getAuthHeader());
      setExpenses(response.data);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/expenses/stats`, getAuthHeader());
      setStats(response.data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };
  
  // ==================== CLASSIFICAÇÕES ====================
  
  const handleSaveClassification = async () => {
    if (!classificationName.trim()) {
      toast.error("Informe o nome da classificação");
      return;
    }
    
    try {
      if (editingClassification) {
        await axios.put(
          `${API}/expense-classifications/${editingClassification.id}`,
          { name: classificationName },
          getAuthHeader()
        );
        toast.success("Classificação atualizada!");
      } else {
        await axios.post(
          `${API}/expense-classifications`,
          { name: classificationName },
          getAuthHeader()
        );
        toast.success("Classificação criada!");
      }
      
      setClassificationDialogOpen(false);
      setClassificationName("");
      setEditingClassification(null);
      fetchClassifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar classificação");
    }
  };
  
  const handleEditClassification = (classification) => {
    setEditingClassification(classification);
    setClassificationName(classification.name);
    setClassificationDialogOpen(true);
  };
  
  const handleDeleteClassification = async () => {
    if (!classificationToDelete) return;
    
    try {
      await axios.delete(
        `${API}/expense-classifications/${classificationToDelete.id}`,
        getAuthHeader()
      );
      toast.success("Classificação excluída!");
      setDeleteClassificationDialogOpen(false);
      setClassificationToDelete(null);
      fetchClassifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao excluir classificação");
    }
  };
  
  const handleInitializeClassifications = async () => {
    try {
      const response = await axios.post(
        `${API}/expense-classifications/initialize`,
        {},
        getAuthHeader()
      );
      if (response.data.created.length > 0) {
        toast.success(`${response.data.created.length} classificações criadas!`);
        fetchClassifications();
      } else {
        toast.info("Todas as classificações padrão já existem");
      }
    } catch (error) {
      toast.error("Erro ao inicializar classificações");
    }
  };
  
  // ==================== DESPESAS ====================
  
  const resetExpenseForm = () => {
    setExpenseName("");
    setExpenseClassificationId("");
    setExpenseSupplier("");
    setExpenseValue("");
    setExpenseDueDate(new Date().toISOString().split("T")[0]);
    setExpenseIsPaid(false);
    setExpenseNotes("");
    setExpenseIsRecurring(false);
    setExpenseRecurringPeriod("monthly");
    setExpenseInstallments("");
    setAdvancedOpen(false);
    setEditingExpense(null);
    setNewClassificationName("");
    setShowNewClassificationInput(false);
  };
  
  const handleOpenNewExpense = () => {
    resetExpenseForm();
    setExpenseDialogOpen(true);
  };
  
  // Criar classificação inline
  const handleCreateClassificationInline = async () => {
    if (!newClassificationName.trim()) {
      toast.error("Informe o nome da classificação");
      return;
    }
    
    try {
      const response = await axios.post(
        `${API}/expense-classifications`,
        { name: newClassificationName },
        getAuthHeader()
      );
      toast.success("Classificação criada!");
      setExpenseClassificationId(response.data.id);
      setNewClassificationName("");
      setShowNewClassificationInput(false);
      fetchClassifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar classificação");
    }
  };
  
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseName(expense.name);
    setExpenseClassificationId(expense.classification_id || "");
    setExpenseSupplier(expense.supplier || "");
    setExpenseValue(expense.value.toString());
    setExpenseDueDate(expense.due_date);
    setExpenseIsPaid(expense.is_paid);
    setExpenseNotes(expense.notes || "");
    setExpenseIsRecurring(expense.is_recurring);
    setExpenseRecurringPeriod(expense.recurring_period || "monthly");
    setExpenseInstallments(expense.installments_total?.toString() || "");
    setAdvancedOpen(expense.is_recurring || expense.installments_total > 0);
    setExpenseDialogOpen(true);
  };
  
  const handleSaveExpense = async () => {
    if (!expenseName.trim()) {
      toast.error("Informe o nome da despesa");
      return;
    }
    if (!expenseValue || parseFloat(expenseValue) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!expenseDueDate) {
      toast.error("Informe a data de vencimento");
      return;
    }
    
    const expenseData = {
      name: expenseName,
      classification_id: expenseClassificationId && expenseClassificationId !== "none" ? expenseClassificationId : null,
      supplier: expenseSupplier || null,
      value: parseFloat(expenseValue),
      due_date: expenseDueDate,
      is_paid: expenseIsPaid,
      paid_date: expenseIsPaid ? new Date().toISOString().split("T")[0] : null,
      is_recurring: expenseIsRecurring,
      recurring_period: expenseIsRecurring ? expenseRecurringPeriod : null,
      installments_total: expenseInstallments ? parseInt(expenseInstallments) : 0,
      notes: expenseNotes || null
    };
    
    try {
      if (editingExpense) {
        await axios.put(
          `${API}/expenses/${editingExpense.id}`,
          expenseData,
          getAuthHeader()
        );
        toast.success("Despesa atualizada!");
      } else {
        await axios.post(`${API}/expenses`, expenseData, getAuthHeader());
        const msg = expenseIsRecurring 
          ? "Despesa recorrente criada! Próximos 12 meses gerados." 
          : expenseInstallments && parseInt(expenseInstallments) > 1
            ? `Despesa parcelada criada! ${expenseInstallments} parcelas geradas.`
            : "Despesa criada!";
        toast.success(msg);
      }
      
      setExpenseDialogOpen(false);
      resetExpenseForm();
      fetchExpenses();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar despesa");
    }
  };
  
  const handleTogglePaid = async (expense) => {
    try {
      await axios.patch(
        `${API}/expenses/${expense.id}/toggle-paid`,
        {},
        getAuthHeader()
      );
      toast.success(expense.is_paid ? "Despesa marcada como pendente" : "Despesa marcada como paga");
      fetchExpenses();
      fetchStats();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };
  
  const handleDeleteExpense = async (deleteChildren = false) => {
    if (!expenseToDelete) {
      console.error("expenseToDelete é null");
      return;
    }
    
    console.log("Deletando despesa:", expenseToDelete.id, "deleteChildren:", deleteChildren);
    
    try {
      const response = await axios.delete(
        `${API}/expenses/${expenseToDelete.id}?delete_children=${deleteChildren}`,
        getAuthHeader()
      );
      console.log("Resposta do delete:", response.data);
      toast.success(deleteChildren ? "Despesa e recorrências excluídas!" : "Despesa excluída!");
      setDeleteExpenseDialogOpen(false);
      setDeleteRecurringDialogOpen(false);
      setExpenseToDelete(null);
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error("Erro ao excluir despesa:", error.response?.data || error);
      toast.error(error.response?.data?.detail || "Erro ao excluir despesa");
    }
  };
  
  // Verifica se a despesa tem filhos (recorrências ou parcelas)
  const hasChildExpenses = (expense) => {
    if (!expense) return false;
    
    // Se é a despesa pai (sem parent_expense_id) e tem recorrência ou parcelas
    if (!expense.parent_expense_id && (expense.is_recurring || expense.installments_total > 1)) {
      // Verificar se realmente existem filhos
      const children = expenses.filter(e => e.parent_expense_id === expense.id);
      return children.length > 0;
    }
    return false;
  };
  
  // Conta quantas despesas filhas existem
  const countChildExpenses = (expense) => {
    if (!expense) return 0;
    return expenses.filter(e => e.parent_expense_id === expense.id).length;
  };
  
  // Handler para abrir o dialog correto de exclusão
  const handleOpenDeleteDialog = (expense) => {
    setExpenseToDelete(expense);
    
    // Se a despesa tem filhos (é a despesa pai com recorrências ou parcelas)
    const hasChildren = hasChildExpenses(expense);
    console.log("Deletando despesa:", expense.name, "hasChildren:", hasChildren, "is_recurring:", expense.is_recurring, "installments:", expense.installments_total);
    
    if (hasChildren) {
      setDeleteRecurringDialogOpen(true);
    } else {
      setDeleteExpenseDialogOpen(true);
    }
  };
  
  // ==================== FORNECEDORES (Autocomplete) ====================
  
  const getAllSuppliers = useMemo(() => {
    const suppliersSet = new Set();
    fornecedores.forEach(f => suppliersSet.add(f.nome));
    expenses.forEach(e => {
      if (e.supplier) suppliersSet.add(e.supplier);
    });
    return Array.from(suppliersSet).sort();
  }, [fornecedores, expenses]);
  
  useEffect(() => {
    if (expenseSupplier.trim()) {
      const filtered = getAllSuppliers.filter(s => 
        s.toLowerCase().includes(expenseSupplier.toLowerCase())
      );
      setSupplierSuggestions(filtered);
      setShowSupplierSuggestions(filtered.length > 0 && !filtered.some(s => s.toLowerCase() === expenseSupplier.toLowerCase()));
    } else {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
    }
  }, [expenseSupplier, getAllSuppliers]);
  
  // ==================== FILTROS E AGRUPAMENTO ====================
  
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    
    // Filtro por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(term) ||
        (e.supplier && e.supplier.toLowerCase().includes(term)) ||
        (e.classification_name && e.classification_name.toLowerCase().includes(term))
      );
    }
    
    // Filtro por status
    if (statusFilter !== "all") {
      result = result.filter(e => statusFilter === "paid" ? e.is_paid : !e.is_paid);
    }
    
    // Filtro por classificação
    if (classificationFilter !== "all") {
      result = result.filter(e => e.classification_id === classificationFilter);
    }
    
    return result;
  }, [expenses, searchTerm, statusFilter, classificationFilter]);
  
  // Agrupar por mês
  const expensesByMonth = useMemo(() => {
    const grouped = {};
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.due_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          label: monthLabel,
          expenses: [],
          total: 0,
          paid: 0,
          pending: 0
        };
      }
      
      grouped[monthKey].expenses.push(expense);
      grouped[monthKey].total += expense.value;
      if (expense.is_paid) {
        grouped[monthKey].paid += expense.value;
      } else {
        grouped[monthKey].pending += expense.value;
      }
    });
    
    // Ordenar por mês (mais recente primeiro)
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, ...data }));
  }, [filteredExpenses]);
  
  // Paginação por mês
  const paginatedMonths = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return expensesByMonth.slice(startIndex, startIndex + itemsPerPage);
  }, [expensesByMonth, currentPage, itemsPerPage]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, classificationFilter]);
  
  // ==================== HELPERS ====================
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };
  
  const isOverdue = (expense) => {
    if (expense.is_paid) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(expense.due_date + "T00:00:00");
    return dueDate < today;
  };
  
  // ==================== RENDER ====================
  
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
            <p className="text-muted-foreground mt-1">Gerencie as despesas do seu estabelecimento</p>
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Total de Despesas</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pending_value)}</p>
            <p className="text-xs text-muted-foreground">{stats.pending_count} despesas</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Pagas</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid_value)}</p>
            <p className="text-xs text-muted-foreground">{stats.paid_count} despesas</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Geral</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(stats.pending_value + stats.paid_value)}</p>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
              <TabsTrigger value="classificacao">Classificação</TabsTrigger>
            </TabsList>
            
            {activeTab === "despesas" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  const dataToExport = filteredExpenses.map(e => ({
                    nome: e.name,
                    classificacao: e.classification_name || "",
                    fornecedor: e.supplier || "",
                    valor: e.value,
                    vencimento: e.due_date,
                    status: e.is_paid ? "Pago" : "Pendente",
                    data_pagamento: e.paid_date || ""
                  }));
                  exportToExcel(dataToExport, "despesas", {
                    nome: "Nome",
                    classificacao: "Classificação",
                    fornecedor: "Fornecedor",
                    valor: "Valor",
                    vencimento: "Vencimento",
                    status: "Status",
                    data_pagamento: "Data Pagamento"
                  });
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button onClick={handleOpenNewExpense}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Despesa
                </Button>
              </div>
            )}
            
            {activeTab === "classificacao" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleInitializeClassifications}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Criar Padrões
                </Button>
                <Button onClick={() => {
                  setEditingClassification(null);
                  setClassificationName("");
                  setClassificationDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Classificação
                </Button>
              </div>
            )}
          </div>
          
          {/* Tab Despesas */}
          <TabsContent value="despesas" className="mt-0">
            {/* Filtros */}
            <div className="bg-card rounded-xl border p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar despesa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Classificação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Classificações</SelectItem>
                      {classifications.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Lista de Despesas agrupadas por mês */}
            <div className="space-y-4">
              {paginatedMonths.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Nenhuma despesa encontrada</p>
                  <Button variant="outline" className="mt-4" onClick={handleOpenNewExpense}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Despesa
                  </Button>
                </div>
              ) : (
                paginatedMonths.map(month => (
                  <div key={month.key} className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    {/* Header do mês */}
                    <div className="bg-muted/50 px-6 py-4 border-b flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg capitalize">{month.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {month.expenses.length} despesa(s)
                        </p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-right">
                          <p className="text-muted-foreground">Pendente</p>
                          <p className="font-bold text-amber-600">{formatCurrency(month.pending)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Pago</p>
                          <p className="font-bold text-green-600">{formatCurrency(month.paid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-bold">{formatCurrency(month.total)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tabela de despesas do mês */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Despesa</TableHead>
                          <TableHead>Classificação</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {month.expenses.map(expense => (
                          <TableRow key={expense.id} className={isOverdue(expense) ? "bg-red-50 dark:bg-red-950/20" : ""}>
                            <TableCell>
                              <button
                                onClick={() => handleTogglePaid(expense)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  expense.is_paid 
                                    ? "bg-green-500 border-green-500 text-white" 
                                    : "border-muted-foreground/30 hover:border-green-500"
                                }`}
                              >
                                {expense.is_paid && <Check className="w-4 h-4" />}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{expense.name}</p>
                                {expense.is_recurring && (
                                  <span className="text-xs text-blue-600 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    Recorrente
                                  </span>
                                )}
                                {expense.installments_total > 0 && (
                                  <span className="text-xs text-purple-600 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    Parcela {expense.installment_number}/{expense.installments_total}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {expense.classification_name ? (
                                <span className="px-2 py-1 bg-muted rounded-full text-xs">
                                  {expense.classification_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {expense.supplier ? (
                                <span className="flex items-center gap-1 text-sm">
                                  <Building2 className="w-3 h-3 text-muted-foreground" />
                                  {expense.supplier}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(expense.value)}
                            </TableCell>
                            <TableCell>
                              <span className={`flex items-center gap-1 text-sm ${isOverdue(expense) ? "text-red-600 font-medium" : ""}`}>
                                <Calendar className="w-3 h-3" />
                                {formatDate(expense.due_date)}
                                {isOverdue(expense) && <AlertCircle className="w-3 h-3" />}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {expense.is_paid ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Pago
                                </span>
                              ) : (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  isOverdue(expense) 
                                    ? "bg-red-100 text-red-700" 
                                    : "bg-amber-100 text-amber-700"
                                }`}>
                                  {isOverdue(expense) ? "Vencido" : "Pendente"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleOpenDeleteDialog(expense)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
              
              {/* Paginação */}
              {expensesByMonth.length > itemsPerPage && (
                <TablePagination
                  currentPage={currentPage}
                  totalItems={expensesByMonth.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              )}
            </div>
          </TabsContent>
          
          {/* Tab Classificações */}
          <TabsContent value="classificacao" className="mt-0">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {classifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma classificação cadastrada</p>
                  <Button variant="outline" className="mt-4" onClick={handleInitializeClassifications}>
                    Criar Classificações Padrão
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-center">Despesas</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classifications.map(classification => {
                      const expenseCount = expenses.filter(e => e.classification_id === classification.id).length;
                      return (
                        <TableRow key={classification.id}>
                          <TableCell className="font-medium">{classification.name}</TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-muted rounded-full text-sm">
                              {expenseCount}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditClassification(classification)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setClassificationToDelete(classification);
                                  setDeleteClassificationDialogOpen(true);
                                }}
                                disabled={expenseCount > 0}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Dialog Classificação */}
        <Dialog open={classificationDialogOpen} onOpenChange={setClassificationDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClassification ? "Editar Classificação" : "Nova Classificação"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome da Classificação</Label>
                <Input
                  value={classificationName}
                  onChange={(e) => setClassificationName(e.target.value)}
                  placeholder="Ex: Energia, Água, Aluguel..."
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveClassification} className="w-full">
                {editingClassification ? "Salvar Alterações" : "Criar Classificação"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Dialog Despesa */}
        <Dialog open={expenseDialogOpen} onOpenChange={(open) => {
          if (!open) resetExpenseForm();
          setExpenseDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Editar Despesa" : "Nova Despesa"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Nome */}
              <div>
                <Label>Nome da Despesa *</Label>
                <Input
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="Ex: Conta de Luz, Aluguel..."
                  className="mt-1"
                />
              </div>
              
              {/* Classificação */}
              <div>
                <Label>Classificação</Label>
                <Select value={expenseClassificationId || "none"} onValueChange={(val) => setExpenseClassificationId(val === "none" ? "" : val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem classificação</SelectItem>
                    {classifications.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Botão para criar nova classificação */}
                {!showNewClassificationInput ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs"
                    onClick={() => setShowNewClassificationInput(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Criar nova classificação
                  </Button>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newClassificationName}
                      onChange={(e) => setNewClassificationName(e.target.value)}
                      placeholder="Nome da nova classificação"
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateClassificationInline();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2"
                      onClick={handleCreateClassificationInline}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setShowNewClassificationInput(false);
                        setNewClassificationName("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Fornecedor com autocomplete */}
              <div className="relative">
                <Label>Fornecedor</Label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={expenseSupplier}
                    onChange={(e) => setExpenseSupplier(e.target.value)}
                    onFocus={() => {
                      if (supplierSuggestions.length > 0) setShowSupplierSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                    placeholder="Digite ou selecione um fornecedor"
                    className="mt-1 pl-9"
                  />
                </div>
                
                {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {supplierSuggestions.map((s, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                        onMouseDown={() => {
                          setExpenseSupplier(s);
                          setShowSupplierSuggestions(false);
                        }}
                      >
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={expenseValue}
                      onChange={(e) => setExpenseValue(e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={expenseDueDate}
                    onChange={(e) => setExpenseDueDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              {/* Status Pago */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <Label className="cursor-pointer">Despesa já foi paga</Label>
                </div>
                <Switch
                  checked={expenseIsPaid}
                  onCheckedChange={setExpenseIsPaid}
                />
              </div>
              
              {/* Seção Avançado */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Avançado</span>
                    {advancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Recorrência */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <Label className="cursor-pointer">Despesa recorrente</Label>
                    </div>
                    <Switch
                      checked={expenseIsRecurring}
                      onCheckedChange={(checked) => {
                        setExpenseIsRecurring(checked);
                        if (checked) setExpenseInstallments("");
                      }}
                      disabled={!!editingExpense}
                    />
                  </div>
                  
                  {expenseIsRecurring && (
                    <div>
                      <Label>Período de Recorrência</Label>
                      <Select value={expenseRecurringPeriod} onValueChange={setExpenseRecurringPeriod}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Serão criadas automaticamente despesas para os próximos 12 períodos
                      </p>
                    </div>
                  )}
                  
                  {/* Parcelas */}
                  {!expenseIsRecurring && (
                    <div>
                      <Label>Quantidade de Parcelas</Label>
                      <Input
                        type="number"
                        min="0"
                        value={expenseInstallments}
                        onChange={(e) => setExpenseInstallments(e.target.value)}
                        placeholder="0 = sem parcelamento"
                        className="mt-1"
                        disabled={!!editingExpense}
                      />
                      {expenseInstallments && parseInt(expenseInstallments) > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Serão criadas {expenseInstallments} parcelas de {formatCurrency(parseFloat(expenseValue || 0))} cada
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Notas */}
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      placeholder="Notas adicionais..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              <Button onClick={handleSaveExpense} className="w-full">
                {editingExpense ? "Salvar Alterações" : "Criar Despesa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Dialog Confirmar Exclusão Classificação */}
        <AlertDialog open={deleteClassificationDialogOpen} onOpenChange={setDeleteClassificationDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Classificação?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a classificação "{classificationToDelete?.name}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClassification} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Dialog Confirmar Exclusão Despesa (simples) */}
        <AlertDialog open={deleteExpenseDialogOpen} onOpenChange={setDeleteExpenseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Despesa?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a despesa "{expenseToDelete?.name}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteExpense(false)} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Dialog Confirmar Exclusão Despesa Recorrente/Parcelada */}
        <AlertDialog open={deleteRecurringDialogOpen} onOpenChange={setDeleteRecurringDialogOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Despesa Recorrente</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  A despesa "{expenseToDelete?.name}" possui{" "}
                  <strong>{countChildExpenses(expenseToDelete)}</strong>{" "}
                  {expenseToDelete?.is_recurring ? "recorrências futuras" : "parcelas"} vinculadas.
                </span>
                <span className="block font-medium text-foreground">
                  Como deseja proceder?
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => handleDeleteExpense(false)}
              >
                <div className="text-left">
                  <p className="font-medium">Excluir apenas esta despesa</p>
                  <p className="text-xs text-muted-foreground">As {countChildExpenses(expenseToDelete)} {expenseToDelete?.is_recurring ? "recorrências futuras" : "outras parcelas"} serão mantidas</p>
                </div>
              </Button>
              <Button
                variant="destructive"
                className="justify-start h-auto py-3 px-4"
                onClick={() => handleDeleteExpense(true)}
              >
                <div className="text-left">
                  <p className="font-medium">Excluir todas ({countChildExpenses(expenseToDelete) + 1} despesas)</p>
                  <p className="text-xs opacity-90">Esta despesa e todas as {expenseToDelete?.is_recurring ? "recorrências" : "parcelas"} serão excluídas permanentemente</p>
                </div>
              </Button>
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
