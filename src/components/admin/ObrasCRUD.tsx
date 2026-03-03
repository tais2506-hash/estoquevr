import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Archive, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const ObrasCRUD = () => {
  const { obras, movimentacoes } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", status: "ativa" });
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const filtered = obras.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.address?.toLowerCase().includes(search.toLowerCase());
    if (!showArchived && o.status === "arquivada") return false;
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterDateFrom && o.created_at < filterDateFrom) return false;
    if (filterDateTo && o.created_at > filterDateTo + "T23:59:59") return false;
    return matchSearch;
  });

  const resetForm = () => { setForm({ name: "", code: "", address: "", status: "ativa" }); setEditing(null); };
  const clearFilters = () => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); setSearch(""); };
  const hasFilters = filterStatus !== "all" || filterDateFrom || filterDateTo || search;

  const openEdit = (obra: any) => {
    setEditing(obra);
    setForm({ name: obra.name, code: obra.code, address: obra.address || "", status: obra.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error("Nome e código são obrigatórios"); return; }
    try {
      if (editing) {
        const { error } = await supabase.from("obras").update({ name: form.name, code: form.code, address: form.address, status: form.status as any }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Obra atualizada");
      } else {
        const { error } = await supabase.from("obras").insert({ name: form.name, code: form.code, address: form.address, status: form.status as any });
        if (error) throw error;
        toast.success("Obra cadastrada");
      }
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) { toast.error(err.message || "Erro ao salvar"); }
  };

  const obraHasMovements = (obraId: string) => movimentacoes.some(m => m.obra_id === obraId);

  const handleArchive = async (obra: any) => {
    try {
      const { error } = await supabase.from("obras").update({ status: "arquivada" as any }).eq("id", obra.id);
      if (error) throw error;
      if (user?.id) {
        await supabase.from("audit_logs").insert({ user_id: user.id, user_name: user.name || "", user_role: user.role || "", action: "obra_arquivada", table_name: "obras", record_id: obra.id, old_value: { status: obra.status }, new_value: { status: "arquivada" } });
      }
      toast.success("Obra arquivada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["obras"] });
    } catch (err: any) { toast.error(err.message || "Erro ao arquivar"); }
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

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from("obras").delete().in("id", selected);
      if (error) throw error;
      toast.success(`${selected.length} obra(s) excluída(s)`);
      setSelected([]);
      setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["obras"] });
    } catch (err: any) {
      toast.error(err.message?.includes("violates") ? "Algumas obras possuem movimentações e não podem ser excluídas" : err.message);
    }
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const filteredIds = filtered.map(o => o.id);
    setSelected(prev => prev.length === filteredIds.length ? [] : filteredIds);
  };

  const statusLabel: Record<string, string> = { ativa: "Ativa", concluida: "Concluída", pausada: "Pausada", arquivada: "Arquivada" };
  const statusColor: Record<string, string> = {
    ativa: "bg-success/10 text-success", concluida: "bg-muted text-muted-foreground",
    pausada: "bg-warning/10 text-warning", arquivada: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar obras..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-1" />Excluir selecionados ({selected.length})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {selected.length} obra(s)?</AlertDialogTitle>
                  <AlertDialogDescription>Obras com movimentações vinculadas não poderão ser excluídas.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="w-4 h-4 mr-1" />{showArchived ? "Ocultar Arquivadas" : "Mostrar Arquivadas"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Nova Obra</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Obra" : "Nova Obra"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome da obra" /></div>
                <div className="space-y-2"><Label>Código</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Código interno" /></div>
                <div className="space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço" /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem><SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem><SelectItem value="arquivada">Arquivada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-muted/30 rounded-lg p-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem><SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem><SelectItem value="arquivada">Arquivada</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[150px]" placeholder="De" />
        <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[150px]" placeholder="Até" />
        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Limpar filtros</Button>}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-3 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Endereço</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const hasMovs = obraHasMovements(o.id);
              return (
                <tr key={o.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3"><Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggleSelect(o.id)} /></td>
                  <td className="p-3 font-medium text-foreground">{o.name}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{o.address}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] || ""}`}>{statusLabel[o.status] || o.status}</span></td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="w-4 h-4" /></Button>
                      {hasMovs && o.status !== "arquivada" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-warning"><Archive className="w-4 h-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Arquivar obra?</AlertDialogTitle><AlertDialogDescription>Esta obra possui movimentações. O arquivamento manterá o histórico.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleArchive(o)}>Arquivar</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir obra?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(o.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma obra encontrada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObrasCRUD;
