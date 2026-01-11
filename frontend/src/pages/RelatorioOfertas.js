import { BarChart3, TrendingUp, Gift, Ticket, Megaphone } from "lucide-react";

export default function RelatorioOfertas() {
  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Ofertas</h1>
          <p className="text-muted-foreground mt-1">Análise de desempenho das suas ofertas</p>
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mb-3">
                Em Desenvolvimento
              </div>
              <h2 className="text-xl font-bold mb-2">Em breve...</h2>
              <p className="text-muted-foreground mb-4">
                Esta funcionalidade está em desenvolvimento.
              </p>
            </div>
          </div>
        </div>

        {/* Cards informativos sobre o que virá */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold">Desempenho de Promoções</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Acompanhe o desempenho das suas promoções, veja quantas vendas foram geradas e o impacto no faturamento.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Ticket className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold">Desempenho de Cupons</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Veja quantos cupons foram resgatados, taxa de conversão e valor total de descontos aplicados.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold">Desempenho de Campanhas</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Analise o alcance e efetividade das suas campanhas de ofertas no ChatBot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
