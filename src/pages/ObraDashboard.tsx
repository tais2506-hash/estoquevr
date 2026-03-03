import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, ArrowLeftRight, PackageX, ClipboardList, Building2, LogOut, ArrowLeft, Package, Star, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import SubirEstoque from "@/components/operations/SubirEstoque";
import BaixarEstoque from "@/components/operations/BaixarEstoque";
import TransferenciaEstoque from "@/components/operations/TransferenciaEstoque";
import DevolucaoEstoque from "@/components/operations/DevolucaoEstoque";
import InventarioConferencia from "@/components/operations/InventarioConferencia";

type OperationView = "menu" | "subir" | "baixar" | "transferir" | "devolver" | "inventario";

const operations = [
  { key: "subir" as const, label: "Subir Estoque", icon: ArrowUp, description: "Entrada de materiais", color: "text-success" },
  { key: "baixar" as const, label: "Baixar Estoque", icon: ArrowDown, description: "Saída de materiais", color: "text-destructive" },
  { key: "transferir" as const, label: "Transferir entre Obras", icon: ArrowLeftRight, description: "Mover materiais", color: "text-info" },
  { key: "devolver" as const, label: "Devolução ao Fornecedor", icon: PackageX, description: "Devolver materiais", color: "text-warning" },
  { key: "inventario" as const, label: "Inventário / Conferência", icon: ClipboardList, description: "Conferência física", color: "text-primary" },
];

const ObraDashboard = () => {
  const [view, setView] = useState<OperationView>("menu");
  const { getSelectedObra, getEstoqueByObra, selectedObraId, avaliacoes, fornecedores, fvms } = useInventory();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const obra = getSelectedObra();

  if (!obra || !selectedObraId) { navigate("/obras"); return null; }

  const estoqueObra = getEstoqueByObra(selectedObraId);
  const totalValue = estoqueObra.reduce((acc, e) => acc + e.total_value, 0);
  const totalItems = estoqueObra.reduce((acc, e) => acc + e.quantity, 0);

  // Avaliações de fornecedores desta obra
  const obraAvaliacoes = avaliacoes.filter(a => a.obra_id === selectedObraId);
  const obraFvms = fvms.filter(f => f.obra_id === selectedObraId);

  const avgFornecedor = obraAvaliacoes.length > 0
    ? Math.round(obraAvaliacoes.reduce((a, av) => a + (av.pontualidade + av.qualidade + av.atendimento + av.documentacao) / 4, 0) / obraAvaliacoes.length * 10) / 10
    : null;

  const fvmApprovalRate = obraFvms.length > 0
    ? Math.round(obraFvms.filter(f => f.status === "aprovada").length / obraFvms.length * 100)
    : null;

  // Radar data for average criteria
  const radarData = obraAvaliacoes.length > 0 ? [
    { criteria: "Pontualidade", value: Math.round(obraAvaliacoes.reduce((a, av) => a + av.pontualidade, 0) / obraAvaliacoes.length * 10) / 10 },
    { criteria: "Qualidade", value: Math.round(obraAvaliacoes.reduce((a, av) => a + av.qualidade, 0) / obraAvaliacoes.length * 10) / 10 },
    { criteria: "Atendimento", value: Math.round(obraAvaliacoes.reduce((a, av) => a + av.atendimento, 0) / obraAvaliacoes.length * 10) / 10 },
    { criteria: "Documentação", value: Math.round(obraAvaliacoes.reduce((a, av) => a + av.documentacao, 0) / obraAvaliacoes.length * 10) / 10 },
  ] : [];

  // Per-fornecedor bar chart
  const fornecedorScores = [...new Set(obraAvaliacoes.map(a => a.fornecedor_id))].map(fId => {
    const avs = obraAvaliacoes.filter(a => a.fornecedor_id === fId);
    const avg = Math.round(avs.reduce((a, av) => a + (av.pontualidade + av.qualidade + av.atendimento + av.documentacao) / 4, 0) / avs.length * 10) / 10;
    const forn = fornecedores.find(f => f.id === fId);
    return { name: forn?.name?.substring(0, 15) || "N/A", media: avg };
  });

  const renderOperation = () => {
    switch (view) {
      case "subir": return <SubirEstoque onBack={() => setView("menu")} />;
      case "baixar": return <BaixarEstoque onBack={() => setView("menu")} />;
      case "transferir": return <TransferenciaEstoque onBack={() => setView("menu")} />;
      case "devolver": return <DevolucaoEstoque onBack={() => setView("menu")} />;
      case "inventario": return <InventarioConferencia onBack={() => setView("menu")} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/obras")}><ArrowLeft className="w-4 h-4" /></Button>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Building2 className="w-5 h-5 text-primary-foreground" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{obra.name}</h1>
              <p className="text-xs text-muted-foreground">{obra.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="text-center"><p className="text-muted-foreground text-xs">Itens</p><p className="font-bold text-foreground">{totalItems}</p></div>
              <div className="text-center"><p className="text-muted-foreground text-xs">Valor Imobilizado</p><p className="font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { await logout(); navigate("/"); }}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === "menu" ? (
          <div className="animate-fade-in space-y-8">
            {/* Stats for mobile */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              <div className="stat-card"><p className="text-xs text-muted-foreground">Total Itens</p><p className="text-xl font-bold text-foreground">{totalItems}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Valor Imobilizado</p><p className="text-xl font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-5">Operações</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {operations.map((op, idx) => (
                  <button key={op.key} onClick={() => setView(op.key)} className="operation-btn animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                    <op.icon className={`w-10 h-10 ${op.color}`} strokeWidth={1.5} />
                    <span className="font-semibold text-foreground text-sm">{op.label}</span>
                    <span className="text-xs text-muted-foreground">{op.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Avaliações Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-muted-foreground" /> Avaliações
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nota Geral Fornecedores</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Star className="w-6 h-6 text-accent fill-accent" />
                      <span className="text-3xl font-bold text-foreground">{avgFornecedor ?? "—"}</span>
                      <span className="text-sm text-muted-foreground">/ 5</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{obraAvaliacoes.length} avaliação(ões)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">FVM — Taxa de Aprovação</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-foreground">{fvmApprovalRate ?? "—"}</span>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{obraFvms.length} verificação(ões)</p>
                  </CardContent>
                </Card>
              </div>

              {radarData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Desempenho por Critério</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="criteria" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                          <Radar name="Média" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  {fornecedorScores.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Média por Fornecedor</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={fornecedorScores}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Histórico cronológico */}
              {obraAvaliacoes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico de Avaliações</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {[...obraAvaliacoes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(av => {
                        const forn = fornecedores.find(f => f.id === av.fornecedor_id);
                        const avg = Math.round((av.pontualidade + av.qualidade + av.atendimento + av.documentacao) / 4 * 10) / 10;
                        return (
                          <div key={av.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                            <div>
                              <p className="text-sm font-medium text-foreground">{forn?.name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">NF: {av.nota_fiscal} • {new Date(av.date).toLocaleDateString("pt-BR")}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                              <span className="font-semibold text-foreground">{avg}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Estoque */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" /> Estoque Atual
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                        <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Unit.</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoqueObra.map((item) => (
                        <tr key={item.insumo_id} className="border-b border-border/50 last:border-0">
                          <td className="p-3"><p className="font-medium text-foreground">{item.insumo.name}</p><p className="text-xs text-muted-foreground">{item.insumo.category}</p></td>
                          <td className="p-3 text-right font-mono text-foreground">{item.quantity} {item.insumo.unit}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{item.average_unit_cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          <td className="p-3 text-right font-mono font-medium text-foreground">{item.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        </tr>
                      ))}
                      {estoqueObra.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum item no estoque</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : renderOperation()}
      </main>
    </div>
  );
};

export default ObraDashboard;
