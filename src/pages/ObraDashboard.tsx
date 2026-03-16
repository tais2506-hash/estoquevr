import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, ArrowLeftRight, ClipboardList, Building2, LogOut, ArrowLeft, Package, FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubirEstoque from "@/components/operations/SubirEstoque";
import BaixarEstoque from "@/components/operations/BaixarEstoque";
import TransferenciaEstoque from "@/components/operations/TransferenciaEstoque";
import InventarioConferencia from "@/components/operations/InventarioConferencia";
import RequisicaoCanteiro from "@/components/operations/RequisicaoCanteiro";

type OperationView = "menu" | "subir" | "baixar" | "transferir" | "inventario" | "requisicao";

const operations = [
  { key: "subir" as const, label: "Subir Estoque", icon: ArrowUp, description: "Entrada de materiais", color: "text-success" },
  { key: "baixar" as const, label: "Baixar Estoque", icon: ArrowDown, description: "Saída de materiais", color: "text-destructive" },
  { key: "requisicao" as const, label: "Requisição de Canteiro", icon: FileText, description: "Solicitar materiais online", color: "text-amber-500" },
  { key: "transferir" as const, label: "Transferir entre Obras", icon: ArrowLeftRight, description: "Mover materiais", color: "text-info" },
  { key: "inventario" as const, label: "Inventário / Conferência", icon: ClipboardList, description: "Conferência física", color: "text-primary" },
];

const MOV_TYPE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  entrada: { label: "Entrada", variant: "default" },
  saida: { label: "Saída", variant: "destructive" },
  transferencia_entrada: { label: "Transf. Entrada", variant: "default" },
  transferencia_saida: { label: "Transf. Saída", variant: "destructive" },
  devolucao: { label: "Devolução", variant: "secondary" },
  ajuste_inventario: { label: "Ajuste Inventário", variant: "outline" },
};

const ObraDashboard = () => {
  const [view, setView] = useState<OperationView>("menu");
  const [movsLimit, setMovsLimit] = useState(20);
  const { getSelectedObra, getEstoqueByObra, selectedObraId, movimentacoes, insumos } = useInventory();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const obra = getSelectedObra();

  const movsObra = useMemo(() => {
    if (!selectedObraId) return [];
    return movimentacoes
      .filter(m => m.obra_id === selectedObraId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }, [movimentacoes, selectedObraId]);

  if (!obra || !selectedObraId) { navigate("/obras"); return null; }

  const estoqueObra = getEstoqueByObra(selectedObraId);
  const totalValue = estoqueObra.reduce((acc, e) => acc + e.total_value, 0);
  const totalItems = estoqueObra.reduce((acc, e) => acc + e.quantity, 0);

  const getInsumoName = (id: string) => insumos.find(i => i.id === id)?.name || "—";
  const getInsumoUnit = (id: string) => insumos.find(i => i.id === id)?.unit || "";

  const renderOperation = () => {
    switch (view) {
      case "subir": return <SubirEstoque onBack={() => setView("menu")} />;
      case "baixar": return <BaixarEstoque onBack={() => setView("menu")} />;
      case "transferir": return <TransferenciaEstoque onBack={() => setView("menu")} />;
      case "inventario": return <InventarioConferencia onBack={() => setView("menu")} />;
      case "requisicao": return <RequisicaoCanteiro onBack={() => setView("menu")} />;
      default: return null;
    }
  };

  const movsToShow = movsObra.slice(0, movsLimit);

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
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              <div className="stat-card"><p className="text-xs text-muted-foreground">Total Itens</p><p className="text-xl font-bold text-foreground">{totalItems}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Valor Imobilizado</p><p className="text-xl font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-5">Operações</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {operations.map((op, idx) => (
                  <button key={op.key} onClick={() => setView(op.key)} className="operation-btn animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                    <op.icon className={`w-10 h-10 ${op.color}`} strokeWidth={1.5} />
                    <span className="font-semibold text-foreground text-sm">{op.label}</span>
                    <span className="text-xs text-muted-foreground">{op.description}</span>
                  </button>
                ))}
              </div>
            </div>

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

            {/* Histórico de Movimentações */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" /> Histórico de Movimentações
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movsToShow.map((mov) => {
                        const info = MOV_TYPE_MAP[mov.type] || { label: mov.type, variant: "secondary" as const };
                        return (
                          <tr key={mov.id} className="border-b border-border/50 last:border-0">
                            <td className="p-3 text-foreground whitespace-nowrap">{mov.date}</td>
                            <td className="p-3"><Badge variant={info.variant}>{info.label}</Badge></td>
                            <td className="p-3">
                              <p className="font-medium text-foreground">{getInsumoName(mov.insumo_id)}</p>
                            </td>
                            <td className="p-3 text-right font-mono text-foreground">
                              {mov.type === "saida" || mov.type === "transferencia_saida" || mov.type === "devolucao"
                                ? `-${mov.quantity}`
                                : `+${mov.quantity}`
                              } {getInsumoUnit(mov.insumo_id)}
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell text-xs max-w-xs truncate">{mov.description || "—"}</td>
                          </tr>
                        );
                      })}
                      {movsObra.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma movimentação registrada</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {movsObra.length > movsLimit && (
                  <div className="p-3 border-t border-border text-center">
                    <Button variant="ghost" size="sm" onClick={() => setMovsLimit(prev => prev + 30)}>
                      Carregar mais ({movsObra.length - movsLimit} restantes)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : renderOperation()}
      </main>
    </div>
  );
};

export default ObraDashboard;
