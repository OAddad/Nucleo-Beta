import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Route as RouteIcon, Search, MapPin, Edit, Trash2, Plus
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

export default function Ruas() {
  const [ruas, setRuas] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal de edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nome: "", bairro_id: "", cep: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ruasRes, bairrosRes] = await Promise.all([
        axios.get(`${API}/ruas`, getAuthHeader()),
        axios.get(`${API}/bairros`, getAuthHeader())
      ]);
      setRuas(ruasRes.data);
      setBairros(bairrosRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar ruas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAbrirModal = (rua = null) => {
    if (rua) {
      setEditando(rua);
      setFormData({
        nome: rua.nome,
        bairro_id: rua.bairro_id || "",
        cep: rua.cep || ""
      });
    } else {
      setEditando(null);
      setFormData({ nome: "", bairro_id: "", cep: "" });
    }
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      toast.error("Digite o nome da rua");
      return;
    }

    setSaving(true);
    try {
      const data = {
        nome: formData.nome.trim(),
        bairro_id: formData.bairro_id || null,
        cep: formData.cep.trim() || null
      };

      if (editando) {
        await axios.put(`${API}/ruas/${editando.id}`, data, getAuthHeader());
        toast.success("Rua atualizada!");
      } else {
        await axios.post(`${API}/ruas`, data, getAuthHeader());
        toast.success("Rua cadastrada!");
      }
      
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar rua");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletar = async (rua) => {
    if (!confirm(`Deseja remover a rua "${rua.nome}"?`)) return;
    
    try {
      await axios.delete(`${API}/ruas/${rua.id}`, getAuthHeader());
      toast.success("Rua removida!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao remover rua");
    }
  };

  // Filtrar ruas
  const ruasFiltradas = ruas.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.nome.toLowerCase().includes(term) ||
      r.bairro_nome?.toLowerCase().includes(term)
    );
  });

  // Agrupar ruas por bairro
  const ruasPorBairro = ruasFiltradas.reduce((acc, rua) => {
    const bairro = rua.bairro_nome || "Sem bairro";
    if (!acc[bairro]) acc[bairro] = [];
    acc[bairro].push(rua);
    return acc;
  }, {});

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
            <RouteIcon className="w-7 h-7 text-primary" />
            Ruas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ruas cadastradas pelos usuários durante os pedidos
          </p>
        </div>
        <Button onClick={() => handleAbrirModal()}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Rua
        </Button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>💡 Dica:</strong> As ruas são cadastradas automaticamente quando os clientes preenchem o endereço. 
          Quando um usuário digitar uma rua que já existe, o sistema vai sugerir o auto-preenchimento.
        </p>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar rua ou bairro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Ruas */}
      {ruasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border-2 border-dashed">
          <RouteIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma rua cadastrada</h3>
          <p className="text-muted-foreground">
            As ruas serão cadastradas automaticamente quando clientes fizerem pedidos
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(ruasPorBairro).sort().map(([bairro, ruasDoBairro]) => (
            <div key={bairro}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{bairro}</h2>
                <span className="bg-muted px-2 py-0.5 rounded-full text-xs">
                  {ruasDoBairro.length} rua(s)
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ruasDoBairro.map(rua => (
                  <div
                    key={rua.id}
                    className="bg-card rounded-lg border p-3 hover:shadow-sm transition-shadow flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RouteIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{rua.nome}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleAbrirModal(rua)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeletar(rua)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editando ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editando ? "Editar Rua" : "Nova Rua"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome da Rua *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Rua das Flores"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Bairro</Label>
              <Select 
                value={formData.bairro_id} 
                onValueChange={(value) => setFormData({ ...formData, bairro_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o bairro..." />
                </SelectTrigger>
                <SelectContent>
                  {bairros.map(bairro => (
                    <SelectItem key={bairro.id} value={bairro.id}>
                      {bairro.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>CEP</Label>
              <Input
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                placeholder="00000-000"
                className="mt-1"
              />
            </div>
            
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
    </div>
  );
}
