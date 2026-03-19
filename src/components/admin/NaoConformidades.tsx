import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface NaoConformidadesProps {
  obraId?: string;
}

const NaoConformidades = ({ obraId }: NaoConformidadesProps) => {
  const { obras, insumos } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("aberta");
  const [filterObraId, setFilterObraId] = useState(obraId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolution, setResolution] = useState("");

  const { data: ncs = [], isLoading } = useQuery({
    queryKey: ["nao_conformidades", obraId],
    queryFn: async () => {
      let q = supabase.from("nao_conformidades").select("*").order("created_at", { ascending: false });
      if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: fvms = [] } = useQuery({
    queryKey: ["fvms_for_ncs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fvms").select("id, nota_fiscal, obra_id");
      if (error) throw error;
      return data;
    },
  });

  const obraOptions = obras.map(o => ({ value: o.id, label: o.name }));

  const filtered = useMemo(() => {
    let list = ncs;
    if (filterStatus) list = list.filter(nc => nc.status === filterStatus);
    if (filterObraId && !obraId) list = list.filter(nc => nc.obra_id === filterObraId);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(nc => {
        const fvm = fvms.find(f => f.id === nc.fvm_id);
        const ins = nc.insumo_id ? insumos.find(i => i.id === nc.insumo_id) : null;
        return (
          nc.description.toLowerCase().includes(term) ||
          fvm?.nota_fiscal?.toLowerCase().includes(term) ||
          ins?.name?.toLowerCase().includes(term)
        );
      });
    }
    return list;
  }, [ncs, filterStatus, filterObraId, searchTerm, obraId, fvms, insumos]);

  const getObraName = (id: string) => obras.find(o => o.id === id)?.name || "—";
  const getFvmNF = (fvmId: string) => fvms.find(f => f.id === fvmId)?.nota_fiscal || "—";
  const getInsumoName = (id: string | null) => id ? insumos.find(i => i.id === id)?.name || "—" : "—";

  const handleResolve = async () => {
    if (!resolution.trim() || !resolveDialog) return;
    const { error } = await supabase.from("nao_conformidades").update({
      status: "resolvida",
      resolution: resolution.trim(),
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id || null,
    }).eq("id", resolveDialog.id);
    if (error) { return; }
    queryClient.invalidateQueries({ queryKey: ["nao_conformidades"] });
    setResolveDialog(null);
    setResolution("");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" /> Não Conformidades
      </h3>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px] space-y-1">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="NF, descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="w-40 space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <SearchableSelect
            options={[{ value: "", label: "Todos" }, { value: "aberta", label: "Aberta" }, { value: "resolvida", label: "Resolvida" }]}
            value={filterStatus}
            onValueChange={setFilterStatus}
            placeholder="Todos"
            searchPlaceholder=""
            emptyMessage=""
          />
        </div>
        {!obraId && (
          <div className="w-56 space-y-1">
            <Label className="text-xs text-muted-foreground">Obra</Label>
            <SearchableSelect
              options={[{ value: "", label: "Todas" }, ...obraOptions]}
              value={filterObraId}
              onValueChange={setFilterObraId}
              placeholder="Todas"
              searchPlaceholder="Buscar obra..."
              emptyMessage=""
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma NC encontrada.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF</TableHead>
                {!obraId && <TableHead>Obra</TableHead>}
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(nc => (
                <TableRow key={nc.id}>
                  <TableCell className="font-medium text-sm">{getFvmNF(nc.fvm_id)}</TableCell>
                  {!obraId && <TableCell className="text-sm">{getObraName(nc.obra_id)}</TableCell>}
                  <TableCell className="text-sm max-w-[300px] truncate">{nc.description}</TableCell>
                  <TableCell>
                    <Badge variant={nc.status === "aberta" ? "destructive" : "default"}>
                      {nc.status === "aberta" ? "Aberta" : "Resolvida"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(nc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    {nc.status === "aberta" && (
                      <Button size="sm" variant="outline" onClick={() => { setResolveDialog(nc); setResolution(""); }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tratar
                      </Button>
                    )}
                    {nc.status === "resolvida" && nc.resolution && (
                      <span className="text-xs text-muted-foreground" title={nc.resolution}>✓ Tratada</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tratar Não Conformidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{resolveDialog?.description}</p>
            <div className="space-y-1">
              <Label>Resolução / Tratativa</Label>
              <Textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Descreva a tratativa aplicada..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancelar</Button>
            <Button onClick={handleResolve} disabled={!resolution.trim()}>Resolver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NaoConformidades;
