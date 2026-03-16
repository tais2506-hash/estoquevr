import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Package, Activity, AlertTriangle, TrendingDown, ArrowUpDown,
} from "lucide-react";
import { subDays, parseISO, isAfter } from "date-fns";

const COLORS = [
  "hsl(205, 65%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)",
  "hsl(340, 65%, 55%)",
  "hsl(270, 50%, 55%)",
];

const DashboardObra = () => {
  const { obras, estoque, insumos, movimentacoes, entradas, getEstoqueByObra } = useInventory();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [periodDays, setPeriodDays] = useState<string>("30");

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const periodStart = subDays(new Date(), parseInt(periodDays));

  const estoqueObra = useMemo(() =>
    selectedObraId ? getEstoqueByObra(selectedObraId) : [],
    [selectedObraId, getEstoqueByObra]
  );

  const movsObra = useMemo(() =>
    movimentacoes.filter(m => m.obra_id === selectedObraId),
    [movimentacoes, selectedObraId]
  );

  const movsPeriodo = useMemo(() =>
    movsObra.filter(m => {
      try { return isAfter(parseISO(m.date), periodStart); } catch { return false; }
    }),
    [movsObra, periodStart]
  );

  // Financial
  const valorImobilizado = estoqueObra.reduce((a, e) => a + e.total_value, 0);
  const valorConsumido = useMemo(() =>
    movsObra.filter(m => m.type === "saida").reduce((a, m) => {
      const estoqueItem = estoque.find(e => e.obra_id === selectedObraId && e.insumo_id === m.insumo_id);
      return a + m.quantity * (estoqueItem?.average_unit_cost || 0);
    }, 0),
    [movsObra, estoque, selectedObraId]
  );
  const percentualConsumido = valorImobilizado + valorConsumido > 0
    ? (valorConsumido / (valorImobilizado + valorConsumido)) * 100 : 0;

  // Top 5 by value
  const top5Valor = useMemo(() =>
    [...estoqueObra]
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 5)
      .map(e => ({ name: e.insumo?.name?.substring(0, 20) || "—", valor: e.total_value })),
    [estoqueObra]
  );

  // Top 5 most consumed
  const top5Consumo = useMemo(() => {
    const consumoMap: Record<string, number> = {};
    movsObra.filter(m => m.type === "saida").forEach(m => {
      consumoMap[m.insumo_id] = (consumoMap[m.insumo_id] || 0) + m.quantity;
    });
    return Object.entries(consumoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, qty]) => ({
        name: insumos.find(i => i.id === id)?.name?.substring(0, 20) || "—",
        quantidade: qty,
      }));
  }, [movsObra, insumos]);

  // Operational
  const totalInsumosCadastrados = estoqueObra.length;
  const totalMovsPeriodo = movsPeriodo.length;

  // Items without movement > X days
  const itensSemMovimentacao = useMemo(() => {
    const diasLimite = parseInt(periodDays);
    return estoqueObra.filter(e => {
      const lastMov = movsObra
        .filter(m => m.insumo_id === e.insumo_id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!lastMov) return true;
      try { return !isAfter(parseISO(lastMov.date), subDays(new Date(), diasLimite)); } catch { return true; }
    });
  }, [estoqueObra, movsObra, periodDays]);

  // Alerts
  const estoqueParado = useMemo(() =>
    itensSemMovimentacao.filter(e => e.total_value > 500)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 5),
    [itensSemMovimentacao]
  );

  // Pie chart for value distribution
  const pieData = top5Valor.map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length] }));

  if (!selectedObraId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <SearchableSelect
            options={activeObras.map(o => ({ value: o.id, label: o.name }))}
            value={selectedObraId}
            onValueChange={setSelectedObraId}
            placeholder="Selecione uma obra..."
            searchPlaceholder="Buscar obra..."
            emptyMessage="Nenhuma obra encontrada."
            className="w-72"
          />
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Selecione uma obra para visualizar o dashboard estratégico.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <SearchableSelect
          options={activeObras.map(o => ({ value: o.id, label: o.name }))}
          value={selectedObraId}
          onValueChange={setSelectedObraId}
          placeholder="Selecione uma obra..."
          searchPlaceholder="Buscar obra..."
          emptyMessage="Nenhuma obra encontrada."
          className="w-72"
        />
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground">Valor Imobilizado</span></div>
            <p className="text-2xl font-bold text-foreground">{valorImobilizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Valor Consumido</span></div>
            <p className="text-2xl font-bold text-foreground">{valorConsumido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-info" /><span className="text-xs text-muted-foreground">% Consumido</span></div>
            <p className="text-2xl font-bold text-foreground">{percentualConsumido.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Insumos em Estoque</span></div>
            <p className="text-2xl font-bold text-foreground">{totalInsumosCadastrados}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2"><ArrowUpDown className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground">Movimentações no Período</span></div>
            <p className="text-2xl font-bold text-foreground">{totalMovsPeriodo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Sem Movimentação ({periodDays}d)</span></div>
            <p className="text-2xl font-bold text-foreground">{itensSemMovimentacao.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top 5 Insumos por Valor</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {top5Valor.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Valor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Valor</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top 5 Mais Consumidos</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {top5Consumo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Consumo} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {estoqueParado.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="text-sm font-medium text-foreground mb-2">🚨 Estoque com Valor Alto Parado</h4>
            <div className="space-y-1">
              {estoqueParado.map(e => (
                <div key={e.insumo_id} className="flex justify-between items-center p-2 bg-destructive/5 rounded-lg text-sm">
                  <span className="text-foreground">{e.insumo?.name}</span>
                  <Badge variant="destructive">{e.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardObra;
