import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const InsumosCRUD = () => {
  const { insumos } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", unit: "", category: "" });

  const filtered = insumos.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm({ name: "", code: "", unit: "", category: "" }); setEditing(null); };

  const openEdit = (insumo: any) => {
    setEditing(insumo);
    setForm({ name: insumo.name, code: insumo.code, unit: insumo.unit, category: insumo.category || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.unit) {
      toast.error("Nome, código e unidade são obrigatórios");
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase.from("insumos").update({
          name: form.name, code: form.code, unit: form.unit, category: form.category,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Insumo atualizado");
      } else {
        const { error } = await supabase.from("insumos").insert({
          name: form.name, code: form.code, unit: form.unit, category: form.category,
        });
        if (error) throw error;
        toast.success("Insumo cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("insumos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Insumo excluído");
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
    } catch (err: any) {
      toast.error(err.message?.includes("violates") ? "Não é possível excluir: insumo em uso" : err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar insumos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Insumo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do insumo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex: INS-001" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="Ex: kg, un, m" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Elétrico, Hidráulico" />
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
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Código</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-medium text-foreground">{i.name}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{i.code}</td>
                <td className="p-3 text-muted-foreground">{i.unit}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{i.category || "—"}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir insumo?</AlertDialogTitle>
                          <AlertDialogDescription>Só é possível excluir insumos que não possuem movimentações vinculadas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(i.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum insumo encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InsumosCRUD;
