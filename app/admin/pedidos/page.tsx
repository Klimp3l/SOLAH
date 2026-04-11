"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS, type Order, type OrderStatus } from "@/types/domain";

type ApiError = {
  error?: string;
  message?: string;
};

type ApiResponse<T> = {
  data: T;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedbackError, setFeedbackError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [pendingTrackingId, setPendingTrackingId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});

  async function loadOrders() {
    setLoading(true);
    setFeedbackError("");

    try {
      const response = await fetch("/api/admin/orders");
      const payload = (await response.json()) as ApiResponse<Order[]> & ApiError;
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

  useEffect(() => {
    void loadOrders();
  }, []);

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
          <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
            <RefreshCcw className="size-4" />
            Recarregar
          </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rastreio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="grid gap-1">
                        <p className="font-medium">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{order.user_id}</TableCell>
                    <TableCell>R$ {Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="grid gap-2">
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
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
