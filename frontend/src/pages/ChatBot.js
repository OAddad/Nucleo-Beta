import { useState } from "react";
import { MessageSquare, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";

export default function ChatBot() {
  const [key, setKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = () => {
    setIsLoading(true);
    setKey(prev => prev + 1);
  };

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
            <p className="text-sm text-muted-foreground">Integração com WhatsApp Web</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir em nova aba
            </a>
          </Button>
        </div>
      </div>

      {/* Iframe do WhatsApp Web */}
      <div className="flex-1 relative bg-muted">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando WhatsApp Web...</p>
              <p className="text-xs text-muted-foreground mt-2">Pode levar alguns segundos</p>
            </div>
          </div>
        )}
        
        <iframe
          key={key}
          src="https://web.whatsapp.com/"
          title="WhatsApp Web"
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />

        {/* Overlay de aviso caso iframe não funcione */}
        <div className="absolute bottom-4 left-4 right-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">⚠️ Importante:</p>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            O WhatsApp Web pode bloquear a exibição em iframe por motivos de segurança. 
            Se não carregar corretamente, use o botão "Abrir em nova aba" acima.
          </p>
        </div>
      </div>
    </div>
  );
}
