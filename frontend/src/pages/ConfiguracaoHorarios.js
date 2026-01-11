import { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Save, AlertCircle, Check, Store, Plus } from "lucide-react";
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

  const handleToggleSecondPeriod = (dayOfWeek) => {
    setBusinessHours(prev => prev.map(h => 
      h.day_of_week === dayOfWeek ? { ...h, has_second_period: !h.has_second_period } : h
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
          closing_time: h.closing_time,
          has_second_period: h.has_second_period,
          opening_time_2: h.opening_time_2,
          closing_time_2: h.closing_time_2
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

  // Gerar opções de horário (00:00 a 23:59, de 30 em 30 min, com 23:59 no final)
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }
  // Adicionar 23:59 como última opção
  if (!timeOptions.includes('23:59')) {
    timeOptions.push('23:59');
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
              Os horários configurados aqui serão exibidos no cardápio público. 
              Você pode configurar dois períodos por dia (ex: almoço e jantar) usando o switch "Dois Períodos".
            </p>
          </div>
        </div>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {businessHours.map((hour) => (
          <div
            key={hour.day_of_week}
            className={`
              bg-card border rounded-xl p-5 transition-all
              ${hour.is_open 
                ? 'border-green-200 dark:border-green-800' 
                : 'border-zinc-200 dark:border-zinc-700 opacity-60'
              }
            `}
          >
            {/* Linha Principal */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Day Name + Toggle */}
              <div className="flex items-center gap-4 min-w-[180px]">
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

              {/* Primeiro Período */}
              {hour.is_open && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">1º Período:</Label>
                    <select
                      value={hour.opening_time}
                      onChange={(e) => handleTimeChange(hour.day_of_week, 'opening_time', e.target.value)}
                      className="bg-background border border-input rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {timeOptions.map(time => (
                        <option key={`open1-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                    <span className="text-muted-foreground">às</span>
                    <select
                      value={hour.closing_time}
                      onChange={(e) => handleTimeChange(hour.day_of_week, 'closing_time', e.target.value)}
                      className="bg-background border border-input rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {timeOptions.map(time => (
                        <option key={`close1-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Toggle Segundo Período */}
              {hour.is_open && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hour.has_second_period}
                    onCheckedChange={() => handleToggleSecondPeriod(hour.day_of_week)}
                    className="data-[state=checked]:bg-blue-500"
                  />
                  <Label className="text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    2º Período
                  </Label>
                </div>
              )}
            </div>

            {/* Segundo Período (se ativo) */}
            {hour.is_open && hour.has_second_period && (
              <div className="mt-4 pt-4 border-t border-dashed flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                  <Label className="text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">2º Período:</Label>
                  <select
                    value={hour.opening_time_2}
                    onChange={(e) => handleTimeChange(hour.day_of_week, 'opening_time_2', e.target.value)}
                    className="bg-background border border-input rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timeOptions.map(time => (
                      <option key={`open2-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">às</span>
                  <select
                    value={hour.closing_time_2}
                    onChange={(e) => handleTimeChange(hour.day_of_week, 'closing_time_2', e.target.value)}
                    className="bg-background border border-input rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timeOptions.map(time => (
                      <option key={`close2-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                {/* Resumo do dia */}
                <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                  📅 {hour.opening_time} - {hour.closing_time} e {hour.opening_time_2} - {hour.closing_time_2}
                </div>
              </div>
            )}

            {/* Status Badge (somente 1 período) */}
            {hour.is_open && !hour.has_second_period && (
              <div className="mt-3 flex justify-end">
                <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                  📅 {hour.opening_time} - {hour.closing_time}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50">
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
