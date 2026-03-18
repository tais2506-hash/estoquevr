import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, ArrowLeftRight, ClipboardList, Building2, LogOut, ArrowLeft, Package, FileText, History, Undo2, Search, Globe, Trash2, Loader2, HandCoins, ShoppingCart, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SubirEstoque from "@/components/operations/SubirEstoque";
import BaixarEstoque from "@/components/operations/BaixarEstoque";
import TransferenciaEstoque from "@/components/operations/TransferenciaEstoque";
import InventarioConferencia from "@/components/operations/InventarioConferencia";
import RequisicaoCanteiro from "@/components/operations/RequisicaoCanteiro";
import EmprestimoEstoque from "@/components/operations/EmprestimoEstoque";
import KitsCRUD from "@/components/admin/KitsCRUD";
import OrdensCompra from "@/components/operations/OrdensCompra";

type OperationView = "menu" | "subir" | "baixar" | "transferir" | "inventario" | "requisicao" | "emprestimo" | "kits" | "oc";

const operations = [
  { key: "subir" as const, label: "Subir Estoque", icon: ArrowUp, description: "Entrada de materiais", color: "text-success", permission: "estoque.entrada.criar" },
  { key: "baixar" as const, label: "Baixar Estoque", icon: ArrowDown, description: "Saída de materiais", color: "text-destructive", permission: "estoque.saida.criar" },
  { key: "requisicao" as const, label: "Requisição de Canteiro", icon: FileText, description: "Solicitar materiais online", color: "text-amber-500", permission: "requisicao.criar" },
  { key: "transferir" as const, label: "Transferir entre Obras", icon: ArrowLeftRight, description: "Mover materiais", color: "text-info", permission: "estoque.transferencia.criar" },
  { key: "emprestimo" as const, label: "Empréstimo entre Obras", icon: HandCoins, description: "Emprestar com devolução", color: "text-amber-600", permission: "estoque.transferencia.criar" },
  { key: "inventario" as const, label: "Inventário / Conferência", icon: ClipboardList, description: "Conferência física", color: "text-primary", permission: "estoque.inventario.criar" },
  { key: "kits" as const, label: "Kits de Insumos", icon: Package, description: "Gerenciar kits da obra", color: "text-violet-500", permission: null },
  { key: "oc" as const, label: "Ordens de Compra", icon: ShoppingCart, description: "Controlar saldo de OC", color: "text-emerald-600", permission: "oc.gerenciar" },
];

const MOV_TYPE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  entrada: { label: "Entrada", variant: "default" },
  saida: { label: "Saída", variant: "destructive" },
  transferencia_entrada: { label: "Transf. Entrada", variant: "default" },
  transferencia_saida: { label: "Transf. Saída", variant: "destructive" },
  devolucao: { label: "Devolução", variant: "secondary" },
  ajuste_inventario: { label: "Ajuste Inventário", variant: "outline" },
  exclusao_global: { label: "Exclusão Global", variant: "destructive" },
};

const ObraDashboard = () => {
  const [view, setView] = useState<OperationView>("menu");
  const [movsLimit, setMovsLimit] = useState(20);
  const [estoqueSearch, setEstoqueSearch] = useState("");
  const [estoqueCategory, setEstoqueCategory] = useState("");
  const [searchOutrasObras, setSearchOutrasObras] = useState("");
  const [showOutrasObras, setShowOutrasObras] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingEstoque, setEditingEstoque] = useState<any | null>(null);
  const [editLote, setEditLote] = useState("");
  const [editValidade, setEditValidade] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { getSelectedObra, getEstoqueByObra, selectedObraId, insumos, estoque, obras, undoInventarioAjuste, undoEntrada, undoSaida, undoTransferencia, resetEstoqueObra, kits, kitItems } = useInventory();
  const { logout, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const obra = getSelectedObra();

  // Query movimentações filtered by obra_id server-side (avoids 1000 row limit)
  const { data: movsObra = [] } = useQuery({
    queryKey: ["movimentacoes_obra", selectedObraId],
    queryFn: async () => {
      if (!selectedObraId) return [];
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("obra_id", selectedObraId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedObraId,
  });

  const estoqueObra = selectedObraId ? getEstoqueByObra(selectedObraId) : [];
  const totalValue = estoqueObra.reduce((acc, e) => acc + e.total_value, 0);
  const totalItems = estoqueObra.reduce((acc, e) => acc + e.quantity, 0);

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set(estoqueObra.map(e => e.insumo.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [estoqueObra]);

  // Filtered & sorted estoque
  const filteredEstoque = useMemo(() => {
    let items = estoqueObra;
    if (estoqueCategory) items = items.filter(e => e.insumo.category === estoqueCategory);
    if (estoqueSearch) {
      const words = estoqueSearch.toLowerCase().split(/\s+/).filter(Boolean);
      items = items.filter(e => {
        const haystack = `${e.insumo.code} ${e.insumo.name} ${e.insumo.category}`.toLowerCase();
        return words.every(w => haystack.includes(w));
      });
    }
    return items.sort((a, b) => {
      const catCmp = (a.insumo.category || "").localeCompare(b.insumo.category || "");
      if (catCmp !== 0) return catCmp;
      return a.insumo.name.localeCompare(b.insumo.name);
    });
  }, [estoqueObra, estoqueSearch, estoqueCategory]);

  // Group by category for display
  const groupedEstoque = useMemo(() => {
    const groups: Record<string, typeof filteredEstoque> = {};
    filteredEstoque.forEach(item => {
      const cat = item.insumo.category || "Sem Categoria";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredEstoque]);

  // Search insumo across other obras
  const outrasObrasResults = useMemo(() => {
    if (!searchOutrasObras || searchOutrasObras.length < 2) return [];
    const words = searchOutrasObras.toLowerCase().split(/\s+/).filter(Boolean);
    return estoque
      .filter(e => e.obra_id !== selectedObraId && e.quantity > 0)
      .map(e => {
        const ins = insumos.find(i => i.id === e.insumo_id);
        const ob = obras.find(o => o.id === e.obra_id);
        if (!ins || !ob) return null;
        const haystack = `${ins.code} ${ins.name} ${ins.category}`.toLowerCase();
        if (!words.every(w => haystack.includes(w))) return null;
        return { ...e, insumo: ins, obra: ob };
      })
      .filter(Boolean) as any[];
  }, [searchOutrasObras, estoque, insumos, obras, selectedObraId]);

  const getInsumoName = (id: string) => insumos.find(i => i.id === id)?.name || "—";
  const getInsumoUnit = (id: string) => insumos.find(i => i.id === id)?.unit || "";

  if (!obra || !selectedObraId) { navigate("/obras"); return null; }

  const handleResetEstoqueObra = async () => {
    if (resetConfirmText !== "EXCLUIR TUDO" || !selectedObraId) return;
    setIsResetting(true);
    try {
      await resetEstoqueObra(selectedObraId);
      toast.success("Estoque desta obra excluído com sucesso.");
      setResetConfirmText("");
      setResetDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir estoque");
    } finally {
      setIsResetting(false);
    }
  };

  const handleUndo = async (mov: any) => {
    try {
      if (mov.type === "ajuste_inventario") {
        await undoInventarioAjuste(mov.id);
        toast.success("Ajuste de inventário desfeito");
      } else if (mov.type === "entrada") {
        await undoEntrada(mov.id);
        toast.success("Entrada desfeita com sucesso");
      } else if (mov.type === "saida") {
        await undoSaida(mov.id);
        toast.success("Saída desfeita com sucesso");
      } else if (mov.type === "transferencia_saida" || mov.type === "transferencia_entrada") {
        await undoTransferencia(mov.id);
        toast.success("Transferência desfeita com sucesso");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao desfazer movimentação");
    }
  };

  const openEditEstoque = (item: any) => {
    setEditingEstoque(item);
    setEditLote(item.lote || "");
    setEditValidade(item.validade || "");
  };

  const handleSaveEstoqueEdit = async () => {
    if (!editingEstoque) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from("estoque")
        .update({
          lote: editLote || null,
          validade: editValidade || null,
        })
        .eq("id", editingEstoque.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      toast.success("Lote e validade atualizados");
      setEditingEstoque(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderOperation = () => {
    switch (view) {
      case "subir": return <SubirEstoque onBack={() => setView("menu")} />;
      case "baixar": return <BaixarEstoque onBack={() => setView("menu")} />;
      case "transferir": return <TransferenciaEstoque onBack={() => setView("menu")} />;
      case "emprestimo": return <EmprestimoEstoque onBack={() => setView("menu")} />;
      case "inventario": return <InventarioConferencia onBack={() => setView("menu")} />;
      case "requisicao": return <RequisicaoCanteiro onBack={() => setView("menu")} />;
      case "kits": return <KitsCRUD obraId={selectedObraId!} onBack={() => setView("menu")} />;
      case "oc": return <OrdensCompra onBack={() => setView("menu")} />;
      default: return null;
    }
  };

  const movsToShow = movsObra.slice(0, movsLimit);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/obras")}><ArrowLeft className="w-4 h-4" /></Button>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Building2 className="w-5 h-5 text-primary-foreground" /></div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{obra.name}</h1>
              <p className="text-xs text-muted-foreground">{obra.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="text-center"><p className="text-muted-foreground text-xs">Itens</p><p className="font-bold text-foreground">{totalItems.toLocaleString("pt-BR")}</p></div>
              <div className="text-center"><p className="text-muted-foreground text-xs">Valor Imobilizado</p><p className="font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
            </div>
            {hasPermission("estoque.zerar") && (
              <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setResetConfirmText(""); }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="hidden sm:flex">
                    <Trash2 className="w-4 h-4 mr-1" /> Zerar Estoque
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Estoque desta Obra</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        Esta ação irá <strong className="text-destructive">excluir permanentemente todos os registros de estoque</strong> desta obra.
                        O histórico de movimentações será mantido.
                      </p>
                      <p className="text-sm">
                        Para confirmar, digite <strong>EXCLUIR TUDO</strong> no campo abaixo:
                      </p>
                      <Input
                        value={resetConfirmText}
                        onChange={e => setResetConfirmText(e.target.value)}
                        placeholder="EXCLUIR TUDO"
                        className="font-mono"
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={resetConfirmText !== "EXCLUIR TUDO" || isResetting}
                      onClick={(e) => { e.preventDefault(); handleResetEstoqueObra(); }}
                    >
                      {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                      Excluir Estoque
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="icon" onClick={async () => { await logout(); navigate("/"); }}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === "menu" ? (
          <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              <div className="stat-card"><p className="text-xs text-muted-foreground">Total Itens</p><p className="text-xl font-bold text-foreground">{totalItems.toLocaleString("pt-BR")}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Valor Imobilizado</p><p className="text-xl font-bold text-foreground">{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-5">Operações</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {operations.filter(op => !op.permission || hasPermission(op.permission)).map((op, idx) => (
                  <button key={op.key} onClick={() => setView(op.key)} className="operation-btn animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                    <op.icon className={`w-10 h-10 ${op.color}`} strokeWidth={1.5} />
                    <span className="font-semibold text-foreground text-sm">{op.label}</span>
                    <span className="text-xs text-muted-foreground">{op.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ==================== ESTOQUE ATUAL ==================== */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" /> Estoque Atual
                <span className="text-sm font-normal text-muted-foreground">({filteredEstoque.length} itens)</span>
              </h3>

              {/* Search + Category filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={estoqueSearch}
                    onChange={e => setEstoqueSearch(e.target.value)}
                    placeholder="Buscar por nome, código ou categoria..."
                    className="pl-9"
                  />
                </div>
                {categories.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant={estoqueCategory === "" ? "default" : "outline"} size="sm" className="h-9 text-xs"
                      onClick={() => setEstoqueCategory("")}>Todas</Button>
                    {categories.map(cat => (
                      <Button key={cat} type="button" variant={estoqueCategory === cat ? "default" : "outline"} size="sm" className="h-9 text-xs"
                        onClick={() => setEstoqueCategory(prev => prev === cat ? "" : cat)}>{cat}</Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                        <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Unit.</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedEstoque).map(([category, items]) => (
                        <>{/* Category header */}
                          <tr key={`cat-${category}`} className="bg-muted/30">
                            <td colSpan={4} className="px-3 py-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</span>
                              <span className="text-xs text-muted-foreground ml-2">({items.length})</span>
                            </td>
                          </tr>
                          {items.map((item) => (
                            <tr key={item.insumo_id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                              <td className="p-3">
                                <p className="font-medium text-foreground">{item.insumo.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{item.insumo.code}</p>
                              </td>
                              <td className="p-3 text-right font-mono text-foreground whitespace-nowrap">{item.quantity.toLocaleString("pt-BR")} {item.insumo.unit}</td>
                              <td className="p-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{item.average_unit_cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                              <td className="p-3 text-right font-mono font-medium text-foreground">{item.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                            </tr>
                          ))}
                        </>
                      ))}
                      {filteredEstoque.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum item encontrado</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ==================== ESTOQUE DE KITS ==================== */}
            {(() => {
              const obraKits = kits.filter(k => k.obra_id === selectedObraId);
              if (obraKits.length === 0) return null;
              return (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-muted-foreground" /> Estoque de Kits
                    <span className="text-sm font-normal text-muted-foreground">({obraKits.length} kits)</span>
                  </h3>
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Kit</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Composição</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Disponíveis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obraKits.map(kit => {
                          const items = kitItems.filter(ki => ki.kit_id === kit.id);
                          let minKits = items.length > 0 ? Infinity : 0;
                          items.forEach(ki => {
                            const est = estoqueObra.find(e => e.insumo_id === ki.insumo_id);
                            const available = est ? Math.floor(est.quantity / ki.quantity) : 0;
                            minKits = Math.min(minKits, available);
                          });
                          if (minKits === Infinity) minKits = 0;
                          return (
                            <tr key={kit.id} className="border-b border-border/50 last:border-0">
                              <td className="p-3">
                                <p className="font-medium text-foreground">{kit.name}</p>
                                {kit.description && <p className="text-xs text-muted-foreground">{kit.description}</p>}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {items.map(ki => {
                                    const ins = insumos.find(i => i.id === ki.insumo_id);
                                    if (!ins) return null;
                                    const est = estoqueObra.find(e => e.insumo_id === ki.insumo_id);
                                    const disp = est?.quantity || 0;
                                    const needed = ki.quantity;
                                    const insuf = disp < needed;
                                    const baixo = !insuf && disp < needed * 3;
                                    return (
                                      <span key={ki.id} className={`text-xs px-2 py-0.5 rounded-full ${
                                        insuf ? "bg-destructive/10 text-destructive font-medium" :
                                        baixo ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                        "bg-muted text-foreground"
                                      }`}>
                                        {ins.name} x{ki.quantity} {ins.unit}
                                        <span className="ml-1 opacity-70">({disp})</span>
                                        {insuf && " ⚠️"}
                                        {baixo && " ⏳"}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-mono font-bold text-lg ${minKits === 0 ? "text-destructive" : "text-emerald-600"}`}>
                                  {minKits}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 cursor-pointer" onClick={() => setShowOutrasObras(!showOutrasObras)}>
                <Globe className="w-5 h-5 text-muted-foreground" /> Buscar Insumo em Outras Obras
                <span className="text-xs font-normal text-muted-foreground">{showOutrasObras ? "▲" : "▼"}</span>
              </h3>
              {showOutrasObras && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchOutrasObras}
                      onChange={e => setSearchOutrasObras(e.target.value)}
                      placeholder="Digite o nome ou código do insumo..."
                      className="pl-9"
                    />
                  </div>
                  {searchOutrasObras.length >= 2 && (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                              <th className="text-left p-3 font-medium text-muted-foreground">Obra</th>
                              <th className="text-right p-3 font-medium text-muted-foreground">Disponível</th>
                            </tr>
                          </thead>
                          <tbody>
                            {outrasObrasResults.map((r: any) => (
                              <tr key={`${r.obra_id}-${r.insumo_id}`} className="border-b border-border/50 last:border-0">
                                <td className="p-3">
                                  <p className="font-medium text-foreground">{r.insumo.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{r.insumo.code} · {r.insumo.category}</p>
                                </td>
                                <td className="p-3 text-foreground">{r.obra.name}</td>
                                <td className="p-3 text-right font-mono font-medium text-foreground">{r.quantity.toLocaleString("pt-BR")} {r.insumo.unit}</td>
                              </tr>
                            ))}
                            {outrasObrasResults.length === 0 && (
                              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Nenhum insumo encontrado em outras obras</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== HISTÓRICO DE MOVIMENTAÇÕES ==================== */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" /> Histórico de Movimentações
                <span className="text-sm font-normal text-muted-foreground">({movsObra.length})</span>
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Insumo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Usuário</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                        <th className="text-center p-3 font-medium text-muted-foreground w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movsToShow.map((mov: any) => {
                        const info = MOV_TYPE_MAP[mov.type] || { label: mov.type, variant: "secondary" as const };
                        return (
                          <tr key={mov.id} className="border-b border-border/50 last:border-0">
                            <td className="p-3 text-foreground whitespace-nowrap">{mov.date}</td>
                            <td className="p-3"><Badge variant={info.variant}>{info.label}</Badge></td>
                            <td className="p-3">
                              <p className="font-medium text-foreground">{getInsumoName(mov.insumo_id)}</p>
                            </td>
                            <td className="p-3 text-right font-mono text-foreground">
                              {mov.type === "saida" || mov.type === "transferencia_saida" || mov.type === "devolucao" || mov.type === "exclusao_global"
                                ? `-${mov.quantity}`
                                : `+${mov.quantity}`
                              } {getInsumoUnit(mov.insumo_id)}
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell text-xs">{mov.user_name || "—"}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell text-xs max-w-xs truncate">{mov.description || "—"}</td>
                            {(() => {
                              const undoPermMap: Record<string, string> = {
                                entrada: "estoque.entrada.desfazer",
                                saida: "estoque.saida.desfazer",
                                ajuste_inventario: "estoque.inventario.desfazer",
                                transferencia_saida: "estoque.transferencia.desfazer",
                                transferencia_entrada: "estoque.transferencia.desfazer",
                              };
                              const perm = undoPermMap[mov.type];
                              if (!perm || !hasPermission(perm)) return <td className="p-3" />;
                              return (
                                <td className="p-3 text-center">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Desfazer">
                                        <Undo2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Desfazer Movimentação</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja desfazer esta movimentação ({MOV_TYPE_MAP[mov.type]?.label})? O estoque do insumo <strong>{getInsumoName(mov.insumo_id)}</strong> será revertido.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={async () => { await handleUndo(mov); }}
                                        >
                                          Desfazer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </td>
                              );
                            })()}
                          </tr>
                        );
                      })}
                      {movsObra.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma movimentação registrada</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {movsObra.length > movsLimit && (
                  <div className="p-3 border-t border-border text-center">
                    <Button variant="ghost" size="sm" onClick={() => setMovsLimit(prev => prev + 30)}>
                      Carregar mais ({movsObra.length - movsLimit} restantes)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : renderOperation()}
      </main>
    </div>
  );
};

export default ObraDashboard;
