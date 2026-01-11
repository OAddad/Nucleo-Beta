import { useState, useRef, useEffect } from "react";
import { User, Star, Settings, ShoppingBag, LogOut, Moon, Sun, X, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = '/api';

// Modal de Edição de Conta
function EditAccountModal({ isOpen, onClose, client, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: client?.nome || "",
    telefone: client?.telefone || "",
    email: client?.email || "",
    endereco: client?.endereco || "",
    bairro: client?.bairro || "",
    cep: client?.cep || "",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        nome: client.nome || "",
        telefone: client.telefone || "",
        email: client.email || "",
        endereco: client.endereco || "",
        bairro: client.bairro || "",
        cep: client.cep || "",
      });
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.put(`${API}/clientes/${client.id}`, formData);
      localStorage.setItem("client", JSON.stringify(response.data));
      onUpdate(response.data);
      toast.success("Conta atualizada com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao atualizar conta");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-zinc-700 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="font-bold text-white text-lg">Minha Conta</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div>
            <Label className="text-zinc-300">Nome</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>
          <div>
            <Label className="text-zinc-300">Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Endereço</Label>
            <Input
              value={formData.endereco}
              onChange={(e) => setFormData({...formData, endereco: e.target.value})}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300">Bairro</Label>
              <Input
                value={formData.bairro}
                onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">CEP</Label>
              <Input
                value={formData.cep}
                onChange={(e) => setFormData({...formData, cep: e.target.value})}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de Pontuação
function PontuacaoModal({ isOpen, onClose, client }) {
  if (!isOpen) return null;

  const pontos = client?.pontuacao || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 border border-zinc-700">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="font-bold text-white text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Minha Pontuação
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Star className="w-12 h-12 text-white" />
          </div>
          <p className="text-zinc-400 mb-2">Você tem</p>
          <p className="text-5xl font-bold text-orange-500 mb-2">{pontos}</p>
          <p className="text-zinc-400">pontos acumulados</p>
          
          <div className="mt-6 p-4 bg-zinc-800 rounded-lg text-left">
            <p className="text-sm text-zinc-400">
              <strong className="text-white">Como ganhar pontos?</strong><br />
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
  }, [isOpen, client, dataInicio, dataFim]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      // Buscar pedidos do cliente (filtrado pelo telefone ou ID)
      let url = `${API}/orders?cliente_telefone=${encodeURIComponent(client.telefone || "")}`;
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
      <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-zinc-700 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="font-bold text-white text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Meus Pedidos
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Filtros de Data */}
        <div className="p-4 border-b border-zinc-800 flex gap-4">
          <div className="flex-1">
            <Label className="text-zinc-400 text-xs">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-zinc-400 text-xs">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white text-sm"
            />
          </div>
        </div>
        
        {/* Lista de Pedidos */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
              <p className="text-zinc-400 mt-2">Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">Nenhum pedido encontrado</p>
              <p className="text-zinc-500 text-sm">Faça seu primeiro pedido!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="bg-zinc-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">Pedido #{pedido.numero || pedido.id?.slice(-6)}</p>
                      <p className="text-zinc-400 text-sm">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR')} às {new Date(pedido.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pedido.status === 'entregue' ? 'bg-green-500/20 text-green-400' :
                      pedido.status === 'cancelado' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {pedido.status || 'Em andamento'}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-400 mb-2">
                    {pedido.items?.map((item, i) => (
                      <span key={i}>{item.quantity}x {item.name}{i < pedido.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                    <span className="text-zinc-400 text-sm">Total</span>
                    <span className="text-orange-500 font-bold">
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
export default function ProfileMenu({ client, onLogout, onClientUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPontuacao, setShowPontuacao] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showPedidos, setShowPedidos] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Cardápio sempre inicia escuro
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

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // Aqui poderia implementar a troca de tema real
    toast.info(darkMode ? "Modo claro ativado" : "Modo escuro ativado");
  };

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
                <p className="text-xs text-zinc-400">{client?.pontuacao || 0} pontos</p>
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
                onClick={toggleTheme}
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
