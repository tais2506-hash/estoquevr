import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type EstoqueRow = {
  id: string; obra_id: string; insumo_id: string; quantity: number;
  average_unit_cost: number; total_value: number; updated_at: string;
};
type InsumoRow = {
  id: string; code: string; name: string; unit: string; category: string;
  controla_estoque: boolean; controla_consumo: boolean; controla_rastreabilidade: boolean;
  material_nao_estocavel: boolean; estoque_minimo: number;
  deleted_at: string | null;
  created_at: string; updated_at: string;
};
type ObraRow = {
  id: string; code: string; name: string; address: string; status: string;
  created_at: string; updated_at: string;
};
type EntradaRow = {
  id: string; obra_id: string; insumo_id: string; nota_fiscal: string;
  fornecedor_id: string; quantity: number; unit_value: number; total_value: number;
  date: string; fvm_id: string | null; avaliacao_id: string | null;
  user_id: string; created_at: string;
};
type MovimentacaoRow = {
  id: string; obra_id: string; insumo_id: string; type: string; quantity: number;
  date: string; description: string; reference_id: string | null;
  user_id: string; created_at: string;
};
type SaidaRow = {
  id: string; obra_id: string; insumo_id: string; quantity: number; date: string;
  local_aplicacao: string; responsavel: string; user_id: string;
  service_package_id: string | null; location_id: string | null;
  quantidade_executada: number | null; kit_id: string | null;
  created_at: string;
};
type KitRow = {
  id: string; name: string; description: string; obra_id: string | null;
  deleted_at: string | null; created_at: string; updated_at: string;
};
type KitItemRow = {
  id: string; kit_id: string; insumo_id: string; quantity: number; created_at: string;
};
type LocationRow = {
  id: string; obra_id: string; parent_id: string | null; name: string;
  type: string; status: string;
  deleted_at: string | null; created_at: string; updated_at: string;
};
type ServicePackageRow = {
  id: string; obra_id: string | null; name: string; eap_code: string; unit: string;
  status: string; deleted_at: string | null; created_at: string; updated_at: string;
};

export type EstoqueWithInsumo = EstoqueRow & { insumo: InsumoRow };

interface InventoryContextType {
  obras: ObraRow[];
  insumos: InsumoRow[];
  estoque: EstoqueRow[];
  entradas: EntradaRow[];
  movimentacoes: MovimentacaoRow[];
  saidas: SaidaRow[];
  kits: KitRow[];
  kitItems: KitItemRow[];
  locations: LocationRow[];
  servicePackages: ServicePackageRow[];
  loading: boolean;

  selectedObraId: string | null;
  setSelectedObraId: (id: string | null) => void;
  getSelectedObra: () => ObraRow | undefined;
  getEstoqueByObra: (obraId: string) => EstoqueWithInsumo[];

  addEntrada: (data: { obraId: string; insumoId: string; notaFiscal: string; quantity: number; unitValue: number; totalValue: number; date: string; validade?: string; lote?: string; ocItemId?: string }) => Promise<void>;
  addSaida: (data: { obraId: string; insumoId: string; quantity: number; date: string; localAplicacao: string; responsavel: string; locationId?: string; kitId?: string; servicePackageId?: string; lote?: string }) => Promise<void>;
  addTransferencia: (data: { obraOrigemId: string; obraDestinoId: string; insumoId: string; quantity: number; date: string }) => Promise<void>;
  addInventarioItem: (data: { obraId: string; insumoId: string; quantidadeSistema: number; quantidadeFisica: number; diferenca: number; justificativa: string; date: string }) => Promise<void>;
  undoInventarioAjuste: (movimentacaoId: string) => Promise<void>;
  undoEntrada: (movimentacaoId: string) => Promise<void>;
  undoSaida: (movimentacaoId: string) => Promise<void>;
  undoTransferencia: (movimentacaoId: string) => Promise<void>;
  resetEstoqueObra: (obraId: string) => Promise<void>;

  refetchAll: () => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [selectedObraId, setSelectedObraIdState] = useState<string | null>(() => {
    return localStorage.getItem("vr_selected_obra");
  });

  const setSelectedObraId = useCallback((id: string | null) => {
    setSelectedObraIdState(id);
    if (id) localStorage.setItem("vr_selected_obra", id);
    else localStorage.removeItem("vr_selected_obra");
  }, []);

  const { data: obras = [], isLoading: l1 } = useQuery({
    queryKey: ["obras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: insumos = [], isLoading: l2 } = useQuery({
    queryKey: ["insumos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insumos").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const { data: estoque = [], isLoading: l4 } = useQuery({
    queryKey: ["estoque"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estoque").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ["entradas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entradas").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const { data: saidas = [] } = useQuery({
    queryKey: ["saidas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saidas").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const { data: kits = [] } = useQuery({
    queryKey: ["kits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kits").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const { data: kitItems = [] } = useQuery({
    queryKey: ["kit_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kit_items").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const { data: servicePackages = [] } = useQuery({
    queryKey: ["service_packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_packages").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data as ServicePackageRow[];
    },
    enabled: !!userId,
  });

  const loading = l1 || l2 || l4;

  const getSelectedObra = useCallback(() => obras.find(o => o.id === selectedObraId), [obras, selectedObraId]);

  const getEstoqueByObra = useCallback((obraId: string): EstoqueWithInsumo[] => {
    return estoque
      .filter(e => e.obra_id === obraId)
      .map(e => ({ ...e, insumo: insumos.find(i => i.id === e.insumo_id)! }))
      .filter(e => e.insumo);
  }, [estoque, insumos]);

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["estoque"] });
    queryClient.invalidateQueries({ queryKey: ["entradas"] });
    queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
    queryClient.invalidateQueries({ queryKey: ["saidas"] });
    queryClient.invalidateQueries({ queryKey: ["kits"] });
    queryClient.invalidateQueries({ queryKey: ["kit_items"] });
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    queryClient.invalidateQueries({ queryKey: ["service_packages"] });
  }, [queryClient]);

  const updateEstoque = useCallback(async (obraId: string, insumoId: string, qtyDelta: number, valueDelta: number) => {
    const { data: existing } = await supabase
      .from("estoque").select("*").eq("obra_id", obraId).eq("insumo_id", insumoId).single();

    if (existing) {
      const newQty = existing.quantity + qtyDelta;
      const newTotal = existing.total_value + valueDelta;
      const newAvg = newQty > 0 ? newTotal / newQty : 0;
      await supabase.from("estoque").update({ quantity: newQty, total_value: newTotal, average_unit_cost: newAvg }).eq("id", existing.id);
    } else if (qtyDelta > 0) {
      await supabase.from("estoque").insert({ obra_id: obraId, insumo_id: insumoId, quantity: qtyDelta, total_value: valueDelta, average_unit_cost: valueDelta / qtyDelta });
    }
  }, []);

  const addMovimentacao = useCallback(async (data: { obraId: string; insumoId: string; type: string; quantity: number; date: string; description: string; referenceId?: string }) => {
    if (!userId) return;
    await supabase.from("movimentacoes").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, type: data.type as any,
      quantity: data.quantity, date: data.date, description: data.description,
      reference_id: data.referenceId || null, user_id: userId,
      user_name: user?.name || "",
    });
  }, [userId, user]);

  const addAuditLog = useCallback(async (action: string, tableName: string, recordId?: string, obraId?: string, oldValue?: any, newValue?: any) => {
    if (!userId) return;
    await supabase.from("audit_logs").insert({
      user_id: userId, user_name: user?.name || "", user_role: user?.role || "",
      action, table_name: tableName, record_id: recordId || null,
      obra_id: obraId || null, old_value: oldValue || null, new_value: newValue || null,
    });
  }, [userId, user]);

  const addEntrada = useCallback(async (data: { obraId: string; insumoId: string; notaFiscal: string; quantity: number; unitValue: number; totalValue: number; date: string; validade?: string; lote?: string }) => {
    if (!userId) return;
    const insumo = insumos.find(i => i.id === data.insumoId);

    const { data: inserted, error } = await supabase.from("entradas").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, nota_fiscal: data.notaFiscal,
      fornecedor_id: null,
      quantity: data.quantity, unit_value: data.unitValue,
      total_value: data.totalValue, date: data.date,
      user_id: userId,
      validade: data.validade || null,
      lote: data.lote || null,
    } as any).select().single();
    if (error) throw error;

    if (!insumo?.material_nao_estocavel) {
      await updateEstoque(data.obraId, data.insumoId, data.quantity, data.totalValue);
    }
    await addMovimentacao({ obraId: data.obraId, insumoId: data.insumoId, type: "entrada", quantity: data.quantity, date: data.date, description: `Entrada NF ${data.notaFiscal}`, referenceId: inserted.id });
    await addAuditLog("entrada_estoque", "entradas", inserted.id, data.obraId, null, data);
    refetchAll();
  }, [userId, insumos, updateEstoque, addMovimentacao, addAuditLog, refetchAll]);

  const addSaida = useCallback(async (data: { obraId: string; insumoId: string; quantity: number; date: string; localAplicacao: string; responsavel: string; locationId?: string; kitId?: string; servicePackageId?: string; lote?: string }) => {
    if (!userId) return;
    const estoqueItem = estoque.find(e => e.obra_id === data.obraId && e.insumo_id === data.insumoId);
    const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;

    const { data: inserted, error } = await supabase.from("saidas").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, quantity: data.quantity,
      date: data.date, local_aplicacao: data.localAplicacao, responsavel: data.responsavel,
      user_id: userId, location_id: data.locationId || null, kit_id: data.kitId || null,
      service_package_id: data.servicePackageId || null,
      lote: data.lote || null,
    } as any).select().single();
    if (error) throw error;

    await updateEstoque(data.obraId, data.insumoId, -data.quantity, -(data.quantity * unitCost));
    await addMovimentacao({ obraId: data.obraId, insumoId: data.insumoId, type: "saida", quantity: data.quantity, date: data.date, description: `Saída - ${data.localAplicacao}`, referenceId: inserted.id });
    await addAuditLog("saida_estoque", "saidas", inserted.id, data.obraId, null, data);
    refetchAll();
  }, [userId, estoque, updateEstoque, addMovimentacao, addAuditLog, refetchAll]);

  const addTransferencia = useCallback(async (data: { obraOrigemId: string; obraDestinoId: string; insumoId: string; quantity: number; date: string }) => {
    if (!userId) return;
    const estoqueItem = estoque.find(e => e.obra_id === data.obraOrigemId && e.insumo_id === data.insumoId);
    const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;

    const { data: inserted, error } = await supabase.from("transferencias").insert({
      obra_origem_id: data.obraOrigemId, obra_destino_id: data.obraDestinoId,
      insumo_id: data.insumoId, quantity: data.quantity, date: data.date, user_id: userId,
    }).select().single();
    if (error) throw error;

    await updateEstoque(data.obraOrigemId, data.insumoId, -data.quantity, -(data.quantity * unitCost));
    await updateEstoque(data.obraDestinoId, data.insumoId, data.quantity, data.quantity * unitCost);
    await addMovimentacao({ obraId: data.obraOrigemId, insumoId: data.insumoId, type: "transferencia_saida", quantity: data.quantity, date: data.date, description: "Transferência para obra", referenceId: inserted.id });
    await addMovimentacao({ obraId: data.obraDestinoId, insumoId: data.insumoId, type: "transferencia_entrada", quantity: data.quantity, date: data.date, description: "Transferência de obra", referenceId: inserted.id });
    await addAuditLog("transferencia", "transferencias", inserted.id, data.obraOrigemId, null, data);
    refetchAll();
  }, [userId, estoque, updateEstoque, addMovimentacao, addAuditLog, refetchAll]);

  const addInventarioItem = useCallback(async (data: { obraId: string; insumoId: string; quantidadeSistema: number; quantidadeFisica: number; diferenca: number; justificativa: string; date: string }) => {
    if (!userId) return;
    const { data: inserted, error } = await supabase.from("inventarios").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, quantidade_sistema: data.quantidadeSistema,
      quantidade_fisica: data.quantidadeFisica, diferenca: data.diferenca,
      justificativa: data.justificativa, date: data.date, user_id: userId,
    }).select().single();
    if (error) throw error;

    if (data.diferenca !== 0) {
      const estoqueItem = estoque.find(e => e.obra_id === data.obraId && e.insumo_id === data.insumoId);
      const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;
      await updateEstoque(data.obraId, data.insumoId, data.diferenca, data.diferenca * unitCost);
      await addMovimentacao({ obraId: data.obraId, insumoId: data.insumoId, type: "ajuste_inventario", quantity: Math.abs(data.diferenca), date: data.date, description: `Ajuste inventário: ${data.justificativa}`, referenceId: inserted.id });
    }
    await addAuditLog("inventario", "inventarios", inserted.id, data.obraId, null, data);
    refetchAll();
  }, [userId, estoque, updateEstoque, addMovimentacao, addAuditLog, refetchAll]);

  const undoInventarioAjuste = useCallback(async (movimentacaoId: string) => {
    if (!userId) return;

    // Find the movimentacao
    const mov = movimentacoes.find(m => m.id === movimentacaoId && m.type === "ajuste_inventario");
    if (!mov) throw new Error("Movimentação de ajuste não encontrada");

    // Find the inventario record via reference_id
    const inventarioId = mov.reference_id;
    if (!inventarioId) throw new Error("Referência do inventário não encontrada");

    const { data: invRecord, error: invError } = await supabase
      .from("inventarios").select("*").eq("id", inventarioId).single();
    if (invError || !invRecord) throw new Error("Registro de inventário não encontrado");

    const diferenca = invRecord.diferenca as number;

    if (diferenca !== 0) {
      // Reverse the stock adjustment
      const estoqueItem = estoque.find(e => e.obra_id === mov.obra_id && e.insumo_id === mov.insumo_id);
      const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;
      await updateEstoque(mov.obra_id, mov.insumo_id, -diferenca, -diferenca * unitCost);
    }

    // Soft-delete the movimentacao
    await supabase.from("movimentacoes").update({ deleted_at: new Date().toISOString() }).eq("id", movimentacaoId);

    // Delete the inventario record (no soft-delete column, so we hard delete)
    await supabase.from("inventarios").delete().eq("id", inventarioId);

    await addAuditLog("desfazer_ajuste_inventario", "inventarios", inventarioId, mov.obra_id, invRecord, null);
    refetchAll();
  }, [userId, movimentacoes, estoque, updateEstoque, addAuditLog, refetchAll]);

  const undoEntrada = useCallback(async (movimentacaoId: string) => {
    if (!userId) return;
    const mov = movimentacoes.find(m => m.id === movimentacaoId && m.type === "entrada");
    if (!mov) throw new Error("Movimentação de entrada não encontrada");
    const refId = mov.reference_id;
    if (!refId) throw new Error("Referência da entrada não encontrada");

    const { data: entrada, error } = await supabase.from("entradas").select("*").eq("id", refId).single();
    if (error || !entrada) throw new Error("Registro de entrada não encontrado");

    const insumo = insumos.find(i => i.id === mov.insumo_id);
    if (!insumo?.material_nao_estocavel) {
      await updateEstoque(mov.obra_id, mov.insumo_id, -entrada.quantity, -entrada.total_value);
    }
    await supabase.from("entradas").update({ deleted_at: new Date().toISOString() }).eq("id", refId);
    await supabase.from("movimentacoes").update({ deleted_at: new Date().toISOString() }).eq("id", movimentacaoId);
    await addAuditLog("desfazer_entrada", "entradas", refId, mov.obra_id, entrada, null);
    refetchAll();
  }, [userId, movimentacoes, insumos, updateEstoque, addAuditLog, refetchAll]);

  const undoSaida = useCallback(async (movimentacaoId: string) => {
    if (!userId) return;
    const mov = movimentacoes.find(m => m.id === movimentacaoId && m.type === "saida");
    if (!mov) throw new Error("Movimentação de saída não encontrada");
    const refId = mov.reference_id;
    if (!refId) throw new Error("Referência da saída não encontrada");

    const { data: saida, error } = await supabase.from("saidas").select("*").eq("id", refId).single();
    if (error || !saida) throw new Error("Registro de saída não encontrado");

    // Restore stock: we need to estimate value. Use current avg cost.
    const estoqueItem = estoque.find(e => e.obra_id === mov.obra_id && e.insumo_id === mov.insumo_id);
    const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;
    await updateEstoque(mov.obra_id, mov.insumo_id, saida.quantity, saida.quantity * unitCost);

    await supabase.from("saidas").update({ deleted_at: new Date().toISOString() } as any).eq("id", refId);
    await supabase.from("movimentacoes").update({ deleted_at: new Date().toISOString() }).eq("id", movimentacaoId);
    await addAuditLog("desfazer_saida", "saidas", refId, mov.obra_id, saida, null);
    refetchAll();
  }, [userId, movimentacoes, estoque, updateEstoque, addAuditLog, refetchAll]);

  const undoTransferencia = useCallback(async (movimentacaoId: string) => {
    if (!userId) return;
    const mov = movimentacoes.find(m => m.id === movimentacaoId && (m.type === "transferencia_saida" || m.type === "transferencia_entrada"));
    if (!mov) throw new Error("Movimentação de transferência não encontrada");
    const refId = mov.reference_id;
    if (!refId) throw new Error("Referência da transferência não encontrada");

    // Try transferencias table first, then emprestimos
    const { data: transf } = await supabase.from("transferencias").select("*").eq("id", refId).maybeSingle();

    let origemId: string;
    let destinoId: string;
    let insumoId: string;
    let quantity: number;
    let auditTable: string;

    if (transf) {
      origemId = transf.obra_origem_id;
      destinoId = transf.obra_destino_id;
      insumoId = transf.insumo_id;
      quantity = transf.quantity;
      auditTable = "transferencias";
    } else {
      // Check emprestimos table
      const { data: emp, error: empErr } = await supabase.from("emprestimos").select("*").eq("id", refId).maybeSingle();
      if (empErr || !emp) throw new Error("Registro de transferência/empréstimo não encontrado");
      origemId = emp.obra_emprestadora_id;
      destinoId = emp.obra_solicitante_id;
      insumoId = emp.insumo_id;
      quantity = emp.quantity;
      auditTable = "emprestimos";

      // Revert empréstimo status back to pendente
      await supabase.from("emprestimos").update({ status: "pendente", aprovador_user_id: null, aprovador_nome: null } as any).eq("id", refId);
    }

    // Reverse: add back to origin, remove from destination
    const estoqueOrig = estoque.find(e => e.obra_id === origemId && e.insumo_id === insumoId);
    const estoqDest = estoque.find(e => e.obra_id === destinoId && e.insumo_id === insumoId);
    const unitCostOrig = estoqueOrig ? estoqueOrig.average_unit_cost : (estoqDest ? estoqDest.average_unit_cost : 0);
    const unitCostDest = estoqDest ? estoqDest.average_unit_cost : unitCostOrig;

    await updateEstoque(origemId, insumoId, quantity, quantity * unitCostDest);
    await updateEstoque(destinoId, insumoId, -quantity, -(quantity * unitCostDest));

    // Soft-delete both movimentacoes linked to this transfer
    const relatedMovs = movimentacoes.filter(m => m.reference_id === refId && (m.type === "transferencia_saida" || m.type === "transferencia_entrada"));
    for (const rm of relatedMovs) {
      await supabase.from("movimentacoes").update({ deleted_at: new Date().toISOString() }).eq("id", rm.id);
    }
    await addAuditLog("desfazer_transferencia", auditTable, refId, origemId, { origemId, destinoId, insumoId, quantity }, null);
    refetchAll();
  }, [userId, movimentacoes, estoque, updateEstoque, addAuditLog, refetchAll]);

  const resetEstoqueObra = useCallback(async (obraId: string) => {
    if (!userId) return;
    // Get current stock items before deleting so we can log them
    const obraEstoque = estoque.filter(e => e.obra_id === obraId && e.quantity > 0);
    const today = new Date().toISOString().split("T")[0];
    
    const { error } = await supabase.from("estoque").delete().eq("obra_id", obraId);
    if (error) throw error;

    // Log a movimentação for each item that was zeroed
    for (const item of obraEstoque) {
      const insumo = insumos.find(i => i.id === item.insumo_id);
      await supabase.from("movimentacoes").insert({
        obra_id: obraId, insumo_id: item.insumo_id, type: "exclusao_global" as any,
        quantity: item.quantity, date: today,
        description: `Exclusão global do estoque — ${insumo?.name || "insumo"}: ${item.quantity} ${insumo?.unit || "un"}`,
        user_id: userId, user_name: user?.name || "",
      });
    }

    await addAuditLog("zerar_estoque_obra", "estoque", null, obraId, null, { action: "reset_all", items: obraEstoque.length });
    refetchAll();
  }, [userId, user, estoque, insumos, addAuditLog, refetchAll]);

  return (
    <InventoryContext.Provider value={{
      obras, insumos, estoque, entradas, movimentacoes, saidas,
      kits, kitItems, locations, servicePackages, loading,
      selectedObraId, setSelectedObraId, getSelectedObra, getEstoqueByObra,
      addEntrada, addSaida, addTransferencia, addInventarioItem, undoInventarioAjuste,
      undoEntrada, undoSaida, undoTransferencia, resetEstoqueObra,
      refetchAll,
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
