import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import * as XLSX from "xlsx";

interface ImportResult {
  success: boolean;
  rows_parsed: number;
  insumos_created: number;
  insumos_existing: number;
  fornecedores_created: number;
  fornecedores_existing: number;
  stock_items_updated: number;
}

const ImportarPlanilha = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId } = useInventory();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const processFile = async () => {
    if (!file || !selectedObraId) return;
    setIsProcessing(true);
    setProgress("Lendo arquivo...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      setProgress("Processando dados...");

      // Find header row (contains "Cód. Item" or "Descrição")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.some((c: any) => String(c).includes("Cód. Item") || String(c).includes("Cód. Estruturado"))) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        toast.error("Formato de planilha não reconhecido");
        setIsProcessing(false);
        return;
      }

      // Map column indices
      const headers = jsonData[headerIdx].map((h: any) => String(h || "").trim());
      const colMap = {
        servicoDesc: headers.indexOf("Descrição"),
        insumoCode: headers.lastIndexOf("Cód. Item") > headers.indexOf("Cód. Item") 
          ? headers.indexOf("Cód. Item") 
          : headers.findIndex((h: string) => h === "Cód. Item"),
        insumoName: -1,
        unit: headers.indexOf("Unidade"),
        notaFiscal: headers.indexOf("Documento"),
        date: headers.indexOf("Data Documento"),
        quantity: headers.indexOf("Qtde. Apropriada"),
        unitValue: headers.indexOf("Valor Unitário"),
        totalValue: headers.indexOf("Valor Apropriação"),
        fornecedorCode: headers.indexOf("Cód. Fornecedor"),
        fornecedorName: headers.indexOf("Fornecedor"),
      };

      // Find the Descrição columns - there are multiple, we need the insumo one (2nd)
      const descIndices = headers.reduce((acc: number[], h: string, i: number) => {
        if (h === "Descrição") acc.push(i);
        return acc;
      }, []);

      // Insumo code is the first "Cód. Item" after the service codes
      // Looking at the structure: Serviço(3 cols) | Insumo(3 cols) | Realizado(3 cols) | Apropriação(4 cols) | ...
      // Service: Cód. Estruturado, Cód. Alternativo, Descrição
      // Insumo: Cód. Item, Cód. Alternativo, Descrição
      const codItemIndices = headers.reduce((acc: number[], h: string, i: number) => {
        if (h === "Cód. Item") acc.push(i);
        return acc;
      }, []);

      // First Cód. Item is for Insumo (index 3 typically)
      const insumoCodeIdx = codItemIndices[0] ?? 3;
      // The Descrição right after insumo code
      const insumoNameIdx = descIndices.length > 1 ? descIndices[1] : insumoCodeIdx + 2;
      const servicoDescIdx = descIndices[0] ?? 2;

      setProgress("Extraindo dados da planilha...");

      // Build rows for the edge function  
      const rows: any[] = [];
      for (let i = headerIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[insumoCodeIdx]) continue;

        const insumoCode = String(row[insumoCodeIdx] || "").trim();
        if (!insumoCode || insumoCode === "") continue;

        rows.push({
          insumo_code: insumoCode,
          insumo_name: String(row[insumoNameIdx] || "").trim(),
          unit: String(row[colMap.unit] || "").trim(),
          category: String(row[servicoDescIdx] || "").trim(),
          fornecedor_code: String(row[colMap.fornecedorCode] || "").trim(),
          fornecedor_name: String(row[colMap.fornecedorName] || "").trim(),
          nota_fiscal: String(row[colMap.notaFiscal] || "").trim(),
          date: row[colMap.date] || "",
          quantity: parseFloat(String(row[colMap.quantity] || "0").replace(/,/g, "")) || 0,
          unit_value: parseFloat(String(row[colMap.unitValue] || "0").replace(/,/g, "")) || 0,
          total_value: parseFloat(String(row[colMap.totalValue] || "0").replace(/,/g, "")) || 0,
        });
      }

      if (rows.length === 0) {
        toast.error("Nenhum dado encontrado na planilha");
        setIsProcessing(false);
        return;
      }

      setProgress(`Importando ${rows.length} registros...`);

      // Send to edge function in chunks
      const chunkSize = 2000;
      let totalResult: ImportResult = {
        success: true,
        rows_parsed: 0,
        insumos_created: 0,
        insumos_existing: 0,
        fornecedores_created: 0,
        fornecedores_existing: 0,
        stock_items_updated: 0,
      };

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        setProgress(`Enviando lote ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rows.length / chunkSize)}...`);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await supabase.functions.invoke("import-spreadsheet", {
          body: { rows: chunk, obra_id: selectedObraId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const chunkResult = response.data as ImportResult;
        totalResult.rows_parsed += chunkResult.rows_parsed || 0;
        totalResult.insumos_created += chunkResult.insumos_created || 0;
        totalResult.insumos_existing += chunkResult.insumos_existing || 0;
        totalResult.fornecedores_created += chunkResult.fornecedores_created || 0;
        totalResult.fornecedores_existing += chunkResult.fornecedores_existing || 0;
        totalResult.stock_items_updated += chunkResult.stock_items_updated || 0;
      }

      setResult(totalResult);
      toast.success("Importação concluída!");
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  if (result) {
    return (
      <div className="animate-fade-in text-center py-16">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-4">Importação Concluída!</h2>
        <div className="bg-card rounded-xl border border-border p-6 max-w-md mx-auto text-left space-y-2">
          <p className="text-sm"><span className="text-muted-foreground">Linhas processadas:</span> <strong>{result.rows_parsed}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Insumos criados:</span> <strong>{result.insumos_created}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Insumos já existentes:</span> <strong>{result.insumos_existing}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Fornecedores criados:</span> <strong>{result.fornecedores_created}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Fornecedores já existentes:</span> <strong>{result.fornecedores_existing}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Itens de estoque atualizados:</span> <strong>{result.stock_items_updated}</strong></p>
        </div>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={onBack}>Voltar ao Menu</Button>
          <Button onClick={() => { setResult(null); setFile(null); }}>Nova Importação</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
      </button>
      <h2 className="text-xl font-bold text-foreground mb-6">Importar Planilha</h2>

      <div className="bg-card rounded-xl border border-border p-6 max-w-lg space-y-6">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Selecione um arquivo Excel (.xlsx) com o GRD Realizado.</p>
          <p>O sistema irá extrair automaticamente:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Insumos (código, nome, unidade, categoria)</li>
            <li>Fornecedores (código, nome)</li>
            <li>Estoque agregado por insumo</li>
          </ul>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          {file ? (
            <div className="flex items-center gap-3 justify-center">
              <FileSpreadsheet className="w-8 h-8 text-success" />
              <div className="text-left">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer space-y-2 block">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Clique para selecionar o arquivo</p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{progress}</span>
          </div>
        )}

        <div className="flex gap-3">
          {file && !isProcessing && (
            <Button onClick={() => setFile(null)} variant="outline" className="flex-1">Trocar Arquivo</Button>
          )}
          <Button onClick={processFile} disabled={!file || isProcessing} className="flex-1">
            {isProcessing ? "Processando..." : "Importar Dados"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportarPlanilha;
