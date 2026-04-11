"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildLoginUrl,
  createOrderPayload,
  OrderRequestError,
  resolveFinalizeIntent,
  submitOrderRequest
} from "@/lib/storefront/checkout-flow";
import type { CartItemInput, Product } from "@/types/domain";

type StorefrontPageProps = {
  initialStep?: "catalogo" | "checkout";
};

type ProductResponse = {
  data: Product[];
};

type AuthMeResponse = {
  data: {
    id: string;
  } | null;
};

const CART_STORAGE_KEY = "solah:storefront:cart";
const CHECKOUT_PATH = "/checkout";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function readStoredCart() {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(Object.entries(parsed).filter((entry) => entry[1] > 0));
  } catch {
    return {};
  }
}

export function StorefrontPage({ initialStep = "catalogo" }: StorefrontPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [cartHydrated, setCartHydrated] = useState(false);
  const isCheckoutView = initialStep === "checkout";

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setProductsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/products", {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Não foi possível carregar produtos.");
        const body = (await response.json()) as ProductResponse;
        if (!active) return;
        setProducts(body.data ?? []);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Erro ao carregar o catálogo.";
        setLoadError(message);
      } finally {
        if (active) setProductsLoading(false);
      }
    }

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCart(readStoredCart());
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartHydrated]);

  const cartItems = useMemo(() => {
    return products
      .map((product) => ({
        product,
        quantity: cart[product.id] ?? 0
      }))
      .filter((item) => item.quantity > 0);
  }, [cart, products]);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cartItems]);

  function updateQuantity(productId: string, quantity: number) {
    const safeQuantity = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
    setCart((prev) => {
      const next = { ...prev };
      if (safeQuantity === 0) {
        delete next[productId];
      } else {
        next[productId] = safeQuantity;
      }
      return next;
    });
  }

  function toOrderItems(): CartItemInput[] {
    return cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity
    }));
  }

  async function createOrder() {
    const payload = createOrderPayload(toOrderItems());
    const result = await submitOrderRequest(fetch, payload);
    setCart({});
    toast.success("Pedido criado com sucesso.");
    if (result.whatsappLink) {
      window.open(result.whatsappLink, "_blank", "noopener,noreferrer");
    }
  }

  async function handleFinalizeOrder() {
    if (cartItems.length === 0) {
      toast.error("Adicione ao menos um item antes de finalizar.");
      return;
    }

    setSubmittingOrder(true);
    try {
      const authResponse = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });

      const authBody = (await authResponse.json().catch(() => null)) as AuthMeResponse | null;
      const intent = resolveFinalizeIntent(authBody?.data ?? null, CHECKOUT_PATH);
      if (intent.action === "redirect_to_login") {
        window.location.href = intent.loginUrl;
        return;
      }

      await createOrder();
    } catch (error) {
      if (error instanceof OrderRequestError && error.status === 401) {
        window.location.href = buildLoginUrl(CHECKOUT_PATH);
        return;
      }

      const message = error instanceof Error ? error.message : "Não foi possível finalizar pedido.";
      toast.error(message);
    } finally {
      setSubmittingOrder(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40 px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <section className="grid gap-4 rounded-3xl border bg-card/80 p-6">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">SOLAH</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={isCheckoutView ? "outline" : "default"}>
              <Link href="/">Catálogo</Link>
            </Button>
            <Button asChild variant={isCheckoutView ? "default" : "outline"}>
              <Link href="/checkout">Checkout</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/auth/login?next=/admin">Acessar admin</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className={isCheckoutView ? "order-2 lg:order-1" : ""}>
            <CardHeader>
              <CardTitle>{isCheckoutView ? "Resumo do pedido" : "Produtos disponíveis"}</CardTitle>
              <CardDescription>
                {isCheckoutView
                  ? "Revise os itens e finalize com segurança."
                  : "Adicione produtos ao carrinho antes de finalizar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {productsLoading && <p className="text-sm text-muted-foreground">Carregando catálogo...</p>}
              {loadError && <p className="text-sm text-destructive">{loadError}</p>}
              {!productsLoading &&
                !loadError &&
                products.map((product) => {
                  const quantity = cart[product.id] ?? 0;
                  return (
                    <div key={product.id} className="grid gap-3 rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <h2 className="font-medium">{product.name}</h2>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        </div>
                        <Badge>{formatCurrency(product.price)}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={quantity}
                          onChange={(event) => updateQuantity(product.id, Number(event.target.value))}
                          className="max-w-28"
                        />
                        <Button variant="outline" onClick={() => updateQuantity(product.id, quantity + 1)}>
                          +1
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          <Card className={isCheckoutView ? "order-1 lg:order-2" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-primary" />
                Carrinho
              </CardTitle>
              <CardDescription>Seu carrinho permanece salvo mesmo durante o login.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item no carrinho.</p>
              ) : (
                <>
                  <div className="grid gap-2">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                          {item.quantity}x {item.product.name}
                        </span>
                        <span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span>Total</span>
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                </>
              )}
              <Button
                type="button"
                size="lg"
                onClick={() => void handleFinalizeOrder()}
                disabled={submittingOrder || cartItems.length === 0}
              >
                {submittingOrder ? "Processando..." : "Finalizar pedido"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
