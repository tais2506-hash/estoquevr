import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Wand2, Plus, Eye, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---- Types ----

interface Obra {
  id: string;
  name: string;
  status: string;
}

interface LevelConfig {
  enabled: boolean;
  type: string; // location_type value (torre, pavimento, etc.)
  prefix: string;
  items: string;
}

interface TreeNode {
  name: string;
  type: string;
  parentPath: string[];
}

interface ExistingLocation {
  id: string;
  name: string;
  parent_id: string | null;
  type: string;
  obra_id: string;
}

// ---- Helpers ----

const parseLevelItems = (input: string): string[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];

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

  return trimmed.split(",").map(s => s.trim()).filter(Boolean);
};

const getLocationPath = (loc: ExistingLocation, allLocs: ExistingLocation[]): string => {
  const parts: string[] = [loc.name];
  let current = loc;
  while (current.parent_id) {
    const parent = allLocs.find(l => l.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(" > ");
};

// ---- LevelRow (extracted outside to avoid focus loss) ----

interface LevelRowProps {
  label: string;
  config: LevelConfig;
  onChange: (c: LevelConfig) => void;
  placeholderItems: string;
  locationTypes: { id: string; name: string }[];
}

const LevelRow = ({ label, config, onChange, placeholderItems, locationTypes }: LevelRowProps) => (
  <div className={`rounded-lg border p-3 space-y-2 transition-opacity ${config.enabled ? "border-primary/30 bg-primary/5" : "border-border opacity-60"}`}>
    <div className="flex items-center gap-2">
      <Checkbox
        checked={config.enabled}
        onCheckedChange={(v) => onChange({ ...config, enabled: !!v })}
      />
      <Label className="font-medium text-sm">{label}</Label>
    </div>
    {config.enabled && (
      <div className="space-y-2 pl-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo do local</Label>
            <Select value={config.type} onValueChange={(v) => onChange({ ...config, type: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {locationTypes.map(lt => (
                  <SelectItem key={lt.id} value={lt.name.toLowerCase()}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prefixo (opcional)</Label>
            <Input
              value={config.prefix}
              onChange={e => onChange({ ...config, prefix: e.target.value })}
              placeholder="Ex: Torre "
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Itens</Label>
          <Input
            value={config.items}
            onChange={e => onChange({ ...config, items: e.target.value })}
            placeholder={placeholderItems}
            className="h-8 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use intervalo (ex: 01-10) ou lista separada por vírgula (ex: A, B, C)
          </p>
        </div>
      </div>
    )}
  </div>
);

// ---- Main Component ----

interface BulkLocationGeneratorProps {
  obras: Obra[];
}

const BulkLocationGenerator = ({ obras }: BulkLocationGeneratorProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [obraId, setObraId] = useState("");
  const [preview, setPreview] = useState<string[] | null>(null);
  const [parentLocationId, setParentLocationId] = useState<string>("");

  // Fetch location_types from DB
  const { data: locationTypes = [] } = useQuery({
    queryKey: ["location_types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("location_types")
        .select("id, name, sort_order")
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch existing locations for selected obra (for parent selection)
  const { data: existingLocations = [] } = useQuery({
    queryKey: ["locations", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data } = await supabase
        .from("locations")
        .select("id, name, parent_id, type, obra_id")
        .eq("obra_id", obraId)
        .is("deleted_at", null)
        .order("name");
      return (data || []) as ExistingLocation[];
    },
    enabled: !!obraId,
  });

  const [levels, setLevels] = useState<LevelConfig[]>([
    { enabled: true, type: "torre", prefix: "Torre ", items: "A, B, C" },
    { enabled: true, type: "pavimento", prefix: "", items: "01-10" },
    { enabled: true, type: "unidade", prefix: "", items: "01-04" },
    { enabled: false, type: "ambiente", prefix: "", items: "Sala, Cozinha, Banheiro" },
  ]);

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const updateLevel = useCallback((index: number, config: LevelConfig) => {
    setLevels(prev => {
      const next = [...prev];
      next[index] = config;
      return next;
    });
  }, []);

  // Parent location options (flat list with path)
  const parentLocationOptions = existingLocations.map(loc => ({
    value: loc.id,
    label: getLocationPath(loc, existingLocations),
  }));

  const buildTree = useCallback((): TreeNode[] => {
    const result: TreeNode[] = [];
    const enabledLevels = levels.filter(l => l.enabled && parseLevelItems(l.items).length > 0);

    if (enabledLevels.length === 0) return result;

    // Build tree recursively
    const buildLevel = (levelIndex: number, parentPath: string[]) => {
      if (levelIndex >= enabledLevels.length) return;

      const level = enabledLevels[levelIndex];
      const items = parseLevelItems(level.items);

      for (const item of items) {
        const name = `${level.prefix}${item}`;
        result.push({ name, type: level.type, parentPath: [...parentPath] });
        buildLevel(levelIndex + 1, [...parentPath, name]);
      }
    };

    buildLevel(0, []);
    return result;
  }, [levels]);

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

    // Add parent location path as prefix if selected
    let parentPrefix = "";
    if (parentLocationId) {
      const parentLoc = existingLocations.find(l => l.id === parentLocationId);
      if (parentLoc) {
        parentPrefix = getLocationPath(parentLoc, existingLocations) + " > ";
      }
    }

    setPreview(tree.map(n => {
      const full = [...n.parentPath, n.name].join(" > ");
      return parentPrefix + full;
    }));
  };

  const handleGenerate = async () => {
    if (!obraId) { toast.error("Selecione a obra."); return; }

    const tree = buildTree();
    if (tree.length === 0) { toast.error("Nenhum local para gerar."); return; }
    if (tree.length > 5000) { toast.error("Máximo de 5000 locais por vez."); return; }

    setGenerating(true);
    try {
      // Fetch fresh existing locations
      const { data: freshLocs } = await supabase
        .from("locations")
        .select("id, name, obra_id, parent_id, type")
        .eq("obra_id", obraId)
        .is("deleted_at", null);

      const allLocs = freshLocs || [];

      const existingSet = new Set(
        allLocs.map(l => `${l.name}|${l.parent_id || "null"}|${l.type}`)
      );

      const idMap = new Map<string, string>();
      const existingByKey = new Map<string, string>();
      for (const l of allLocs) {
        existingByKey.set(`${l.name}|${l.parent_id || "null"}|${l.type}`, l.id);
      }

      // The root parent for first-level items
      const rootParentId = parentLocationId || null;

      let created = 0;
      let skipped = 0;

      // Sort by depth
      const sorted = [...tree].sort((a, b) => a.parentPath.length - b.parentPath.length);

      for (const item of sorted) {
        // Resolve parent id
        let parentId: string | null = rootParentId;

        if (item.parentPath.length > 0) {
          const parentKey = item.parentPath.join("|");
          const mappedId = idMap.get(parentKey);
          if (mappedId) {
            parentId = mappedId;
          } else {
            // Walk path from root parent
            let currentParent: string | null = rootParentId;
            for (const segment of item.parentPath) {
              const segKey = item.parentPath.slice(0, item.parentPath.indexOf(segment) + 1).join("|");
              const mapped = idMap.get(segKey);
              if (mapped) {
                currentParent = mapped;
              } else {
                const found = allLocs.find(
                  l => l.name === segment && l.parent_id === currentParent
                );
                if (found) currentParent = found.id;
              }
            }
            parentId = currentParent;
          }
        }

        const dupeKey = `${item.name}|${parentId || "null"}|${item.type}`;
        if (existingSet.has(dupeKey)) {
          const existingId = existingByKey.get(dupeKey);
          if (existingId) {
            const pathKey = [...item.parentPath, item.name].join("|");
            idMap.set(pathKey, existingId);
          }
          skipped++;
          continue;
        }

        const { data: inserted, error } = await supabase
          .from("locations")
          .insert({
            name: item.name,
            type: item.type as any,
            obra_id: obraId,
            parent_id: parentId,
          } as any)
          .select("id")
          .single();

        if (error) {
          console.error("Erro ao inserir local:", error);
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

  const totalItems = buildTree().length;
  const levelLabels = ["Nível 1", "Nível 2", "Nível 3", "Nível 4"];

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
                onValueChange={(v) => { setObraId(v); setParentLocationId(""); }}
                placeholder="Selecione a obra"
                searchPlaceholder="Buscar obra..."
              />
            </div>

            {obraId && existingLocations.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4" />
                  Local pai (opcional)
                </Label>
                <SearchableSelect
                  options={[
                    { value: "__root__", label: "— Raiz (sem pai) —" },
                    ...parentLocationOptions,
                  ]}
                  value={parentLocationId || "__root__"}
                  onValueChange={(v) => setParentLocationId(v === "__root__" ? "" : v)}
                  placeholder="Gerar na raiz"
                  searchPlaceholder="Buscar local pai..."
                />
                <p className="text-xs text-muted-foreground">
                  Selecione um local existente para gerar sub-locais dentro dele.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Níveis hierárquicos</p>
              <p className="text-xs text-muted-foreground">
                Defina os padrões para cada nível. Locais já existentes serão ignorados.
              </p>
            </div>

            {levels.map((level, i) => (
              <LevelRow
                key={i}
                label={levelLabels[i]}
                config={level}
                onChange={(c) => updateLevel(i, c)}
                placeholderItems={
                  i === 0 ? "A, B, C ou 1-5" :
                  i === 1 ? "01-10 ou Térreo, 1º, 2º" :
                  i === 2 ? "01-04 ou 101, 102" :
                  "Sala, Cozinha, Banheiro"
                }
                locationTypes={locationTypes}
              />
            ))}

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
