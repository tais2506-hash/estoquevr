import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Search, UserCheck, UserX, Shield } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type UserRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: string;
  email?: string;
  role?: string;
  permission_profile_id?: string | null;
};

type PermProfile = { id: string; name: string };

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor_obra: "Gestor de Obra",
  almoxarifado: "Almoxarife",
  visualizador: "Visualizador",
};

const roleBadgeColor: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  gestor_obra: "bg-primary/10 text-primary",
  almoxarifado: "bg-success/10 text-success",
  visualizador: "bg-muted text-muted-foreground",
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "almoxarifado", permissionProfileId: "" });
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPermProfile, setEditPermProfile] = useState("");

  // Fetch permission profiles
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

      const { data: roles, error: rErr } = await supabase.from("user_roles").select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));
      return (profiles as any[]).map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || "almoxarifado",
      })) as UserRow[];
    },
    enabled: !!currentUser,
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.role && roleLabels[u.role]?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateUser = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      if (data.user) {
        // Update role if not default
        if (form.role !== "almoxarifado") {
          await supabase.from("user_roles").update({ role: form.role as any }).eq("user_id", data.user.id);
        }
        // Assign permission profile if selected
        if (form.permissionProfileId) {
          await supabase.from("profiles").update({ permission_profile_id: form.permissionProfileId } as any).eq("user_id", data.user.id);
        }
      }

      toast.success("Usuário cadastrado. Um e-mail de confirmação foi enviado.");
      setDialogOpen(false);
      setForm({ email: "", password: "", name: "", role: "almoxarifado", permissionProfileId: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const { error: roleErr } = await supabase.from("user_roles").update({ role: editRole as any }).eq("user_id", userId);
      if (roleErr) throw roleErr;

      const { error: profErr } = await supabase.from("profiles")
        .update({ permission_profile_id: editPermProfile || null } as any)
        .eq("user_id", userId);
      if (profErr) throw profErr;

      toast.success("Usuário atualizado");
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
                <Label>Perfil de Acesso (Sistema)</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gestor_obra">Gestor de Obra</SelectItem>
                    <SelectItem value="almoxarifado">Almoxarife</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perfil de Permissão</Label>
                <Select value={form.permissionProfileId} onValueChange={v => setForm({ ...form, permissionProfileId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um perfil de permissão" /></SelectTrigger>
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
                <th className="text-left p-3 font-medium text-muted-foreground">Perfil Acesso</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Perfil Permissão</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.map(u => (
                <tr key={u.user_id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-medium text-foreground">{u.name}</td>
                  <td className="p-3">
                    {editingUser?.user_id === u.user_id ? (
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="gestor_obra">Gestor de Obra</SelectItem>
                          <SelectItem value="almoxarifado">Almoxarife</SelectItem>
                          <SelectItem value="visualizador">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadgeColor[u.role || ""] || ""}`}>
                        {roleLabels[u.role || ""] || u.role}
                      </span>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {editingUser?.user_id === u.user_id ? (
                      <Select value={editPermProfile} onValueChange={setEditPermProfile}>
                        <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Nenhum" /></SelectTrigger>
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
                        <span className="text-xs text-muted-foreground">—</span>
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
                          setEditRole(u.role || "almoxarifado");
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
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
