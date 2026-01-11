import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Phone, User, Lock, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import API_BASE from "../config/api";

export default function Login({ setIsAuthenticated }) {
  const navigate = useNavigate();
  
  // Estados
  const [step, setStep] = useState(1); // 1 = identificador, 2 = senha
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Dados do usuário/cliente encontrado
  const [loginInfo, setLoginInfo] = useState(null);
  // { type: "user" | "client", name, photo, needs_password, client_id }

  // Passo 1: Verificar identificador (login ou telefone)
  const handleCheckIdentifier = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast.error("Digite seu telefone ou login");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE}/auth/check-login`, {
        identifier: identifier.trim()
      });
      
      const data = response.data;
      
      if (!data.found) {
        toast.error("Usuário ou telefone não encontrado");
        setLoading(false);
        return;
      }
      
      setLoginInfo(data);
      
      // Se não precisa de senha (cliente sem senha), logar direto
      if (!data.needs_password && data.type === "client") {
        await loginClient(data.client_id, null);
      } else {
        // Precisa de senha - mostrar passo 2
        setStep(2);
      }
      
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      toast.error("Erro ao verificar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Login de usuário do sistema (admin)
  const loginUser = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username: identifier,
        password: password
      });
      
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.removeItem("client"); // Limpar cliente se houver
      setIsAuthenticated(true);
      toast.success("Login realizado!");
      navigate("/admin");
      
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
        // Salvar dados do cliente no localStorage
        localStorage.setItem("client", JSON.stringify(response.data.client));
        localStorage.removeItem("token"); // Limpar token de admin se houver
        localStorage.removeItem("user");
        
        toast.success(`Bem-vindo(a), ${response.data.client.nome}!`);
        navigate("/cardapio");
        
        // Recarregar para atualizar o estado
        window.location.reload();
      } else {
        toast.error(response.data.message || "Erro ao fazer login");
      }
      
    } catch (error) {
      console.error("Erro no login do cliente:", error);
      toast.error("Erro ao fazer login. Tente novamente.");
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

  // Voltar ao passo 1
  const handleBack = () => {
    setStep(1);
    setPassword("");
    setLoginInfo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Botão Voltar ao Cardápio */}
      <button
        onClick={() => navigate("/cardapio")}
        className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Voltar ao Cardápio</span>
      </button>

      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo-nucleo.png" 
              alt="Núcleo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-2">Núcleo</h1>
          <p className="text-muted-foreground text-lg">
            o centro da sua gestão
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-card border rounded-2xl shadow-xl p-8">
          {step === 1 ? (
            <>
              <h2 className="text-2xl font-bold mb-2 text-center">Entrar</h2>
              <p className="text-muted-foreground text-center mb-6">
                Digite seu telefone ou login para continuar
              </p>
              
              <form onSubmit={handleCheckIdentifier} className="space-y-4">
                <div>
                  <Label htmlFor="identifier">Telefone ou Login</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Phone className="w-5 h-5" />
                    </div>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="(00) 00000-0000 ou seu login"
                      required
                      className="pl-10 h-12"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Passo 2 - Senha */}
              <div className="text-center mb-6">
                {loginInfo?.photo ? (
                  <img 
                    src={loginInfo.photo} 
                    alt={loginInfo.name}
                    className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-primary/10 flex items-center justify-center">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
                <h2 className="text-xl font-bold">{loginInfo?.name || "Usuário"}</h2>
                <p className="text-muted-foreground text-sm">
                  {loginInfo?.type === "user" ? "Administrador" : "Cliente"}
                </p>
              </div>
              
              <form onSubmit={handleSubmitPassword} className="space-y-4">
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative mt-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      className="pl-10 h-12"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2025 Núcleo - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
