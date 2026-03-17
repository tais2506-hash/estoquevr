import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Shield, Loader2 } from "lucide-react";

type AvailablePermission = { id: string; label: string; category: string; description: string; sort_order: number };
type PermissionProfile = { id: string; name: string; description: string; created_at: string; updated_at: string };

const PermissionProfilesCRUD = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Fetch available permissions
  const { data: availablePermissions = [] } = useQuery({
    queryKey: ["available_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_permissions")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as AvailablePermission[];
    },
  });

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["permission_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_profiles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as PermissionProfile[];
    },
  });

  // Fetch all profile_permissions
  const { data: allProfilePerms = [] } = useQuery({
    queryKey: ["profile_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_permissions")
        .select("*");
      if (error) throw error;
      return data as { id: string; profile_id: string; permission: string }[];
    },
  });

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const groups: Record<string, AvailablePermission[]> = {};
    availablePermissions.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [availablePermissions]);

  const openNew = () => {
    setEditingProfile(null);
    setName("");
    setDescription("");
    setSelectedPermissions(new Set());
    setDialogOpen(true);
  };

  const openEdit = (profile: PermissionProfile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setDescription(profile.description || "");
    const perms = allProfilePerms.filter(pp => pp.profile_id === profile.id).map(pp => pp.permission);
    setSelectedPermissions(new Set(perms));
    setDialogOpen(true);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const categoryPerms = permissionsByCategory[category]?.map(p => p.id) || [];
    const allSelected = categoryPerms.every(p => selectedPermissions.has(p));
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      categoryPerms.forEach(p => {
        if (allSelected) next.delete(p);
        else next.add(p);
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      let profileId: string;

      if (editingProfile) {
        const { error } = await supabase
          .from("permission_profiles")
          .update({ name: name.trim(), description: description.trim() })
          .eq("id", editingProfile.id);
        if (error) throw error;
        profileId = editingProfile.id;

        // Delete existing permissions
        await supabase.from("profile_permissions").delete().eq("profile_id", profileId);
      } else {
        const { data, error } = await supabase
          .from("permission_profiles")
          .insert({ name: name.trim(), description: description.trim() })
          .select()
          .single();
        if (error) throw error;
        profileId = data.id;
      }

      // Insert new permissions
      if (selectedPermissions.size > 0) {
        const rows = Array.from(selectedPermissions).map(p => ({
          profile_id: profileId,
          permission: p,
        }));
        const { error: permErr } = await supabase.from("profile_permissions").insert(rows);
        if (permErr) throw permErr;
      }

      toast.success(editingProfile ? "Perfil atualizado" : "Perfil criado");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["permission_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile_permissions"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    try {
      const { error } = await supabase.from("permission_profiles").delete().eq("id", profileId);
      if (error) throw error;
      toast.success("Perfil excluído");
      queryClient.invalidateQueries({ queryKey: ["permission_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile_permissions"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  };

  const getProfilePermCount = (profileId: string) =>
    allProfilePerms.filter(pp => pp.profile_id === profileId).length;

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Perfis de Permissão</h2>
          <p className="text-sm text-muted-foreground">Crie perfis customizados e defina as permissões de cada um</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo Perfil</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {profiles.map(profile => {
          const permCount = getProfilePermCount(profile.id);
          const perms = allProfilePerms.filter(pp => pp.profile_id === profile.id).map(pp => pp.permission);
          // Group perms by category for display
          const permCategories = new Set(
            perms.map(p => availablePermissions.find(ap => ap.id === p)?.category).filter(Boolean)
          );
          return (
            <div key={profile.id} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">{profile.name}</h3>
                    {profile.description && <p className="text-xs text-muted-foreground">{profile.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(profile)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o perfil <strong>{profile.name}</strong>? Usuários vinculados a este perfil perderão suas permissões.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(profile.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(permCategories).map(cat => (
                  <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{permCount} permissão(ões) de {availablePermissions.length}</p>
            </div>
          );
        })}
        {profiles.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            Nenhum perfil criado ainda. Clique em "Novo Perfil" para começar.
          </div>
        )}
      </div>

      {/* Dialog for create/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar Perfil" : "Novo Perfil de Permissão"}</DialogTitle>
            <DialogDescription>Defina o nome e selecione as permissões para este perfil.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Nome *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Supervisor" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Descrição</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do perfil" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Permissões</label>
                <span className="text-xs text-muted-foreground">{selectedPermissions.size} de {availablePermissions.length} selecionadas</span>
              </div>

              <div className="space-y-4 mt-2">
                {Object.entries(permissionsByCategory).map(([category, perms]) => {
                  const allSelected = perms.every(p => selectedPermissions.has(p.id));
                  const someSelected = perms.some(p => selectedPermissions.has(p.id));
                  return (
                    <div key={category} className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allSelected}
                          ref={el => {
                            if (el) (el as any).indeterminate = someSelected && !allSelected;
                          }}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <span className="text-sm font-semibold text-foreground">{category}</span>
                        <Badge variant="outline" className="text-xs">
                          {perms.filter(p => selectedPermissions.has(p.id)).length}/{perms.length}
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 ml-6">
                        {perms.map(perm => (
                          <label key={perm.id} className="flex items-start gap-2 cursor-pointer group">
                            <Checkbox
                              checked={selectedPermissions.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="mt-0.5"
                            />
                            <div>
                              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{perm.label}</span>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingProfile ? "Salvar Alterações" : "Criar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionProfilesCRUD;
