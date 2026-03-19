import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Edit2, Package, X } from "lucide-react";
import { toast } from "sonner";

const FabricantesCRUD = () => {
  const { insumos } = useInventory();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkFabricanteId, setLinkFabricanteId] = useState<string | null>(null);
  const [selectedInsumoId, setSelectedInsumoId] = useState("");

  const { data: fabricantes = [], isLoading } = useQuery({
    queryKey: ["fabricantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fabricantes")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["insumo_fabricantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumo_fabricantes")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const insumoOptions = useMemo(() =>
    insumos.map(i => ({ value: i.id, label: `${i.name} (${i.code})`, searchTerms: i.code })),
    [insumos]
  );

  const filtered = fabricantes.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do fabricante");
      return;
    }
    try {
      if (editingId) {
        const { error } = await supabase.from("fabricantes").update({ name: name.trim() } as any).eq("id", editingId);
        if (error) throw error;
        toast.success("Fabricante atualizado");
      } else {
        const { error } = await supabase.from("fabricantes").insert({ name: name.trim() } as any);
        if (error) throw error;
        toast.success("Fabricante cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["fabricantes"] });
      setDialogOpen(false);
      setEditingId(null);
      setName("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("fabricantes").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success("Fabricante removido");
      queryClient.invalidateQueries({ queryKey: ["fabricantes"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const handleLinkInsumo = async () => {
    if (!selectedInsumoId || !linkFabricanteId) return;
    try {
      const { error } = await supabase.from("insumo_fabricantes").insert({
        insumo_id: selectedInsumoId,
        fabricante_id: linkFabricanteId,
      } as any);
      if (error) {
        if (error.code === "23505") {
          toast.error("Este insumo já está vinculado a este fabricante");
          return;
        }
        throw error;
      }
      toast.success("Insumo vinculado ao fabricante");
      queryClient.invalidateQueries({ queryKey: ["insumo_fabricantes"] });
      setSelectedInsumoId("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao vincular");
    }
  };

  const handleUnlinkInsumo = async (linkId: string) => {
    try {
      const { error } = await supabase.from("insumo_fabricantes").delete().eq("id", linkId);
      if (error) throw error;
      toast.success("Vínculo removido");
      queryClient.invalidateQueries({ queryKey: ["insumo_fabricantes"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover vínculo");
    }
  };

  const getLinkedInsumos = (fabricanteId: string) =>
    links.filter((l: any) => l.fabricante_id === fabricanteId);

  const openEdit = (fab: any) => {
    setEditingId(fab.id);
    setName(fab.name);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setName("");
    setDialogOpen(true);
  };

  const openLinkDialog = (fabricanteId: string) => {
    setLinkFabricanteId(fabricanteId);
    setSelectedInsumoId("");
    setLinkDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar fabricantes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Fabricante</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Fabricante</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fabricante" />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Link insumos dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Insumos de {fabricantes.find(f => f.id === linkFabricanteId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  options={insumoOptions}
                  value={selectedInsumoId}
                  onValueChange={setSelectedInsumoId}
                  placeholder="Selecione um insumo para vincular"
                  searchPlaceholder="Buscar por nome ou código..."
                />
              </div>
              <Button size="sm" onClick={handleLinkInsumo} disabled={!selectedInsumoId}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {linkFabricanteId && getLinkedInsumos(linkFabricanteId).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum insumo vinculado</p>
              )}
              {linkFabricanteId && getLinkedInsumos(linkFabricanteId).map((link: any) => {
                const insumo = insumos.find(i => i.id === link.insumo_id);
                return (
                  <div key={link.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-sm text-foreground">{insumo?.name || "—"} <span className="text-muted-foreground text-xs">({insumo?.code})</span></span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleUnlinkInsumo(link.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum fabricante encontrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Insumos vinculados</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f: any) => {
                const linkedInsumos = getLinkedInsumos(f.id);
                return (
                  <tr key={f.id} className="border-b border-border/50 last:border-0">
                    <td className="p-3 font-medium text-foreground">{f.name}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {linkedInsumos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum</span>}
                        {linkedInsumos.slice(0, 3).map((link: any) => {
                          const insumo = insumos.find(i => i.id === link.insumo_id);
                          return <Badge key={link.id} variant="outline" className="text-xs">{insumo?.name || "—"}</Badge>;
                        })}
                        {linkedInsumos.length > 3 && <Badge variant="secondary" className="text-xs">+{linkedInsumos.length - 3}</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLinkDialog(f.id)} title="Gerenciar insumos">
                          <Package className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)} title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir fabricante?</AlertDialogTitle>
                              <AlertDialogDescription>O fabricante será desativado.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(f.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FabricantesCRUD;
