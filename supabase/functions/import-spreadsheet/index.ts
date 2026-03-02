import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  insumo_code: string;
  insumo_name: string;
  unit: string;
  category: string;
  fornecedor_code: string;
  fornecedor_name: string;
  quantity: number;
  unit_value: number;
  total_value: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rows, obra_id } = await req.json() as { rows: Row[]; obra_id: string };

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No data rows" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Extract unique insumos
    const insumosMap = new Map<string, { code: string; name: string; unit: string; category: string }>();
    for (const r of rows) {
      if (r.insumo_code && !insumosMap.has(r.insumo_code)) {
        insumosMap.set(r.insumo_code, {
          code: r.insumo_code, name: r.insumo_name, unit: r.unit || "UN", category: r.category || "",
        });
      }
    }

    // 2. Extract unique fornecedores
    const fornecedoresMap = new Map<string, { code: string; name: string }>();
    for (const r of rows) {
      if (r.fornecedor_code && r.fornecedor_name && !fornecedoresMap.has(r.fornecedor_code)) {
        fornecedoresMap.set(r.fornecedor_code, { code: r.fornecedor_code, name: r.fornecedor_name });
      }
    }

    // 3. Insert insumos (skip existing by code)
    const insumosArr = Array.from(insumosMap.values());
    const insumoCodeToId = new Map<string, string>();

    const { data: existingInsumos } = await supabase.from("insumos").select("id, code");
    for (const ei of existingInsumos || []) insumoCodeToId.set(ei.code, ei.id);

    const newInsumos = insumosArr.filter(i => !insumoCodeToId.has(i.code));
    for (let i = 0; i < newInsumos.length; i += 500) {
      const batch = newInsumos.slice(i, i + 500);
      const { data: inserted, error } = await supabase.from("insumos").insert(batch).select("id, code");
      if (error) throw new Error(`Insumos insert error: ${error.message}`);
      for (const ins of inserted || []) insumoCodeToId.set(ins.code, ins.id);
    }

    // 4. Insert fornecedores
    const fornecedoresArr = Array.from(fornecedoresMap.values());
    const fornecedorCodeToId = new Map<string, string>();
    const { data: existingFornecedores } = await supabase.from("fornecedores").select("id, name");
    const existingNames = new Set((existingFornecedores || []).map(f => f.name));
    for (const ef of existingFornecedores || []) {
      const match = fornecedoresArr.find(f => f.name === ef.name);
      if (match) fornecedorCodeToId.set(match.code, ef.id);
    }

    const newFornecedores = fornecedoresArr.filter(f => !existingNames.has(f.name));
    for (let i = 0; i < newFornecedores.length; i += 500) {
      const batch = newFornecedores.slice(i, i + 500).map(f => ({
        name: f.name, cnpj: `IMP-${f.code}`,
      }));
      const { data: inserted, error } = await supabase.from("fornecedores").insert(batch).select("id, name");
      if (error) throw new Error(`Fornecedores insert error: ${error.message}`);
      for (const forn of inserted || []) {
        const match = newFornecedores.find(f => f.name === forn.name);
        if (match) fornecedorCodeToId.set(match.code, forn.id);
      }
    }

    // 5. Aggregate stock by insumo
    const stockMap = new Map<string, { totalQty: number; totalValue: number }>();
    for (const r of rows) {
      if (!insumoCodeToId.has(r.insumo_code)) continue;
      const existing = stockMap.get(r.insumo_code) || { totalQty: 0, totalValue: 0 };
      existing.totalQty += r.quantity || 0;
      existing.totalValue += r.total_value || 0;
      stockMap.set(r.insumo_code, existing);
    }

    // 6. Upsert estoque
    let stockUpdated = 0;
    for (const [code, stock] of stockMap) {
      const insumoId = insumoCodeToId.get(code);
      if (!insumoId || stock.totalQty <= 0) continue;
      const avgCost = stock.totalValue / stock.totalQty;

      const { data: existing } = await supabase.from("estoque")
        .select("id, quantity, total_value")
        .eq("obra_id", obra_id).eq("insumo_id", insumoId).maybeSingle();

      if (existing) {
        // Add to existing stock
        const newQty = existing.quantity + stock.totalQty;
        const newTotal = existing.total_value + stock.totalValue;
        await supabase.from("estoque").update({
          quantity: newQty, total_value: newTotal, average_unit_cost: newTotal / newQty,
        }).eq("id", existing.id);
      } else {
        await supabase.from("estoque").insert({
          obra_id, insumo_id: insumoId,
          quantity: stock.totalQty, total_value: stock.totalValue, average_unit_cost: avgCost,
        });
      }
      stockUpdated++;
    }

    return new Response(JSON.stringify({
      success: true,
      rows_parsed: rows.length,
      insumos_created: newInsumos.length,
      insumos_existing: insumosArr.length - newInsumos.length,
      fornecedores_created: newFornecedores.length,
      fornecedores_existing: fornecedoresArr.length - newFornecedores.length,
      stock_items_updated: stockUpdated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
