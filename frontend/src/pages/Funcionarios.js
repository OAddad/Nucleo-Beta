import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Search, Plus, User, Phone, Mail, Briefcase, Trash2, 
  Edit, X, Check, Bike, ChefHat, UserCog, Users
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

// Cargos disponíveis
const CARGOS = [
  { value: "entregador", label: "Entregador", icon: Bike, color: "text-purple-500 bg-purple-500/10" },
  { value: "cozinheiro", label: "Cozinheiro", icon: ChefHat, color: "text-orange-500 bg-orange-500/10" },
  { value: "atendente", label: "Atendente", icon: User, color: "text-blue-500 bg-blue-500/10" },
  { value: "gerente", label: "Gerente", icon: UserCog, color: "text-green-500 bg-green-500/10" },
];

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal de cadastro
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [cargoSelecionado, setCargoSelecionado] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState(null);
  const [novoCargoEdit, setNovoCargoEdit] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [funcRes, clientesRes] = await Promise.all([
        axios.get(`${API}/funcionarios`),
        axios.get(`${API}/clientes`)
      ]);
      setFuncionarios(funcRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar funcionários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Buscar clientes quando digitar
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      const term = clienteSearch.toLowerCase();
      // Filtrar clientes que ainda não são funcionários
      const funcionariosClienteIds = funcionarios.map(f => f.cliente_id);
      const sugeridos = clientes
        .filter(c => !funcionariosClienteIds.includes(c.id))
        .filter(c => 
          c.nome?.toLowerCase().includes(term) ||
          c.telefone?.includes(term) ||
          c.email?.toLowerCase().includes(term)
        )
        .slice(0, 5);
      setClientesSugeridos(sugeridos);
    } else {
      setClientesSugeridos([]);
    }
  }, [clienteSearch, clientes, funcionarios]);

  const handleAbrirModal = () => {
    setClienteSearch("");
    setClienteSelecionado(null);
    setCargoSelecionado("");
    setClientesSugeridos([]);
    setModalOpen(true);
  };

  const handleSelecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setClienteSearch(cliente.nome);
    setClientesSugeridos([]);
  };

  const handleCadastrar = async () => {
    if (!clienteSelecionado) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!cargoSelecionado) {
      toast.error("Selecione um cargo");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/funcionarios`, {
        cliente_id: clienteSelecionado.id,
        cargo: cargoSelecionado
      }, getAuthHeader());
      
      toast.success("Funcionário cadastrado com sucesso!");
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao cadastrar funcionário");
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirEdicao = (funcionario) => {
    setFuncionarioEditando(funcionario);
    setNovoCargoEdit(funcionario.cargo);
    setEditModalOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!funcionarioEditando) return;
    
    setSaving(true);
    try {
      await axios.put(`${API}/funcionarios/${funcionarioEditando.id}`, {
        cargo: novoCargoEdit
      }, getAuthHeader());
      
      toast.success("Cargo atualizado!");
      setEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar funcionário");
    } finally {
      setSaving(false);
    }
  };

  const handleRemover = async (funcionario) => {
    if (!confirm(`Deseja remover ${funcionario.nome} da equipe?`)) return;
    
    try {
      await axios.delete(`${API}/funcionarios/${funcionario.id}`, getAuthHeader());
      toast.success("Funcionário removido!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover funcionário");
    }
  };

  const getCargoInfo = (cargo) => {
    return CARGOS.find(c => c.value === cargo?.toLowerCase()) || CARGOS[0];
  };

  // Filtrar funcionários
  const funcionariosFiltrados = funcionarios.filter(f => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      f.nome?.toLowerCase().includes(term) ||
      f.cargo?.toLowerCase().includes(term) ||
      f.telefone?.includes(term)
    );
  });

  // Agrupar por cargo
  const funcionariosPorCargo = CARGOS.map(cargo => ({
    ...cargo,
    funcionarios: funcionariosFiltrados.filter(f => f.cargo?.toLowerCase() === cargo.value)
  })).filter(g => g.funcionarios.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Funcionários
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie sua equipe e atribua cargos
          </p>
        </div>
        <Button onClick={handleAbrirModal} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Cadastrar Funcionário
        </Button>
      </div>

      {/* Barra de busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar funcionário por nome, cargo ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Funcionários por Cargo */}
      {funcionariosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border-2 border-dashed">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum funcionário cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Cadastre funcionários a partir dos clientes existentes
          </p>
          <Button onClick={handleAbrirModal} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar primeiro funcionário
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {funcionariosPorCargo.map(grupo => {
            const IconComponent = grupo.icon;
            return (
              <div key={grupo.value}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${grupo.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-lg">{grupo.label}s</h2>
                  <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-medium">
                    {grupo.funcionarios.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grupo.funcionarios.map(funcionario => {
                    const cargoInfo = getCargoInfo(funcionario.cargo);
                    const CargoIcon = cargoInfo.icon;
                    
                    return (
                      <div
                        key={funcionario.id}
                        className="bg-card rounded-xl border p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {funcionario.foto ? (
                              <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{funcionario.nome}</h3>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cargoInfo.color}`}>
                              <CargoIcon className="w-3 h-3" />
                              {cargoInfo.label}
                            </div>
                            
                            {funcionario.telefone && (
                              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {funcionario.telefone}
                              </p>
                            )}
                            {funcionario.email && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3" />
                                {funcionario.email}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Ações */}
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleAbrirEdicao(funcionario)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar Cargo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemover(funcionario)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Cadastrar Funcionário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca de Cliente */}
            <div>
              <Label>Buscar Cliente *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome, telefone ou email..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setClienteSelecionado(null);
                  }}
                  className="pl-9"
                />
                
                {/* Lista de sugestões */}
                {clientesSugeridos.length > 0 && !clienteSelecionado && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
                    {clientesSugeridos.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => handleSelecionarCliente(cliente)}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {cliente.foto ? (
                            <img src={cliente.foto} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{cliente.nome}</p>
                          <p className="text-xs text-muted-foreground">{cliente.telefone || cliente.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Cliente selecionado */}
              {clienteSelecionado && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {clienteSelecionado.foto ? (
                      <img src={clienteSelecionado.foto} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{clienteSelecionado.nome}</p>
                    <p className="text-xs text-muted-foreground">{clienteSelecionado.telefone}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setClienteSelecionado(null);
                      setClienteSearch("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Seleção de Cargo */}
            <div>
              <Label>Cargo *</Label>
              <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o cargo..." />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map(cargo => {
                    const IconComponent = cargo.icon;
                    return (
                      <SelectItem key={cargo.value} value={cargo.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {cargo.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {cargoSelecionado === "entregador" && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Bike className="w-3 h-3" />
                  Este funcionário aparecerá na aba Delivery
                </p>
              )}
            </div>
            
            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCadastrar}
                disabled={!clienteSelecionado || !cargoSelecionado || saving}
              >
                {saving ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Cargo
            </DialogTitle>
          </DialogHeader>
          
          {funcionarioEditando && (
            <div className="space-y-4">
              {/* Info do funcionário */}
              <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {funcionarioEditando.foto ? (
                    <img src={funcionarioEditando.foto} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{funcionarioEditando.nome}</p>
                  <p className="text-xs text-muted-foreground">{funcionarioEditando.telefone}</p>
                </div>
              </div>
              
              {/* Seleção de Cargo */}
              <div>
                <Label>Novo Cargo</Label>
                <Select value={novoCargoEdit} onValueChange={setNovoCargoEdit}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARGOS.map(cargo => {
                      const IconComponent = cargo.icon;
                      return (
                        <SelectItem key={cargo.value} value={cargo.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {cargo.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {novoCargoEdit === "entregador" && funcionarioEditando.cargo?.toLowerCase() !== "entregador" && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Este funcionário passará a aparecer na aba Delivery
                  </p>
                )}
                {novoCargoEdit !== "entregador" && funcionarioEditando.cargo?.toLowerCase() === "entregador" && (
                  <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                    <Bike className="w-3 h-3" />
                    Este funcionário será removido da aba Delivery
                  </p>
                )}
              </div>
              
              {/* Botões */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSalvarEdicao}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
