import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface FVMFormProps {
  onSubmit: (data: {
    quantidadeConferida: boolean;
    qualidadeMaterial: boolean;
    documentacaoOk: boolean;
    observacoes: string;
    status: "aprovada" | "reprovada";
  }) => void;
}

const FVMForm = ({ onSubmit }: FVMFormProps) => {
  const [quantidadeConferida, setQuantidadeConferida] = useState(false);
  const [qualidadeMaterial, setQualidadeMaterial] = useState(false);
  const [documentacaoOk, setDocumentacaoOk] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const allChecked = quantidadeConferida && qualidadeMaterial && documentacaoOk;

  const handleSubmit = (approved: boolean) => {
    onSubmit({
      quantidadeConferida, qualidadeMaterial, documentacaoOk, observacoes,
      status: approved ? "aprovada" : "reprovada",
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox checked={quantidadeConferida} onCheckedChange={v => setQuantidadeConferida(!!v)} id="qty" />
          <Label htmlFor="qty" className="cursor-pointer">Quantidade conferida e conforme</Label>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox checked={qualidadeMaterial} onCheckedChange={v => setQualidadeMaterial(!!v)} id="qual" />
          <Label htmlFor="qual" className="cursor-pointer">Qualidade do material aprovada</Label>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox checked={documentacaoOk} onCheckedChange={v => setDocumentacaoOk(!!v)} id="doc" />
          <Label htmlFor="doc" className="cursor-pointer">Documentação OK (NF, certificados)</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações sobre o material recebido..." rows={3} />
      </div>

      <div className="flex gap-3">
        <Button onClick={() => handleSubmit(true)} className="flex-1" disabled={!allChecked}>
          Aprovar FVM
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(false)} className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10">
          Reprovar
        </Button>
      </div>
    </div>
  );
};

export default FVMForm;
