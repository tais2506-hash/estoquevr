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
  material_nao_estocavel: boolean; exige_servico_baixa: boolean; estoque_minimo: number;
  deleted_at: string | null;
  created_at: string; updated_at: string;
};
type ObraRow = {
  id: string; code: string; name: string; address: string; status: string;
  created_at: string; updated_at: string;
};
type FornecedorRow = {
  id: string; name: string; cnpj: string; contact: string | null;
  deleted_at: string | null;
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
type AvaliacaoRow = {
  id: string; obra_id: string; fornecedor_id: string; nota_fiscal: string;
  pontualidade: number; qualidade: number; atendimento: number; documentacao: number;
  observacoes: string | null; date: string; user_id: string; created_at: string;
};
type SaidaRow = {
  id: string; obra_id: string; insumo_id: string; quantity: number; date: string;
  local_aplicacao: string; responsavel: string; user_id: string;
  service_package_id: string | null; location_id: string | null;
  quantidade_executada: number | null; kit_id: string | null;
  created_at: string;
};
type KitRow = {
  id: string; name: string; description: string;
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
type FVMRow = {
  id: string; obra_id: string; nota_fiscal: string; fornecedor_id: string;
  date: string; quantidade_conferida: boolean; qualidade_material: boolean;
  documentacao_ok: boolean; observacoes: string | null; status: string;
  user_id: string; created_at: string;
};

export type EstoqueWithInsumo = EstoqueRow & { insumo: InsumoRow };

interface InventoryContextType {
  obras: ObraRow[];
  insumos: InsumoRow[];
  fornecedores: FornecedorRow[];
  estoque: EstoqueRow[];
  entradas: EntradaRow[];
  movimentacoes: MovimentacaoRow[];
  avaliacoes: AvaliacaoRow[];
  saidas: SaidaRow[];
  kits: KitRow[];
  kitItems: KitItemRow[];
  
  locations: LocationRow[];
  fvms: FVMRow[];
  loading: boolean;

  selectedObraId: string | null;
  setSelectedObraId: (id: string | null) => void;
  getSelectedObra: () => ObraRow | undefined;
  getEstoqueByObra: (obraId: string) => EstoqueWithInsumo[];

  addEntrada: (data: { obraId: string; insumoId: string; notaFiscal: string; fornecedorId: string; quantity: number; unitValue: number; totalValue: number; date: string; fvmId: string; avaliacaoId: string }) => Promise<void>;
  addSaida: (data: { obraId: string; insumoId: string; quantity: number; date: string; localAplicacao: string; responsavel: string; locationId?: string; kitId?: string }) => Promise<void>;
  addTransferencia: (data: { obraOrigemId: string; obraDestinoId: string; insumoId: string; quantity: number; date: string }) => Promise<void>;
  addDevolucao: (data: { obraId: string; entradaId: string; insumoId: string; fornecedorId: string; quantity: number; motivo: string; date: string }) => Promise<void>;
  addFVM: (data: { obraId: string; notaFiscal: string; fornecedorId: string; date: string; quantidadeConferida: boolean; qualidadeMaterial: boolean; documentacaoOk: boolean; observacoes: string; status: string }) => Promise<string>;
  addAvaliacao: (data: { obraId: string; fornecedorId: string; notaFiscal: string; date: string; pontualidade: number; qualidade: number; atendimento: number; documentacao: number; observacoes: string }) => Promise<string>;
  addInventarioItem: (data: { obraId: string; insumoId: string; quantidadeSistema: number; quantidadeFisica: number; diferenca: number; justificativa: string; date: string }) => Promise<void>;

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

  // Queries
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

  const { data: fornecedores = [], isLoading: l3 } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").is("deleted_at", null).order("name");
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

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ["avaliacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("avaliacoes").select("*");
      if (error) throw error;
      return data;
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

  const { data: fvms = [] } = useQuery({
    queryKey: ["fvms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fvms").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const loading = l1 || l2 || l3 || l4;

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
    queryClient.invalidateQueries({ queryKey: ["avaliacoes"] });
    queryClient.invalidateQueries({ queryKey: ["saidas"] });
    queryClient.invalidateQueries({ queryKey: ["kits"] });
    queryClient.invalidateQueries({ queryKey: ["kit_items"] });
    
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    queryClient.invalidateQueries({ queryKey: ["fvms"] });
  }, [queryClient]);

  // Helper: update estoque
  const updateEstoque = useCallback(async (obraId: string, insumoId: string, qtyDelta: number, valueDelta: number) => {
    const { data: existing } = await supabase
      .from("estoque")
      .select("*")
      .eq("obra_id", obraId)
      .eq("insumo_id", insumoId)
      .single();

    if (existing) {
      const newQty = existing.quantity + qtyDelta;
      const newTotal = existing.total_value + valueDelta;
      const newAvg = newQty > 0 ? newTotal / newQty : 0;
      await supabase.from("estoque").update({
        quantity: newQty,
        total_value: newTotal,
        average_unit_cost: newAvg,
      }).eq("id", existing.id);
    } else if (qtyDelta > 0) {
      await supabase.from("estoque").insert({
        obra_id: obraId,
        insumo_id: insumoId,
        quantity: qtyDelta,
        total_value: valueDelta,
        average_unit_cost: valueDelta / qtyDelta,
      });
    }
  }, []);

  const addMovimentacao = useCallback(async (data: { obraId: string; insumoId: string; type: string; quantity: number; date: string; description: string; referenceId?: string }) => {
    if (!userId) return;
    await supabase.from("movimentacoes").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, type: data.type as any,
      quantity: data.quantity, date: data.date, description: data.description,
      reference_id: data.referenceId || null, user_id: userId,
    });
  }, [userId]);

  const addAuditLog = useCallback(async (action: string, tableName: string, recordId?: string, obraId?: string, oldValue?: any, newValue?: any) => {
    if (!userId) return;
    await supabase.from("audit_logs").insert({
      user_id: userId, user_name: user?.name || "", user_role: user?.role || "",
      action, table_name: tableName, record_id: recordId || null,
      obra_id: obraId || null, old_value: oldValue || null, new_value: newValue || null,
    });
  }, [userId, user]);

  const addEntrada = useCallback(async (data: { obraId: string; insumoId: string; notaFiscal: string; fornecedorId: string; quantity: number; unitValue: number; totalValue: number; date: string; fvmId: string; avaliacaoId: string }) => {
    if (!userId) return;
    // Check if insumo is material_nao_estocavel
    const insumo = insumos.find(i => i.id === data.insumoId);

    const { data: inserted, error } = await supabase.from("entradas").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, nota_fiscal: data.notaFiscal,
      fornecedor_id: data.fornecedorId, quantity: data.quantity, unit_value: data.unitValue,
      total_value: data.totalValue, date: data.date, fvm_id: data.fvmId, avaliacao_id: data.avaliacaoId,
      user_id: userId,
    }).select().single();
    if (error) throw error;

    // Only update estoque if not "material não estocável"
    if (!insumo?.material_nao_estocavel) {
      await updateEstoque(data.obraId, data.insumoId, data.quantity, data.totalValue);
    }
    await addMovimentacao({ obraId: data.obraId, insumoId: data.insumoId, type: "entrada", quantity: data.quantity, date: data.date, description: `Entrada NF ${data.notaFiscal}`, referenceId: inserted.id });
    await addAuditLog("entrada_estoque", "entradas", inserted.id, data.obraId, null, data);
    refetchAll();
  }, [userId, insumos, updateEstoque, addMovimentacao, addAuditLog, refetchAll]);

  const addSaida = useCallback(async (data: { obraId: string; insumoId: string; quantity: number; date: string; localAplicacao: string; responsavel: string; servicePackageId?: string; locationId?: string; quantidadeExecutada?: number; kitId?: string }) => {
    if (!userId) return;
    const estoqueItem = estoque.find(e => e.obra_id === data.obraId && e.insumo_id === data.insumoId);
    const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;

    const { data: inserted, error } = await supabase.from("saidas").insert({
      obra_id: data.obraId, insumo_id: data.insumoId, quantity: data.quantity,
      date: data.date, local_aplicacao: data.localAplicacao, responsavel: data.responsavel,
      user_id: userId,
      service_package_id: data.servicePackageId || null,
      location_id: data.locationId || null,
      quantidade_executada: data.quantidadeExecutada || null,
      kit_id: data.kitId || null,
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

  const addDevolucao = useCallback(async (data: { obraId: string; entradaId: string; insumoId: string; fornecedorId: string; quantity: number; motivo: string; date: string }) => {
    if (!userId) return;
    const estoqueItem = estoque.find(e => e.obra_id === data.obraId && e.insumo_id === data.insumoId);
    const unitCost = estoqueItem ? estoqueItem.average_unit_cost : 0;

    const { data: inserted, error } = await supabase.from("devolucoes").insert({
      obra_id: data.obraId, entrada_id: data.entradaId, insumo_id: data.insumoId,
      fornecedor_id: data.fornecedorId, quantity: data.quantity, motivo: data.motivo,
      date: data.date, user_id: userId,
    }).select().single();
    if (error) throw error;

    await updateEstoque(data.obraId, data.insumoId, -data.quantity, -(data.quantity * unitCost));
    await addMovimentacao({ obraId: data.obraId, insumoId: data.insumoId, type: "devolucao", quantity: data.quantity, date: data.date, description: `Devolução - ${data.motivo}`, referenceId: inserted.id });
    await addAuditLog("devolucao", "devolucoes", inserted.id, data.obraId, null, data);
    refetchAll();
  }, [userId, estoque, updateEstoque, addMovimentacao, addAuditLog, refetchAll]);

  const addFVM = useCallback(async (data: { obraId: string; notaFiscal: string; fornecedorId: string; date: string; quantidadeConferida: boolean; qualidadeMaterial: boolean; documentacaoOk: boolean; observacoes: string; status: string }): Promise<string> => {
    if (!userId) throw new Error("Not authenticated");
    const { data: inserted, error } = await supabase.from("fvms").insert({
      obra_id: data.obraId, nota_fiscal: data.notaFiscal, fornecedor_id: data.fornecedorId,
      date: data.date, quantidade_conferida: data.quantidadeConferida,
      qualidade_material: data.qualidadeMaterial, documentacao_ok: data.documentacaoOk,
      observacoes: data.observacoes, status: data.status as any, user_id: userId,
    }).select().single();
    if (error) throw error;
    await addAuditLog("fvm_criada", "fvms", inserted.id, data.obraId, null, data);
    refetchAll();
    return inserted.id;
  }, [userId, addAuditLog, refetchAll]);

  const addAvaliacao = useCallback(async (data: { obraId: string; fornecedorId: string; notaFiscal: string; date: string; pontualidade: number; qualidade: number; atendimento: number; documentacao: number; observacoes: string }): Promise<string> => {
    if (!userId) throw new Error("Not authenticated");
    const { data: inserted, error } = await supabase.from("avaliacoes").insert({
      obra_id: data.obraId, fornecedor_id: data.fornecedorId, nota_fiscal: data.notaFiscal,
      date: data.date, pontualidade: data.pontualidade, qualidade: data.qualidade,
      atendimento: data.atendimento, documentacao: data.documentacao,
      observacoes: data.observacoes, user_id: userId,
    }).select().single();
    if (error) throw error;
    await addAuditLog("avaliacao_criada", "avaliacoes", inserted.id, data.obraId, null, data);
    return inserted.id;
  }, [userId, addAuditLog]);

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

  return (
    <InventoryContext.Provider value={{
      obras, insumos, fornecedores, estoque, entradas, movimentacoes, avaliacoes, saidas,
      kits, kitItems, servicePackages, locations, fvms, loading,
      selectedObraId, setSelectedObraId, getSelectedObra, getEstoqueByObra,
      addEntrada, addSaida, addTransferencia, addDevolucao, addFVM, addAvaliacao, addInventarioItem,
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