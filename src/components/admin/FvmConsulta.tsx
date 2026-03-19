import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, CheckCircle2, XCircle, FileText } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface FvmConsultaProps {
  obraId?: string; // if set, filter by this obra
}

const FvmConsulta = ({ obraId }: FvmConsultaProps) => {
  const { obras, insumos } = useInventory();
  const [searchNF, setSearchNF] = useState("");
  const [filterObraId, setFilterObraId] = useState(obraId || "");
  const [selectedFvm, setSelectedFvm] = useState<any>(null);

  const { data: fvms = [], isLoading } = useQuery({
    queryKey: ["fvms_consulta", obraId],
    queryFn: async () => {
      let q = supabase.from("fvms").select("*").order("created_at", { ascending: false });
      if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: allAnswers = [] } = useQuery({
    queryKey: ["fvm_answers_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fvm_answers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["fvm_questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fvm_questions").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Get entradas linked to FVMs to show insumo info
  const fvmIds = fvms.map(f => f.id);
  const { data: entradas = [] } = useQuery({
    queryKey: ["entradas_fvm", fvmIds],
    queryFn: async () => {
      if (fvmIds.length === 0) return [];
      const { data, error } = await supabase.from("entradas").select("*").in("fvm_id", fvmIds);
      if (error) throw error;
      return data;
    },
    enabled: fvmIds.length > 0,
  });

  const obraOptions = obras.map(o => ({ value: o.id, label: o.name }));

  const filtered = useMemo(() => {
    let list = fvms;
    if (filterObraId && !obraId) list = list.filter(f => f.obra_id === filterObraId);
    if (searchNF) {
      const term = searchNF.toLowerCase();
      list = list.filter(f => {
        const nfMatch = f.nota_fiscal?.toLowerCase().includes(term);
        const entradasFvm = entradas.filter(e => e.fvm_id === f.id);
        const insumoMatch = entradasFvm.some(e => {
          const ins = insumos.find(i => i.id === e.insumo_id);
          return ins && (ins.name.toLowerCase().includes(term) || ins.code.toLowerCase().includes(term));
        });
        return nfMatch || insumoMatch;
      });
    }
    return list;
  }, [fvms, filterObraId, searchNF, obraId, entradas, insumos]);

  const getObraName = (id: string) => obras.find(o => o.id === id)?.name || "—";
  const getFvmAnswers = (fvmId: string) => allAnswers.filter(a => a.fvm_id === fvmId);
  const hasNC = (fvmId: string) => getFvmAnswers(fvmId).some(a => !a.conforme);

  const openDetail = (fvm: any) => setSelectedFvm(fvm);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Consulta de FVMs</h3>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] space-y-1">
          <Label className="text-xs text-muted-foreground">Buscar por NF ou Insumo</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="NF ou nome do insumo..." value={searchNF} onChange={e => setSearchNF(e.target.value)} />
          </div>
        </div>
        {!obraId && (
          <div className="w-64 space-y-1">
            <Label className="text-xs text-muted-foreground">Filtrar por Obra</Label>
            <SearchableSelect
              options={[{ value: "", label: "Todas as obras" }, ...obraOptions]}
              value={filterObraId}
              onValueChange={setFilterObraId}
              placeholder="Todas"
              searchPlaceholder="Buscar obra..."
              emptyMessage="Nenhuma obra."
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma FVM encontrada.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF</TableHead>
                {!obraId && <TableHead>Obra</TableHead>}
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NC</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(fvm => (
                <TableRow key={fvm.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(fvm)}>
                  <TableCell className="font-medium">{fvm.nota_fiscal}</TableCell>
                  {!obraId && <TableCell className="text-sm">{getObraName(fvm.obra_id)}</TableCell>}
                  <TableCell className="text-sm">{new Date(fvm.date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant={fvm.status === "aprovada" ? "default" : fvm.status === "reprovada" ? "destructive" : "secondary"}>
                      {fvm.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {hasNC(fvm.id) ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-success" />}
                  </TableCell>
                  <TableCell><FileText className="w-4 h-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedFvm} onOpenChange={() => setSelectedFvm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>FVM — NF {selectedFvm?.nota_fiscal}</DialogTitle>
          </DialogHeader>
          {selectedFvm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Obra:</span> {getObraName(selectedFvm.obra_id)}</div>
                <div><span className="text-muted-foreground">Data:</span> {new Date(selectedFvm.date).toLocaleDateString("pt-BR")}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={selectedFvm.status === "aprovada" ? "default" : selectedFvm.status === "reprovada" ? "destructive" : "secondary"}>{selectedFvm.status}</Badge></div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Respostas</h4>
                {getFvmAnswers(selectedFvm.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem respostas registradas (FVM legado).</p>
                ) : (
                  getFvmAnswers(selectedFvm.id).map(ans => {
                    const q = questions.find(qq => qq.id === ans.question_id);
                    return (
                      <div key={ans.id} className="flex items-start gap-2 p-2 rounded border border-border">
                        {ans.conforme ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-sm">{q?.text || "Pergunta removida"}</p>
                          {ans.observacao && <p className="text-xs text-muted-foreground mt-1">{ans.observacao}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedFvm.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Observações gerais</h4>
                  <p className="text-sm text-muted-foreground">{selectedFvm.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FvmConsulta;
