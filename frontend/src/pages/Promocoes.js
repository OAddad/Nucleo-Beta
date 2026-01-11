import { Gift, Percent, Award, DollarSign } from "lucide-react";

export default function Promocoes() {
  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Promoções</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas promoções e ofertas especiais</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-2xl border border-green-500/20 p-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Gift className="w-8 h-8 text-green-500" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mb-3">
                Em Desenvolvimento
              </div>
              <h2 className="text-xl font-bold mb-2">Em breve...</h2>
              <p className="text-muted-foreground mb-4">
                Esta funcionalidade está em desenvolvimento. Em breve você poderá configurar promoções personalizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Cards informativos sobre tipos de promoção */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card rounded-xl border p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold">Desconto no Valor Total</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure descontos em reais no valor total do pedido. Ex: R$ 10,00 de desconto em compras acima de R$ 50,00.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Percent className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold">Desconto em Porcentagem</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure descontos em porcentagem no valor do pedido. Ex: 15% de desconto em todos os produtos.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold">Pontuação / Fidelidade</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure promoções com pontos de fidelidade. Ex: A cada R$ 1,00 ganhe 1 ponto. Troque pontos por descontos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
