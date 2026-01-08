import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, User, Phone, MapPin, Calendar, X, MoreVertical, Download
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { exportToExcel } from "../lib/utils";
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

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCliente, setCurrentCliente] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);
  
  // Form
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [email, setEmail] = useState("");

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

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setEndereco("");
    setComplemento("");
    setEmail("");
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
    setNome(cliente.nome);
    setTelefone(cliente.telefone || "");
    setEndereco(cliente.endereco || "");
    setComplemento(cliente.complemento || "");
    setEmail(cliente.email || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    if (editMode && currentCliente) {
      const updatedClientes = clientes.map(c =>
        c.id === currentCliente.id
          ? { ...c, nome, telefone, endereco, complemento, email }
          : c
      );
      saveClientes(updatedClientes);
      toast.success("Cliente atualizado!");
    } else {
      const novoCliente = {
        id: `cliente-${Date.now()}`,
        nome,
        telefone,
        endereco,
        complemento,
        email,
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

  const filteredClientes = clientes.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefone && c.telefone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            placeholder="Pesquisar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map(cliente => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{cliente.nome}</p>
                        {cliente.email && (
                          <p className="text-xs text-muted-foreground">{cliente.email}</p>
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
                    {cliente.endereco ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{cliente.endereco}</span>
                      </span>
                    ) : "-"}
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
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
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
                placeholder="email@exemplo.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Apt, bloco..."
                className="mt-1"
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              {editMode ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
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
