import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Wand2, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Obra {
  id: string;
  name: string;
  status: string;
}

interface LevelConfig {
  enabled: boolean;
  prefix: string;
  items: string; // comma-separated or range like "1-10"
}

const parseLevelItems = (input: string): string[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Check if range like "1-10" or "01-20"
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    const padLen = rangeMatch[1].length;
    if (start <= end && end - start < 500) {
      const items: string[] = [];
      for (let i = start; i <= end; i++) {
        items.push(String(i).padStart(padLen, "0"));
      }
      return items;
    }
  }

  // Comma-separated: "A, B, C" or "Torre 1, Torre 2"
  return trimmed.split(",").map(s => s.trim()).filter(Boolean);
};

interface BulkLocationGeneratorProps {
  obras: Obra[];
}

const BulkLocationGenerator = ({ obras }: BulkLocationGeneratorProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [obraId, setObraId] = useState("");
  const [preview, setPreview] = useState<string[] | null>(null);

  const [torre, setTorre] = useState<LevelConfig>({ enabled: true, prefix: "Torre ", items: "A, B, C" });
  const [pavimento, setPavimento] = useState<LevelConfig>({ enabled: true, prefix: "", items: "01-10" });
  const [unidade, setUnidade] = useState<LevelConfig>({ enabled: true, prefix: "", items: "01-04" });
  const [ambiente, setAmbiente] = useState<LevelConfig>({ enabled: false, prefix: "", items: "Sala, Cozinha, Banheiro" });

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const buildTree = (): { name: string; type: string; parentPath: string[] }[] => {
    const result: { name: string; type: string; parentPath: string[] }[] = [];

    const torreItems = torre.enabled ? parseLevelItems(torre.items) : [];
    const pavItems = pavimento.enabled ? parseLevelItems(pavimento.items) : [];
    const uniItems = unidade.enabled ? parseLevelItems(unidade.items) : [];
    const ambItems = ambiente.enabled ? parseLevelItems(ambiente.items) : [];

    if (torreItems.length === 0 && pavItems.length === 0 && uniItems.length === 0 && ambItems.length === 0) return result;

    // If no torres, start from next available level
    const torresOrRoot = torreItems.length > 0 ? torreItems : [""];

    for (const t of torresOrRoot) {
      const torreName = t ? `${torre.prefix}${t}` : "";
      if (torreName) {
        result.push({ name: torreName, type: "torre", parentPath: [] });
      }

      const pavOrRoot = pavItems.length > 0 ? pavItems : [""];
      for (const p of pavOrRoot) {
        const pavName = p ? `${pavimento.prefix}${p}` : "";
        if (pavName) {
          result.push({ name: pavName, type: "pavimento", parentPath: torreName ? [torreName] : [] });
        }

        const uniOrRoot = uniItems.length > 0 ? uniItems : [""];
        for (const u of uniOrRoot) {
          const uniName = u ? `${unidade.prefix}${u}` : "";
          if (uniName) {
            const path = [torreName, pavName].filter(Boolean);
            result.push({ name: uniName, type: "unidade", parentPath: path });
          }

          for (const a of ambItems) {
            const ambName = `${ambiente.prefix}${a}`;
            const path = [torreName, pavName, uniName].filter(Boolean);
            result.push({ name: ambName, type: "ambiente", parentPath: path });
          }
        }
      }
    }

    return result;
  };

  const handlePreview = () => {
    const tree = buildTree();
    if (tree.length === 0) {
      toast.error("Defina pelo menos um nível com itens.");
      return;
    }
    if (tree.length > 5000) {
      toast.error(`Seriam gerados ${tree.length} locais. Reduza os intervalos (máximo: 5000).`);
      return;
    }
    setPreview(tree.map(n => {
      const full = [...n.parentPath, n.name].join(" > ");
      return full;
    }));
  };

  const handleGenerate = async () => {
    if (!obraId) { toast.error("Selecione a obra."); return; }

    const tree = buildTree();
    if (tree.length === 0) { toast.error("Nenhum local para gerar."); return; }
    if (tree.length > 5000) { toast.error("Máximo de 5000 locais por vez."); return; }

    setGenerating(true);
    try {
      // Fetch existing locations to avoid duplicates
      const { data: existingLocs } = await supabase
        .from("locations")
        .select("id, name, obra_id, parent_id, type")
        .eq("obra_id", obraId)
        .is("deleted_at", null);

      const existingSet = new Set(
        (existingLocs || []).map(l => `${l.name}|${l.parent_id || "null"}|${l.type}`)
      );

      // We need to insert level by level so we can get parent IDs
      // Group by depth (parentPath length)
      const idMap = new Map<string, string>(); // path-key -> id

      // Also map existing locations by name+parent for lookups
      const existingByKey = new Map<string, string>();
      for (const l of existingLocs || []) {
        existingByKey.set(`${l.name}|${l.parent_id || "null"}|${l.type}`, l.id);
      }

      let created = 0;
      let skipped = 0;

      // Sort by depth
      const sorted = [...tree].sort((a, b) => a.parentPath.length - b.parentPath.length);

      for (const item of sorted) {
        // Resolve parent id
        let parentId: string | null = null;
        if (item.parentPath.length > 0) {
          const parentKey = item.parentPath.join("|");
          parentId = idMap.get(parentKey) || null;
          if (!parentId) {
            // Try existing
            // We need the actual parent - find by walking the path
            let currentParent: string | null = null;
            for (const segment of item.parentPath) {
              const found = (existingLocs || []).find(
                l => l.name === segment && l.parent_id === currentParent
              );
              if (found) currentParent = found.id;
              else { currentParent = idMap.get(item.parentPath.slice(0, item.parentPath.indexOf(segment) + 1).join("|")) || null; }
            }
            parentId = currentParent;
          }
        }

        const dupeKey = `${item.name}|${parentId || "null"}|${item.type}`;
        if (existingSet.has(dupeKey)) {
          // Already exists, just record its id for children
          const existingId = existingByKey.get(dupeKey);
          if (existingId) {
            const pathKey = [...item.parentPath, item.name].join("|");
            idMap.set(pathKey, existingId);
          }
          skipped++;
          continue;
        }

        const insertData: any = {
          name: item.name,
          type: item.type,
          obra_id: obraId,
          parent_id: parentId,
        };
        
        console.log(`Inserindo local: ${item.name} (${item.type}), parent: ${parentId}`);
        
        const { data: inserted, error } = await supabase
          .from("locations")
          .insert(insertData)
          .select("id")
          .single();

        if (error) {
          console.error("Erro ao inserir local:", error, insertData);
          throw new Error(`Erro ao criar "${item.name}": ${error.message}`);
        }

        const pathKey = [...item.parentPath, item.name].join("|");
        idMap.set(pathKey, inserted.id);
        existingSet.add(dupeKey);
        existingByKey.set(dupeKey, inserted.id);
        created++;
      }

      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(`${created} local(is) criado(s)${skipped > 0 ? `, ${skipped} já existente(s)` : ""}.`);
      setOpen(false);
      setPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar locais");
    } finally {
      setGenerating(false);
    }
  };

  const LevelRow = ({
    label,
    config,
    onChange,
    placeholderItems,
  }: {
    label: string;
    config: LevelConfig;
    onChange: (c: LevelConfig) => void;
    placeholderItems: string;
  }) => (
    <div className={`rounded-lg border p-3 space-y-2 transition-opacity ${config.enabled ? "border-primary/30 bg-primary/5" : "border-border opacity-60"}`}>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={config.enabled}
          onCheckedChange={(v) => onChange({ ...config, enabled: !!v })}
        />
        <Label className="font-medium text-sm">{label}</Label>
      </div>
      {config.enabled && (
        <div className="grid grid-cols-2 gap-2 pl-6">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prefixo</Label>
            <Input
              value={config.prefix}
              onChange={e => onChange({ ...config, prefix: e.target.value })}
              placeholder="Ex: Torre "
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Itens</Label>
            <Input
              value={config.items}
              onChange={e => onChange({ ...config, items: e.target.value })}
              placeholder={placeholderItems}
              className="h-8 text-sm"
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Use intervalo (ex: 01-10) ou lista separada por vírgula (ex: A, B, C)
          </p>
        </div>
      )}
    </div>
  );

  const totalItems = buildTree().length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreview(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="w-4 h-4 mr-2" />
          Gerar em Massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Gerador de Locais
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Obra</Label>
              <SearchableSelect
                options={activeObras.map(o => ({ value: o.id, label: o.name }))}
                value={obraId}
                onValueChange={setObraId}
                placeholder="Selecione a obra"
                searchPlaceholder="Buscar obra..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Níveis hierárquicos</p>
              <p className="text-xs text-muted-foreground">
                Defina os padrões para cada nível. Locais já existentes serão ignorados.
              </p>
            </div>

            <LevelRow label="Torres / Blocos" config={torre} onChange={setTorre} placeholderItems="A, B, C ou 1-5" />
            <LevelRow label="Pavimentos" config={pavimento} onChange={setPavimento} placeholderItems="01-10 ou Térreo, 1º, 2º" />
            <LevelRow label="Unidades" config={unidade} onChange={setUnidade} placeholderItems="01-04 ou 101, 102" />
            <LevelRow label="Ambientes" config={ambiente} onChange={setAmbiente} placeholderItems="Sala, Cozinha, Banheiro" />

            {totalItems > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Total estimado: <strong className="text-foreground">{totalItems}</strong> local(is)
              </p>
            )}

            {preview && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-sm font-medium">Prévia ({preview.length} locais)</p>
                <ScrollArea className="h-48">
                  <div className="space-y-0.5 text-xs font-mono">
                    {preview.slice(0, 200).map((p, i) => (
                      <p key={i} className="text-muted-foreground">{p}</p>
                    ))}
                    {preview.length > 200 && (
                      <p className="text-primary font-medium">... e mais {preview.length - 200} locais</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handlePreview} disabled={generating}>
                <Eye className="w-4 h-4 mr-2" />
                Pré-visualizar
              </Button>
              <Button className="flex-1" onClick={handleGenerate} disabled={generating || !obraId || totalItems === 0}>
                <Plus className="w-4 h-4 mr-2" />
                {generating ? "Gerando..." : `Gerar ${totalItems} Locais`}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLocationGenerator;
