"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Plus, RefreshCcw, Upload, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateWhatsAppStatusLink } from "@/lib/adapters/whatsapp.adapter";
import { ORDER_STATUS, type Order, type OrderStatus, type ProductWithImages } from "@/types/domain";

type ApiError = {
  error?: string;
  message?: string;
};

type ApiResponse<T> = {
  data: T;
};

type ManualOrderUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

type ManualOrderItemDraft = {
  productId: string;
  variantId: string;
  quantity: number;
  productName: string;
  variantLabel: string;
  unitPrice: number;
};

type AdminOrder = Order & {
  users?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  order_items?: Array<{
    quantity: number;
    price: number;
    products?: { name?: string | null } | null;
    product_variants?: {
      id: string;
      product_colors?: { name?: string | null } | null;
      sizes?: { name?: string | null } | null;
    } | null;
  }> | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [feedbackError, setFeedbackError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [pendingTrackingId, setPendingTrackingId] = useState<string | null>(null);
  const [pendingProofId, setPendingProofId] = useState<string | null>(null);
  const [openingProofId, setOpeningProofId] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [loadingManualOrderUsers, setLoadingManualOrderUsers] = useState(false);
  const [loadingManualOrderProducts, setLoadingManualOrderProducts] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [manualOrderUserId, setManualOrderUserId] = useState("");
  const [manualOrderUsers, setManualOrderUsers] = useState<ManualOrderUser[]>([]);
  const [manualOrderProducts, setManualOrderProducts] = useState<ProductWithImages[]>([]);
  const [manualOrderVariantValue, setManualOrderVariantValue] = useState("");
  const [manualOrderItems, setManualOrderItems] = useState<ManualOrderItemDraft[]>([]);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<AdminOrder | null>(null);

  const manualOrderUserOptions = useMemo(
    () =>
      manualOrderUsers.map((user) => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
        searchText: `${user.name} ${user.email}`
      })),
    [manualOrderUsers]
  );

  const selectedManualOrderUser = useMemo(
    () => manualOrderUsers.find((user) => user.id === manualOrderUserId) ?? null,
    [manualOrderUsers, manualOrderUserId]
  );

  const manualOrderVariantOptions = useMemo(
    () =>
      manualOrderProducts
        .filter((product) => product.active)
        .flatMap((product) =>
          (product.product_variants ?? [])
            .filter((variant) => variant.active)
            .map((variant) => {
              const colorName = variant.product_colors?.name ?? "Padrão";
              const sizeName = variant.sizes?.name ?? "Único";
              return {
                value: `${product.id}::${variant.id}`,
                label: `${product.name} · ${colorName} / ${sizeName} · R$ ${Number(variant.price).toFixed(2)}`,
                searchText: `${product.name} ${colorName} ${sizeName}`,
                productId: product.id,
                variantId: variant.id,
                productName: product.name,
                variantLabel: `${colorName} / ${sizeName}`,
                unitPrice: Number(variant.price)
              };
            })
        ),
    [manualOrderProducts]
  );

  const manualOrderTotal = useMemo(
    () => manualOrderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [manualOrderItems]
  );

  async function loadOrders() {
    setLoading(true);
    setFeedbackError("");

    try {
      const response = await fetch("/api/admin/orders");
      const payload = (await response.json()) as ApiResponse<AdminOrder[]> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao carregar pedidos.");
      }

      setOrders(payload.data ?? []);
      setStatusDrafts(
        Object.fromEntries((payload.data ?? []).map((order) => [order.id, order.status])) as Record<
          string,
          OrderStatus
        >
      );
      setTrackingDrafts(
        Object.fromEntries((payload.data ?? []).map((order) => [order.id, order.tracking_code ?? ""]))
      );
      toast.success("Pedidos atualizados.");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao listar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  function buildWhatsappLink(order: AdminOrder) {
    const phone = order.users?.phone?.replace(/\D/g, "");
    if (!phone) return null;
    const message = `Olá, seu pedido #${order.id.slice(0, 8)} está com status ${order.status.replaceAll("_", " ")}.`;
    return generateWhatsAppStatusLink(phone, message);
  }

  function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function uploadPaymentProof(orderId: string, file: File | null) {
    if (!file) return;
    setPendingProofId(orderId);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-proof`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiResponse<Order> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao enviar comprovante.");
      }
      toast.success(`Comprovante atualizado no pedido ${payload.data.id.slice(0, 8)}.`);
      await loadOrders();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao enviar comprovante.");
    } finally {
      setPendingProofId(null);
    }
  }

  async function openPaymentProof(orderId: string) {
    setOpeningProofId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-proof/view`, { method: "GET" });
      const payload = (await response.json().catch(() => null)) as
        | (ApiResponse<{ signedUrl: string; expiresIn: number }> & ApiError)
        | null;
      if (!response.ok || !payload?.data?.signedUrl) {
        throw new Error(payload?.message ?? "Falha ao abrir comprovante.");
      }
      window.open(payload.data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao abrir comprovante.");
    } finally {
      setOpeningProofId(null);
    }
  }

  async function createManualOrder() {
    setCreatingOrder(true);
    setFeedbackError("");
    try {
      if (!manualOrderUserId) {
        throw new Error("Selecione um cliente válido para criar o pedido.");
      }
      if (!manualOrderItems.length) {
        throw new Error("Adicione ao menos um item no pedido.");
      }
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: manualOrderUserId,
          items: manualOrderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
          }))
        })
      });
      const payload = (await response.json()) as ApiResponse<Order> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao criar pedido manual.");
      }
      toast.success(`Pedido ${payload.data.id.slice(0, 8)} criado com sucesso.`);
      setManualOrderUserId("");
      setManualOrderVariantValue("");
      setManualOrderItems([]);
      setIsCreateOrderModalOpen(false);
      await loadOrders();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao criar pedido.");
    } finally {
      setCreatingOrder(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  useEffect(() => {
    if (!isCreateOrderModalOpen || manualOrderUsers.length > 0) return;

    async function loadManualOrderUsers() {
      setLoadingManualOrderUsers(true);
      try {
        const response = await fetch("/api/admin/users");
        const payload = (await response.json()) as ApiResponse<ManualOrderUser[]> & ApiError;
        if (!response.ok) {
          throw new Error(payload.message ?? "Falha ao carregar clientes para o pedido.");
        }
        setManualOrderUsers(payload.data ?? []);
      } catch (error) {
        setFeedbackError(
          error instanceof Error ? error.message : "Erro ao carregar clientes para criação do pedido."
        );
      } finally {
        setLoadingManualOrderUsers(false);
      }
    }

    void loadManualOrderUsers();
  }, [isCreateOrderModalOpen, manualOrderUsers.length]);

  useEffect(() => {
    if (!isCreateOrderModalOpen || manualOrderProducts.length > 0) return;

    async function loadManualOrderProducts() {
      setLoadingManualOrderProducts(true);
      try {
        const response = await fetch("/api/admin/products");
        const payload = (await response.json()) as ApiResponse<ProductWithImages[]> & ApiError;
        if (!response.ok) {
          throw new Error(payload.message ?? "Falha ao carregar produtos para o pedido.");
        }
        setManualOrderProducts(payload.data ?? []);
      } catch (error) {
        setFeedbackError(
          error instanceof Error ? error.message : "Erro ao carregar produtos para criação do pedido."
        );
      } finally {
        setLoadingManualOrderProducts(false);
      }
    }

    void loadManualOrderProducts();
  }, [isCreateOrderModalOpen, manualOrderProducts.length]);

  function addManualOrderItemFromVariantValue(value: string) {
    const selectedOption = manualOrderVariantOptions.find((option) => option.value === value);
    if (!selectedOption) return;

    setManualOrderItems((prev) => {
      const existing = prev.find((item) => item.variantId === selectedOption.variantId);
      if (existing) {
        return prev.map((item) =>
          item.variantId === selectedOption.variantId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          productId: selectedOption.productId,
          variantId: selectedOption.variantId,
          quantity: 1,
          productName: selectedOption.productName,
          variantLabel: selectedOption.variantLabel,
          unitPrice: selectedOption.unitPrice
        }
      ];
    });
    setManualOrderVariantValue("");
  }

  function updateManualOrderItemQuantity(variantId: string, quantity: number) {
    if (quantity < 1) return;
    setManualOrderItems((prev) =>
      prev.map((item) => (item.variantId === variantId ? { ...item, quantity } : item))
    );
  }

  function removeManualOrderItem(variantId: string) {
    setManualOrderItems((prev) => prev.filter((item) => item.variantId !== variantId));
  }

  async function updateStatus(orderId: string) {
    setPendingStatusId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDrafts[orderId] })
      });
      const payload = (await response.json()) as ApiResponse<Order> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao atualizar status.");
      }
      toast.success(`Status do pedido ${payload.data.id.slice(0, 8)} atualizado.`);
      await loadOrders();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao atualizar status.");
    } finally {
      setPendingStatusId(null);
    }
  }

  async function updateTracking(orderId: string) {
    setPendingTrackingId(orderId);
    const code = trackingDrafts[orderId]?.trim();
    if (!code) {
      setFeedbackError("Informe um código de rastreio antes de enviar.");
      setPendingTrackingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode: code })
      });
      const payload = (await response.json()) as ApiResponse<Order> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao atualizar rastreio.");
      }
      toast.success(`Rastreio do pedido ${payload.data.id.slice(0, 8)} atualizado.`);
      await loadOrders();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao atualizar rastreio.");
    } finally {
      setPendingTrackingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Admin · Pedidos</CardTitle>
            <CardDescription>Atualize status e rastreio com ações rápidas por linha.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
              <RefreshCcw className="size-4" />
              Recarregar
            </Button>
            <Button onClick={() => setIsCreateOrderModalOpen(true)}>
              <Plus className="size-4" />
              Criar pedido
            </Button>
          </div>
        </CardHeader>
        {feedbackError && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Erro ao processar pedidos</AlertTitle>
              <AlertDescription>{feedbackError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>{orders.length} pedidos carregados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : orders.length ? (
            <>
              <div className="grid w-full max-w-full gap-3 overflow-x-hidden md:hidden">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid w-full max-w-full cursor-pointer gap-3 overflow-hidden rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    onClick={() => setSelectedOrderForView(order)}
                  >
                    <div className="grid gap-1">
                      <p className="font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
                    </div>

                    <div className="grid min-w-0 gap-0.5">
                      <span className="truncate text-xs text-muted-foreground">{order.user_id}</span>
                      <span className="truncate font-medium">{order.users?.name ?? "Cliente"}</span>
                      <span className="truncate text-xs text-muted-foreground">{order.users?.email ?? "Sem email"}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">R$ {Number(order.total).toFixed(2)}</span>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>

                    <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                      <Select
                        value={statusDrafts[order.id] ?? order.status}
                        onValueChange={(value) =>
                          setStatusDrafts((prev) => ({ ...prev, [order.id]: value as OrderStatus }))
                        }
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateStatus(order.id)}
                          disabled={pendingStatusId === order.id}
                        >
                          {pendingStatusId === order.id && <Loader2 className="size-4 animate-spin" />}
                          Salvar status
                        </Button>
                        {buildWhatsappLink(order) && (
                          <Button asChild size="sm" variant="outline">
                            <a href={buildWhatsappLink(order) ?? "#"} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                              <ExternalLink className="size-4" />
                              WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                      <Input
                        value={trackingDrafts[order.id] ?? ""}
                        onChange={(event) => setTrackingDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))}
                        placeholder="Código de rastreio"
                        className="h-9 w-full"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateTracking(order.id)}
                        disabled={pendingTrackingId === order.id}
                      >
                        {pendingTrackingId === order.id && <Loader2 className="size-4 animate-spin" />}
                        Salvar rastreio
                      </Button>
                    </div>

                    <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                      {order.payment_proof_url ? (
                        <button
                          type="button"
                          className="w-fit text-xs text-primary underline underline-offset-4"
                          onClick={() => void openPaymentProof(order.id)}
                          disabled={openingProofId === order.id}
                        >
                          {openingProofId === order.id ? "Abrindo..." : "Ver comprovante"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem comprovante</span>
                      )}
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) => void uploadPaymentProof(order.id, event.target.files?.[0] ?? null)}
                          className="max-w-full text-xs"
                        />
                        {pendingProofId === order.id && <Upload className="size-4 animate-pulse text-primary" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rastreio</TableHead>
                      <TableHead>Comprovante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => setSelectedOrderForView(order)}
                      >
                        <TableCell>
                          <div className="grid gap-1">
                            <p className="font-medium">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="grid gap-0.5">
                            <span className="truncate text-xs text-muted-foreground">{order.user_id}</span>
                            <span className="font-medium">{order.users?.name ?? "Cliente"}</span>
                            <span className="text-xs text-muted-foreground">{order.users?.email ?? "Sem email"}</span>
                          </div>
                        </TableCell>
                        <TableCell>R$ {Number(order.total).toFixed(2)}</TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                            <Badge variant="outline">{order.status}</Badge>
                            <div className="flex gap-2">
                              <Select
                                value={statusDrafts[order.id] ?? order.status}
                                onValueChange={(value) =>
                                  setStatusDrafts((prev) => ({ ...prev, [order.id]: value as OrderStatus }))
                                }
                              >
                                <SelectTrigger className="h-9 min-w-44">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ORDER_STATUS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void updateStatus(order.id)}
                                disabled={pendingStatusId === order.id}
                              >
                                {pendingStatusId === order.id && <Loader2 className="size-4 animate-spin" />}
                                Salvar
                              </Button>
                              {buildWhatsappLink(order) && (
                                <Button asChild size="sm" variant="outline">
                                  <a href={buildWhatsappLink(order) ?? "#"} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                                    <ExternalLink className="size-4" />
                                    Enviar WhatsApp
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                            <Input
                              value={trackingDrafts[order.id] ?? ""}
                              onChange={(event) =>
                                setTrackingDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))
                              }
                              placeholder="Código"
                              className="h-9 min-w-40"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void updateTracking(order.id)}
                              disabled={pendingTrackingId === order.id}
                            >
                              {pendingTrackingId === order.id && <Loader2 className="size-4 animate-spin" />}
                              Salvar
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                            {order.payment_proof_url ? (
                              <button
                                type="button"
                                className="w-fit text-xs text-primary underline underline-offset-4"
                                onClick={() => void openPaymentProof(order.id)}
                                disabled={openingProofId === order.id}
                              >
                                {openingProofId === order.id ? "Abrindo..." : "Ver comprovante"}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem comprovante</span>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(event) => void uploadPaymentProof(order.id, event.target.files?.[0] ?? null)}
                                className="text-xs"
                              />
                              {pendingProofId === order.id && <Upload className="size-4 animate-pulse text-primary" />}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
        </CardContent>
      </Card>

      {selectedOrderForView && (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen items-start justify-center overflow-hidden bg-black/60 p-0 sm:items-center sm:overflow-y-auto sm:p-4">
          <div className="h-dvh w-screen overflow-y-auto rounded-none border-0 bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-xl sm:border">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-lg font-semibold">Pedido #{selectedOrderForView.id.slice(0, 8)}</h2>
                <p className="text-sm text-muted-foreground">
                  Criado em {new Date(selectedOrderForView.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedOrderForView(null)}>
                <XIcon className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-4 sm:p-6">
              <div className="grid gap-1 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium">{selectedOrderForView.users?.name ?? "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{selectedOrderForView.users?.email ?? "Sem email"}</p>
                <p className="text-xs text-muted-foreground">ID: {selectedOrderForView.user_id}</p>
              </div>

              <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
                <div className="grid gap-0.5">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="w-fit">
                    {selectedOrderForView.status}
                  </Badge>
                </div>
                <div className="grid gap-0.5">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(Number(selectedOrderForView.total))}</p>
                </div>
                <div className="grid gap-0.5">
                  <p className="text-xs text-muted-foreground">Rastreio</p>
                  <p className="font-medium">{selectedOrderForView.tracking_code || "Não informado"}</p>
                </div>
              </div>

              <div className="grid gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Itens do pedido</p>
                {selectedOrderForView.order_items?.length ? (
                  <div className="grid gap-2">
                    {selectedOrderForView.order_items.map((item, index) => (
                      <div
                        key={`${selectedOrderForView.id}-${item.product_variants?.id ?? index}`}
                        className="grid gap-1 rounded-md border p-2"
                      >
                        <p className="text-sm font-medium">{item.products?.name ?? "Produto"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item.product_variants?.product_colors?.name ?? "Padrão")} /{" "}
                          {(item.product_variants?.sizes?.name ?? "Único")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Quantidade: {item.quantity} · Unitário: {formatCurrency(Number(item.price))}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Itens não disponíveis para este pedido.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen items-start justify-center overflow-hidden bg-black/60 p-0 sm:items-center sm:overflow-y-auto sm:p-4">
          <div className="h-dvh w-screen overflow-y-auto rounded-none border-0 bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-xl sm:border">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-lg font-semibold">Criar pedido manual</h2>
                <p className="text-sm text-muted-foreground">
                  Selecione cliente e monte os itens do pedido por produto/variante.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOrderModalOpen(false)}>
                <XIcon className="size-4" />
              </Button>
            </div>

            <form
              className="grid gap-4 p-4 sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void createManualOrder();
              }}
            >
              <Combobox
                options={manualOrderUserOptions}
                value={manualOrderUserId}
                onValueChange={setManualOrderUserId}
                placeholder={loadingManualOrderUsers ? "Carregando clientes..." : "Buscar cliente por nome ou e-mail"}
                searchPlaceholder="Digite nome ou e-mail..."
                emptyText="Nenhum cliente encontrado."
                disabled={loadingManualOrderUsers}
              />
              {selectedManualOrderUser && (
                <p className="text-xs text-muted-foreground">
                  Cliente selecionado: {selectedManualOrderUser.name} ({selectedManualOrderUser.email})
                </p>
              )}
              <div className="grid gap-2 rounded-xl border p-3">
                <p className="text-sm font-medium">Itens do pedido</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Combobox
                    options={manualOrderVariantOptions}
                    value={manualOrderVariantValue}
                    onValueChange={setManualOrderVariantValue}
                    placeholder={loadingManualOrderProducts ? "Carregando produtos..." : "Buscar produto/variante"}
                    searchPlaceholder="Digite produto, cor ou tamanho..."
                    emptyText="Nenhuma variante encontrada."
                    disabled={loadingManualOrderProducts}
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addManualOrderItemFromVariantValue(manualOrderVariantValue)}
                    disabled={!manualOrderVariantValue}
                  >
                    Adicionar
                  </Button>
                </div>

                {manualOrderItems.length ? (
                  <div className="grid gap-2">
                    {manualOrderItems.map((item) => (
                      <div
                        key={item.variantId}
                        className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.productName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.variantLabel} - R$ {item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateManualOrderItemQuantity(item.variantId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={String(item.quantity)}
                            onChange={(event) =>
                              updateManualOrderItemQuantity(item.variantId, Number(event.target.value) || 1)
                            }
                            className="h-9 w-20 text-center"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateManualOrderItemQuantity(item.variantId, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => removeManualOrderItem(item.variantId)}>
                          Remover
                        </Button>
                      </div>
                    ))}
                    <p className="text-right text-sm font-medium">Total estimado: R$ {manualOrderTotal.toFixed(2)}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum item adicionado.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOrderModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingOrder}>
                  {creatingOrder && <Loader2 className="size-4 animate-spin" />}
                  Criar pedido
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
