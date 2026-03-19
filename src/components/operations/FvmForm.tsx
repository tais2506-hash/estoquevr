import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface FvmAnswer {
  questionId: string;
  conforme: boolean;
  observacao: string;
}

interface FvmFormProps {
  onComplete: (answers: FvmAnswer[], observacoesGerais: string) => void;
  onSkip: () => void;
}

const FvmForm = ({ onComplete, onSkip }: FvmFormProps) => {
  const [observacoesGerais, setObservacoesGerais] = useState("");

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

  const [answers, setAnswers] = useState<Record<string, { conforme: boolean; observacao: string }>>({});

  const setAnswer = (qId: string, conforme: boolean) => {
    setAnswers(prev => ({ ...prev, [qId]: { conforme, observacao: prev[qId]?.observacao || "" } }));
  };

  const setObs = (qId: string, observacao: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { conforme: prev[qId]?.conforme ?? true, observacao } }));
  };

  const allAnswered = questions.every(q => answers[q.id] !== undefined);
  const hasNonConformities = Object.values(answers).some(a => !a.conforme);

  const handleSubmit = () => {
    const result: FvmAnswer[] = questions.map(q => ({
      questionId: q.id,
      conforme: answers[q.id]?.conforme ?? true,
      observacao: answers[q.id]?.observacao || "",
    }));
    onComplete(result, observacoesGerais);
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

  return (
    <div className="space-y-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Ficha de Verificação de Materiais (FVM)</h3>
        {hasNonConformities && (
          <Badge variant="destructive" className="text-xs">Não conformidade detectada</Badge>
        )}
      </div>

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
    </div>
  );
};

export default FvmForm;
