import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Eye, Download, AlertTriangle, Clock, FileText, X } from "lucide-react";
import { toast } from "sonner";
import LaudoViewer from "./LaudoViewer";

const LaudosCRUD = () => {
  const { insumos } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterInsumo, setFilterInsumo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingLaudo, setViewingLaudo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    insumoId: "",
    fornecedorId: "",
    validade: "",
    lote: "",
    notaFiscal: "",
    file: null as File | null,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_laudos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("id, name, cnpj").is("deleted_at", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: laudos = [], isLoading } = useQuery({
    queryKey: ["laudos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laudos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const insumoOptions = useMemo(() => [
    { value: "all", label: "Todos os insumos" },
    ...insumos.map(i => ({ value: i.id, label: `${i.name} (${i.code})` })),
  ], [insumos]);

  const insumoFormOptions = useMemo(() =>
    insumos
      .filter(i => (i as any).tipo_laudo !== "nao_controlado")
      .map(i => ({ value: i.id, label: `${i.name} (${i.code})`, searchTerms: i.code })),
    [insumos]
  );

  const getLaudoStatus = (laudo: any) => {
    if (!laudo.validade) return "sem_validade";
    const today = new Date();
    const val = new Date(laudo.validade + "T00:00:00");
    const diffDays = Math.ceil((val.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "vencido";
    if (diffDays <= 15) return "proximo";
    return "valido";
  };

  const fornecedorOptions = useMemo(() =>
    fornecedores.map(f => ({ value: f.id, label: `${f.name} (${f.cnpj})` })),
    [fornecedores]
  );

  const filtered = laudos.filter((l: any) => {
    const insumo = insumos.find(i => i.id === l.insumo_id);
    const fornecedor = fornecedores.find(f => f.id === l.fornecedor_id);
    const matchSearch = !search || 
      insumo?.name.toLowerCase().includes(search.toLowerCase()) ||
      fornecedor?.name.toLowerCase().includes(search.toLowerCase()) ||
      l.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.lote?.toLowerCase().includes(search.toLowerCase()) ||
      l.nota_fiscal?.toLowerCase().includes(search.toLowerCase());
    const matchInsumo = filterInsumo === "all" || l.insumo_id === filterInsumo;
    const status = getLaudoStatus(l);
    const matchStatus = filterStatus === "all" || filterStatus === status;
    return matchSearch && matchInsumo && matchStatus;
  });

  const handleUpload = async () => {
    if (!form.insumoId || !form.fornecedorId || !form.file) {
      toast.error("Selecione o insumo, o fornecedor e o arquivo do laudo");
      return;
    }
    setUploading(true);
    try {
      const ext = form.file.name.split(".").pop();
      const path = `${form.insumoId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("laudos")
        .upload(path, form.file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("laudos").getPublicUrl(path);

      const { error } = await supabase.from("laudos").insert({
        insumo_id: form.insumoId,
        fornecedor_id: form.fornecedorId,
        file_url: urlData.publicUrl,
        file_name: form.file.name,
        validade: form.validade || null,
        lote: form.lote || null,
        nota_fiscal: form.notaFiscal || null,
        created_by: user?.id || "",
      } as any);
      if (error) throw error;

      toast.success("Laudo cadastrado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["laudos"] });
      setDialogOpen(false);
      setForm({ insumoId: "", fornecedorId: "", validade: "", lote: "", notaFiscal: "", file: null });
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar laudo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (laudo: any) => {
    try {
      const { error } = await supabase.from("laudos").delete().eq("id", laudo.id);
      if (error) throw error;
      toast.success("Laudo removido");
      queryClient.invalidateQueries({ queryKey: ["laudos"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const statusBadge = (laudo: any) => {
    const s = getLaudoStatus(laudo);
    if (s === "vencido") return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>;
    if (s === "proximo") return <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Vence em breve</Badge>;
    if (s === "valido") return <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Válido</Badge>;
    return <Badge variant="outline" className="text-xs">Sem validade</Badge>;
  };

  const clearFilters = () => { setSearch(""); setFilterInsumo("all"); setFilterStatus("all"); };
  const hasFilters = search || filterInsumo !== "all" || filterStatus !== "all";

  if (viewingLaudo) {
    return <LaudoViewer laudo={viewingLaudo} onBack={() => setViewingLaudo(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar laudos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Laudo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar Laudo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Insumo <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  options={insumoFormOptions}
                  value={form.insumoId}
                  onValueChange={v => setForm({ ...form, insumoId: v })}
                  placeholder="Selecione o insumo"
                  searchPlaceholder="Buscar por nome ou código..."
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  options={fornecedorOptions}
                  value={form.fornecedorId}
                  onValueChange={v => setForm({ ...form, fornecedorId: v })}
                  placeholder="Selecione o fornecedor"
                  searchPlaceholder="Buscar fornecedor..."
                />
              </div>
              <div className="space-y-2">
                <Label>Validade do laudo <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Lote <span className="text-xs text-muted-foreground">(opc.)</span></Label>
                  <Input value={form.lote} onChange={e => setForm({ ...form, lote: e.target.value })} placeholder="Ex: LT-001" />
                </div>
                <div className="space-y-2">
                  <Label>Nota Fiscal <span className="text-xs text-muted-foreground">(opc.)</span></Label>
                  <Input value={form.notaFiscal} onChange={e => setForm({ ...form, notaFiscal: e.target.value })} placeholder="NF-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Arquivo do laudo <span className="text-destructive">*</span></Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-muted-foreground">PDF, JPEG ou PNG</p>
              </div>
              <Button onClick={handleUpload} className="w-full" disabled={uploading}>
                {uploading ? "Enviando..." : "Cadastrar Laudo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-muted/30 rounded-lg p-3">
        <SearchableSelect
          options={insumoOptions}
          value={filterInsumo}
          onValueChange={setFilterInsumo}
          placeholder="Insumo"
          searchPlaceholder="Buscar insumo..."
          className="w-[200px]"
        />
        <SearchableSelect
          options={[
            { value: "all", label: "Todos os status" },
            { value: "valido", label: "Válido" },
            { value: "proximo", label: "Vence em breve" },
            { value: "vencido", label: "Vencido" },
            { value: "sem_validade", label: "Sem validade" },
          ]}
          value={filterStatus}
          onValueChange={setFilterStatus}
          placeholder="Status"
          className="w-[180px]"
        />
        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Limpar</Button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando laudos...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum laudo encontrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Arquivo</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Lote / NF</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Validade</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => {
                const insumo = insumos.find(i => i.id === l.insumo_id);
                return (
                  <tr key={l.id} className="border-b border-border/50 last:border-0">
                    <td className="p-3 font-medium text-foreground">{insumo?.name || "—"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell text-xs">{l.file_name}</td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell text-xs">
                      {l.lote && <span className="mr-2">Lote: {l.lote}</span>}
                      {l.nota_fiscal && <span>NF: {l.nota_fiscal}</span>}
                      {!l.lote && !l.nota_fiscal && "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {l.validade ? new Date(l.validade + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-3">{statusBadge(l)}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingLaudo(l)} title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <a href={l.file_url} download={l.file_name} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir laudo?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(l)}>Excluir</AlertDialogAction>
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

export default LaudosCRUD;
