import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import axios from "axios";
import { 
  Search, Grid3X3, List, Clock, Truck, CheckCircle, XCircle, 
  Package, User, Phone, MapPin, CreditCard, Banknote, QrCode,
  Calendar, X, ChevronRight, ShoppingBag, UtensilsCrossed, MessageCircle, Bike, Store, RefreshCw
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

const API = '/api';

// Status dos pedidos com suas cores e ícones
const statusConfig = {
  producao: { 
    label: "Em Produção", 
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock 
  },
  transito: { 
    label: "Em Trânsito", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Truck 
  },
  concluido: { 
    label: "Concluído", 
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle 
  },
  cancelado: { 
    label: "Cancelado", 
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle 
  },
  // Status legado do Delivery
  aguardando: { 
    label: "Em Produção", 
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock 
  },
};

// Formas de pagamento
const formasPagamento = {
  dinheiro: { label: "Dinheiro", icon: Banknote },
  cartao: { label: "Cartão", icon: CreditCard },
  pix: { label: "PIX", icon: QrCode },
};

// Módulos de origem
const modulosConfig = {
  Delivery: { label: "Delivery", icon: Bike, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  Balcao: { label: "Balcão", icon: Store, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  Mesas: { label: "Mesas", icon: UtensilsCrossed, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ChatBot: { label: "ChatBot", icon: MessageCircle, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  Cardapio: { label: "Cardápio Online", icon: ShoppingBag, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grade"); // "grade" ou "lista"
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [cancelError, setCancelError] = useState("");
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchPedidos();
    
    // Listener custom para mesma aba
    const handlePedidosUpdate = () => {
      fetchPedidos();
    };
    
    window.addEventListener('pedidosUpdated', handlePedidosUpdate);
    
    // Verificar a cada 5 segundos se há novos pedidos
    const interval = setInterval(fetchPedidos, 5000);
    
    return () => {
      window.removeEventListener('pedidosUpdated', handlePedidosUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchPedidos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/pedidos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      // Transformar dados do backend para o formato esperado pelo frontend
      const pedidosFormatados = response.data.map(p => ({
        id: p.id,
        codigo: p.codigo,
        cliente: {
          id: p.cliente_id,
          nome: p.cliente_nome,
          telefone: p.cliente_telefone,
          email: p.cliente_email
        },
        items: p.items || [],
        total: p.total,
        status: p.status,
        formaPagamento: p.forma_pagamento,
        troco: p.troco_precisa ? {
          precisa: p.troco_precisa,
          valor: p.troco_valor
        } : null,
        tipoEntrega: p.tipo_entrega,
        endereco: p.endereco_rua ? {
          label: p.endereco_label,
          endereco: p.endereco_rua,
          numero: p.endereco_numero,
          complemento: p.endereco_complemento,
          bairro: p.endereco_bairro,
          cep: p.endereco_cep
        } : null,
        modulo: p.modulo,
        observacao: p.observacao,
        created_at: p.created_at
      }));
      
      setPedidos(pedidosFormatados);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePedidoStatus = async (pedidoId, newStatus) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status?status=${newStatus}`);
      await fetchPedidos();
      toast.success("Status atualizado!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  // Formatar data e hora
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // Filtrar pedidos
  const filteredPedidos = pedidos
    .filter(p => {
      // Filtro por status
      if (filterStatus !== "todos") {
        // Mapear status legado
        const normalizedStatus = p.status === "aguardando" ? "producao" : p.status;
        if (normalizedStatus !== filterStatus) return false;
      }
      
      // Filtro por busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          p.codigo?.toLowerCase().includes(search) ||
          p.cliente?.nome?.toLowerCase().includes(search) ||
          p.cliente?.telefone?.includes(search)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Mais recente primeiro

  // Pedidos paginados
  const paginatedPedidos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPedidos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPedidos, currentPage, itemsPerPage]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Abrir detalhes do pedido
  const handleOpenDetails = (pedido) => {
    setSelectedPedido(pedido);
    setDetailsOpen(true);
  };

  // Alterar status do pedido
  const handleChangeStatus = async (pedidoId, newStatus) => {
    try {
      await updatePedidoStatus(pedidoId, newStatus);
      
      // Atualizar pedido selecionado se estiver aberto
      if (selectedPedido?.id === pedidoId) {
        setSelectedPedido({ ...selectedPedido, status: newStatus });
      }
      
      toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  // Cancelar pedido com validação de senha admin
  const handleCancelPedido = async () => {
    if (!selectedPedido) return;
    
    setCancelError("");
    
    // Validar senha do admin
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username: "admin",
        password: adminPassword
      });
      
      if (response.data.access_token) {
        // Senha válida, cancelar pedido
        await handleChangeStatus(selectedPedido.id, "cancelado");
        setCancelDialogOpen(false);
        setAdminPassword("");
        toast.success("Pedido cancelado com sucesso!");
      }
    } catch (error) {
      // Tentar com outro usuário proprietario
      try {
        const token = localStorage.getItem("token");
        if (token) {
          // Verificar se usuário logado é admin/proprietario
          const userStr = localStorage.getItem("user");
          const user = userStr ? JSON.parse(userStr) : null;
          
          if (user && (user.role === "proprietario" || user.role === "administrador")) {
            // Validar a senha do usuário logado
            const loginResp = await axios.post(`${API}/auth/login`, {
              username: user.username,
              password: adminPassword
            });
            
            if (loginResp.data.access_token) {
              await handleChangeStatus(selectedPedido.id, "cancelado");
              setCancelDialogOpen(false);
              setAdminPassword("");
              toast.success("Pedido cancelado com sucesso!");
              return;
            }
          }
        }
        setCancelError("Senha incorreta. Digite a senha do administrador.");
      } catch (e) {
        setCancelError("Senha incorreta. Digite a senha do administrador.");
      }
    }
  };

  // Obter estatísticas
  const stats = {
    total: pedidos.length,
    producao: pedidos.filter(p => p.status === "producao" || p.status === "aguardando").length,
    transito: pedidos.filter(p => p.status === "transito").length,
    concluido: pedidos.filter(p => p.status === "concluido").length,
    cancelado: pedidos.filter(p => p.status === "cancelado").length,
  };

  // Normalizar status para exibição
  const getNormalizedStatus = (status) => {
    if (status === "aguardando") return "producao";
    return status;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Gerencie todos os pedidos realizados</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchPedidos}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">Em Produção</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.producao}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">Em Trânsito</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.transito}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-700 dark:text-green-400">Concluídos</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.concluido}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">Cancelados</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.cancelado}</p>
        </div>
      </div>

      {/* Filtros e Controles */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, cliente ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="producao">Em Produção</SelectItem>
            <SelectItem value="transito">Em Trânsito</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>

        {/* Switch Grade/Lista */}
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setViewMode("grade")}
            className={`px-3 py-2 flex items-center gap-2 transition-colors ${
              viewMode === "grade" 
                ? "bg-primary text-primary-foreground" 
                : "bg-background hover:bg-muted"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Grade
          </button>
          <button
            onClick={() => setViewMode("lista")}
            className={`px-3 py-2 flex items-center gap-2 transition-colors border-l ${
              viewMode === "lista" 
                ? "bg-primary text-primary-foreground" 
                : "bg-background hover:bg-muted"
            }`}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {filteredPedidos.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterStatus !== "todos" 
              ? "Tente ajustar os filtros de busca" 
              : "Os pedidos realizados aparecerão aqui"}
          </p>
        </div>
      ) : viewMode === "grade" ? (
        /* Visualização em Grade */
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedPedidos.map(pedido => {
            const status = statusConfig[getNormalizedStatus(pedido.status)] || statusConfig.producao;
            const StatusIcon = status.icon;
            const pagamento = formasPagamento[pedido.formaPagamento];
            const modulo = modulosConfig[pedido.modulo];
            const ModuloIcon = modulo?.icon || Package;
            
            return (
              <div 
                key={pedido.id}
                onClick={() => handleOpenDetails(pedido)}
                className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                {/* Header com código e status */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg">{pedido.codigo || "#-----"}</span>
                    {modulo && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${modulo.color}`}>
                        <ModuloIcon className="w-3 h-3" />
                        {modulo.label}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
                
                {/* Conteúdo */}
                <div className="p-4 space-y-3">
                  {/* Cliente */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {pedido.cliente?.foto ? (
                        <img src={pedido.cliente.foto} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pedido.cliente?.nome || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">{pedido.cliente?.telefone}</p>
                    </div>
                  </div>
                  
                  {/* Itens */}
                  <div className="text-sm text-muted-foreground">
                    <Package className="w-3 h-3 inline mr-1" />
                    {pedido.items?.length || 0} item(s)
                  </div>
                  
                  {/* Data/Hora */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateTime(pedido.created_at)}
                  </div>
                </div>
                
                {/* Footer com total */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {pagamento?.icon && <pagamento.icon className="w-4 h-4" />}
                    {pagamento?.label || pedido.formaPagamento}
                  </div>
                  <span className="font-bold text-lg text-primary">
                    R$ {(pedido.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Paginação para Grade */}
        {filteredPedidos.length > 0 && (
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden mt-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredPedidos.length}
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
      ) : (
        /* Visualização em Lista */
        <>
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead className="w-24">Módulo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-32">Data/Hora</TableHead>
                <TableHead className="w-20 text-center">Itens</TableHead>
                <TableHead className="w-28">Pagamento</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPedidos.map(pedido => {
                const status = statusConfig[getNormalizedStatus(pedido.status)] || statusConfig.producao;
                const StatusIcon = status.icon;
                const pagamento = formasPagamento[pedido.formaPagamento];
                const modulo = modulosConfig[pedido.modulo];
                const ModuloIcon = modulo?.icon || Package;
                
                return (
                  <TableRow 
                    key={pedido.id}
                    onClick={() => handleOpenDetails(pedido)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-mono font-bold">{pedido.codigo || "#-----"}</TableCell>
                    <TableCell>
                      {modulo ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 w-fit ${modulo.color}`}>
                          <ModuloIcon className="w-3 h-3" />
                          {modulo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {pedido.cliente?.foto ? (
                            <img src={pedido.cliente.foto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{pedido.cliente?.nome}</p>
                          <p className="text-xs text-muted-foreground">{pedido.cliente?.telefone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(pedido.created_at)}</TableCell>
                    <TableCell className="text-center">{pedido.items?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {pagamento?.icon && <pagamento.icon className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm">{pagamento?.label || pedido.formaPagamento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">R$ {(pedido.total || 0).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {/* Paginação para Lista */}
          {filteredPedidos.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredPedidos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
        </>
      )}

      {/* Dialog Detalhes do Pedido */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl">{selectedPedido?.codigo || "#-----"}</span>
                {selectedPedido?.modulo && modulosConfig[selectedPedido.modulo] && (
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${modulosConfig[selectedPedido.modulo].color}`}>
                    {(() => {
                      const Icon = modulosConfig[selectedPedido.modulo].icon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {modulosConfig[selectedPedido.modulo].label}
                  </span>
                )}
              </div>
              {selectedPedido && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[getNormalizedStatus(selectedPedido.status)]?.color}`}>
                  {statusConfig[getNormalizedStatus(selectedPedido.status)]?.label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-6 mt-4">
              {/* Informações do Cliente */}
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente
                </h4>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {selectedPedido.cliente?.foto ? (
                      <img src={selectedPedido.cliente.foto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-lg">{selectedPedido.cliente?.nome}</p>
                    {selectedPedido.cliente?.telefone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedPedido.cliente.telefone}
                      </p>
                    )}
                    {(selectedPedido.cliente?.endereco || selectedPedido.cliente?.bairro) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {[
                          selectedPedido.cliente.endereco,
                          selectedPedido.cliente.numero,
                          selectedPedido.cliente.complemento,
                          selectedPedido.cliente.bairro
                        ].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Itens do Pedido
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-20 text-center">Qtd</TableHead>
                        <TableHead className="w-28 text-right">Preço</TableHead>
                        <TableHead className="w-28 text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPedido.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.observation && (
                                <p className="text-xs text-muted-foreground">Obs: {item.observation}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">R$ {(item.sale_price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {((item.sale_price || 0) * item.quantity).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Observações */}
              {selectedPedido.observacoes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-400">Observações</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{selectedPedido.observacoes}</p>
                </div>
              )}

              {/* Pagamento e Total */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      {formasPagamento[selectedPedido.formaPagamento]?.icon && (
                        <span className="text-muted-foreground">
                          {(() => {
                            const Icon = formasPagamento[selectedPedido.formaPagamento].icon;
                            return <Icon className="w-5 h-5" />;
                          })()}
                        </span>
                      )}
                      {formasPagamento[selectedPedido.formaPagamento]?.label || selectedPedido.formaPagamento}
                    </p>
                    {/* Info de Troco */}
                    {selectedPedido.troco && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {selectedPedido.troco.precisa 
                          ? `💵 Troco para R$ ${selectedPedido.troco.valor?.toFixed(2) || '0.00'}` 
                          : '✓ Não precisa de troco'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total do Pedido</p>
                    <p className="text-3xl font-bold text-primary">R$ {(selectedPedido.total || 0).toFixed(2)}</p>
                    {selectedPedido.troco?.precisa && selectedPedido.troco.valor && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Troco: R$ {(selectedPedido.troco.valor - (selectedPedido.total || 0)).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Data/Hora */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Pedido realizado em {formatDateTime(selectedPedido.created_at)}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-3 pt-4 border-t">
                {/* Alterar Status */}
                {getNormalizedStatus(selectedPedido.status) !== "cancelado" && (
                  <Select 
                    value={getNormalizedStatus(selectedPedido.status)} 
                    onValueChange={(value) => handleChangeStatus(selectedPedido.id, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Alterar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Em Produção</SelectItem>
                      <SelectItem value="transito">Em Trânsito</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <div className="flex-1" />
                
                {/* Botão Cancelar */}
                {getNormalizedStatus(selectedPedido.status) !== "cancelado" && 
                 getNormalizedStatus(selectedPedido.status) !== "concluido" && (
                  <Button 
                    variant="destructive" 
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar Pedido
                  </Button>
                )}
                
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o pedido {selectedPedido?.codigo}? 
              O pedido não será excluído, apenas terá seu status alterado para "Cancelado".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelPedido}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
