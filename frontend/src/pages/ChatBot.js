import { useState, useEffect, useCallback, useRef } from "react";
import { 
  MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, LogOut, 
  GitBranch, Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, 
  Loader2, Bot, MessageCircle, HelpCircle, Zap, Play, Square,
  Move, Link2, Settings, Eye, EyeOff, ChevronDown, ChevronRight,
  Send, User, Clock, MapPin, ShoppingBag, Smartphone, RotateCcw,
  BarChart3, TrendingUp, Hash, Calendar, Users, MessageCircleMore, Phone, Bell, Package, Truck
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useToast } from "../hooks/use-toast";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

// Tipos de nós disponíveis
const NODE_TYPES = {
  start: { label: "Início", icon: Play, color: "bg-green-500", description: "Ponto de entrada do fluxo" },
  message: { label: "Mensagem", icon: MessageCircle, color: "bg-blue-500", description: "Envia uma mensagem" },
  question: { label: "Pergunta", icon: HelpCircle, color: "bg-purple-500", description: "Aguarda resposta do cliente" },
  condition: { label: "Condição", icon: GitBranch, color: "bg-yellow-500", description: "Decisão baseada em dados" },
  action: { label: "Ação", icon: Zap, color: "bg-orange-500", description: "Executa uma ação no sistema" },
  ai: { label: "IA", icon: Bot, color: "bg-pink-500", description: "Resposta inteligente da IA" },
  end: { label: "Fim", icon: Square, color: "bg-red-500", description: "Encerra o fluxo" }
};

// Variáveis disponíveis para templates
const TEMPLATE_VARIABLES = [
  { key: "{cliente_nome}", label: "Nome do Cliente", icon: User },
  { key: "{pedido_numero}", label: "Número do Pedido", icon: ShoppingBag },
  { key: "{pedido_status}", label: "Status do Pedido", icon: Clock },
  { key: "{pedido_itens}", label: "Itens do Pedido", icon: ShoppingBag },
  { key: "{pedido_total}", label: "Total do Pedido", icon: ShoppingBag },
  { key: "{entregador_nome}", label: "Nome do Entregador", icon: User },
  { key: "{endereco}", label: "Endereço do Cliente", icon: MapPin },
  { key: "{horario_funcionamento}", label: "Horário de Funcionamento", icon: Clock },
];

export default function ChatBot() {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const { toast } = useToast();

  // Carregar status e QR Code automaticamente ao iniciar e manter ativo
  useEffect(() => {
    let isMounted = true;
    
    const fetchWhatsAppData = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Buscar status
        const statusRes = await fetch(`${API_URL}/api/whatsapp/status`, { headers });
        const statusData = await statusRes.json();
        
        if (!isMounted) return;
        setWhatsappStatus(statusData);

        // Se não conectado, SEMPRE buscar QR Code
        if (!statusData.connected) {
          const qrRes = await fetch(`${API_URL}/api/whatsapp/qr`, { headers });
          const qrData = await qrRes.json();
          
          if (!isMounted) return;
          if (qrData.success && qrData.qr) {
            setQrCode(qrData.qr);
          }
        } else {
          setQrCode(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do WhatsApp:", error);
        if (isMounted) {
          setWhatsappStatus({ status: "error", connected: false, error: "Erro de conexão" });
        }
      }
    };

    // Executar imediatamente
    fetchWhatsAppData();
    
    // Polling a cada 5 segundos para manter sempre atualizado
    const interval = setInterval(fetchWhatsAppData, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500 text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ChatBot Inteligente</h1>
            <p className="text-sm text-muted-foreground">Atendimento automatizado com IA</p>
          </div>
        </div>
        {/* Indicador de Status do WhatsApp */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
          <div className={`w-2 h-2 rounded-full ${
            whatsappStatus?.connected ? "bg-green-500" : 
            whatsappStatus?.status === "waiting_qr" ? "bg-yellow-500 animate-pulse" : 
            whatsappStatus?.status === "service_offline" ? "bg-orange-500" :
            "bg-red-500"
          }`} />
          <span className="text-xs font-medium">
            {whatsappStatus?.connected ? "WhatsApp Conectado" : 
             whatsappStatus?.status === "waiting_qr" ? "Aguardando QR" : 
             whatsappStatus?.status === "service_offline" ? "Serviço Offline" :
             "Desconectado"}
          </span>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="border-b bg-card px-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "whatsapp"
                ? "border-green-500 text-green-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              WhatsApp
            </div>
          </button>
          <button
            onClick={() => setActiveTab("respostas")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "respostas"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações BOT
            </div>
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "messages"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Conversas
            </div>
          </button>
          <button
            onClick={() => setActiveTab("palavras")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "palavras"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Palavras
            </div>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto">
        {activeTab === "whatsapp" ? (
          <WhatsAppTab toast={toast} initialStatus={whatsappStatus} initialQr={qrCode} setGlobalStatus={setWhatsappStatus} setGlobalQr={setQrCode} />
        ) : activeTab === "respostas" ? (
          <RespostasAutomaticasTab toast={toast} />
        ) : activeTab === "palavras" ? (
          <PalavrasTab toast={toast} />
        ) : (
          <MessagesTab toast={toast} />
        )}
      </div>
    </div>
  );
}

// ==================== ABA WHATSAPP ====================
function WhatsAppTab({ toast, initialStatus, initialQr, setGlobalStatus, setGlobalQr }) {
  const [status, setStatus] = useState(initialStatus);
  const [qrCode, setQrCode] = useState(initialQr);
  const [loading, setLoading] = useState(!initialStatus);
  const [disconnecting, setDisconnecting] = useState(false);

  // Sincronizar com props globais sempre que mudarem
  useEffect(() => {
    setStatus(initialStatus);
    setQrCode(initialQr);
    if (initialStatus) setLoading(false);
  }, [initialStatus, initialQr]);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await fetch(`${API_URL}/api/whatsapp/status`, { headers });
      const data = await res.json();
      setStatus(data);
      setGlobalStatus?.(data);
      
      // Se não conectado, buscar QR
      if (!data.connected) {
        const qrRes = await fetch(`${API_URL}/api/whatsapp/qr`, { headers });
        const qrData = await qrRes.json();
        if (qrData.success && qrData.qr) {
          setQrCode(qrData.qr);
          setGlobalQr?.(qrData.qr);
        }
      } else {
        setQrCode(null);
        setGlobalQr?.(null);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      const errorStatus = { status: "error", connected: false, error: "Erro ao conectar ao serviço" };
      setStatus(errorStatus);
      setGlobalStatus?.(errorStatus);
    } finally {
      setLoading(false);
    }
  }, [setGlobalStatus, setGlobalQr]);

  // Polling próprio da aba para manter sincronizado
  useEffect(() => {
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/whatsapp/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Desconectado", description: "WhatsApp desconectado com sucesso" });
        fetchStatus();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao desconectar", variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleAutoReply = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/whatsapp/toggle-auto-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({ 
          title: data.autoReplyEnabled ? "IA Ativada" : "IA Desativada", 
          description: data.autoReplyEnabled ? "Respostas automáticas ativadas" : "Respostas automáticas desativadas"
        });
        fetchStatus();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao alternar IA", variant: "destructive" });
    }
  };

  const getStatusInfo = () => {
    if (!status) return { text: "Carregando...", color: "gray", icon: Loader2 };
    
    switch (status.status) {
      case "connected":
        return { text: "Conectado", color: "green", icon: Wifi };
      case "waiting_qr":
        return { text: "Aguardando QR Code", color: "yellow", icon: QrCode };
      case "reconnecting":
        return { text: "Reconectando...", color: "yellow", icon: RefreshCw };
      case "service_offline":
        return { text: "Serviço Offline", color: "orange", icon: WifiOff };
      case "disconnected":
        return { text: "Desconectado", color: "gray", icon: WifiOff };
      default:
        return { text: "Erro", color: "red", icon: AlertCircle };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Card de Status */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              statusInfo.color === "green" ? "bg-green-100 dark:bg-green-900/30" :
              statusInfo.color === "yellow" ? "bg-yellow-100 dark:bg-yellow-900/30" :
              statusInfo.color === "red" ? "bg-red-100 dark:bg-red-900/30" :
              "bg-gray-100 dark:bg-gray-900/30"
            }`}>
              <StatusIcon className={`w-6 h-6 ${
                statusInfo.color === "green" ? "text-green-600" :
                statusInfo.color === "yellow" ? "text-yellow-600" :
                statusInfo.color === "red" ? "text-red-600" :
                "text-gray-600"
              } ${statusInfo.icon === Loader2 || statusInfo.icon === RefreshCw ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Status da Conexão</h2>
              <p className={`text-sm font-medium ${
                statusInfo.color === "green" ? "text-green-600" :
                statusInfo.color === "yellow" ? "text-yellow-600" :
                statusInfo.color === "red" ? "text-red-600" :
                "text-gray-600"
              }`}>
                {statusInfo.text}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            {status?.connected && (
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                Desconectar
              </Button>
            )}
          </div>
        </div>

        {/* Toggle IA */}
        {status?.connected && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-pink-500" />
              <div>
                <p className="font-medium">Resposta Automática (IA)</p>
                <p className="text-sm text-muted-foreground">
                  {status?.autoReplyEnabled ? "A IA está respondendo automaticamente" : "Respostas automáticas desativadas"}
                </p>
              </div>
            </div>
            <Switch 
              checked={status?.autoReplyEnabled || false}
              onCheckedChange={handleToggleAutoReply}
            />
          </div>
        )}

        {/* QR Code */}
        {qrCode && !status?.connected && (
          <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-xl border">
            <h3 className="text-lg font-medium mb-4">Escaneie o QR Code</h3>
            <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 rounded-lg border" />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              WhatsApp → Menu → Dispositivos conectados → Conectar
            </p>
          </div>
        )}

        {/* Conectado - Card com informações */}
        {status?.connected && (
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">WhatsApp Conectado!</h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  O ChatBot está pronto para atender seus clientes.
                </p>
              </div>
            </div>
            
            {/* Card do Número Conectado */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Número Conectado</p>
                  <p className="font-semibold text-lg">
                    {status?.phone ? (
                      // Formatar número para exibição
                      status.phone.replace('@s.whatsapp.net', '').replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')
                    ) : (
                      <span className="text-muted-foreground">Número não identificado</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Estatísticas de Atendimento */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{status?.stats?.clientsServed || 0}</p>
                <p className="text-xs text-muted-foreground">Clientes Atendidos</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">{status?.stats?.messagesReceived || 0}</p>
                <p className="text-xs text-muted-foreground">Msgs Recebidas</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{status?.stats?.messagesSent || 0}</p>
                <p className="text-xs text-muted-foreground">Msgs Enviadas</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info da IA */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-xl border p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">ChatBot com IA Integrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Seu atendente virtual usa inteligência artificial para conversar naturalmente com os clientes.
              Ele conhece seu cardápio, horários, e pode consultar pedidos em tempo real.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">✨ Conversas naturais</span>
              <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">📋 Consulta pedidos</span>
              <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">🕐 Horários</span>
              <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">📍 Endereço</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ABA SIMULADOR ====================
function SimulatorTab({ toast }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      type: "bot",
      text: "👋 Olá! Eu sou o assistente virtual. Como posso ajudar você hoje?\n\nVocê pode me perguntar sobre:\n• 📋 Cardápio e produtos\n• 🕐 Horários de funcionamento\n• 📍 Endereço e localização\n• 🛵 Status de pedidos\n• ❓ Outras dúvidas",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Enviar mensagem para a IA
  const sendMessage = async () => {
    const text = inputMessage.trim();
    if (!text || loading) return;

    // Adicionar mensagem do usuário
    const userMessage = {
      id: `user_${Date.now()}`,
      type: "user",
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chatbot/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: text,
          phone: "simulador",
          push_name: "Simulador de Teste",
          session_id: sessionId
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.response) {
        const botMessage = {
          id: `bot_${Date.now()}`,
          type: "bot",
          text: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || "Erro ao processar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: "bot",
        text: "❌ Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Erro",
        description: "Não foi possível processar a mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Enviar com Enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Limpar conversa
  const clearConversation = () => {
    setMessages([{
      id: "welcome",
      type: "bot",
      text: "👋 Olá! Eu sou o assistente virtual. Como posso ajudar você hoje?\n\nVocê pode me perguntar sobre:\n• 📋 Cardápio e produtos\n• 🕐 Horários de funcionamento\n• 📍 Endereço e localização\n• 🛵 Status de pedidos\n• ❓ Outras dúvidas",
      timestamp: new Date()
    }]);
    toast({
      title: "Conversa limpa",
      description: "O histórico foi apagado"
    });
  };

  // Sugestões rápidas
  const quickSuggestions = [
    "Qual o horário de funcionamento?",
    "Vocês fazem entrega?",
    "Quais são as formas de pagamento?",
    "Qual o endereço do restaurante?",
    "Quero ver o cardápio",
    "Quero fazer um pedido"
  ];

  const handleQuickSuggestion = (suggestion) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex">
      {/* Área principal do chat - simulando tela de celular */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto">
        {/* Header do Simulador */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold">Atendente Virtual</h2>
              <p className="text-xs text-green-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                Online - Teste do ChatBot
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20"
            onClick={clearConversation}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>

        {/* Área de Mensagens - Estilo WhatsApp */}
        <div 
          className="flex-1 overflow-auto p-4 space-y-3"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.4'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: "#e5ddd5"
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 shadow-sm ${
                  msg.type === "user"
                    ? "bg-green-100 dark:bg-green-900 rounded-tr-none"
                    : msg.isError
                    ? "bg-red-50 dark:bg-red-950 border border-red-200 rounded-tl-none"
                    : "bg-white dark:bg-gray-800 rounded-tl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 text-right ${
                  msg.type === "user" ? "text-green-600" : "text-gray-400"
                }`}>
                  {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* Indicador de digitando */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-lg rounded-tl-none p-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Sugestões Rápidas */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Sugestões rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input de Mensagem */}
        <div className="p-3 bg-gray-100 dark:bg-gray-900 border-t">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-white dark:bg-gray-800 border-0 focus-visible:ring-1"
              disabled={loading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Painel lateral de informações */}
      <div className="w-80 border-l bg-card p-4 hidden lg:block">
        <div className="space-y-6">
          {/* Info do Simulador */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500 text-white">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-semibold">Simulador de Conversas</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Teste o ChatBot com IA sem precisar conectar o WhatsApp. 
              As respostas são processadas pelo mesmo sistema que atende os clientes reais.
            </p>
          </div>

          {/* O que testar */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              O que você pode testar:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Respostas sobre cardápio e produtos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Horários de funcionamento
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Endereço e localização
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Consulta de pedidos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Dúvidas gerais
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Fluxo de conversa natural
              </li>
            </ul>
          </div>

          {/* Dicas */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <HelpCircle className="w-4 h-4" />
              Dicas
            </h4>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <li>• Faça perguntas como um cliente faria</li>
              <li>• Teste variações da mesma pergunta</li>
              <li>• Verifique se as informações estão corretas</li>
              <li>• Use para treinar a equipe</li>
            </ul>
          </div>

          {/* Estatísticas da sessão */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <h4 className="font-medium mb-2 text-sm">Sessão atual</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-2xl font-bold text-green-600">{messages.filter(m => m.type === "user").length}</p>
                <p className="text-xs text-muted-foreground">Mensagens enviadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{messages.filter(m => m.type === "bot").length}</p>
                <p className="text-xs text-muted-foreground">Respostas da IA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ABA EDITOR DE FLUXO ====================
function FlowEditorTab({ toast }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [connecting, setConnecting] = useState(null);

  const fetchFlow = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chatbot/flow`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      }
    } catch (error) {
      console.error("Erro ao carregar fluxo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  const handleSaveFlow = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chatbot/flow/save-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nodes, edges })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Salvo!", description: "Fluxo salvo com sucesso" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar fluxo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addNode = (type) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type,
      title: NODE_TYPES[type].label,
      content: "",
      position_x: 200 + Math.random() * 200,
      position_y: 100 + Math.random() * 200,
      config: "{}",
      is_active: true
    };
    setNodes([...nodes, newNode]);
    setShowAddModal(false);
    setSelectedNode(newNode);
  };

  const updateNode = (nodeId, updates) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    if (selectedNode?.id === nodeId) {
      setSelectedNode({ ...selectedNode, ...updates });
    }
  };

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source_id !== nodeId && e.target_id !== nodeId));
    setSelectedNode(null);
    setDeleteConfirm(null);
  };

  const addEdge = (sourceId, targetId) => {
    // Verificar se já existe
    if (edges.some(e => e.source_id === sourceId && e.target_id === targetId)) return;
    
    const newEdge = {
      id: `edge_${Date.now()}`,
      source_id: sourceId,
      target_id: targetId,
      condition: "",
      label: ""
    };
    setEdges([...edges, newEdge]);
  };

  const deleteEdge = (edgeId) => {
    setEdges(edges.filter(e => e.id !== edgeId));
  };

  // Handlers de drag
  const handleMouseDown = (e, node) => {
    if (e.button === 0) {
      setDragging({ nodeId: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.position_x, nodeY: node.position_y });
    }
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      updateNode(dragging.nodeId, {
        position_x: dragging.nodeX + dx,
        position_y: dragging.nodeY + dy
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setConnecting(null);
  };

  // Inicializar com fluxo padrão se vazio
  const initializeDefaultFlow = () => {
    const defaultNodes = [
      { id: "start_1", type: "start", title: "Início", content: "", position_x: 100, position_y: 200, config: "{}", is_active: true },
      { id: "ai_1", type: "ai", title: "Saudação IA", content: "Cumprimente o cliente de forma calorosa e pergunte como pode ajudar.", position_x: 300, position_y: 200, config: "{}", is_active: true },
      { id: "ai_2", type: "ai", title: "Atendimento Geral", content: "Responda às dúvidas do cliente sobre cardápio, horários, pedidos, etc.", position_x: 550, position_y: 200, config: "{}", is_active: true },
    ];
    
    const defaultEdges = [
      { id: "edge_1", source_id: "start_1", target_id: "ai_1", condition: "", label: "" },
      { id: "edge_2", source_id: "ai_1", target_id: "ai_2", condition: "", label: "" },
    ];
    
    setNodes(defaultNodes);
    setEdges(defaultEdges);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Canvas do Fluxograma */}
      <div 
        ref={canvasRef}
        className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UwZTBlMCIgb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Nó
          </Button>
          <Button variant="outline" onClick={handleSaveFlow} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
          {nodes.length === 0 && (
            <Button variant="secondary" onClick={initializeDefaultFlow}>
              <Zap className="w-4 h-4 mr-2" />
              Criar Fluxo Padrão
            </Button>
          )}
        </div>

        {/* SVG para as conexões */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '600px', minWidth: '800px' }}>
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source_id);
            const targetNode = nodes.find(n => n.id === edge.target_id);
            if (!sourceNode || !targetNode) return null;
            
            const x1 = sourceNode.position_x + 100;
            const y1 = sourceNode.position_y + 40;
            const x2 = targetNode.position_x;
            const y2 = targetNode.position_y + 40;
            
            // Curva bezier
            const midX = (x1 + x2) / 2;
            
            return (
              <g key={edge.id}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {/* Botão de deletar na linha */}
                <circle
                  cx={midX}
                  cy={(y1 + y2) / 2}
                  r="10"
                  fill="#ef4444"
                  className="cursor-pointer opacity-0 hover:opacity-100 pointer-events-auto transition-opacity"
                  onClick={() => deleteEdge(edge.id)}
                />
                <text
                  x={midX}
                  y={(y1 + y2) / 2 + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  className="pointer-events-none opacity-0 hover:opacity-100"
                >
                  ×
                </text>
              </g>
            );
          })}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {/* Nós */}
        {nodes.map(node => {
          const nodeType = NODE_TYPES[node.type] || NODE_TYPES.message;
          const NodeIcon = nodeType.icon;
          const isSelected = selectedNode?.id === node.id;
          
          return (
            <div
              key={node.id}
              className={`absolute w-48 bg-card border-2 rounded-lg shadow-lg cursor-move select-none transition-shadow ${
                isSelected ? "border-blue-500 shadow-blue-200" : "border-border hover:border-gray-400"
              }`}
              style={{ left: node.position_x, top: node.position_y }}
              onMouseDown={(e) => handleMouseDown(e, node)}
              onClick={() => setSelectedNode(node)}
            >
              {/* Header */}
              <div className={`flex items-center gap-2 p-2 rounded-t-md ${nodeType.color} text-white`}>
                <NodeIcon className="w-4 h-4" />
                <span className="text-sm font-medium truncate">{node.title}</span>
              </div>
              
              {/* Content Preview */}
              <div className="p-2">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {node.content || nodeType.description}
                </p>
              </div>
              
              {/* Connection Points */}
              <div
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-crosshair"
                title="Arraste para conectar"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setConnecting(node.id);
                }}
              />
              <div
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                onMouseUp={(e) => {
                  e.stopPropagation();
                  if (connecting && connecting !== node.id) {
                    addEdge(connecting, node.id);
                  }
                }}
              />
            </div>
          );
        })}

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum fluxo criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece criando um fluxo de atendimento ou use o fluxo padrão
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Painel Lateral - Propriedades do Nó */}
      {selectedNode && (
        <div className="w-80 border-l bg-card p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Propriedades</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={selectedNode.type}
                onValueChange={(value) => updateNode(selectedNode.id, { type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NODE_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Título</Label>
              <Input
                value={selectedNode.title}
                onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Conteúdo / Instrução</Label>
              <Textarea
                value={selectedNode.content}
                onChange={(e) => updateNode(selectedNode.id, { content: e.target.value })}
                rows={4}
                placeholder="Instrução para a IA ou mensagem a ser enviada..."
              />
            </div>
            
            {/* Variáveis disponíveis */}
            <div>
              <Label className="text-xs text-muted-foreground">Variáveis disponíveis</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {TEMPLATE_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
                    onClick={() => updateNode(selectedNode.id, { 
                      content: (selectedNode.content || "") + " " + v.key 
                    })}
                    title={v.label}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteConfirm(selectedNode)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Nó
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Nó */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nó</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(NODE_TYPES).map(([key, type]) => (
              <button
                key={key}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                onClick={() => addNode(key)}
              >
                <div className={`p-2 rounded-lg ${type.color} text-white`}>
                  <type.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nó</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.title}"? Esta ação também removerá as conexões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteNode(deleteConfirm.id)} className="bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== ABA CONVERSAS ====================
function MessagesTab({ toast }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/whatsapp/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Mensagens Recebidas</h2>
        <Button variant="outline" onClick={fetchMessages}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma mensagem</h3>
          <p className="text-sm text-muted-foreground">
            As mensagens recebidas aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, index) => (
            <div key={msg.id || index} className="bg-card rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{msg.pushName || "Cliente"}</span>
                    <span className="text-xs text-muted-foreground">
                      {msg.from?.replace("@s.whatsapp.net", "")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{msg.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(msg.timestamp).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== ABA PALAVRAS (ANALYTICS) ====================
function PalavrasTab({ toast }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [words, setWords] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeView, setActiveView] = useState("overview"); // overview, words, phrases, messages
  const [orderBy, setOrderBy] = useState("count");
  const [textType, setTextType] = useState("all"); // all, word, bigram, trigram

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Buscar resumo
      const summaryRes = await fetch(`${API_URL}/api/chatbot/analytics/summary`, { headers });
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.summary);
      }
      
      // Buscar palavras/frases
      const wordsRes = await fetch(`${API_URL}/api/chatbot/analytics/words?limit=100&order_by=${orderBy}&text_type=${textType}`, { headers });
      const wordsData = await wordsRes.json();
      if (wordsData.success) {
        setWords(wordsData.words);
      }
      
      // Buscar mensagens recentes
      const messagesRes = await fetch(`${API_URL}/api/chatbot/analytics/messages?limit=50`, { headers });
      const messagesData = await messagesRes.json();
      if (messagesData.success) {
        setMessages(messagesData.messages);
      }
    } catch (error) {
      console.error("Erro ao carregar analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [orderBy, textType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular tamanho da fonte baseado na contagem (para word cloud)
  const getWordSize = (count, maxCount) => {
    const minSize = 12;
    const maxSize = 48;
    if (maxCount === 0) return minSize;
    return Math.max(minSize, Math.min(maxSize, (count / maxCount) * maxSize));
  };

  // Cores para as palavras
  const wordColors = [
    "text-orange-500", "text-blue-500", "text-green-500", "text-purple-500",
    "text-pink-500", "text-yellow-500", "text-red-500", "text-cyan-500",
    "text-emerald-500", "text-indigo-500"
  ];

  const maxCount = words.length > 0 ? Math.max(...words.map(w => w.count)) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            Analytics de Palavras
          </h2>
          <p className="text-muted-foreground">Entenda o comportamento dos seus clientes através das palavras que eles usam</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Hash className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.total_unique_words || 0}</p>
              <p className="text-sm text-muted-foreground">Palavras únicas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <MessageCircle className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.total_unique_phrases || 0}</p>
              <p className="text-sm text-muted-foreground">Frases únicas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.total_word_occurrences || 0}</p>
              <p className="text-sm text-muted-foreground">Ocorrências</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MessageCircleMore className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.total_messages || 0}</p>
              <p className="text-sm text-muted-foreground">Mensagens</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.unique_senders || 0}</p>
              <p className="text-sm text-muted-foreground">Clientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação de views */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveView("overview")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === "overview" 
              ? "bg-orange-500 text-white" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => { setActiveView("words"); setTextType("word"); }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === "words" 
              ? "bg-orange-500 text-white" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Palavras
        </button>
        <button
          onClick={() => { setActiveView("phrases"); setTextType("bigram"); }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === "phrases" 
              ? "bg-orange-500 text-white" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Frases
        </button>
        <button
          onClick={() => setActiveView("messages")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === "messages" 
              ? "bg-orange-500 text-white" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Todas as Palavras
        </button>
        <button
          onClick={() => setActiveView("messages")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === "messages" 
              ? "bg-orange-500 text-white" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Mensagens Recentes
        </button>
      </div>

      {/* Conteúdo baseado na view ativa */}
      {activeView === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Word Cloud */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-orange-500" />
              Nuvem de Palavras
            </h3>
            {words.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircleMore className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma palavra registrada ainda</p>
                <p className="text-sm">As palavras aparecerão aqui quando os clientes enviarem mensagens</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center items-center min-h-[200px]">
                {words.slice(0, 50).map((word, index) => (
                  <span
                    key={word.id}
                    className={`${wordColors[index % wordColors.length]} font-medium cursor-default hover:opacity-80 transition-opacity`}
                    style={{ fontSize: `${getWordSize(word.count, maxCount)}px` }}
                    title={`${word.word}: ${word.count} vezes`}
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Top 10 Palavras */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Top 10 Palavras
            </h3>
            {summary?.top_words?.length > 0 ? (
              <div className="space-y-3">
                {summary.top_words.map((word, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? "bg-orange-500 text-white" : "bg-muted"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{word.word}</span>
                        <span className="text-sm text-muted-foreground">{word.count}x</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          style={{ width: `${(word.count / (summary.top_words[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            )}
          </div>
          
          {/* Top 10 Frases */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-500" />
              Top 10 Frases
            </h3>
            {summary?.top_phrases?.length > 0 ? (
              <div className="space-y-3">
                {summary.top_phrases.map((phrase, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? "bg-cyan-500 text-white" : "bg-muted"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">"{phrase.phrase}"</span>
                        <span className="text-sm text-muted-foreground">{phrase.count}x</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                          style={{ width: `${(phrase.count / (summary.top_phrases[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma frase registrada ainda</p>
            )}
          </div>
          
          {/* Mensagens por dia */}
          <div className="bg-card border rounded-xl p-6 md:col-span-2">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              Mensagens nos Últimos 7 Dias
            </h3>
            {summary?.messages_by_day?.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {summary.messages_by_day.reverse().map((day, index) => {
                  const maxDayCount = Math.max(...summary.messages_by_day.map(d => d.count));
                  const height = maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{day.count}</span>
                      <div 
                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {new Date(day.day).toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      )}

      {activeView === "words" && (
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Todas as Palavras ({words.length})</h3>
            <Select value={orderBy} onValueChange={setOrderBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Mais usadas</SelectItem>
                <SelectItem value="word">Alfabética</SelectItem>
                <SelectItem value="last_used">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {words.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma palavra registrada</p>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Palavra</th>
                    <th className="text-center py-2 px-3">Contagem</th>
                    <th className="text-center py-2 px-3">Clientes</th>
                    <th className="text-right py-2 px-3">Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((word) => (
                    <tr key={word.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{word.word}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded-full text-sm">
                          {word.count}x
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        {word.unique_senders}
                      </td>
                      <td className="py-2 px-3 text-right text-sm text-muted-foreground">
                        {word.last_used ? new Date(word.last_used).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === "phrases" && (
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Frases Capturadas ({words.length})</h3>
            <div className="flex gap-2">
              <Select value={textType} onValueChange={setTextType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bigram">2 palavras</SelectItem>
                  <SelectItem value="trigram">3 palavras</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Mais usadas</SelectItem>
                  <SelectItem value="word">Alfabética</SelectItem>
                  <SelectItem value="last_used">Mais recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {words.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma frase registrada ainda</p>
              <p className="text-sm">As frases aparecerão aqui quando os clientes enviarem mensagens</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Frase</th>
                    <th className="text-center py-2 px-3">Contagem</th>
                    <th className="text-center py-2 px-3">Clientes</th>
                    <th className="text-right py-2 px-3">Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <span className="font-medium">"{item.word}"</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.type === 'bigram' ? '2 palavras' : '3 palavras'})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-1 bg-cyan-500/10 text-cyan-600 rounded-full text-sm">
                          {item.count}x
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        {item.unique_senders}
                      </td>
                      <td className="py-2 px-3 text-right text-sm text-muted-foreground">
                        {item.last_used ? new Date(item.last_used).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === "messages" && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Mensagens Recentes ({messages.length})</h3>
          
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma mensagem registrada</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {msg.sender_name || msg.sender_phone}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dica */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500 text-white">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-medium">Como funciona?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              O sistema analisa automaticamente todas as mensagens recebidas pelo WhatsApp, 
              extraindo as palavras mais relevantes (ignorando artigos, preposições e palavras comuns).
              Use esses dados para entender o que seus clientes mais perguntam e melhorar seu atendimento!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ==================== ABA RESPOSTAS AUTOMÁTICAS ====================
// Variáveis disponíveis para usar nas notificações de status de pedidos
const ORDER_NOTIFICATION_VARIABLES = [
  { key: "{codigo}", label: "Código do Pedido", description: "Número único do pedido" },
  { key: "{endereco}", label: "Endereço da Empresa", description: "Endereço para retirada" },
  { key: "{motivo}", label: "Motivo do Cancelamento", description: "Razão do cancelamento (se aplicável)" },
];

// Labels amigáveis para os status de pedidos
const STATUS_LABELS = {
  aguardando_aceite: { label: "Pedido Criado", icon: Package, color: "bg-blue-500" },
  producao: { label: "Em Produção", icon: Clock, color: "bg-yellow-500" },
  pronto: { label: "Pronto", icon: CheckCircle, color: "bg-green-500" },
  na_bag: { label: "Na Bag", icon: ShoppingBag, color: "bg-purple-500" },
  em_rota: { label: "Em Rota", icon: Truck, color: "bg-orange-500" },
  entregue: { label: "Entregue", icon: CheckCircle, color: "bg-green-600" },
  concluido: { label: "Concluído", icon: CheckCircle, color: "bg-green-600" },
  retirado: { label: "Retirado", icon: CheckCircle, color: "bg-green-600" },
  cancelado: { label: "Cancelado", icon: X, color: "bg-red-500" },
};

function OrderStatusNotificationsSection({ toast }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("delivery"); // delivery ou pickup
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState({ template: "", delay_seconds: 0, is_active: true });

  const fetchTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/order-status-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Erro ao buscar templates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setEditForm({
      template: template.template || "",
      delay_seconds: template.delay_seconds || 0,
      is_active: template.is_active === 1 || template.is_active === true
    });
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/order-status-templates/${editingTemplate.tipo_entrega}/${editingTemplate.status}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Sucesso", description: "Template atualizado com sucesso!" });
        await fetchTemplates();
        setEditingTemplate(null);
      } else {
        toast({ title: "Erro", description: data.detail || "Erro ao salvar template", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredTemplates = templates.filter(t => t.tipo_entrega === activeTab);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500 text-white">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">Notificações Automáticas de Pedidos</h4>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Configure as mensagens que serão enviadas automaticamente ao cliente em cada etapa do pedido.
            </p>
            <div className="flex flex-wrap gap-2">
              {ORDER_NOTIFICATION_VARIABLES.map((v) => (
                <span 
                  key={v.key}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-mono cursor-help"
                  title={v.description}
                >
                  {v.key}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Entrega / Retirada */}
      <div className="flex gap-2">
        <Button 
          variant={activeTab === "delivery" ? "default" : "outline"}
          onClick={() => setActiveTab("delivery")}
        >
          <Truck className="w-4 h-4 mr-2" />
          Entrega (Delivery)
        </Button>
        <Button 
          variant={activeTab === "pickup" ? "default" : "outline"}
          onClick={() => setActiveTab("pickup")}
        >
          <Package className="w-4 h-4 mr-2" />
          Retirada (Pickup)
        </Button>
      </div>

      {/* Lista de Templates */}
      <div className="space-y-3">
        {filteredTemplates.map((template) => {
          const statusConfig = STATUS_LABELS[template.status] || { label: template.status, icon: MessageCircle, color: "bg-gray-500" };
          const StatusIcon = statusConfig.icon;
          return (
            <div 
              key={template.id} 
              className={`bg-card border rounded-xl p-4 ${!template.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-1.5 rounded-lg ${statusConfig.color} text-white`}>
                      <StatusIcon className="w-4 h-4" />
                    </span>
                    <span className="font-medium">{statusConfig.label}</span>
                    {template.delay_seconds > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded text-xs">
                        ⏱️ {template.delay_seconds}s de delay
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {template.template}
                    </pre>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditModal(template)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Edição */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Notificação - {editingTemplate && STATUS_LABELS[editingTemplate.status]?.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Mensagem da Notificação</Label>
                <span className="text-xs text-muted-foreground">Variáveis disponíveis:</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {ORDER_NOTIFICATION_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-mono hover:bg-blue-200 transition-colors"
                    onClick={() => setEditForm(prev => ({...prev, template: prev.template + v.key}))}
                    title={v.description}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
              <Textarea 
                placeholder="Digite a mensagem de notificação..."
                rows={4}
                value={editForm.template}
                onChange={(e) => setEditForm(prev => ({...prev, template: e.target.value}))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delay (segundos)</Label>
                <Input 
                  type="number"
                  min={0}
                  max={300}
                  value={editForm.delay_seconds}
                  onChange={(e) => setEditForm(prev => ({...prev, delay_seconds: parseInt(e.target.value) || 0}))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo de espera antes de enviar a notificação
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch 
                    checked={editForm.is_active}
                    onCheckedChange={(checked) => setEditForm(prev => ({...prev, is_active: checked}))}
                  />
                  <span className="text-sm">{editForm.is_active ? "Ativo" : "Inativo"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Se inativo, a notificação não será enviada
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Variáveis disponíveis para usar nas respostas
const AVAILABLE_VARIABLES = [
  { key: "[NOME-DO-CLIENTE]", label: "Nome do Cliente", description: "Nome do cliente identificado pelo telefone" },
  { key: "[DELIVERY-URL]", label: "URL do Delivery/Cardápio", description: "Link do cardápio digital" },
  { key: "[ENDERECO]", label: "Endereço da Empresa", description: "Endereço configurado nas configurações" },
  { key: "[HORARIOS]", label: "Horários de Funcionamento", description: "Todos os horários de funcionamento" },
  { key: "[CODIGO-PEDIDO]", label: "Código do Último Pedido", description: "Número do último pedido do cliente" },
  { key: "[TELEFONE-EMPRESA]", label: "Telefone da Empresa", description: "Telefone de contato" },
  { key: "[NOME-EMPRESA]", label: "Nome da Empresa", description: "Nome fantasia da empresa" },
  { key: "[INSTAGRAM]", label: "Instagram", description: "@ do Instagram da empresa" },
];

function RespostasAutomaticasTab({ toast }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [formData, setFormData] = useState({
    keywords: "",
    response: "",
    is_active: true,
    priority: 0,
    match_type: "contains"
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeSection, setActiveSection] = useState("respostas"); // respostas, notificacoes ou configuracoes
  const [botSettings, setBotSettings] = useState({
    bot_pause_message: "",
    bot_pause_duration: 15,
    chatbot_name: "Ana"
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchResponses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/keyword-responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setResponses(data.responses || []);
      }
    } catch (error) {
      console.error("Erro ao buscar respostas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBotSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chatbot/bot-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBotSettings({
          bot_pause_message: data.bot_pause_message || "",
          bot_pause_duration: data.bot_pause_duration || 15,
          chatbot_name: data.chatbot_name || "Ana"
        });
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    }
  }, []);

  useEffect(() => {
    fetchResponses();
    fetchBotSettings();
  }, [fetchResponses, fetchBotSettings]);

  const openCreateModal = () => {
    setEditingResponse(null);
    setFormData({
      keywords: "",
      response: "",
      is_active: true,
      priority: 0,
      match_type: "contains"
    });
    setShowModal(true);
  };

  const openEditModal = (resp) => {
    setEditingResponse(resp);
    setFormData({
      keywords: resp.keywords || "",
      response: resp.response || "",
      is_active: resp.is_active === 1 || resp.is_active === true,
      priority: resp.priority || 0,
      match_type: resp.match_type || "contains"
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.keywords.trim() || !formData.response.trim()) {
      toast({ title: "Erro", description: "Preencha as palavras-chave e a resposta", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingResponse 
        ? `${API_URL}/api/keyword-responses/${editingResponse.id}`
        : `${API_URL}/api/keyword-responses`;
      
      const res = await fetch(url, {
        method: editingResponse ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        toast({ 
          title: editingResponse ? "Atualizado" : "Criado", 
          description: editingResponse ? "Resposta atualizada com sucesso" : "Resposta criada com sucesso" 
        });
        setShowModal(false);
        fetchResponses();
      } else {
        throw new Error(data.detail || "Erro ao salvar");
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/keyword-responses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deletado", description: "Resposta removida com sucesso" });
        fetchResponses();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao deletar", variant: "destructive" });
    }
    setDeleteConfirm(null);
  };

  const toggleActive = async (resp) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/keyword-responses/${resp.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !resp.is_active })
      });
      fetchResponses();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      response: prev.response + variable
    }));
  };

  const saveBotSettings = async () => {
    setSavingSettings(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chatbot/bot-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(botSettings)
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Salvo", description: "Configurações salvas com sucesso" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header com abas */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant={activeSection === "respostas" ? "default" : "outline"}
            onClick={() => setActiveSection("respostas")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Respostas Automáticas
          </Button>
          <Button 
            variant={activeSection === "notificacoes" ? "default" : "outline"}
            onClick={() => setActiveSection("notificacoes")}
          >
            <Bell className="w-4 h-4 mr-2" />
            Notificações de Pedidos
          </Button>
          <Button 
            variant={activeSection === "configuracoes" ? "default" : "outline"}
            onClick={() => setActiveSection("configuracoes")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações do Bot
          </Button>
        </div>
        {activeSection === "respostas" && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Resposta
          </Button>
        )}
      </div>

      {activeSection === "respostas" ? (
        <>
          {/* Card de Variáveis Disponíveis */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Variáveis Disponíveis</h4>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Use estas variáveis nas suas respostas para personalizar automaticamente:
                </p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <span 
                      key={v.key}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-mono cursor-help"
                      title={v.description}
                    >
                      {v.key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium">Como funciona?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Quando o cliente enviar uma mensagem contendo uma das palavras-chave configuradas, 
                  o BOT responderá automaticamente com a mensagem definida, <strong>sem usar a IA</strong>.
                  Separe múltiplas palavras-chave por vírgula (ex: "oi, olá, bom dia").
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Respostas */}
          {responses.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">Nenhuma resposta configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie respostas automáticas para agilizar o atendimento do seu BOT
              </p>
              <Button onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Resposta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((resp) => (
                <div 
                  key={resp.id} 
                  className={`bg-card border rounded-xl p-4 ${!resp.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          resp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {resp.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-muted">
                          {resp.match_type === 'exact' ? 'Correspondência Exata' : 
                           resp.match_type === 'word' ? 'Palavra Inteira' : 'Contém'}
                        </span>
                        {resp.priority > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                            Prioridade: {resp.priority}
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Palavras-chave:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resp.keywords.split(',').map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-700 rounded text-sm">
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Resposta:</span>
                        <p className="text-sm mt-1 bg-muted/50 rounded p-2 whitespace-pre-wrap">{resp.response}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={resp.is_active === 1 || resp.is_active === true}
                        onCheckedChange={() => toggleActive(resp)}
                      />
                      <Button variant="outline" size="sm" onClick={() => openEditModal(resp)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(resp)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : activeSection === "notificacoes" ? (
        /* Seção de Notificações de Pedidos */
        <OrderStatusNotificationsSection toast={toast} />
      ) : (
        /* Seção de Configurações do Bot */
        <div className="space-y-6">
          {/* Card de Nome do Chatbot */}
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Bot className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Identidade do Chatbot</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Defina o nome que o chatbot usará ao se apresentar para os clientes.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="max-w-xs">
                <Label>Nome do Chatbot</Label>
                <Input 
                  placeholder="Ex: Ana, Maria, João..."
                  value={botSettings.chatbot_name}
                  onChange={(e) => setBotSettings(prev => ({...prev, chatbot_name: e.target.value}))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Quando perguntarem o nome, o bot responderá com este nome.
                </p>
              </div>
            </div>
          </div>

          {/* Card de Pausa do Bot */}
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Pausa por Intervenção Humana</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Quando um atendente humano enviar mensagem, o bot será pausado automaticamente 
                  e enviará a mensagem abaixo para o cliente.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Mensagem de Pausa do Bot</Label>
                <Textarea 
                  placeholder="Ex: Opa, vi que um atendente humano começou o atendimento! Núcleo-Vox pausado por 15 minutos."
                  rows={3}
                  value={botSettings.bot_pause_message}
                  onChange={(e) => setBotSettings(prev => ({...prev, bot_pause_message: e.target.value}))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta mensagem será enviada quando o bot detectar intervenção de um atendente humano. Use [TEMPO] para mostrar a duração.
                </p>
              </div>

              <div className="w-48">
                <Label>Duração da Pausa (minutos)</Label>
                <Input 
                  type="number"
                  min={1}
                  max={120}
                  value={botSettings.bot_pause_duration}
                  onChange={(e) => setBotSettings(prev => ({...prev, bot_pause_duration: parseInt(e.target.value) || 15}))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O bot ficará pausado por este tempo após intervenção humana.
                </p>
              </div>

              <Button onClick={saveBotSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Configurações
              </Button>
            </div>
          </div>

          {/* Card de Variáveis */}
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Variáveis Disponíveis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Use estas variáveis nas respostas automáticas para personalizar as mensagens.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {AVAILABLE_VARIABLES.map((v) => (
                <div key={v.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-sm font-mono">
                      {v.key}
                    </code>
                    <div>
                      <p className="font-medium text-sm">{v.label}</p>
                      <p className="text-xs text-muted-foreground">{v.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingResponse ? 'Editar Resposta Automática' : 'Nova Resposta Automática'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Palavras-chave *</Label>
              <Input 
                placeholder="oi, olá, bom dia, boa tarde"
                value={formData.keywords}
                onChange={(e) => setFormData({...formData, keywords: e.target.value})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe múltiplas palavras por vírgula
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Resposta do BOT *</Label>
                <span className="text-xs text-muted-foreground">Clique nas variáveis para inserir:</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded text-xs font-mono transition-colors"
                    title={v.description}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
              <Textarea 
                placeholder="Olá [NOME-DO-CLIENTE]! Seja bem-vindo ao [NOME-EMPRESA]. Como posso ajudar?"
                rows={4}
                value={formData.response}
                onChange={(e) => setFormData({...formData, response: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Correspondência</Label>
                <Select 
                  value={formData.match_type} 
                  onValueChange={(v) => setFormData({...formData, match_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém a palavra</SelectItem>
                    <SelectItem value="word">Palavra inteira</SelectItem>
                    <SelectItem value="exact">Mensagem exata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Prioridade</Label>
                <Input 
                  type="number"
                  min={0}
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maior = mais prioridade
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({...formData, is_active: v})}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingResponse ? 'Salvar Alterações' : 'Criar Resposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta resposta automática? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={() => handleDelete(deleteConfirm?.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
