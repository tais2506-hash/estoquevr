import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Building2, TrendingUp, TrendingDown, Star, Package, AlertTriangle, Users,
} from "lucide-react";

const COLORS = [
  "hsl(205, 65%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)",
  "hsl(340, 65%, 55%)",
  "hsl(270, 50%, 55%)",
  "hsl(15, 80%, 55%)",
  "hsl(180, 50%, 45%)",
];

const DashboardGeral = () => {
  const { obras, estoque, insumos, movimentacoes, entradas, avaliacoes, fornecedores, getEstoqueByObra } = useInventory();
  const [incluirArquivadas, setIncluirArquivadas] = useState(false);

  const filteredObras = incluirArquivadas ? obras : obras.filter(o => o.status !== "arquivada");

  // Consolidated Financial
  const obraStats = useMemo(() =>
    filteredObras.map(o => {
      const est = getEstoqueByObra(o.id);
      const valorEstoque = est.reduce((a, e) => a + e.total_value, 0);
      const movs = movimentacoes.filter(m => m.obra_id === o.id);
      const saidas = movs.filter(m => m.type === "saida");
      const valorConsumo = saidas.reduce((a, m) => {
        const estoqueItem = estoque.find(e => e.obra_id === o.id && e.insumo_id === m.insumo_id);
        return a + m.quantity * (estoqueItem?.average_unit_cost || 0);
      }, 0);
      const giro = valorEstoque > 0 ? valorConsumo / valorEstoque : 0;
      return { ...o, valorEstoque, valorConsumo, totalMovs: movs.length, giro };
    }),
    [filteredObras, getEstoqueByObra, movimentacoes, estoque]
  );

  const totalImobilizado = obraStats.reduce((a, o) => a + o.valorEstoque, 0);
  const totalConsumo = obraStats.reduce((a, o) => a + o.valorConsumo, 0);

  // Rankings
  const rankingEstoque = useMemo(() =>
    [...obraStats].sort((a, b) => b.valorEstoque - a.valorEstoque),
    [obraStats]
  );

  const rankingConsumo = useMemo(() =>
    [...obraStats].sort((a, b) => b.valorConsumo - a.valorConsumo),
    [obraStats]
  );

  // Bar chart data
  const comparativoData = useMemo(() =>
    obraStats.map(o => ({
      name: o.name.length > 12 ? o.name.substring(0, 12) + "…" : o.name,
      estoque: o.valorEstoque,
      consumo: o.valorConsumo,
    })),
    [obraStats]
  );

  // Pie chart
  const pieData = useMemo(() =>
    obraStats.filter(o => o.valorEstoque > 0).map((o, i) => ({
      name: o.name.length > 15 ? o.name.substring(0, 15) + "…" : o.name,
      value: o.valorEstoque,
      fill: COLORS[i % COLORS.length],
    })),
    [obraStats]
  );

  // Performance
  const maiorGiro = useMemo(() =>
    [...obraStats].filter(o => o.giro > 0).sort((a, b) => b.giro - a.giro)[0],
    [obraStats]
  );
  const maiorEstoqueParado = useMemo(() => {
    const semConsumo = obraStats.filter(o => o.valorEstoque > 0 && o.valorConsumo === 0);
    return semConsumo.length > 0 ? semConsumo.sort((a, b) => b.valorEstoque - a.valorEstoque)[0] :
      [...obraStats].sort((a, b) => b.valorEstoque - a.valorEstoque)[0];
  }, [obraStats]);

  // Fornecedores
  const fornecedorStats = useMemo(() => {
    return fornecedores.map(f => {
      const totalEntregas = entradas.filter(e => e.fornecedor_id === f.id).length;
      const avs = avaliacoes.filter(a => a.fornecedor_id === f.id);
      const avg = avs.length > 0
        ? avs.reduce((a, av) => a + (av.pontualidade + av.qualidade + av.atendimento + av.documentacao) / 4, 0) / avs.length
        : 0;
      return { ...f, totalEntregas, media: Math.round(avg * 10) / 10, totalAvs: avs.length };
    });
  }, [fornecedores, entradas, avaliacoes]);

  const fornMaisUtilizado = useMemo(() =>
    [...fornecedorStats].sort((a, b) => b.totalEntregas - a.totalEntregas)[0],
    [fornecedorStats]
  );
  const fornPiorAvaliacao = useMemo(() =>
    [...fornecedorStats].filter(f => f.totalAvs > 0).sort((a, b) => a.media - b.media)[0],
    [fornecedorStats]
  );

  return (
    <div className="space-y-6">
      {/* Toggle archived */}
      <div className="flex items-center gap-3">
        <Switch id="incluir-arq" checked={incluirArquivadas} onCheckedChange={setIncluirArquivadas} />
        <Label htmlFor="incluir-arq" className="text-sm text-muted-foreground">
          Incluir obras arquivadas
        </Label>
      </div>

      {/* Consolidated Financial Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Total Imobilizado</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalImobilizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Total Consumido</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalConsumo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Obras Ativas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {filteredObras.filter(o => o.status === "ativa").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Fornecedores</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{fornecedores.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {maiorGiro && (
          <Card className="border-success/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Maior Giro de Estoque</p>
              <p className="text-sm font-bold text-foreground">{maiorGiro.name}</p>
              <Badge variant="outline" className="mt-1 text-success">{maiorGiro.giro.toFixed(2)}x</Badge>
            </CardContent>
          </Card>
        )}
        {maiorEstoqueParado && (
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Maior Estoque Parado</p>
              <p className="text-sm font-bold text-foreground">{maiorEstoqueParado.name}</p>
              <Badge variant="outline" className="mt-1 text-destructive">
                {maiorEstoqueParado.valorEstoque.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Badge>
            </CardContent>
          </Card>
        )}
        {fornMaisUtilizado && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Fornecedor Mais Utilizado</p>
              <p className="text-sm font-bold text-foreground">{fornMaisUtilizado.name}</p>
              <Badge variant="outline" className="mt-1">{fornMaisUtilizado.totalEntregas} entregas</Badge>
            </CardContent>
          </Card>
        )}
        {fornPiorAvaliacao && (
          <Card className="border-warning/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Pior Avaliação</p>
              <p className="text-sm font-bold text-foreground">{fornPiorAvaliacao.name}</p>
              <Badge variant="outline" className="mt-1 text-warning">
                <Star className="w-3 h-3 mr-1" /> {fornPiorAvaliacao.media}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Comparativo entre obras */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo: Estoque vs Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {comparativoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Legend />
                    <Bar dataKey="estoque" name="Estoque" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="consumo" name="Consumo" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por obra - Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Estoque por Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Ranking por Valor em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rankingEstoque.map((o, idx) => (
                <div key={o.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <span className="font-medium text-foreground">{o.name}</span>
                    {o.status === "arquivada" && <Badge variant="outline" className="text-xs">Arquivada</Badge>}
                  </div>
                  <span className="font-mono text-foreground">
                    {o.valorEstoque.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              ))}
              {rankingEstoque.length === 0 && <p className="text-muted-foreground text-sm">Sem dados</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-accent" />
              Ranking por Consumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rankingConsumo.map((o, idx) => (
                <div key={o.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <span className="font-medium text-foreground">{o.name}</span>
                  </div>
                  <span className="font-mono text-foreground">
                    {o.valorConsumo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              ))}
              {rankingConsumo.length === 0 && <p className="text-muted-foreground text-sm">Sem dados</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardGeral;
