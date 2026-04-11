"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Order } from "@/types/domain";

type ApiError = {
  message?: string;
};

type ApiResponse<T> = {
  data: T;
};

type CustomerOrderItem = {
  quantity: number;
  price: number;
  products?: {
    name?: string | null;
  } | null;
  product_variants?: {
    product_colors?: { name?: string | null } | null;
    sizes?: { name?: string | null } | null;
  } | null;
};

type CustomerOrder = Order & {
  order_items?: CustomerOrderItem[];
};

const LOGIN_URL = "/auth/login?next=%2Fmeus-pedidos";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export default function CustomerOrdersPage() {
  const searchParams = useSearchParams();
  const highlightedOrderId = searchParams.get("pedido");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total), 0), [orders]);

  async function loadOrders() {
    setLoading(true);
    setFeedbackError("");

    try {
      const response = await fetch("/api/orders/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });
      const payload = (await response.json().catch(() => null)) as (ApiResponse<CustomerOrder[]> & ApiError) | null;

      if (response.status === 401) {
        window.location.href = LOGIN_URL;
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? "Não foi possível carregar seus pedidos.");
      }

      setOrders(payload?.data ?? []);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  useEffect(() => {
    if (!highlightedOrderId) return;
    if (!orders.length) return;

    const hasHighlightedOrder = orders.some((order) => order.id === highlightedOrderId);
    setExpandedOrderId(hasHighlightedOrder ? highlightedOrderId : null);
  }, [highlightedOrderId, orders]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Meus pedidos</CardTitle>
              <CardDescription>Acompanhe o histórico dos seus pedidos recentes.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/">Voltar para catálogo</Link>
              </Button>
              <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {feedbackError && (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível listar seus pedidos</AlertTitle>
                <AlertDescription>{feedbackError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">{orders.length} pedidos encontrados</span>
              <span className="font-medium">Total acumulado: {formatCurrency(totalSpent)}</span>
            </div>

            {loading ? (
              <div className="grid gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : orders.length ? (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Rastreio</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      const orderItems = order.order_items ?? [];

                      return (
                        <Fragment key={order.id}>
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{order.status.replaceAll("_", " ")}</Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(Number(order.total))}</TableCell>
                            <TableCell>{formatDate(order.created_at)}</TableCell>
                            <TableCell>{order.tracking_code ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setExpandedOrderId((current) => (current === order.id ? null : order.id))
                                }
                              >
                                {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${order.id}-details`}>
                              <TableCell colSpan={6} className="bg-muted/20">
                                <div className="grid gap-2 py-1">
                                  <p className="text-sm font-medium">Produtos do pedido</p>
                                  {orderItems.length ? (
                                    <div className="grid gap-1 text-sm text-muted-foreground">
                                      {orderItems.map((item, index) => (
                                        <div
                                          key={`${order.id}-${item.products?.name ?? "produto"}-${index}`}
                                          className="flex flex-wrap items-center justify-between gap-2"
                                        >
                                          <span>{item.products?.name ?? "Produto"}</span>
                                          <span>
                                            {(item.product_variants?.product_colors?.name ?? "Cor")} /{" "}
                                            {(item.product_variants?.sizes?.name ?? "Tam")} ·{" "}
                                            {item.quantity}x {formatCurrency(Number(item.price))}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      Não foi possível carregar os itens deste pedido.
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Você ainda não possui pedidos.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
