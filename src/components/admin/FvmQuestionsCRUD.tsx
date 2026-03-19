import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const FvmQuestionsCRUD = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [text, setText] = useState("");

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["fvm_questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fvm_questions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const openNew = () => { setEditing(null); setText(""); setDialogOpen(true); };
  const openEdit = (q: any) => { setEditing(q); setText(q.text); setDialogOpen(true); };

  const handleSave = async () => {
    if (!text.trim()) { toast.error("Informe o texto da pergunta"); return; }
    if (editing) {
      const { error } = await supabase.from("fvm_questions").update({ text: text.trim() }).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Pergunta atualizada");
    } else {
      const maxOrder = questions.length > 0 ? Math.max(...questions.map(q => q.sort_order)) + 1 : 0;
      const { error } = await supabase.from("fvm_questions").insert({ text: text.trim(), sort_order: maxOrder });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Pergunta criada");
    }
    queryClient.invalidateQueries({ queryKey: ["fvm_questions"] });
    setDialogOpen(false);
  };

  const toggleActive = async (q: any) => {
    const { error } = await supabase.from("fvm_questions").update({ active: !q.active }).eq("id", q.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    queryClient.invalidateQueries({ queryKey: ["fvm_questions"] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fvm_questions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Pergunta excluída");
    queryClient.invalidateQueries({ queryKey: ["fvm_questions"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Perguntas da FVM</h3>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nova Pergunta</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure as perguntas que serão exibidas na Ficha de Verificação de Materiais durante a entrada de estoque. Cada pergunta será respondida como Conforme ou Não Conforme.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
              <span className={`flex-1 text-sm ${q.active ? "text-foreground" : "text-muted-foreground line-through"}`}>{q.text}</span>
              <Switch checked={q.active} onCheckedChange={() => toggleActive(q)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(q.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Texto da pergunta</Label>
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Ex: O material está em conformidade com o pedido?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FvmQuestionsCRUD;
