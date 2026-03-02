import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  aprovada: { label: "Aprovada", color: "bg-success/10 text-success", icon: CheckCircle },
  reprovada: { label: "Reprovada", color: "bg-destructive/10 text-destructive", icon: XCircle },
  pendente: { label: "Pendente", color: "bg-warning/10 text-warning", icon: Clock },
};

const FVMControl = () => {
  const { fvms, fornecedores, insumos, obras } = useInventory();
  const [search, setSearch] = useState("");
  const [filterFornecedor, setFilterFornecedor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterObra, setFilterObra] = useState("all");

  const filtered = useMemo(() => {
    return fvms.filter(f => {
      const matchSearch = f.nota_fiscal.toLowerCase().includes(search.toLowerCase());
      const matchForn = filterFornecedor === "all" || f.fornecedor_id === filterFornecedor;
      const matchStatus = filterStatus === "all" || f.status === filterStatus;
      const matchObra = filterObra === "all" || f.obra_id === filterObra;
      return matchSearch && matchForn && matchStatus && matchObra;
    });
  }, [fvms, search, filterFornecedor, filterStatus, filterObra]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por NF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterObra} onValueChange={setFilterObra}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Obra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {obras.filter(o => o.status !== "arquivada").map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="reprovada">Reprovada</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-3 font-medium text-muted-foreground">NF</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Fornecedor</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Obra</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Verificações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => {
              const cfg = statusConfig[f.status] || statusConfig.pendente;
              const Icon = cfg.icon;
              return (
                <tr key={f.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-mono text-sm font-medium text-foreground">{f.nota_fiscal}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{fornecedores.find(fn => fn.id === f.fornecedor_id)?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{obras.find(o => o.id === f.obra_id)?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{f.date}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <div className="flex gap-1">
                      <Badge variant={f.quantidade_conferida ? "default" : "outline"} className="text-xs">Qtd</Badge>
                      <Badge variant={f.qualidade_material ? "default" : "outline"} className="text-xs">Qual</Badge>
                      <Badge variant={f.documentacao_ok ? "default" : "outline"} className="text-xs">Doc</Badge>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma FVM encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FVMControl;