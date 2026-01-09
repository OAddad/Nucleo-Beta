import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Bug, 
  RefreshCw, 
  Trash2, 
  Database, 
  Server, 
  HardDrive,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BugsPage() {
  const [bugs, setBugs] = useState([]);
  const [requestLogs, setRequestLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bugs");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchBugs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/system/bugs?limit=100`, {
        headers: getAuthHeaders()
      });
      setBugs(response.data.bugs || []);
    } catch (error) {
      console.error("Erro ao buscar bugs:", error);
    }
  };

  const fetchRequestLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/system/requests-log?limit=200`, {
        headers: getAuthHeaders()
      });
      setRequestLogs(response.data.logs || []);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/system/info`, {
        headers: getAuthHeaders()
      });
      setSystemInfo(response.data);
    } catch (error) {
      console.error("Erro ao buscar info do sistema:", error);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchBugs(), fetchRequestLogs(), fetchSystemInfo()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClearBugs = async () => {
    try {
      await axios.delete(`${API_URL}/api/system/bugs`, {
        headers: getAuthHeaders()
      });
      toast.success("Bugs limpos com sucesso!");
      fetchBugs();
    } catch (error) {
      toast.error("Erro ao limpar bugs");
    }
    setClearDialogOpen(false);
  };

  const exportBugsToTxt = () => {
    let content = "=".repeat(80) + "\n";
    content += "RELATÓRIO DE BUGS DO SISTEMA - " + new Date().toLocaleString("pt-BR") + "\n";
    content += "=".repeat(80) + "\n\n";

    if (bugs.length === 0) {
      content += "Nenhum bug registrado.\n";
    } else {
      bugs.forEach((bug, index) => {
        content += `BUG #${index + 1}\n`;
        content += "-".repeat(40) + "\n";
        content += `ID: ${bug.id}\n`;
        content += `Data: ${new Date(bug.timestamp).toLocaleString("pt-BR")}\n`;
        content += `Tipo: ${bug.error_type}\n`;
        content += `Endpoint: ${bug.endpoint}\n`;
        content += `Status: ${bug.status}\n`;
        content += `Mensagem: ${bug.message}\n`;
        if (bug.stack_trace) {
          content += `Stack Trace:\n${bug.stack_trace}\n`;
        }
        content += "\n";
      });
    }

    content += "\n" + "=".repeat(80) + "\n";
    content += "INFORMAÇÕES DO SISTEMA\n";
    content += "=".repeat(80) + "\n\n";

    if (systemInfo) {
      content += `SQLite Path: ${systemInfo.sqlite_path}\n`;
      content += `SQLite Size: ${systemInfo.sqlite_size_mb} MB\n`;
      content += `Total Bugs: ${systemInfo.total_bugs}\n`;
      if (systemInfo.database) {
        content += `\nDados no Banco:\n`;
        content += `  - Ingredientes: ${systemInfo.database.ingredients}\n`;
        content += `  - Produtos: ${systemInfo.database.products}\n`;
        content += `  - Compras: ${systemInfo.database.purchases}\n`;
        content += `  - Usuários: ${systemInfo.database.users}\n`;
        content += `  - Categorias: ${systemInfo.database.categories}\n`;
      }
      if (systemInfo.queue_stats) {
        content += `\nEstatísticas da Fila:\n`;
        content += `  - Total Requisições: ${systemInfo.queue_stats.total_requests}\n`;
        content += `  - Sucesso: ${systemInfo.queue_stats.successful}\n`;
        content += `  - Falhas: ${systemInfo.queue_stats.failed}\n`;
        content += `  - Tempo Médio: ${systemInfo.queue_stats.avg_response_time?.toFixed(2)} ms\n`;
      }
    }

    // Download
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugs_report_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getBugStatusColor = (status) => {
    switch (status) {
      case "new":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "investigating":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "fixed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "ignored":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bug className="w-8 h-8" />
              Bugs & Sistema
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitore erros, logs de requisições e informações do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportBugsToTxt}>
              <Download className="w-4 h-4 mr-2" />
              Exportar TXT
            </Button>
            <Button variant="destructive" onClick={() => setClearDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Bugs
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Bugs</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                {bugs.length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Requisições Logadas</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                {requestLogs.length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Banco de Dados</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Database className="w-6 h-6 text-green-500" />
                {systemInfo?.sqlite_size_mb || 0} MB
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tempo Médio</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" />
                {systemInfo?.queue_stats?.avg_response_time?.toFixed(0) || 0} ms
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="bugs" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Bugs ({bugs.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Requisições ({requestLogs.length})
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* Tab Bugs */}
          <TabsContent value="bugs">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Bugs</CardTitle>
                <CardDescription>
                  Erros registrados pelo sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bugs.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">Nenhum bug registrado!</p>
                    <p className="text-muted-foreground">O sistema está funcionando normalmente.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {bugs.map((bug, index) => (
                      <div key={bug.id || index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getBugStatusColor(bug.status)}`}>
                                {bug.status?.toUpperCase() || "NEW"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(bug.timestamp).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <p className="font-medium text-red-600 dark:text-red-400">
                              {bug.error_type}: {bug.message}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Endpoint: {bug.endpoint}
                            </p>
                            {bug.stack_trace && (
                              <details className="mt-2">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver Stack Trace
                                </summary>
                                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                                  {bug.stack_trace}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Requisições */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Log de Requisições</CardTitle>
                <CardDescription>
                  Últimas requisições ao banco de dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Nenhum log de requisição ainda.</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Duração</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requestLogs.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell>{getStatusIcon(log.status)}</TableCell>
                            <TableCell className="text-xs">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString("pt-BR") : log.timestamp}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                            <TableCell>{log.priority}</TableCell>
                            <TableCell>{log.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Sistema */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Info do Banco */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Banco de Dados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">SQLite</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caminho:</span>
                    <span className="font-mono text-xs">{systemInfo?.sqlite_path}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamanho:</span>
                    <span className="font-medium">{systemInfo?.sqlite_size_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-medium ${systemInfo?.sqlite_exists ? "text-green-500" : "text-red-500"}`}>
                      {systemInfo?.sqlite_exists ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Dados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Dados Armazenados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ingredientes:</span>
                    <span className="font-medium">{systemInfo?.database?.ingredients || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produtos:</span>
                    <span className="font-medium">{systemInfo?.database?.products || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compras:</span>
                    <span className="font-medium">{systemInfo?.database?.purchases || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usuários:</span>
                    <span className="font-medium">{systemInfo?.database?.users || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categorias:</span>
                    <span className="font-medium">{systemInfo?.database?.categories || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Fila de Requisições */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Estatísticas da Fila
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Requisições:</span>
                    <span className="font-medium">{systemInfo?.queue_stats?.total_requests || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sucesso:</span>
                    <span className="font-medium text-green-500">{systemInfo?.queue_stats?.successful || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Falhas:</span>
                    <span className="font-medium text-red-500">{systemInfo?.queue_stats?.failed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo Médio:</span>
                    <span className="font-medium">{systemInfo?.queue_stats?.avg_response_time?.toFixed(2) || 0} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Na Fila:</span>
                    <span className="font-medium">{systemInfo?.queue_stats?.queue_size || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Arquivos de Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Arquivos de Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Bugs Log:</span>
                    <span className={`text-xs ${systemInfo?.bugs_log_exists ? "text-green-500" : "text-red-500"}`}>
                      {systemInfo?.bugs_log_exists ? "Existe" : "Não existe"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {systemInfo?.bugs_log_path}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-muted-foreground">Requests Log:</span>
                    <span className={`text-xs ${systemInfo?.requests_log_exists ? "text-green-500" : "text-red-500"}`}>
                      {systemInfo?.requests_log_exists ? "Existe" : "Não existe"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {systemInfo?.requests_log_path}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação */}
        <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todos os bugs?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá remover todos os bugs registrados. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearBugs} className="bg-red-600 hover:bg-red-700">
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
