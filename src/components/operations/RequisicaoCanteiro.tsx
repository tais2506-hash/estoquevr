import { useState, useMemo, useEffect } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Check, X, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  service_package_id: string | null;
}

const RequisicaoCanteiro = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, insumos, getEstoqueByObra, locations, addSaida, kits, kitItems, servicePackages, refetchAll } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"nova" | "pendentes" | "historico">("nova");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"insumo" | "kit">("insumo");
  const [formData, setFormData] = useState({
    insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0],
    localAplicacao: "", responsavel: "", locationId: "", solicitanteNome: "", servicePackageId: "",
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isAlmox = user?.role === "almoxarifado" || user?.role === "admin";

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const obraLocations = useMemo(() => locations.filter(l => l.obra_id === selectedObraId), [locations, selectedObraId]);
  const obraServices = useMemo(() => servicePackages.filter(s => s.obra_id === selectedObraId && s.status === "ativo"), [servicePackages, selectedObraId]);

  const { data: requisicoes = [], isLoading } = useQuery({
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

  // Realtime subscription
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

  const pendentes = requisicoes.filter(r => r.status === "pendente");
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
  const getServiceName = (id: string | null) => {
    if (!id) return null;
    const s = servicePackages.find(sp => sp.id === id);
    return s ? (s.eap_code ? `${s.eap_code} - ${s.name}` : s.name) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user || isSubmitting) return;

    if (mode === "insumo") {
      if (!formData.insumoId || !formData.quantity || !formData.responsavel) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
      setIsSubmitting(true);
      try {
        const localAplicacao = formData.locationId
          ? getLocationPath(formData.locationId)
          : formData.localAplicacao || "Não especificado";

        const { error } = await supabase.from("requisicoes").insert({
          obra_id: selectedObraId,
          insumo_id: formData.insumoId,
          quantity: parseFloat(formData.quantity),
          local_aplicacao: localAplicacao,
          location_id: formData.locationId || null,
          responsavel: formData.responsavel,
          solicitante_nome: formData.solicitanteNome || user.name,
          date: formData.date,
          user_id: user.id,
          service_package_id: formData.servicePackageId || null,
        } as any);
        if (error) throw error;
        toast.success("Requisição enviada! Aguardando aprovação do almoxarifado.");
        setFormData({ insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0], localAplicacao: "", responsavel: "", locationId: "", solicitanteNome: "", servicePackageId: "" });
        setTab("pendentes");
      } catch {
        toast.error("Erro ao enviar requisição");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Kit mode - create one requisition per kit item
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
        for (const ki of kitItms) {
          await supabase.from("requisicoes").insert({
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
            service_package_id: formData.servicePackageId || null,
          } as any);
        }
        toast.success(`Requisição de kit enviada! ${kitItms.length} itens aguardando aprovação.`);
        setFormData({ insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0], localAplicacao: "", responsavel: "", locationId: "", solicitanteNome: "", servicePackageId: "" });
        setTab("pendentes");
      } catch {
        toast.error("Erro ao enviar requisição");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleApprove = async (req: Requisicao) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Check stock availability
      const estoqueItem = estoqueObra.find(e => e.insumo_id === req.insumo_id);
      if (!estoqueItem || estoqueItem.quantity < req.quantity) {
        toast.error(`Estoque insuficiente. Disponível: ${estoqueItem?.quantity || 0} ${getInsumoUnit(req.insumo_id)}`);
        setIsSubmitting(false);
        return;
      }

      // Execute stock decrease
      await addSaida({
        obraId: req.obra_id,
        insumoId: req.insumo_id,
        quantity: req.quantity,
        date: req.date,
        localAplicacao: req.local_aplicacao,
        responsavel: req.responsavel,
        locationId: req.location_id || undefined,
        kitId: req.kit_id || undefined,
        servicePackageId: req.service_package_id || undefined,
      });

      // Update requisition status
      await supabase.from("requisicoes").update({
        status: "aprovada",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      } as any).eq("id", req.id);

      toast.success("Requisição aprovada e baixa realizada!");
      queryClient.invalidateQueries({ queryKey: ["requisicoes", selectedObraId] });
    } catch {
      toast.error("Erro ao aprovar requisição");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (reqId: string) => {
    if (!user || !rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from("requisicoes").update({
        status: "rejeitada",
        motivo_rejeicao: rejectReason,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      } as any).eq("id", reqId);
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

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-1">Requisição de Canteiro</h2>
      <p className="text-sm text-muted-foreground mb-6">Solicite materiais online — o almoxarifado aprova e a baixa é automática.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <Button variant={tab === "nova" ? "default" : "ghost"} size="sm" onClick={() => setTab("nova")}>
          Nova Requisição
        </Button>
        <Button variant={tab === "pendentes" ? "default" : "ghost"} size="sm" onClick={() => setTab("pendentes")} className="relative">
          Pendentes
          {pendentes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendentes.length}
            </span>
          )}
        </Button>
        <Button variant={tab === "historico" ? "default" : "ghost"} size="sm" onClick={() => setTab("historico")}>
          Histórico
        </Button>
      </div>

      {/* Nova Requisição */}
      {tab === "nova" && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
          <div className="flex gap-2 mb-2">
            <Button type="button" variant={mode === "insumo" ? "default" : "outline"} size="sm" onClick={() => setMode("insumo")}>
              Insumo Individual
            </Button>
            {kits.length > 0 && (
              <Button type="button" variant={mode === "kit" ? "default" : "outline"} size="sm" onClick={() => setMode("kit")}>
                <Package className="w-4 h-4 mr-1" />Kit
              </Button>
            )}
          </div>

          {mode === "insumo" ? (
            <div className="space-y-2">
              <Label>Insumo <span className="text-destructive">*</span></Label>
              <Select value={formData.insumoId} onValueChange={v => setFormData(p => ({ ...p, insumoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
                <SelectContent>
                  {estoqueObra.map(e => (
                    <SelectItem key={e.insumo_id} value={e.insumo_id}>
                      {e.insumo.name} — Disp: {e.quantity} {e.insumo.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Kit <span className="text-destructive">*</span></Label>
              <Select value={formData.kitId} onValueChange={v => setFormData(p => ({ ...p, kitId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o kit" /></SelectTrigger>
                <SelectContent>
                  {kits.map(k => {
                    const count = kitItems.filter(ki => ki.kit_id === k.id).length;
                    return <SelectItem key={k.id} value={k.id}>{k.name} ({count} insumos)</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
            </div>
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
              <Select value={formData.locationId} onValueChange={v => setFormData(p => ({ ...p, locationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                <SelectContent>
                  {obraLocations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{getLocationPath(l.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {pendentes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma requisição pendente</p>
            </div>
          )}
          {pendentes.map(req => (
            <div key={req.id} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{getInsumoName(req.insumo_id)}</p>
                  <p className="text-sm text-muted-foreground">
                    Qtd: <span className="font-mono font-bold">{req.quantity} {getInsumoUnit(req.insumo_id)}</span>
                  </p>
                </div>
                {statusBadge(req.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p>📋 Solicitante: <span className="text-foreground">{req.solicitante_nome || "—"}</span></p>
                <p>👤 Responsável: <span className="text-foreground">{req.responsavel}</span></p>
                <p>📍 Local: <span className="text-foreground">{req.local_aplicacao || "—"}</span></p>
                <p>📅 Data: <span className="text-foreground">{new Date(req.date).toLocaleDateString("pt-BR")}</span></p>
              </div>

              {/* Estoque check */}
              {(() => {
                const estoqueItem = estoqueObra.find(e => e.insumo_id === req.insumo_id);
                const disponivel = estoqueItem?.quantity || 0;
                const insuficiente = disponivel < req.quantity;
                return (
                  <div className={`text-sm rounded-lg p-2 ${insuficiente ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"}`}>
                    Estoque disponível: <span className="font-bold">{disponivel} {getInsumoUnit(req.insumo_id)}</span>
                    {insuficiente && " — Insuficiente!"}
                  </div>
                );
              })()}

              {isAlmox && (
                <>
                  {rejectingId === req.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Motivo da rejeição..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} disabled={isSubmitting}>
                          Confirmar Rejeição
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => handleApprove(req)} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="w-4 h-4 mr-1" /> Aprovar e Baixar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectingId(req.id)} disabled={isSubmitting}>
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
                  <p className="font-semibold text-foreground text-sm">{getInsumoName(req.insumo_id)}</p>
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
