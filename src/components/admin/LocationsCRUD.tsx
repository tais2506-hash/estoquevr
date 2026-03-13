import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import SpreadsheetImport from "./SpreadsheetImport";

const locationColumns = [
  { key: "name", label: "Nome", required: true, example: "Torre A" },
  { key: "type", label: "Tipo (torre/pavimento/unidade/ambiente)", required: true, example: "torre" },
  { key: "obra_name", label: "Nome da Obra", required: true, example: "Residencial Alpha" },
  { key: "parent_name", label: "Local Pai (opcional)", required: false, example: "" },
];

const typeLabels: Record<string, string> = { torre: "Torre", pavimento: "Pavimento", unidade: "Unidade", ambiente: "Ambiente" };
const typeColors: Record<string, string> = {
  torre: "bg-primary/10 text-primary",
  pavimento: "bg-info/10 text-info",
  unidade: "bg-success/10 text-success",
  ambiente: "bg-warning/10 text-warning",
};

const LocationsCRUD = () => {
  const { locations, obras } = useInventory();
  const queryClient = useQueryClient();
  const [filterObraId, setFilterObraId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "torre", obra_id: "", parent_id: "" });

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const filteredLocations = useMemo(() => {
    let locs = locations;
    if (filterObraId !== "all") locs = locs.filter(l => l.obra_id === filterObraId);
    if (search) locs = locs.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    return locs;
  }, [locations, filterObraId, search]);

  // Build tree structure
  const buildTree = (parentId: string | null, depth: number): any[] => {
    return filteredLocations
      .filter(l => l.parent_id === parentId)
      .map(l => ({ ...l, depth, children: buildTree(l.id, depth + 1) }));
  };

  const tree = useMemo(() => {
    if (search) return filteredLocations.map(l => ({ ...l, depth: 0, children: [] }));
    return buildTree(null, 0);
  }, [filteredLocations, search]);

  const flatTree = (nodes: any[]): any[] => nodes.flatMap(n => [n, ...flatTree(n.children || [])]);
  const flatNodes = flatTree(tree);

  const resetForm = () => { setForm({ name: "", type: "torre", obra_id: "", parent_id: "" }); setEditing(null); };

  const openEdit = (loc: any) => {
    setEditing(loc);
    setForm({ name: loc.name, type: loc.type, obra_id: loc.obra_id, parent_id: loc.parent_id || "" });
    setDialogOpen(true);
  };

  const parentOptions = useMemo(() => {
    const obraId = form.obra_id;
    if (!obraId) return [];
    return locations.filter(l => l.obra_id === obraId && (!editing || l.id !== editing.id));
  }, [form.obra_id, locations, editing]);

  const handleSave = async () => {
    if (!form.name || !form.obra_id) { toast.error("Nome e obra são obrigatórios"); return; }
    try {
      const payload = {
        name: form.name,
        type: form.type as any,
        obra_id: form.obra_id,
        parent_id: form.parent_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("locations").update(payload as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Local atualizado");
      } else {
        const { error } = await supabase.from("locations").insert(payload as any);
        if (error) throw error;
        toast.success("Local cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("locations").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success("Local desativado");
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  };

  const handleSpreadsheetImport = async (rows: Record<string, string>[]) => {
    let success = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    const validTypes = ["torre", "pavimento", "unidade", "ambiente"];

    // Build obra name -> id map
    const obraMap = new Map(obras.map(o => [o.name.toLowerCase().trim(), o.id]));

    // We'll need to resolve parent names after inserting parents
    // First pass: insert items without parents, then with parents
    const withoutParent: { row: Record<string, string>; idx: number }[] = [];
    const withParent: { row: Record<string, string>; idx: number }[] = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2;
      if (!row.name || !row.type || !row.obra_name) {
        errors.push({ row: rowNum, message: "Nome, Tipo e Nome da Obra são obrigatórios" });
        return;
      }
      const type = row.type.toLowerCase().trim();
      if (!validTypes.includes(type)) {
        errors.push({ row: rowNum, message: `Tipo inválido: "${row.type}". Use: torre, pavimento, unidade ou ambiente` });
        return;
      }
      const obraId = obraMap.get(row.obra_name.toLowerCase().trim());
      if (!obraId) {
        errors.push({ row: rowNum, message: `Obra não encontrada: "${row.obra_name}"` });
        return;
      }
      if (row.parent_name && row.parent_name.trim()) {
        withParent.push({ row, idx: rowNum });
      } else {
        withoutParent.push({ row, idx: rowNum });
      }
    });

    // Insert items without parents first
    for (const { row, idx } of withoutParent) {
      const obraId = obraMap.get(row.obra_name.toLowerCase().trim())!;
      const { error } = await supabase.from("locations").insert({
        name: row.name,
        type: row.type.toLowerCase().trim() as any,
        obra_id: obraId,
        parent_id: null,
      } as any);
      if (error) {
        errors.push({ row: idx, message: error.message });
      } else {
        success++;
      }
    }

    // Refresh locations for parent resolution
    const { data: allLocs } = await supabase.from("locations").select("id, name, obra_id").is("deleted_at", null);

    // Insert items with parents
    for (const { row, idx } of withParent) {
      const obraId = obraMap.get(row.obra_name.toLowerCase().trim())!;
      const parent = (allLocs || []).find(
        l => l.name.toLowerCase().trim() === row.parent_name.toLowerCase().trim() && l.obra_id === obraId
      );
      if (!parent) {
        errors.push({ row: idx, message: `Local pai não encontrado: "${row.parent_name}"` });
        continue;
      }
      const { error } = await supabase.from("locations").insert({
        name: row.name,
        type: row.type.toLowerCase().trim() as any,
        obra_id: obraId,
        parent_id: parent.id,
      } as any);
      if (error) {
        errors.push({ row: idx, message: error.message });
      } else {
        success++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["locations"] });
    return { success, skipped, errors };
  };

  const getLocationPath = (locId: string): string => {
    const parts: string[] = [];
    let current = locations.find(l => l.id === locId);
    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? locations.find(l => l.id === current!.parent_id) : undefined;
    }
    return parts.join(" > ");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar locais..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterObraId} onValueChange={setFilterObraId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Obra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SpreadsheetImport
          title="Importar Locais"
          columns={locationColumns}
          templateFileName="modelo_locais.xlsx"
          sheetName="Locais"
          templateId="locations_v1"
          onImport={handleSpreadsheetImport}
        />
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Local</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Local" : "Novo Local"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Obra</Label>
                <Select value={form.obra_id} onValueChange={v => setForm({ ...form, obra_id: v, parent_id: "" })} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Torre A" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="torre">Torre</SelectItem>
                      <SelectItem value="pavimento">Pavimento</SelectItem>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="ambiente">Ambiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Local Pai (opcional)</Label>
                <Select value={form.parent_id || "none"} onValueChange={v => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum (raiz)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (raiz)</SelectItem>
                    {parentOptions.map(l => (
                      <SelectItem key={l.id} value={l.id}>{getLocationPath(l.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-3 font-medium text-muted-foreground">Local</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Obra</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {flatNodes.map(l => (
              <tr key={l.id} className="border-b border-border/50 last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-1" style={{ paddingLeft: `${l.depth * 20}px` }}>
                    {l.depth > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{l.name}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[l.type] || ""}`}>
                    {typeLabels[l.type] || l.type}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{obras.find(o => o.id === l.obra_id)?.name}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desativar local?</AlertDialogTitle>
                          <AlertDialogDescription>O local será desativado mas o histórico será mantido.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(l.id)}>Desativar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {flatNodes.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum local encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationsCRUD;