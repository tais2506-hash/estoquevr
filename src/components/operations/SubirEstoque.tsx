import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { ArrowLeft, ArrowUp, FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import FVMForm from "@/components/operations/FVMForm";
import AvaliacaoForm from "@/components/operations/AvaliacaoForm";
import ImportarPlanilha from "@/components/operations/ImportarPlanilha";

type Step = "choose" | "manual" | "importar" | "fvm" | "avaliacao" | "done";

const SubirEstoque = ({ onBack }: { onBack: () => void }) => {
  const { insumos, fornecedores, selectedObraId, addEntrada, addFVM, addAvaliacao } = useInventory();
  const [step, setStep] = useState<Step>("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    insumoId: "", notaFiscal: "", fornecedorId: "", quantity: "", unitValue: "", date: new Date().toISOString().split("T")[0],
  });
  const [fvmId, setFvmId] = useState("");

  const totalValue = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitValue) || 0);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.insumoId || !formData.notaFiscal || !formData.fornecedorId || !formData.quantity || !formData.unitValue) {
      toast.error("Preencha todos os campos");
      return;
    }
    setStep("fvm");
  };

  const handleFVMComplete = async (data: { quantidadeConferida: boolean; qualidadeMaterial: boolean; documentacaoOk: boolean; observacoes: string; status: "aprovada" | "reprovada" }) => {
    if (!selectedObraId) return;
    try {
      const id = await addFVM({
        obraId: selectedObraId, notaFiscal: formData.notaFiscal, fornecedorId: formData.fornecedorId,
        date: formData.date, ...data,
      });
      setFvmId(id);
      setStep("avaliacao");
    } catch (err) {
      toast.error("Erro ao salvar FVM");
    }
  };

  const handleAvaliacaoComplete = async (data: { pontualidade: number; qualidade: number; atendimento: number; documentacao: number; observacoes: string }) => {
    if (!selectedObraId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const avId = await addAvaliacao({
        obraId: selectedObraId, fornecedorId: formData.fornecedorId, notaFiscal: formData.notaFiscal,
        date: formData.date, ...data,
      });

      await addEntrada({
        obraId: selectedObraId, insumoId: formData.insumoId, notaFiscal: formData.notaFiscal,
        fornecedorId: formData.fornecedorId, quantity: parseFloat(formData.quantity),
        unitValue: parseFloat(formData.unitValue), totalValue, date: formData.date,
        fvmId, avaliacaoId: avId,
      });

      toast.success("Entrada registrada com sucesso!");
      setStep("done");
    } catch (err) {
      toast.error("Erro ao registrar entrada");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <ArrowUp className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Entrada Registrada!</h2>
        <p className="text-muted-foreground mb-6">A FVM e avaliação do fornecedor foram concluídas.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onBack}>Voltar ao Menu</Button>
          <Button onClick={() => { setStep("choose"); setFormData({ insumoId: "", notaFiscal: "", fornecedorId: "", quantity: "", unitValue: "", date: new Date().toISOString().split("T")[0] }); }}>
            Nova Entrada
          </Button>
        </div>
      </div>
    );
  }

  if (step === "fvm") {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setStep("manual")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">FVM - Ficha de Verificação de Material</h2>
        <p className="text-sm text-muted-foreground mb-4">NF: {formData.notaFiscal}</p>
        <FVMForm onSubmit={handleFVMComplete} />
      </div>
    );
  }

  if (step === "avaliacao") {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-foreground mb-6">Avaliação do Fornecedor</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {fornecedores.find(f => f.id === formData.fornecedorId)?.name} — NF: {formData.notaFiscal}
        </p>
        <AvaliacaoForm onSubmit={handleAvaliacaoComplete} isLoading={isSubmitting} />
      </div>
    );
  }

  if (step === "importar") {
    return <ImportarPlanilha onBack={() => setStep("choose")} />;
  }

  if (step === "choose") {
    return (
      <div className="animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">Subir Estoque</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => setStep("manual")} className="operation-btn">
            <Plus className="w-10 h-10 text-success" strokeWidth={1.5} />
            <span className="font-semibold text-foreground">Entrada Manual</span>
            <span className="text-xs text-muted-foreground">Cadastrar item a item</span>
          </button>
          <button onClick={() => setStep("importar")} className="operation-btn">
            <FileSpreadsheet className="w-10 h-10 text-info" strokeWidth={1.5} />
            <span className="font-semibold text-foreground">Importar Planilha</span>
            <span className="text-xs text-muted-foreground">Excel (.xlsx) - GRD Realizado</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => setStep("choose")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <h2 className="text-xl font-bold text-foreground mb-6">Entrada Manual</h2>

      <form onSubmit={handleManualSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Insumo</Label>
          <Select value={formData.insumoId} onValueChange={v => setFormData(p => ({ ...p, insumoId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
            <SelectContent>
              {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nota Fiscal</Label>
            <Input value={formData.notaFiscal} onChange={e => setFormData(p => ({ ...p, notaFiscal: e.target.value }))} placeholder="NF-0000" />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fornecedor</Label>
          <Select value={formData.fornecedorId} onValueChange={v => setFormData(p => ({ ...p, fornecedorId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
            <SelectContent>
              {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input type="number" min="0" step="any" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Valor Unitário (R$)</Label>
            <Input type="number" min="0" step="0.01" value={formData.unitValue} onChange={e => setFormData(p => ({ ...p, unitValue: e.target.value }))} />
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>

        <Button type="submit" className="w-full">Prosseguir para FVM</Button>
      </form>
    </div>
  );
};

export default SubirEstoque;
