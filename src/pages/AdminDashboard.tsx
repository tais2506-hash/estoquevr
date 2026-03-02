import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, ArrowLeft, Package, TrendingUp, Activity, Star, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ObrasCRUD from "@/components/admin/ObrasCRUD";
import InsumosCRUD from "@/components/admin/InsumosCRUD";
import FornecedoresCRUD from "@/components/admin/FornecedoresCRUD";

const AdminDashboard = () => {
  const { obras, estoque, insumos, movimentacoes, fornecedores, entradas, avaliacoes, getEstoqueByObra, loading } = useInventory();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalGeral = estoque.reduce((acc, e) => acc + e.total_value, 0);
  const totalInsumos = new Set(estoque.map(e => e.insumo_id)).size;
  const totalMovs = movimentacoes.length;

  const estoqueByObra = obras.map(o => {
    const items = getEstoqueByObra(o.id);
    return {
      name: o.name.length > 15 ? o.name.substring(0, 15) + "…" : o.name,
      valor: items.reduce((a, e) => a + e.total_value, 0),
    };
  });

  const fornecedorRanking = fornecedores.map(f => {
    const avs = avaliacoes.filter(a => a.fornecedor_id === f.id);
    const avg = avs.length > 0
      ? avs.reduce((a, av) => a + (av.pontualidade + av.qualidade + av.atendimento + av.documentacao) / 4, 0) / avs.length
      : 0;
    return { name: f.name, media: Math.round(avg * 10) / 10, entregas: entradas.filter(e => e.fornecedor_id === f.id).length };
  }).sort((a, b) => b.media - a.media);

  const handleExport = (type: string) => {
    const data = type === "estoque"
      ? estoque.map(e => ({
          obra: obras.find(o => o.id === e.obra_id)?.name,
          insumo: insumos.find(i => i.id === e.insumo_id)?.name,
          quantidade: e.quantity,
          valorUnitario: e.average_unit_cost,
          valorTotal: e.total_value,
        }))
      : movimentacoes.map(m => ({
          obra: obras.find(o => o.id === m.obra_id)?.name,
          insumo: insumos.find(i => i.id === m.insumo_id)?.name,
          tipo: m.type,
          quantidade: m.quantity,
          data: m.date,
          descricao: m.description,
        }));

    if (data.length === 0) return;
    const csv = [Object.keys(data[0]).join(","), ...data.map(r => Object.values(r).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/obras")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Dashboard Administrativo</h1>
              <p className="text-xs text-muted-foreground">Visão consolidada</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await logout(); navigate("/"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="obras">Obras</TabsTrigger>
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Valor Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-info" />
                  <span className="text-xs text-muted-foreground">Insumos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalInsumos}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-warning" />
                  <span className="text-xs text-muted-foreground">Movimentações</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalMovs}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Obras Ativas</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{obras.filter(o => o.status === "ativa").length}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4">Valor em Estoque por Obra</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={estoqueByObra}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4">Ranking de Fornecedores</h3>
                <div className="space-y-3">
                  {fornecedorRanking.length === 0 && <p className="text-muted-foreground text-sm">Nenhum fornecedor cadastrado.</p>}
                  {fornecedorRanking.map((f, idx) => (
                    <div key={f.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{f.entregas} entregas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-accent fill-accent" />
                        <span className="text-sm font-bold text-foreground">{f.media || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Export & Table */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Exportar Dados</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={() => handleExport("estoque")}>
                  <Download className="w-4 h-4 mr-2" /> Estoque
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("movimentacoes")}>
                  <Download className="w-4 h-4 mr-2" /> Movimentações
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-foreground">Últimas Movimentações</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Obra</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.slice(0, 10).map(m => (
                      <tr key={m.id} className="border-b border-border/50 last:border-0">
                        <td className="p-3 text-muted-foreground">{m.date}</td>
                        <td className="p-3 text-foreground">{obras.find(o => o.id === m.obra_id)?.name}</td>
                        <td className="p-3 text-foreground">{insumos.find(i => i.id === m.insumo_id)?.name}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${m.type === "entrada" ? "bg-success/10 text-success" : m.type === "saida" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}>
                            {m.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-foreground">{m.quantity}</td>
                      </tr>
                    ))}
                    {movimentacoes.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma movimentação registrada</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="obras">
            <ObrasCRUD />
          </TabsContent>

          <TabsContent value="insumos">
            <InsumosCRUD />
          </TabsContent>

          <TabsContent value="fornecedores">
            <FornecedoresCRUD />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
