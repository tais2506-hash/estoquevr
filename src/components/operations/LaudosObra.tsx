import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, FileText, Search, Eye, AlertTriangle, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LaudosObraProps {
  obraId: string;
  onBack: () => void;
}

const LaudosObra = ({ obraId, onBack }: LaudosObraProps) => {
  const { insumos } = useInventory();
  const [search, setSearch] = useState("");
  const [viewingLaudo, setViewingLaudo] = useState<any>(null);

  const { data: laudos = [], isLoading } = useQuery({
    queryKey: ["laudos_obra", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laudos")
        .select("*")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!obraId,
  });

  const { data: fabricantes = [] } = useQuery({
    queryKey: ["fabricantes_laudos_obra"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fabricantes").select("id, name").is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const getFabricanteName = (id: string | null) => {
    if (!id) return null;
    return fabricantes.find(f => f.id === id)?.name || null;
  };

  const getInsumo = (id: string) => insumos.find(i => i.id === id);

  const getLaudoStatus = (laudo: any) => {
    if (!laudo.validade) return null;
    const today = new Date();
    const val = new Date(laudo.validade + "T00:00:00");
    const diffDays = Math.ceil((val.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "vencido";
    if (diffDays <= 15) return "proximo";
    return "valido";
  };

  // Group laudos by insumo
  const groupedByInsumo = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = laudos.filter(l => {
      if (words.length === 0) return true;
      const ins = getInsumo(l.insumo_id);
      const fab = getFabricanteName(l.fabricante_id);
      const haystack = `${ins?.name || ""} ${ins?.code || ""} ${l.nota_fiscal || ""} ${fab || ""} ${l.lote || ""}`.toLowerCase();
      return words.every(w => haystack.includes(w));
    });

    const groups: Record<string, { insumo: any; laudos: any[] }> = {};
    filtered.forEach(l => {
      const ins = getInsumo(l.insumo_id);
      if (!groups[l.insumo_id]) {
        groups[l.insumo_id] = { insumo: ins, laudos: [] };
      }
      groups[l.insumo_id].laudos.push(l);
    });
    return Object.values(groups).sort((a, b) =>
      (a.insumo?.name || "").localeCompare(b.insumo?.name || "")
    );
  }, [laudos, search, insumos, fabricantes]);

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          Laudos da Obra
        </h2>
        <Badge variant="outline">{laudos.length} laudo(s)</Badge>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por insumo, NF, fabricante, lote..."
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando laudos...</p>
      ) : groupedByInsumo.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{laudos.length === 0 ? "Nenhum laudo cadastrado para esta obra." : "Nenhum resultado encontrado."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByInsumo.map(group => (
            <div key={group.insumo?.id || "unknown"} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">
                  {group.insumo?.name || "Insumo não encontrado"}
                </h3>
                <p className="text-xs text-muted-foreground">{group.insumo?.code} — {group.insumo?.unit}</p>
              </div>
              <div className="divide-y divide-border">
                {group.laudos.map(laudo => {
                  const status = getLaudoStatus(laudo);
                  const fabName = getFabricanteName(laudo.fabricante_id);
                  return (
                    <div key={laudo.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">{laudo.file_name}</span>
                          {status === "vencido" && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              <AlertTriangle className="w-3 h-3 mr-1" />Vencido
                            </Badge>
                          )}
                          {status === "proximo" && (
                            <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">
                              <Clock className="w-3 h-3 mr-1" />Vence em breve
                            </Badge>
                          )}
                          {status === "valido" && (
                            <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">Válido</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {laudo.nota_fiscal && <span>NF: {laudo.nota_fiscal}</span>}
                          {fabName && <span>Fabricante: {fabName}</span>}
                          {laudo.lote && <span>Lote: {laudo.lote}</span>}
                          {laudo.validade && (
                            <span>Validade: {new Date(laudo.validade + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                          )}
                          <span>Cadastro: {new Date(laudo.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewingLaudo(laudo)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />Ver
                        </Button>
                        <a href={laudo.file_url} download={laudo.file_name} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Laudo Viewer Dialog */}
      <Dialog open={!!viewingLaudo} onOpenChange={open => !open && setViewingLaudo(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Laudo</DialogTitle>
          </DialogHeader>
          {viewingLaudo && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{viewingLaudo.file_name}</Badge>
                {viewingLaudo.nota_fiscal && <Badge variant="outline" className="text-xs">NF: {viewingLaudo.nota_fiscal}</Badge>}
                {getFabricanteName(viewingLaudo.fabricante_id) && (
                  <Badge variant="outline" className="text-xs">Fab: {getFabricanteName(viewingLaudo.fabricante_id)}</Badge>
                )}
                {viewingLaudo.lote && <Badge variant="outline" className="text-xs">Lote: {viewingLaudo.lote}</Badge>}
                {viewingLaudo.validade && (
                  <Badge variant="outline" className="text-xs">
                    Validade: {new Date(viewingLaudo.validade + "T00:00:00").toLocaleDateString("pt-BR")}
                  </Badge>
                )}
              </div>
              {viewingLaudo.file_url?.toLowerCase().endsWith(".pdf") || viewingLaudo.file_name?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={viewingLaudo.file_url} className="w-full h-[60vh]" title="Laudo" />
              ) : (
                <img src={viewingLaudo.file_url} alt="Laudo" className="max-w-full max-h-[60vh] object-contain rounded-lg mx-auto" />
              )}
              <a href={viewingLaudo.file_url} download={viewingLaudo.file_name} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">Baixar Laudo</Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaudosObra;
