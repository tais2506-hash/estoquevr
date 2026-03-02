import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AvaliacaoControl = () => {
  const { avaliacoes, fornecedores, obras } = useInventory();
  const [filterObra, setFilterObra] = useState("all");

  const filtered = useMemo(() => {
    return filterObra === "all" ? avaliacoes : avaliacoes.filter(a => a.obra_id === filterObra);
  }, [avaliacoes, filterObra]);

  const ranking = useMemo(() => {
    const map: Record<string, { total: number; count: number; avs: any[] }> = {};
    filtered.forEach(a => {
      if (!map[a.fornecedor_id]) map[a.fornecedor_id] = { total: 0, count: 0, avs: [] };
      const avg = (a.pontualidade + a.qualidade + a.atendimento + a.documentacao) / 4;
      map[a.fornecedor_id].total += avg;
      map[a.fornecedor_id].count++;
      map[a.fornecedor_id].avs.push(a);
    });
    return Object.entries(map)
      .map(([fId, data]) => ({
        fornecedor: fornecedores.find(f => f.id === fId),
        media: Math.round((data.total / data.count) * 10) / 10,
        count: data.count,
        avs: data.avs,
      }))
      .sort((a, b) => b.media - a.media);
  }, [filtered, fornecedores]);

  const renderStars = (value: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(v => (
        <Star key={v} className={`w-3.5 h-3.5 ${v <= value ? "text-accent fill-accent" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Select value={filterObra} onValueChange={setFilterObra}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Obra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras.filter(o => o.status !== "arquivada").map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Avaliações</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Fornecedores Avaliados</p>
            <p className="text-2xl font-bold text-foreground">{ranking.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Média Geral</p>
            <p className="text-2xl font-bold text-foreground">
              {ranking.length > 0 ? (ranking.reduce((a, r) => a + r.media, 0) / ranking.length).toFixed(1) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Ranking de Fornecedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ranking.map((r, idx) => (
              <div key={r.fornecedor?.id || idx} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
                    }`}>{idx + 1}</span>
                    <div>
                      <p className="font-medium text-foreground">{r.fornecedor?.name || "Desconhecido"}</p>
                      <p className="text-xs text-muted-foreground">{r.count} avaliações</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(r.media))}
                    <Badge variant="outline" className="font-bold">{r.media}</Badge>
                  </div>
                </div>
                {/* Last evaluations */}
                <div className="mt-2 space-y-1">
                  {r.avs.slice(0, 3).map(a => (
                    <div key={a.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>NF {a.nota_fiscal} — {a.date}</span>
                      <span>{((a.pontualidade + a.qualidade + a.atendimento + a.documentacao) / 4).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {ranking.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma avaliação encontrada</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvaliacaoControl;