import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const KitsCRUD = () => {
  const { kits, kitItems, insumos, obras } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedObraFilter, setSelectedObraFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", obra_id: "" });
  const [items, setItems] = useState<{ insumo_id: string; quantity: number }[]>([]);

  const activeObras = useMemo(() => obras.filter(o => o.status === "ativa"), [obras]);

  const filtered = useMemo(() => {
    let result = kits;
    if (selectedObraFilter && selectedObraFilter !== "all") result = result.filter(k => k.obra_id === selectedObraFilter);
    if (search) result = result.filter(k => k.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [kits, search, selectedObraFilter]);

  const resetForm = () => { setForm({ name: "", description: "", obra_id: "" }); setEditing(null); setItems([]); };

  const openEdit = (kit: any) => {
    setEditing(kit);
    setForm({ name: kit.name, description: kit.description || "", obra_id: kit.obra_id || "" });
    const kitItms = kitItems.filter(ki => ki.kit_id === kit.id);
    setItems(kitItms.map(ki => ({ insumo_id: ki.insumo_id, quantity: ki.quantity })));
    setDialogOpen(true);
  };

  const addItem = () => setItems([...items, { insumo_id: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    if (!form.obra_id) { toast.error("Selecione a obra"); return; }
    if (items.length === 0 || items.some(i => !i.insumo_id)) { toast.error("Adicione pelo menos 1 insumo ao kit"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("kits").update({ name: form.name, description: form.description, obra_id: form.obra_id } as any).eq("id", editing.id);
        if (error) throw error;
        await supabase.from("kit_items").delete().eq("kit_id", editing.id);
        const { error: e2 } = await supabase.from("kit_items").insert(items.map(i => ({ kit_id: editing.id, insumo_id: i.insumo_id, quantity: i.quantity })));
        if (e2) throw e2;
        toast.success("Kit atualizado");
      } else {
        const { data: inserted, error } = await supabase.from("kits").insert({ name: form.name, description: form.description, obra_id: form.obra_id } as any).select().single();
        if (error) throw error;
        const { error: e2 } = await supabase.from("kit_items").insert(items.map(i => ({ kit_id: inserted.id, insumo_id: i.insumo_id, quantity: i.quantity })));
        if (e2) throw e2;
        toast.success("Kit cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["kits"] });
      queryClient.invalidateQueries({ queryKey: ["kit_items"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("kits").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success("Kit excluído");
      queryClient.invalidateQueries({ queryKey: ["kits"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  };

  const getObraName = (obraId: string | null) => {
    if (!obraId) return "—";
    return obras.find(o => o.id === obraId)?.name || "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar kits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={selectedObraFilter} onValueChange={setSelectedObraFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as obras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Kit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Kit" : "Novo Kit"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Obra <span className="text-destructive">*</span></Label>
                <Select value={form.obra_id} onValueChange={v => setForm({ ...form, obra_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do kit" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do kit" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Insumos do Kit</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Insumo</Button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={item.insumo_id} onValueChange={v => {
                        const newItems = [...items];
                        newItems[idx].insumo_id = v;
                        setItems(newItems);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Insumo" /></SelectTrigger>
                        <SelectContent>
                          {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input type="number" min="0.01" step="any" value={item.quantity} onChange={e => {
                        const newItems = [...items];
                        newItems[idx].quantity = parseFloat(e.target.value) || 0;
                        setItems(newItems);
                      }} placeholder="Qtd" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Nenhum insumo adicionado</p>}
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
              <th className="text-left p-3 font-medium text-muted-foreground">Kit</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Obra</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Itens</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(k => {
              const kitItms = kitItems.filter(ki => ki.kit_id === k.id);
              return (
                <tr key={k.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3">
                    <p className="font-medium text-foreground">{k.name}</p>
                    {k.description && <p className="text-xs text-muted-foreground">{k.description}</p>}
                  </td>
                  <td className="p-3 text-sm text-foreground">{getObraName(k.obra_id)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {kitItms.map(ki => {
                        const ins = insumos.find(i => i.id === ki.insumo_id);
                        return ins ? (
                          <span key={ki.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                            {ins.name} x{ki.quantity}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
                            <AlertDialogDescription>O kit será desativado e não aparecerá mais nas operações.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(k.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum kit encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KitsCRUD;
