import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, ShoppingCart, ChevronDown, ChevronUp, Package, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

interface OCItemForm {
  insumoId: string;
  quantity: string;
  unitValue: string;
}

const OrdensCompra = ({ onBack }: { onBack: () => void }) => {
  const { insumos, selectedObraId } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [expandedOcId, setExpandedOcId] = useState<string | null>(null);
  const [numeroOc, setNumeroOc] = useState("");
  const [items, setItems] = useState<OCItemForm[]>([{ insumoId: "", quantity: "", unitValue: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: ordensCompra = [], refetch } = useQuery({
    queryKey: ["ordens_compra", selectedObraId],
    queryFn: async () => {
      if (!selectedObraId) return [];
      const { data, error } = await supabase
        .from("ordens_compra")
        .select("*")
        .eq("obra_id", selectedObraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedObraId,
  });

  const { data: ocItems = [] } = useQuery({
    queryKey: ["oc_items", selectedObraId],
    queryFn: async () => {
      if (!selectedObraId) return [];
      const ocIds = ordensCompra.map(oc => oc.id);
      if (ocIds.length === 0) return [];
      const { data, error } = await supabase
        .from("oc_items")
        .select("*")
        .in("oc_id", ocIds);
      if (error) throw error;
      return data;
    },
    enabled: ordensCompra.length > 0,
  });

  const insumoOptions = useMemo(() =>
    insumos.map(i => ({
      value: i.id,
      label: `${i.name} (${i.unit})`,
      searchTerms: i.code,
    })),
    [insumos]
  );

  const addItemLine = () => setItems(prev => [...prev, { insumoId: "", quantity: "", unitValue: "" }]);
  const removeItemLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof OCItemForm, value: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user || isSubmitting) return;
    if (!numeroOc.trim()) { toast.error("Informe o número da OC"); return; }
    const validItems = items.filter(it => it.insumoId && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) { toast.error("Adicione pelo menos um item"); return; }

    setIsSubmitting(true);
    try {
      const { data: oc, error: ocErr } = await supabase
        .from("ordens_compra")
        .insert({ obra_id: selectedObraId, numero_oc: numeroOc.trim(), user_id: user.id })
        .select()
        .single();
      if (ocErr) throw ocErr;

      const rows = validItems.map(it => ({
        oc_id: oc.id,
        insumo_id: it.insumoId,
        quantity: parseFloat(it.quantity),
        unit_value: parseFloat(it.unitValue) || 0,
      }));
      const { error: itemsErr } = await supabase.from("oc_items").insert(rows);
      if (itemsErr) throw itemsErr;

      toast.success("Ordem de Compra criada!");
      setShowForm(false);
      setNumeroOc("");
      setItems([{ insumoId: "", quantity: "", unitValue: "" }]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["oc_items"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar OC");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseOc = async (ocId: string) => {
    try {
      await supabase.from("ordens_compra").update({ status: "fechada" }).eq("id", ocId);
      toast.success("OC fechada");
      refetch();
    } catch { toast.error("Erro ao fechar OC"); }
  };

  const handleReopenOc = async (ocId: string) => {
    try {
      await supabase.from("ordens_compra").update({ status: "aberta" }).eq("id", ocId);
      toast.success("OC reaberta");
      refetch();
    } catch { toast.error("Erro ao reabrir OC"); }
  };

  const getInsumoName = (id: string) => insumos.find(i => i.id === id)?.name || "—";
  const getInsumoUnit = (id: string) => insumos.find(i => i.id === id)?.unit || "";

  const getOcSummary = (ocId: string) => {
    const its = ocItems.filter(i => i.oc_id === ocId);
    const totalQty = its.reduce((s, i) => s + Number(i.quantity), 0);
    const totalDelivered = its.reduce((s, i) => s + Number(i.quantity_delivered), 0);
    const totalValue = its.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_value), 0);
    return { totalQty, totalDelivered, totalValue, count: its.length };
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Ordens de Compra</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova OC
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 mb-6">
          <div className="space-y-2">
            <Label>Número da OC</Label>
            <Input value={numeroOc} onChange={e => setNumeroOc(e.target.value)} placeholder="Ex: OC-2026-001" />
          </div>

          <div className="space-y-3">
            <Label>Itens</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Insumo</p>}
                  <SearchableSelect
                    options={insumoOptions}
                    value={item.insumoId}
                    onValueChange={v => updateItem(idx, "insumoId", v)}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar insumo..."
                    emptyMessage="Nenhum insumo."
                  />
                </div>
                <div className="w-28">
                  {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Qtd</p>}
                  <Input type="number" min="0" step="any" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} placeholder="0" />
                </div>
                <div className="w-32">
                  {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Valor Unit.</p>}
                  <Input type="number" min="0" step="0.01" value={item.unitValue} onChange={e => updateItem(idx, "unitValue", e.target.value)} placeholder="R$ 0,00" />
                </div>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItemLine(idx)} className="shrink-0">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItemLine}>
              <Plus className="w-3 h-3 mr-1" /> Adicionar Item
            </Button>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar OC"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setNumeroOc(""); setItems([{ insumoId: "", quantity: "", unitValue: "" }]); }}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {ordensCompra.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma OC cadastrada</p>
          </div>
        )}
        {ordensCompra.map(oc => {
          const summary = getOcSummary(oc.id);
          const isExpanded = expandedOcId === oc.id;
          const isOpen = oc.status === "aberta";
          const pctDelivered = summary.totalQty > 0 ? (summary.totalDelivered / summary.totalQty) * 100 : 0;

          return (
            <div key={oc.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedOcId(isExpanded ? null : oc.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{oc.numero_oc}</span>
                      <Badge variant={isOpen ? "default" : "secondary"}>
                        {isOpen ? "Aberta" : "Fechada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {summary.count} {summary.count === 1 ? "item" : "itens"} · 
                      Entregue: {pctDelivered.toFixed(0)}%
                      {summary.totalValue > 0 && ` · ${summary.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleCloseOc(oc.id); }}>
                      Fechar OC
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReopenOc(oc.id); }}>
                      Reabrir
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  {/* Progress bar */}
                  <div className="mt-3 mb-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${Math.min(pctDelivered, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.totalDelivered.toLocaleString("pt-BR")} de {summary.totalQty.toLocaleString("pt-BR")} entregues
                    </p>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left py-2">Insumo</th>
                        <th className="text-right py-2">Qtd OC</th>
                        <th className="text-right py-2">Entregue</th>
                        <th className="text-right py-2">Saldo</th>
                        <th className="text-right py-2">Val. Unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocItems.filter(i => i.oc_id === oc.id).map(item => {
                        const saldo = Number(item.quantity) - Number(item.quantity_delivered);
                        return (
                          <tr key={item.id} className="border-b border-border/50">
                            <td className="py-2">
                              <span className="font-medium">{getInsumoName(item.insumo_id)}</span>
                              <span className="text-xs text-muted-foreground ml-1">({getInsumoUnit(item.insumo_id)})</span>
                            </td>
                            <td className="text-right">{Number(item.quantity).toLocaleString("pt-BR")}</td>
                            <td className="text-right text-success">{Number(item.quantity_delivered).toLocaleString("pt-BR")}</td>
                            <td className="text-right font-semibold">
                              <span className={saldo <= 0 ? "text-muted-foreground" : "text-foreground"}>
                                {saldo.toLocaleString("pt-BR")}
                              </span>
                            </td>
                            <td className="text-right">{Number(item.unit_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdensCompra;
