import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, ArrowDown, Package, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CascadingLocationSelect } from "@/components/ui/cascading-location-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BaixarEstoque = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, addSaida, getEstoqueByObra, insumos, kits, kitItems, locations, servicePackages, entradas } = useInventory();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"insumo" | "kit">("insumo");
  const [retroativo, setRetroativo] = useState(false);
  const [semLocal, setSemLocal] = useState(false);
  const [semData, setSemData] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formData, setFormData] = useState({
    insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0],
    localAplicacao: "", responsavel: "", locationId: "", servicePackageId: "", lote: "",
  });

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const selectedItem = estoqueObra.find(e => e.insumo_id === formData.insumoId);
  const maxQty = selectedItem?.quantity || 0;

  const obraLocations = useMemo(() =>
    locations.filter(l => l.obra_id === selectedObraId),
    [locations, selectedObraId]
  );
  const obraServices = useMemo(() =>
    servicePackages.filter(s => s.status === "ativo"),
    [servicePackages]
  );

  const selectedInsumo = insumos.find(i => i.id === formData.insumoId);
  const requiresLocation = selectedInsumo?.controla_rastreabilidade;

  const getLocationPath = (locId: string): string => {
    const parts: string[] = [];
    let current = locations.find(l => l.id === locId);
    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? locations.find(l => l.id === current!.parent_id) : undefined;
    }
    return parts.join(" > ");
  };

  const categories = useMemo(() => {
    const cats = new Set(estoqueObra.map(e => e.insumo.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [estoqueObra]);

  const insumoOptions = useMemo(() =>
    estoqueObra
      .filter(e => !categoryFilter || e.insumo.category === categoryFilter)
      .map(e => {
        const ins = insumos.find(i => i.id === e.insumo_id);
        return {
          value: e.insumo_id,
          label: `[${ins?.code}] ${e.insumo.name} — ${e.quantity} ${e.insumo.unit}`,
          searchTerms: `${ins?.code || ""} ${ins?.category || ""} ${e.insumo.name}`,
          subtitle: ins?.category || "",
        };
      }),
    [estoqueObra, insumos, categoryFilter]
  );

  const kitOptions = useMemo(() =>
    kits.map(k => {
      const count = kitItems.filter(ki => ki.kit_id === k.id).length;
      return { value: k.id, label: `${k.name} (${count} insumos)` };
    }),
    [kits, kitItems]
  );

  const serviceOptions = useMemo(() =>
    obraServices.map(s => ({ value: s.id, label: s.name })),
    [obraServices]
  );

  const handleSubmitInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || isSubmitting) return;
    const qty = parseFloat(formData.quantity);
    if (qty > maxQty) { toast.error(`Estoque insuficiente. Disponível: ${maxQty}`); return; }
    if (!formData.insumoId || !qty || !formData.responsavel) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (requiresLocation && !formData.locationId && !(retroativo && semLocal)) { toast.error("Local é obrigatório para este insumo (rastreabilidade)"); return; }

    const retroLabel = retroativo ? " [RETROATIVO]" : "";
    const localAplicacao = (retroativo && semLocal)
      ? "Sem histórico de local" + retroLabel
      : formData.locationId
        ? getLocationPath(formData.locationId) + retroLabel
        : (formData.localAplicacao || "Não especificado") + retroLabel;

    const dateToUse = (retroativo && semData) ? new Date().toISOString().split("T")[0] : formData.date;

    setIsSubmitting(true);
    try {
      await addSaida({
        obraId: selectedObraId, insumoId: formData.insumoId, quantity: qty,
        date: dateToUse, localAplicacao, responsavel: formData.responsavel,
        locationId: (retroativo && semLocal) ? undefined : (formData.locationId || undefined),
        servicePackageId: formData.servicePackageId || undefined,
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

    for (const ki of kitItms) {
      const estoqueItem = estoqueObra.find(e => e.insumo_id === ki.insumo_id);
      const needed = ki.quantity * qty;
      if (!estoqueItem || estoqueItem.quantity < needed) {
        const ins = insumos.find(i => i.id === ki.insumo_id);
        toast.error(`Estoque insuficiente para ${ins?.name}. Necessário: ${needed}, Disponível: ${estoqueItem?.quantity || 0}`);
        return;
      }
    }

    const retroLabel = retroativo ? " [RETROATIVO]" : "";
    const localAplicacao = (retroativo && semLocal)
      ? "Sem histórico de local" + retroLabel
      : formData.locationId
        ? getLocationPath(formData.locationId) + retroLabel
        : (formData.localAplicacao || "Kit") + retroLabel;

    const dateToUse = (retroativo && semData) ? new Date().toISOString().split("T")[0] : formData.date;

    setIsSubmitting(true);
    try {
      for (const ki of kitItms) {
        await addSaida({
          obraId: selectedObraId, insumoId: ki.insumo_id, quantity: ki.quantity * qty,
          date: dateToUse, localAplicacao, responsavel: formData.responsavel,
          locationId: (retroativo && semLocal) ? undefined : (formData.locationId || undefined),
          kitId: formData.kitId,
          servicePackageId: formData.servicePackageId || undefined,
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
    setRetroativo(false); setSemLocal(false); setSemData(false); setCategoryFilter("");
    setFormData({ insumoId: "", kitId: "", quantity: "", date: new Date().toISOString().split("T")[0], localAplicacao: "", responsavel: "", locationId: "", servicePackageId: "" });
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

      {/* Retroativo toggle */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-border bg-card">
        <Checkbox
          id="retroativo"
          checked={retroativo}
          onCheckedChange={(v) => {
            setRetroativo(!!v);
            if (!v) { setSemLocal(false); setSemData(false); }
          }}
        />
        <label htmlFor="retroativo" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <History className="w-4 h-4 text-muted-foreground" />
          Carga Retroativa
        </label>
        <span className="text-xs text-muted-foreground">— Local e data opcionais</span>
      </div>

      {retroativo && (
        <div className="flex gap-6 mb-4 p-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <Checkbox id="semLocal" checked={semLocal} onCheckedChange={(v) => setSemLocal(!!v)} />
            <label htmlFor="semLocal" className="text-sm cursor-pointer">Sem histórico do local</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="semData" checked={semData} onCheckedChange={(v) => setSemData(!!v)} />
            <label htmlFor="semData" className="text-sm cursor-pointer">Sem histórico da data</label>
          </div>
        </div>
      )}

      <form onSubmit={mode === "insumo" ? handleSubmitInsumo : handleSubmitKit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        {mode === "insumo" ? (
          <>
            {categories.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Filtrar por categoria</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant={categoryFilter === "" ? "default" : "outline"} size="sm" className="h-7 text-xs"
                    onClick={() => setCategoryFilter("")}>Todas</Button>
                  {categories.map(cat => (
                    <Button key={cat} type="button" variant={categoryFilter === cat ? "default" : "outline"} size="sm" className="h-7 text-xs"
                      onClick={() => { setCategoryFilter(cat); setFormData(p => ({ ...p, insumoId: "" })); }}>{cat}</Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Insumo</Label>
              <SearchableSelect
                options={insumoOptions}
                value={formData.insumoId}
                onValueChange={v => setFormData(p => ({ ...p, insumoId: v }))}
                placeholder="Buscar por nome, código ou categoria..."
                searchPlaceholder="Ex: arg massa, 01.001, hidráulica..."
                emptyMessage="Nenhum insumo encontrado."
              />
            </div>
            {selectedItem && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Disponível: </span>
                <span className="font-bold text-foreground">{maxQty} {selectedItem.insumo.unit}</span>
                {selectedInsumo?.category && <span className="ml-2 text-xs text-muted-foreground">({selectedInsumo.category})</span>}
                {requiresLocation && <span className="ml-2 text-xs text-warning">⚠ Rastreabilidade obrigatória</span>}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label>Kit</Label>
            <SearchableSelect
              options={kitOptions}
              value={formData.kitId}
              onValueChange={v => setFormData(p => ({ ...p, kitId: v }))}
              placeholder="Selecione o kit"
              searchPlaceholder="Buscar kit..."
              emptyMessage="Nenhum kit encontrado."
            />
          </div>
        )}

        <div className={`grid ${retroativo && semData ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
          <div className="space-y-2">
            <Label>Quantidade{mode === "kit" ? " de kits" : ""}</Label>
            <Input type="number" min="0" max={mode === "insumo" ? maxQty : undefined} step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          {!(retroativo && semData) && (
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
            </div>
          )}
        </div>

        {retroativo && semData && (
          <p className="text-xs text-muted-foreground italic">📅 Data não informada — será registrado com a data de hoje.</p>
        )}

        {/* Location - cascading */}
        {!(retroativo && semLocal) && obraLocations.length > 0 && (
          <div className="space-y-2">
            <Label>Local {requiresLocation && !(retroativo && semLocal) && <span className="text-destructive">*</span>}</Label>
            <CascadingLocationSelect
              locations={obraLocations}
              value={formData.locationId}
              onValueChange={v => setFormData(p => ({ ...p, locationId: v }))}
              required={!!requiresLocation}
            />
          </div>
        )}

        {retroativo && semLocal && (
          <p className="text-xs text-muted-foreground italic">📍 Local não informado — será registrado como "Sem histórico de local".</p>
        )}

        {/* Fallback text location */}
        {!(retroativo && semLocal) && obraLocations.length === 0 && (
          <div className="space-y-2">
            <Label>Local de Aplicação</Label>
            <Input value={formData.localAplicacao} onChange={e => setFormData(p => ({ ...p, localAplicacao: e.target.value }))} placeholder="Ex: Bloco A - 3º andar" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input value={formData.responsavel} onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" />
        </div>

        {obraServices.length > 0 && (
          <div className="space-y-2">
            <Label>Serviço</Label>
            <SearchableSelect
              options={serviceOptions}
              value={formData.servicePackageId}
              onValueChange={v => setFormData(p => ({ ...p, servicePackageId: v }))}
              placeholder="Selecione o serviço"
              searchPlaceholder="Buscar serviço..."
              emptyMessage="Nenhum serviço encontrado."
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : mode === "kit" ? "Baixar Kit" : "Registrar Saída"}
        </Button>
      </form>
    </div>
  );
};

export default BaixarEstoque;
