import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  MapPin, Plus, Edit, Trash2, DollarSign, Search,
  Check, X, AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

const API = '/api';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function Bairros() {
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // CEP único
  const [cepUnico, setCepUnico] = useState(false);
  const [cepUnicoValue, setCepUnicoValue] = useState("");
  
  // Modal de CEP único
  const [cepUnicoModalOpen, setCepUnicoModalOpen] = useState(false);
  const [novoCepUnico, setNovoCepUnico] = useState("");
  
  // Modal de cadastro/edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nome: "", valor_entrega: "", cep: "" });
  const [saving, setSaving] = useState(false);
  
  // Modal de valor em massa
  const [valorMassaModalOpen, setValorMassaModalOpen] = useState(false);
  const [valorMassa, setValorMassa] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const bairrosRes = await axios.get(`${API}/bairros`, getAuthHeader());
      setBairros(bairrosRes.data);
      
      // Verificar se todos os bairros têm o mesmo CEP (indica CEP único)
      const bairrosComCep = bairrosRes.data.filter(b => b.cep && b.cep.trim() !== '');
      if (bairrosComCep.length > 0 && bairrosRes.data.length > 0) {
        const ceps = bairrosComCep.map(b => b.cep);
        const uniqueCeps = [...new Set(ceps)];
        // Se todos os bairros têm CEP e é o mesmo, CEP único está ativo
        if (uniqueCeps.length === 1 && bairrosComCep.length === bairrosRes.data.length) {
          setCepUnico(true);
          setCepUnicoValue(uniqueCeps[0]);
        } else {
          setCepUnico(false);
          setCepUnicoValue('');
        }
      } else {
        setCepUnico(false);
        setCepUnicoValue('');
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar bairros");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAbrirModal = (bairro = null) => {
    if (bairro) {
      setEditando(bairro);
      setFormData({
        nome: bairro.nome,
        valor_entrega: bairro.valor_entrega?.toString() || "0",
        cep: bairro.cep || ""
      });
    } else {
      setEditando(null);
      setFormData({ nome: "", valor_entrega: "0", cep: cepUnico ? cepUnicoValue : "" });
    }
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      toast.error("Digite o nome do bairro");
      return;
    }

    setSaving(true);
    try {
      const data = {
        nome: formData.nome.trim(),
        valor_entrega: parseFloat(formData.valor_entrega) || 0,
        cep: cepUnico ? cepUnicoValue : (formData.cep.trim() || null)
      };

      if (editando) {
        await axios.put(`${API}/bairros/${editando.id}`, data, getAuthHeader());
        toast.success("Bairro atualizado!");
      } else {
        await axios.post(`${API}/bairros`, data, getAuthHeader());
        toast.success("Bairro cadastrado!");
      }
      
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar bairro");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletar = async (bairro) => {
    if (!confirm(`Deseja remover o bairro "${bairro.nome}"?`)) return;
    
    try {
      await axios.delete(`${API}/bairros/${bairro.id}`, getAuthHeader());
      toast.success("Bairro removido!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao remover bairro");
    }
  };

  // Abrir modal de CEP único quando o switch é ativado
  const handleSwitchCepUnico = (checked) => {
    if (checked) {
      // Abrir modal para informar o CEP
      setNovoCepUnico(cepUnicoValue || "");
      setCepUnicoModalOpen(true);
    } else {
      // Desativar CEP único - limpar CEP de todos os bairros
      handleDesativarCepUnico();
    }
  };

  // Ativar CEP único
  const handleAtivarCepUnico = async () => {
    if (!novoCepUnico.trim()) {
      toast.error("Digite o CEP");
      return;
    }

    setSaving(true);
    try {
      // Atualizar CEP de todos os bairros existentes
      if (bairros.length > 0) {
        await axios.put(`${API}/bairros/cep/all?cep=${encodeURIComponent(novoCepUnico.trim())}`, {}, getAuthHeader());
      }
      
      setCepUnico(true);
      setCepUnicoValue(novoCepUnico.trim());
      setCepUnicoModalOpen(false);
      toast.success("CEP único ativado! Todos os bairros usarão este CEP.");
      fetchData();
    } catch (error) {
      toast.error("Erro ao ativar CEP único");
    } finally {
      setSaving(false);
    }
  };

  // Desativar CEP único
  const handleDesativarCepUnico = async () => {
    setCepUnico(false);
    setCepUnicoValue("");
    toast.success("CEP único desativado. Cada bairro pode ter seu próprio CEP.");
  };

  const handleAlterarValorMassa = async () => {
    const valor = parseFloat(valorMassa);
    if (isNaN(valor) || valor < 0) {
      toast.error("Digite um valor válido");
      return;
    }
    
    try {
      await axios.put(`${API}/bairros/valor/all?valor_entrega=${valor}`, {}, getAuthHeader());
      toast.success("Valor de entrega atualizado em todos os bairros!");
      setValorMassaModalOpen(false);
      setValorMassa("");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar valores");
    }
  };

  // Filtrar bairros
  const bairrosFiltrados = bairros.filter(b => {
    if (!searchTerm) return true;
    return b.nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
            <MapPin className="w-7 h-7 text-primary" />
            Bairros
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os bairros e valores de entrega
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setValorMassaModalOpen(true)}>
            <DollarSign className="w-4 h-4 mr-1" />
            Alterar Todos
          </Button>
          <Button onClick={() => handleAbrirModal()}>
            <Plus className="w-4 h-4 mr-1" />
            Novo Bairro
          </Button>
        </div>
      </div>

      {/* CEP Único Switch */}
      <div className={`rounded-xl border p-4 transition-colors ${cepUnico ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cepUnico ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                CEP Único
                {cepUnico && <Check className="w-4 h-4 text-green-500" />}
              </h3>
              <p className="text-sm text-muted-foreground">
                {cepUnico 
                  ? <span className="text-primary font-medium">Ativo: {cepUnicoValue}</span>
                  : 'Cada bairro pode ter seu próprio CEP'
                }
              </p>
            </div>
          </div>
          <Switch
            checked={cepUnico}
            onCheckedChange={handleSwitchCepUnico}
          />
        </div>
        {cepUnico && (
          <div className="mt-3 pt-3 border-t border-primary/20">
            <p className="text-xs text-muted-foreground">
              Todos os bairros cadastrados e futuros usarão o CEP: <strong>{cepUnicoValue}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar bairro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Bairros */}
      {bairrosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border-2 border-dashed">
          <MapPin className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum bairro cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Cadastre bairros para definir valores de entrega
          </p>
          <Button onClick={() => handleAbrirModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar primeiro bairro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bairrosFiltrados.map(bairro => (
            <div
              key={bairro.id}
              className="bg-card rounded-xl border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{bairro.nome}</h3>
                    {bairro.cep && (
                      <p className="text-xs text-muted-foreground">CEP: {bairro.cep}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-lg font-bold text-green-600">
                    R$ {(bairro.valor_entrega || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleAbrirModal(bairro)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeletar(bairro)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de CEP Único */}
      <Dialog open={cepUnicoModalOpen} onOpenChange={setCepUnicoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Ativar CEP Único
            </DialogTitle>
            <DialogDescription>
              Todos os bairros cadastrados e futuros usarão o mesmo CEP.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>💡 Dica:</strong> Use esta opção se sua cidade/região usa um único CEP para todos os bairros.
              </p>
            </div>
            
            <div>
              <Label>CEP para todos os bairros *</Label>
              <Input
                value={novoCepUnico}
                onChange={(e) => setNovoCepUnico(e.target.value)}
                placeholder="00000-000"
                className="mt-1"
                maxLength={9}
              />
            </div>
            
            {bairros.length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  O CEP será aplicado aos <strong>{bairros.length}</strong> bairro(s) já cadastrado(s).
                </p>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setCepUnicoModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleAtivarCepUnico} disabled={saving || !novoCepUnico.trim()}>
                {saving ? "Ativando..." : "Ativar CEP Único"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editando ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editando ? "Editar Bairro" : "Novo Bairro"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome do Bairro *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Centro"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Valor de Entrega (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_entrega}
                onChange={(e) => setFormData({ ...formData, valor_entrega: e.target.value })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            
            {cepUnico ? (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  CEP único ativo: <strong>{cepUnicoValue}</strong>
                </p>
              </div>
            ) : (
              <div>
                <Label>CEP</Label>
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  placeholder="00000-000"
                  className="mt-1"
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSalvar} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Valor em Massa */}
      <Dialog open={valorMassaModalOpen} onOpenChange={setValorMassaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Alterar Valor de Todos os Bairros
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O valor informado será aplicado a todos os {bairros.length} bairros cadastrados.
            </p>
            
            <div>
              <Label>Novo Valor de Entrega (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorMassa}
                onChange={(e) => setValorMassa(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setValorMassaModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleAlterarValorMassa}>
                Aplicar a Todos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
