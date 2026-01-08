import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, Truck, Phone, DollarSign, ShoppingCart,
  Calendar, MoreVertical, Building2, Filter
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState("sempre");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentFornecedor, setCurrentFornecedor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState(null);
  
  // Form
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    fetchCompras();
    fetchFornecedores();
  }, []);

  const fetchCompras = async () => {
    try {
      const response = await axios.get(`${API}/purchases`, getAuthHeader());
      setCompras(response.data);
    } catch (error) {
      console.error("Erro ao carregar compras:", error);
    }
  };

  const fetchFornecedores = () => {
    const savedFornecedores = localStorage.getItem("fornecedores");
    if (savedFornecedores) {
      setFornecedores(JSON.parse(savedFornecedores));
    }
  };

  const saveFornecedores = (newFornecedores) => {
    setFornecedores(newFornecedores);
    localStorage.setItem("fornecedores", JSON.stringify(newFornecedores));
  };

  // Extrair fornecedores únicos das compras
  const fornecedoresDasCompras = [...new Set(compras.map(c => c.supplier))].filter(Boolean);

  // Combinar fornecedores cadastrados com os das compras
  const getAllFornecedores = () => {
    const fornecedoresMap = new Map();
    
    // Adicionar fornecedores cadastrados
    fornecedores.forEach(f => {
      fornecedoresMap.set(f.nome.toLowerCase(), { ...f, cadastrado: true });
    });
    
    // Adicionar fornecedores das compras que não estão cadastrados
    fornecedoresDasCompras.forEach(nome => {
      if (!fornecedoresMap.has(nome.toLowerCase())) {
        fornecedoresMap.set(nome.toLowerCase(), {
          id: `auto-${nome}`,
          nome,
          cadastrado: false
        });
      }
    });
    
    return Array.from(fornecedoresMap.values());
  };

  // Calcular estatísticas do fornecedor
  const getEstatisticasFornecedor = (nomeFornecedor) => {
    const now = new Date();
    let filteredCompras = compras.filter(c => 
      c.supplier && c.supplier.toLowerCase() === nomeFornecedor.toLowerCase()
    );

    // Aplicar filtro de período
    if (periodoFiltro !== "sempre") {
      const diasAtras = {
        "30": 30,
        "60": 60,
        "90": 90,
        "365": 365
      }[periodoFiltro] || 0;
      
      const dataLimite = new Date(now.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
      filteredCompras = filteredCompras.filter(c => 
        new Date(c.purchase_date) >= dataLimite
      );
    }

    const totalGasto = filteredCompras.reduce((sum, c) => sum + (c.price || 0), 0);
    const qtdCompras = [...new Set(filteredCompras.map(c => c.batch_id))].length;
    const ultimaCompra = filteredCompras.length > 0 
      ? new Date(Math.max(...filteredCompras.map(c => new Date(c.purchase_date))))
      : null;

    return { totalGasto, qtdCompras, ultimaCompra };
  };

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setEmail("");
    setCnpj("");
    setEndereco("");
    setEditMode(false);
    setCurrentFornecedor(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (fornecedor) => {
    setEditMode(true);
    setCurrentFornecedor(fornecedor);
    setNome(fornecedor.nome);
    setTelefone(fornecedor.telefone || "");
    setEmail(fornecedor.email || "");
    setCnpj(fornecedor.cnpj || "");
    setEndereco(fornecedor.endereco || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do fornecedor");
      return;
    }

    if (editMode && currentFornecedor) {
      const updatedFornecedores = fornecedores.map(f =>
        f.id === currentFornecedor.id
          ? { ...f, nome, telefone, email, cnpj, endereco }
          : f
      );
      saveFornecedores(updatedFornecedores);
      toast.success("Fornecedor atualizado!");
    } else {
      const novoFornecedor = {
        id: `fornecedor-${Date.now()}`,
        nome,
        telefone,
        email,
        cnpj,
        endereco,
        created_at: new Date().toISOString()
      };
      saveFornecedores([...fornecedores, novoFornecedor]);
      toast.success("Fornecedor cadastrado!");
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (fornecedor) => {
    setFornecedorToDelete(fornecedor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fornecedorToDelete) {
      saveFornecedores(fornecedores.filter(f => f.id !== fornecedorToDelete.id));
      toast.success("Fornecedor excluído!");
    }
    setDeleteDialogOpen(false);
    setFornecedorToDelete(null);
  };

  // Cadastrar fornecedor das compras
  const handleCadastrarFornecedor = (nome) => {
    setNome(nome);
    setDialogOpen(true);
  };

  const allFornecedores = getAllFornecedores();
  
  const filteredFornecedores = allFornecedores.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar por total gasto
  const sortedFornecedores = [...filteredFornecedores].sort((a, b) => {
    const statsA = getEstatisticasFornecedor(a.nome);
    const statsB = getEstatisticasFornecedor(b.nome);
    return statsB.totalGasto - statsA.totalGasto;
  });

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return date.toLocaleDateString("pt-BR");
  };

  // Calcular totais gerais
  const totalGeral = sortedFornecedores.reduce((sum, f) => {
    const stats = getEstatisticasFornecedor(f.nome);
    return sum + stats.totalGasto;
  }, 0);

  const totalCompras = sortedFornecedores.reduce((sum, f) => {
    const stats = getEstatisticasFornecedor(f.nome);
    return sum + stats.qtdCompras;
  }, 0);

  const periodoLabels = {
    "30": "Últimos 30 dias",
    "60": "Últimos 60 dias",
    "90": "Últimos 90 dias",
    "365": "Último ano",
    "sempre": "Desde sempre"
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Fornecedores</h1>
        <p className="text-muted-foreground mt-1">Gerencie seus fornecedores e visualize histórico de compras</p>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="sempre">Desde sempre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total de Fornecedores</p>
          <p className="text-2xl font-bold">{sortedFornecedores.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total em Compras ({periodoLabels[periodoFiltro]})</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Quantidade de Compras</p>
          <p className="text-2xl font-bold">{totalCompras}</p>
        </div>
      </div>

      {/* Tabela de Fornecedores */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {sortedFornecedores.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum fornecedor encontrado</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Fornecedor
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-center">Compras</TableHead>
                <TableHead className="text-right">Total Gasto</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFornecedores.map(fornecedor => {
                const stats = getEstatisticasFornecedor(fornecedor.nome);
                
                return (
                  <TableRow key={fornecedor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{fornecedor.nome}</p>
                          {fornecedor.telefone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {fornecedor.telefone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        {stats.qtdCompras}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-primary">
                        {formatCurrency(stats.totalGasto)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(stats.ultimaCompra)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {fornecedor.cadastrado ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Cadastrado
                        </span>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCadastrarFornecedor(fornecedor.nome)}
                        >
                          Cadastrar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {fornecedor.cadastrado && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(fornecedor)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(fornecedor)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do fornecedor"
                className="mt-1"
              />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@fornecedor.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Endereço completo"
                className="mt-1"
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              {editMode ? "Salvar Alterações" : "Cadastrar Fornecedor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor "{fornecedorToDelete?.nome}"? Esta ação não pode ser desfeita.
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
