import { useState, useRef, useEffect } from "react";
import { User, Star, Settings, ShoppingBag, LogOut, Moon, Sun, X, Loader2, ImageOff, Award, Phone, Mail, MapPin, Calendar, Plus, Trash2, Home, Building, Edit2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const API = '/api';

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

// Modal de Edição de Conta (Réplica do popup de Clientes)
function EditAccountModal({ isOpen, onClose, client, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [fotoPreview, setFotoPreview] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  
  // Estados para múltiplos endereços
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [newAddr, setNewAddr] = useState({ label: 'Casa', endereco: '', numero: '', complemento: '', bairro: '', cep: '' });

  useEffect(() => {
    if (client && isOpen) {
      setNome(client.nome || "");
      setTelefone(client.telefone || "");
      setEmail(client.email || "");
      setCpf(client.cpf || "");
      setDataNascimento(client.data_nascimento || "");
      setGenero(client.genero || "");
      setFotoPreview(client.foto || "");
      setEndereco(client.endereco || "");
      setNumero(client.numero || "");
      setComplemento(client.complemento || "");
      setBairro(client.bairro || "");
      setCep(client.cep || "");
      fetchAddresses();
    }
  }, [client, isOpen]);
  
  const fetchAddresses = async () => {
    if (!client?.id) return;
    setLoadingAddresses(true);
    try {
      const response = await axios.get(`${API}/client-addresses/${client.id}`);
      setAddresses(response.data);
    } catch (error) {
      console.error("Erro ao carregar endereços:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };
  
  const handleSaveNewAddress = async () => {
    if (!newAddr.endereco || !newAddr.bairro) {
      toast.error("Preencha o endereço e bairro");
      return;
    }
    try {
      const response = await axios.post(`${API}/client-addresses`, {
        client_id: client.id,
        ...newAddr,
        is_default: addresses.length === 0
      });
      setAddresses(prev => [response.data, ...prev]);
      setShowNewAddress(false);
      setNewAddr({ label: 'Casa', endereco: '', numero: '', complemento: '', bairro: '', cep: '' });
      toast.success("Endereço adicionado!");
    } catch (error) {
      toast.error("Erro ao salvar endereço");
    }
  };
  
  const handleUpdateAddress = async () => {
    if (!editingAddress) return;
    try {
      const response = await axios.put(`${API}/client-addresses/${editingAddress.id}`, editingAddress);
      setAddresses(prev => prev.map(a => a.id === editingAddress.id ? response.data : a));
      setEditingAddress(null);
      toast.success("Endereço atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar endereço");
    }
  };
  
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Deseja excluir este endereço?")) return;
    try {
      await axios.delete(`${API}/client-addresses/${addressId}`);
      setAddresses(prev => prev.filter(a => a.id !== addressId));
      toast.success("Endereço excluído!");
    } catch (error) {
      toast.error("Erro ao excluir endereço");
    }
  };
  
  const handleSetDefault = async (addressId) => {
    try {
      await axios.put(`${API}/client-addresses/${addressId}`, { is_default: true });
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addressId })));
      toast.success("Endereço padrão definido!");
    } catch (error) {
      toast.error("Erro ao definir endereço padrão");
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    if (!telefone.trim()) {
      toast.error("Informe seu telefone");
      return;
    }

    setLoading(true);
    
    try {
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
        // Manter pontuação original - não pode editar
        pontuacao: client?.pontuacao || 0,
      };

      const response = await axios.put(`${API}/clientes/${client.id}`, clienteData);
      localStorage.setItem("client", JSON.stringify(response.data));
      onUpdate(response.data);
      toast.success("Conta atualizada com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
      toast.error("Erro ao atualizar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Minha Conta</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {/* Primeira Linha: Foto, Nome e Gênero */}
          <div className="flex gap-6">
            {/* Foto do Cliente */}
            <div className="flex-shrink-0">
              <Label className="text-sm text-muted-foreground">Minha Foto</Label>
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
                    placeholder="Seu nome completo"
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
                  placeholder="seu.email@exemplo.com"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Segunda Linha: Telefone, CPF, Data de Nascimento e Pontuação (somente visualização) */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Telefone *</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(XX) 9.XXXX-XXXX"
                className="mt-1"
                maxLength={16}
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="XXX.XXX.XXX-XX"
                className="mt-1"
                maxLength={14}
              />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input
                value={dataNascimento}
                onChange={(e) => setDataNascimento(formatData(e.target.value))}
                placeholder="DD/MM/AAAA"
                className="mt-1"
                maxLength={10}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Award className="w-3 h-3 text-purple-500" />
                Minha Pontuação
              </Label>
              <div className="mt-1 h-10 flex items-center px-3 bg-muted rounded-md border">
                <span className="font-semibold text-purple-600">{(client?.pontuacao || 0).toLocaleString('pt-BR')} pontos</span>
              </div>
            </div>
          </div>

          {/* Terceira Linha: Endereços */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Endereço de Entrega</Label>
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
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  placeholder="XXXXX-XXX"
                  className="mt-1"
                  maxLength={9}
                />
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal de Pontuação
function PontuacaoModal({ isOpen, onClose, client }) {
  if (!isOpen) return null;

  const pontos = client?.pontuacao || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 border">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Minha Pontuação
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Star className="w-12 h-12 text-white" />
          </div>
          <p className="text-muted-foreground mb-2">Você tem</p>
          <p className="text-5xl font-bold text-primary mb-2">{pontos.toLocaleString('pt-BR')}</p>
          <p className="text-muted-foreground">pontos acumulados</p>
          
          <div className="mt-6 p-4 bg-muted rounded-lg text-left">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Como ganhar pontos?</strong><br />
              A cada compra você acumula pontos que podem ser trocados por descontos e benefícios exclusivos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de Meus Pedidos
function MeusPedidosModal({ isOpen, onClose, client }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    if (isOpen && client) {
      fetchPedidos();
    }
  }, [isOpen, client]);

  useEffect(() => {
    if (isOpen && client) {
      fetchPedidos();
    }
  }, [dataInicio, dataFim]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      let url = `${API}/orders?cliente_telefone=${encodeURIComponent(client?.telefone || "")}`;
      if (dataInicio) url += `&data_inicio=${dataInicio}`;
      if (dataFim) url += `&data_fim=${dataFim}`;
      
      const response = await axios.get(url);
      setPedidos(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Meus Pedidos
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Filtros de Data */}
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1">
            <Label className="text-xs">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
        </div>
        
        {/* Lista de Pedidos */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
              <p className="text-muted-foreground text-sm">Faça seu primeiro pedido!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="bg-muted rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">Pedido #{pedido.numero || pedido.id?.slice(-6)}</p>
                      <p className="text-muted-foreground text-sm">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR')} às {new Date(pedido.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pedido.status === 'entregue' ? 'bg-green-500/20 text-green-600' :
                      pedido.status === 'cancelado' ? 'bg-red-500/20 text-red-600' :
                      'bg-yellow-500/20 text-yellow-600'
                    }`}>
                      {pedido.status || 'Em andamento'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {pedido.items?.map((item, i) => (
                      <span key={i}>{item.quantity}x {item.name}{i < pedido.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground text-sm">Total</span>
                    <span className="text-primary font-bold">
                      R$ {(pedido.total || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente Principal - Menu de Perfil
export default function ProfileMenu({ client, onLogout, onClientUpdate, darkMode, onToggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPontuacao, setShowPontuacao] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showPedidos, setShowPedidos] = useState(false);
  const menuRef = useRef(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("client");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
    toast.success("Você saiu da sua conta");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão do Perfil */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {client?.foto ? (
          <img 
            src={client.foto} 
            alt={client.nome}
            className="w-10 h-10 rounded-full object-cover border-2 border-orange-500"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center border-2 border-orange-500">
            <User className="w-5 h-5 text-zinc-400" />
          </div>
        )}
        <span className="text-sm font-medium hidden sm:block text-white">{client?.nome}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-800 rounded-xl shadow-2xl border border-zinc-700 overflow-hidden z-50">
          {/* Header do Menu */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center gap-3">
              {client?.foto ? (
                <img src={client.foto} alt={client.nome} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-zinc-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{client?.nome}</p>
                <p className="text-xs text-zinc-400">{client?.telefone}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => { setShowPontuacao(true); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700 transition-colors"
            >
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <span className="text-white">Pontuação</span>
                <p className="text-xs text-zinc-400">{(client?.pontuacao || 0).toLocaleString('pt-BR')} pontos</p>
              </div>
            </button>

            <button
              onClick={() => { setShowEditAccount(true); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700 transition-colors"
            >
              <Settings className="w-5 h-5 text-zinc-400" />
              <span className="text-white">Minha Conta</span>
            </button>

            <button
              onClick={() => { setShowPedidos(true); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700 transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-zinc-400" />
              <span className="text-white">Meus Pedidos</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="px-4 py-3 border-t border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5 text-zinc-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                <span className="text-white text-sm">Modo {darkMode ? 'Escuro' : 'Claro'}</span>
              </div>
              <button
                onClick={onToggleTheme}
                className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-orange-500' : 'bg-zinc-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-zinc-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
      <PontuacaoModal isOpen={showPontuacao} onClose={() => setShowPontuacao(false)} client={client} />
      <EditAccountModal isOpen={showEditAccount} onClose={() => setShowEditAccount(false)} client={client} onUpdate={onClientUpdate} />
      <MeusPedidosModal isOpen={showPedidos} onClose={() => setShowPedidos(false)} client={client} />
    </div>
  );
}
