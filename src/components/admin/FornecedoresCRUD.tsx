import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const FornecedoresCRUD = () => {
  const { fornecedores, avaliacoes, entradas } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", contact: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = fornecedores.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) || f.cnpj.includes(search)
  );

  const getMedia = (fId: string) => {
    const avs = avaliacoes.filter((a: any) => a.fornecedor_id === fId);
    if (avs.length === 0) return null;
    return Math.round(avs.reduce((a: number, av: any) => a + (av.pontualidade + av.qualidade + av.atendimento + av.documentacao) / 4, 0) / avs.length * 10) / 10;
  };

  const resetForm = () => { setForm({ name: "", cnpj: "", contact: "" }); setEditing(null); };

  const openEdit = (f: any) => {
    setEditing(f);
    setForm({ name: f.name, cnpj: f.cnpj, contact: f.contact || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.cnpj) { toast.error("Nome e CNPJ são obrigatórios"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("fornecedores").update({ name: form.name, cnpj: form.cnpj, contact: form.contact || null }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Fornecedor atualizado");
      } else {
        const { error } = await supabase.from("fornecedores").insert({ name: form.name, cnpj: form.cnpj, contact: form.contact || null });
        if (error) throw error;
        toast.success("Fornecedor cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      setDialogOpen(false); resetForm();
    } catch (err: any) { toast.error(err.message || "Erro ao salvar"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("fornecedores").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success("Fornecedor desativado");
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    } catch (err: any) { toast.error(err.message || "Erro ao excluir"); }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from("fornecedores").update({ deleted_at: new Date().toISOString() } as any).in("id", selected);
      if (error) throw error;
      toast.success(`${selected.length} fornecedor(es) desativado(s)`);
      setSelected([]); setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    } catch (err: any) { toast.error(err.message || "Erro ao desativar"); }
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const ids = filtered.map(f => f.id);
    setSelected(prev => prev.length === ids.length ? [] : ids);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar fornecedores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-1" />Desativar selecionados ({selected.length})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Desativar {selected.length} fornecedor(es)?</AlertDialogTitle><AlertDialogDescription>Os fornecedores serão desativados. O histórico será mantido.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Desativar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Fornecedor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nome / Razão Social</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do fornecedor" /></div>
                <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" /></div>
                <div className="space-y-2"><Label>Contato</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Telefone ou e-mail" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-3 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">CNPJ</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Contato</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Média</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => {
              const media = getMedia(f.id);
              const numEntregas = entradas.filter((e: any) => e.fornecedor_id === f.id).length;
              return (
                <tr key={f.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3"><Checkbox checked={selected.includes(f.id)} onCheckedChange={() => toggleSelect(f.id)} /></td>
                  <td className="p-3">
                    <p className="font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{numEntregas} entregas</p>
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{f.cnpj}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{f.contact || "—"}</td>
                  <td className="p-3">
                    {media !== null ? (
                      <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-accent fill-accent" /><span className="text-sm font-semibold text-foreground">{media}</span></div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Desativar fornecedor?</AlertDialogTitle><AlertDialogDescription>O fornecedor será desativado. O histórico será mantido.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(f.id)}>Desativar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum fornecedor encontrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FornecedoresCRUD;
