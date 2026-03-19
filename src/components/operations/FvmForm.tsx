import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText, Upload, Eye, AlertTriangle, Clock } from "lucide-react";

interface FvmAnswer {
  questionId: string;
  conforme: boolean;
  observacao: string;
}

interface FvmFormProps {
  onComplete: (answers: FvmAnswer[], observacoesGerais: string, laudosPorLote?: { insumoId: string; file: File; lote?: string; notaFiscal?: string; fabricanteId?: string }[]) => void;
  onSkip: () => void;
  insumoIds?: string[];
  notaFiscal?: string;
  fabricanteByInsumo?: Record<string, string>; // insumoId -> fabricanteId
}

const FvmForm = ({ onComplete, onSkip, insumoIds = [], notaFiscal = "", fabricanteByInsumo = {} }: FvmFormProps) => {
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const { insumos } = useInventory();
  const [viewingLaudo, setViewingLaudo] = useState<any>(null);
  const [laudosPorLote, setLaudosPorLote] = useState<Record<string, File>>({});

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["fvm_questions_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fvm_questions")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch laudos for the insumos in this entry, filtered by fabricante when available
  const { data: laudos = [] } = useQuery({
    queryKey: ["laudos_for_fvm", insumoIds, fabricanteByInsumo],
    queryFn: async () => {
      if (insumoIds.length === 0) return [];
      const { data, error } = await supabase
        .from("laudos")
        .select("*")
        .in("insumo_id", insumoIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter by fabricante when mapping is provided
      return (data || []).filter((l: any) => {
        const fabId = fabricanteByInsumo[l.insumo_id];
        if (!fabId) return true; // no fabricante selected, show all
        return l.fabricante_id === fabId;
      });
    },
    enabled: insumoIds.length > 0,
  });

  // Fetch fabricantes for display
  const { data: allFabricantes = [] } = useQuery({
    queryKey: ["fabricantes_fvm"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fabricantes").select("id, name").is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const [answers, setAnswers] = useState<Record<string, { conforme: boolean; observacao: string }>>({});

  const setAnswer = (qId: string, conforme: boolean) => {
    setAnswers(prev => ({ ...prev, [qId]: { conforme, observacao: prev[qId]?.observacao || "" } }));
  };

  const setObs = (qId: string, observacao: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { conforme: prev[qId]?.conforme ?? true, observacao } }));
  };

  const allAnswered = questions.every(q => answers[q.id] !== undefined);
  const hasNonConformities = Object.values(answers).some(a => !a.conforme);


  // Check per-lote laudos are provided
  

  const getLaudoStatus = (laudo: any) => {
    if (!laudo.validade) return null;
    const today = new Date();
    const val = new Date(laudo.validade + "T00:00:00");
    const diffDays = Math.ceil((val.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "vencido";
    if (diffDays <= 15) return "proximo";
    return "valido";
  };

  const handleSubmit = () => {
    const result: FvmAnswer[] = questions.map(q => ({
      questionId: q.id,
      conforme: answers[q.id]?.conforme ?? true,
      observacao: answers[q.id]?.observacao || "",
    }));

    const laudoFiles = Object.entries(laudosPorLote).map(([insumoId, file]) => ({
      insumoId,
      file,
      notaFiscal,
    }));

    onComplete(result, observacoesGerais, laudoFiles.length > 0 ? laudoFiles : undefined);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando perguntas FVM...</p>;

  if (questions.length === 0) {
    return (
      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">Nenhuma pergunta de FVM cadastrada. A entrada será registrada sem FVM.</p>
        <Button variant="outline" size="sm" onClick={onSkip}>Continuar sem FVM</Button>
      </div>
    );
  }

  // Group laudos by insumo
  const laudosByInsumo: Record<string, any[]> = {};
  laudos.forEach((l: any) => {
    if (!laudosByInsumo[l.insumo_id]) laudosByInsumo[l.insumo_id] = [];
    laudosByInsumo[l.insumo_id].push(l);
  });

  return (
    <div className="space-y-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Ficha de Verificação de Materiais (FVM)</h3>
        {hasNonConformities && (
          <Badge variant="destructive" className="text-xs">Não conformidade detectada</Badge>
        )}
      </div>

      {/* Laudos section */}
      {insumoIds.length > 0 && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Laudos dos Insumos
          </p>
          {insumoIds.map(id => {
            const insumo = insumos.find(i => i.id === id);
            if (!insumo) return null;
            const tipoLaudo = (insumo as any).tipo_laudo || "nao_controlado";
            const insLaudos = laudosByInsumo[id] || [];

            if (tipoLaudo === "nao_controlado") {
              return (
                <div key={id} className="flex items-center justify-between py-1">
                  <span className="text-sm">{insumo.name}</span>
                  <Badge variant="outline" className="text-xs">Sem controle de laudo</Badge>
                </div>
              );
            }

            if (tipoLaudo === "global") {
              const latestLaudo = insLaudos[0];
              const status = latestLaudo ? getLaudoStatus(latestLaudo) : null;
              return (
                <div key={id} className="flex items-center justify-between py-1 gap-2">
                  <span className="text-sm flex-1">{insumo.name}</span>
                  {latestLaudo ? (
                    <div className="flex items-center gap-1">
                      {status === "vencido" && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>}
                      {status === "proximo" && <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Vence em breve</Badge>}
                      {status === "valido" && <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Válido</Badge>}
                      {status === null && <Badge variant="outline" className="text-xs">Sem validade</Badge>}
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setViewingLaudo(latestLaudo)}>
                        <Eye className="w-3 h-3 mr-1" />Ver Laudo
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Sem laudo cadastrado</Badge>
                  )}
                </div>
              );
            }

            if (tipoLaudo === "por_lote") {
              return (
                <div key={id} className="flex items-center justify-between py-1 gap-2">
                  <span className="text-sm flex-1">{insumo.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Laudo por lote/NF</Badge>
                    {laudosPorLote[id] ? (
                      <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                        {laudosPorLote[id].name}
                      </Badge>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) setLaudosPorLote(prev => ({ ...prev, [id]: file }));
                          }}
                        />
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                          <Upload className="w-3 h-3" />Anexar Laudo
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const ans = answers[q.id];
          return (
            <div key={q.id} className="space-y-2 p-3 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-muted-foreground mt-0.5">{idx + 1}.</span>
                <p className="text-sm flex-1">{q.text}</p>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={ans?.conforme === true ? "default" : "outline"}
                    className="h-8 px-3 text-xs"
                    onClick={() => setAnswer(q.id, true)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conforme
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={ans?.conforme === false ? "destructive" : "outline"}
                    className="h-8 px-3 text-xs"
                    onClick={() => setAnswer(q.id, false)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> NC
                  </Button>
                </div>
              </div>
              {ans?.conforme === false && (
                <div className="ml-6">
                  <Label className="text-xs text-muted-foreground">Observação da NC</Label>
                  <Textarea
                    value={ans.observacao}
                    onChange={e => setObs(q.id, e.target.value)}
                    placeholder="Descreva a não conformidade..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Observações gerais (opcional)</Label>
        <Textarea value={observacoesGerais} onChange={e => setObservacoesGerais(e.target.value)} rows={2} placeholder="Observações adicionais..." />
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} disabled={!allAnswered} className="flex-1">
          {hasNonConformities ? "Registrar com NC" : "Confirmar FVM"}
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="text-xs text-muted-foreground">
          Pular
        </Button>
      </div>

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

export default FvmForm;
