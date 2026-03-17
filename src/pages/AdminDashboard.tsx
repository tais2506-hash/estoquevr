import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ObrasCRUD from "@/components/admin/ObrasCRUD";
import InsumosCRUD from "@/components/admin/InsumosCRUD";
import KitsCRUD from "@/components/admin/KitsCRUD";
import LocationsCRUD from "@/components/admin/LocationsCRUD";
import UserManagement from "@/components/admin/UserManagement";
import ServicePackagesCRUD from "@/components/admin/ServicePackagesCRUD";
import DashboardObra from "@/components/dashboard/DashboardObra";
import DashboardGeral from "@/components/dashboard/DashboardGeral";
import DashboardKits from "@/components/dashboard/DashboardKits";
import ReportsPage from "@/components/reports/ReportsPage";

const AdminDashboard = () => {
  const { obras, estoque, insumos, movimentacoes, loading } = useInventory();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExport = (type: string) => {
    const data = type === "estoque"
      ? estoque.map(e => ({
          obra: obras.find(o => o.id === e.obra_id)?.name,
          insumo: insumos.find(i => i.id === e.insumo_id)?.name,
          quantidade: e.quantity,
          valorUnitario: e.average_unit_cost,
          valorTotal: e.total_value,
        }))
      : movimentacoes.map(m => ({
          obra: obras.find(o => o.id === m.obra_id)?.name,
          insumo: insumos.find(i => i.id === m.insumo_id)?.name,
          tipo: m.type,
          quantidade: m.quantity,
          data: m.date,
          descricao: m.description,
        }));

    if (data.length === 0) return;
    const csv = [Object.keys(data[0]).join(","), ...data.map(r => Object.values(r).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/obras")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-xs text-muted-foreground">Valor Real — Gestão Completa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport("estoque")}>
                <Download className="w-4 h-4 mr-1" /> Estoque
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("movimentacoes")}>
                <Download className="w-4 h-4 mr-1" /> Movimentações
              </Button>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await logout(); navigate("/"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        <Tabs defaultValue="geral" className="space-y-6">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="por-obra">Por Obra</TabsTrigger>
              <TabsTrigger value="dashboard-kits">Kits</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              <TabsTrigger value="obras">Obras</TabsTrigger>
              <TabsTrigger value="insumos">Insumos</TabsTrigger>
              <TabsTrigger value="kits">Cadastro Kits</TabsTrigger>
              <TabsTrigger value="locais">Locais</TabsTrigger>
              <TabsTrigger value="servicos">Serviços</TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="geral"><DashboardGeral /></TabsContent>
          <TabsContent value="por-obra"><DashboardObra /></TabsContent>
          <TabsContent value="relatorios"><ReportsPage /></TabsContent>
          <TabsContent value="obras"><ObrasCRUD /></TabsContent>
          <TabsContent value="insumos"><InsumosCRUD /></TabsContent>
          <TabsContent value="kits"><KitsCRUD /></TabsContent>
          <TabsContent value="locais"><LocationsCRUD /></TabsContent>
          <TabsContent value="servicos"><ServicePackagesCRUD /></TabsContent>
          <TabsContent value="usuarios"><UserManagement /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
