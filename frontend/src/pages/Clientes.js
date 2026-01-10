import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, User, Phone, MapPin, Calendar, X, MoreVertical, Download, ImageOff, Mail, Clock, Star, AlertTriangle, UserX, UserCheck, Sparkles, Filter
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

// URL relativa - funciona em qualquer domínio

// Função para calcular tempo desde cadastro
const getTimeSinceRegistration = (dateStr) => {
  if (!dateStr) return "Sem data";
  
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias`;
  if (diffWeeks === 1) return "1 semana";
  if (diffWeeks < 4) return `${diffWeeks} semanas`;
  if (diffMonths === 1) return "1 mês";
  if (diffMonths < 12) return `${diffMonths} meses`;
  if (diffYears === 1) return "1 ano";
  return `${diffYears} anos`;
};

// Função para calcular a TAG do cliente
const getClientTag = (cliente) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  
  const pedidosCount = cliente.pedidos_count || 0;
  const lastOrderDate = cliente.last_order_date ? new Date(cliente.last_order_date) : null;
  const ordersLast30Days = cliente.orders_last_30_days || 0;
  
  // Cliente VIP - mais de 4 pedidos nos últimos 30 dias
  if (ordersLast30Days > 4) {
    return {
      tag: "Cliente VIP",
      color: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
      icon: Sparkles,
      priority: 1
    };
  }
  
  // Cliente Recorrente - mais de 3 pedidos nos últimos 30 dias
  if (ordersLast30Days >= 3) {
    return {
      tag: "Recorrente",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: Star,
      priority: 2
    };
  }
  
  // Novo Cliente - nunca pediu
  if (pedidosCount === 0) {
    return {
      tag: "Novo",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: UserCheck,
      priority: 5
    };
  }
  
  // Primeiro Pedido - apenas 1 pedido
  if (pedidosCount === 1) {
    return {
      tag: "1º Pedido",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      icon: User,
      priority: 4
    };
  }
  
  // Cliente Perdido - sem pedidos nos últimos 60 dias
  if (lastOrderDate && lastOrderDate < sixtyDaysAgo) {
    return {
      tag: "Perdido",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: UserX,
      priority: 6
    };
  }
  
  // Cliente em Risco - sem pedidos nos últimos 30 dias
  if (lastOrderDate && lastOrderDate < thirtyDaysAgo) {
    return {
      tag: "Em Risco",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      icon: AlertTriangle,
      priority: 3
    };
  }
  
  // Cliente normal (tem pedidos mas não se encaixa nas outras categorias)
  return {
    tag: "Ativo",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: User,
    priority: 7
  };
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCliente, setCurrentCliente] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Form - Novos campos
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState("");
  // Endereço detalhado
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = () => {
    const savedClientes = localStorage.getItem("clientes");
    if (savedClientes) {
      setClientes(JSON.parse(savedClientes));
    }
  };

  const saveClientes = (newClientes) => {
    setClientes(newClientes);
    localStorage.setItem("clientes", JSON.stringify(newClientes));
  };

  // Função para carregar dados de teste
  const loadTestData = () => {
    const testClientes = [
      {
        id: "cliente-test-1",
        nome: "Maria Silva",
        telefone: "(11) 9.8765-4321",
        email: "maria.silva@email.com",
        cpf: "123.456.789-00",
        genero: "feminino",
        created_at: new Date().toISOString(),
        pedidos_count: 0,
        total_gasto: 0,
        last_order_date: null,
        orders_last_30_days: 0
      },
      {
        id: "cliente-test-2",
        nome: "João Santos",
        telefone: "(11) 9.1234-5678",
        email: "joao.santos@email.com",
        cpf: "987.654.321-00",
        genero: "masculino",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        pedidos_count: 1,
        total_gasto: 45.90,
        last_order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        orders_last_30_days: 1
      },
      {
        id: "cliente-test-3",
        nome: "Ana Costa",
        telefone: "(21) 9.5555-4444",
        email: "ana.costa@email.com",
        cpf: "111.222.333-44",
        genero: "feminino",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        pedidos_count: 4,
        total_gasto: 320.50,
        last_order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        orders_last_30_days: 4
      },
      {
        id: "cliente-test-4",
        nome: "Pedro Oliveira",
        telefone: "(31) 9.7777-8888",
        email: "pedro.oliveira@email.com",
        cpf: "555.666.777-88",
        genero: "masculino",
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        pedidos_count: 8,
        total_gasto: 890.00,
        last_order_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        orders_last_30_days: 5
      },
      {
        id: "cliente-test-5",
        nome: "Carla Mendes",
        telefone: "(41) 9.3333-2222",
        email: "carla.mendes@email.com",
        cpf: "999.888.777-66",
        genero: "feminino",
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        pedidos_count: 3,
        total_gasto: 150.00,
        last_order_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        orders_last_30_days: 0
      },
      {
        id: "cliente-test-6",
        nome: "Roberto Lima",
        telefone: "(51) 9.1111-0000",
        email: "roberto.lima@email.com",
        cpf: "444.333.222-11",
        genero: "masculino",
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        pedidos_count: 12,
        total_gasto: 1500.00,
        last_order_date: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
        orders_last_30_days: 0
      }
    ];
    
    saveClientes(testClientes);
    toast.success("6 clientes de teste carregados!");
  };

  // Formatar telefone (XX) 9.XXXX-XXXX
  const formatTelefone = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // Formatar CPF XXX.XXX.XXX-XX
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Formatar Data XX/XX/XXXX
  const formatData = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  // Formatar CEP XXXXX-XXX
  const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleTelefoneChange = (e) => {
    setTelefone(formatTelefone(e.target.value));
  };

  const handleCPFChange = (e) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleDataNascimentoChange = (e) => {
    setDataNascimento(formatData(e.target.value));
  };

  const handleCEPChange = (e) => {
    setCep(formatCEP(e.target.value));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setEmail("");
    setCpf("");
    setDataNascimento("");
    setGenero("");
    setFoto(null);
    setFotoPreview("");
    setEndereco("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCep("");
    setEditMode(false);
    setCurrentCliente(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (cliente) => {
    setEditMode(true);
    setCurrentCliente(cliente);
    setNome(cliente.nome || "");
    setTelefone(cliente.telefone || "");
    setEmail(cliente.email || "");
    setCpf(cliente.cpf || "");
    setDataNascimento(cliente.data_nascimento || "");
    setGenero(cliente.genero || "");
    setFotoPreview(cliente.foto || "");
    setEndereco(cliente.endereco || "");
    setNumero(cliente.numero || "");
    setComplemento(cliente.complemento || "");
    setBairro(cliente.bairro || "");
    setCep(cliente.cep || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!telefone.trim()) {
      toast.error("Informe o telefone do cliente");
      return;
    }

    const clienteData = {
      nome,
      telefone,
      email,
      cpf,
      data_nascimento: dataNascimento,
      genero,
      foto: fotoPreview,
      endereco,
      numero,
      complemento,
      bairro,
      cep,
    };

    if (editMode && currentCliente) {
      const updatedClientes = clientes.map(c =>
        c.id === currentCliente.id
          ? { ...c, ...clienteData }
          : c
      );
      saveClientes(updatedClientes);
      toast.success("Cliente atualizado!");
    } else {
      const novoCliente = {
        id: `cliente-${Date.now()}`,
        ...clienteData,
        created_at: new Date().toISOString(),
        pedidos_count: 0,
        total_gasto: 0,
        last_order_date: null,
        orders_last_30_days: 0
      };
      saveClientes([...clientes, novoCliente]);
      toast.success("Cliente cadastrado!");
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (cliente) => {
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (clienteToDelete) {
      saveClientes(clientes.filter(c => c.id !== clienteToDelete.id));
      toast.success("Cliente excluído!");
    }
    setDeleteDialogOpen(false);
    setClienteToDelete(null);
  };

  // Contar clientes por tag
  const tagCounts = useMemo(() => {
    const counts = {
      all: clientes.length,
      vip: 0,
      recorrente: 0,
      novo: 0,
      primeiro_pedido: 0,
      em_risco: 0,
      perdido: 0,
      ativo: 0
    };
    
    clientes.forEach(c => {
      const tag = getClientTag(c);
      if (tag.tag === "Cliente VIP") counts.vip++;
      else if (tag.tag === "Recorrente") counts.recorrente++;
      else if (tag.tag === "Novo") counts.novo++;
      else if (tag.tag === "1º Pedido") counts.primeiro_pedido++;
      else if (tag.tag === "Em Risco") counts.em_risco++;
      else if (tag.tag === "Perdido") counts.perdido++;
      else counts.ativo++;
    });
    
    return counts;
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      // Filtro por texto
      const matchesSearch = 
        c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefone && c.telefone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cpf && c.cpf.includes(searchTerm));
      
      // Filtro por tag
      if (tagFilter === "all") return matchesSearch;
      
      const tag = getClientTag(c);
      const tagMap = {
        vip: "Cliente VIP",
        recorrente: "Recorrente",
        novo: "Novo",
        primeiro_pedido: "1º Pedido",
        em_risco: "Em Risco",
        perdido: "Perdido",
        ativo: "Ativo"
      };
      
      return matchesSearch && tag.tag === tagMap[tagFilter];
    });
  }, [clientes, searchTerm, tagFilter]);

  // Clientes paginados
  const paginatedClientes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClientes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClientes, currentPage, itemsPerPage]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tagFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground mt-1">Gerencie seus clientes cadastrados</p>
      </div>

      {/* Barra de Pesquisa e Ações */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, telefone, email ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filtro por Tag */}
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({tagCounts.all})</SelectItem>
            <SelectItem value="vip">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Cliente VIP ({tagCounts.vip})
              </span>
            </SelectItem>
            <SelectItem value="recorrente">
              <span className="flex items-center gap-2">
                <Star className="w-3 h-3 text-green-600" />
                Recorrente ({tagCounts.recorrente})
              </span>
            </SelectItem>
            <SelectItem value="novo">
              <span className="flex items-center gap-2">
                <UserCheck className="w-3 h-3 text-blue-600" />
                Novo ({tagCounts.novo})
              </span>
            </SelectItem>
            <SelectItem value="primeiro_pedido">
              <span className="flex items-center gap-2">
                <User className="w-3 h-3 text-purple-600" />
                1º Pedido ({tagCounts.primeiro_pedido})
              </span>
            </SelectItem>
            <SelectItem value="em_risco">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Em Risco ({tagCounts.em_risco})
              </span>
            </SelectItem>
            <SelectItem value="perdido">
              <span className="flex items-center gap-2">
                <UserX className="w-3 h-3 text-red-600" />
                Perdido ({tagCounts.perdido})
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          onClick={() => exportToExcel(clientes, "clientes", {
            nome: "Nome",
            telefone: "Telefone",
            email: "Email",
            cpf: "CPF",
            data_nascimento: "Data Nascimento",
            genero: "Gênero",
            endereco: "Endereço",
            created_at: "Data Cadastro"
          })}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
        {clientes.length === 0 && (
          <Button variant="outline" onClick={loadTestData} className="border-dashed">
            Carregar Dados Teste
          </Button>
        )}
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Estatísticas por Tag */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'vip' ? 'ring-2 ring-amber-500' : 'hover:border-amber-300'}`}
          onClick={() => setTagFilter(tagFilter === 'vip' ? 'all' : 'vip')}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">VIP</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.vip}</p>
        </div>
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'recorrente' ? 'ring-2 ring-green-500' : 'hover:border-green-300'}`}
          onClick={() => setTagFilter(tagFilter === 'recorrente' ? 'all' : 'recorrente')}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Recorrente</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.recorrente}</p>
        </div>
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'novo' ? 'ring-2 ring-blue-500' : 'hover:border-blue-300'}`}
          onClick={() => setTagFilter(tagFilter === 'novo' ? 'all' : 'novo')}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Novo</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.novo}</p>
        </div>
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'primeiro_pedido' ? 'ring-2 ring-purple-500' : 'hover:border-purple-300'}`}
          onClick={() => setTagFilter(tagFilter === 'primeiro_pedido' ? 'all' : 'primeiro_pedido')}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-muted-foreground">1º Pedido</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.primeiro_pedido}</p>
        </div>
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'em_risco' ? 'ring-2 ring-amber-500' : 'hover:border-amber-300'}`}
          onClick={() => setTagFilter(tagFilter === 'em_risco' ? 'all' : 'em_risco')}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Em Risco</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.em_risco}</p>
        </div>
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'perdido' ? 'ring-2 ring-red-500' : 'hover:border-red-300'}`}
          onClick={() => setTagFilter(tagFilter === 'perdido' ? 'all' : 'perdido')}
        >
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Perdido</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.perdido}</p>
        </div>
        <div 
          className={`bg-card rounded-xl border p-3 cursor-pointer transition-all ${tagFilter === 'all' ? 'ring-2 ring-primary' : 'hover:border-primary/30'}`}
          onClick={() => setTagFilter('all')}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-xl font-bold mt-1">{tagCounts.all}</p>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {filteredClientes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum cliente encontrado</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Cliente
            </Button>
          </div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClientes.map(cliente => {
                const tag = getClientTag(cliente);
                const TagIcon = tag.icon;
                const timeSince = getTimeSinceRegistration(cliente.created_at);
                
                return (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                          {cliente.foto ? (
                            <img src={cliente.foto} alt={cliente.nome} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          {cliente.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {cliente.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tag.color}`}>
                        <TagIcon className="w-3 h-3" />
                        {tag.tag}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cliente.telefone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {cliente.telefone}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {cliente.pedidos_count || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeSince}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(cliente)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(cliente)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          {filteredClientes.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredClientes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </>
        )}
      </div>

      {/* Dialog Criar/Editar - Layout Horizontal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Primeira Linha: Foto, Nome e Gênero */}
            <div className="flex gap-6">
              {/* Foto do Cliente */}
              <div className="flex-shrink-0">
                <Label className="text-sm text-muted-foreground">Foto do Cliente</Label>
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed overflow-hidden bg-muted flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                      {fotoPreview ? (
                        <img
                          src={fotoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <ImageOff className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center px-2">Clique para adicionar</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 text-center">1080x1080px</p>
                </div>
              </div>

              {/* Nome e Email */}
              <div className="flex-1 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Nome *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Thais Addad"
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Gênero */}
                  <div className="w-48">
                    <Label>Gênero</Label>
                    <div className="mt-1 flex rounded-lg border overflow-hidden h-10">
                      <button
                        type="button"
                        onClick={() => setGenero("masculino")}
                        className={`flex-1 text-sm font-medium transition-colors ${
                          genero === "masculino" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenero("feminino")}
                        className={`flex-1 text-sm font-medium transition-colors border-l ${
                          genero === "feminino" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        Feminino
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: thaisaddad@gmail.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Segunda Linha: Telefone, CPF e Data de Nascimento */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={telefone}
                  onChange={handleTelefoneChange}
                  placeholder="(XX) 9.XXXX-XXXX"
                  className="mt-1"
                  maxLength={16}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={cpf}
                  onChange={handleCPFChange}
                  placeholder="XXX.XXX.XXX-XX"
                  className="mt-1"
                  maxLength={14}
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  value={dataNascimento}
                  onChange={handleDataNascimentoChange}
                  placeholder="DD/MM/AAAA"
                  className="mt-1"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Terceira Linha: Endereços */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Endereço</Label>
              <div className="grid grid-cols-12 gap-3 mt-3">
                <div className="col-span-6">
                  <Label className="text-sm">Rua/Logradouro</Label>
                  <Input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Rua das Flores"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">Número</Label>
                  <Input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-sm">Complemento</Label>
                  <Input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apt 101, Bloco A..."
                    className="mt-1"
                  />
                </div>
                <div className="col-span-5">
                  <Label className="text-sm">Bairro</Label>
                  <Input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Ex: Centro"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-sm">CEP</Label>
                  <Input
                    value={cep}
                    onChange={handleCEPChange}
                    placeholder="XXXXX-XXX"
                    className="mt-1"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editMode ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clienteToDelete?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
