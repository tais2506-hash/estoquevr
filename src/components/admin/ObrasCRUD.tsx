import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const ObrasCRUD = () => {
  const { obras } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", status: "ativa" });

  const filtered = obras.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.address?.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({ name: "", code: "", address: "", status: "ativa" });
    setEditing(null);
  };

  const openEdit = (obra: any) => {
    setEditing(obra);
    setForm({ name: obra.name, code: obra.code, address: obra.address || "", status: obra.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error("Nome e código são obrigatórios");
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase.from("obras").update({
          name: form.name, code: form.code, address: form.address, status: form.status as any,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Obra atualizada");
      } else {
        const { error } = await supabase.from("obras").insert({
          name: form.name, code: form.code, address: form.address, status: form.status as any,
        });
        if (error) throw error;
        toast.success("Obra cadastrada");
      }
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("obras").delete().eq("id", id);
      if (error) throw error;
      toast.success("Obra excluída");
      queryClient.invalidateQueries({ queryKey: ["obras"] });
    } catch (err: any) {
      toast.error(err.message?.includes("violates") ? "Não é possível excluir: obra possui movimentações" : err.message);
    }
  };

  const statusLabel: Record<string, string> = { ativa: "Ativa", concluida: "Concluída", pausada: "Pausada" };
  const statusColor: Record<string, string> = { ativa: "bg-success/10 text-success", concluida: "bg-muted text-muted-foreground", pausada: "bg-warning/10 text-warning" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar obras..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Nova Obra</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Obra" : "Nova Obra"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome da obra" />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Código interno" />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
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
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Endereço</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-medium text-foreground">{o.name}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{o.address}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] || ""}`}>{statusLabel[o.status] || o.status}</span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. Só é possível excluir obras sem movimentações vinculadas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(o.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma obra encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObrasCRUD;
