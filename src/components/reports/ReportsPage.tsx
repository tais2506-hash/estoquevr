import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MapPin, DollarSign } from "lucide-react";
import { parseISO, isAfter, isBefore, addDays } from "date-fns";

const ReportsPage = () => {
  const { saidas, locations, insumos, obras, estoque } = useInventory();
  const [filterObraId, setFilterObraId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const filteredSaidas = useMemo(() => {
    return saidas.filter(s => {
      const matchObra = filterObraId === "all" || s.obra_id === filterObraId;
      let matchDate = true;
      if (startDate) { try { matchDate = matchDate && isAfter(parseISO(s.date), parseISO(startDate)); } catch {} }
      if (endDate) { try { matchDate = matchDate && isBefore(parseISO(s.date), addDays(parseISO(endDate), 1)); } catch {} }
      return matchObra && matchDate;
    });
  }, [saidas, filterObraId, startDate, endDate]);

  // Consumption by Location
  const consumoByLocation = useMemo(() => {
    const map: Record<string, { name: string; type: string; qty: number; value: number }> = {};
    filteredSaidas.forEach(s => {
      if (!s.location_id) return;
      const loc = locations.find(l => l.id === s.location_id);
      if (!loc) return;
      if (!map[loc.id]) map[loc.id] = { name: loc.name, type: loc.type, qty: 0, value: 0 };
      const estoqueItem = estoque.find(e => e.obra_id === s.obra_id && e.insumo_id === s.insumo_id);
      map[loc.id].qty += s.quantity;
      map[loc.id].value += s.quantity * (estoqueItem?.average_unit_cost || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredSaidas, locations, estoque]);

  const chartLocData = consumoByLocation.slice(0, 10).map(l => ({
    name: l.name.length > 15 ? l.name.substring(0, 15) + "…" : l.name,
    valor: Math.round(l.value * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Obra</Label>
          <Select value={filterObraId} onValueChange={setFilterObraId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Consumo por Local (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {chartLocData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartLocData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Nenhuma baixa com local registrada</p>}
          </div>
        </CardContent>
      </Card>

      {/* Location detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            Valor Consumido por Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {consumoByLocation.map((l, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-sm">
                <div>
                  <span className="font-medium text-foreground">{l.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({l.type})</span>
                </div>
                <span className="font-mono text-foreground">{l.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            ))}
            {consumoByLocation.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
