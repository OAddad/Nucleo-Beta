import { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Save, AlertCircle, Check, Store } from "lucide-react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";

const API = '/api';

export default function ConfiguracaoHorarios() {
  const [businessHours, setBusinessHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchBusinessHours();
  }, []);

  const fetchBusinessHours = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/business-hours`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBusinessHours(response.data);
    } catch (error) {
      console.error("Erro ao carregar horários:", error);
      toast.error("Erro ao carregar horários de funcionamento");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpen = (dayOfWeek) => {
    setBusinessHours(prev => prev.map(h => 
      h.day_of_week === dayOfWeek ? { ...h, is_open: !h.is_open } : h
    ));
    setHasChanges(true);
  };

  const handleTimeChange = (dayOfWeek, field, value) => {
    setBusinessHours(prev => prev.map(h => 
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        hours: businessHours.map(h => ({
          day_of_week: h.day_of_week,
          is_open: h.is_open,
          opening_time: h.opening_time,
          closing_time: h.closing_time
        }))
      };
      
      await axios.put(`${API}/business-hours`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Horários salvos com sucesso!");
      setHasChanges(false);
    } catch (error) {
      console.error("Erro ao salvar horários:", error);
      toast.error("Erro ao salvar horários de funcionamento");
    } finally {
      setSaving(false);
    }
  };

  // Gerar opções de horário (00:00 a 23:30, de 30 em 30 min)
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            Horários de Funcionamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure os horários de abertura e fechamento do seu estabelecimento
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Store className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-800 dark:text-orange-300">Informação</h3>
            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
              Os horários configurados aqui serão exibidos no cardápio público para seus clientes. 
              O sistema automaticamente mostrará se o estabelecimento está aberto ou fechado baseado nessas configurações.
            </p>
          </div>
        </div>
      </div>

      {/* Days List */}
      <div className="space-y-3">
        {businessHours.map((hour) => (
          <div
            key={hour.day_of_week}
            className={`
              bg-card border rounded-xl p-4 transition-all
              ${hour.is_open 
                ? 'border-green-200 dark:border-green-800' 
                : 'border-zinc-200 dark:border-zinc-700 opacity-60'
              }
            `}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Day Name + Toggle */}
              <div className="flex items-center gap-4 min-w-[200px]">
                <Switch
                  checked={hour.is_open}
                  onCheckedChange={() => handleToggleOpen(hour.day_of_week)}
                  className="data-[state=checked]:bg-green-500"
                />
                <div>
                  <h3 className={`font-semibold ${hour.is_open ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {hour.day_name}
                  </h3>
                  <span className={`text-xs ${hour.is_open ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {hour.is_open ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
              </div>

              {/* Time Selectors */}
              {hour.is_open && (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Abre às</Label>
                    <select
                      value={hour.opening_time}
                      onChange={(e) => handleTimeChange(hour.day_of_week, 'opening_time', e.target.value)}
                      className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {timeOptions.map(time => (
                        <option key={`open-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Fecha às</Label>
                    <select
                      value={hour.closing_time}
                      onChange={(e) => handleTimeChange(hour.day_of_week, 'closing_time', e.target.value)}
                      className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {timeOptions.map(time => (
                        <option key={`close-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                ${hour.is_open 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }
              `}>
                {hour.is_open ? (
                  <>
                    <Check className="w-4 h-4" />
                    {hour.opening_time} - {hour.closing_time}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Fechado
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-bounce">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Você tem alterações não salvas</span>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-white text-orange-600 hover:bg-orange-100"
          >
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
