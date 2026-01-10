import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, User, Phone, MapPin, Calendar, X, MoreVertical, Download, ImageOff, Mail
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

// URL relativa - funciona em qualquer domínio

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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
        total_gasto: 0
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

  const filteredClientes = useMemo(() => {
    return clientes.filter(c =>
      c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telefone && c.telefone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.cpf && c.cpf.includes(searchTerm))
    );
  }, [clientes, searchTerm]);

  // Clientes paginados
  const paginatedClientes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClientes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClientes, currentPage, itemsPerPage]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, telefone, email ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
          Exportar Excel
        </Button>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total de Clientes</p>
          <p className="text-2xl font-bold">{clientes.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Cadastrados este mês</p>
          <p className="text-2xl font-bold">
            {clientes.filter(c => {
              const date = new Date(c.created_at);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Com Pedidos</p>
          <p className="text-2xl font-bold">
            {clientes.filter(c => c.pedidos_count > 0).length}
          </p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClientes.map(cliente => (
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
                    {cliente.telefone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {cliente.telefone}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {cliente.cpf || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(cliente.created_at)}
                    </span>
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
              ))}
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
