import { Home, BarChart3, Package, DollarSign, Users, TrendingUp } from "lucide-react";

export default function VisaoGeral() {
  return (
    <div className="p-8" data-testid="visao-geral-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Visão Geral
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao Núcleo - o centro da sua gestão
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Home className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mb-3">
                <TrendingUp className="w-3 h-3" />
                Em Desenvolvimento
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Em breve um resumo de todo o operacional
              </h2>
              <p className="text-muted-foreground">
                Aqui você terá uma visão consolidada de todos os módulos do sistema: 
                vendas, estoque, financeiro, clientes e muito mais.
              </p>
            </div>
          </div>
        </div>

        {/* Preview dos módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Resumo de Vendas</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Total de vendas do dia, semana e mês
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold">Resumo Financeiro</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Receitas, despesas e lucro do período
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold">Alertas de Estoque</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Itens em baixa e produtos mais vendidos
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold">Clientes Ativos</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Clientes recentes e mais frequentes
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold">Metas do Mês</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Acompanhamento de metas e KPIs
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-cyan-600" />
              </div>
              <h3 className="font-semibold">Análise de Desempenho</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Comparativo com períodos anteriores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
