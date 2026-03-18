import { useState, useMemo, useEffect } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Check, X, Clock, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CascadingLocationSelect } from "@/components/ui/cascading-location-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Requisicao {
  id: string;
  obra_id: string;
  insumo_id: string;
  quantity: number;
  local_aplicacao: string;
  location_id: string | null;
  responsavel: string;
  solicitante_nome: string;
  status: "pendente" | "aprovada" | "rejeitada";
  motivo_rejeicao: string | null;
  date: string;
  approved_by: string | null;
  approved_at: string | null;
  user_id: string;
  created_at: string;
  kit_id: string | null;
}

interface ReqGroup {
  groupKey: string;
  label: string;
  isKit: boolean;
  kitName?: string;
  kitDescription?: string;
  requisicoes: Requisicao[];
}

interface ItemLinha {
  insumoId: string;
  quantity: string;
}

const RequisicaoCanteiro = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, insumos, getEstoqueByObra, locations, addSaida, kits, kitItems } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"nova" | "pendentes" | "historico">("nova");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"insumo" | "kit">("insumo");

  // Multi-item state
  const [items, setItems] = useState<ItemLinha[]>([{ insumoId: "", quantity: "" }]);
  const [formData, setFormData] = useState({
    kitId: "", quantity: "", date: new Date().toISOString().split("T")[0],
    localAplicacao: "", responsavel: "", locationId: "", solicitanteNome: "", servicePackageId: "",
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isAlmox = user?.role === "almoxarifado" || user?.role === "admin";

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const obraLocations = useMemo(() => locations.filter(l => l.obra_id === selectedObraId), [locations, selectedObraId]);
  const obraKits = useMemo(() => kits.filter(k => k.obra_id === selectedObraId), [kits, selectedObraId]);

  const { data: requisicoes = [] } = useQuery({
    queryKey: ["requisicoes", selectedObraId],
    queryFn: async () => {
      if (!selectedObraId) return [];
      const { data, error } = await supabase
        .from("requisicoes")
        .select("*")
        .eq("obra_id", selectedObraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Requisicao[];
    },
    enabled: !!selectedObraId,
  });

  useEffect(() => {
    if (!selectedObraId) return;
    const channel = supabase
      .channel(`requisicoes-${selectedObraId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requisicoes", filter: `obra_id=eq.${selectedObraId}` },
        () => queryClient.invalidateQueries({ queryKey: ["requisicoes", selectedObraId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedObraId, queryClient]);

  // Group pending requisitions by created_at timestamp + responsavel
  const pendingGroups = useMemo(() => {
    const pending = requisicoes.filter(r => r.status === "pendente");
    const groups: Record<string, Requisicao[]> = {};
    pending.forEach(r => {
      const key = r.kit_id
        ? `kit-${r.kit_id}-${r.created_at.substring(0, 19)}-${r.responsavel}`
        : `ind-${r.created_at.substring(0, 19)}-${r.responsavel}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).map(([groupKey, reqs]): ReqGroup => {
      const isKit = !!reqs[0].kit_id;
      const kit = isKit ? kits.find(k => k.id === reqs[0].kit_id) : undefined;
      return {
        groupKey,
        label: isKit ? kit?.name || "Kit" : reqs.length === 1 ? getInsumoName(reqs[0].insumo_id) : `${reqs.length} itens`,
        isKit,
        kitName: kit?.name,
        kitDescription: kit?.description || undefined,
        requisicoes: reqs,
      };
    });
  }, [requisicoes, kits]);

  const historico = requisicoes.filter(r => r.status !== "pendente");

  const getLocationPath = (locId: string): string => {
    const parts: string[] = [];
    let current = locations.find(l => l.id === locId);
    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? locations.find(l => l.id === current!.parent_id) : undefined;
    }
    return parts.join(" > ");
  };

  const getInsumoName = (id: string) => insumos.find(i => i.id === id)?.name || "—";
  const getInsumoUnit = (id: string) => insumos.find(i => i.id === id)?.unit || "";

  // --- Multi-item helpers ---
  const addItemLine = () => setItems(prev => [...prev, { insumoId: "", quantity: "" }]);
  const removeItemLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItemLine = (idx: number, field: keyof ItemLinha, value: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const usedInsumoIds = items.map(it => it.insumoId).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user || isSubmitting) return;

    if (mode === "insumo") {
      const validItems = items.filter(it => it.insumoId && parseFloat(it.quantity) > 0);
      if (validItems.length === 0 || !formData.responsavel) {
        toast.error("Adicione pelo menos um insumo com quantidade e preencha o responsável");
        return;
      }
      setIsSubmitting(true);
      try {
        const localAplicacao = formData.locationId
          ? getLocationPath(formData.locationId)
          : formData.localAplicacao || "Não especificado";
        const now = new Date().toISOString();

        const rows = validItems.map(it => ({
          obra_id: selectedObraId,
          insumo_id: it.insumoId,
          quantity: parseFloat(it.quantity),
          local_aplicacao: localAplicacao,
          location_id: formData.locationId || null,
          responsavel: formData.responsavel,
          solicitante_nome: formData.solicitanteNome || user.name,
          date: formData.date,
          user_id: user.id,
          created_at: now,
        }));
        const { error } = await supabase.from("requisicoes").insert(rows);
        if (error) throw error;
        toast.success(`Requisição enviada com ${validItems.length} ${validItems.length === 1 ? "item" : "itens"}!`);
        resetForm();
        setTab("pendentes");
      } catch {
        toast.error("Erro ao enviar requisição");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!formData.kitId || !formData.responsavel) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
      const kitItms = kitItems.filter(ki => ki.kit_id === formData.kitId);
      if (kitItms.length === 0) { toast.error("Kit sem insumos vinculados"); return; }
      const qty = parseFloat(formData.quantity) || 1;

      const localAplicacao = formData.locationId
        ? getLocationPath(formData.locationId)
        : formData.localAplicacao || "Kit";

      setIsSubmitting(true);
      try {
        const now = new Date().toISOString();
        const rows = kitItms.map(ki => ({
          obra_id: selectedObraId,
          insumo_id: ki.insumo_id,
          quantity: ki.quantity * qty,
          local_aplicacao: localAplicacao,
          location_id: formData.locationId || null,
          responsavel: formData.responsavel,
          solicitante_nome: formData.solicitanteNome || user.name,
          date: formData.date,
          user_id: user.id,
          kit_id: formData.kitId,
          created_at: now,
        }));
        const { error } = await supabase.from("requisicoes").insert(rows);
        if (error) throw error;
        toast.success(`Requisição de kit enviada! ${kitItms.length} itens aguardando aprovação.`);
        resetForm();
        setTab("pendentes");
      } catch {
        toast.error("Erro ao enviar requisição");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setItems([{ insumoId: "", quantity: "" }]);
    setFormData({ kitId: "", quantity: "", date: new Date().toISOString().split("T")[0], localAplicacao: "", responsavel: "", locationId: "", solicitanteNome: "", servicePackageId: "" });
  };

  const handleApproveGroup = async (group: ReqGroup) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      for (const req of group.requisicoes) {
        const estoqueItem = estoqueObra.find(e => e.insumo_id === req.insumo_id);
        if (!estoqueItem || estoqueItem.quantity < req.quantity) {
          toast.error(`Estoque insuficiente de ${getInsumoName(req.insumo_id)}. Disponível: ${estoqueItem?.quantity || 0} ${getInsumoUnit(req.insumo_id)}`);
          setIsSubmitting(false);
          return;
        }
      }
      for (const req of group.requisicoes) {
        await addSaida({
          obraId: req.obra_id, insumoId: req.insumo_id, quantity: req.quantity,
          date: req.date, localAplicacao: req.local_aplicacao, responsavel: req.responsavel,
          locationId: req.location_id || undefined, kitId: req.kit_id || undefined,
        });
        await supabase.from("requisicoes").update({
          status: "aprovada", approved_by: user.id, approved_at: new Date().toISOString(),
        } as any).eq("id", req.id);
      }
      toast.success(`Requisição aprovada! ${group.requisicoes.length} ${group.requisicoes.length === 1 ? "item baixado" : "itens baixados"}.`);
      queryClient.invalidateQueries({ queryKey: ["requisicoes", selectedObraId] });
    } catch {
      toast.error("Erro ao aprovar requisição");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectGroup = async (group: ReqGroup) => {
    if (!user || !rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    setIsSubmitting(true);
    try {
      for (const req of group.requisicoes) {
        await supabase.from("requisicoes").update({
          status: "rejeitada", motivo_rejeicao: rejectReason,
          approved_by: user.id, approved_at: new Date().toISOString(),
        } as any).eq("id", req.id);
      }
      toast.success("Requisição rejeitada.");
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["requisicoes", selectedObraId] });
    } catch {
      toast.error("Erro ao rejeitar requisição");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "aprovada": return <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50"><Check className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case "rejeitada": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><X className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default: return null;
    }
  };

  const pendentesCount = pendingGroups.length;

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-1">Requisição de Canteiro</h2>
      <p className="text-sm text-muted-foreground mb-6">Solicite materiais online — o almoxarifado aprova e a baixa é automática.</p>

      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <Button variant={tab === "nova" ? "default" : "ghost"} size="sm" onClick={() => setTab("nova")}>Nova Requisição</Button>
        <Button variant={tab === "pendentes" ? "default" : "ghost"} size="sm" onClick={() => setTab("pendentes")} className="relative">
          Pendentes
          {pendentesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendentesCount}
            </span>
          )}
        </Button>
        <Button variant={tab === "historico" ? "default" : "ghost"} size="sm" onClick={() => setTab("historico")}>Histórico</Button>
      </div>

      {/* Nova Requisição */}
      {tab === "nova" && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-xl">
          <div className="flex gap-2 mb-2">
            <Button type="button" variant={mode === "insumo" ? "default" : "outline"} size="sm" onClick={() => setMode("insumo")}>
              Insumos
            </Button>
            <Button type="button" variant={mode === "kit" ? "default" : "outline"} size="sm" onClick={() => setMode("kit")}>
              <Package className="w-4 h-4 mr-1" />Kit
            </Button>
          </div>

          {mode === "insumo" ? (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Itens da requisição</Label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Insumo</Label>}
                    <SearchableSelect
                      options={estoqueObra
                        .filter(e => e.insumo && (!usedInsumoIds.includes(e.insumo_id) || e.insumo_id === item.insumoId))
                        .map(e => ({
                          value: e.insumo_id,
                          label: `${e.insumo?.name || "—"} — Disp: ${e.quantity} ${e.insumo?.unit || ""}`,
                          searchTerms: e.insumo?.code || "",
                        }))}
                      value={item.insumoId}
                      onValueChange={v => updateItemLine(idx, "insumoId", v)}
                      placeholder="Selecione o insumo"
                      searchPlaceholder="Buscar..."
                      emptyMessage="Nenhum insumo."
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Qtd</Label>}
                    <Input
                      type="number" min="0" step="any"
                      value={item.quantity}
                      onChange={e => updateItemLine(idx, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItemLine(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItemLine}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Item
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Kit <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={obraKits.map(k => {
                  const kitItms = kitItems.filter(ki => ki.kit_id === k.id);
                  const itemsDesc = kitItms.map(ki => {
                    const ins = insumos.find(i => i.id === ki.insumo_id);
                    return ins ? `${ins.name} x${ki.quantity}` : null;
                  }).filter(Boolean).join(", ");
                  const desc = k.description ? `${k.description} — ` : "";
                  return { value: k.id, label: k.name, searchTerms: `${desc}${itemsDesc}` };
                })}
                value={formData.kitId}
                onValueChange={v => setFormData(p => ({ ...p, kitId: v }))}
                placeholder="Selecione o kit"
                searchPlaceholder="Buscar kit..."
                emptyMessage="Nenhum kit cadastrado para esta obra."
              />
              {formData.kitId && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {(() => {
                    const kit = obraKits.find(k => k.id === formData.kitId);
                    const kitItms = kitItems.filter(ki => ki.kit_id === formData.kitId);
                    if (!kit) return null;
                    return (
                      <>
                        {kit.description && <p className="text-xs text-muted-foreground">{kit.description}</p>}
                        <p className="text-xs font-medium text-foreground">Materiais do kit:</p>
                        {kitItms.map(ki => {
                          const ins = insumos.find(i => i.id === ki.insumo_id);
                          if (!ins) return null;
                          const estItem = estoqueObra.find(e => e.insumo_id === ki.insumo_id);
                          const qty = parseFloat(formData.quantity) || 1;
                          const needed = ki.quantity * qty;
                          const disponivel = estItem?.quantity || 0;
                          const insuficiente = disponivel < needed;
                          return (
                            <div key={ki.id} className={`text-xs flex justify-between ${insuficiente ? "text-destructive" : "text-muted-foreground"}`}>
                              <span>{ins.name} x{needed} {ins.unit}</span>
                              <span>Disp: {disponivel}{insuficiente ? " ⚠️" : ""}</span>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantidade (kits) <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" step="1" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Solicitante</Label>
            <Input value={formData.solicitanteNome} onChange={e => setFormData(p => ({ ...p, solicitanteNome: e.target.value }))} placeholder="Nome do engenheiro / mestre / empreiteiro" />
          </div>

          <div className="space-y-2">
            <Label>Responsável pela retirada <span className="text-destructive">*</span></Label>
            <Input value={formData.responsavel} onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))} placeholder="Quem vai retirar o material" />
          </div>

          {obraLocations.length > 0 ? (
            <div className="space-y-2">
              <Label>Local de Aplicação</Label>
              <CascadingLocationSelect
                locations={obraLocations}
                value={formData.locationId}
                onValueChange={v => setFormData(p => ({ ...p, locationId: v }))}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Local de Aplicação</Label>
              <Input value={formData.localAplicacao} onChange={e => setFormData(p => ({ ...p, localAplicacao: e.target.value }))} placeholder="Ex: Bloco A - 3º andar" />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar Requisição"}
          </Button>
        </form>
      )}

      {/* Pendentes */}
      {tab === "pendentes" && (
        <div className="space-y-4">
          {pendentesCount === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma requisição pendente</p>
            </div>
          )}

          {pendingGroups.map(group => (
            <div key={group.groupKey} className={`bg-card rounded-xl border-2 ${group.isKit ? "border-amber-300" : group.requisicoes.length > 1 ? "border-primary/30" : "border-border"} p-5 space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {group.isKit && <Package className="w-4 h-4 text-amber-600" />}
                    <p className="font-semibold text-foreground">
                      {group.isKit ? group.kitName : group.requisicoes.length === 1 ? getInsumoName(group.requisicoes[0].insumo_id) : `Requisição com ${group.requisicoes.length} itens`}
                    </p>
                  </div>
                  {group.isKit && group.kitDescription && <p className="text-xs text-muted-foreground mt-0.5">{group.kitDescription}</p>}
                </div>
                {group.isKit ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    <Package className="w-3 h-3 mr-1" />Kit
                  </Badge>
                ) : group.requisicoes.length > 1 ? (
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                    {group.requisicoes.length} itens
                  </Badge>
                ) : (
                  statusBadge("pendente")
                )}
              </div>

              {/* Items list for multi-item or kit */}
              {(group.requisicoes.length > 1 || group.isKit) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{group.isKit ? "Itens do kit:" : "Itens solicitados:"}</p>
                  {group.requisicoes.map(req => {
                    const estoqueItem = estoqueObra.find(e => e.insumo_id === req.insumo_id);
                    const disponivel = estoqueItem?.quantity || 0;
                    const insuficiente = disponivel < req.quantity;
                    return (
                      <div key={req.id} className={`text-sm flex justify-between ${insuficiente ? "text-destructive" : "text-foreground"}`}>
                        <span>{getInsumoName(req.insumo_id)} — {req.quantity} {getInsumoUnit(req.insumo_id)}</span>
                        <span className="text-xs">Disp: {disponivel}{insuficiente ? " ⚠️" : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Single item stock info */}
              {group.requisicoes.length === 1 && !group.isKit && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Qtd: <span className="font-mono font-bold">{group.requisicoes[0].quantity} {getInsumoUnit(group.requisicoes[0].insumo_id)}</span>
                  </p>
                  {(() => {
                    const estoqueItem = estoqueObra.find(e => e.insumo_id === group.requisicoes[0].insumo_id);
                    const disponivel = estoqueItem?.quantity || 0;
                    const insuficiente = disponivel < group.requisicoes[0].quantity;
                    return (
                      <div className={`text-sm rounded-lg p-2 ${insuficiente ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"}`}>
                        Estoque disponível: <span className="font-bold">{disponivel} {getInsumoUnit(group.requisicoes[0].insumo_id)}</span>
                        {insuficiente && " — Insuficiente!"}
                      </div>
                    );
                  })()}
                </>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p>📋 Solicitante: <span className="text-foreground">{group.requisicoes[0].solicitante_nome || "—"}</span></p>
                <p>👤 Responsável: <span className="text-foreground">{group.requisicoes[0].responsavel}</span></p>
                <p>📍 Local: <span className="text-foreground">{group.requisicoes[0].local_aplicacao || "—"}</span></p>
                <p>📅 Data: <span className="text-foreground">{new Date(group.requisicoes[0].date).toLocaleDateString("pt-BR")}</span></p>
              </div>

              {isAlmox && (
                <>
                  {rejectingId === group.groupKey ? (
                    <div className="space-y-2">
                      <Textarea placeholder="Motivo da rejeição..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="min-h-[60px]" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleRejectGroup(group)} disabled={isSubmitting}>Confirmar Rejeição</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => handleApproveGroup(group)} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="w-4 h-4 mr-1" /> {group.requisicoes.length > 1 || group.isKit ? "Aprovar Todos" : "Aprovar e Baixar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectingId(group.groupKey)} disabled={isSubmitting}>
                        <X className="w-4 h-4 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {tab === "historico" && (
        <div className="space-y-3">
          {historico.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma requisição no histórico</p>
            </div>
          )}
          {historico.map(req => (
            <div key={req.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {req.kit_id ? `🧰 ${kits.find(k => k.id === req.kit_id)?.name || "Kit"} — ` : ""}
                    {getInsumoName(req.insumo_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Qtd: {req.quantity} {getInsumoUnit(req.insumo_id)} • {new Date(req.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {statusBadge(req.status)}
              </div>
              <div className="text-xs text-muted-foreground">
                Solicitante: {req.solicitante_nome} • Responsável: {req.responsavel}
              </div>
              {req.status === "rejeitada" && req.motivo_rejeicao && (
                <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                  Motivo: {req.motivo_rejeicao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequisicaoCanteiro;