import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const ServicePackagesCRUD = () => {
  const { servicePackages, refetchAll } = useInventory();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", unit: "un" });

  const resetForm = () => {
    setForm({ name: "", unit: "un" });
    setEditingId(null);
    setOpen(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Preencha o nome do serviço");
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("service_packages").update({
        name: form.name, unit: form.unit,
      }).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Serviço atualizado!");
    } else {
      const { error } = await supabase.from("service_packages").insert({
        name: form.name, unit: form.unit,
      } as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Serviço criado!");
    }
    refetchAll();
    resetForm();
  };

  const handleEdit = (s: typeof servicePackages[0]) => {
    setForm({ name: s.name, unit: s.unit });
    setEditingId(s.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_packages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Serviço removido!");
    refetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Pacotes de Serviço
          </h2>
          <p className="text-sm text-muted-foreground">Cadastre os serviços padrão para vincular às baixas e requisições de todas as obras</p>
        </div>
        <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Serviço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Serviço <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Alvenaria, Reboco, Elétrica" />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="Ex: m², un" />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingId ? "Salvar Alterações" : "Cadastrar Serviço"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicePackages.map(s => (
              <tr key={s.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-medium text-foreground">{s.name}</td>
                <td className="p-3 text-muted-foreground">{s.unit}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {servicePackages.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhum serviço cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServicePackagesCRUD;
