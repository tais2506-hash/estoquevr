import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, AlertTriangle, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import SpreadsheetImport from "./SpreadsheetImport";

const insumoColumns = [
  { key: "code", label: "Código", required: true, example: "INS-001" },
  { key: "name", label: "Nome", required: true, example: "Cimento CP-II" },
  { key: "unit", label: "Unidade", required: true, example: "kg" },
  { key: "category", label: "Categoria", required: false, example: "Estrutural" },
  { key: "estoque_minimo", label: "Estoque Mínimo", required: false, example: "100" },
];

const InsumosCRUD = () => {
  const { insumos, estoque } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [inactiveInsumos, setInactiveInsumos] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbUnits, setDbUnits] = useState<{ id: string; name: string; abbreviation: string }[]>([]);

  useEffect(() => {
    const fetchLists = async () => {
      const [catRes, unitRes] = await Promise.all([
        supabase.from("insumo_categories").select("id, name").order("sort_order"),
        supabase.from("insumo_units").select("id, name, abbreviation").order("sort_order"),
      ]);
      if (catRes.data) setDbCategories(catRes.data);
      if (unitRes.data) setDbUnits(unitRes.data);
    };
    fetchLists();
  }, []);

  useEffect(() => {
    if (!showInactive) { setInactiveInsumos([]); return; }
    const fetchInactive = async () => {
      const { data } = await supabase.from("insumos").select("*").not("deleted_at", "is", null).order("name");
      setInactiveInsumos((data as any[]) || []);
    };
    fetchInactive();
  }, [showInactive, insumos]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", code: "", unit: "", category: "",
    controla_estoque: true, controla_consumo: true, controla_rastreabilidade: false,
    material_nao_estocavel: false, estoque_minimo: 0,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = [...new Set(insumos.map(i => i.category).filter(Boolean))];

  const filtered = insumos.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    return matchSearch;
  });

  const resetForm = () => {
    setForm({ name: "", code: "", unit: "", category: "", controla_estoque: true, controla_consumo: true, controla_rastreabilidade: false, material_nao_estocavel: false, estoque_minimo: 0 });
    setEditing(null);
  };

  const clearFilters = () => { setFilterCategory("all"); setSearch(""); };
  const hasFilters = filterCategory !== "all" || search;

  const openEdit = (insumo: any) => {
    setEditing(insumo);
    setForm({
      name: insumo.name, code: insumo.code, unit: insumo.unit, category: insumo.category || "",
      controla_estoque: insumo.controla_estoque ?? true, controla_consumo: insumo.controla_consumo ?? true,
      controla_rastreabilidade: insumo.controla_rastreabilidade ?? false,
      material_nao_estocavel: insumo.material_nao_estocavel ?? false, estoque_minimo: insumo.estoque_minimo ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.unit) { toast.error("Nome, código e unidade são obrigatórios"); return; }
    try {
      const payload = {
        name: form.name, code: form.code, unit: form.unit, category: form.category,
        controla_estoque: form.controla_estoque, controla_consumo: form.controla_consumo,
        controla_rastreabilidade: form.controla_rastreabilidade, material_nao_estocavel: form.material_nao_estocavel,
        estoque_minimo: form.estoque_minimo,
      };
      if (editing) {
        const { error } = await supabase.from("insumos").update(payload as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Insumo atualizado");
      } else {
        const { error } = await supabase.from("insumos").insert(payload as any);
        if (error) throw error;
        toast.success("Insumo cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
      setDialogOpen(false); resetForm();
    } catch (err: any) { toast.error(err.message || "Erro ao salvar"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("insumos").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success("Insumo desativado");
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
    } catch (err: any) { toast.error(err.message || "Erro ao excluir"); }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from("insumos").update({ deleted_at: new Date().toISOString() } as any).in("id", selected);
      if (error) throw error;
      toast.success(`${selected.length} insumo(s) desativado(s)`);
      setSelected([]); setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
    } catch (err: any) { toast.error(err.message || "Erro ao desativar"); }
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const ids = filtered.map(i => i.id);
    setSelected(prev => prev.length === ids.length ? [] : ids);
  };

  const handleSpreadsheetImport = async (rows: Record<string, string>[]) => {
    let success = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    // Get existing codes
    const { data: existing } = await supabase.from("insumos").select("code");
    const existingCodes = new Set((existing || []).map(e => e.code));

    const toInsert: any[] = [];
    rows.forEach((row, i) => {
      const rowNum = i + 2; // header=1, example=2, data starts at 3 but we skip example
      if (!row.code || !row.name || !row.unit) {
        errors.push({ row: rowNum, message: "Código, Nome e Unidade são obrigatórios" });
        return;
      }
      if (existingCodes.has(row.code)) {
        skipped++;
        return;
      }
      existingCodes.add(row.code);
      toInsert.push({
        code: row.code,
        name: row.name,
        unit: row.unit,
        category: row.category || "",
        estoque_minimo: parseFloat(row.estoque_minimo) || 0,
      });
    });

    // Batch insert
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await supabase.from("insumos").insert(batch as any);
      if (error) {
        errors.push({ row: 0, message: `Erro no lote: ${error.message}` });
      } else {
        success += batch.length;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["insumos"] });
    return { success, skipped, errors };
  };

  const getStockAlert = (insumoId: string) => {
    const ins = insumos.find(i => i.id === insumoId);
    if (!ins || !ins.estoque_minimo || ins.estoque_minimo <= 0) return false;
    const totalStock = estoque.filter(e => e.insumo_id === insumoId).reduce((a, e) => a + e.quantity, 0);
    return totalStock <= ins.estoque_minimo;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar insumos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-1" />Desativar selecionados ({selected.length})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Desativar {selected.length} insumo(s)?</AlertDialogTitle><AlertDialogDescription>Os insumos serão desativados (soft delete). O histórico será mantido.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Desativar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <SpreadsheetImport
            title="Importar Insumos"
            columns={insumoColumns}
            templateFileName="modelo_insumos.xlsx"
            sheetName="Insumos"
            templateId="insumos_v1"
            existingData={insumos.map(i => ({
              code: i.code,
              name: i.name,
              unit: i.unit,
              category: i.category || "",
              estoque_minimo: String(i.estoque_minimo || 0),
            }))}
            onImport={handleSpreadsheetImport}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Insumo</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar Insumo" : "Novo Insumo"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do insumo" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Código</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex: INS-001" /></div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                      <SelectContent>
                        {dbUnits.map(u => (
                          <SelectItem key={u.id} value={u.abbreviation}>{u.abbreviation} — {u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                      <SelectContent>
                        {dbCategories.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" min="0" step="any" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: parseFloat(e.target.value) || 0 })} /></div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Controles</p>
                  <div className="flex items-center justify-between"><Label className="text-sm">Controla estoque?</Label><Switch checked={form.controla_estoque} onCheckedChange={v => setForm({ ...form, controla_estoque: v })} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Controla consumo?</Label><Switch checked={form.controla_consumo} onCheckedChange={v => setForm({ ...form, controla_consumo: v })} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Controla rastreabilidade?</Label><Switch checked={form.controla_rastreabilidade} onCheckedChange={v => setForm({ ...form, controla_rastreabilidade: v })} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Material não estocável?</Label><Switch checked={form.material_nao_estocavel} onCheckedChange={v => setForm({ ...form, material_nao_estocavel: v })} /></div>
                  
                </div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-muted/30 rounded-lg p-3">
        <SearchableSelect
          options={[{ value: "all", label: "Todas categorias" }, ...categories.map(c => ({ value: c, label: c }))]}
          value={filterCategory}
          onValueChange={setFilterCategory}
          placeholder="Categoria"
          searchPlaceholder="Buscar categoria..."
          className="w-[180px]"
        />
        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Limpar filtros</Button>}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-3 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Código</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Flags</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => {
              const lowStock = getStockAlert(i.id);
              return (
                <tr key={i.id} className={`border-b border-border/50 last:border-0 ${lowStock ? "bg-destructive/5" : ""}`}>
                  <td className="p-3"><Checkbox checked={selected.includes(i.id)} onCheckedChange={() => toggleSelect(i.id)} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{i.name}</span>
                      {lowStock && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{i.code}</td>
                  <td className="p-3 text-muted-foreground">{i.unit}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{i.category || "—"}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(i as any).material_nao_estocavel && <Badge variant="outline" className="text-xs">N.Est</Badge>}
                      {(i as any).controla_rastreabilidade && <Badge variant="outline" className="text-xs">Rast</Badge>}
                      
                      {(i as any).estoque_minimo > 0 && <Badge variant="outline" className="text-xs">Min:{(i as any).estoque_minimo}</Badge>}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Desativar insumo?</AlertDialogTitle><AlertDialogDescription>O insumo será desativado. O histórico será mantido.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(i.id)}>Desativar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum insumo encontrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InsumosCRUD;
