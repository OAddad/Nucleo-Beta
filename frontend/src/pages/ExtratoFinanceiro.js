import { DollarSign, Construction } from "lucide-react";

export default function ExtratoFinanceiro() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="relative inline-block mb-6">
            <DollarSign className="w-20 h-20 text-muted-foreground/30" />
            <Construction className="w-8 h-8 text-amber-500 absolute -bottom-1 -right-1" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Extrato Financeiro</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Esta funcionalidade está em desenvolvimento
          </p>
          
          <div className="bg-card rounded-xl border p-8 max-w-md mx-auto">
            <h3 className="font-semibold mb-4">Em breve você poderá:</h3>
            <ul className="text-left space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Visualizar o fluxo de caixa completo
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Acompanhar entradas e saídas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Gerar relatórios financeiros detalhados
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Projeções e análises de tendências
              </li>
            </ul>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            Enquanto isso, utilize a aba <strong>Despesas</strong> para gerenciar suas contas a pagar.
          </p>
        </div>
      </div>
    </div>
  );
}
