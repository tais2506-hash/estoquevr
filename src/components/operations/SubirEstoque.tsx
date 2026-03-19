import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowUp, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import ImportarPlanilha from "@/components/operations/ImportarPlanilha";
import FvmForm from "@/components/operations/FvmForm";

type Step = "choose" | "manual" | "fvm" | "importar" | "done";

interface ItemLinha {
  insumoId: string;
  quantity: string;
  unitValue: string;
  lote: string;
  validade: string;
  ocItemId: string;
  fabricanteId: string;
}

const SubirEstoque = ({ onBack }: { onBack: () => void }) => {
  const { insumos, selectedObraId, addEntrada } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-item state
  const [items, setItems] = useState<ItemLinha[]>([{ insumoId: "", quantity: "", unitValue: "", lote: "", validade: "", ocItemId: "", fabricanteId: "" }]);

  // Shared fields
  const [sharedData, setSharedData] = useState({
    notaFiscal: "", date: new Date().toISOString().split("T")[0],
  });

  // Fetch open OCs for this obra
  const { data: ordensCompra = [] } = useQuery({
    queryKey: ["ordens_compra", selectedObraId],
    queryFn: async () => {
      if (!selectedObraId) return [];
      const { data, error } = await supabase
        .from("ordens_compra").select("*").eq("obra_id", selectedObraId).eq("status", "aberta").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedObraId,
  });

  const { data: ocItems = [] } = useQuery({
    queryKey: ["oc_items", selectedObraId],
    queryFn: async () => {
      const ocIds = ordensCompra.map(oc => oc.id);
      if (ocIds.length === 0) return [];
      const { data, error } = await supabase.from("oc_items").select("*").in("oc_id", ocIds);
      if (error) throw error;
      return data;
    },
    enabled: ordensCompra.length > 0,
  });

  // Fetch fabricantes and insumo_fabricantes links
  const { data: allFabricantes = [] } = useQuery({
    queryKey: ["fabricantes_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fabricantes").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: insumoFabricantes = [] } = useQuery({
    queryKey: ["insumo_fabricantes_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insumo_fabricantes").select("*");
      if (error) throw error;
      return data;
    },
  });

  const insumoOptions = useMemo(() =>
    insumos.map(i => ({
      value: i.id,
      label: `${i.name} (${i.unit})`,
      searchTerms: i.code,
    })),
    [insumos]
  );

  const usedInsumoIds = items.map(it => it.insumoId).filter(Boolean);

  const getFabricanteOptions = (insumoId: string) => {
    if (!insumoId) return [];
    const linkedIds = insumoFabricantes.filter(lnk => lnk.insumo_id === insumoId).map(lnk => lnk.fabricante_id);
    return allFabricantes.filter(f => linkedIds.includes(f.id)).map(f => ({ value: f.id, label: f.name }));
  };

  const insumoNeedsLaudo = (insumoId: string) => {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo && (insumo as any).tipo_laudo && (insumo as any).tipo_laudo !== "nao_controlado";
  };

  const getInsumoOptionsFiltered = (currentInsumoId: string) =>
    insumoOptions.filter(o => !usedInsumoIds.includes(o.value) || o.value === currentInsumoId);

  const getOcItemOptions = (insumoId: string) => {
    if (!insumoId) return [];
    return ocItems
      .filter(it => it.insumo_id === insumoId && Number(it.quantity) > Number(it.quantity_delivered))
      .map(it => {
        const oc = ordensCompra.find(o => o.id === it.oc_id);
        const saldo = Number(it.quantity) - Number(it.quantity_delivered);
        return {
          value: it.id,
          label: `${oc?.numero_oc || "OC"} — Saldo: ${saldo.toLocaleString("pt-BR")}`,
        };
      });
  };

  // Multi-item helpers
  const addItemLine = () => setItems(prev => [...prev, { insumoId: "", quantity: "", unitValue: "", lote: "", validade: "", ocItemId: "", fabricanteId: "" }]);
  const removeItemLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItemLine = (idx: number, field: keyof ItemLinha, value: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const totalGeral = items.reduce((acc, it) => {
    return acc + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitValue) || 0);
  }, 0);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || isSubmitting) return;

    const validItems = items.filter(it => it.insumoId && parseFloat(it.quantity) > 0 && parseFloat(it.unitValue) >= 0);
    if (validItems.length === 0 || !sharedData.notaFiscal) {
      toast.error("Preencha a nota fiscal e adicione pelo menos um insumo com quantidade e valor");
      return;
    }

    // Go to FVM step before final registration
    setStep("fvm");
  };

  const registerEntradas = async (fvmAnswers?: { questionId: string; conforme: boolean; observacao: string }[], observacoesGerais?: string, laudosPorLote?: { insumoId: string; file: File; lote?: string; notaFiscal?: string }[]) => {
    if (!selectedObraId || isSubmitting) return;
    const validItems = items.filter(it => it.insumoId && parseFloat(it.quantity) > 0 && parseFloat(it.unitValue) >= 0);

    setIsSubmitting(true);
    try {
      // Create FVM record if answers provided
      let fvmId: string | undefined;
      if (fvmAnswers && fvmAnswers.length > 0) {
        const hasNC = fvmAnswers.some(a => !a.conforme);
        const { data: fvmData, error: fvmError } = await supabase.from("fvms").insert({
          obra_id: selectedObraId,
          nota_fiscal: sharedData.notaFiscal,
          fornecedor_id: null as any, // optional in new flow
          date: sharedData.date,
          quantidade_conferida: true,
          qualidade_material: !hasNC,
          documentacao_ok: true,
          status: hasNC ? "reprovada" : "aprovada",
          observacoes: observacoesGerais || "",
          user_id: user?.id || "",
        }).select("id").single();
        if (fvmError) throw fvmError;
        fvmId = fvmData.id;

        // Insert answers
        const answerRows = fvmAnswers.map(a => ({
          fvm_id: fvmId!,
          question_id: a.questionId,
          conforme: a.conforme,
          observacao: a.observacao,
        }));
        const { error: ansError } = await supabase.from("fvm_answers").insert(answerRows);
        if (ansError) console.error("Erro ao salvar respostas FVM:", ansError);

        // Create NCs for non-conformities
        const ncAnswers = fvmAnswers.filter(a => !a.conforme);
        if (ncAnswers.length > 0) {
          const ncRows = ncAnswers.map(a => ({
            fvm_id: fvmId!,
            obra_id: selectedObraId,
            description: a.observacao || "Não conformidade detectada na verificação de materiais",
          }));
          const { error: ncError } = await supabase.from("nao_conformidades").insert(ncRows);
          if (ncError) console.error("Erro ao criar NCs:", ncError);
        }
      }

      // Upload per-lote laudos if any
      if (laudosPorLote && laudosPorLote.length > 0) {
        for (const laudoFile of laudosPorLote) {
          const ext = laudoFile.file.name.split(".").pop();
          const path = `${laudoFile.insumoId}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("laudos").upload(path, laudoFile.file);
          if (uploadErr) { console.error("Erro upload laudo:", uploadErr); continue; }
          const { data: urlData } = supabase.storage.from("laudos").getPublicUrl(path);
          await supabase.from("laudos").insert({
            insumo_id: laudoFile.insumoId,
            file_url: urlData.publicUrl,
            file_name: laudoFile.file.name,
            nota_fiscal: laudoFile.notaFiscal || sharedData.notaFiscal,
            lote: laudoFile.lote || null,
            fvm_id: fvmId || null,
            obra_id: selectedObraId,
            created_by: user?.id || "",
          } as any);
        }
      }

      for (const item of validItems) {
        const qty = parseFloat(item.quantity);
        const unitVal = parseFloat(item.unitValue);
        const totalValue = qty * unitVal;

        await addEntrada({
          obraId: selectedObraId, insumoId: item.insumoId, notaFiscal: sharedData.notaFiscal,
          quantity: qty, unitValue: unitVal, totalValue, date: sharedData.date,
          validade: item.validade || undefined,
          lote: item.lote || undefined,
          ocItemId: item.ocItemId || undefined,
          fvmId: fvmId,
        });

        // Update OC item delivered quantity
        if (item.ocItemId) {
          const ocItem = ocItems.find(i => i.id === item.ocItemId);
          if (ocItem) {
            const newDelivered = Number(ocItem.quantity_delivered) + qty;
            await supabase.from("oc_items").update({ quantity_delivered: newDelivered }).eq("id", item.ocItemId);
          }
        }
      }

      if (validItems.some(it => it.ocItemId)) {
        queryClient.invalidateQueries({ queryKey: ["oc_items"] });
        queryClient.invalidateQueries({ queryKey: ["ordens_compra"] });
      }

      const ncCount = fvmAnswers?.filter(a => !a.conforme).length || 0;
      toast.success(`${validItems.length} ${validItems.length === 1 ? "entrada registrada" : "entradas registradas"}${ncCount > 0 ? ` — ${ncCount} NC(s) registrada(s)` : ""}!`);
      setStep("done");
    } catch {
      toast.error("Erro ao registrar entrada");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setItems([{ insumoId: "", quantity: "", unitValue: "", lote: "", validade: "", ocItemId: "", fabricanteId: "" }]);
    setSharedData({ notaFiscal: "", date: new Date().toISOString().split("T")[0] });
  };

  if (step === "done") {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <ArrowUp className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Entrada Registrada!</h2>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={onBack}>Voltar ao Menu</Button>
          <Button onClick={() => { setStep("choose"); resetForm(); }}>
            Nova Entrada
          </Button>
        </div>
      </div>
    );
  }

  if (step === "fvm") {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setStep("manual")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao formulário
        </button>
        <h2 className="text-xl font-bold text-foreground mb-4">Verificação de Materiais</h2>
        <p className="text-sm text-muted-foreground mb-4">NF: <strong>{sharedData.notaFiscal}</strong> — {items.filter(it => it.insumoId).length} item(ns)</p>
        <div className="max-w-xl">
          <FvmForm
            onComplete={(answers, obs, laudos) => registerEntradas(answers, obs, laudos)}
            onSkip={() => registerEntradas()}
            insumoIds={items.filter(it => it.insumoId).map(it => it.insumoId)}
            notaFiscal={sharedData.notaFiscal}
          />
        </div>
        {isSubmitting && <p className="text-sm text-muted-foreground mt-3">Registrando...</p>}
      </div>
    );
  }

  if (step === "importar") {
    return <ImportarPlanilha onBack={() => setStep("choose")} />;
  }

  if (step === "choose") {
    return (
      <div className="animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">Subir Estoque</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => setStep("manual")} className="operation-btn">
            <Plus className="w-10 h-10 text-success" strokeWidth={1.5} />
            <span className="font-semibold text-foreground">Entrada Manual</span>
            <span className="text-xs text-muted-foreground">Cadastrar múltiplos itens</span>
          </button>
          <button onClick={() => setStep("importar")} className="operation-btn">
            <FileSpreadsheet className="w-10 h-10 text-info" strokeWidth={1.5} />
            <span className="font-semibold text-foreground">Importar Planilha</span>
            <span className="text-xs text-muted-foreground">Excel (.xlsx) - GRD Realizado</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => setStep("choose")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <h2 className="text-xl font-bold text-foreground mb-6">Entrada Manual</h2>

      <form onSubmit={handleManualSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-xl">
        {/* Shared fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nota Fiscal <span className="text-destructive">*</span></Label>
            <Input value={sharedData.notaFiscal} onChange={e => setSharedData(p => ({ ...p, notaFiscal: e.target.value }))} placeholder="NF-0000" />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={sharedData.date} onChange={e => setSharedData(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Itens da entrada</Label>
          {items.map((item, idx) => {
            const totalItem = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitValue) || 0);
            const ocOpts = getOcItemOptions(item.insumoId);

            return (
              <div key={idx} className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Insumo</Label>
                    <SearchableSelect
                      options={getInsumoOptionsFiltered(item.insumoId)}
                      value={item.insumoId}
                      onValueChange={v => updateItemLine(idx, "insumoId", v)}
                      placeholder="Selecione o insumo"
                      searchPlaceholder="Buscar por nome ou código..."
                      emptyMessage="Nenhum insumo encontrado."
                    />
                  </div>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItemLine(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantidade</Label>
                    <Input type="number" min="0" step="any" value={item.quantity} onChange={e => updateItemLine(idx, "quantity", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Unit. (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={item.unitValue} onChange={e => updateItemLine(idx, "unitValue", e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/50 text-sm font-medium text-foreground">
                      {totalItem.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Lote <span className="text-xs">(opc.)</span></Label>
                    <Input value={item.lote} onChange={e => updateItemLine(idx, "lote", e.target.value)} placeholder="Ex: LT-2026-001" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Validade <span className="text-xs">(opc.)</span></Label>
                    <Input type="date" value={item.validade} onChange={e => updateItemLine(idx, "validade", e.target.value)} />
                  </div>
                </div>

                {ocOpts.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Vincular à OC <span className="text-xs">(opc.)</span></Label>
                    <SearchableSelect
                      options={ocOpts}
                      value={item.ocItemId}
                      onValueChange={v => updateItemLine(idx, "ocItemId", v)}
                      placeholder="Selecione a OC (opcional)"
                      searchPlaceholder="Buscar OC..."
                      emptyMessage="Nenhuma OC com saldo."
                    />
                  </div>
                )}
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItemLine}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Item
          </Button>
        </div>

        {/* Total geral */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Valor Total ({items.filter(it => it.insumoId).length} {items.filter(it => it.insumoId).length === 1 ? "item" : "itens"})</p>
            <p className="text-lg font-bold text-foreground">{totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : `Registrar ${items.filter(it => it.insumoId && parseFloat(it.quantity) > 0).length > 1 ? items.filter(it => it.insumoId && parseFloat(it.quantity) > 0).length + " Entradas" : "Entrada"}`}
        </Button>
      </form>
    </div>
  );
};

export default SubirEstoque;
