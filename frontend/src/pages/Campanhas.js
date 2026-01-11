import { Megaphone, MessageCircle, Calendar, Users, Send } from "lucide-react";

// Ícone do WhatsApp customizado
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function Campanhas() {
  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground mt-1">Configure campanhas de ofertas para o ChatBot do WhatsApp</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-2xl border border-purple-500/20 p-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-purple-500" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mb-3">
                Em Desenvolvimento
              </div>
              <h2 className="text-xl font-bold mb-2">Em breve...</h2>
              <p className="text-muted-foreground mb-4">
                Esta funcionalidade está em desenvolvimento. Em breve você poderá configurar campanhas de ofertas do ChatBot.
              </p>
            </div>
          </div>
        </div>

        {/* Cards informativos sobre como funcionarão as campanhas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
              </div>
              <span className="font-medium">Período</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure data de início e fim da campanha. A oferta será exibida automaticamente neste período.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-green-500" strokeWidth={1.5} />
              </div>
              <span className="font-medium">Mensagem</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Escreva a mensagem que será enviada junto com a oferta. Use emojis e destaque os benefícios.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" strokeWidth={1.5} />
              </div>
              <span className="font-medium">Público</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Escolha para quem a campanha será exibida: todos os clientes, novos clientes ou clientes recorrentes.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
              </div>
              <span className="font-medium">Ativação</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Ative a campanha e acompanhe os resultados em tempo real no Relatório de Ofertas.
            </p>
          </div>
        </div>

        {/* Informativo WhatsApp */}
        <div className="mt-8 bg-card rounded-xl border p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <WhatsAppIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Integração com ChatBot do WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                As campanhas criadas aqui serão exibidas automaticamente no ChatBot do WhatsApp. 
                O usuário vai conseguir configurar as campanhas de ofertas para aumentar suas vendas de forma automática.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
