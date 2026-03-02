import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BaixarEstoque = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, addSaida, getEstoqueByObra } = useInventory();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    insumoId: "", quantity: "", date: new Date().toISOString().split("T")[0],
    localAplicacao: "", responsavel: "",
  });

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const selectedItem = estoqueObra.find(e => e.insumo_id === formData.insumoId);
  const maxQty = selectedItem?.quantity || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || isSubmitting) return;
    const qty = parseFloat(formData.quantity);
    if (qty > maxQty) { toast.error(`Estoque insuficiente. Disponível: ${maxQty}`); return; }
    if (!formData.insumoId || !qty || !formData.localAplicacao || !formData.responsavel) { toast.error("Preencha todos os campos"); return; }

    setIsSubmitting(true);
    try {
      await addSaida({ obraId: selectedObraId, insumoId: formData.insumoId, quantity: qty, date: formData.date, localAplicacao: formData.localAplicacao, responsavel: formData.responsavel });
      toast.success("Saída registrada!");
      setDone(true);
    } catch (err) {
      toast.error("Erro ao registrar saída");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <ArrowDown className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Saída Registrada!</h2>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={onBack}>Voltar ao Menu</Button>
          <Button onClick={() => { setDone(false); setFormData({ insumoId: "", quantity: "", date: new Date().toISOString().split("T")[0], localAplicacao: "", responsavel: "" }); }}>Nova Saída</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-6">Baixar Estoque</h2>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Insumo</Label>
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

        {selectedItem && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Disponível: </span>
            <span className="font-bold text-foreground">{maxQty} {selectedItem.insumo.unit}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input type="number" min="0" max={maxQty} step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Local de Aplicação</Label>
          <Input value={formData.localAplicacao} onChange={e => setFormData(p => ({ ...p, localAplicacao: e.target.value }))} placeholder="Ex: Bloco A - 3º andar" />
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input value={formData.responsavel} onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar Saída"}
        </Button>
      </form>
    </div>
  );
};

export default BaixarEstoque;
