import { useState, useEffect, useRef } from "react";
import { 
  Settings, Palette, Trash2, Building2, Printer, AlertTriangle, 
  Upload, X, Save, Loader2, CheckCircle, Image as ImageIcon,
  Instagram, Facebook, Mail, Phone, MapPin, Calendar, Hash,
  Package, ShoppingCart, Users, DollarSign, Map, RefreshCw
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
function ImpressaoTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-4">
          <Printer className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2">Em Breve</h2>
        <p className="text-muted-foreground mb-6">
          Personalize seus cupons fiscais e recibos!
        </p>
        
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-left">
          <h3 className="font-semibold mb-3">O que você poderá fazer:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Personalizar layout do cupom fiscal
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Adicionar logo nos cupons
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Configurar informações que aparecem
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Preview em tempo real
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              Suporte a impressoras térmicas
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
