import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TransferenciaEstoque = ({ onBack }: { onBack: () => void }) => {
  const { obras, selectedObraId, getEstoqueByObra, addTransferencia } = useInventory();
  const [done, setDone] = useState(false);
  const [formData, setFormData] = useState({
    obraDestinoId: "", insumoId: "", quantity: "", date: new Date().toISOString().split("T")[0],
  });

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const selectedItem = estoqueObra.find(e => e.insumoId === formData.insumoId);
  const maxQty = selectedItem?.quantity || 0;
  const outrasObras = obras.filter(o => o.id !== selectedObraId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId) return;
    const qty = parseFloat(formData.quantity);
    if (qty > maxQty) { toast.error("Estoque insuficiente"); return; }
    if (!formData.obraDestinoId || !formData.insumoId || !qty) { toast.error("Preencha todos os campos"); return; }

    addTransferencia({ obraOrigemId: selectedObraId, obraDestinoId: formData.obraDestinoId, insumoId: formData.insumoId, quantity: qty, date: formData.date });
    toast.success("Transferência realizada!");
    setDone(true);
  };

  if (done) {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-info/10 flex items-center justify-center mx-auto mb-4">
          <ArrowLeftRight className="w-8 h-8 text-info" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Transferência Realizada!</h2>
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
      <h2 className="text-xl font-bold text-foreground mb-6">Transferência entre Obras</h2>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Obra Destino</Label>
          <Select value={formData.obraDestinoId} onValueChange={v => setFormData(p => ({ ...p, obraDestinoId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione a obra destino" /></SelectTrigger>
            <SelectContent>
              {outrasObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Insumo</Label>
          <Select value={formData.insumoId} onValueChange={v => setFormData(p => ({ ...p, insumoId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
            <SelectContent>
              {estoqueObra.map(e => (
                <SelectItem key={e.insumoId} value={e.insumoId}>
                  {e.insumo.name} — Disp: {e.quantity} {e.insumo.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        <Button type="submit" className="w-full">Transferir</Button>
      </form>
    </div>
  );
};

export default TransferenciaEstoque;
