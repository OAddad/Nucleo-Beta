import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, Truck, Phone, DollarSign, ShoppingCart,
  Calendar, MoreVertical, Building2, Filter, Download
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
const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// =====================================================
// FUNÇÕES DE FORMATAÇÃO DE DOCUMENTO
// =====================================================

// Formatar telefone: (XX) X.XXXX-XXXX
const formatTelefone = (value) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 3) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)}.${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

// Formatar CNPJ: XX.XXX.XXX/XXXX-XX
const formatCNPJ = (value) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 5) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  } else if (numbers.length <= 8) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  } else if (numbers.length <= 12) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  } else if (numbers.length <= 14) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  }
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

// Formatar CPF: XXX.XXX.XXX-XX
const formatCPF = (value) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else if (numbers.length <= 11) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

// Formatar documento (detecta se é CPF ou CNPJ)
const formatDocumento = (value) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 11) {
    return formatCPF(value);
  } else {
    return formatCNPJ(value);
  }
};

// Detectar tipo de documento
const getTipoDocumento = (value) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  return numbers.length <= 11 ? "CPF" : "CNPJ";
};

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
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Form
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState(""); // CNPJ ou CPF
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

  // Filtrar fornecedores
  const filteredFornecedores = useMemo(() => {
    let result = getAllFornecedores();
    
    // Filtro por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(f => 
        f.nome.toLowerCase().includes(term) ||
        (f.documento && f.documento.includes(term)) ||
        (f.telefone && f.telefone.includes(term))
      );
    }
    
    // Quando o filtro de período está ativo (não é "sempre"), 
    // ocultar fornecedores sem compras no período
    if (periodoFiltro !== "sempre") {
      result = result.filter(f => {
        const stats = getEstatisticasFornecedor(f.nome);
        return stats.qtdCompras > 0;
      });
    }
    
    return result;
  }, [fornecedores, fornecedoresDasCompras, compras, searchTerm, periodoFiltro]);

  // Fornecedores paginados
  const paginatedFornecedores = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFornecedores.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFornecedores, currentPage, itemsPerPage]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodoFiltro]);

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setEmail("");
    setDocumento("");
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
    // Usar documento ou cnpj (compatibilidade)
    setDocumento(fornecedor.documento || fornecedor.cnpj || "");
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
          ? { ...f, nome, telefone, email, documento, endereco }
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
        documento,
        endereco,
        criadoEm: new Date().toISOString()
      };
      saveFornecedores([...fornecedores, novoFornecedor]);
      toast.success("Fornecedor cadastrado!");
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleCadastrarFornecedor = (nomeFornecedor) => {
    setNome(nomeFornecedor);
    setTelefone("");
    setEmail("");
    setDocumento("");
    setEndereco("");
    setEditMode(false);
    setCurrentFornecedor(null);
    setDialogOpen(true);
  };

  const handleDelete = (fornecedor) => {
    setFornecedorToDelete(fornecedor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fornecedorToDelete) {
      const updatedFornecedores = fornecedores.filter(f => f.id !== fornecedorToDelete.id);
      saveFornecedores(updatedFornecedores);
      toast.success("Fornecedor excluído!");
    }
    setDeleteDialogOpen(false);
    setFornecedorToDelete(null);
  };

  // Filtrar e ordenar fornecedores (agora usa filteredFornecedores que já tem a lógica de filtro de período)
  const sortedFornecedores = useMemo(() => {
    // Ordenar por total gasto (decrescente)
    return [...filteredFornecedores].sort((a, b) => {
      const statsA = getEstatisticasFornecedor(a.nome);
      const statsB = getEstatisticasFornecedor(b.nome);
      return statsB.totalGasto - statsA.totalGasto;
    });
  }, [filteredFornecedores, compras, periodoFiltro]);

  // Fornecedores paginados após ordenação
  const finalPaginatedFornecedores = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedFornecedores.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedFornecedores, currentPage, itemsPerPage]);

  // Totais gerais
  const { totalGeral, totalCompras } = useMemo(() => {
    let total = 0;
    let comprasSet = new Set();
    
    sortedFornecedores.forEach(f => {
      const stats = getEstatisticasFornecedor(f.nome);
      total += stats.totalGasto;
      
      compras.filter(c => c.supplier?.toLowerCase() === f.nome.toLowerCase())
        .forEach(c => comprasSet.add(c.batch_id));
    });
    
    return { totalGeral: total, totalCompras: comprasSet.size };
  }, [sortedFornecedores, compras, periodoFiltro]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const periodoLabels = {
    "30": "últimos 30 dias",
    "60": "últimos 60 dias",
    "90": "últimos 90 dias",
    "365": "último ano",
    "sempre": "desde sempre"
  };

  // Handler para telefone com máscara
  const handleTelefoneChange = (e) => {
    const formatted = formatTelefone(e.target.value);
    setTelefone(formatted);
  };

  // Handler para documento (CPF/CNPJ) com máscara
  const handleDocumentoChange = (e) => {
    const formatted = formatDocumento(e.target.value);
    setDocumento(formatted);
  };

  return (
    <div className="p-8">
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

        <Button 
          variant="outline" 
          onClick={() => {
            const dataToExport = sortedFornecedores.map(f => {
              const stats = getEstatisticasFornecedor(f.nome);
              return {
                nome: f.nome,
                telefone: f.telefone || "",
                email: f.email || "",
                documento: f.documento || f.cnpj || "",
                total_gasto: stats.totalGasto,
                qtd_compras: stats.qtdCompras,
                ultima_compra: stats.ultimaCompra ? stats.ultimaCompra.toLocaleDateString("pt-BR") : ""
              };
            });
            exportToExcel(dataToExport, "fornecedores", {
              nome: "Nome",
              telefone: "Telefone",
              email: "Email",
              documento: "CPF/CNPJ",
              total_gasto: "Total Gasto",
              qtd_compras: "Qtd Compras",
              ultima_compra: "Última Compra"
            });
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
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
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead className="text-center">Compras</TableHead>
                <TableHead className="text-right">Total Gasto</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalPaginatedFornecedores.map(fornecedor => {
                const stats = getEstatisticasFornecedor(fornecedor.nome);
                const doc = fornecedor.documento || fornecedor.cnpj || "";
                const tipoDoc = getTipoDocumento(doc);
                
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
                    <TableCell>
                      {doc ? (
                        <div className="text-sm">
                          <span className="text-xs text-muted-foreground">{tipoDoc}: </span>
                          <span className="font-mono">{doc}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
              <Label>CPF ou CNPJ</Label>
              <Input
                value={documento}
                onChange={handleDocumentoChange}
                placeholder="CPF: XXX.XXX.XXX-XX ou CNPJ: XX.XXX.XXX/XXXX-XX"
                className="mt-1 font-mono"
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {documento ? `Tipo detectado: ${getTipoDocumento(documento)}` : "Digite o documento do fornecedor"}
              </p>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="(XX) X.XXXX-XXXX"
                className="mt-1 font-mono"
                maxLength={17}
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
