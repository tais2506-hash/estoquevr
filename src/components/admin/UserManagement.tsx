import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Search, UserCheck, UserX, Shield } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type UserRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: string;
  permission_profile_id?: string | null;
};

type PermProfile = { id: string; name: string };

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", permissionProfileId: "" });
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editPermProfile, setEditPermProfile] = useState("");

  const { data: permProfiles = [] } = useQuery({
    queryKey: ["permission_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permission_profiles").select("id, name").order("name");
      if (error) throw error;
      return data as PermProfile[];
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("user_id, name, avatar_url, status, permission_profile_id");
      if (pErr) throw pErr;
      return (profiles as any[]).map(p => ({ ...p })) as UserRow[];
    },
    enabled: !!currentUser,
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    permProfiles.find(pp => pp.id === u.permission_profile_id)?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }
    if (!form.permissionProfileId) {
      toast.error("Selecione um perfil de permissão");
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      if (data.user && form.permissionProfileId) {
        await supabase.from("profiles").update({ permission_profile_id: form.permissionProfileId } as any).eq("user_id", data.user.id);
      }

      toast.success("Usuário cadastrado. Um e-mail de confirmação foi enviado.");
      setDialogOpen(false);
      setForm({ email: "", password: "", name: "", permissionProfileId: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const { error: profErr } = await supabase.from("profiles")
        .update({ permission_profile_id: editPermProfile || null } as any)
        .eq("user_id", userId);
      if (profErr) throw profErr;

      toast.success("Perfil de permissão atualizado");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    try {
      const { error } = await supabase.from("profiles").update({ status: newStatus } as any).eq("user_id", userId);
      if (error) throw error;
      toast.success(`Usuário ${newStatus === "ativo" ? "ativado" : "desativado"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const getPermProfileName = (id: string | null | undefined) => {
    if (!id) return null;
    return permProfiles.find(p => p.id === id)?.name || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Usuário</DialogTitle>
              <DialogDescription>Preencha os dados do novo usuário e selecione o perfil de permissão.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
              <div className="space-y-2"><Label>Senha</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Senha inicial" /></div>
              <div className="space-y-2">
                <Label>Perfil de Permissão</Label>
                <Select value={form.permissionProfileId} onValueChange={v => setForm({ ...form, permissionProfileId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                  <SelectContent>
                    {permProfiles.map(pp => (
                      <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Define quais ações o usuário pode realizar no sistema</p>
              </div>
              <Button onClick={handleCreateUser} className="w-full">Cadastrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Perfil de Permissão</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.map(u => (
                <tr key={u.user_id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-medium text-foreground">{u.name}</td>
                  <td className="p-3">
                    {editingUser?.user_id === u.user_id ? (
                      <Select value={editPermProfile} onValueChange={setEditPermProfile}>
                        <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {permProfiles.map(pp => (
                            <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      getPermProfileName(u.permission_profile_id) ? (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-primary" />
                          <span className="text-xs text-foreground">{getPermProfileName(u.permission_profile_id)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem perfil</span>
                      )
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={u.status === "ativo" ? "default" : "secondary"}>
                      {u.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingUser?.user_id === u.user_id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateUser(u.user_id)}>Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>×</Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingUser(u);
                          setEditPermProfile(u.permission_profile_id || "");
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(u.user_id, u.status)}>
                        {u.status === "ativo" ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-success" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
