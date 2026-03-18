import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowUp, FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import ImportarPlanilha from "@/components/operations/ImportarPlanilha";

type Step = "choose" | "manual" | "importar" | "done";

const SubirEstoque = ({ onBack }: { onBack: () => void }) => {
  const { insumos, selectedObraId, addEntrada } = useInventory();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    insumoId: "", notaFiscal: "", quantity: "", unitValue: "", date: new Date().toISOString().split("T")[0],
    validade: "", lote: "", ocItemId: "",
  });

  const totalValue = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitValue) || 0);

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

  // OC item options filtered by selected insumo
  const ocItemOptions = useMemo(() => {
    if (!formData.insumoId) return [];
    return ocItems
      .filter(it => it.insumo_id === formData.insumoId && Number(it.quantity) > Number(it.quantity_delivered))
      .map(it => {
        const oc = ordensCompra.find(o => o.id === it.oc_id);
        const saldo = Number(it.quantity) - Number(it.quantity_delivered);
        return {
          value: it.id,
          label: `${oc?.numero_oc || "OC"} — Saldo: ${saldo.toLocaleString("pt-BR")}`,
        };
      });
  }, [formData.insumoId, ocItems, ordensCompra]);

  const insumoOptions = useMemo(() =>
    insumos.map(i => ({
      value: i.id,
      label: `${i.name} (${i.unit})`,
      searchTerms: i.code,
    })),
    [insumos]
  );

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || isSubmitting) return;
    if (!formData.insumoId || !formData.notaFiscal || !formData.quantity || !formData.unitValue) {
      toast.error("Preencha todos os campos");
      return;
    }
    setIsSubmitting(true);
    try {
      await addEntrada({
        obraId: selectedObraId, insumoId: formData.insumoId, notaFiscal: formData.notaFiscal,
        quantity: parseFloat(formData.quantity), unitValue: parseFloat(formData.unitValue),
        totalValue, date: formData.date,
        validade: formData.validade || undefined,
        lote: formData.lote || undefined,
        ocItemId: formData.ocItemId || undefined,
      });

      // Update OC item delivered quantity
      if (formData.ocItemId) {
        const ocItem = ocItems.find(i => i.id === formData.ocItemId);
        if (ocItem) {
          const newDelivered = Number(ocItem.quantity_delivered) + parseFloat(formData.quantity);
          await supabase.from("oc_items").update({ quantity_delivered: newDelivered }).eq("id", formData.ocItemId);
          queryClient.invalidateQueries({ queryKey: ["oc_items"] });
          queryClient.invalidateQueries({ queryKey: ["ordens_compra"] });
        }
      }

      toast.success("Entrada registrada com sucesso!");
      setStep("done");
    } catch {
      toast.error("Erro ao registrar entrada");
    } finally {
      setIsSubmitting(false);
    }
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
          <Button onClick={() => { setStep("choose"); setFormData({ insumoId: "", notaFiscal: "", quantity: "", unitValue: "", date: new Date().toISOString().split("T")[0], validade: "", lote: "", ocItemId: "" }); }}>
            Nova Entrada
          </Button>
        </div>
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
            <span className="text-xs text-muted-foreground">Cadastrar item a item</span>
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

      <form onSubmit={handleManualSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Insumo</Label>
          <SearchableSelect
            options={insumoOptions}
            value={formData.insumoId}
            onValueChange={v => setFormData(p => ({ ...p, insumoId: v }))}
            placeholder="Selecione o insumo"
            searchPlaceholder="Buscar por nome ou código..."
            emptyMessage="Nenhum insumo encontrado."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nota Fiscal</Label>
            <Input value={formData.notaFiscal} onChange={e => setFormData(p => ({ ...p, notaFiscal: e.target.value }))} placeholder="NF-0000" />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input type="number" min="0" step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Valor Unitário (R$)</Label>
            <Input type="number" min="0" step="0.01" value={formData.unitValue} onChange={e => setFormData(p => ({ ...p, unitValue: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Lote <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input value={formData.lote} onChange={e => setFormData(p => ({ ...p, lote: e.target.value }))} placeholder="Ex: LT-2026-001" />
          </div>
          <div className="space-y-2">
            <Label>Validade <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input type="date" value={formData.validade} onChange={e => setFormData(p => ({ ...p, validade: e.target.value }))} />
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar Entrada"}
        </Button>
      </form>
    </div>
  );
};

export default SubirEstoque;
