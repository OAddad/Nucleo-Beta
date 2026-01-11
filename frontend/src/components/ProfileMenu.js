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

      const response = await axios.put(`${API}/public/clientes/${client.id}`, clienteData);
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

          {/* Terceira Linha: Endereços Salvos */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Meus Endereços de Entrega</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowNewAddress(true)}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Novo Endereço
              </Button>
            </div>
            
            {/* Lista de Endereços */}
            {loadingAddresses ? (
              <div className="text-center py-4 text-muted-foreground">Carregando endereços...</div>
            ) : addresses.length === 0 && !showNewAddress ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum endereço cadastrado</p>
                <Button 
                  size="sm" 
                  variant="link"
                  onClick={() => setShowNewAddress(true)}
                  className="mt-2"
                >
                  Adicionar primeiro endereço
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {addresses.map(addr => (
                  <div 
                    key={addr.id} 
                    className={`p-3 rounded-lg border flex items-start gap-3 ${addr.is_default ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${addr.is_default ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {addr.label === 'Casa' ? <Home className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{addr.label}</span>
                        {addr.is_default && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Padrão</span>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {addr.endereco}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}
                      </p>
                      <p className="text-sm text-muted-foreground">{addr.bairro} - {addr.cep}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!addr.is_default && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetDefault(addr.id)} title="Definir como padrão">
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingAddress(addr)} title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAddress(addr.id)} title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Form de Novo Endereço */}
            {showNewAddress && (
              <div className="mt-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Novo Endereço</h4>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewAddress(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <button
                    onClick={() => setNewAddr(prev => ({ ...prev, label: 'Casa' }))}
                    className={`p-2 rounded border text-sm ${newAddr.label === 'Casa' ? 'border-primary bg-primary/10' : ''}`}
                  >
                    🏠 Casa
                  </button>
                  <button
                    onClick={() => setNewAddr(prev => ({ ...prev, label: 'Trabalho' }))}
                    className={`p-2 rounded border text-sm ${newAddr.label === 'Trabalho' ? 'border-primary bg-primary/10' : ''}`}
                  >
                    🏢 Trabalho
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Rua/Logradouro" value={newAddr.endereco} onChange={e => setNewAddr(prev => ({...prev, endereco: e.target.value}))} />
                  <Input className="col-span-2" placeholder="Nº" value={newAddr.numero} onChange={e => setNewAddr(prev => ({...prev, numero: e.target.value}))} />
                  <Input className="col-span-4" placeholder="Complemento" value={newAddr.complemento} onChange={e => setNewAddr(prev => ({...prev, complemento: e.target.value}))} />
                  <Input className="col-span-6" placeholder="Bairro" value={newAddr.bairro} onChange={e => setNewAddr(prev => ({...prev, bairro: e.target.value}))} />
                  <Input className="col-span-3" placeholder="CEP" value={newAddr.cep} onChange={e => setNewAddr(prev => ({...prev, cep: formatCEP(e.target.value)}))} maxLength={9} />
                  <Button className="col-span-3" onClick={handleSaveNewAddress}>Salvar</Button>
                </div>
              </div>
            )}
            
            {/* Form de Edição de Endereço */}
            {editingAddress && (
              <div className="mt-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Editar Endereço</h4>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingAddress(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <button
                    onClick={() => setEditingAddress(prev => ({ ...prev, label: 'Casa' }))}
                    className={`p-2 rounded border text-sm ${editingAddress.label === 'Casa' ? 'border-primary bg-primary/10' : ''}`}
                  >
                    🏠 Casa
                  </button>
                  <button
                    onClick={() => setEditingAddress(prev => ({ ...prev, label: 'Trabalho' }))}
                    className={`p-2 rounded border text-sm ${editingAddress.label === 'Trabalho' ? 'border-primary bg-primary/10' : ''}`}
                  >
                    🏢 Trabalho
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Rua/Logradouro" value={editingAddress.endereco} onChange={e => setEditingAddress(prev => ({...prev, endereco: e.target.value}))} />
                  <Input className="col-span-2" placeholder="Nº" value={editingAddress.numero || ''} onChange={e => setEditingAddress(prev => ({...prev, numero: e.target.value}))} />
                  <Input className="col-span-4" placeholder="Complemento" value={editingAddress.complemento || ''} onChange={e => setEditingAddress(prev => ({...prev, complemento: e.target.value}))} />
                  <Input className="col-span-6" placeholder="Bairro" value={editingAddress.bairro || ''} onChange={e => setEditingAddress(prev => ({...prev, bairro: e.target.value}))} />
                  <Input className="col-span-3" placeholder="CEP" value={editingAddress.cep || ''} onChange={e => setEditingAddress(prev => ({...prev, cep: formatCEP(e.target.value)}))} maxLength={9} />
                  <Button className="col-span-3" onClick={handleUpdateAddress}>Atualizar</Button>
                </div>
              </div>
            )}
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
function MeusPedidosModal({ isOpen, onClose, client, darkMode }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && client) {
      fetchPedidos();
    }
  }, [isOpen, client]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/pedidos/cliente/${client.id}`);
      setPedidos(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const statusLabels = {
    producao: { label: "Em Produção", color: "bg-yellow-500" },
    aguardando: { label: "Aguardando", color: "bg-blue-500" },
    transito: { label: "Em Trânsito", color: "bg-purple-500" },
    concluido: { label: "Entregue", color: "bg-green-500" },
    cancelado: { label: "Cancelado", color: "bg-red-500" },
  };

  if (!isOpen) return null;

  const t = {
    bg: darkMode ? 'bg-zinc-900' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-zinc-400' : 'text-gray-500',
    border: darkMode ? 'border-zinc-700' : 'border-gray-200',
    bgCard: darkMode ? 'bg-zinc-800' : 'bg-gray-50',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${t.bg} rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border ${t.border} max-h-[90vh] overflow-hidden`}>
        <div className={`flex items-center justify-between p-4 border-b ${t.border}`}>
          <h2 className={`font-bold text-lg flex items-center gap-2 ${t.text}`}>
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Meus Pedidos
          </h2>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-700/50 ${t.textMuted}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[70vh] p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className={t.textMuted}>Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className={`w-16 h-16 mx-auto mb-4 ${t.textMuted} opacity-50`} />
              <p className={t.textMuted}>Você ainda não fez nenhum pedido</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className={`${t.bgCard} rounded-xl p-4 border ${t.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`font-bold text-lg ${t.text}`}>{pedido.codigo}</span>
                      <p className={`text-sm ${t.textMuted}`}>{formatDate(pedido.created_at)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${statusLabels[pedido.status]?.color || 'bg-gray-500'}`}>
                      {statusLabels[pedido.status]?.label || pedido.status}
                    </div>
                  </div>
                  
                  <div className={`text-sm ${t.textMuted} mb-2`}>
                    {pedido.items?.map((item, idx) => (
                      <span key={idx}>
                        {item.quantidade}x {item.nome}
                        {idx < pedido.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${t.textMuted}`}>
                      {pedido.tipo_entrega === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}
                    </span>
                    <span className="font-bold text-orange-500">
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
      <MeusPedidosModal isOpen={showPedidos} onClose={() => setShowPedidos(false)} client={client} darkMode={darkMode} />
    </div>
  );
}
