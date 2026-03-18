import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Obra {
  id: string;
  name: string;
  status: string;
}

interface DuplicateLocationStructureProps {
  obras: Obra[];
}

const DuplicateLocationStructure = ({ obras }: DuplicateLocationStructureProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sourceObraId, setSourceObraId] = useState("");
  const [targetObraId, setTargetObraId] = useState("");
  const [copying, setCopying] = useState(false);
  const [sourceCount, setSourceCount] = useState<number | null>(null);

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const handleSourceChange = async (obraId: string) => {
    setSourceObraId(obraId);
    setSourceCount(null);
    if (!obraId) return;
    const { count } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("obra_id", obraId)
      .is("deleted_at", null);
    setSourceCount(count || 0);
  };

  const handleDuplicate = async () => {
    if (!sourceObraId || !targetObraId) { toast.error("Selecione obra de origem e destino."); return; }
    if (sourceObraId === targetObraId) { toast.error("Origem e destino devem ser diferentes."); return; }

    setCopying(true);
    try {
      // Fetch all source locations
      const { data: sourceLocs, error: fetchError } = await supabase
        .from("locations")
        .select("id, name, type, parent_id")
        .eq("obra_id", sourceObraId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      if (!sourceLocs || sourceLocs.length === 0) {
        toast.error("A obra de origem não possui locais.");
        return;
      }

      // Fetch existing target locations to avoid duplicates
      const { data: targetLocs } = await supabase
        .from("locations")
        .select("id, name, parent_id, type")
        .eq("obra_id", targetObraId)
        .is("deleted_at", null);

      const targetSet = new Set(
        (targetLocs || []).map(l => `${l.name}|${l.parent_id || "null"}|${l.type}`)
      );

      // Map old id -> new id
      const idMap = new Map<string, string>();

      // Also build existing target lookup
      const targetByKey = new Map<string, string>();
      for (const l of targetLocs || []) {
        targetByKey.set(`${l.name}|${l.parent_id || "null"}|${l.type}`, l.id);
      }

      let created = 0;
      let skipped = 0;

      // Insert in order (parents first since sorted by created_at)
      for (const loc of sourceLocs) {
        const newParentId = loc.parent_id ? (idMap.get(loc.parent_id) || null) : null;
        const dupeKey = `${loc.name}|${newParentId || "null"}|${loc.type}`;

        if (targetSet.has(dupeKey)) {
          // Map old id to existing target id for children
          const existingId = targetByKey.get(dupeKey);
          if (existingId) idMap.set(loc.id, existingId);
          skipped++;
          continue;
        }

        const { data: inserted, error } = await supabase
          .from("locations")
          .insert({
            name: loc.name,
            type: loc.type as any,
            obra_id: targetObraId,
            parent_id: newParentId,
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        idMap.set(loc.id, inserted.id);
        targetSet.add(dupeKey);
        targetByKey.set(dupeKey, inserted.id);
        created++;
      }

      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(`${created} local(is) copiado(s)${skipped > 0 ? `, ${skipped} já existente(s)` : ""}.`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar locais");
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          Duplicar de Obra
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Duplicar Estrutura de Locais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copie toda a árvore de locais de uma obra existente para outra. Locais já existentes no destino serão ignorados.
          </p>

          <div className="space-y-2">
            <Label>Obra de Origem</Label>
            <SearchableSelect
              options={activeObras.map(o => ({ value: o.id, label: o.name }))}
              value={sourceObraId}
              onValueChange={handleSourceChange}
              placeholder="Selecione a obra de origem"
              searchPlaceholder="Buscar obra..."
            />
            {sourceCount !== null && (
              <p className="text-xs text-muted-foreground">
                {sourceCount} local(is) encontrado(s)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Obra de Destino</Label>
            <SearchableSelect
              options={activeObras.filter(o => o.id !== sourceObraId).map(o => ({ value: o.id, label: o.name }))}
              value={targetObraId}
              onValueChange={setTargetObraId}
              placeholder="Selecione a obra de destino"
              searchPlaceholder="Buscar obra..."
            />
          </div>

          <Button
            className="w-full"
            onClick={handleDuplicate}
            disabled={copying || !sourceObraId || !targetObraId || sourceCount === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            {copying ? "Copiando..." : "Duplicar Locais"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateLocationStructure;
