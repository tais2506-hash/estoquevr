import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const InventarioConferencia = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, getEstoqueByObra, addInventarioItem } = useInventory();
  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];

  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setQtd = (insumoId: string, val: string) => setQuantidades(p => ({ ...p, [insumoId]: val }));
  const setJust = (insumoId: string, val: string) => setJustificativas(p => ({ ...p, [insumoId]: val }));

  const getDiferenca = (insumoId: string, qtdSistema: number) => {
    const fisica = parseFloat(quantidades[insumoId] || "");
    if (isNaN(fisica)) return null;
    return fisica - qtdSistema;
  };

  const handleSubmit = async () => {
    if (!selectedObraId || isSubmitting) return;
    let hasError = false;

    // Validate first
    for (const item of estoqueObra) {
      const fisica = parseFloat(quantidades[item.insumo_id] || "");
      if (isNaN(fisica)) continue;
      const diferenca = fisica - item.quantity;
      if (diferenca !== 0 && !justificativas[item.insumo_id]?.trim()) {
        hasError = true;
        break;
      }
    }

    if (hasError) {
      toast.error("Preencha a justificativa para itens com divergência");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const item of estoqueObra) {
        const fisica = parseFloat(quantidades[item.insumo_id] || "");
        if (isNaN(fisica)) continue;
        const diferenca = fisica - item.quantity;
        await addInventarioItem({
          obraId: selectedObraId, insumoId: item.insumo_id,
          quantidadeSistema: item.quantity, quantidadeFisica: fisica,
          diferenca, justificativa: justificativas[item.insumo_id] || "Sem divergência",
          date: new Date().toISOString().split("T")[0],
        });
      }
      toast.success("Inventário registrado com sucesso!");
      setDone(true);
    } catch (err) {
      toast.error("Erro ao registrar inventário");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Inventário Concluído!</h2>
        <p className="text-muted-foreground mb-6">Ajustes foram aplicados ao estoque.</p>
        <Button variant="outline" onClick={onBack}>Voltar ao Menu</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-2">Inventário / Conferência Física</h2>
      <p className="text-sm text-muted-foreground mb-6">Insira a quantidade encontrada para cada insumo.</p>

      <div className="space-y-4">
        {estoqueObra.map(item => {
          const dif = getDiferenca(item.insumo_id, item.quantity);
          const hasDiff = dif !== null && dif !== 0;

          return (
            <div key={item.insumo_id} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{item.insumo.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.insumo.category} · {item.insumo.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sistema</p>
                  <p className="font-bold text-foreground font-mono">{item.quantity}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Qtd Física</Label>
                  <Input
                    type="number" min="0" step="any"
                    value={quantidades[item.insumo_id] || ""}
                    onChange={e => setQtd(item.insumo_id, e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Diferença</Label>
                  <div className={`h-9 flex items-center px-3 rounded-md border border-border font-mono text-sm ${
                    dif === null ? "text-muted-foreground" : dif > 0 ? "text-success bg-success/5" : dif < 0 ? "text-destructive bg-destructive/5" : "text-foreground"
                  }`}>
                    {dif === null ? "—" : dif > 0 ? `+${dif}` : dif}
                  </div>
                </div>
              </div>

              {hasDiff && (
                <div className="space-y-1">
                  <Label className="text-xs">Justificativa (obrigatória)</Label>
                  <Textarea
                    value={justificativas[item.insumo_id] || ""}
                    onChange={e => setJust(item.insumo_id, e.target.value)}
                    placeholder="Explique a divergência..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isSubmitting}>
          <ClipboardList className="w-4 h-4 mr-2" />
          {isSubmitting ? "Registrando..." : "Concluir Inventário"}
        </Button>
      </div>
    </div>
  );
};

export default InventarioConferencia;
