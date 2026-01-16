import { useState, useEffect, useRef } from "react";
import { 
  Settings, Palette, Trash2, Building2, Printer, AlertTriangle, 
  Upload, X, Save, Loader2, CheckCircle, Image as ImageIcon,
  Instagram, Facebook, Mail, Phone, MapPin, Calendar, Hash,
  Package, ShoppingCart, Users, DollarSign, Map, RefreshCw,
  FileText, Eye, ToggleLeft, ToggleRight, Plus, Edit, Clock,
  AlertCircle, CheckCircle2, XCircle, RotateCcw, List, Usb, Type,
  Receipt, ChefHat
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


// ==================== PRINT CONNECTOR CONFIG ====================
const PRINT_CONNECTOR_URL = 'http://127.0.0.1:9100';

// ==================== ABA IMPRESSÃO ====================
function ImpressaoTab({ toast }) {
  const [activeSubTab, setActiveSubTab] = useState("connector");
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const subTabs = [
    { id: "connector", label: "Print Connector", icon: Usb },
    { id: "config", label: "Configurações", icon: Settings },
    { id: "fila", label: "Fila de Impressão", icon: List },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "download", label: "Download App", icon: Package },
  ];

  // Verificar status do Print Connector
  useEffect(() => {
    checkConnectorStatus();
    const interval = setInterval(checkConnectorStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkConnectorStatus = async () => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/health`, {
        method: 'GET',
        mode: 'cors',
      });
      if (response.ok) {
        const data = await response.json();
        setConnectorStatus({ online: true, ...data });
      } else {
        setConnectorStatus({ online: false });
      }
    } catch (error) {
      setConnectorStatus({ online: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Status Banner */}
      <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
        loading ? 'bg-gray-50 dark:bg-gray-900 border-gray-200' :
        connectorStatus?.online 
          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' 
          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
      }`}>
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          ) : connectorStatus?.online ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p className={`font-semibold ${
              loading ? 'text-gray-700' :
              connectorStatus?.online ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {loading ? 'Verificando Print Connector...' :
               connectorStatus?.online ? 'Print Connector Online' : 'Print Connector Offline'}
            </p>
            <p className="text-sm text-muted-foreground">
              {connectorStatus?.online ? (
                <>
                  v{connectorStatus.version} • 
                  {connectorStatus.printer_connected 
                    ? ` Impressora: ${connectorStatus.printer_name}` 
                    : ' Nenhuma impressora conectada'}
                  {connectorStatus.queue_size > 0 && ` • ${connectorStatus.queue_size} na fila`}
                </>
              ) : (
                'Instale e execute o Núcleo Print Connector para impressão automática'
              )}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkConnectorStatus}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Verificar
        </Button>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
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

      {activeSubTab === "connector" && <PrintConnectorTab toast={toast} connectorStatus={connectorStatus} onRefresh={checkConnectorStatus} onNavigateToDownload={() => setActiveSubTab("download")} />}
      {activeSubTab === "config" && <ConfiguracaoImpressao toast={toast} />}
      {activeSubTab === "fila" && <FilaImpressaoConnector toast={toast} connectorStatus={connectorStatus} />}
      {activeSubTab === "logs" && <LogsConnector toast={toast} connectorStatus={connectorStatus} />}
      {activeSubTab === "download" && <DownloadApp toast={toast} />}
    </div>
  );
}

// ==================== SUB-ABA: PRINT CONNECTOR ====================
function PrintConnectorTab({ toast, connectorStatus, onRefresh, onNavigateToDownload }) {
  const [printers, setPrinters] = useState([]);
  const [sectorPrinters, setSectorPrinters] = useState({});
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [configuringSector, setConfiguringSector] = useState(null);
  const [testing, setTesting] = useState(false);
  const [empresaData, setEmpresaData] = useState({
    nome: "Nome da Empresa",
    slogan: "",
    endereco: "",
    cnpj: "",
    logo_url: ""
  });

  // Setores disponíveis para configuração
  const availableSectors = [
    { id: 'caixa', name: 'Caixa', icon: Receipt, description: 'Cupom de Entrega', color: 'blue' },
    { id: 'cozinha', name: 'Cozinha', icon: ChefHat, description: 'Cupom de Preparo', color: 'orange' },
  ];

  useEffect(() => {
    if (connectorStatus?.online) {
      fetchPrinters();
      fetchSectorPrinters();
    }
  }, [connectorStatus?.online]);

  // Buscar dados da empresa ao montar o componente
  useEffect(() => {
    fetchEmpresaData();
  }, []);

  // Buscar dados da empresa
  const fetchEmpresaData = async () => {
    try {
      console.log('Buscando dados da empresa...');
      const response = await fetch(`${API_URL}/api/company/settings`);
      if (response.ok) {
        const data = await response.json();
        console.log('Dados da empresa recebidos:', data);
        setEmpresaData({
          nome: data.company_name || "Nome da Empresa",
          slogan: data.slogan || "",
          endereco: data.address || "",
          cnpj: data.cnpj || "",
          logo_url: data.logo_url || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    }
  };

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/printers`);
      if (response.ok) {
        const data = await response.json();
        setPrinters(data);
      }
    } catch (error) {
      console.error('Erro ao listar impressoras:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar impressoras configuradas por setor
  const fetchSectorPrinters = async () => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/printers/sectors`);
      if (response.ok) {
        const data = await response.json();
        setSectorPrinters(data);
      }
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
    }
  };

  // Configurar impressora para um setor
  const handleConfigureSector = async (printer, sectorId) => {
    setConfiguringSector(`${printer.id}-${sectorId}`);
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/printers/sector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: printer.name,
          sector: sectorId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const sectorName = availableSectors.find(s => s.id === sectorId)?.name || sectorId;
        toast({ title: "Sucesso!", description: `${printer.name} configurada para ${sectorName}` });
        fetchSectorPrinters();
      } else {
        throw new Error(data.error || 'Erro ao configurar setor');
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setConfiguringSector(null);
    }
  };

  // Remover impressora de um setor
  const handleRemoveSector = async (sectorId) => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/printers/sector/${sectorId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Removido", description: `Impressora removida do setor` });
        fetchSectorPrinters();
      } else {
        throw new Error(data.error || 'Erro ao remover');
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleConnect = async (printer) => {
    setConnecting(printer.id);
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/printers/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: printer.vendorId,
          productId: printer.productId,
          name: printer.name
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Sucesso!", description: `${printer.name} definida como padrão` });
        fetchPrinters();
        onRefresh();
      } else {
        throw new Error(data.error || 'Erro ao conectar');
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Criar pedido de teste completo igual à aba de Configuração
      const testePedido = {
        id: 'teste-' + Date.now(),
        codigo: "00001",
        cliente_nome: "João Silva",
        cliente_telefone: "(11) 9.9999-9999",
        tipo_entrega: "delivery",
        endereco_rua: "Rua das Flores",
        endereco_numero: "123",
        endereco_bairro: "Centro",
        endereco_complemento: "Casa azul - Meio do quarteirão",
        items: [
          { nome: "X-Burger", quantidade: 2, preco_unitario: 25.00, observacao: "Sem cebola" },
          { nome: "Batata Frita", quantidade: 1, preco_unitario: 15.00 },
        ],
        valor_entrega: 5.00,
        total: 70.00,
        forma_pagamento: "Cartão de Crédito",
        observacao: "",
        created_at: new Date().toISOString(),
      };

      // DEBUG - Log dos dados da empresa
      console.log('=== DEBUG DADOS EMPRESA ===');
      console.log('empresaData:', empresaData);
      console.log('===========================');

      const response = await fetch(`${PRINT_CONNECTOR_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          pedido: testePedido,
          template: 'caixa',
          copies: 1,
          cut: true,
          empresa: {
            nome: empresaData.nome,
            slogan: empresaData.slogan,
            endereco: empresaData.endereco,
            cnpj: empresaData.cnpj,
            logo_url: empresaData.logo_url
          },
          config: {
            mostrar_logo: true,
            mostrar_data_hora: true,
            mostrar_codigo_pedido: true,
            mostrar_cliente_nome: true,
            mostrar_cliente_telefone: true,
            mostrar_endereco_entrega: true,
            mostrar_forma_pagamento: true,
            mostrar_observacoes: true,
            mensagem_rodape: "NÃO É DOCUMENTO FISCAL"
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: "✅ Sucesso!", description: "Pedido de teste enviado para impressora" });
      } else {
        throw new Error(data.error || 'Erro no teste');
      }
    } catch (error) {
      console.error('Erro no teste de impressão:', error);
      
      // Verificar tipo de erro
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast({ 
          title: "❌ Print Connector inacessível", 
          description: "Verifique se o NucleoPrintConnector.exe está rodando",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "❌ Erro no teste", 
          description: error.message || "Falha ao imprimir teste",
          variant: "destructive" 
        });
      }
    } finally {
      setTesting(false);
    }
  };

  if (!connectorStatus?.online) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Print Connector Offline</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          O Núcleo Print Connector não está em execução. Baixe e instale o aplicativo para habilitar a impressão automática.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Verificar Novamente
          </Button>
          <Button onClick={onNavigateToDownload}>
            <Package className="w-4 h-4 mr-2" />
            Baixar Aplicativo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da Impressora */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              connectorStatus?.printer_connected 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              <Printer className={`w-6 h-6 ${
                connectorStatus?.printer_connected ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {connectorStatus?.printer_connected 
                  ? connectorStatus.printer_name 
                  : 'Nenhuma Impressora Selecionada'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {connectorStatus?.printer_connected 
                  ? 'Impressora padrão configurada' 
                  : 'Selecione uma impressora abaixo'}
              </p>
            </div>
          </div>
          
          {connectorStatus?.printer_connected && (
            <Button onClick={handleTest} disabled={testing}>
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Imprimir Teste
            </Button>
          )}
        </div>

        {/* Info ESC/POS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">80mm</p>
            <p className="text-xs text-muted-foreground">Papel</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">72mm</p>
            <p className="text-xs text-muted-foreground">Imprimível</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">203</p>
            <p className="text-xs text-muted-foreground">DPI</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">48</p>
            <p className="text-xs text-muted-foreground">Colunas</p>
          </div>
        </div>
      </div>

      {/* Lista de Impressoras */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Impressoras Detectadas</h3>
          <Button variant="outline" size="sm" onClick={fetchPrinters} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : printers.length === 0 ? (
          <div className="text-center py-8 bg-muted/50 rounded-lg">
            <Usb className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Nenhuma impressora USB detectada</p>
            <p className="text-sm text-muted-foreground">
              Conecte uma impressora térmica via USB
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {printers.map((printer) => (
              <div 
                key={printer.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  printer.is_default ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    printer.is_default ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                  }`}>
                    <Printer className={`w-5 h-5 ${
                      printer.is_default ? 'text-green-600' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{printer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {printer.driver || printer.vendorName || 'Impressora'} • {printer.port || 'USB'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {printer.is_default ? (
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full font-medium">
                      Padrão
                    </span>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(printer)}
                      disabled={connecting === printer.id}
                    >
                      {connecting === printer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Selecionar'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Impressoras por Setor */}
      {printers.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-500" />
            Impressoras por Setor
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure impressoras diferentes para cada setor. O cupom de entrega vai para o caixa, e o cupom de preparo vai para a cozinha.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {availableSectors.map((sector) => {
              const Icon = sector.icon;
              const sectorPrinter = sectorPrinters[sector.id];
              const colorClasses = sector.color === 'blue' 
                ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900'
                : 'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900';
              const iconClasses = sector.color === 'blue' ? 'text-blue-600' : 'text-orange-600';
              const badgeClasses = sector.color === 'blue'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';

              return (
                <div 
                  key={sector.id}
                  className={`p-4 rounded-lg border ${sectorPrinter ? colorClasses : 'bg-muted/30'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${sectorPrinter ? badgeClasses : 'bg-muted'}`}>
                      <Icon className={`w-5 h-5 ${sectorPrinter ? iconClasses : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-semibold">{sector.name}</p>
                      <p className="text-xs text-muted-foreground">{sector.description}</p>
                    </div>
                  </div>

                  {sectorPrinter ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">{sectorPrinter.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveSector(sector.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Selecione uma impressora:</p>
                      <div className="flex flex-wrap gap-2">
                        {printers.map((printer) => (
                          <Button
                            key={printer.id}
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfigureSector(printer, sector.id)}
                            disabled={configuringSector === `${printer.id}-${sector.id}`}
                            className="text-xs"
                          >
                            {configuringSector === `${printer.id}-${sector.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            {printer.name.length > 20 ? printer.name.substring(0, 20) + '...' : printer.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Como funciona
        </h4>
        <ul className="text-sm text-blue-600 dark:text-blue-500 space-y-1 list-disc list-inside">
          <li>O Print Connector detecta impressoras instaladas no Windows</li>
          <li>Configure impressoras diferentes para Caixa (entrega) e Cozinha (preparo)</li>
          <li>Pedidos serão impressos automaticamente via ESC/POS</li>
          <li>Não é necessário popup ou confirmação manual</li>
          <li>Funciona offline - basta ter o connector rodando</li>
        </ul>
      </div>
    </div>
  );
}

// ==================== SUB-ABA: FILA DE IMPRESSÃO (CONNECTOR) ====================
function FilaImpressaoConnector({ toast, connectorStatus }) {
  const [queue, setQueue] = useState({ pending: [], completed: [], failed: [], stats: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connectorStatus?.online) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 3000);
      return () => clearInterval(interval);
    }
  }, [connectorStatus?.online]);

  const fetchQueue = async () => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/queue`);
      if (response.ok) {
        const data = await response.json();
        setQueue(data);
      }
    } catch (error) {
      console.error('Erro ao buscar fila:', error);
    }
  };

  const handleRetry = async (jobId) => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/queue/retry/${jobId}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Job reenviado", description: "O pedido foi adicionado novamente à fila" });
        fetchQueue();
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleRemove = async (jobId) => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/queue/${jobId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Job removido" });
        fetchQueue();
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleClearQueue = async () => {
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/queue/clear`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Fila limpa" });
        fetchQueue();
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (!connectorStatus?.online) {
    return (
      <div className="text-center py-12">
        <List className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Print Connector offline</p>
      </div>
    );
  }

  const { stats } = queue;

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.pending_count || 0}</p>
          <p className="text-sm text-muted-foreground">Pendentes</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.completed_count || 0}</p>
          <p className="text-sm text-muted-foreground">Concluídos</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{stats.failed_count || 0}</p>
          <p className="text-sm text-muted-foreground">Com Erro</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">
            {stats.is_processing ? 'Sim' : 'Não'}
          </p>
          <p className="text-sm text-muted-foreground">Processando</p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={fetchQueue}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
        {(queue.pending?.length > 0 || queue.failed?.length > 0) && (
          <Button variant="outline" onClick={handleClearQueue}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Fila
          </Button>
        )}
      </div>

      {/* Jobs com Erro */}
      {queue.failed?.length > 0 && (
        <div className="bg-card border border-red-200 dark:border-red-900 rounded-xl p-4">
          <h3 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Jobs com Erro ({queue.failed.length})
          </h3>
          <div className="space-y-2">
            {queue.failed.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div>
                  <p className="font-medium">Pedido #{job.pedido?.codigo || job.id.slice(0, 8)}</p>
                  <p className="text-xs text-red-600">{job.error}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.attempts} tentativas • {new Date(job.failedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRetry(job.id)}>
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Tentar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(job.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs Pendentes */}
      {queue.pending?.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Na Fila ({queue.pending.length})
          </h3>
          <div className="space-y-2">
            {queue.pending.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Pedido #{job.pedido?.codigo || job.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    Template: {job.template} • {job.copies} cópia(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === 'printing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    job.status === 'printing' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {job.status === 'printing' ? 'Imprimindo' : 'Aguardando'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs Concluídos */}
      {queue.completed?.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Últimos Impressos ({queue.completed.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {queue.completed.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div>
                  <p className="font-medium">Pedido #{job.pedido?.codigo || job.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.completedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fila Vazia */}
      {queue.pending?.length === 0 && queue.failed?.length === 0 && queue.completed?.length === 0 && (
        <div className="text-center py-12 bg-card border rounded-xl">
          <List className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Fila vazia</h3>
          <p className="text-sm text-muted-foreground">
            Os pedidos aparecerão aqui quando forem enviados para impressão
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== SUB-ABA: LOGS ====================
function LogsConnector({ toast, connectorStatus }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connectorStatus?.online) {
      fetchLogs();
    }
  }, [connectorStatus?.online]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/logs?limit=200`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connectorStatus?.online) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Print Connector offline</p>
      </div>
    );
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
      case 'warn': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Logs do Print Connector</h3>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum log disponível
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Horário</th>
                  <th className="text-left p-3 font-medium">Nível</th>
                  <th className="text-left p-3 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-muted/30">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {log.message}
                      {log.data && (
                        <span className="text-muted-foreground ml-2">
                          {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== SUB-ABA: DOWNLOAD APP ====================
function DownloadApp({ toast }) {
  const [downloading, setDownloading] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDownloadInfo();
  }, []);

  const fetchDownloadInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/print-connector/download`);
      if (response.ok) {
        const data = await response.json();
        setDownloadInfo(data);
      }
    } catch (error) {
      console.error('Erro ao buscar info do download:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type) => {
    setDownloading(type);
    try {
      const endpoint = type === 'setup' 
        ? '/api/print-connector/download/setup'
        : '/api/print-connector/download/exe';
      
      const filename = type === 'setup'
        ? 'NucleoPrintConnector-Setup.zip'
        : 'NucleoPrintConnector.exe';
      
      const link = document.createElement('a');
      link.href = `${API_URL}${endpoint}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ 
        title: "Download iniciado!", 
        description: `Baixando ${filename}...` 
      });
    } catch (error) {
      toast({ 
        title: "Erro no download", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Card Principal */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/20 flex items-center justify-center">
          <Printer className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Núcleo Print Connector</h2>
        <p className="text-white/80 mb-6">
          Executável standalone para Windows - não precisa de Node.js instalado
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* Botão Download Setup (Recomendado) */}
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-white/90"
            onClick={() => handleDownload('setup')}
            disabled={downloading || loading || !downloadInfo?.setup_available}
          >
            {downloading === 'setup' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Package className="w-5 h-5 mr-2" />
            )}
            Baixar Instalador (15MB)
          </Button>

          {/* Botão Download EXE direto */}
          <Button 
            size="lg" 
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
            onClick={() => handleDownload('exe')}
            disabled={downloading || loading || !downloadInfo?.exe_available}
          >
            {downloading === 'exe' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <FileText className="w-5 h-5 mr-2" />
            )}
            Só o .EXE (37MB)
          </Button>
        </div>
        
        <p className="text-xs text-white/60 mt-4">
          {loading ? 'Verificando disponibilidade...' : (
            `Versão ${downloadInfo?.version || '1.0.0'} • ${downloadInfo?.platform || 'Windows 10/11 x64'}`
          )}
        </p>
      </div>

      {/* Status de Disponibilidade */}
      {!loading && downloadInfo && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Executável disponível para download
              </p>
              <p className="text-sm text-muted-foreground">
                Pronto para instalar em qualquer PC Windows (não precisa de Node.js)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo do Pacote */}
      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          O que está incluído
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <code className="bg-muted px-2 py-1 rounded text-xs">NucleoPrintConnector.exe</code> - Executável standalone (37MB)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <code className="bg-muted px-2 py-1 rounded text-xs">install.bat</code> - Instalador automático com atalhos
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <code className="bg-muted px-2 py-1 rounded text-xs">uninstall.bat</code> - Desinstalador
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Opção de iniciar automaticamente com o Windows
          </li>
        </ul>
      </div>

      {/* Requisitos */}
      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Requisitos
        </h3>
        <ul className="space-y-2 text-sm">
          {(downloadInfo?.requirements || ['Windows 10 ou 11 (64-bit)', 'Impressora térmica USB', 'Papel 80mm']).map((req, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {req}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium text-green-600">NÃO precisa de Node.js instalado</span>
          </li>
        </ul>
      </div>

      {/* Como instalar */}
      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          Como instalar
        </h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
            <span>Clique em <strong>"Baixar Instalador"</strong> acima</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
            <span>Extraia o ZIP em qualquer pasta</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
            <span>Execute <code className="bg-muted px-1 rounded">install.bat</code> como administrador</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
            <span>Escolha "Sim" para iniciar com Windows (recomendado)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">5</span>
            <span>Volte aqui e selecione sua impressora na aba "Print Connector"</span>
          </li>
        </ol>
      </div>

      {/* Especificações técnicas */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Especificações de Impressão
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-blue-600">80mm</p>
            <p className="text-xs text-muted-foreground">Papel</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">72mm</p>
            <p className="text-xs text-muted-foreground">Área imprimível</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">48 col</p>
            <p className="text-xs text-muted-foreground">Colunas</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">CP850</p>
            <p className="text-xs text-muted-foreground">Codepage PT-BR</p>
          </div>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-500 mt-3 text-center">
          ESC/POS profissional • 203 DPI • Corte automático • Sem popup de impressão
        </p>
      </div>
    </div>
  );
}

// ==================== SUB-ABA: CONFIGURAÇÕES ====================
function ConfiguracaoImpressao({ toast }) {
  const [config, setConfig] = useState({
    empresa_nome: "",
    empresa_slogan: "",
    empresa_logo_url: "",
    empresa_endereco: "",
    empresa_cnpj: "",
    mensagem_rodape: "NAO E DOCUMENTO FISCAL",
  });
  const [loading, setLoading] = useState(true);
  const [testingEntrega, setTestingEntrega] = useState(false);
  const [testingPreparo, setTestingPreparo] = useState(false);

  // Estado para controlar qual aba de preview está ativa
  const [previewTab, setPreviewTab] = useState("entrega");

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  // Buscar dados da empresa de CONFIGURAÇÃO -> EMPRESA
  const fetchCompanySettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/company/settings`);
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          empresa_nome: data.company_name || "Nome da Empresa",
          empresa_slogan: data.slogan || "",
          empresa_endereco: data.address || "",
          empresa_cnpj: data.cnpj || "",
          empresa_logo_url: data.logo_url || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  // Pedido exemplo para preview
  const pedidoExemplo = {
    codigo: "00001",
    cliente_nome: "João Silva",
    cliente_telefone: "(11) 9.9999-9999",
    tipo_entrega: "delivery",
    endereco_rua: "Rua das Flores",
    endereco_numero: "123",
    endereco_bairro: "Centro",
    endereco_complemento: "Casa azul - Meio do quarteirão",
    items: [
      { 
        nome: "X-Burger", 
        quantidade: 2, 
        preco_unitario: 25.00, 
        observacao: "Sem cebola", 
        tipo_combo: "combo",
        subitems: [
          { nome: "Coca Cola 310ml" },
          { nome: "Batata Individual", observacao: "Bem crocante" }
        ]
      },
      { nome: "Batata Frita", quantidade: 1, preco_unitario: 15.00, tipo_combo: "simples" },
    ],
    subtotal: 65.00,
    valor_entrega: 5.00,
    total: 70.00,
    forma_pagamento: "Cartão de Crédito",
    pagar_na_entrega: true,
    observacao: "Entregar rápido",
    created_at: new Date().toISOString(),
  };

  // Função para testar impressão
  const handleTestarImpressao = async (tipo) => {
    const isEntrega = tipo === 'entrega';
    if (isEntrega) setTestingEntrega(true);
    else setTestingPreparo(true);

    try {
      const response = await fetch(`${PRINT_CONNECTOR_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          pedido: pedidoExemplo,
          template: isEntrega ? 'caixa' : 'preparo',
          copies: 1,
          cut: true,
          sector: isEntrega ? 'caixa' : 'cozinha',
          empresa: {
            nome: config.empresa_nome,
            slogan: config.empresa_slogan,
            endereco: config.empresa_endereco,
            cnpj: config.empresa_cnpj,
            logo_url: config.empresa_logo_url
          },
          config: {
            mensagem_rodape: config.mensagem_rodape || "NÃO É DOCUMENTO FISCAL"
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({ 
          title: "✅ Sucesso!", 
          description: `Cupom de ${isEntrega ? 'Entrega' : 'Preparo'} enviado para impressora` 
        });
      } else {
        throw new Error(data.error || 'Erro no teste');
      }
    } catch (error) {
      console.error('Erro no teste de impressão:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast({ 
          title: "❌ Print Connector inacessível", 
          description: "Verifique se o NucleoPrintConnector.exe está rodando",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "❌ Erro no teste", 
          description: error.message || "Falha ao imprimir teste",
          variant: "destructive" 
        });
      }
    } finally {
      if (isEntrega) setTestingEntrega(false);
      else setTestingPreparo(false);
    }
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
      {/* Abas de Preview */}
      <div className="flex gap-2 border-b pb-4">
        <button
          onClick={() => setPreviewTab("entrega")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            previewTab === "entrega" 
              ? "bg-blue-500 text-white shadow-lg" 
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <Receipt className="w-5 h-5" />
          Cupom de Entrega
        </button>
        <button
          onClick={() => setPreviewTab("preparo")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            previewTab === "preparo" 
              ? "bg-orange-500 text-white shadow-lg" 
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <ChefHat className="w-5 h-5" />
          Cupom de Preparo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview do Cupom */}
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Preview - {previewTab === "entrega" ? "Cupom de Entrega" : "Cupom de Preparo"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {previewTab === "entrega" 
              ? "Este cupom é impresso no CAIXA e entregue ao cliente/entregador."
              : "Este cupom é impresso na COZINHA para preparação do pedido."
            }
          </p>
          <div className="bg-white dark:bg-gray-900 border-2 border-dashed rounded-lg p-4 font-mono text-[11px] overflow-auto" style={{ maxWidth: '320px', margin: '0 auto' }}>
            {previewTab === "entrega" ? (
              <CupomEntregaPreview config={config} pedido={pedidoExemplo} />
            ) : (
              <CupomPreparoPreview pedido={pedidoExemplo} />
            )}
          </div>
        </div>

        {/* Informações e Botão de Teste */}
        <div className="space-y-4">
          {/* Descrição do Cupom */}
          <div className={`border rounded-xl p-6 ${
            previewTab === "entrega" 
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900" 
              : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
          }`}>
            <h3 className={`font-semibold text-lg mb-3 flex items-center gap-2 ${
              previewTab === "entrega" ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"
            }`}>
              {previewTab === "entrega" ? (
                <>
                  <Receipt className="w-5 h-5" />
                  Cupom de Entrega (Caixa)
                </>
              ) : (
                <>
                  <ChefHat className="w-5 h-5" />
                  Cupom de Preparo (Cozinha)
                </>
              )}
            </h3>
            
            {previewTab === "entrega" ? (
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>Impresso na impressora do <strong>CAIXA</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>Contém dados da empresa, itens com preços e valores</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>Informações completas de entrega e pagamento</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>Entregue ao cliente ou entregador</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <span>Impresso na impressora da <strong>COZINHA</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <span>Mostra apenas: <strong>CÓDIGO, HORA, ITENS, OBSERVAÇÕES</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <span>Observações destacadas para atenção do cozinheiro</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <span>Nome do cliente para identificação</span>
                </li>
              </ul>
            )}
          </div>

          {/* Botão de Teste */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Printer className="w-5 h-5 text-green-500" />
              Testar Impressão
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Imprima um cupom de teste para verificar se está configurado corretamente.
            </p>
            <Button
              onClick={() => handleTestarImpressao(previewTab)}
              disabled={previewTab === "entrega" ? testingEntrega : testingPreparo}
              className={`w-full ${
                previewTab === "entrega" 
                  ? "bg-blue-500 hover:bg-blue-600" 
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {(previewTab === "entrega" ? testingEntrega : testingPreparo) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Imprimir Teste - {previewTab === "entrega" ? "Cupom de Entrega" : "Cupom de Preparo"}
            </Button>
          </div>

          {/* Dica sobre setores */}
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Dica: Configuração de Impressoras
            </h4>
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              Na aba "Print Connector", você pode configurar impressoras diferentes para cada setor 
              (Caixa, Cozinha, Bar, etc). Assim o cupom de entrega vai para uma impressora e 
              o cupom de preparo vai para outra automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTE: Preview Cupom de Entrega ====================
function CupomEntregaPreview({ config, pedido }) {
  return (
    <>
      {/* CABEÇALHO */}
      <div className="text-center mb-2">
        {config.empresa_logo_url ? (
          <img 
            src={`${API_URL}${config.empresa_logo_url}`} 
            alt="Logo" 
            className="mx-auto mb-2 object-contain"
            style={{ height: '120px' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="text-[10px] text-gray-400 mb-1">[LOGO]</div>
        )}
        <div className="font-bold text-sm uppercase">{config.empresa_nome || "Nome da Empresa"}</div>
        {config.empresa_slogan && <div className="text-[10px] text-gray-600">{config.empresa_slogan}</div>}
        {config.empresa_endereco && <div className="text-[10px]">{config.empresa_endereco}</div>}
        {config.empresa_cnpj && <div className="text-[10px]">CNPJ: {config.empresa_cnpj}</div>}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* CÓDIGO DO PEDIDO */}
      <div className="text-center mb-1">
        <span className="text-3xl font-bold">#{pedido.codigo}</span>
      </div>
      {/* DATA/HORA */}
      <div className="text-center text-[10px] mb-2">
        {new Date().toLocaleDateString('pt-BR')}, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* ITENS DO PEDIDO */}
      <div className="text-center font-bold mb-1">-- ITENS DO PEDIDO --</div>
      <div className="text-[9px] flex justify-between border-b border-gray-300 pb-1 mb-1">
        <span>QTD  PREÇO  ITEM</span>
        <span>TOTAL</span>
      </div>
      
      {pedido.items.map((item, i) => (
        <div key={i} className="mb-1">
          <div className="flex justify-between">
            <span>{item.quantidade} x {item.preco_unitario.toFixed(2)} {item.nome}</span>
            <span>R${(item.quantidade * item.preco_unitario).toFixed(2)}</span>
          </div>
          {item.observacao && (
            <div className="text-[9px] text-gray-600 pl-2">- {item.observacao}</div>
          )}
        </div>
      ))}
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* SUBTOTAIS */}
      {pedido.valor_entrega > 0 && (
        <div className="flex justify-between text-[10px]">
          <span>Taxa de Entrega:</span>
          <span>R$ {pedido.valor_entrega.toFixed(2)}</span>
        </div>
      )}
      
      <div className="flex justify-between font-bold">
        <span>TOTAL:</span>
        <span>R$ {pedido.total.toFixed(2)}</span>
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* PAGAMENTO */}
      <div className="text-center mb-2">
        <div className="font-bold mb-1">-- PAGAR NA ENTREGA --</div>
        <div className="text-base font-bold">TOTAL ....... R${pedido.total.toFixed(2).replace('.', ',')}</div>
        <div className="text-[10px]">PAGAMENTO: {pedido.forma_pagamento}</div>
      </div>
      
      {/* INFORMAÇÕES DE ENTREGA */}
      <div className="border-t border-dashed border-gray-400 my-2" />
      <div className="text-center font-bold mb-1">-- INFORMAÇÕES DE ENTREGA --</div>
      <div className="text-sm font-bold break-words">
        <div className="mb-1">CLIENTE: {pedido.cliente_nome}</div>
        <div className="mb-1">TEL: {pedido.cliente_telefone}</div>
        <div className="mb-1">END: {pedido.endereco_rua}, {pedido.endereco_numero}</div>
        <div className="mb-1">BAIRRO: {pedido.endereco_bairro}</div>
        <div className="mb-1">REF: {pedido.endereco_complemento}</div>
      </div>
      
      {/* RODAPÉ */}
      <div className="border-t-2 border-gray-800 my-2" />
      <div className="text-center font-bold text-[10px]">{config.mensagem_rodape || "NÃO É DOCUMENTO FISCAL"}</div>
    </>
  );
}

// ==================== COMPONENTE: Preview Cupom de Preparo ====================
function CupomPreparoPreview({ pedido }) {
  return (
    <>
      {/* 2 ESPAÇOS NO INÍCIO */}
      <div className="h-4" />
      <div className="h-4" />
      
      {/* TÍTULO */}
      <div className="text-center mb-2">
        <div className="text-xl font-bold">** PREPARO **</div>
      </div>
      
      {/* CÓDIGO DO PEDIDO */}
      <div className="text-center mb-1">
        <span className="text-4xl font-bold">#{pedido.codigo}</span>
      </div>
      
      {/* HORA */}
      <div className="text-center text-2xl font-bold mb-2">
        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* NOME DO CLIENTE */}
      <div className="text-center text-lg font-bold mb-2">
        CLIENTE: {pedido.cliente_nome}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* ITENS */}
      <div className="text-center font-bold mb-2">-- ITENS --</div>
      
      {pedido.items.map((item, i) => {
        const isCombo = item.tipo_combo?.toLowerCase() === 'combo';
        return (
          <div key={i} className="mb-1">
            {/* Item principal com tipo ao lado */}
            <div className="text-lg font-bold">
              {item.quantidade}x {item.nome}{isCombo ? ' -> COMBO' : ''}
            </div>
            
            {/* Subitems do combo (bebidas, acompanhamentos) - MESMO TAMANHO */}
            {isCombo && item.subitems && item.subitems.map((sub, j) => (
              <div key={`sub-${j}`} className="text-lg font-bold ml-2">
                -&gt; {sub.nome || sub.name}
              </div>
            ))}
            
            {/* Adicionais - MESMO TAMANHO */}
            {isCombo && item.adicionais && item.adicionais.map((add, j) => (
              <div key={`add-${j}`} className="text-lg font-bold ml-2">
                -&gt; {add.nome}
              </div>
            ))}
            
            {/* Tipo SIMPLES */}
            {!isCombo && item.tipo_combo && (
              <div className="text-[10px] text-gray-600">[{item.tipo_combo.toUpperCase()}]</div>
            )}
            
            {/* Observação do item principal */}
            {item.observacao && (
              <div className="text-sm font-bold text-orange-600 ml-8">
                &gt;&gt;&gt; {item.observacao}
              </div>
            )}
            
            {/* Linha separadora entre itens */}
            {i < pedido.items.length - 1 && (
              <div className="text-gray-400 text-xs my-1">--------------------------</div>
            )}
          </div>
        );
      })}
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* RODAPÉ */}
      <div className="text-center text-[10px]">
        {new Date().toLocaleString('pt-BR')}
      </div>
    </>
  );
}

const API_URL_CONST = API_URL;

// Função auxiliar para buscar impressora padrão
async function fetchImpressoraPadrao() {
  try {
    const response = await fetch(`${API_URL}/api/settings`);
    const data = await response.json();
    if (data.impressoras) {
      const impressoras = JSON.parse(data.impressoras);
      return impressoras.find(i => i.padrao && i.ativa) || impressoras.find(i => i.ativa);
    }
  } catch (e) {}
  return null;
}

// ==================== SUB-ABA: IMPRESSORAS ====================
function GerenciarImpressoras({ toast }) {
  const [impressoras, setImpressoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [usbSupported, setUsbSupported] = useState(false);
  const [editando, setEditando] = useState(null);
  const [empresaData, setEmpresaData] = useState({
    nome: "Nome da Empresa",
    slogan: "",
    endereco: "",
    cnpj: "",
    telefone: "",
    logo_url: ""
  });
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "usb", // usb, rede, bluetooth
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
    // Info do dispositivo USB
    vendorId: null,
    productId: null,
    deviceName: "",
  });

  useEffect(() => {
    // Verificar se Web USB é suportado
    setUsbSupported('usb' in navigator);
    fetchImpressoras();
    fetchEmpresaData();
  }, []);

  // Buscar dados da empresa de CONFIGURAÇÃO -> EMPRESA
  const fetchEmpresaData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/company/settings`);
      if (response.ok) {
        const data = await response.json();
        setEmpresaData({
          nome: data.company_name || "Nome da Empresa",
          slogan: data.slogan || "",
          endereco: data.address || "",
          cnpj: data.cnpj || "",
          telefone: data.phone || "",
          logo_url: data.logo_url || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    }
  };

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

  // Solicitar acesso a dispositivo USB (impressora)
  const handleRequestUSBDevice = async () => {
    if (!usbSupported) {
      toast({ 
        title: "Não suportado", 
        description: "Seu navegador não suporta Web USB. Use Chrome ou Edge.", 
        variant: "destructive" 
      });
      return;
    }

    setScanning(true);
    try {
      // Filtros comuns para impressoras térmicas
      const device = await navigator.usb.requestDevice({
        filters: [
          // Impressoras térmicas genéricas
          { classCode: 7 }, // Classe de impressoras
          // Fabricantes comuns de impressoras térmicas
          { vendorId: 0x0483 }, // STMicroelectronics (muitas impressoras térmicas)
          { vendorId: 0x0525 }, // Netchip
          { vendorId: 0x04b8 }, // EPSON
          { vendorId: 0x0416 }, // Winbond (Epson compatível)
          { vendorId: 0x0dd4 }, // Custom Engineering
          { vendorId: 0x1504 }, // HPRT
          { vendorId: 0x0fe6 }, // ICS Advent
          { vendorId: 0x1fc9 }, // NXP
          { vendorId: 0x20d1 }, // SIMCOM
          { vendorId: 0x1a86 }, // QinHeng Electronics (CH340)
          { vendorId: 0x067b }, // Prolific (PL2303)
        ]
      });

      if (device) {
        // Preencher dados do dispositivo encontrado
        setFormData(prev => ({
          ...prev,
          nome: device.productName || `Impressora USB ${device.vendorId}`,
          deviceName: device.productName || "Dispositivo USB",
          vendorId: device.vendorId,
          productId: device.productId,
          tipo: "usb",
        }));
        setModalOpen(true);
        
        toast({ 
          title: "Dispositivo encontrado!", 
          description: `${device.productName || 'Impressora USB'} detectada` 
        });
      }
    } catch (error) {
      if (error.name === 'NotFoundError') {
        toast({ 
          title: "Nenhum dispositivo selecionado", 
          description: "Selecione uma impressora na lista", 
          variant: "destructive" 
        });
      } else {
        console.error("Erro USB:", error);
        toast({ 
          title: "Erro", 
          description: error.message || "Erro ao acessar dispositivo USB", 
          variant: "destructive" 
        });
      }
    } finally {
      setScanning(false);
    }
  };

  // Tentar reconectar a dispositivos já autorizados
  const handleReconnectDevices = async () => {
    if (!usbSupported) return;
    
    setScanning(true);
    try {
      const devices = await navigator.usb.getDevices();
      
      if (devices.length === 0) {
        toast({ 
          title: "Nenhum dispositivo", 
          description: "Nenhuma impressora autorizada anteriormente" 
        });
      } else {
        toast({ 
          title: `${devices.length} dispositivo(s) encontrado(s)`, 
          description: "Dispositivos já autorizados estão disponíveis" 
        });
        
        // Atualizar status de conexão das impressoras cadastradas
        const impressorasAtualizadas = impressoras.map(imp => {
          const deviceMatch = devices.find(d => 
            d.vendorId === imp.vendorId && d.productId === imp.productId
          );
          return {
            ...imp,
            conectada: !!deviceMatch
          };
        });
        setImpressoras(impressorasAtualizadas);
      }
    } catch (error) {
      console.error("Erro ao reconectar:", error);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome) {
      toast({ title: "Erro", description: "Digite um nome para a impressora", variant: "destructive" });
      return;
    }

    const novaImpressora = {
      id: editando?.id || Date.now().toString(),
      ...formData,
      conectada: false,
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
      tipo: impressora.tipo || "usb",
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
      vendorId: impressora.vendorId,
      productId: impressora.productId,
      deviceName: impressora.deviceName,
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      nome: "",
      tipo: "usb",
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
      vendorId: null,
      productId: null,
      deviceName: "",
    });
  };

  // Testar impressão real via USB ou fallback
  const handleTestarImpressora = async (impressora) => {
    const testePedido = {
      id: 'teste-' + Date.now(),
      codigo: "00001",
      cliente_nome: "João Silva",
      cliente_telefone: "(11) 9.9999-9999",
      tipo_entrega: "delivery",
      endereco_rua: "Rua das Flores",
      endereco_numero: "123",
      endereco_bairro: "Centro",
      endereco_complemento: "Casa azul - Meio do quarteirão",
      items: [
        { nome: "X-Burger", quantidade: 2, preco_unitario: 25.00, observacao: "Sem cebola" },
        { nome: "Batata Frita", quantidade: 1, preco_unitario: 15.00 },
      ],
      valor_entrega: 5.00,
      total: 70.00,
      forma_pagamento: "Cartão de Crédito",
      observacao: "",
      created_at: new Date().toISOString(),
    };

    // Se é USB e tem vendorId, tentar impressão direta
    if (impressora.tipo === 'usb' && impressora.vendorId && 'usb' in navigator) {
      toast({ title: "Enviando teste...", description: `Para ${impressora.nome}` });
      
      try {
        // Buscar dispositivos autorizados
        const devices = await navigator.usb.getDevices();
        const device = devices.find(d => 
          d.vendorId === impressora.vendorId && d.productId === impressora.productId
        );

        if (!device) {
          toast({ 
            title: "Dispositivo não encontrado", 
            description: "Clique em 'Buscar Impressoras USB' para reconectar", 
            variant: "destructive" 
          });
          return;
        }

        // Abrir conexão
        await device.open();
        
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
        
        const iface = device.configuration.interfaces.find(i => 
          i.alternate.interfaceClass === 7
        ) || device.configuration.interfaces[0];
        
        await device.claimInterface(iface.interfaceNumber);

        const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out');

        if (endpoint) {
          // Comandos ESC/POS para teste
          const ESC = 0x1B;
          const GS = 0x1D;
          const encoder = new TextEncoder();
          
          const commands = new Uint8Array([
            ESC, 0x40, // Inicializar
            ESC, 0x61, 0x01, // Centralizar
            ESC, 0x21, 0x30, // Texto grande
            ...encoder.encode('=== TESTE ===\n'),
            ESC, 0x21, 0x00, // Texto normal
            ...encoder.encode('\n'),
            ...encoder.encode(`Impressora: ${impressora.nome}\n`),
            ...encoder.encode(`Papel: ${impressora.paper_width_mm}mm\n`),
            ...encoder.encode(`DPI: ${impressora.dpi}\n`),
            ...encoder.encode(`Colunas: ${impressora.max_columns}\n`),
            ...encoder.encode('--------------------------------\n'),
            ESC, 0x61, 0x00, // Alinhar esquerda
            ...encoder.encode('-- ITENS DO PEDIDO --\n'),
            ...encoder.encode('2 x 25.00 X-Burger       R$50,00\n'),
            ...encoder.encode('  - Sem cebola\n'),
            ...encoder.encode('1 x 15.00 Batata Frita   R$15,00\n'),
            ...encoder.encode('--------------------------------\n'),
            ...encoder.encode('Taxa de Entrega:          R$5,00\n'),
            ESC, 0x21, 0x10, // Negrito
            ...encoder.encode('TOTAL:                   R$70,00\n'),
            ESC, 0x21, 0x00, // Normal
            ...encoder.encode('--------------------------------\n'),
            ESC, 0x61, 0x01, // Centralizar
            ...encoder.encode('-- PAGAR NA ENTREGA --\n'),
            ESC, 0x21, 0x30, // Negrito + Dupla altura
            ...encoder.encode('TOTAL ....... R$70,00\n'),
            ESC, 0x21, 0x00, // Normal
            ...encoder.encode('PAGAMENTO: Cartao de Credito\n'),
            ...encoder.encode('--------------------------------\n'),
            ...encoder.encode('-- INFO ENTREGA --\n'),
            ESC, 0x61, 0x00, // Alinhar esquerda
            ...encoder.encode('CLIENTE: Joao Silva\n'),
            ...encoder.encode('TEL: (11) 9.9999-9999\n'),
            ...encoder.encode('END: Rua das Flores, 123\n'),
            ...encoder.encode('REF: Casa azul\n'),
            ESC, 0x61, 0x01, // Centralizar
            ...encoder.encode('================================\n'),
            ...encoder.encode('NAO E DOCUMENTO FISCAL\n'),
            ...encoder.encode(new Date().toLocaleString('pt-BR') + '\n'),
            ...encoder.encode('\n\n\n'),
            GS, 0x56, 0x00, // Cortar papel
          ]);

          await device.transferOut(endpoint.endpointNumber, commands);
          toast({ title: "Sucesso!", description: "Teste impresso com sucesso!" });
        }

        await device.releaseInterface(iface.interfaceNumber);
        await device.close();

      } catch (error) {
        console.error("Erro no teste USB:", error);
        toast({ 
          title: "Erro na impressão USB", 
          description: error.message || "Usando fallback...", 
          variant: "destructive" 
        });
        // Fallback para window.print
        const config = { mostrar_logo: true, mostrar_data_hora: true, mostrar_codigo_pedido: true, mostrar_cliente_nome: true, mostrar_cliente_telefone: true, mostrar_endereco_entrega: true, mostrar_forma_pagamento: true, mostrar_observacoes: true, mensagem_rodape: "NÃO É DOCUMENTO FISCAL" };
        const empresa = { nome: empresaData.nome, slogan: empresaData.slogan, endereco: empresaData.endereco, cnpj: empresaData.cnpj, logo_url: empresaData.logo_url };
        printPedido(testePedido, config, empresa);
      }
    } else {
      // Impressora manual - usar window.print
      toast({ title: "Abrindo teste...", description: "Será aberta uma janela de impressão" });
      const config = { mostrar_logo: true, mostrar_data_hora: true, mostrar_codigo_pedido: true, mostrar_cliente_nome: true, mostrar_cliente_telefone: true, mostrar_endereco_entrega: true, mostrar_forma_pagamento: true, mostrar_observacoes: true, mensagem_rodape: "NÃO É DOCUMENTO FISCAL" };
      const empresa = { nome: empresaData.nome, slogan: empresaData.slogan, endereco: empresaData.endereco, cnpj: empresaData.cnpj, logo_url: empresaData.logo_url };
      printPedido(testePedido, config, empresa);
    }
  };

  // Adicionar impressora manualmente (sem USB)
  const handleAddManual = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      tipo: "manual",
      nome: "Impressora Manual",
    }));
    setModalOpen(true);
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
      {/* Aviso de suporte */}
      {!usbSupported && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Web USB não suportado
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Use Google Chrome ou Microsoft Edge para conectar impressoras USB diretamente.
              Alternativamente, configure uma impressora manual.
            </p>
          </div>
        </div>
      )}

      {/* Header com botões */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Impressoras</h2>
          <p className="text-sm text-muted-foreground">
            Conecte impressoras térmicas USB para impressão automática
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReconnectDevices} disabled={scanning || !usbSupported}>
            <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
            Reconectar
          </Button>
          <Button onClick={handleRequestUSBDevice} disabled={scanning || !usbSupported}>
            {scanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Usb className="w-4 h-4 mr-2" />
            )}
            Buscar Impressoras USB
          </Button>
          <Button variant="outline" onClick={handleAddManual}>
            <Plus className="w-4 h-4 mr-2" />
            Manual
          </Button>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
          <Usb className="w-4 h-4" />
          Como conectar sua impressora
        </h3>
        <ol className="text-sm text-blue-600 dark:text-blue-500 space-y-1 list-decimal list-inside">
          <li>Conecte a impressora térmica via USB no computador</li>
          <li>Clique em "Buscar Impressoras USB"</li>
          <li>Selecione sua impressora na lista que aparecerá</li>
          <li>Configure os parâmetros (papel 80mm, DPI, etc.)</li>
          <li>Marque como "Padrão" para usar automaticamente</li>
        </ol>
      </div>

      {/* Lista de Impressoras */}
      {impressoras.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Printer className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Nenhuma impressora cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Conecte uma impressora USB ou adicione manualmente
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {impressoras.map((impressora) => (
            <div key={impressora.id} className={`bg-card border rounded-xl p-4 ${impressora.padrao ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${impressora.ativa ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    {impressora.tipo === 'usb' ? (
                      <Usb className={`w-5 h-5 ${impressora.ativa ? 'text-green-600' : 'text-gray-400'}`} />
                    ) : (
                      <Printer className={`w-5 h-5 ${impressora.ativa ? 'text-green-600' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{impressora.nome}</h3>
                    <div className="flex items-center gap-2">
                      {impressora.padrao && (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          Padrão
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {impressora.tipo === 'usb' ? 'USB' : 'Manual'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${impressora.conectada ? 'bg-green-500' : impressora.ativa ? 'bg-yellow-500' : 'bg-gray-400'}`} 
                     title={impressora.conectada ? 'Conectada' : impressora.ativa ? 'Ativa' : 'Inativa'} />
              </div>

              <div className="space-y-1 text-xs text-muted-foreground mb-4">
                <p>Papel: {impressora.paper_width_mm}mm × {impressora.printable_width_mm}mm</p>
                <p>DPI: {impressora.dpi} | Colunas: {impressora.max_columns}</p>
                {impressora.vendorId && (
                  <p>VID: {impressora.vendorId.toString(16).toUpperCase()} | PID: {impressora.productId?.toString(16).toUpperCase()}</p>
                )}
              </div>

              {/* Botão de Teste Grande */}
              <Button 
                size="sm" 
                className="w-full mb-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleTestarImpressora(impressora)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Teste
              </Button>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(impressora)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
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

            {formData.vendorId && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Dispositivo USB detectado: {formData.deviceName}
                </p>
              </div>
            )}

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
                    onChange={(e) => setFormData(prev => ({ ...prev, paper_width_mm: parseInt(e.target.value) || 80 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Largura Imprimível (mm)</label>
                  <Input
                    type="number"
                    value={formData.printable_width_mm}
                    onChange={(e) => setFormData(prev => ({ ...prev, printable_width_mm: parseInt(e.target.value) || 72 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">DPI</label>
                  <Input
                    type="number"
                    value={formData.dpi}
                    onChange={(e) => setFormData(prev => ({ ...prev, dpi: parseInt(e.target.value) || 203 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Largura (pixels)</label>
                  <Input
                    type="number"
                    value={formData.printable_width_px}
                    onChange={(e) => setFormData(prev => ({ ...prev, printable_width_px: parseInt(e.target.value) || 576 }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, max_columns: parseInt(e.target.value) || 48 }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_left: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Dir.</label>
                    <Input
                      type="number"
                      value={formData.margin_right}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_right: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Topo</label>
                    <Input
                      type="number"
                      value={formData.margin_top}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_top: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Base</label>
                    <Input
                      type="number"
                      value={formData.margin_bottom}
                      onChange={(e) => setFormData(prev => ({ ...prev, margin_bottom: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t">
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const config = await fetchPrintConfig();
      const empresa = await fetchEmpresaConfig();
      
      // Tentar impressão USB primeiro
      if ('usb' in navigator && item.impressora?.vendorId) {
        const success = await printViaUSB(item.pedido, item.impressora, config, empresa);
        if (success) {
          updateItemStatus(item.id, 'sucesso');
          // Notificar sucesso
          window.dispatchEvent(new CustomEvent('printSuccess', { detail: { pedidoId: item.pedido.id } }));
          return;
        }
      }
      
      // Fallback para window.print()
      printPedido(item.pedido, config, empresa);
      updateItemStatus(item.id, 'sucesso');
      window.dispatchEvent(new CustomEvent('printSuccess', { detail: { pedidoId: item.pedido.id } }));
      
    } catch (error) {
      updateItemStatus(item.id, 'erro', error.message);
      // Notificar erro
      window.dispatchEvent(new CustomEvent('printError', { detail: { pedidoId: item.pedido.id } }));
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
  const dataStr = dataHora.toLocaleDateString('pt-BR');
  const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const codigoPedido = String(pedido.codigo || '00001').padStart(5, '0');
  
  return (
    <div className="font-mono text-black text-[11px] leading-tight">
      {/* ===== CABEÇALHO ===== */}
      <div className="text-center mb-2">
        {config.mostrar_logo && (
          <div className="text-[10px] text-gray-500 mb-1">[LOGO]</div>
        )}
        <div className="text-sm font-bold uppercase">{empresa.nome || "Nome da Empresa"}</div>
        {empresa.slogan && (
          <div className="text-[10px] text-gray-600">{empresa.slogan}</div>
        )}
        {empresa.endereco && (
          <div className="text-[10px]">{empresa.endereco}</div>
        )}
        {empresa.cnpj && (
          <div className="text-[10px]">CNPJ: {empresa.cnpj}</div>
        )}
      </div>
      
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {/* ===== NÚMERO DO PEDIDO E DATA ===== */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold">#{codigoPedido}</span>
        <span className="text-[10px] text-right">{dataStr}, {horaStr}</span>
      </div>
      
      {/* ===== ITENS DO PEDIDO ===== */}
      <div className="border-t border-dashed border-gray-400 my-2" />
      <div className="text-center font-bold mb-1">-- ITENS DO PEDIDO --</div>
      <div className="text-[9px] flex justify-between border-b border-gray-300 pb-1 mb-1">
        <span>QTD  PREÇO  ITEM</span>
        <span>TOTAL</span>
      </div>
      
      <div className="mb-2">
        {pedido.items.map((item, idx) => (
          <div key={idx} className="mb-1">
            <div className="flex justify-between">
              <span>{item.quantidade} x {item.preco_unitario.toFixed(2)} {item.nome}</span>
              <span>R${(item.quantidade * item.preco_unitario).toFixed(2)}</span>
            </div>
            {item.observacao && (
              <div className="text-[9px] text-gray-600 pl-2">- {item.observacao}</div>
            )}
          </div>
        ))}
      </div>
      
      {/* ===== SUBTOTAIS ===== */}
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      {pedido.valor_entrega > 0 && (
        <div className="flex justify-between text-[10px]">
          <span>Taxa de Entrega:</span>
          <span>R$ {pedido.valor_entrega.toFixed(2)}</span>
        </div>
      )}
      
      <div className="flex justify-between font-bold">
        <span>TOTAL:</span>
        <span>R$ {pedido.total.toFixed(2)}</span>
      </div>
      
      {/* ===== SEÇÃO DE PAGAMENTO ===== */}
      <div className="border-t border-dashed border-gray-400 my-2" />
      <div className="text-center">
        <div className="font-bold mb-1">-- PAGAR NA ENTREGA --</div>
        <div className="text-base font-bold">TOTAL ....... R${pedido.total.toFixed(2).replace('.', ',')}</div>
        {pedido.forma_pagamento && (
          <div className="text-[10px]">PAGAMENTO: {pedido.forma_pagamento}</div>
        )}
      </div>
      
      {/* ===== INFORMAÇÕES DE ENTREGA ===== */}
      {pedido.tipo_entrega === 'delivery' && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-center font-bold mb-1">-- INFORMAÇÕES DE ENTREGA --</div>
          <div className="text-left text-[10px]">
            {pedido.cliente_nome && <div><span className="font-bold">CLIENTE:</span> {pedido.cliente_nome}</div>}
            {pedido.cliente_telefone && <div><span className="font-bold">TEL:</span> {pedido.cliente_telefone}</div>}
            {pedido.endereco_rua && <div><span className="font-bold">END:</span> {pedido.endereco_rua}{pedido.endereco_numero ? ', ' + pedido.endereco_numero : ''}</div>}
            {pedido.endereco_bairro && <div><span className="font-bold">BAIRRO:</span> {pedido.endereco_bairro}</div>}
            {pedido.endereco_complemento && <div><span className="font-bold">REF:</span> {pedido.endereco_complemento}</div>}
          </div>
        </>
      )}
      
      {pedido.tipo_entrega === 'retirada' && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-center font-bold mb-1">-- RETIRADA NO LOCAL --</div>
          <div className="text-center text-[10px]">
            {pedido.cliente_nome && <div>CLIENTE: {pedido.cliente_nome}</div>}
            {pedido.cliente_telefone && <div>TEL: {pedido.cliente_telefone}</div>}
          </div>
        </>
      )}
      
      {/* ===== OBSERVAÇÕES ===== */}
      {config.mostrar_observacoes && pedido.observacao && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-[10px]"><span className="font-bold">OBS:</span> {pedido.observacao}</div>
        </>
      )}
      
      {/* ===== RODAPÉ ===== */}
      <div className="border-t-2 border-gray-800 my-2" />
      <div className="text-center font-bold text-[10px]">
        {config.mensagem_rodape || 'NÃO É DOCUMENTO FISCAL'}
      </div>
    </div>
  );
}

// ==================== FUNÇÃO DE IMPRESSÃO ====================
export function printPedido(pedido, config, empresa) {
  const dataHora = new Date(pedido.created_at || new Date());
  const dataStr = dataHora.toLocaleDateString('pt-BR');
  const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
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
          font-family: 'Courier New', 'Lucida Console', monospace;
          font-size: 12px;
          width: 80mm;
          padding: 3mm;
          background: white;
          color: #000;
          line-height: 1.3;
        }
        
        .center { text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .small { font-size: 10px; }
        .large { font-size: 14px; }
        .xlarge { font-size: 18px; }
        .xxlarge { font-size: 22px; }
        
        .separator { 
          border-top: 1px dashed #000; 
          margin: 6px 0; 
        }
        .separator-double { 
          border-top: 2px solid #000; 
          margin: 8px 0; 
        }
        
        .header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1px dashed #000;
          margin-bottom: 8px;
        }
        .header .logo-img {
          height: 120px;
          max-width: 100%;
          object-fit: contain;
          margin: 0 auto 8px auto;
          display: block;
        }
        .header .logo-placeholder {
          font-size: 10px;
          color: #666;
          margin-bottom: 4px;
        }
        .header .empresa-nome {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header .slogan {
          font-size: 10px;
          color: #444;
        }
        .header .endereco, .header .cnpj {
          font-size: 10px;
          color: #444;
        }
        
        .pedido-info {
          text-align: center;
          margin: 10px 0;
          padding: 6px 0;
          border-bottom: 1px dashed #000;
        }
        .pedido-codigo {
          font-size: 32px;
          font-weight: bold;
          display: block;
        }
        .pedido-data {
          font-size: 11px;
          text-align: right;
          display: block;
        }
        
        .section-title {
          text-align: center;
          font-weight: bold;
          font-size: 11px;
          margin: 8px 0 6px 0;
        }
        
        .itens-header {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: bold;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          margin-bottom: 4px;
        }
        
        .item-row {
          margin-bottom: 4px;
        }
        .item-linha {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .item-obs {
          font-size: 10px;
          padding-left: 10px;
          color: #444;
        }
        .item-sub {
          font-size: 9px;
          padding-left: 10px;
          color: #555;
        }
        
        .subtotal-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 2px 0;
        }
        
        .total-section {
          text-align: center;
          margin: 10px 0;
          padding: 10px 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
        }
        .pagar-entrega {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .total-grande {
          font-size: 20px;
          font-weight: bold;
          margin: 4px 0;
        }
        .pagamento-info {
          font-size: 11px;
        }
        
        .entrega-section {
          margin: 10px 0;
          padding: 8px 0;
        }
        .info-label {
          font-weight: bold;
          font-size: 11px;
        }
        .info-valor {
          font-size: 11px;
        }
        .info-row {
          margin: 2px 0;
        }
        
        .footer {
          text-align: center;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 2px solid #000;
        }
        .footer-msg {
          font-size: 10px;
          font-weight: bold;
        }
        
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
        }
      </style>
    </head>
    <body>
  `;

  // ========== CABEÇALHO ==========
  html += `<div class="header">`;
  if (config.mostrar_logo && empresa.logo_url) {
    html += `<img src="${empresa.logo_url}" class="logo-img" alt="Logo" onerror="this.style.display='none'" />`;
  } else if (config.mostrar_logo) {
    html += `<div class="logo-placeholder">[LOGO]</div>`;
  }
  html += `<div class="empresa-nome">${empresa.nome || 'Nome da Empresa'}</div>`;
  if (empresa.slogan) {
    html += `<div class="slogan">${empresa.slogan}</div>`;
  }
  if (empresa.endereco) {
    html += `<div class="endereco">${empresa.endereco}</div>`;
  }
  if (empresa.cnpj) {
    html += `<div class="cnpj">CNPJ: ${empresa.cnpj}</div>`;
  }
  html += `</div>`;

  // ========== NÚMERO DO PEDIDO E DATA ==========
  html += `<div class="pedido-info">`;
  html += `<div class="pedido-codigo">#${String(pedido.codigo).padStart(5, '0')}</div>`;
  html += `<div class="pedido-data">${dataStr}, ${horaStr}</div>`;
  html += `</div>`;

  // ========== ITENS DO PEDIDO ==========
  html += `<div class="section-title">-- ITENS DO PEDIDO --</div>`;
  html += `<div class="itens-header">`;
  html += `<span>QTD  PREÇO  ITEM</span>`;
  html += `<span>TOTAL</span>`;
  html += `</div>`;
  
  let subtotalItens = 0;
  (pedido.items || []).forEach(item => {
    const qtd = item.quantidade || 1;
    const precoUnit = item.preco_unitario || item.preco || 0;
    const itemTotal = qtd * precoUnit;
    subtotalItens += itemTotal;
    
    html += `<div class="item-row">`;
    html += `<div class="item-linha">`;
    html += `<span>${qtd} x ${precoUnit.toFixed(2)} ${item.nome || item.product_name || 'Item'}</span>`;
    html += `<span>R$${itemTotal.toFixed(2)}</span>`;
    html += `</div>`;
    
    if (item.observacao) {
      html += `<div class="item-obs">- ${item.observacao}</div>`;
    }
    if (item.subitems && item.subitems.length > 0) {
      item.subitems.forEach(sub => {
        const subTexto = sub.nome || sub.name;
        const subPreco = sub.preco > 0 ? ` (+R$${sub.preco.toFixed(2)})` : '';
        html += `<div class="item-sub">+ ${subTexto}${subPreco}</div>`;
      });
    }
    html += `</div>`;
  });

  // ========== SUBTOTAIS ==========
  html += `<div class="separator"></div>`;
  
  if (pedido.valor_entrega > 0) {
    html += `<div class="subtotal-row">`;
    html += `<span>Taxa de Entrega:</span>`;
    html += `<span>R$ ${pedido.valor_entrega.toFixed(2)}</span>`;
    html += `</div>`;
  }
  
  if (pedido.desconto > 0) {
    html += `<div class="subtotal-row">`;
    html += `<span>Desconto:</span>`;
    html += `<span>-R$ ${pedido.desconto.toFixed(2)}</span>`;
    html += `</div>`;
  }
  
  html += `<div class="subtotal-row bold">`;
  html += `<span>TOTAL:</span>`;
  html += `<span>R$ ${(pedido.total || 0).toFixed(2)}</span>`;
  html += `</div>`;

  // ========== SEÇÃO DE PAGAMENTO ==========
  html += `<div class="total-section">`;
  html += `<div class="pagar-entrega">-- PAGAR NA ENTREGA --</div>`;
  html += `<div class="total-grande">TOTAL ....... R$${(pedido.total || 0).toFixed(2).replace('.', ',')}</div>`;
  if (pedido.forma_pagamento) {
    html += `<div class="pagamento-info">PAGAMENTO: ${pedido.forma_pagamento}</div>`;
  }
  if (pedido.troco_precisa && pedido.troco_valor) {
    html += `<div class="pagamento-info">TROCO PARA: R$ ${pedido.troco_valor.toFixed(2)}</div>`;
  }
  html += `</div>`;

  // ========== INFORMAÇÕES DE ENTREGA ==========
  if (pedido.tipo_entrega === 'delivery') {
    html += `<div class="section-title">-- INFORMAÇÕES DE ENTREGA --</div>`;
    html += `<div class="entrega-section">`;
    
    if (pedido.cliente_nome) {
      html += `<div class="info-row"><span class="info-label">CLIENTE:</span> <span class="info-valor">${pedido.cliente_nome}</span></div>`;
    }
    if (pedido.cliente_telefone) {
      html += `<div class="info-row"><span class="info-label">TEL:</span> <span class="info-valor">${pedido.cliente_telefone}</span></div>`;
    }
    if (pedido.endereco_rua) {
      html += `<div class="info-row"><span class="info-label">END:</span> <span class="info-valor">${pedido.endereco_rua}${pedido.endereco_numero ? ', ' + pedido.endereco_numero : ''}</span></div>`;
    }
    if (pedido.endereco_bairro) {
      html += `<div class="info-row"><span class="info-label">BAIRRO:</span> <span class="info-valor">${pedido.endereco_bairro}</span></div>`;
    }
    if (pedido.endereco_complemento) {
      html += `<div class="info-row"><span class="info-label">REF:</span> <span class="info-valor">${pedido.endereco_complemento}</span></div>`;
    }
    
    html += `</div>`;
  } else if (pedido.tipo_entrega === 'retirada' || pedido.tipo_entrega === 'pickup') {
    html += `<div class="section-title">-- RETIRADA NO LOCAL --</div>`;
    if (pedido.cliente_nome) {
      html += `<div class="info-row center"><span class="info-label">CLIENTE:</span> ${pedido.cliente_nome}</div>`;
    }
    if (pedido.cliente_telefone) {
      html += `<div class="info-row center"><span class="info-label">TEL:</span> ${pedido.cliente_telefone}</div>`;
    }
  }

  // ========== OBSERVAÇÕES ==========
  if (pedido.observacao) {
    html += `<div class="separator"></div>`;
    html += `<div class="info-row"><span class="info-label">OBS:</span> ${pedido.observacao}</div>`;
  }

  // ========== RODAPÉ ==========
  html += `<div class="footer">`;
  html += `<div class="separator-double"></div>`;
  html += `<div class="footer-msg">${config.mensagem_rodape || 'NÃO É DOCUMENTO FISCAL'}</div>`;
  html += `</div>`;

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

// ==================== IMPRESSÃO VIA USB (ESC/POS) ====================
export async function printViaUSB(pedido, impressora, config, empresa) {
  if (!('usb' in navigator)) {
    throw new Error('Web USB não suportado');
  }

  try {
    // Buscar dispositivos autorizados
    const devices = await navigator.usb.getDevices();
    const device = devices.find(d => 
      d.vendorId === impressora.vendorId && d.productId === impressora.productId
    );

    if (!device) {
      throw new Error('Impressora não encontrada. Reconecte o dispositivo.');
    }

    // Abrir conexão
    await device.open();
    
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    
    // Encontrar interface
    const iface = device.configuration.interfaces.find(i => 
      i.alternate.interfaceClass === 7
    ) || device.configuration.interfaces[0];
    
    await device.claimInterface(iface.interfaceNumber);

    // Encontrar endpoint de saída
    const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out');
    
    if (!endpoint) {
      throw new Error('Endpoint de saída não encontrado');
    }

    // Gerar comandos ESC/POS
    const commands = generateESCPOSCommands(pedido, impressora, config, empresa);
    
    // Enviar para impressora
    await device.transferOut(endpoint.endpointNumber, commands);

    // Fechar conexão
    await device.releaseInterface(iface.interfaceNumber);
    await device.close();

    return true;
  } catch (error) {
    console.error('Erro USB:', error);
    throw error;
  }
}

// Gerar comandos ESC/POS para o cupom
function generateESCPOSCommands(pedido, impressora, config, empresa) {
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;
  
  const encoder = new TextEncoder();
  let commands = [];
  
  // Inicializar impressora
  commands.push(ESC, 0x40);
  
  // Configurar página de código para acentos (CP850 ou CP858)
  commands.push(ESC, 0x74, 0x02);
  
  const addText = (text) => {
    commands.push(...encoder.encode(text));
  };
  
  const addLine = (text) => {
    addText(text + '\n');
  };
  
  const center = () => { commands.push(ESC, 0x61, 0x01); };
  const left = () => { commands.push(ESC, 0x61, 0x00); };
  const bold = (on) => { commands.push(ESC, 0x45, on ? 0x01 : 0x00); };
  const doubleSize = (on) => { commands.push(ESC, 0x21, on ? 0x30 : 0x00); };
  
  const divider = () => {
    addLine('-'.repeat(impressora.max_columns || 48));
  };
  
  const dataHora = new Date(pedido.created_at || new Date());
  
  // Cabeçalho
  if (config.mostrar_logo) {
    center();
    doubleSize(true);
    addLine(empresa.nome || 'EMPRESA');
    doubleSize(false);
  }
  
  if (config.mostrar_endereco_empresa && empresa.endereco) {
    center();
    addLine(empresa.endereco);
  }
  
  if (config.mostrar_telefone_empresa && empresa.telefone) {
    center();
    addLine(empresa.telefone);
  }
  
  divider();
  
  // Código e Data
  left();
  const codigo = config.mostrar_codigo_pedido ? `#${pedido.codigo}` : '';
  const data = config.mostrar_data_hora 
    ? `${dataHora.toLocaleDateString('pt-BR')} ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';
  addLine(`${codigo}${' '.repeat(Math.max(1, (impressora.max_columns || 48) - codigo.length - data.length))}${data}`);
  
  divider();
  
  // Cliente
  if (config.mostrar_cliente_nome && pedido.cliente_nome) {
    bold(true);
    addLine(pedido.cliente_nome);
    bold(false);
  }
  
  if (config.mostrar_cliente_telefone && pedido.cliente_telefone) {
    addLine(pedido.cliente_telefone);
  }
  
  // Endereço
  if (config.mostrar_endereco_entrega && pedido.tipo_entrega === 'delivery') {
    divider();
    bold(true);
    addLine('ENTREGA:');
    bold(false);
    addLine(`${pedido.endereco_rua || ''}, ${pedido.endereco_numero || ''}`);
    if (pedido.endereco_complemento) addLine(pedido.endereco_complemento);
    addLine(pedido.endereco_bairro || '');
  } else if (pedido.tipo_entrega === 'retirada' || pedido.tipo_entrega === 'pickup') {
    divider();
    center();
    bold(true);
    addLine('*** RETIRADA NO LOCAL ***');
    bold(false);
    left();
  }
  
  divider();
  
  // Itens
  center();
  bold(true);
  addLine('ITENS DO PEDIDO');
  bold(false);
  divider();
  left();
  
  (pedido.items || []).forEach(item => {
    const qtd = item.quantidade || 1;
    const nome = item.nome || item.product_name || 'Item';
    const preco = ((item.preco_unitario || item.preco || 0) * qtd).toFixed(2);
    
    const itemText = `${qtd}x ${nome}`;
    const precoText = `R$ ${preco}`;
    const spaces = Math.max(1, (impressora.max_columns || 48) - itemText.length - precoText.length);
    
    addLine(`${itemText}${' '.repeat(spaces)}${precoText}`);
    
    if (item.observacao) {
      addLine(`  -> ${item.observacao}`);
    }
    
    if (item.subitems && item.subitems.length > 0) {
      item.subitems.forEach(sub => {
        const subPreco = sub.preco > 0 ? ` (+R$ ${sub.preco.toFixed(2)})` : '';
        addLine(`  * ${sub.nome || sub.name}${subPreco}`);
      });
    }
  });
  
  divider();
  
  // Totais
  if (pedido.valor_entrega > 0) {
    const taxaText = 'Taxa de Entrega:';
    const taxaValor = `R$ ${pedido.valor_entrega.toFixed(2)}`;
    addLine(`${taxaText}${' '.repeat((impressora.max_columns || 48) - taxaText.length - taxaValor.length)}${taxaValor}`);
  }
  
  bold(true);
  doubleSize(true);
  const totalText = 'TOTAL:';
  const totalValor = `R$ ${(pedido.total || 0).toFixed(2)}`;
  addLine(`${totalText}${' '.repeat(Math.max(1, 24 - totalText.length - totalValor.length))}${totalValor}`);
  doubleSize(false);
  bold(false);
  
  // Pagamento
  if (config.mostrar_forma_pagamento && pedido.forma_pagamento) {
    divider();
    bold(true);
    addText('PAGAMENTO: ');
    bold(false);
    addLine(pedido.forma_pagamento);
    
    if (pedido.troco_precisa && pedido.troco_valor) {
      addLine(`Troco para: R$ ${pedido.troco_valor.toFixed(2)}`);
    }
  }
  
  // Observações
  if (config.mostrar_observacoes && pedido.observacao) {
    divider();
    bold(true);
    addLine('OBS:');
    bold(false);
    addLine(pedido.observacao);
  }
  
  // Rodapé
  if (config.mensagem_rodape) {
    divider();
    center();
    addLine(config.mensagem_rodape);
    left();
  }
  
  // Espaço e corte
  addLine('\n\n\n');
  commands.push(GS, 0x56, 0x00); // Cortar papel
  
  return new Uint8Array(commands);
}

// ==================== IMPRESSÃO VIA PRINT CONNECTOR (RECOMENDADO) ====================

/**
 * Envia pedido para impressão via Print Connector local
 * Esta é a função principal que deve ser usada para impressão automática
 * 
 * @param {Object} pedido - Objeto do pedido
 * @param {Object} options - Opções de impressão
 * @param {string} options.template - Template: 'cozinha' ou 'caixa'
 * @param {number} options.copies - Número de cópias
 * @param {boolean} options.cut - Se deve cortar o papel
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export async function printViaPrintConnector(pedido, options = {}) {
  const { template = 'caixa', copies = 1, cut = true } = options;
  
  try {
    // Verificar se Print Connector está online
    const healthResponse = await fetch(`${PRINT_CONNECTOR_URL}/health`, {
      method: 'GET',
      mode: 'cors',
    }).catch(() => null);
    
    if (!healthResponse || !healthResponse.ok) {
      return { 
        success: false, 
        error: 'Print Connector offline. Instale e execute o aplicativo.',
        offline: true
      };
    }
    
    const health = await healthResponse.json();
    
    if (!health.printer_connected) {
      return { 
        success: false, 
        error: 'Nenhuma impressora configurada no Print Connector.',
        no_printer: true
      };
    }
    
    // Enviar para impressão
    const response = await fetch(`${PRINT_CONNECTOR_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedido,
        template,
        copies,
        cut
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { 
        success: true, 
        jobId: data.jobId,
        message: data.message
      };
    } else {
      return { 
        success: false, 
        error: data.error || 'Erro ao enviar para impressão'
      };
    }
    
  } catch (error) {
    console.error('Erro ao imprimir via Print Connector:', error);
    return { 
      success: false, 
      error: error.message || 'Erro de conexão com Print Connector',
      offline: true
    };
  }
}

/**
 * Verifica se o Print Connector está disponível
 * @returns {Promise<{online: boolean, printer_connected: boolean, printer_name: string|null}>}
 */
export async function checkPrintConnectorStatus() {
  try {
    const response = await fetch(`${PRINT_CONNECTOR_URL}/health`, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        printer_connected: data.printer_connected,
        printer_name: data.printer_name,
        version: data.version,
        queue_size: data.queue_size
      };
    }
  } catch (error) {
    // Silencioso - connector offline
  }
  
  return {
    online: false,
    printer_connected: false,
    printer_name: null
  };
}

/**
 * Imprime página de teste no Print Connector
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function printTestPage() {
  try {
    const response = await fetch(`${PRINT_CONNECTOR_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}
