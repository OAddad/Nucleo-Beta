import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Phone, User, Lock, Loader2, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const API = '/api';

// Função para formatar telefone para exibição
const formatPhoneDisplay = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// Adiciona 9º dígito se necessário (para cadastro)
const ensureNinthDigit = (phone) => {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.slice(0, 2) + '9' + numbers.slice(2);
  }
  return numbers;
};

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [step, setStep] = useState(1); // 1 = identificador, 2 = senha, 3 = cadastro
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginInfo, setLoginInfo] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const handleClose = () => {
    setStep(1);
    setIdentifier("");
    setPassword("");
    setLoginInfo(null);
    setNewClientName("");
    setNewClientPhone("");
    onClose();
  };

  // Passo 1: Verificar identificador (login de admin OU telefone de cliente)
  const handleCheckIdentifier = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast.error("Digite seu telefone ou login");
      return;
    }
    
    setLoading(true);
    
    try {
      // Enviar o identificador como está - backend faz a busca flexível
      const response = await axios.post(`${API}/auth/check-login`, {
        identifier: identifier.trim()
      });
      
      const data = response.data;
      
      if (!data.found) {
        // Não encontrado - verificar se parece telefone para oferecer cadastro
        const numbers = identifier.replace(/\D/g, '');
        if (numbers.length >= 8) {
          // Parece telefone - oferecer cadastro
          const phoneWithNinth = ensureNinthDigit(numbers.length >= 10 ? numbers : '00' + numbers);
          setNewClientPhone(formatPhoneDisplay(phoneWithNinth));
          setStep(3);
        } else {
          toast.error("Usuário não encontrado");
        }
        setLoading(false);
        return;
      }
      
      setLoginInfo(data);
      
      // Se não precisa de senha (cliente sem senha), logar direto
      if (!data.needs_password && data.type === "client") {
        await loginClient(data.client_id, null);
      } else {
        setStep(2);
      }
      
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      const numbers = identifier.replace(/\D/g, '');
      if (numbers.length >= 8) {
        const phoneWithNinth = ensureNinthDigit(numbers.length >= 10 ? numbers : '00' + numbers);
        setNewClientPhone(formatPhoneDisplay(phoneWithNinth));
        setStep(3);
      } else {
        toast.error("Erro ao verificar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cadastrar novo cliente
  const handleRegisterClient = async (e) => {
    e.preventDefault();
    
    if (!newClientName.trim()) {
      toast.error("Digite seu nome");
      return;
    }
    
    if (!newClientPhone.trim()) {
      toast.error("Digite seu telefone");
      return;
    }
    
    // Garantir formato correto
    const phoneNumbers = ensureNinthDigit(newClientPhone.replace(/\D/g, ''));
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      toast.error("Telefone inválido. Use DDD + número");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/public/clientes`, {
        nome: newClientName.trim(),
        telefone: phoneNumbers
      });
      
      const newClient = response.data;
      localStorage.setItem("client", JSON.stringify(newClient));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      toast.success(`Bem-vindo(a), ${newClient.nome}!`);
      onLoginSuccess("client", newClient);
      handleClose();
      
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      if (error.response?.data?.detail?.includes("já")) {
        toast.error("Este telefone já está cadastrado");
      } else {
        toast.error("Erro ao cadastrar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Login de usuário admin
  const loginUser = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username: identifier,
        password: password
      });
      
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.removeItem("client");
      
      toast.success("Login realizado!");
      onLoginSuccess("admin", response.data.user);
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  // Login de cliente
  const loginClient = async (clientId, senha) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/client-login`, {
        client_id: clientId,
        senha: senha
      });
      
      if (response.data.success) {
        localStorage.setItem("client", JSON.stringify(response.data.client));
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        toast.success(`Bem-vindo(a), ${response.data.client.nome}!`);
        onLoginSuccess("client", response.data.client);
        handleClose();
      } else {
        toast.error(response.data.message || "Erro ao fazer login");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  // Passo 2: Enviar senha
  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error("Digite sua senha");
      return;
    }
    
    if (loginInfo.type === "user") {
      await loginUser();
    } else if (loginInfo.type === "client") {
      await loginClient(loginInfo.client_id, password);
    }
  };

  const handleBack = () => {
    setStep(1);
    setPassword("");
    setLoginInfo(null);
    setNewClientName("");
    setNewClientPhone("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <div>
              <h2 className="font-bold text-white">Núcleo</h2>
              <p className="text-xs text-zinc-400">o centro da sua gestão</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <>
              <h3 className="text-xl font-bold text-white mb-1 text-center">Entrar</h3>
              <p className="text-zinc-400 text-center mb-6 text-sm">
                Digite seu telefone ou login de administrador
              </p>
              
              <form onSubmit={handleCheckIdentifier} className="space-y-4">
                <div>
                  <Label htmlFor="identifier" className="text-zinc-300">Telefone ou Login</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <User className="w-5 h-5" />
                    </div>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="999658914, admin, etc..."
                      required
                      className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Telefone: com ou sem DDD, com ou sem o 9
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600">
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Verificando...</> : "Continuar"}
                </Button>
              </form>
            </>
          ) : step === 2 ? (
            <>
              <div className="text-center mb-6">
                {loginInfo?.photo ? (
                  <img src={loginInfo.photo} alt={loginInfo.name} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-orange-500/30" />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-zinc-800 flex items-center justify-center border-4 border-orange-500/30">
                    <User className="w-10 h-10 text-zinc-500" />
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{loginInfo?.name || "Usuário"}</h3>
                <p className="text-zinc-400 text-sm">{loginInfo?.type === "user" ? "Administrador" : "Cliente"}</p>
              </div>
              
              <form onSubmit={handleSubmitPassword} className="space-y-4">
                <div>
                  <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600">
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</> : "Entrar"}
                </Button>
                
                <Button type="button" variant="ghost" onClick={handleBack} className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800">
                  ← Voltar
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-orange-500/20 flex items-center justify-center border-4 border-orange-500/30">
                  <UserPlus className="w-10 h-10 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Criar Conta</h3>
                <p className="text-zinc-400 text-sm">Complete seu cadastro para continuar</p>
              </div>
              
              <form onSubmit={handleRegisterClient} className="space-y-4">
                <div>
                  <Label htmlFor="newPhone" className="text-zinc-300">Telefone com DDD</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Phone className="w-5 h-5" />
                    </div>
                    <Input
                      id="newPhone"
                      type="text"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(formatPhoneDisplay(e.target.value))}
                      placeholder="(00) 00000-0000"
                      required
                      className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="newName" className="text-zinc-300">Seu Nome</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <User className="w-5 h-5" />
                    </div>
                    <Input
                      id="newName"
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Digite seu nome"
                      required
                      className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600">
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Cadastrando...</> : "Criar Conta e Entrar"}
                </Button>
                
                <Button type="button" variant="ghost" onClick={handleBack} className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800">
                  ← Voltar
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
