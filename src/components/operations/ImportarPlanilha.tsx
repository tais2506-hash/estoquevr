import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, Loader2, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

const ImportarPlanilha = ({ onBack }: { onBack: () => void }) => {
  const { selectedObraId, insumos, obras, refetchAll } = useInventory();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  useEffect(() => {
    const loadFornecedores = async () => {
      const { data } = await supabase.from("fornecedores").select("*").is("deleted_at", null).order("name");
      if (data) setFornecedores(data);
    };
    loadFornecedores();
  }, []);

  const selectedObra = obras.find(o => o.id === selectedObraId);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Main sheet with headers and instructions
    const headers = ["Código Insumo", "Nome Insumo", "Unidade", "Nota Fiscal", "CNPJ Fornecedor", "Nome Fornecedor", "Quantidade", "Valor Unitário", "Data (DD/MM/AAAA)"];
    const wsData = [headers];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 18 },
      { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Entradas");

    // Insumos reference sheet (read-only data)
    const insumosData = [["Código", "Nome", "Unidade", "Categoria"]];
    insumos.forEach(i => {
      insumosData.push([i.code, i.name, i.unit, i.category]);
    });
    const wsInsumos = XLSX.utils.aoa_to_sheet(insumosData);
    wsInsumos["!cols"] = [{ wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsInsumos, "Insumos Cadastrados");

    // Fornecedores reference sheet
    const fornData = [["CNPJ", "Nome", "Contato"]];
    fornecedores.forEach(f => {
      fornData.push([f.cnpj, f.name, f.contact || ""]);
    });
    const wsForn = XLSX.utils.aoa_to_sheet(fornData);
    wsForn["!cols"] = [{ wch: 20 }, { wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsForn, "Fornecedores Cadastrados");

    const fileName = `modelo_entrada_estoque_${selectedObra?.name || "obra"}.xlsx`.replace(/\s+/g, "_");
    XLSX.writeFile(wb, fileName);
    toast.success("Modelo baixado com sucesso!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setValidationErrors([]);
    }
  };

  const processFile = async () => {
    if (!file || !selectedObraId || !user) return;
    setIsProcessing(true);
    setValidationErrors([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets["Entradas"] || workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error("Planilha vazia ou sem dados");
        setIsProcessing(false);
        return;
      }

      // Build lookup maps
      const insumoByCode = new Map(insumos.map(i => [i.code.trim().toLowerCase(), i]));
      const fornByName = new Map(fornecedores.map(f => [f.name.trim().toLowerCase(), f]));
      const fornByCnpj = new Map(fornecedores.map(f => [f.cnpj.replace(/\D/g, ""), f]));

      const errors: string[] = [];
      const validRows: {
        insumo: any; fornecedor: any; notaFiscal: string;
        quantity: number; unitValue: number; totalValue: number; date: string;
      }[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0]) continue;

        const lineNum = i + 1;
        const insumoCode = String(row[0] || "").trim().toLowerCase();
        const notaFiscal = String(row[3] || "").trim();
        const cnpjRaw = String(row[4] || "").replace(/\D/g, "");
        const fornNome = String(row[5] || "").trim().toLowerCase();
        const quantity = parseFloat(String(row[6] || "0").replace(/,/g, ".")) || 0;
        const unitValue = parseFloat(String(row[7] || "0").replace(/,/g, ".")) || 0;
        const dateRaw = row[8];

        // Validate insumo
        const insumo = insumoByCode.get(insumoCode);
        if (!insumo) {
          errors.push(`Linha ${lineNum}: Insumo "${row[0]}" não cadastrado no sistema`);
          continue;
        }

        // Validate fornecedor
        let fornecedor = fornByCnpj.get(cnpjRaw) || fornByName.get(fornNome);
        if (!fornecedor) {
          errors.push(`Linha ${lineNum}: Fornecedor "${row[5] || row[4]}" não cadastrado no sistema`);
          continue;
        }

        if (!notaFiscal) {
          errors.push(`Linha ${lineNum}: Nota Fiscal obrigatória`);
          continue;
        }
        if (quantity <= 0) {
          errors.push(`Linha ${lineNum}: Quantidade deve ser maior que zero`);
          continue;
        }
        if (unitValue <= 0) {
          errors.push(`Linha ${lineNum}: Valor unitário deve ser maior que zero`);
          continue;
        }

        // Parse date
        let dateStr = "";
        if (typeof dateRaw === "number") {
          const d = XLSX.SSF.parse_date_code(dateRaw);
          dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        } else if (dateRaw) {
          const parts = String(dateRaw).split("/");
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }
        if (!dateStr) dateStr = new Date().toISOString().split("T")[0];

        validRows.push({
          insumo, fornecedor, notaFiscal,
          quantity, unitValue, totalValue: quantity * unitValue, date: dateStr,
        });
      }

      if (errors.length > 0 && validRows.length === 0) {
        setValidationErrors(errors);
        toast.error("Nenhuma linha válida encontrada");
        setIsProcessing(false);
        return;
      }

      // Import valid rows
      let imported = 0;
      const importErrors: string[] = [...errors];

      for (const row of validRows) {
        try {
          // Insert entrada
          const { data: inserted, error: insertErr } = await supabase.from("entradas").insert({
            obra_id: selectedObraId,
            insumo_id: row.insumo.id,
            nota_fiscal: row.notaFiscal,
            fornecedor_id: row.fornecedor.id,
            quantity: row.quantity,
            unit_value: row.unitValue,
            total_value: row.totalValue,
            date: row.date,
            user_id: user.id,
          }).select().single();

          if (insertErr) throw insertErr;

          // Update estoque
          if (!row.insumo.material_nao_estocavel) {
            const { data: existing } = await supabase
              .from("estoque").select("*")
              .eq("obra_id", selectedObraId).eq("insumo_id", row.insumo.id).single();

            if (existing) {
              const newQty = existing.quantity + row.quantity;
              const newTotal = existing.total_value + row.totalValue;
              const newAvg = newQty > 0 ? newTotal / newQty : 0;
              await supabase.from("estoque").update({
                quantity: newQty, total_value: newTotal, average_unit_cost: newAvg,
              }).eq("id", existing.id);
            } else {
              await supabase.from("estoque").insert({
                obra_id: selectedObraId, insumo_id: row.insumo.id,
                quantity: row.quantity, total_value: row.totalValue,
                average_unit_cost: row.unitValue,
              });
            }
          }

          // Insert movimentacao
          await supabase.from("movimentacoes").insert({
            obra_id: selectedObraId, insumo_id: row.insumo.id,
            type: "entrada" as any, quantity: row.quantity, date: row.date,
            description: `Entrada NF ${row.notaFiscal} (planilha)`,
            reference_id: inserted.id, user_id: user.id,
          });

          imported++;
        } catch (err: any) {
          importErrors.push(`Erro ao importar ${row.insumo.name}: ${err.message}`);
        }
      }

      refetchAll();
      setResult({
        total: validRows.length + errors.length,
        imported,
        skipped: errors.length,
        errors: importErrors,
      });
      toast.success(`${imported} entradas importadas com sucesso!`);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setIsProcessing(false);
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
          <p className="text-sm"><span className="text-muted-foreground">Total de linhas:</span> <strong>{result.total}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Entradas importadas:</span> <strong className="text-success">{result.imported}</strong></p>
          {result.skipped > 0 && (
            <p className="text-sm"><span className="text-muted-foreground">Linhas ignoradas:</span> <strong className="text-warning">{result.skipped}</strong></p>
          )}
          {result.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-destructive mb-2">Detalhes dos erros:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{e}</p>
                ))}
              </div>
            </div>
          )}
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
      <h2 className="text-xl font-bold text-foreground mb-6">Importar Planilha de Estoque</h2>

      <div className="bg-card rounded-xl border border-border p-6 max-w-lg space-y-6">
        {/* Step 1: Download template */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">1. Baixe o modelo</h3>
          <p className="text-xs text-muted-foreground">
            O modelo vem com as abas de referência contendo todos os insumos e fornecedores já cadastrados.
            Use os códigos e CNPJs dessas abas para preencher a aba "Entradas".
          </p>
          <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Baixar Modelo ({insumos.length} insumos, {fornecedores.length} fornecedores)
          </Button>
        </div>

        {/* Step 2: Upload */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">2. Preencha e envie</h3>
          <p className="text-xs text-muted-foreground">
            Somente insumos e fornecedores já cadastrados serão aceitos. Linhas com dados não encontrados serão ignoradas.
          </p>

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
                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Erros de validação
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {validationErrors.map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground">{e}</p>
              ))}
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processando e validando dados...</span>
          </div>
        )}

        <div className="flex gap-3">
          {file && !isProcessing && (
            <Button onClick={() => { setFile(null); setValidationErrors([]); }} variant="outline" className="flex-1">
              Trocar Arquivo
            </Button>
          )}
          <Button onClick={processFile} disabled={!file || isProcessing} className="flex-1">
            {isProcessing ? "Processando..." : "Importar Entradas"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportarPlanilha;
