import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface AvaliacaoFormProps {
  onSubmit: (data: {
    pontualidade: number;
    qualidade: number;
    atendimento: number;
    documentacao: number;
    observacoes: string;
  }) => void;
  isLoading?: boolean;
}

const criteria = [
  { key: "pontualidade", label: "Pontualidade na Entrega" },
  { key: "qualidade", label: "Qualidade do Material" },
  { key: "atendimento", label: "Atendimento" },
  { key: "documentacao", label: "Documentação" },
];

const AvaliacaoForm = ({ onSubmit, isLoading }: AvaliacaoFormProps) => {
  const [ratings, setRatings] = useState<Record<string, number>>({ pontualidade: 0, qualidade: 0, atendimento: 0, documentacao: 0 });
  const [observacoes, setObservacoes] = useState("");

  const setRating = (key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const allRated = Object.values(ratings).every(v => v > 0);

  const handleSubmit = () => {
    onSubmit({ ...ratings as any, observacoes });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
      {criteria.map(c => (
        <div key={c.key} className="space-y-2">
          <Label>{c.label}</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} type="button" onClick={() => setRating(c.key, v)} className="p-1 transition-transform hover:scale-110">
                <Star className={`w-6 h-6 ${v <= (ratings[c.key] || 0) ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Comentários sobre o fornecedor..." rows={3} />
      </div>

      <Button onClick={handleSubmit} className="w-full" disabled={!allRated || isLoading}>
        {isLoading ? "Registrando..." : "Concluir Avaliação e Registrar Entrada"}
      </Button>
    </div>
  );
};

export default AvaliacaoForm;
