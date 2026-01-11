import { Ticket, Copy, Calendar, Users, Percent, DollarSign } from "lucide-react";

export default function CuponsDesconto() {
  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground mt-1">Crie e gerencie cupons de desconto para seus clientes</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-2xl border border-blue-500/20 p-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Ticket className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mb-3">
                Em Desenvolvimento
              </div>
              <h2 className="text-xl font-bold mb-2">Em breve...</h2>
              <p className="text-muted-foreground mb-4">
                Esta funcionalidade está em desenvolvimento. Em breve você poderá criar e gerenciar cupons de desconto personalizados.
              </p>
            </div>
          </div>
        </div>

        {/* Cards informativos sobre funcionalidades dos cupons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Copy className="w-6 h-6 text-green-500" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Código Personalizado</h3>
            <p className="text-sm text-muted-foreground">
              Crie códigos personalizados como PROMO10, DESCONTO20 ou deixe o sistema gerar automaticamente.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Período de Validade</h3>
            <p className="text-sm text-muted-foreground">
              Defina datas de início e fim para seus cupons. Configure promoções sazonais e eventos especiais.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Limite de Uso</h3>
            <p className="text-sm text-muted-foreground">
              Configure limite total de usos ou por cliente. Controle a distribuição dos seus descontos.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Tipos de Desconto</h3>
            <p className="text-sm text-muted-foreground">
              Cupons com desconto em valor fixo (R$) ou porcentagem (%). Configure valor mínimo de pedido.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
