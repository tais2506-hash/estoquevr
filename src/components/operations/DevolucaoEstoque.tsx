import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const DevolucaoEstoque = ({ onBack }: { onBack: () => void }) => {
  const { entradas, insumos, fornecedores, selectedObraId, addDevolucao } = useInventory();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ entradaId: "", quantity: "", motivo: "", date: new Date().toISOString().split("T")[0] });

  const entradasObra = entradas.filter(e => e.obra_id === selectedObraId);
  const selectedEntrada = entradasObra.find(e => e.id === formData.entradaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !selectedEntrada || isSubmitting) return;
    const qty = parseFloat(formData.quantity);
    if (!qty || !formData.motivo) { toast.error("Preencha todos os campos"); return; }

    setIsSubmitting(true);
    try {
      await addDevolucao({
        obraId: selectedObraId, entradaId: selectedEntrada.id, insumoId: selectedEntrada.insumo_id,
        fornecedorId: selectedEntrada.fornecedor_id, quantity: qty, motivo: formData.motivo, date: formData.date,
      });
      toast.success("Devolução registrada!");
      setDone(true);
    } catch (err) {
      toast.error("Erro ao registrar devolução");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <PackageX className="w-8 h-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Devolução Registrada!</h2>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={onBack}>Voltar ao Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-6">Devolução ao Fornecedor</h2>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Entrada Vinculada</Label>
          <Select value={formData.entradaId} onValueChange={v => setFormData(p => ({ ...p, entradaId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione a entrada" /></SelectTrigger>
            <SelectContent>
              {entradasObra.map(e => {
                const insumo = insumos.find(i => i.id === e.insumo_id);
                const forn = fornecedores.find(f => f.id === e.fornecedor_id);
                return (
                  <SelectItem key={e.id} value={e.id}>
                    {insumo?.name} — NF: {e.nota_fiscal} — {forn?.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input type="number" min="0" step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Motivo da Devolução</Label>
          <Textarea value={formData.motivo} onChange={e => setFormData(p => ({ ...p, motivo: e.target.value }))} placeholder="Descreva o motivo..." rows={3} />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar Devolução"}
        </Button>
      </form>
    </div>
  );
};

export default DevolucaoEstoque;
