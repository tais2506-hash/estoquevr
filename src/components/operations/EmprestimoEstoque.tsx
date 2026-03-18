import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, HandCoins, Check, X, RotateCcw, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const EmprestimoEstoque = ({ onBack }: { onBack: () => void }) => {
  const { obras, selectedObraId, getEstoqueByObra, insumos, estoque } = useInventory();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("solicitar");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    obraEmprestadoraId: "",
    insumoId: "",
    quantity: "",
    dataPrevistaDevolucao: "",
    observacoes: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Query empréstimos related to current obra
  const { data: emprestimos = [], refetch: refetchEmprestimos } = useQuery({
    queryKey: ["emprestimos", selectedObraId],
    queryFn: async () => {
      if (!selectedObraId) return [];
      const { data, error } = await supabase
        .from("emprestimos")
        .select("*")
        .or(`obra_solicitante_id.eq.${selectedObraId},obra_emprestadora_id.eq.${selectedObraId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedObraId,
  });

  const obraAtual = obras.find(o => o.id === selectedObraId);
  const outrasObras = obras.filter(o => o.id !== selectedObraId);

  // Solicitações feitas por esta obra (pendentes de aprovação da outra obra)
  const solicitacoesPendentes = emprestimos.filter(
    e => e.obra_solicitante_id === selectedObraId && e.status === "pendente"
  );

  // Pedidos recebidos (outras obras pediram emprestado desta obra)
  const pedidosRecebidos = emprestimos.filter(
    e => e.obra_emprestadora_id === selectedObraId && e.status === "pendente"
  );

  // Empréstimos ativos (aprovados, aguardando devolução)
  const emprestimosAtivos = emprestimos.filter(
    e => e.status === "aprovado"
  );

  // Empréstimos atrasados
  const emprestimosAtrasados = emprestimosAtivos.filter(e => {
    const hoje = new Date().toISOString().split("T")[0];
    return e.data_prevista_devolucao < hoje;
  });

  // Histórico (devolvidos + rejeitados)
  const historico = emprestimos.filter(
    e => e.status === "devolvido" || e.status === "rejeitado"
  );

  const obraOptions = useMemo(() =>
    outrasObras.map(o => ({ value: o.id, label: o.name })),
    [outrasObras]
  );

  // Insumos do estoque da obra emprestadora selecionada
  const estoqueEmprestadora = formData.obraEmprestadoraId
    ? getEstoqueByObra(formData.obraEmprestadoraId)
    : [];

  const insumoOptions = useMemo(() =>
    estoqueEmprestadora.map(e => ({
      value: e.insumo_id,
      label: `${e.insumo.name} — Disp: ${e.quantity} ${e.insumo.unit}`,
      searchTerms: insumos.find(i => i.id === e.insumo_id)?.code || "",
    })),
    [estoqueEmprestadora, insumos]
  );

  const selectedItem = estoqueEmprestadora.find(e => e.insumo_id === formData.insumoId);
  const maxQty = selectedItem?.quantity || 0;

  const getObraName = (id: string) => obras.find(o => o.id === id)?.name || "—";
  const getInsumoName = (id: string) => insumos.find(i => i.id === id)?.name || "—";
  const getInsumoUnit = (id: string) => insumos.find(i => i.id === id)?.unit || "";

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user || isSubmitting) return;
    const qty = parseFloat(formData.quantity);
    if (!formData.obraEmprestadoraId || !formData.insumoId || !qty || !formData.dataPrevistaDevolucao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (qty > maxQty) {
      toast.error("Quantidade maior que o disponível");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("emprestimos").insert({
        obra_solicitante_id: selectedObraId,
        obra_emprestadora_id: formData.obraEmprestadoraId,
        insumo_id: formData.insumoId,
        quantity: qty,
        date: formData.date,
        data_prevista_devolucao: formData.dataPrevistaDevolucao,
        status: "pendente",
        solicitante_user_id: user.id,
        solicitante_nome: user.name || user.email || "",
        observacoes: formData.observacoes || null,
      } as any);
      if (error) throw error;
      toast.success("Solicitação de empréstimo enviada!");
      setFormData({ obraEmprestadoraId: "", insumoId: "", quantity: "", dataPrevistaDevolucao: "", observacoes: "", date: new Date().toISOString().split("T")[0] });
      refetchEmprestimos();
      setTab("pendentes");
    } catch (err) {
      toast.error("Erro ao solicitar empréstimo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAprovar = async (empId: string) => {
    if (!user) return;
    try {
      const emp = emprestimos.find(e => e.id === empId);
      if (!emp) return;

      // Update empréstimo status
      const { error } = await supabase.from("emprestimos").update({
        status: "aprovado",
        aprovador_user_id: user.id,
        aprovador_nome: user.name || user.email || "",
      } as any).eq("id", empId);
      if (error) throw error;

      // Move stock: remove from emprestadora, add to solicitante
      const estoqueItem = estoque.find(e => e.obra_id === emp.obra_emprestadora_id && e.insumo_id === emp.insumo_id);
      const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;

      // Decrease from lender
      const { data: existOrig } = await supabase.from("estoque").select("*").eq("obra_id", emp.obra_emprestadora_id).eq("insumo_id", emp.insumo_id).single();
      if (existOrig) {
        const newQty = existOrig.quantity - emp.quantity;
        const newTotal = existOrig.total_value - (emp.quantity * unitCost);
        const newAvg = newQty > 0 ? newTotal / newQty : 0;
        await supabase.from("estoque").update({ quantity: newQty, total_value: newTotal, average_unit_cost: newAvg }).eq("id", existOrig.id);
      }

      // Increase in borrower
      const { data: existDest } = await supabase.from("estoque").select("*").eq("obra_id", emp.obra_solicitante_id).eq("insumo_id", emp.insumo_id).single();
      if (existDest) {
        const newQty = existDest.quantity + emp.quantity;
        const newTotal = existDest.total_value + (emp.quantity * unitCost);
        const newAvg = newQty > 0 ? newTotal / newQty : 0;
        await supabase.from("estoque").update({ quantity: newQty, total_value: newTotal, average_unit_cost: newAvg }).eq("id", existDest.id);
      } else {
        await supabase.from("estoque").insert({
          obra_id: emp.obra_solicitante_id, insumo_id: emp.insumo_id,
          quantity: emp.quantity, total_value: emp.quantity * unitCost,
          average_unit_cost: unitCost,
        });
      }

      // Log movimentações
      const userId = user.id;
      const userName = user.name || "";
      await supabase.from("movimentacoes").insert({
        obra_id: emp.obra_emprestadora_id, insumo_id: emp.insumo_id,
        type: "transferencia_saida" as any, quantity: emp.quantity, date: emp.date,
        description: `Empréstimo para ${getObraName(emp.obra_solicitante_id)}`,
        reference_id: empId, user_id: userId, user_name: userName,
      });
      await supabase.from("movimentacoes").insert({
        obra_id: emp.obra_solicitante_id, insumo_id: emp.insumo_id,
        type: "transferencia_entrada" as any, quantity: emp.quantity, date: emp.date,
        description: `Empréstimo de ${getObraName(emp.obra_emprestadora_id)}`,
        reference_id: empId, user_id: userId, user_name: userName,
      });

      toast.success("Empréstimo aprovado! Estoque movimentado.");
      refetchEmprestimos();
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
    } catch (err) {
      toast.error("Erro ao aprovar empréstimo");
    }
  };

  const handleRejeitar = async (empId: string) => {
    try {
      const { error } = await supabase.from("emprestimos").update({
        status: "rejeitado",
        aprovador_user_id: user?.id,
        aprovador_nome: user?.name || user?.email || "",
      } as any).eq("id", empId);
      if (error) throw error;
      toast.success("Empréstimo rejeitado.");
      refetchEmprestimos();
    } catch (err) {
      toast.error("Erro ao rejeitar");
    }
  };

  const handleDevolver = async (empId: string) => {
    if (!user) return;
    try {
      const emp = emprestimos.find(e => e.id === empId);
      if (!emp) return;

      // Update status
      const { error } = await supabase.from("emprestimos").update({
        status: "devolvido",
        data_devolucao: new Date().toISOString().split("T")[0],
      } as any).eq("id", empId);
      if (error) throw error;

      // Reverse stock: remove from solicitante, add to emprestadora
      const estoqueItem = estoque.find(e => e.obra_id === emp.obra_solicitante_id && e.insumo_id === emp.insumo_id);
      const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;

      // Decrease from borrower
      const { data: existBorrow } = await supabase.from("estoque").select("*").eq("obra_id", emp.obra_solicitante_id).eq("insumo_id", emp.insumo_id).single();
      if (existBorrow) {
        const newQty = existBorrow.quantity - emp.quantity;
        const newTotal = existBorrow.total_value - (emp.quantity * unitCost);
        const newAvg = newQty > 0 ? newTotal / newQty : 0;
        await supabase.from("estoque").update({ quantity: newQty, total_value: newTotal, average_unit_cost: newAvg }).eq("id", existBorrow.id);
      }

      // Increase in lender
      const { data: existLend } = await supabase.from("estoque").select("*").eq("obra_id", emp.obra_emprestadora_id).eq("insumo_id", emp.insumo_id).single();
      if (existLend) {
        const newQty = existLend.quantity + emp.quantity;
        const newTotal = existLend.total_value + (emp.quantity * unitCost);
        const newAvg = newQty > 0 ? newTotal / newQty : 0;
        await supabase.from("estoque").update({ quantity: newQty, total_value: newTotal, average_unit_cost: newAvg }).eq("id", existLend.id);
      } else {
        await supabase.from("estoque").insert({
          obra_id: emp.obra_emprestadora_id, insumo_id: emp.insumo_id,
          quantity: emp.quantity, total_value: emp.quantity * unitCost,
          average_unit_cost: unitCost,
        });
      }

      // Log movimentações
      const userName = user.name || "";
      await supabase.from("movimentacoes").insert({
        obra_id: emp.obra_solicitante_id, insumo_id: emp.insumo_id,
        type: "transferencia_saida" as any, quantity: emp.quantity,
        date: new Date().toISOString().split("T")[0],
        description: `Devolução empréstimo para ${getObraName(emp.obra_emprestadora_id)}`,
        reference_id: empId, user_id: user.id, user_name: userName,
      });
      await supabase.from("movimentacoes").insert({
        obra_id: emp.obra_emprestadora_id, insumo_id: emp.insumo_id,
        type: "transferencia_entrada" as any, quantity: emp.quantity,
        date: new Date().toISOString().split("T")[0],
        description: `Devolução empréstimo de ${getObraName(emp.obra_solicitante_id)}`,
        reference_id: empId, user_id: user.id, user_name: userName,
      });

      toast.success("Devolução registrada! Estoque restaurado.");
      refetchEmprestimos();
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
    } catch (err) {
      toast.error("Erro ao registrar devolução");
    }
  };

  const statusBadge = (status: string, dataPrevista?: string) => {
    const hoje = new Date().toISOString().split("T")[0];
    const atrasado = status === "aprovado" && dataPrevista && dataPrevista < hoje;
    
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { label: "Pendente", variant: "outline" },
      aprovado: { label: atrasado ? "Atrasado" : "Emprestado", variant: atrasado ? "destructive" : "default" },
      devolvido: { label: "Devolvido", variant: "secondary" },
      rejeitado: { label: "Rejeitado", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={info.variant}>{atrasado && <AlertTriangle className="w-3 h-3 mr-1" />}{info.label}</Badge>;
  };

  const renderEmprestimoRow = (emp: any, showActions: "aprovar" | "devolver" | "none") => {
    const isSolicitante = emp.obra_solicitante_id === selectedObraId;
    const outraObra = isSolicitante ? getObraName(emp.obra_emprestadora_id) : getObraName(emp.obra_solicitante_id);
    const hoje = new Date().toISOString().split("T")[0];
    const atrasado = emp.status === "aprovado" && emp.data_prevista_devolucao < hoje;

    return (
      <tr key={emp.id} className={`border-b border-border/50 last:border-0 ${atrasado ? "bg-destructive/5" : ""}`}>
        <td className="p-3 text-foreground whitespace-nowrap">{emp.date}</td>
        <td className="p-3 text-foreground">{getInsumoName(emp.insumo_id)}</td>
        <td className="p-3 text-right font-mono text-foreground">{emp.quantity} {getInsumoUnit(emp.insumo_id)}</td>
        <td className="p-3 text-foreground text-sm">{outraObra}</td>
        <td className="p-3 text-foreground text-sm whitespace-nowrap">{emp.data_prevista_devolucao}</td>
        <td className="p-3">{statusBadge(emp.status, emp.data_prevista_devolucao)}</td>
        <td className="p-3">
          {showActions === "aprovar" && emp.status === "pendente" && (
            <div className="flex gap-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" size="sm"><Check className="w-3 h-3 mr-1" />Aprovar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Aprovar Empréstimo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma emprestar <strong>{emp.quantity} {getInsumoUnit(emp.insumo_id)}</strong> de <strong>{getInsumoName(emp.insumo_id)}</strong> para <strong>{getObraName(emp.obra_solicitante_id)}</strong>?
                      O estoque será movimentado automaticamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAprovar(emp.id)}>Aprovar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="destructive" size="sm" onClick={() => handleRejeitar(emp.id)}><X className="w-3 h-3" /></Button>
            </div>
          )}
          {showActions === "devolver" && emp.status === "aprovado" && isSolicitante && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm"><RotateCcw className="w-3 h-3 mr-1" />Devolver</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Registrar Devolução</AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirma a devolução de <strong>{emp.quantity} {getInsumoUnit(emp.insumo_id)}</strong> de <strong>{getInsumoName(emp.insumo_id)}</strong> para <strong>{getObraName(emp.obra_emprestadora_id)}</strong>?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDevolver(emp.id)}>Confirmar Devolução</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </td>
      </tr>
    );
  };

  const tableHeader = (
    <thead>
      <tr className="border-b border-border bg-muted/50">
        <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
        <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
        <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
        <th className="text-left p-3 font-medium text-muted-foreground">Obra</th>
        <th className="text-left p-3 font-medium text-muted-foreground">Prev. Devolução</th>
        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        <th className="text-left p-3 font-medium text-muted-foreground">Ações</th>
      </tr>
    </thead>
  );

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-2">Empréstimo entre Obras</h2>
      <p className="text-sm text-muted-foreground mb-6">Solicite, aprove e controle devoluções de materiais emprestados.</p>

      {/* Alert for overdue loans */}
      {emprestimosAtrasados.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">
              {emprestimosAtrasados.length} empréstimo(s) com devolução atrasada!
            </p>
            {emprestimosAtrasados.map(emp => (
              <p key={emp.id} className="text-sm text-foreground mt-1">
                <strong>{getInsumoName(emp.insumo_id)}</strong> — {emp.quantity} {getInsumoUnit(emp.insumo_id)} —
                Previsto: {emp.data_prevista_devolucao} —
                {emp.obra_solicitante_id === selectedObraId
                  ? <span className="text-destructive font-medium"> Você deve devolver</span>
                  : <span> Emprestado para {getObraName(emp.obra_solicitante_id)}</span>
                }
              </p>
            ))}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="solicitar">Solicitar</TabsTrigger>
          <TabsTrigger value="pendentes" className="relative">
            Recebidos
            {pedidosRecebidos.length > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pedidosRecebidos.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ativos">
            Ativos
            {emprestimosAtivos.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {emprestimosAtivos.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ===== TAB: SOLICITAR ===== */}
        <TabsContent value="solicitar">
          <form onSubmit={handleSolicitar} className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-lg">
            <div className="space-y-2">
              <Label>Obra que irá emprestar</Label>
              <SearchableSelect
                options={obraOptions}
                value={formData.obraEmprestadoraId}
                onValueChange={v => setFormData(p => ({ ...p, obraEmprestadoraId: v, insumoId: "" }))}
                placeholder="Selecione a obra"
                searchPlaceholder="Buscar obra..."
                emptyMessage="Nenhuma obra encontrada."
              />
            </div>

            <div className="space-y-2">
              <Label>Insumo</Label>
              <SearchableSelect
                options={insumoOptions}
                value={formData.insumoId}
                onValueChange={v => setFormData(p => ({ ...p, insumoId: v }))}
                placeholder="Selecione o insumo"
                searchPlaceholder="Buscar por nome ou código..."
                emptyMessage={formData.obraEmprestadoraId ? "Nenhum insumo encontrado." : "Selecione uma obra primeiro."}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min="0" max={maxQty} step="any" value={formData.quantity}
                  onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data Prevista de Devolução *</Label>
              <Input type="date" value={formData.dataPrevistaDevolucao}
                min={formData.date}
                onChange={e => setFormData(p => ({ ...p, dataPrevistaDevolucao: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} placeholder="Motivo do empréstimo..."
                onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Solicitar Empréstimo"}
            </Button>
          </form>

          {/* Minhas solicitações pendentes */}
          {solicitacoesPendentes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Suas solicitações pendentes
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    {tableHeader}
                    <tbody>
                      {solicitacoesPendentes.map(emp => renderEmprestimoRow(emp, "none"))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== TAB: PEDIDOS RECEBIDOS ===== */}
        <TabsContent value="pendentes">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeader}
                <tbody>
                  {pedidosRecebidos.map(emp => renderEmprestimoRow(emp, "aprovar"))}
                  {pedidosRecebidos.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum pedido de empréstimo recebido</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB: ATIVOS ===== */}
        <TabsContent value="ativos">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeader}
                <tbody>
                  {emprestimosAtivos.map(emp => renderEmprestimoRow(emp, "devolver"))}
                  {emprestimosAtivos.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum empréstimo ativo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB: HISTÓRICO ===== */}
        <TabsContent value="historico">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeader}
                <tbody>
                  {historico.map(emp => renderEmprestimoRow(emp, "none"))}
                  {historico.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum registro no histórico</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmprestimoEstoque;
