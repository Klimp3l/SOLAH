"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MessageCircle, Plus, RefreshCcw, XIcon } from "lucide-react";
import { toast } from "sonner";
import { MessageComposerDialog } from "@/components/shared/message-composer-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildMailtoLink } from "@/lib/adapters/mailto.adapter";
import { buildWhatsAppContactLink } from "@/lib/adapters/whatsapp.adapter";
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

type UserDraft = {
  email?: string;
  name?: string;
  phone?: string | null;
};

type ContactComposerState = {
  channel: "whatsapp" | "email";
  recipient: string;
  defaultMessage: string;
};

export default function AdminClientesPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [composerState, setComposerState] = useState<ContactComposerState | null>(null);

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
            { email: user.email, name: user.name, phone: user.phone }
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
      setIsCreateUserModalOpen(false);
      await loadUsers();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao criar cliente.");
    } finally {
      setCreating(false);
    }
  }

  function buildWhatsappLink(user: UserRecord) {
    const phone = (drafts[user.id]?.phone ?? user.phone)?.replace(/\D/g, "");
    if (!phone) return null;
    return buildWhatsAppContactLink(phone);
  }

  function openWhatsAppComposer(user: UserRecord) {
    const phone = (drafts[user.id]?.phone ?? user.phone ?? "").trim();
    if (!phone) return;
    const name = (drafts[user.id]?.name ?? user.name ?? "cliente").trim() || "cliente";
    setComposerState({
      channel: "whatsapp",
      recipient: phone,
      defaultMessage: `Olá ${name}, tudo bem?`
    });
  }

  function openEmailComposer(user: UserRecord) {
    const email = (drafts[user.id]?.email ?? user.email ?? "").trim();
    if (!email) return;
    const name = (drafts[user.id]?.name ?? user.name ?? "cliente").trim() || "cliente";
    setComposerState({
      channel: "email",
      recipient: email,
      defaultMessage: `Olá ${name},\n\n`
    });
  }

  function handleConfirmContactMessage(message: string) {
    if (!composerState) return;
    const link =
      composerState.channel === "whatsapp"
        ? buildWhatsAppContactLink(composerState.recipient, message)
        : buildMailtoLink(composerState.recipient, { body: message });
    window.open(link, "_blank", "noopener,noreferrer");
    setComposerState(null);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Admin · Clientes</CardTitle>
            <CardDescription>Gerencie dados de clientes, email e contato por WhatsApp.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
              <RefreshCcw className="size-4" />
              Recarregar
            </Button>
            <Button onClick={() => setIsCreateUserModalOpen(true)}>
              <Plus className="size-4" />
              Adicionar cliente
            </Button>
          </div>
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
            <>
              <div className="grid w-full max-w-full gap-3 overflow-x-hidden md:hidden">
                {users.map((user) => (
                  <div key={user.id} className="grid w-full max-w-full gap-3 overflow-hidden rounded-lg border p-3">
                    <Input
                      value={drafts[user.id]?.name ?? user.name}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], name: event.target.value } }))
                      }
                      placeholder="Nome"
                    />
                    <Input
                      value={drafts[user.id]?.email ?? user.email}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], email: event.target.value } }))
                      }
                      placeholder="Email"
                    />
                    <Input
                      value={drafts[user.id]?.phone ?? user.phone ?? ""}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], phone: event.target.value } }))
                      }
                      placeholder="Telefone"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void saveUser(user.id)} disabled={savingId === user.id}>
                        {savingId === user.id && <Loader2 className="size-4 animate-spin" />}
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEmailComposer(user)}
                        disabled={!(drafts[user.id]?.email ?? user.email)}
                      >
                        <Mail className="size-4" />
                        Email
                      </Button>
                      {buildWhatsappLink(user) && (
                        <Button size="sm" variant="outline" onClick={() => openWhatsAppComposer(user)}>
                          <MessageCircle className="size-4" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void saveUser(user.id)}
                              disabled={savingId === user.id}
                            >
                              {savingId === user.id && <Loader2 className="size-4 animate-spin" />}
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEmailComposer(user)}
                              disabled={!(drafts[user.id]?.email ?? user.email)}
                            >
                              <Mail className="size-4" />
                              Email
                            </Button>
                            {buildWhatsappLink(user) && (
                              <Button size="sm" variant="outline" onClick={() => openWhatsAppComposer(user)}>
                                <MessageCircle className="size-4" />
                                WhatsApp
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {
        isCreateUserModalOpen && (
          <div className="fixed inset-0 z-50 flex h-dvh w-screen items-start justify-center overflow-hidden bg-black/60 p-0 sm:items-center sm:overflow-y-auto sm:p-4">
            <div className="h-dvh w-screen overflow-y-auto rounded-none border-0 bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:rounded-xl sm:border">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
                <div>
                  <h2 className="text-lg font-semibold">Criar cliente manualmente</h2>
                  <p className="text-sm text-muted-foreground">
                    Use o email para criar uma conta que poderá ser vinculada no primeiro login.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateUserModalOpen(false)}>
                  <XIcon className="size-4" />
                </Button>
              </div>

              <form
                className="grid gap-4 p-4 sm:p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createUser();
                }}
              >
                <Input placeholder="Email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
                <Input placeholder="Nome" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
                <Input placeholder="Telefone" value={newUserPhone} onChange={(event) => setNewUserPhone(event.target.value)} />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateUserModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="size-4 animate-spin" />}
                    Criar cliente
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      <MessageComposerDialog
        open={Boolean(composerState)}
        channel={composerState?.channel ?? "whatsapp"}
        recipient={composerState?.recipient ?? ""}
        defaultMessage={composerState?.defaultMessage ?? ""}
        onClose={() => setComposerState(null)}
        onConfirm={handleConfirmContactMessage}
      />
    </div >
  );
}
