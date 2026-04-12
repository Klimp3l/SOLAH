"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserRole } from "@/types/domain";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

type ApiError = {
  message?: string;
};

type ApiResponse<T> = {
  data: T;
};

export default function AdminClientesPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Partial<UserRecord>>>({});
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");

  async function loadUsers() {
    setLoading(true);
    setFeedbackError("");
    try {
      const response = await fetch("/api/admin/users");
      const payload = (await response.json()) as ApiResponse<UserRecord[]> & ApiError;
      if (!response.ok) throw new Error(payload.message ?? "Falha ao carregar clientes.");
      setUsers(payload.data ?? []);
      setDrafts(
        Object.fromEntries(
          (payload.data ?? []).map((user) => [
            user.id,
            { email: user.email, name: user.name, phone: user.phone, role: user.role }
          ])
        )
      );
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function saveUser(userId: string) {
    setSavingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[userId] ?? {})
      });
      const payload = (await response.json()) as ApiResponse<UserRecord> & ApiError;
      if (!response.ok) throw new Error(payload.message ?? "Falha ao salvar cliente.");
      toast.success("Cliente atualizado.");
      await loadUsers();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao salvar cliente.");
    } finally {
      setSavingId(null);
    }
  }

  async function createUser() {
    setCreating(true);
    setFeedbackError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, name: newUserName || undefined, phone: newUserPhone || undefined })
      });
      const payload = (await response.json()) as ApiResponse<UserRecord> & ApiError;
      if (!response.ok) throw new Error(payload.message ?? "Falha ao criar cliente.");
      toast.success("Cliente criado.");
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPhone("");
      await loadUsers();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao criar cliente.");
    } finally {
      setCreating(false);
    }
  }

  function buildWhatsappLink(user: UserRecord) {
    const phone = user.phone?.replace(/\D/g, "");
    if (!phone) return null;
    return `https://wa.me/${phone}`;
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Admin · Clientes</CardTitle>
            <CardDescription>Gerencie dados de clientes, email e contato por WhatsApp.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
            <RefreshCcw className="size-4" />
            Recarregar
          </Button>
        </CardHeader>
        {feedbackError && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Erro ao processar clientes</AlertTitle>
              <AlertDescription>{feedbackError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar cliente manualmente</CardTitle>
          <CardDescription>Use o email para criar uma conta que poderá ser vinculada no primeiro login.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
          <Input placeholder="Nome" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
          <Input placeholder="Telefone" value={newUserPhone} onChange={(event) => setNewUserPhone(event.target.value)} />
          <Button onClick={() => void createUser()} disabled={creating}>
            {creating && <Loader2 className="size-4 animate-spin" />}
            Criar cliente
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>{users.length} clientes cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Input
                        value={drafts[user.id]?.name ?? user.name}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], name: event.target.value } }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={drafts[user.id]?.email ?? user.email}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], email: event.target.value } }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={drafts[user.id]?.phone ?? user.phone ?? ""}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], phone: event.target.value } }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={drafts[user.id]?.role ?? user.role}
                        onValueChange={(value) =>
                          setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], role: value as UserRole } }))
                        }
                      >
                        <SelectTrigger className="h-9 min-w-32">
                          <SelectValue placeholder="Perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void saveUser(user.id)} disabled={savingId === user.id}>
                          {savingId === user.id && <Loader2 className="size-4 animate-spin" />}
                          Salvar
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a href={`mailto:${drafts[user.id]?.email ?? user.email}`}>
                            Email
                          </a>
                        </Button>
                        {buildWhatsappLink(user) && (
                          <Button asChild size="sm" variant="outline">
                            <a href={buildWhatsappLink(user) ?? "#"} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-4" />
                              WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
