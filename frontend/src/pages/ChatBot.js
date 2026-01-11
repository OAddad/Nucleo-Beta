import { useState, useEffect, useCallback, useRef } from "react";
import { 
  MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, LogOut, 
  GitBranch, Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, 
  Loader2, Bot, MessageCircle, HelpCircle, Zap, Play, Square,
  Move, Link2, Settings, Eye, EyeOff, ChevronDown, ChevronRight,
  Send, User, Clock, MapPin, ShoppingBag, Smartphone, RotateCcw,
  BarChart3, TrendingUp, Hash, Calendar, Users, MessageCircleMore
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
  const { toast } = useToast();

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
            onClick={() => setActiveTab("simulator")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "simulator"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Simulador
            </div>
          </button>
          <button
            onClick={() => setActiveTab("flow-editor")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "flow-editor"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Editor de Fluxo
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
          <WhatsAppTab toast={toast} />
        ) : activeTab === "simulator" ? (
          <SimulatorTab toast={toast} />
        ) : activeTab === "flow-editor" ? (
          <FlowEditorTab toast={toast} />
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
function WhatsAppTab({ toast }) {
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/whatsapp/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setStatus(data);
      
      if (data.status === "waiting_qr" || data.status === "disconnected") {
        fetchQR();
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      setStatus({ status: "error", connected: false, error: "Erro ao conectar ao serviço" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQR = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/whatsapp/qr`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && data.qr) {
        setQrCode(data.qr);
      }
    } catch (error) {
      console.error("Erro ao buscar QR:", error);
    }
  };

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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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
        return { text: "Serviço Offline", color: "red", icon: WifiOff };
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

        {/* Conectado */}
        {status?.connected && (
          <div className="flex flex-col items-center p-6 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-green-700 dark:text-green-300">WhatsApp Conectado!</h3>
            <p className="text-sm text-green-600 text-center mt-2">
              O ChatBot está pronto para atender seus clientes.
            </p>
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
  const [activeView, setActiveView] = useState("overview"); // overview, words, messages
  const [orderBy, setOrderBy] = useState("count");

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
      
      // Buscar palavras
      const wordsRes = await fetch(`${API_URL}/api/chatbot/analytics/words?limit=100&order_by=${orderBy}`, { headers });
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
  }, [orderBy]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.total_word_occurrences || 0}</p>
              <p className="text-sm text-muted-foreground">Total de ocorrências</p>
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
              <p className="text-sm text-muted-foreground">Mensagens recebidas</p>
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
              <p className="text-sm text-muted-foreground">Clientes únicos</p>
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
          onClick={() => setActiveView("words")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === "words" 
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
