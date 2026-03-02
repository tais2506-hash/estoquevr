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

const ServicePackagesCRUD = () => {
  const { servicePackages, obras } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterObraId, setFilterObraId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", eap_code: "", unit: "un", obra_id: "", status: "ativo" });

  const activeObras = obras.filter(o => o.status !== "arquivada");

  const filtered = servicePackages.filter(sp => {
    const matchSearch = sp.name.toLowerCase().includes(search.toLowerCase()) || sp.eap_code.toLowerCase().includes(search.toLowerCase());
    const matchObra = filterObraId === "all" || sp.obra_id === filterObraId;
    return matchSearch && matchObra;
  });

  const resetForm = () => { setForm({ name: "", eap_code: "", unit: "un", obra_id: "", status: "ativo" }); setEditing(null); };

  const openEdit = (sp: any) => {
    setEditing(sp);
    setForm({ name: sp.name, eap_code: sp.eap_code, unit: sp.unit, obra_id: sp.obra_id, status: sp.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.obra_id) { toast.error("Nome e obra são obrigatórios"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("service_packages").update({
          name: form.name, eap_code: form.eap_code, unit: form.unit, status: form.status,
        } as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Pacote atualizado");
      } else {
        const { error } = await supabase.from("service_packages").insert({
          name: form.name, eap_code: form.eap_code, unit: form.unit, obra_id: form.obra_id, status: form.status,
        } as any);
        if (error) throw error;
        toast.success("Pacote cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["service_packages"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("service_packages").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success("Pacote desativado");
      queryClient.invalidateQueries({ queryKey: ["service_packages"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar pacotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterObraId} onValueChange={setFilterObraId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Obra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Pacote</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Pacote" : "Novo Pacote de Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Obra</Label>
                <Select value={form.obra_id} onValueChange={v => setForm({ ...form, obra_id: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {activeObras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Pacote</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Alvenaria" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Código EAP</Label>
                  <Input value={form.eap_code} onChange={e => setForm({ ...form, eap_code: e.target.value })} placeholder="Ex: 01.02.03" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="Ex: m², un" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
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
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">EAP</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Obra</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sp => (
              <tr key={sp.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-medium text-foreground">{sp.name}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{sp.eap_code || "—"}</td>
                <td className="p-3 text-muted-foreground">{sp.unit}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{obras.find(o => o.id === sp.obra_id)?.name || "—"}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sp)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desativar pacote?</AlertDialogTitle>
                          <AlertDialogDescription>O pacote será desativado mas o histórico será mantido.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(sp.id)}>Desativar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum pacote encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServicePackagesCRUD;