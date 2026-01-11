import { MapPinned, Clock } from "lucide-react";

export default function AreaEntrega() {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <MapPinned className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Área de Entrega</h1>
        
        <div className="flex items-center gap-2 text-muted-foreground mb-6">
          <Clock className="w-5 h-5" />
          <span>Em breve</span>
        </div>
        
        <div className="max-w-md text-center">
          <p className="text-muted-foreground">
            Os preços das entregas poderão ser definidos pela <strong>distância do estabelecimento</strong> via integração com Maps.
          </p>
          
          <div className="mt-6 p-4 bg-background/60 rounded-xl border">
            <h3 className="font-semibold mb-2">🚀 Funcionalidades planejadas:</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
              <li>• Definir raio de entrega em km</li>
              <li>• Calcular valor de entrega por distância</li>
              <li>• Visualizar área de cobertura no mapa</li>
              <li>• Diferentes faixas de preço por zona</li>
              <li>• Bloqueio automático de entregas fora da área</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
