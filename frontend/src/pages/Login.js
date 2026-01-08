import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ChefHat } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      toast.success("Login realizado!");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Erro ao autenticar"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título no Topo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-4 rounded-2xl shadow-lg">
              <ChefHat className="w-12 h-12 text-primary-foreground" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Núcleo</h1>
          <p className="text-muted-foreground text-lg">
            o centro da sua gestão
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-card border rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Entrar no Sistema</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                className="mt-1 h-11"
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="mt-1 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2025 Núcleo - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-5xl font-bold mb-4">Núcleo</h1>
          <p className="text-xl text-slate-200">
            Sistema completo de gestão e controle de custos
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
            <div className="flex justify-center mb-6">
              <div className="bg-rose-700 p-4 rounded-xl">
                <ChefHat className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">
              {isLogin ? "Bem-vindo de volta" : "Criar conta"}
            </h2>
            <p className="text-center text-slate-500 mb-6">
              {isLogin
                ? "Entre para gerenciar seus custos"
                : "Comece a controlar seu CMV"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-slate-700">
                  Usuário
                </Label>
                <Input
                  id="username"
                  data-testid="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700">
                  Senha
                </Label>
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                />
              </div>

              <Button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading}
                className="w-full bg-rose-700 hover:bg-rose-800 h-11 text-base font-medium shadow-sm transition-all active:scale-95"
              >
                {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-rose-700 hover:text-rose-800 text-sm font-medium transition-colors"
              >
                {isLogin
                  ? "Não tem conta? Cadastre-se"
                  : "Já tem conta? Faça login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}