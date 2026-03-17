import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ConfigItem {
  id: string;
  name: string;
  sort_order: number;
  abbreviation?: string;
}

function ConfigList({
  title,
  tableName,
  hasAbbreviation = false,
}: {
  title: string;
  tableName: string;
  hasAbbreviation?: boolean;
}) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newAbbr, setNewAbbr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAbbr, setEditAbbr] = useState("");

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) setItems(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [tableName]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0;
    const insertData: any = { name: newName.trim(), sort_order: maxOrder + 1 };
    if (hasAbbreviation) {
      if (!newAbbr.trim()) { toast.error("Informe a abreviação"); return; }
      insertData.abbreviation = newAbbr.trim().toUpperCase();
    }

    const { error } = await supabase.from(tableName as any).insert(insertData);
    if (error) {
      if (error.code === "23505") toast.error("Já existe um item com esse nome");
      else toast.error("Erro ao adicionar");
      return;
    }
    setNewName("");
    setNewAbbr("");
    toast.success("Adicionado!");
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from(tableName as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Excluído!");
    fetchItems();
  };

  const handleEdit = (item: ConfigItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAbbr(item.abbreviation || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const updateData: any = { name: editName.trim() };
    if (hasAbbreviation) updateData.abbreviation = editAbbr.trim().toUpperCase();

    const { error } = await supabase.from(tableName as any).update(updateData).eq("id", editingId);
    if (error) {
      if (error.code === "23505") toast.error("Já existe um item com esse nome");
      else toast.error("Erro ao salvar");
      return;
    }
    setEditingId(null);
    toast.success("Atualizado!");
    fetchItems();
  };

  if (loading) return <div className="text-muted-foreground text-sm py-4">Carregando...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>

      {/* Add form */}
      <div className="flex gap-2 items-end">
        {hasAbbreviation && (
          <div className="space-y-1 w-24">
            <Label className="text-xs">Sigla</Label>
            <Input
              placeholder="UN"
              value={newAbbr}
              onChange={e => setNewAbbr(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
        )}
        <div className="space-y-1 flex-1">
          <Label className="text-xs">Nome</Label>
          <Input
            placeholder={`Nova ${title.toLowerCase().replace(/s$/, "")}...`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* List */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {items.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-6">
            Nenhum item cadastrado
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-muted/50">
            <GripVertical className="w-4 h-4 text-muted-foreground/40" />

            {editingId === item.id ? (
              <>
                {hasAbbreviation && (
                  <Input
                    className="w-20 h-8 text-sm"
                    value={editAbbr}
                    onChange={e => setEditAbbr(e.target.value)}
                  />
                )}
                <Input
                  className="flex-1 h-8 text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveEdit()}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </>
            ) : (
              <>
                {hasAbbreviation && (
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground w-14 text-center">
                    {item.abbreviation}
                  </span>
                )}
                <span className="flex-1 text-sm text-foreground">{item.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{items.length} itens cadastrados</p>
    </div>
  );
}

const ConfiguracoesCRUD = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Configurações do Sistema</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as listas padronizadas usadas nos cadastros
        </p>
      </div>

      <Tabs defaultValue="categorias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="locais">Tipos de Local</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias">
          <ConfigList title="Categorias de Insumos" tableName="insumo_categories" />
        </TabsContent>

        <TabsContent value="unidades">
          <ConfigList title="Unidades de Medida" tableName="insumo_units" hasAbbreviation />
        </TabsContent>

        <TabsContent value="locais">
          <ConfigList title="Tipos de Local" tableName="location_types" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesCRUD;
