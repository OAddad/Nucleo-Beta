import { useState } from "react";
import { MessageSquare, ExternalLink, Settings, QrCode, Send, Users, Bell } from "lucide-react";
import { Button } from "../components/ui/button";

export default function ChatBot() {
  const [showSetup, setShowSetup] = useState(true);

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
            <p className="text-sm text-muted-foreground">Integração com WhatsApp Business</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir WhatsApp Web
            </a>
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {showSetup ? (
          <div className="max-w-2xl mx-auto">
            {/* Card de Setup */}
            <div className="bg-card rounded-xl border shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <QrCode className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Conectar WhatsApp</h2>
                  <p className="text-muted-foreground">Configure a integração com seu WhatsApp Business</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">📱 Passo 1: Abra o WhatsApp Web</h3>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão "Abrir WhatsApp Web" acima e escaneie o QR Code com seu celular.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">🔗 Passo 2: API de Integração</h3>
                  <p className="text-sm text-muted-foreground">
                    Para automação completa, você precisará configurar a API do WhatsApp Business.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">🤖 Passo 3: Configure o Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    Defina mensagens automáticas, cardápio e respostas frequentes.
                  </p>
                </div>
              </div>

              <Button className="w-full mt-6" size="lg" asChild>
                <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Abrir WhatsApp Web
                </a>
              </Button>
            </div>

            {/* Cards de Funcionalidades */}
            <h3 className="text-lg font-semibold mb-4">Funcionalidades Disponíveis</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card rounded-xl border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-medium">Envio de Cardápio</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Envie seu cardápio automaticamente para clientes que entrarem em contato.
                </p>
              </div>

              <div className="bg-card rounded-xl border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-medium">Atendimento</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Responda automaticamente perguntas frequentes sobre horário, localização, etc.
                </p>
              </div>

              <div className="bg-card rounded-xl border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h4 className="font-medium">Notificações</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receba alertas de novos pedidos e mensagens importantes.
                </p>
              </div>

              <div className="bg-card rounded-xl border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                    <Settings className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h4 className="font-medium">Configurações</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Personalize mensagens, horários de atendimento e fluxos de conversa.
                </p>
              </div>
            </div>

            {/* Aviso */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>⚠️ Em desenvolvimento:</strong> A integração completa com WhatsApp Business API está sendo desenvolvida. 
                Por enquanto, use o WhatsApp Web para gerenciar suas conversas.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
