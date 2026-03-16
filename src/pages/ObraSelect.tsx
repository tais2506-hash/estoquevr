import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, BarChart3, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, string> = {
  ativa: "bg-success/10 text-success border-success/20",
  concluida: "bg-muted text-muted-foreground border-border",
  pausada: "bg-warning/10 text-warning border-warning/20",
  arquivada: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  ativa: "Ativa",
  concluida: "Concluída",
  pausada: "Pausada",
  arquivada: "Arquivada",
};

const ObraSelect = () => {
  const { obras, setSelectedObraId, getEstoqueByObra, loading } = useInventory();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (obraId: string) => {
    setSelectedObraId(obraId);
    navigate("/obra");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Valor Real</h1>
              <p className="text-xs text-muted-foreground">Controle de Estoque</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Menu
              </Button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Selecione a Obra</h2>
        {obras.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma obra cadastrada.</p>
            {isAdmin && <p className="text-sm mt-2">Acesse o Dashboard para cadastrar obras.</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {obras.filter(o => o.status !== "arquivada").map((obra, idx) => {
              const estoqueObra = getEstoqueByObra(obra.id);
              const totalValue = estoqueObra.reduce((acc, e) => acc + e.total_value, 0);
              const totalItems = estoqueObra.reduce((acc, e) => acc + e.quantity, 0);

              return (
                <button
                  key={obra.id}
                  onClick={() => handleSelect(obra.id)}
                  className="operation-btn items-start text-left"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[obra.status] || ""}`}>
                      {statusLabels[obra.status] || obra.status}
                    </span>
                  </div>
                  <div className="w-full mt-1">
                    <h3 className="font-semibold text-foreground text-base">{obra.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {obra.address}
                    </p>
                  </div>
                  <div className="w-full mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Valor em estoque</p>
                    <p className="text-sm font-semibold text-foreground">
                      {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ObraSelect;
