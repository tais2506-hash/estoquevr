import { useMemo, useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const DashboardKits = () => {
  const { obras, kits, kitItems, insumos, estoque, saidas } = useInventory();
  const [selectedObra, setSelectedObra] = useState<string>("");

  const activeObras = useMemo(() => obras.filter(o => o.status === "ativa"), [obras]);

  // Requisitions data
  const { data: requisicoes = [] } = useQuery({
    queryKey: ["requisicoes_all_kits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requisicoes")
        .select("*")
        .not("kit_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredKits = useMemo(() => {
    if (!selectedObra) return kits;
    return kits.filter(k => k.obra_id === selectedObra);
  }, [kits, selectedObra]);

  // Calculate available complete kits per obra
  const kitStockByObra = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    kits.forEach(kit => {
      if (!kit.obra_id) return;
      const items = kitItems.filter(ki => ki.kit_id === kit.id);
      if (items.length === 0) return;

      let minKits = Infinity;
      items.forEach(ki => {
        const est = estoque.find(e => e.obra_id === kit.obra_id && e.insumo_id === ki.insumo_id);
        const available = est ? Math.floor(est.quantity / ki.quantity) : 0;
        minKits = Math.min(minKits, available);
      });

      if (!result[kit.obra_id]) result[kit.obra_id] = {};
      result[kit.obra_id][kit.id] = minKits === Infinity ? 0 : minKits;
    });
    return result;
  }, [kits, kitItems, estoque]);

  // Kit consumption (from saidas with kit_id)
  const kitConsumption = useMemo(() => {
    const result: Record<string, number> = {};
    const filteredSaidas = selectedObra ? saidas.filter(s => s.obra_id === selectedObra) : saidas;
    filteredSaidas.forEach(s => {
      if (s.kit_id) {
        result[s.kit_id] = (result[s.kit_id] || 0) + 1;
      }
    });
    return result;
  }, [saidas, selectedObra]);

  // Kit requisition stats
  const kitReqStats = useMemo(() => {
    const filtered = selectedObra ? requisicoes.filter(r => r.obra_id === selectedObra) : requisicoes;
    const pendentes = filtered.filter(r => r.status === "pendente").length;
    const aprovadas = filtered.filter(r => r.status === "aprovada").length;
    const rejeitadas = filtered.filter(r => r.status === "rejeitada").length;
    return { pendentes, aprovadas, rejeitadas, total: filtered.length };
  }, [requisicoes, selectedObra]);

  // Kits with insufficient stock
  const alertKits = useMemo(() => {
    return filteredKits.filter(kit => {
      if (!kit.obra_id) return false;
      const available = kitStockByObra[kit.obra_id]?.[kit.id] ?? 0;
      return available === 0;
    });
  }, [filteredKits, kitStockByObra]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5" /> Dashboard de Kits
        </h2>
        <Select value={selectedObra} onValueChange={setSelectedObra}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todas as obras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Package className="w-4 h-4" /> Kits Cadastrados
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{filteredKits.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-amber-600 text-xs">
            <Clock className="w-4 h-4" /> Requisições Pendentes
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{kitReqStats.pendentes}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-emerald-600 text-xs">
            <CheckCircle className="w-4 h-4" /> Aprovadas
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{kitReqStats.aprovadas}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-destructive text-xs">
            <AlertTriangle className="w-4 h-4" /> Sem Estoque
          </div>
          <p className="text-2xl font-bold text-destructive mt-1">{alertKits.length}</p>
        </div>
      </div>

      {/* Kit stock table */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Estoque de Kits (completos disponíveis)</h3>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Kit</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Obra</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Composição</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Kits Disponíveis</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Consumo</th>
              </tr>
            </thead>
            <tbody>
              {filteredKits.map(kit => {
                const items = kitItems.filter(ki => ki.kit_id === kit.id);
                const available = kit.obra_id ? (kitStockByObra[kit.obra_id]?.[kit.id] ?? 0) : 0;
                const consumed = kitConsumption[kit.id] || 0;
                const obraName = obras.find(o => o.id === kit.obra_id)?.name || "—";

                return (
                  <tr key={kit.id} className="border-b border-border/50 last:border-0">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{kit.name}</p>
                      {kit.description && <p className="text-xs text-muted-foreground">{kit.description}</p>}
                    </td>
                    <td className="p-3 text-sm text-foreground">{obraName}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {items.map(ki => {
                          const ins = insumos.find(i => i.id === ki.insumo_id);
                          if (!ins) return null;
                          const est = kit.obra_id ? estoque.find(e => e.obra_id === kit.obra_id && e.insumo_id === ki.insumo_id) : null;
                          const disp = est?.quantity || 0;
                          const insuficiente = disp < ki.quantity;
                          return (
                            <span key={ki.id} className={`text-xs px-2 py-0.5 rounded-full ${insuficiente ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>
                              {ins.name} x{ki.quantity} {insuficiente && "⚠️"}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono font-bold ${available === 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {available}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{consumed}</td>
                  </tr>
                );
              })}
              {filteredKits.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum kit encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent kit requisitions */}
      {kitReqStats.total > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Requisições Recentes de Kits</h3>
          <div className="space-y-2">
            {(() => {
              const filtered = selectedObra && selectedObra !== "all"
                ? requisicoes.filter(r => r.obra_id === selectedObra)
                : requisicoes;
              // Group by kit_id + created_at
              const groups: Record<string, typeof filtered> = {};
              filtered.slice(0, 50).forEach(r => {
                const key = `${r.kit_id}-${r.created_at?.toString().substring(0, 19)}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(r);
              });
              return Object.entries(groups).slice(0, 10).map(([key, reqs]) => {
                const kit = kits.find(k => k.id === reqs[0].kit_id);
                const obra = obras.find(o => o.id === reqs[0].obra_id);
                const status = reqs[0].status;
                return (
                  <div key={key} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{kit?.name || "Kit"}</p>
                      <p className="text-xs text-muted-foreground">
                        {obra?.name} • {reqs.length} itens • {new Date(reqs[0].date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      status === "pendente" ? "text-amber-600 border-amber-300 bg-amber-50" :
                      status === "aprovada" ? "text-emerald-600 border-emerald-300 bg-emerald-50" :
                      "text-red-600 border-red-300 bg-red-50"
                    }>
                      {status === "pendente" ? "Pendente" : status === "aprovada" ? "Aprovada" : "Rejeitada"}
                    </Badge>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardKits;
