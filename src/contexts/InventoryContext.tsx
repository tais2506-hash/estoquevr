import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  Obra, Insumo, Fornecedor, EstoqueItem, EntradaEstoque,
  SaidaEstoque, Transferencia, Devolucao, Movimentacao,
  FVM, AvaliacaoFornecedor, InventarioItem
} from "@/types/inventory";
import {
  mockObras, mockInsumos, mockFornecedores, mockEstoque,
  mockEntradas, mockSaidas, mockTransferencias, mockDevolucoes,
  mockMovimentacoes, mockFVMs, mockAvaliacoes
} from "@/data/mockData";

interface InventoryContextType {
  obras: Obra[];
  insumos: Insumo[];
  fornecedores: Fornecedor[];
  estoque: EstoqueItem[];
  entradas: EntradaEstoque[];
  saidas: SaidaEstoque[];
  transferencias: Transferencia[];
  devolucoes: Devolucao[];
  movimentacoes: Movimentacao[];
  fvms: FVM[];
  avaliacoes: AvaliacaoFornecedor[];
  inventarios: InventarioItem[];

  selectedObraId: string | null;
  setSelectedObraId: (id: string | null) => void;
  getSelectedObra: () => Obra | undefined;
  getEstoqueByObra: (obraId: string) => (EstoqueItem & { insumo: Insumo })[];
  getEstoqueTotal: () => number;

  addEntrada: (entrada: Omit<EntradaEstoque, "id" | "createdAt">) => void;
  addSaida: (saida: Omit<SaidaEstoque, "id" | "createdAt">) => void;
  addTransferencia: (t: Omit<Transferencia, "id" | "createdAt">) => void;
  addDevolucao: (d: Omit<Devolucao, "id" | "createdAt">) => void;
  addFVM: (fvm: Omit<FVM, "id" | "createdAt">) => string;
  addAvaliacao: (av: Omit<AvaliacaoFornecedor, "id" | "createdAt">) => string;
  addInventarioItem: (item: Omit<InventarioItem, "id" | "createdAt">) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

function genId() { return Math.random().toString(36).substring(2, 10); }
function now() { return new Date().toISOString(); }

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [obras] = useState<Obra[]>(mockObras);
  const [insumos] = useState<Insumo[]>(mockInsumos);
  const [fornecedores] = useState<Fornecedor[]>(mockFornecedores);
  const [estoque, setEstoque] = useState<EstoqueItem[]>(mockEstoque);
  const [entradas, setEntradas] = useState<EntradaEstoque[]>(mockEntradas);
  const [saidas, setSaidas] = useState<SaidaEstoque[]>(mockSaidas);
  const [transferencias, setTransferencias] = useState<Transferencia[]>(mockTransferencias);
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>(mockDevolucoes);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(mockMovimentacoes);
  const [fvms, setFvms] = useState<FVM[]>(mockFVMs);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFornecedor[]>(mockAvaliacoes);
  const [inventarios, setInventarios] = useState<InventarioItem[]>([]);

  const [selectedObraId, setSelectedObraId] = useState<string | null>(() => {
    return localStorage.getItem("vr_selected_obra");
  });

  const handleSetSelectedObra = useCallback((id: string | null) => {
    setSelectedObraId(id);
    if (id) localStorage.setItem("vr_selected_obra", id);
    else localStorage.removeItem("vr_selected_obra");
  }, []);

  const getSelectedObra = useCallback(() => obras.find(o => o.id === selectedObraId), [obras, selectedObraId]);

  const getEstoqueByObra = useCallback((obraId: string) => {
    return estoque
      .filter(e => e.obraId === obraId)
      .map(e => ({ ...e, insumo: insumos.find(i => i.id === e.insumoId)! }))
      .filter(e => e.insumo);
  }, [estoque, insumos]);

  const getEstoqueTotal = useCallback(() => {
    return estoque.reduce((acc, e) => acc + e.totalValue, 0);
  }, [estoque]);

  const updateEstoque = useCallback((obraId: string, insumoId: string, qtyDelta: number, valueDelta: number) => {
    setEstoque(prev => {
      const idx = prev.findIndex(e => e.obraId === obraId && e.insumoId === insumoId);
      if (idx >= 0) {
        const updated = [...prev];
        const item = { ...updated[idx] };
        item.quantity += qtyDelta;
        item.totalValue += valueDelta;
        item.averageUnitCost = item.quantity > 0 ? item.totalValue / item.quantity : 0;
        updated[idx] = item;
        return updated;
      } else if (qtyDelta > 0) {
        return [...prev, {
          insumoId, obraId, quantity: qtyDelta,
          averageUnitCost: valueDelta / qtyDelta,
          totalValue: valueDelta,
        }];
      }
      return prev;
    });
  }, []);

  const addMovimentacao = useCallback((m: Omit<Movimentacao, "id" | "createdAt">) => {
    setMovimentacoes(prev => [...prev, { ...m, id: genId(), createdAt: now() }]);
  }, []);

  const addEntrada = useCallback((entrada: Omit<EntradaEstoque, "id" | "createdAt">) => {
    const id = genId();
    setEntradas(prev => [...prev, { ...entrada, id, createdAt: now() }]);
    updateEstoque(entrada.obraId, entrada.insumoId, entrada.quantity, entrada.totalValue);
    addMovimentacao({
      obraId: entrada.obraId, insumoId: entrada.insumoId, type: "entrada",
      quantity: entrada.quantity, date: entrada.date,
      description: `Entrada NF ${entrada.notaFiscal}`, referenceId: id,
    });
  }, [updateEstoque, addMovimentacao]);

  const addSaida = useCallback((saida: Omit<SaidaEstoque, "id" | "createdAt">) => {
    const id = genId();
    const estoqueItem = estoque.find(e => e.obraId === saida.obraId && e.insumoId === saida.insumoId);
    const unitCost = estoqueItem ? estoqueItem.averageUnitCost : 0;
    setSaidas(prev => [...prev, { ...saida, id, createdAt: now() }]);
    updateEstoque(saida.obraId, saida.insumoId, -saida.quantity, -(saida.quantity * unitCost));
    addMovimentacao({
      obraId: saida.obraId, insumoId: saida.insumoId, type: "saida",
      quantity: saida.quantity, date: saida.date,
      description: `Saída - ${saida.localAplicacao}`, referenceId: id,
    });
  }, [estoque, updateEstoque, addMovimentacao]);

  const addTransferencia = useCallback((t: Omit<Transferencia, "id" | "createdAt">) => {
    const id = genId();
    const estoqueItem = estoque.find(e => e.obraId === t.obraOrigemId && e.insumoId === t.insumoId);
    const unitCost = estoqueItem ? estoqueItem.averageUnitCost : 0;
    setTransferencias(prev => [...prev, { ...t, id, createdAt: now() }]);
    updateEstoque(t.obraOrigemId, t.insumoId, -t.quantity, -(t.quantity * unitCost));
    updateEstoque(t.obraDestinoId, t.insumoId, t.quantity, t.quantity * unitCost);
    addMovimentacao({ obraId: t.obraOrigemId, insumoId: t.insumoId, type: "transferencia_saida", quantity: t.quantity, date: t.date, description: `Transferência para obra`, referenceId: id });
    addMovimentacao({ obraId: t.obraDestinoId, insumoId: t.insumoId, type: "transferencia_entrada", quantity: t.quantity, date: t.date, description: `Transferência de obra`, referenceId: id });
  }, [estoque, updateEstoque, addMovimentacao]);

  const addDevolucao = useCallback((d: Omit<Devolucao, "id" | "createdAt">) => {
    const id = genId();
    const estoqueItem = estoque.find(e => e.obraId === d.obraId && e.insumoId === d.insumoId);
    const unitCost = estoqueItem ? estoqueItem.averageUnitCost : 0;
    setDevolucoes(prev => [...prev, { ...d, id, createdAt: now() }]);
    updateEstoque(d.obraId, d.insumoId, -d.quantity, -(d.quantity * unitCost));
    addMovimentacao({ obraId: d.obraId, insumoId: d.insumoId, type: "devolucao", quantity: d.quantity, date: d.date, description: `Devolução - ${d.motivo}`, referenceId: id });
  }, [estoque, updateEstoque, addMovimentacao]);

  const addFVM = useCallback((fvm: Omit<FVM, "id" | "createdAt">) => {
    const id = genId();
    setFvms(prev => [...prev, { ...fvm, id, createdAt: now() }]);
    return id;
  }, []);

  const addAvaliacao = useCallback((av: Omit<AvaliacaoFornecedor, "id" | "createdAt">) => {
    const id = genId();
    setAvaliacoes(prev => [...prev, { ...av, id, createdAt: now() }]);
    return id;
  }, []);

  const addInventarioItem = useCallback((item: Omit<InventarioItem, "id" | "createdAt">) => {
    const id = genId();
    setInventarios(prev => [...prev, { ...item, id, createdAt: now() }]);
    if (item.diferenca !== 0) {
      const estoqueItem = estoque.find(e => e.obraId === item.obraId && e.insumoId === item.insumoId);
      const unitCost = estoqueItem ? estoqueItem.averageUnitCost : 0;
      updateEstoque(item.obraId, item.insumoId, item.diferenca, item.diferenca * unitCost);
      addMovimentacao({ obraId: item.obraId, insumoId: item.insumoId, type: "ajuste_inventario", quantity: Math.abs(item.diferenca), date: item.date, description: `Ajuste inventário: ${item.justificativa}`, referenceId: id });
    }
  }, [estoque, updateEstoque, addMovimentacao]);

  return (
    <InventoryContext.Provider value={{
      obras, insumos, fornecedores, estoque, entradas, saidas,
      transferencias, devolucoes, movimentacoes, fvms, avaliacoes, inventarios,
      selectedObraId, setSelectedObraId: handleSetSelectedObra, getSelectedObra,
      getEstoqueByObra, getEstoqueTotal,
      addEntrada, addSaida, addTransferencia, addDevolucao, addFVM, addAvaliacao, addInventarioItem,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
