import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, ArrowDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BaixarEstoque = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, addSaida, getEstoqueByObra, insumos, kits, kitItems, servicePackages, locations } = useInventory();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"insumo" | "kit">("insumo");
  const [formData, setFormData] = useState({
    insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0],
    localAplicacao: "", responsavel: "", servicePackageId: "", locationId: "", quantidadeExecutada: "",
  });

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const selectedItem = estoqueObra.find(e => e.insumo_id === formData.insumoId);
  const maxQty = selectedItem?.quantity || 0;

  const obraServicePackages = useMemo(() =>
    servicePackages.filter(sp => sp.obra_id === selectedObraId && sp.status === "ativo"),
    [servicePackages, selectedObraId]
  );

  const obraLocations = useMemo(() =>
    locations.filter(l => l.obra_id === selectedObraId),
    [locations, selectedObraId]
  );

  const selectedInsumo = insumos.find(i => i.id === formData.insumoId);
  const requiresLocation = selectedInsumo?.controla_rastreabilidade;
  const requiresService = selectedInsumo?.exige_servico_baixa;

  const getLocationPath = (locId: string): string => {
    const parts: string[] = [];
    let current = locations.find(l => l.id === locId);
    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? locations.find(l => l.id === current!.parent_id) : undefined;
    }
    return parts.join(" > ");
  };

  const handleSubmitInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || isSubmitting) return;
    const qty = parseFloat(formData.quantity);
    if (qty > maxQty) { toast.error(`Estoque insuficiente. Disponível: ${maxQty}`); return; }
    if (!formData.insumoId || !qty || !formData.responsavel) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (requiresLocation && !formData.locationId) { toast.error("Local é obrigatório para este insumo (rastreabilidade)"); return; }
    if (requiresService && !formData.servicePackageId) { toast.error("Pacote de serviço é obrigatório para este insumo"); return; }

    const localAplicacao = formData.locationId
      ? getLocationPath(formData.locationId)
      : formData.localAplicacao || "Não especificado";

    setIsSubmitting(true);
    try {
      await addSaida({
        obraId: selectedObraId, insumoId: formData.insumoId, quantity: qty,
        date: formData.date, localAplicacao, responsavel: formData.responsavel,
        servicePackageId: formData.servicePackageId || undefined,
        locationId: formData.locationId || undefined,
        quantidadeExecutada: formData.quantidadeExecutada ? parseFloat(formData.quantidadeExecutada) : undefined,
      });
      toast.success("Saída registrada!");
      setDone(true);
    } catch {
      toast.error("Erro ao registrar saída");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || isSubmitting || !formData.kitId) return;
    const qty = parseFloat(formData.quantity) || 1;

    const kitItms = kitItems.filter(ki => ki.kit_id === formData.kitId);
    if (kitItms.length === 0) { toast.error("Kit sem insumos vinculados"); return; }

    // Check stock for all items
    for (const ki of kitItms) {
      const estoqueItem = estoqueObra.find(e => e.insumo_id === ki.insumo_id);
      const needed = ki.quantity * qty;
      if (!estoqueItem || estoqueItem.quantity < needed) {
        const ins = insumos.find(i => i.id === ki.insumo_id);
        toast.error(`Estoque insuficiente para ${ins?.name}. Necessário: ${needed}, Disponível: ${estoqueItem?.quantity || 0}`);
        return;
      }
    }

    const localAplicacao = formData.locationId
      ? getLocationPath(formData.locationId)
      : formData.localAplicacao || "Kit";

    setIsSubmitting(true);
    try {
      for (const ki of kitItms) {
        await addSaida({
          obraId: selectedObraId, insumoId: ki.insumo_id, quantity: ki.quantity * qty,
          date: formData.date, localAplicacao, responsavel: formData.responsavel,
          servicePackageId: formData.servicePackageId || undefined,
          locationId: formData.locationId || undefined,
          quantidadeExecutada: formData.quantidadeExecutada ? parseFloat(formData.quantidadeExecutada) : undefined,
          kitId: formData.kitId,
        });
      }
      toast.success(`Kit baixado! ${kitItms.length} insumos consumidos.`);
      setDone(true);
    } catch {
      toast.error("Erro ao registrar baixa do kit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setDone(false);
    setFormData({ insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0], localAplicacao: "", responsavel: "", servicePackageId: "", locationId: "", quantidadeExecutada: "" });
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
          <Button onClick={resetAll}>Nova Saída</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-4">Baixar Estoque</h2>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <Button variant={mode === "insumo" ? "default" : "outline"} size="sm" onClick={() => setMode("insumo")}>
          Insumo Individual
        </Button>
        {kits.length > 0 && (
          <Button variant={mode === "kit" ? "default" : "outline"} size="sm" onClick={() => setMode("kit")}>
            <Package className="w-4 h-4 mr-1" />Kit
          </Button>
        )}
      </div>

      <form onSubmit={mode === "insumo" ? handleSubmitInsumo : handleSubmitKit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        {mode === "insumo" ? (
          <>
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
                {requiresLocation && <span className="ml-2 text-xs text-warning">⚠ Rastreabilidade obrigatória</span>}
                {requiresService && <span className="ml-2 text-xs text-info">📋 Serviço obrigatório</span>}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label>Kit</Label>
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
            <Label>Quantidade{mode === "kit" ? " de kits" : ""}</Label>
            <Input type="number" min="0" max={mode === "insumo" ? maxQty : undefined} step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        {/* Service Package */}
        {obraServicePackages.length > 0 && (
          <div className="space-y-2">
            <Label>Pacote de Serviço (EAP) {requiresService && <span className="text-destructive">*</span>}</Label>
            <Select value={formData.servicePackageId} onValueChange={v => setFormData(p => ({ ...p, servicePackageId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
              <SelectContent>
                {obraServicePackages.map(sp => (
                  <SelectItem key={sp.id} value={sp.id}>{sp.eap_code ? `[${sp.eap_code}] ` : ""}{sp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Location */}
        {obraLocations.length > 0 && (
          <div className="space-y-2">
            <Label>Local {requiresLocation && <span className="text-destructive">*</span>}</Label>
            <Select value={formData.locationId} onValueChange={v => setFormData(p => ({ ...p, locationId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
              <SelectContent>
                {obraLocations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{getLocationPath(l.id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fallback text location */}
        {obraLocations.length === 0 && (
          <div className="space-y-2">
            <Label>Local de Aplicação</Label>
            <Input value={formData.localAplicacao} onChange={e => setFormData(p => ({ ...p, localAplicacao: e.target.value }))} placeholder="Ex: Bloco A - 3º andar" />
          </div>
        )}

        {/* Quantidade Executada */}
        {formData.servicePackageId && (
          <div className="space-y-2">
            <Label>Quantidade Executada do Serviço</Label>
            <Input type="number" min="0" step="any" value={formData.quantidadeExecutada} onChange={e => setFormData(p => ({ ...p, quantidadeExecutada: e.target.value }))} placeholder="Ex: 50 m²" />
            {formData.quantidadeExecutada && formData.quantity && (
              <p className="text-xs text-muted-foreground">
                Índice de consumo: <span className="font-bold text-foreground">
                  {(parseFloat(formData.quantity) / parseFloat(formData.quantidadeExecutada)).toFixed(4)}
                </span> {selectedItem?.insumo?.unit || "un"}/{obraServicePackages.find(sp => sp.id === formData.servicePackageId)?.unit || "un"}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input value={formData.responsavel} onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : mode === "kit" ? "Baixar Kit" : "Registrar Saída"}
        </Button>
      </form>
    </div>
  );
};

export default BaixarEstoque;