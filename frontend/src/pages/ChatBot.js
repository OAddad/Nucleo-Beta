import { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, LogOut, 
  GitBranch, Plus, Edit2, Trash2, ChevronRight, ChevronDown,
  Save, X, AlertCircle, CheckCircle, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
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

export default function ChatBot() {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const { toast } = useToast();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500 text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ChatBot - WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Integração com WhatsApp e Árvore de Decisão</p>
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
            onClick={() => setActiveTab("decision-tree")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "decision-tree"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Árvore de Decisão
            </div>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "whatsapp" ? (
          <WhatsAppTab toast={toast} />
        ) : (
          <DecisionTreeTab toast={toast} />
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
      
      // Se não conectado, buscar QR
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
        toast({
          title: "Desconectado",
          description: "WhatsApp desconectado com sucesso"
        });
        fetchStatus();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao desconectar",
        variant: "destructive"
      });
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Atualizar a cada 5 segundos
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
    <div className="max-w-2xl mx-auto space-y-6">
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
                statusInfo.color === "green" ? "text-green-600 dark:text-green-400" :
                statusInfo.color === "yellow" ? "text-yellow-600 dark:text-yellow-400" :
                statusInfo.color === "red" ? "text-red-600 dark:text-red-400" :
                "text-gray-600 dark:text-gray-400"
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
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Desconectar
              </Button>
            )}
          </div>
        </div>

        {status?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-sm text-red-700 dark:text-red-300">{status.error}</p>
          </div>
        )}

        {/* QR Code */}
        {qrCode && !status?.connected && (
          <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-xl border">
            <h3 className="text-lg font-medium mb-4">Escaneie o QR Code</h3>
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              className="w-64 h-64 rounded-lg border"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
            </p>
          </div>
        )}

        {/* Conectado */}
        {status?.connected && (
          <div className="flex flex-col items-center p-6 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-green-700 dark:text-green-300">WhatsApp Conectado!</h3>
            <p className="text-sm text-green-600 dark:text-green-400 text-center mt-2">
              Seu WhatsApp está conectado e pronto para receber mensagens.
            </p>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Como conectar</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-medium">1</div>
            <div>
              <p className="font-medium">Abra o WhatsApp no celular</p>
              <p className="text-sm text-muted-foreground">Use o aplicativo oficial do WhatsApp</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-medium">2</div>
            <div>
              <p className="font-medium">Acesse Menu → Dispositivos conectados</p>
              <p className="text-sm text-muted-foreground">Toque nos três pontos no canto superior direito</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-medium">3</div>
            <div>
              <p className="font-medium">Escaneie o QR Code acima</p>
              <p className="text-sm text-muted-foreground">Aponte a câmera para o código QR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ABA ÁRVORE DE DECISÃO ====================
function DecisionTreeTab({ toast }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [editingNode, setEditingNode] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [parentForNewNode, setParentForNewNode] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchNodes = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/decision-tree`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNodes(data.nodes || []);
      }
    } catch (error) {
      console.error("Erro ao buscar nós:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar árvore de decisão",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // Organizar nós em árvore
  const buildTree = (nodes) => {
    const nodeMap = {};
    const roots = [];
    
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });
    
    nodes.forEach(node => {
      if (node.parent_id && nodeMap[node.parent_id]) {
        nodeMap[node.parent_id].children.push(nodeMap[node.id]);
      } else if (!node.parent_id) {
        roots.push(nodeMap[node.id]);
      }
    });
    
    // Ordenar por order
    const sortByOrder = (arr) => {
      arr.sort((a, b) => (a.order || 0) - (b.order || 0));
      arr.forEach(item => sortByOrder(item.children));
    };
    sortByOrder(roots);
    
    return roots;
  };

  const tree = buildTree(nodes);

  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleSaveNode = async (nodeData, isEdit = false) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const url = isEdit 
        ? `${API_URL}/api/decision-tree/${editingNode.id}`
        : `${API_URL}/api/decision-tree`;
      
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nodeData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Sucesso",
          description: isEdit ? "Nó atualizado com sucesso" : "Nó criado com sucesso"
        });
        setEditingNode(null);
        setShowAddModal(false);
        setParentForNewNode(null);
        fetchNodes();
      } else {
        throw new Error(data.detail || "Erro ao salvar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/decision-tree/${nodeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Nó deletado com sucesso"
        });
        setDeleteConfirm(null);
        fetchNodes();
      } else {
        throw new Error(data.detail || "Erro ao deletar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    
    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
            level > 0 ? "ml-6 border-l-2 border-muted" : ""
          }`}
        >
          {/* Expand/Collapse */}
          <button
            onClick={() => toggleExpand(node.id)}
            className="p-1 hover:bg-muted rounded"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>
          
          {/* Node Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                node.is_active 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
              }`}>
                {node.trigger}
              </span>
              {!node.is_active && (
                <span className="text-xs text-muted-foreground">(inativo)</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">{node.response}</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setParentForNewNode(node.id);
                setShowAddModal(true);
              }}
              title="Adicionar sub-opção"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingNode(node)}
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(node)}
              title="Excluir"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="pl-4">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Árvore de Decisão</h2>
          <p className="text-sm text-muted-foreground">
            Configure as respostas automáticas do chatbot
          </p>
        </div>
        <Button onClick={() => {
          setParentForNewNode(null);
          setShowAddModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Opção
        </Button>
      </div>

      {/* Árvore */}
      <div className="bg-card rounded-xl border shadow-sm p-4">
        {tree.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma opção cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece adicionando opções de resposta para o chatbot
            </p>
            <Button onClick={() => {
              setParentForNewNode(null);
              setShowAddModal(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar primeira opção
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Explicação */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Como funciona</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>Gatilho:</strong> Palavra ou frase que o cliente envia (ex: "oi", "cardápio", "1")</li>
          <li>• <strong>Resposta:</strong> Mensagem que o bot responderá automaticamente</li>
          <li>• <strong>Sub-opções:</strong> Crie respostas aninhadas para fluxos de conversa mais complexos</li>
        </ul>
      </div>

      {/* Modal de Adicionar/Editar */}
      <NodeFormModal
        isOpen={showAddModal || editingNode !== null}
        onClose={() => {
          setShowAddModal(false);
          setEditingNode(null);
          setParentForNewNode(null);
        }}
        onSave={handleSaveNode}
        node={editingNode}
        parentId={parentForNewNode}
        saving={saving}
      />

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nó</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o nó "{deleteConfirm?.trigger}"?
              {deleteConfirm?.children?.length > 0 && (
                <span className="block mt-2 text-red-600">
                  Atenção: Este nó possui sub-opções que também serão excluídas!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteNode(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== MODAL DE FORMULÁRIO ====================
function NodeFormModal({ isOpen, onClose, onSave, node, parentId, saving }) {
  const [trigger, setTrigger] = useState("");
  const [response, setResponse] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (node) {
      setTrigger(node.trigger || "");
      setResponse(node.response || "");
      setIsActive(node.is_active !== false);
      setOrder(node.order || 0);
    } else {
      setTrigger("");
      setResponse("");
      setIsActive(true);
      setOrder(0);
    }
  }, [node, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!trigger.trim() || !response.trim()) {
      return;
    }
    
    const data = {
      trigger: trigger.trim(),
      response: response.trim(),
      is_active: isActive,
      order: order,
      parent_id: node ? node.parent_id : parentId
    };
    
    onSave(data, !!node);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {node ? "Editar Nó" : parentId ? "Adicionar Sub-opção" : "Nova Opção"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="trigger">Gatilho (palavra/frase que dispara)</Label>
            <Input
              id="trigger"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Ex: oi, cardápio, 1, horário"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Quando o cliente enviar esta palavra, o bot responderá automaticamente
            </p>
          </div>
          
          <div>
            <Label htmlFor="response">Resposta do Bot</Label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Mensagem que o bot enviará..."
              rows={4}
              required
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="order">Ordem</Label>
              <Input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isActive">Ativo</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
