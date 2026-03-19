import { ArrowLeft, Download, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInventory } from "@/contexts/InventoryContext";

interface LaudoViewerProps {
  laudo: any;
  onBack: () => void;
}

const LaudoViewer = ({ laudo, onBack }: LaudoViewerProps) => {
  const { insumos } = useInventory();
  const insumo = insumos.find(i => i.id === laudo.insumo_id);
  const isPdf = laudo.file_url?.toLowerCase().endsWith(".pdf") || laudo.file_name?.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(laudo.file_url || laudo.file_name || "");

  const getStatus = () => {
    if (!laudo.validade) return null;
    const today = new Date();
    const val = new Date(laudo.validade + "T00:00:00");
    const diffDays = Math.ceil((val.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "vencido";
    if (diffDays <= 15) return "proximo";
    return "valido";
  };

  const status = getStatus();

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <a href={laudo.file_url} download={laudo.file_name} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Baixar</Button>
        </a>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <h3 className="font-semibold text-foreground">{insumo?.name || "Insumo"}</h3>
        <p className="text-sm text-muted-foreground">Arquivo: {laudo.file_name}</p>
        <div className="flex gap-2 flex-wrap">
          {laudo.lote && <Badge variant="outline" className="text-xs">Lote: {laudo.lote}</Badge>}
          {laudo.nota_fiscal && <Badge variant="outline" className="text-xs">NF: {laudo.nota_fiscal}</Badge>}
          {laudo.validade && (
            <Badge variant="outline" className="text-xs">
              Validade: {new Date(laudo.validade + "T00:00:00").toLocaleDateString("pt-BR")}
            </Badge>
          )}
          {status === "vencido" && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>}
          {status === "proximo" && <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Vence em breve</Badge>}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ minHeight: "500px" }}>
        {isPdf ? (
          <iframe src={laudo.file_url} className="w-full h-[70vh]" title="Laudo PDF" />
        ) : isImage ? (
          <div className="flex items-center justify-center p-6">
            <img src={laudo.file_url} alt={laudo.file_name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Formato não suportado para visualização. Use o botão Baixar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LaudoViewer;
