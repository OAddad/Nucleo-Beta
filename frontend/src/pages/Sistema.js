import { useState, useEffect, useRef } from "react";
import { 
  Settings, Palette, Trash2, Building2, Printer, AlertTriangle, 
  Upload, X, Save, Loader2, CheckCircle, Image as ImageIcon,
  Instagram, Facebook, Mail, Phone, MapPin, Calendar, Hash,
  Package, ShoppingCart, Users, DollarSign, Map, RefreshCw,
  FileText, Eye, ToggleLeft, ToggleRight, Plus, Edit, Clock,
  AlertCircle, CheckCircle2, XCircle, RotateCcw, List, Usb
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../hooks/use-toast";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function Sistema() {
  const [activeSubTab, setActiveSubTab] = useState("aparencia");
  const { toast } = useToast();

  const subTabs = [
    { id: "aparencia", label: "Aparência", icon: Palette },
    { id: "limpar-dados", label: "Limpar Dados", icon: Trash2 },
    { id: "empresa", label: "Empresa", icon: Building2 },
    { id: "impressao", label: "Impressão", icon: Printer },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500 text-white">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Sistema</h1>
            <p className="text-sm text-muted-foreground">Configurações gerais do sistema</p>
          </div>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="border-b bg-card px-4">
        <div className="flex gap-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeSubTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {activeSubTab === "aparencia" && <AparenciaTab toast={toast} />}
        {activeSubTab === "limpar-dados" && <LimparDadosTab toast={toast} />}
        {activeSubTab === "empresa" && <EmpresaTab toast={toast} />}
        {activeSubTab === "impressao" && <ImpressaoTab toast={toast} />}
      </div>
    </div>
  );
}

// ==================== ABA APARÊNCIA ====================
function AparenciaTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mx-auto mb-4">
          <Palette className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">Em Breve</h2>
        <p className="text-muted-foreground mb-6">
          Personalize a aparência do seu sistema!
        </p>
        
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-left">
          <h3 className="font-semibold mb-3">O que você poderá fazer:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-400"></div>
              Escolher as cores do sistema
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-400"></div>
              Personalizar cores de botões e destaques
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-400"></div>
              Definir se o cardápio será Padrão ou Compacto
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-400"></div>
              Modo claro e escuro
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ==================== ABA LIMPAR DADOS ====================
function LimparDadosTab({ toast }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [confirmationWord, setConfirmationWord] = useState("");
  const [loading, setLoading] = useState(false);

  const clearOptions = [
    {
      id: "products",
      label: "Estoque / Produtos",
      description: "Remove todos os produtos, ingredientes, categorias e histórico de preços",
      icon: Package,
      color: "orange",
      endpoint: "/api/data/products"
    },
    {
      id: "sales",
      label: "Vendas",
      description: "Remove todos os pedidos e histórico de vendas",
      icon: ShoppingCart,
      color: "red",
      endpoint: "/api/data/sales"
    },
    {
      id: "people",
      label: "Pessoas e Fornecedores",
      description: "Remove clientes, fornecedores, entregadores e funcionários",
      icon: Users,
      color: "blue",
      endpoint: "/api/data/people"
    },
    {
      id: "financial",
      label: "Financeiro",
      description: "Remove todas as despesas registradas",
      icon: DollarSign,
      color: "green",
      endpoint: "/api/data/financial"
    },
    {
      id: "locations",
      label: "Localizações",
      description: "Remove todos os bairros e ruas cadastrados",
      icon: Map,
      color: "purple",
      endpoint: "/api/data/locations"
    }
  ];

  const handleClearData = async () => {
    if (confirmationWord.toUpperCase() !== "LIMPAR") {
      toast({
        title: "Palavra incorreta",
        description: "Digite LIMPAR para confirmar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}${selectedOption.endpoint}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ confirmation_word: confirmationWord })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({
          title: "Dados limpos",
          description: data.message
        });
        setShowModal(false);
        setConfirmationWord("");
        setSelectedOption(null);
      } else {
        throw new Error(data.detail || "Erro ao limpar dados");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    };
    return colors[color] || colors.red;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Aviso de perigo */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-red-700 dark:text-red-400 text-lg">⚠️ ATENÇÃO: Área Perigosa</h2>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              As ações nesta página são <strong>permanentes e irreversíveis</strong>. 
              Os dados excluídos não podem ser recuperados. Tenha certeza absoluta antes de prosseguir.
            </p>
          </div>
        </div>
      </div>

      {/* Opções de limpeza */}
      <div className="grid gap-4">
        {clearOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div
              key={option.id}
              className="bg-card border rounded-xl p-4 hover:border-red-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getColorClasses(option.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.label}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedOption(option);
                    setShowModal(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmação */}
      {showModal && selectedOption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Confirmar Exclusão</h3>
                <p className="text-sm text-muted-foreground">{selectedOption.label}</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>Esta ação é permanente!</strong> Todos os dados de "{selectedOption.label}" serão excluídos e não poderão ser recuperados.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Digite <span className="font-bold text-red-600">LIMPAR</span> para confirmar:
              </label>
              <Input
                value={confirmationWord}
                onChange={(e) => setConfirmationWord(e.target.value)}
                placeholder="Digite LIMPAR"
                className="text-center font-mono text-lg"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowModal(false);
                  setConfirmationWord("");
                  setSelectedOption(null);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleClearData}
                disabled={loading || confirmationWord.toUpperCase() !== "LIMPAR"}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Permanentemente
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ABA EMPRESA ====================
function EmpresaTab({ toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    company_name: "Núcleo",
    slogan: "O Centro da sua Gestão",
    logo_url: null,
    address: "",
    cnpj: "",
    fantasy_name: "",
    legal_name: "",
    founding_date: "",
    state_registration: "",
    city_registration: "",
    instagram: "",
    facebook: "",
    email: "",
    tiktok: "",
    kwai: "",
    phone: ""
  });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/company/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setFormData(data);
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/company/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast({
          title: "Salvo!",
          description: "Configurações da empresa atualizadas"
        });
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "O arquivo deve ser uma imagem",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await fetch(`${API_URL}/api/company/logo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formDataUpload
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFormData(prev => ({ ...prev, logo_url: data.logo_url }));
        toast({
          title: "Logo atualizada!",
          description: "A nova logo foi salva com sucesso"
        });
      } else {
        throw new Error(data.detail || "Erro ao fazer upload");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/company/logo`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setFormData(prev => ({ ...prev, logo_url: null }));
        toast({
          title: "Logo removida",
          description: "A logo foi removida com sucesso"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a logo",
        variant: "destructive"
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Logo e Nome */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-500" />
          Identidade da Empresa
        </h2>
        
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          {/* Upload de Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Logo (1080x1080)</label>
            <div className="relative">
              <div 
                className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.logo_url ? (
                  <img 
                    src={`${API_URL}${formData.logo_url}`}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                  </div>
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              {formData.logo_url && (
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Nome e Slogan */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Sistema</label>
              <Input
                value={formData.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="Ex: Núcleo"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este nome aparecerá no canto superior esquerdo
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slogan</label>
              <Input
                value={formData.slogan}
                onChange={(e) => handleChange("slogan", e.target.value)}
                placeholder="Ex: O Centro da sua Gestão"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dados da Empresa */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5 text-blue-500" />
          Dados Cadastrais
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
            <Input
              value={formData.fantasy_name}
              onChange={(e) => handleChange("fantasy_name", e.target.value)}
              placeholder="Nome comercial"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Razão Social</label>
            <Input
              value={formData.legal_name}
              onChange={(e) => handleChange("legal_name", e.target.value)}
              placeholder="Razão social completa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CNPJ</label>
            <Input
              value={formData.cnpj}
              onChange={(e) => handleChange("cnpj", e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data de Fundação</label>
            <Input
              type="date"
              value={formData.founding_date}
              onChange={(e) => handleChange("founding_date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Inscrição Estadual</label>
            <Input
              value={formData.state_registration}
              onChange={(e) => handleChange("state_registration", e.target.value)}
              placeholder="Número da IE"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Inscrição Municipal</label>
            <Input
              value={formData.city_registration}
              onChange={(e) => handleChange("city_registration", e.target.value)}
              placeholder="Número da IM"
            />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-500" />
          Endereço
        </h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Endereço Completo</label>
          <Input
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Rua, número, bairro, cidade - UF, CEP"
          />
        </div>
      </div>

      {/* Contato e Redes Sociais */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-green-500" />
          Contato e Redes Sociais
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Telefone
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4" /> E-mail
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Instagram className="w-4 h-4" /> Instagram
            </label>
            <Input
              value={formData.instagram}
              onChange={(e) => handleChange("instagram", e.target.value)}
              placeholder="@usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Facebook className="w-4 h-4" /> Facebook
            </label>
            <Input
              value={formData.facebook}
              onChange={(e) => handleChange("facebook", e.target.value)}
              placeholder="facebook.com/pagina"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">TikTok</label>
            <Input
              value={formData.tiktok}
              onChange={(e) => handleChange("tiktok", e.target.value)}
              placeholder="@usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kwai</label>
            <Input
              value={formData.kwai}
              onChange={(e) => handleChange("kwai", e.target.value)}
              placeholder="@usuario"
            />
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}


// ==================== ABA IMPRESSÃO ====================
function ImpressaoTab({ toast }) {
  const [activeSubTab, setActiveSubTab] = useState("config");
  
  const subTabs = [
    { id: "config", label: "Configurações", icon: Settings },
    { id: "impressoras", label: "Impressoras", icon: Printer },
    { id: "fila", label: "Fila de Impressão", icon: List },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Sub-abas */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === "config" && <ConfiguracaoImpressao toast={toast} />}
      {activeSubTab === "impressoras" && <GerenciarImpressoras toast={toast} />}
      {activeSubTab === "fila" && <FilaImpressao toast={toast} />}
    </div>
  );
}

// ==================== SUB-ABA: CONFIGURAÇÕES ====================
function ConfiguracaoImpressao({ toast }) {
  const [config, setConfig] = useState({
    impressao_automatica: true,
    mostrar_logo: true,
    mostrar_endereco_empresa: true,
    mostrar_telefone_empresa: true,
    mostrar_data_hora: true,
    mostrar_codigo_pedido: true,
    mostrar_cliente_nome: true,
    mostrar_cliente_telefone: true,
    mostrar_endereco_entrega: true,
    mostrar_forma_pagamento: true,
    mostrar_observacoes: true,
    mensagem_rodape: "Obrigado pela preferência!",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings`);
      const data = await response.json();
      
      if (data.impressao_config) {
        try {
          const impressaoConfig = JSON.parse(data.impressao_config);
          setConfig(prev => ({ ...prev, ...impressaoConfig }));
        } catch (e) {
          console.log("Usando configurações padrão");
        }
      }
      
      setEmpresaConfig({
        nome: data.company_name || "Minha Empresa",
        endereco: data.company_address || "",
        telefone: data.company_phone || "",
      });
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impressao_config: JSON.stringify(config) })
      });
      toast({ title: "Sucesso!", description: "Configurações salvas" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const pedidoExemplo = {
    codigo: "A001",
    cliente_nome: "João Silva",
    cliente_telefone: "(11) 99999-9999",
    tipo_entrega: "delivery",
    endereco_rua: "Rua das Flores",
    endereco_numero: "123",
    endereco_bairro: "Centro",
    endereco_complemento: "Apto 45",
    items: [
      { nome: "X-Burger", quantidade: 2, preco_unitario: 25.00, observacao: "Sem cebola" },
      { nome: "Batata Frita G", quantidade: 1, preco_unitario: 15.00 },
    ],
    valor_entrega: 5.00,
    total: 70.00,
    forma_pagamento: "Cartão de Crédito",
    observacao: "Entregar no portão",
    created_at: new Date().toISOString(),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configurações */}
      <div className="space-y-6">
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Configurações do Cupom</h2>
              <p className="text-sm text-muted-foreground">Defina o que aparece no cupom</p>
            </div>
          </div>

          {/* Toggle Impressão Automática */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">Impressão Automática</p>
                <p className="text-xs text-muted-foreground">Imprimir ao aceitar pedido</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('impressao_automatica')}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                config.impressao_automatica ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                config.impressao_automatica ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Informações no Cupom
            </h3>
            
            {[
              { key: 'mostrar_logo', label: 'Nome da Empresa', icon: Building2 },
              { key: 'mostrar_endereco_empresa', label: 'Endereço da Empresa', icon: MapPin },
              { key: 'mostrar_telefone_empresa', label: 'Telefone da Empresa', icon: Phone },
              { key: 'mostrar_data_hora', label: 'Data e Hora', icon: Calendar },
              { key: 'mostrar_codigo_pedido', label: 'Código do Pedido', icon: Hash },
              { key: 'mostrar_cliente_nome', label: 'Nome do Cliente', icon: Users },
              { key: 'mostrar_cliente_telefone', label: 'Telefone do Cliente', icon: Phone },
              { key: 'mostrar_endereco_entrega', label: 'Endereço de Entrega', icon: Map },
              { key: 'mostrar_forma_pagamento', label: 'Forma de Pagamento', icon: DollarSign },
              { key: 'mostrar_observacoes', label: 'Observações', icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    config[key] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    config[key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>

          {/* Mensagem Rodapé */}
          <div className="mt-6">
            <label className="text-sm font-medium mb-2 block">Mensagem do Rodapé</label>
            <Input
              value={config.mensagem_rodape}
              onChange={(e) => setConfig(prev => ({ ...prev, mensagem_rodape: e.target.value }))}
              placeholder="Obrigado pela preferência!"
              maxLength={50}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-6">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Configurações
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="lg:sticky lg:top-4 self-start">
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Preview do Cupom</h3>
          </div>
          
          <div className="bg-white border-2 border-dashed rounded-lg p-4 font-mono text-xs" style={{ maxWidth: '300px', margin: '0 auto' }}>
            <CupomPreview config={config} pedido={pedidoExemplo} empresa={empresaConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SUB-ABA: IMPRESSORAS ====================
function GerenciarImpressoras({ toast }) {
  const [impressoras, setImpressoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "termica",
    paper_width_mm: 80,
    printable_width_mm: 72,
    dpi: 203,
    printable_width_px: 576,
    font: "ESC_POS_FONT_A",
    max_columns: 48,
    margin_left: 0,
    margin_right: 0,
    margin_top: 0,
    margin_bottom: 0,
    ativa: true,
    padrao: false,
  });

  useEffect(() => {
    fetchImpressoras();
  }, []);

  const fetchImpressoras = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings`);
      const data = await response.json();
      if (data.impressoras) {
        try {
          setImpressoras(JSON.parse(data.impressoras));
        } catch (e) {
          setImpressoras([]);
        }
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const novaImpressora = {
      id: editando?.id || Date.now().toString(),
      ...formData,
    };

    let novaLista;
    if (editando) {
      novaLista = impressoras.map(i => i.id === editando.id ? novaImpressora : i);
    } else {
      novaLista = [...impressoras, novaImpressora];
    }

    // Se marcou como padrão, desmarcar as outras
    if (formData.padrao) {
      novaLista = novaLista.map(i => ({
        ...i,
        padrao: i.id === novaImpressora.id
      }));
    }

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impressoras: JSON.stringify(novaLista) })
      });
      setImpressoras(novaLista);
      setModalOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: editando ? "Impressora atualizada" : "Impressora cadastrada" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    const novaLista = impressoras.filter(i => i.id !== id);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impressoras: JSON.stringify(novaLista) })
      });
      setImpressoras(novaLista);
      toast({ title: "Sucesso!", description: "Impressora removida" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleEdit = (impressora) => {
    setEditando(impressora);
    setFormData({
      nome: impressora.nome,
      tipo: impressora.tipo,
      paper_width_mm: impressora.paper_width_mm,
      printable_width_mm: impressora.printable_width_mm,
      dpi: impressora.dpi,
      printable_width_px: impressora.printable_width_px,
      font: impressora.font,
      max_columns: impressora.max_columns,
      margin_left: impressora.margin_left || 0,
      margin_right: impressora.margin_right || 0,
      margin_top: impressora.margin_top || 0,
      margin_bottom: impressora.margin_bottom || 0,
      ativa: impressora.ativa,
      padrao: impressora.padrao,
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      nome: "",
      tipo: "termica",
      paper_width_mm: 80,
      printable_width_mm: 72,
      dpi: 203,
      printable_width_px: 576,
      font: "ESC_POS_FONT_A",
      max_columns: 48,
      margin_left: 0,
      margin_right: 0,
      margin_top: 0,
      margin_bottom: 0,
      ativa: true,
      padrao: false,
    });
  };

  const handleTestarImpressora = async (impressora) => {
    toast({ title: "Teste de Impressão", description: `Enviando teste para ${impressora.nome}...` });
    // Adiciona à fila de impressão
    const testePedido = {
      codigo: "TESTE",
      cliente_nome: "Teste de Impressão",
      items: [{ nome: "Item de Teste", quantidade: 1, preco_unitario: 0 }],
      total: 0,
      created_at: new Date().toISOString(),
    };
    
    window.dispatchEvent(new CustomEvent('addPrintQueue', { 
      detail: { pedido: testePedido, impressora } 
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Impressoras Cadastradas</h2>
          <p className="text-sm text-muted-foreground">Gerencie suas impressoras térmicas</p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Impressora
        </Button>
      </div>

      {/* Lista de Impressoras */}
      {impressoras.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Printer className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Nenhuma impressora cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre sua primeira impressora térmica para começar
          </p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Impressora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {impressoras.map((impressora) => (
            <div key={impressora.id} className={`bg-card border rounded-xl p-4 ${impressora.padrao ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${impressora.ativa ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Printer className={`w-5 h-5 ${impressora.ativa ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{impressora.nome}</h3>
                    {impressora.padrao && (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${impressora.ativa ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>

              <div className="space-y-1 text-xs text-muted-foreground mb-4">
                <p>Papel: {impressora.paper_width_mm}mm × {impressora.printable_width_mm}mm</p>
                <p>DPI: {impressora.dpi} | Colunas: {impressora.max_columns}</p>
                <p>Fonte: {impressora.font}</p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(impressora)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleTestarImpressora(impressora)}>
                  <Eye className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(impressora.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editando ? 'Editar Impressora' : 'Nova Impressora'}</h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome da Impressora</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Impressora Cozinha"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Largura Papel (mm)</label>
                  <Input
                    type="number"
                    value={formData.paper_width_mm}
                    onChange={(e) => setFormData(prev => ({ ...prev, paper_width_mm: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Largura Imprimível (mm)</label>
                  <Input
                    type="number"
                    value={formData.printable_width_mm}
                    onChange={(e) => setFormData(prev => ({ ...prev, printable_width_mm: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">DPI</label>
                  <Input
                    type="number"
                    value={formData.dpi}
                    onChange={(e) => setFormData(prev => ({ ...prev, dpi: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Largura (pixels)</label>
                  <Input
                    type="number"
                    value={formData.printable_width_px}
                    onChange={(e) => setFormData(prev => ({ ...prev, printable_width_px: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Fonte</label>
                  <select
                    value={formData.font}
                    onChange={(e) => setFormData(prev => ({ ...prev, font: e.target.value }))}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="ESC_POS_FONT_A">Font A (12x24)</option>
                    <option value="ESC_POS_FONT_B">Font B (9x17)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Máx. Colunas</label>
                  <Input
                    type="number"
                    value={formData.max_columns}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_columns: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Margens (mm)</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Esq.</label>
                    <Input
                      type="number"
                      value={formData.margin_left}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_left: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Dir.</label>
                    <Input
                      type="number"
                      value={formData.margin_right}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_right: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Topo</label>
                    <Input
                      type="number"
                      value={formData.margin_top}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_top: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Base</label>
                    <Input
                      type="number"
                      value={formData.margin_bottom}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_bottom: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Impressora Ativa</span>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, ativa: !prev.ativa }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    formData.ativa ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.ativa ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Impressora Padrão</span>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, padrao: !prev.padrao }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    formData.padrao ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.padrao ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={!formData.nome}>
                <Save className="w-4 h-4 mr-2" />
                {editando ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SUB-ABA: FILA DE IMPRESSÃO ====================
function FilaImpressao({ toast }) {
  const [fila, setFila] = useState([]);
  const [impressoras, setImpressoras] = useState([]);

  useEffect(() => {
    fetchImpressoras();
    
    // Carregar fila do localStorage
    const filaLocal = localStorage.getItem('fila_impressao');
    if (filaLocal) {
      try {
        setFila(JSON.parse(filaLocal));
      } catch (e) {
        setFila([]);
      }
    }

    // Listener para adicionar à fila
    const handleAddQueue = (event) => {
      const { pedido, impressora } = event.detail;
      addToQueue(pedido, impressora);
    };
    
    window.addEventListener('addPrintQueue', handleAddQueue);
    return () => window.removeEventListener('addPrintQueue', handleAddQueue);
  }, []);

  const fetchImpressoras = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings`);
      const data = await response.json();
      if (data.impressoras) {
        setImpressoras(JSON.parse(data.impressoras));
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const addToQueue = (pedido, impressora) => {
    const newItem = {
      id: Date.now().toString(),
      pedido,
      impressora,
      status: 'pendente', // pendente, imprimindo, sucesso, erro
      tentativas: 0,
      created_at: new Date().toISOString(),
      error: null,
    };
    
    setFila(prev => {
      const novaFila = [newItem, ...prev];
      localStorage.setItem('fila_impressao', JSON.stringify(novaFila));
      return novaFila;
    });

    // Tenta imprimir
    processQueue(newItem);
  };

  const processQueue = async (item) => {
    // Atualiza status para imprimindo
    updateItemStatus(item.id, 'imprimindo');

    try {
      // Simula impressão (em produção, conectar via Web USB ou servidor de impressão)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Para demonstração, usa window.print() como fallback
      const config = await fetchPrintConfig();
      const empresa = await fetchEmpresaConfig();
      
      printPedido(item.pedido, config, empresa);
      
      updateItemStatus(item.id, 'sucesso');
    } catch (error) {
      updateItemStatus(item.id, 'erro', error.message);
    }
  };

  const fetchPrintConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings`);
      const data = await response.json();
      if (data.impressao_config) {
        return JSON.parse(data.impressao_config);
      }
    } catch (e) {}
    return {};
  };

  const fetchEmpresaConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings`);
      const data = await response.json();
      return {
        nome: data.company_name || "Empresa",
        endereco: data.company_address || "",
        telefone: data.company_phone || "",
      };
    } catch (e) {}
    return {};
  };

  const updateItemStatus = (id, status, error = null) => {
    setFila(prev => {
      const novaFila = prev.map(item => 
        item.id === id 
          ? { ...item, status, error, tentativas: item.tentativas + (status === 'erro' ? 1 : 0) }
          : item
      );
      localStorage.setItem('fila_impressao', JSON.stringify(novaFila));
      return novaFila;
    });
  };

  const handleRetry = (item) => {
    processQueue(item);
  };

  const handleRemove = (id) => {
    setFila(prev => {
      const novaFila = prev.filter(item => item.id !== id);
      localStorage.setItem('fila_impressao', JSON.stringify(novaFila));
      return novaFila;
    });
  };

  const handleClearAll = () => {
    setFila([]);
    localStorage.removeItem('fila_impressao');
    toast({ title: "Fila limpa", description: "Todos os itens foram removidos" });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pendente': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'imprimindo': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'sucesso': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'erro': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'imprimindo': return 'Imprimindo...';
      case 'sucesso': return 'Impresso';
      case 'erro': return 'Erro';
      default: return status;
    }
  };

  const pendentes = fila.filter(i => i.status === 'pendente' || i.status === 'imprimindo').length;
  const erros = fila.filter(i => i.status === 'erro').length;

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Fila de Impressão</h2>
          <p className="text-sm text-muted-foreground">
            {pendentes > 0 && <span className="text-yellow-600">{pendentes} pendente(s)</span>}
            {pendentes > 0 && erros > 0 && " • "}
            {erros > 0 && <span className="text-red-600">{erros} com erro</span>}
            {pendentes === 0 && erros === 0 && "Nenhum item na fila"}
          </p>
        </div>
        {fila.length > 0 && (
          <Button variant="outline" onClick={handleClearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Fila
          </Button>
        )}
      </div>

      {/* Alerta de erros */}
      {erros > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div className="flex-1">
            <p className="font-medium text-red-700 dark:text-red-400">
              {erros} pedido(s) não foram impressos
            </p>
            <p className="text-sm text-red-600 dark:text-red-500">
              Verifique a conexão com a impressora e tente novamente
            </p>
          </div>
        </div>
      )}

      {/* Lista da Fila */}
      {fila.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <List className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Fila vazia</h3>
          <p className="text-sm text-muted-foreground">
            Os pedidos aparecerão aqui quando forem enviados para impressão
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fila.map((item) => (
            <div 
              key={item.id} 
              className={`bg-card border rounded-xl p-4 ${
                item.status === 'erro' ? 'border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-semibold">Pedido #{item.pedido.codigo}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.pedido.cliente_nome || 'Cliente'} • {new Date(item.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                    {item.impressora && (
                      <p className="text-xs text-muted-foreground">
                        Impressora: {item.impressora.nome}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'sucesso' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    item.status === 'erro' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    item.status === 'imprimindo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {getStatusText(item.status)}
                  </span>
                  
                  {item.status === 'erro' && (
                    <Button size="sm" variant="outline" onClick={() => handleRetry(item)}>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Tentar Novamente
                    </Button>
                  )}
                  
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(item.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {item.status === 'erro' && item.error && (
                <p className="text-xs text-red-600 mt-2 pl-8">
                  Erro: {item.error} (Tentativas: {item.tentativas})
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE PREVIEW DO CUPOM ====================
function CupomPreview({ config, pedido, empresa }) {
  const dataHora = new Date(pedido.created_at);
  
  return (
    <div className="text-center text-black">
      {config.mostrar_logo && (
        <div className="text-lg font-bold mb-1">{empresa.nome || "EMPRESA"}</div>
      )}
      {config.mostrar_endereco_empresa && empresa.endereco && (
        <div className="text-[10px]">{empresa.endereco}</div>
      )}
      {config.mostrar_telefone_empresa && empresa.telefone && (
        <div className="text-[10px]">{empresa.telefone}</div>
      )}
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      <div className="flex justify-between text-[10px]">
        {config.mostrar_codigo_pedido && <span>#{pedido.codigo}</span>}
        {config.mostrar_data_hora && (
          <span>{dataHora.toLocaleDateString('pt-BR')} {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {(config.mostrar_cliente_nome || config.mostrar_cliente_telefone) && (
        <>
          <div className="text-left">
            {config.mostrar_cliente_nome && pedido.cliente_nome && (
              <div className="font-bold">{pedido.cliente_nome}</div>
            )}
            {config.mostrar_cliente_telefone && pedido.cliente_telefone && (
              <div className="text-[10px]">{pedido.cliente_telefone}</div>
            )}
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
        </>
      )}
      
      {config.mostrar_endereco_entrega && pedido.tipo_entrega === 'delivery' && (
        <>
          <div className="text-left text-[10px]">
            <div className="font-bold">ENTREGA:</div>
            <div>{pedido.endereco_rua}, {pedido.endereco_numero}</div>
            {pedido.endereco_complemento && <div>{pedido.endereco_complemento}</div>}
            <div>{pedido.endereco_bairro}</div>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
        </>
      )}
      
      <div className="text-left">
        <div className="font-bold text-center mb-1">ITENS DO PEDIDO</div>
        {pedido.items.map((item, idx) => (
          <div key={idx} className="mb-1">
            <div className="flex justify-between">
              <span>{item.quantidade}x {item.nome}</span>
              <span>R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
            </div>
            {item.observacao && (
              <div className="text-[9px] text-gray-600 pl-2">→ {item.observacao}</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      <div className="text-left">
        {pedido.valor_entrega > 0 && (
          <div className="flex justify-between text-[10px]">
            <span>Taxa de Entrega:</span>
            <span>R$ {pedido.valor_entrega.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-1">
          <span>TOTAL:</span>
          <span>R$ {pedido.total.toFixed(2)}</span>
        </div>
      </div>
      
      {config.mostrar_forma_pagamento && pedido.forma_pagamento && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-[10px]">
            <span className="font-bold">PAGAMENTO: </span>
            {pedido.forma_pagamento}
          </div>
        </>
      )}
      
      {config.mostrar_observacoes && pedido.observacao && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-left text-[10px]">
            <div className="font-bold">OBS:</div>
            <div>{pedido.observacao}</div>
          </div>
        </>
      )}
      
      {config.mensagem_rodape && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-center text-[10px] italic">{config.mensagem_rodape}</div>
        </>
      )}
    </div>
  );
}

// ==================== FUNÇÃO DE IMPRESSÃO ====================
export function printPedido(pedido, config, empresa) {
  const dataHora = new Date(pedido.created_at || new Date());
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido #${pedido.codigo}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          background: white;
          color: black;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .small { font-size: 10px; }
        .large { font-size: 14px; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .row { display: flex; justify-content: space-between; }
        .item-obs { font-size: 9px; padding-left: 10px; color: #333; }
        .total-row { font-size: 14px; font-weight: bold; margin-top: 5px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
  `;

  if (config.mostrar_logo) {
    html += `<div class="center bold large">${empresa.nome || 'EMPRESA'}</div>`;
  }
  if (config.mostrar_endereco_empresa && empresa.endereco) {
    html += `<div class="center small">${empresa.endereco}</div>`;
  }
  if (config.mostrar_telefone_empresa && empresa.telefone) {
    html += `<div class="center small">${empresa.telefone}</div>`;
  }

  html += `<div class="divider"></div>`;
  html += `<div class="row small">`;
  if (config.mostrar_codigo_pedido) html += `<span class="bold">#${pedido.codigo}</span>`;
  if (config.mostrar_data_hora) html += `<span>${dataHora.toLocaleDateString('pt-BR')} ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
  html += `</div><div class="divider"></div>`;

  if (config.mostrar_cliente_nome && pedido.cliente_nome) {
    html += `<div class="bold">${pedido.cliente_nome}</div>`;
  }
  if (config.mostrar_cliente_telefone && pedido.cliente_telefone) {
    html += `<div class="small">${pedido.cliente_telefone}</div>`;
  }

  if (config.mostrar_endereco_entrega && pedido.tipo_entrega === 'delivery') {
    html += `<div class="divider"></div><div class="bold small">ENTREGA:</div>`;
    html += `<div class="small">${pedido.endereco_rua || ''}, ${pedido.endereco_numero || ''}</div>`;
    if (pedido.endereco_complemento) html += `<div class="small">${pedido.endereco_complemento}</div>`;
    html += `<div class="small">${pedido.endereco_bairro || ''}</div>`;
  } else if (pedido.tipo_entrega === 'retirada' || pedido.tipo_entrega === 'pickup') {
    html += `<div class="divider"></div><div class="bold center">*** RETIRADA NO LOCAL ***</div>`;
  }

  html += `<div class="divider"></div><div class="center bold">ITENS DO PEDIDO</div><div class="divider"></div>`;
  
  (pedido.items || []).forEach(item => {
    const itemTotal = (item.quantidade || 1) * (item.preco_unitario || item.preco || 0);
    html += `<div class="row"><span>${item.quantidade || 1}x ${item.nome || item.product_name || 'Item'}</span><span>R$ ${itemTotal.toFixed(2)}</span></div>`;
    if (item.observacao) html += `<div class="item-obs">→ ${item.observacao}</div>`;
    if (item.subitems && item.subitems.length > 0) {
      item.subitems.forEach(sub => {
        html += `<div class="item-obs">  • ${sub.nome || sub.name}${sub.preco > 0 ? ` (+R$ ${sub.preco.toFixed(2)})` : ''}</div>`;
      });
    }
  });

  html += `<div class="divider"></div>`;
  if (pedido.valor_entrega > 0) {
    html += `<div class="row small"><span>Taxa de Entrega:</span><span>R$ ${pedido.valor_entrega.toFixed(2)}</span></div>`;
  }
  html += `<div class="row total-row"><span>TOTAL:</span><span>R$ ${(pedido.total || 0).toFixed(2)}</span></div>`;

  if (config.mostrar_forma_pagamento && pedido.forma_pagamento) {
    html += `<div class="divider"></div><div class="small"><span class="bold">PAGAMENTO:</span> ${pedido.forma_pagamento}</div>`;
    if (pedido.troco_precisa && pedido.troco_valor) {
      html += `<div class="small">Troco para: R$ ${pedido.troco_valor.toFixed(2)}</div>`;
    }
  }

  if (config.mostrar_observacoes && pedido.observacao) {
    html += `<div class="divider"></div><div class="small bold">OBS:</div><div class="small">${pedido.observacao}</div>`;
  }

  if (config.mensagem_rodape) {
    html += `<div class="divider"></div><div class="center small" style="font-style: italic;">${config.mensagem_rodape}</div>`;
  }

  html += `
      <script>
        window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// Adicionar à fila de impressão (função global)
export function addToPrintQueue(pedido, impressora = null) {
  window.dispatchEvent(new CustomEvent('addPrintQueue', { 
    detail: { pedido, impressora } 
  }));
}
