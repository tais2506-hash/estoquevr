import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ColumnDef {
  key: string;
  label: string;
  required: boolean;
  example: string;
}

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
  skipped: number;
}

interface SpreadsheetImportProps {
  title: string;
  columns: ColumnDef[];
  templateFileName: string;
  sheetName: string;
  /** A marker to validate this is the correct template */
  templateId: string;
  /** Pre-fill the template with existing data rows */
  existingData?: Record<string, string>[];
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
}

const TEMPLATE_MARKER_SHEET = "__template_meta";

const SpreadsheetImport = ({
  title,
  columns,
  templateFileName,
  sheetName,
  templateId,
  existingData,
  onImport,
}: SpreadsheetImportProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Data sheet with headers + example row + existing data
    const headers = columns.map((c) => c.label);
    const examples = columns.map((c) => c.example);
    const dataRows: string[][] = [headers, examples];

    // Add existing data rows
    if (existingData && existingData.length > 0) {
      existingData.forEach((row) => {
        dataRows.push(columns.map((c) => row[c.key] || ""));
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // Set column widths
    ws["!cols"] = columns.map((c) => ({ wch: Math.max(c.label.length, c.example.length, 15) }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Hidden meta sheet to validate template
    const meta = XLSX.utils.aoa_to_sheet([
      ["template_id", templateId],
      ["columns", columns.map((c) => c.key).join(",")],
      ["required", columns.filter((c) => c.required).map((c) => c.key).join(",")],
    ]);
    XLSX.utils.book_append_sheet(wb, meta, TEMPLATE_MARKER_SHEET);

    XLSX.writeFile(wb, templateFileName);
    toast.success("Planilha modelo baixada com sucesso!");
  };

  const validateFile = (wb: XLSX.WorkBook): string | null => {
    // Check meta sheet exists
    const metaSheet = wb.Sheets[TEMPLATE_MARKER_SHEET];
    if (!metaSheet) {
      return "Esta não é a planilha padrão do sistema. Baixe o modelo e preencha-o.";
    }

    const metaData = XLSX.utils.sheet_to_json<string[]>(metaSheet, { header: 1 });
    const idRow = metaData.find((r) => r[0] === "template_id");
    if (!idRow || idRow[1] !== templateId) {
      return `Planilha incorreta. Use o modelo "${title}" gerado pelo sistema.`;
    }

    // Check data sheet exists
    if (!wb.Sheets[sheetName]) {
      return `A aba "${sheetName}" não foi encontrada na planilha.`;
    }

    // Check headers match
    const dataSheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(dataSheet, { header: 1 });
    if (rows.length < 1) {
      return "A planilha está vazia.";
    }

    const fileHeaders = rows[0].map((h) => String(h).trim());
    const expectedHeaders = columns.map((c) => c.label);
    const missing = expectedHeaders.filter((h) => !fileHeaders.includes(h));
    if (missing.length > 0) {
      return `Colunas faltando: ${missing.join(", ")}. Use o modelo padrão.`;
    }

    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setResult(null);
    setProgress(0);

    // Validate file type
    const validExts = [".xlsx", ".xls"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      toast.error("Somente arquivos Excel (.xlsx, .xls) são aceitos.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setImporting(true);
    setProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      setProgress(30);

      // Validate template
      const validationError = validateFile(wb);
      if (validationError) {
        toast.error(validationError);
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      setProgress(50);

      // Parse data rows (skip header and example)
      const dataSheet = wb.Sheets[sheetName];
      const allRows = XLSX.utils.sheet_to_json<Record<string, string>>(dataSheet);

      // Filter out example row and empty rows
      const dataRows = allRows.filter((row) => {
        const values = Object.values(row).map((v) => String(v).trim());
        const isExample = columns.every(
          (c, i) => values[i] === c.example || !values[i]
        );
        // Check it has at least one non-empty value
        const hasData = values.some((v) => v && v.length > 0);
        return hasData && !isExample;
      });

      if (dataRows.length === 0) {
        toast.error("Nenhum dado encontrado. Preencha a planilha modelo.");
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      setProgress(70);

      // Map headers to keys
      const headerToKey: Record<string, string> = {};
      columns.forEach((c) => {
        headerToKey[c.label] = c.key;
      });

      const mappedRows = dataRows.map((row) => {
        const mapped: Record<string, string> = {};
        Object.entries(row).forEach(([header, value]) => {
          const key = headerToKey[header];
          if (key) mapped[key] = String(value).trim();
        });
        return mapped;
      });

      setProgress(80);

      const importResult = await onImport(mappedRows);
      setProgress(100);
      setResult(importResult);

      if (importResult.success > 0) {
        toast.success(`${importResult.success} registro(s) importado(s)!`);
      }
      if (importResult.errors.length > 0) {
        toast.warning(`${importResult.errors.length} erro(s) encontrado(s).`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar planilha");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Importar Planilha
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setResult(null); setProgress(0); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Download template */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Baixe a planilha modelo</p>
                  <p className="text-sm text-muted-foreground">
                    O sistema só aceita o upload da planilha padrão preenchida. Baixe o modelo, preencha os dados e faça o upload.
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-2">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo (.xlsx)
                  </Button>
                </div>
              </div>
            </div>

            {/* Columns info */}
            <div className="text-xs space-y-1 px-1">
              <p className="font-medium text-muted-foreground">Colunas do modelo:</p>
              <div className="flex flex-wrap gap-1">
                {columns.map((c) => (
                  <span
                    key={c.key}
                    className={`px-2 py-0.5 rounded text-xs ${
                      c.required
                        ? "bg-primary/10 text-primary font-medium"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.label}{c.required ? " *" : ""}
                  </span>
                ))}
              </div>
            </div>

            {/* Step 2: Upload */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-foreground">Faça o upload da planilha preenchida</p>
                  <p className="text-sm text-muted-foreground">Somente arquivos .xlsx ou .xls</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                    className="mt-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {importing ? "Processando..." : "Selecionar Arquivo"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">Processando planilha...</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="font-medium text-foreground">Resultado da importação</p>
                <div className="space-y-2">
                  {result.success > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-foreground">{result.success} registro(s) importado(s)</span>
                    </div>
                  )}
                  {result.skipped > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-foreground">{result.skipped} registro(s) ignorado(s) (duplicados)</span>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-foreground">{result.errors.length} erro(s)</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-muted/50 rounded p-2 text-xs space-y-1">
                        {result.errors.map((err, i) => (
                          <p key={i} className="text-destructive">
                            Linha {err.row}: {err.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpreadsheetImport;
