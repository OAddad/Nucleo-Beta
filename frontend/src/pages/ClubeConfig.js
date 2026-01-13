import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { 
  Crown, Save, Users, Award, Settings, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function ClubeConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    clube_nome: "Clube Addad",
    pontos_por_real: 1
  });
  const [stats, setStats] = useState({
    total_membros: 0,
    total_pontos_distribuidos: 0
  });

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/clube/config", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setConfig({
          clube_nome: response.data.clube_nome || "Clube Addad",
          pontos_por_real: response.data.pontos_por_real || 1
        });
      }
    } catch (error) {
      console.error("Erro ao buscar configurações do clube:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/clube/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas do clube:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/clube/config", config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Configurações do clube salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações do Clube</h1>
            <p className="text-sm text-muted-foreground">
              Personalize seu programa de fidelidade
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total de Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">{stats.total_membros}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Pontos Distribuídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-500">
              {stats.total_pontos_distribuidos?.toLocaleString('pt-BR') || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Defina o nome do seu clube e a regra de pontuação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome do Clube */}
          <div className="space-y-2">
            <Label htmlFor="clube_nome" className="text-sm font-medium">
              Nome do Clube
            </Label>
            <div className="flex items-center gap-2 max-w-md">
              <span className="text-lg font-bold text-orange-500 whitespace-nowrap">Clube</span>
              <Input
                id="clube_nome"
                value={config.clube_nome}
                onChange={(e) => setConfig({ ...config, clube_nome: e.target.value })}
                placeholder="Ex: Addad, VIP, Fidelidade..."
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O nome completo será: <strong className="text-orange-500">Clube {config.clube_nome || 'Nome'}</strong>
            </p>
          </div>

          {/* Pontos por Real */}
          <div className="space-y-2">
            <Label htmlFor="pontos_por_real" className="text-sm font-medium">
              Pontos por R$ gasto
            </Label>
            <div className="flex items-center gap-3 max-w-md">
              <Input
                id="pontos_por_real"
                type="number"
                min="0.1"
                step="0.1"
                value={config.pontos_por_real}
                onChange={(e) => setConfig({ ...config, pontos_por_real: parseFloat(e.target.value) || 1 })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                pontos para cada R$ 1,00 gasto
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Exemplo: Se definir 2 pontos, um pedido de R$ 50,00 dará {(50 * (config.pontos_por_real || 1)).toFixed(0)} pontos ao cliente
            </p>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-orange-500" />
              Prévia do Clube
            </h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">Clube {config.clube_nome || "Nome"}</p>
                <p className="text-sm text-muted-foreground">
                  Ganhe {config.pontos_por_real || 1} {config.pontos_por_real === 1 ? 'ponto' : 'pontos'} a cada R$ 1,00 gasto
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
