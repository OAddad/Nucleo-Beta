import { BarChart3, Package, ShoppingCart, FileText, TrendingUp, DollarSign } from "lucide-react";

export default function Overview() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os principais indicadores do seu negócio
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground">Estoque</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">--</h3>
            <p className="text-sm text-muted-foreground">Itens cadastrados</p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-muted-foreground">Produtos</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">--</h3>
            <p className="text-sm text-muted-foreground">Fichas técnicas</p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs text-muted-foreground">Compras</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">--</h3>
            <p className="text-sm text-muted-foreground">Este mês</p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs text-muted-foreground">CMV Médio</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">R$ --</h3>
            <p className="text-sm text-muted-foreground">Por produto</p>
          </div>
        </div>

        {/* Seção de Acesso Rápido */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors text-left">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Gerenciar Estoque</h3>
                <p className="text-sm text-muted-foreground">Cadastrar ingredientes</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors text-left">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Lançar Compras</h3>
                <p className="text-sm text-muted-foreground">Registrar novas compras</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors text-left">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Cadastrar Produto</h3>
                <p className="text-sm text-muted-foreground">Criar ficha técnica</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
