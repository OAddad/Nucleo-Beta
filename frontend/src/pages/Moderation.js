import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Eye, UserCog, AlertCircle, CheckCircle, Info, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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

const getRoleBadgeColor = (role) => {
  switch (role) {
    case "proprietario":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    case "administrador":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "observador":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getRoleIcon = (role) => {
  switch (role) {
    case "proprietario":
      return <UserCog className="w-4 h-4" />;
    case "administrador":
      return <Shield className="w-4 h-4" />;
    case "observador":
      return <Eye className="w-4 h-4" />;
    default:
      return null;
  }
};

const getRoleLabel = (role) => {
  switch (role) {
    case "proprietario":
      return "Proprietário";
    case "administrador":
      return "Administrador";
    case "observador":
      return "Observador";
    default:
      return role;
  }
};

const getPriorityBadge = (priority) => {
  switch (priority) {
    case "alta":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
          <AlertCircle className="w-3 h-3" />
          Alta
        </span>
      );
    case "media":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
          <Info className="w-3 h-3" />
          Média
        </span>
      );
    case "baixa":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="w-3 h-3" />
          Baixa
        </span>
      );
    default:
      return priority;
  }
};

const getActionLabel = (action) => {
  switch (action) {
    case "CREATE":
      return "Cadastrado";
    case "UPDATE":
      return "Atualizado";
    case "DELETE":
      return "Deletado";
    default:
      return action;
  }
};

const getResourceTypeLabel = (type) => {
  switch (type) {
    case "ingredient":
      return "Ingrediente";
    case "product":
      return "Produto";
    case "purchase":
      return "Compra";
    case "user":
      return "Usuário";
    default:
      return type;
  }
};

export default function Moderation() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("observador");
  const [oldPassword, setOldPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  
  // Filtros de auditoria
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterUser, setFilterUser] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    loadCurrentUser();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const loadCurrentUser = () => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await axios.get(`${API}/audit-logs`, getAuthHeader());
      setAuditLogs(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Você não tem permissão para ver logs de auditoria");
      } else {
        toast.error("Erro ao carregar logs de auditoria");
      }
    }
  };

  const fetchUsers = async () => {
    // Só buscar se for proprietário
    if (currentUser?.role !== "proprietario") {
      return;
    }
    
    try {
      const response = await axios.get(`${API}/users/management`, getAuthHeader());
      setUsers(response.data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    }
  };


  const getFilteredAndSortedLogs = () => {
    let filtered = [...auditLogs];
    
    // Filtrar por usuário
    if (filterUser !== "all") {
      filtered = filtered.filter(log => log.username === filterUser);
    }
    
    // Filtrar por prioridade
    if (filterPriority !== "all") {
      filtered = filtered.filter(log => log.priority === filterPriority);
    }
    
    // Ordenar por data
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  };

  const getUniqueUsers = () => {
    const usernames = [...new Set(auditLogs.map(log => log.username))];
    return usernames.sort();
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${API}/users/create`,
        {
          username: newUsername,
          password: newPassword,
          role: newRole,
        },
        getAuthHeader()
      );
      toast.success("Usuário criado com sucesso!");
      setNewUsername("");
      setNewPassword("");
      setNewRole("observador");
      setOpen(false);
      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await axios.delete(`${API}/users/${userToDelete.id}`, getAuthHeader());
      toast.success("Usuário excluído!");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao excluir usuário");
    }
  };

  const confirmDeleteUser = (userId, username) => {
    setUserToDelete({ id: userId, username });
    setDeleteDialogOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(
        `${API}/users/change-password`,
        {
          old_password: oldPassword,
          new_password: changeNewPassword,
        },
        getAuthHeader()
      );
      toast.success("Senha alterada com sucesso!");
      setOldPassword("");
      setChangeNewPassword("");
      setOpenPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await axios.put(
        `${API}/users/${userId}/role`,
        { role: newRole },
        getAuthHeader()
      );
      toast.success("Cargo atualizado!");
      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar cargo");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isProprietario = currentUser?.role === "proprietario";

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full overflow-auto" data-testid="moderation-page">
      <div className="max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Auditoria</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie usuários e visualize logs de auditoria
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => exportToExcel(auditLogs, "auditoria", {
                timestamp: "Data/Hora",
                username: "Usuário",
                action: "Ação",
                resource_type: "Tipo",
                resource_name: "Recurso",
                priority: "Prioridade"
              })}
              className="shadow-sm flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button
              onClick={() => setOpenPassword(true)}
              variant="outline"
              className="shadow-sm flex-1 sm:flex-none"
            >
              <Shield className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Alterar Senha
            </Button>
          </div>
        </div>

        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="users" disabled={!isProprietario}>
              Usuários {!isProprietario && "(Apenas Proprietário)"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="mt-4">
            {/* Filtros */}
            {auditLogs.length > 0 && (
              <div className="bg-card rounded-xl border shadow-sm p-3 md:p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  {/* Ordenação */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Label htmlFor="sort-order" className="text-sm font-medium whitespace-nowrap">
                      Ordenar:
                    </Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger id="sort-order" className="w-32 md:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Mais Recentes</SelectItem>
                        <SelectItem value="asc">Mais Antigas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Usuário */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Label htmlFor="filter-user" className="text-sm font-medium whitespace-nowrap">
                      Usuário:
                    </Label>
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger id="filter-user" className="w-32 md:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {getUniqueUsers().map((username) => (
                          <SelectItem key={username} value={username}>
                            {username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Prioridade */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Label htmlFor="filter-priority" className="text-sm font-medium whitespace-nowrap">
                      Prioridade:
                    </Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger id="filter-priority" className="w-32 md:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap min-w-[140px]">Data/Hora</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[80px]">Ação</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[100px]">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[120px]">Recurso</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[100px]">Usuário</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[80px]">Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAndSortedLogs().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum log encontrado com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredAndSortedLogs().map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs md:text-sm whitespace-nowrap">
                            {formatDate(log.timestamp)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-medium">{getActionLabel(log.action)}</span>
                          </TableCell>
                          <TableCell className="text-sm">{getResourceTypeLabel(log.resource_type)}</TableCell>
                          <TableCell className="font-medium text-sm truncate max-w-[150px]">{log.resource_name}</TableCell>
                          <TableCell className="text-sm">{log.username}</TableCell>
                          <TableCell>{getPriorityBadge(log.priority)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="bg-card rounded-xl border shadow-sm p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg md:text-xl font-semibold">Gerenciar Usuários</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="shadow-sm w-full sm:w-auto">
                      <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="username">Nome de Usuário</Label>
                        <Input
                          id="username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Digite o nome de usuário"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Digite a senha"
                          required
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Copie esta senha e repasse ao usuário
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="role">Cargo</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proprietario">Proprietário</SelectItem>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="observador">Observador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Criando..." : "Criar Usuário"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Senha: {user.password}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleUpdateRole(user.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proprietario">Proprietário</SelectItem>
                          <SelectItem value="administrador">Administrador</SelectItem>
                          <SelectItem value="observador">Observador</SelectItem>
                        </SelectContent>
                      </Select>
                      {user.id !== currentUser?.id && (
                        <Button
                          onClick={() => confirmDeleteUser(user.id, user.username)}
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog para trocar senha */}
        <Dialog open={openPassword} onOpenChange={setOpenPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Minha Senha</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="old_password">Senha Atual</Label>
                <Input
                  id="old_password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new_password">Nova Senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={changeNewPassword}
                  onChange={(e) => setChangeNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* AlertDialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário <strong>{userToDelete?.username}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
