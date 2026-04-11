"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
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
import type { CartItemInput, ProductImage, ProductWithImages, UserRole } from "@/types/domain";

type StorefrontPageProps = {
  initialStep?: "catalogo" | "checkout";
};

type ProductResponse = {
  data: ProductWithImages[];
};

type AuthMeResponse = {
  data: {
    id: string;
    role?: UserRole | null;
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

function normalizeProductImages(images: ProductImage[] | undefined) {
  return (images ?? [])
    .filter((image) => Boolean(image?.url))
    .sort((a, b) => a.position - b.position);
}

function getSafeImageIndex(length: number, currentIndex: number) {
  if (length <= 0) return 0;
  if (currentIndex < 0) return 0;
  if (currentIndex > length - 1) return 0;
  return currentIndex;
}

export function StorefrontPage({ initialStep = "catalogo" }: StorefrontPageProps) {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [cartHydrated, setCartHydrated] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [imageIndexByProduct, setImageIndexByProduct] = useState<Record<string, number>>({});
  const [modalState, setModalState] = useState<{ productId: string; imageIndex: number } | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
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
    let active = true;

    async function loadAuthRole() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include"
        });
        const body = (await response.json().catch(() => null)) as AuthMeResponse | null;
        if (!active) return;

        if (!response.ok || !body?.data?.id) {
          setAuthRole(null);
          return;
        }

        setAuthRole(body.data.role ?? null);
      } catch {
        if (!active) return;
        setAuthRole(null);
      }
    }

    void loadAuthRole();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!cartHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartHydrated]);

  useEffect(() => {
    if (!modalState) return;

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalState(null);
      }
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalState]);

  useEffect(() => {
    if (!isCartDrawerOpen) return;

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCartDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isCartDrawerOpen]);

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

  const cartQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
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
    const createdOrderId = result.data.id;
    setCart({});
    toast.success("Pedido criado com sucesso.");
    if (result.whatsappLink) {
      window.open(result.whatsappLink, "_blank", "noopener,noreferrer");
    }
    window.location.href = `/meus-pedidos?pedido=${encodeURIComponent(createdOrderId)}`;
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

  function setProductImageIndex(productId: string, nextIndex: number, imageCount: number) {
    if (imageCount <= 0) return;

    const normalizedIndex = ((nextIndex % imageCount) + imageCount) % imageCount;
    setImageIndexByProduct((prev) => ({ ...prev, [productId]: normalizedIndex }));
  }

  function openProductModal(productId: string, imageIndex: number) {
    setModalState({ productId, imageIndex });
  }

  const modalProduct = useMemo(() => {
    if (!modalState) return null;
    return products.find((product) => product.id === modalState.productId) ?? null;
  }, [modalState, products]);

  const modalImages = useMemo(() => normalizeProductImages(modalProduct?.product_images), [modalProduct]);
  const modalCurrentIndex = getSafeImageIndex(modalImages.length, modalState?.imageIndex ?? 0);
  const modalQuantity = modalProduct ? cart[modalProduct.id] ?? 0 : 0;

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
            <Button asChild variant="outline">
              <Link href="/meus-pedidos">Meus pedidos</Link>
            </Button>
            {authRole === "admin" && (
              <Button asChild variant="ghost">
                <Link href="/admin">Acessar admin</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="grid gap-4">
          <Card>
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
              {!productsLoading && !loadError && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => {
                    const quantity = cart[product.id] ?? 0;
                    const images = normalizeProductImages(product.product_images);
                    const currentIndex = getSafeImageIndex(images.length, imageIndexByProduct[product.id] ?? 0);
                    const currentImage = images[currentIndex]?.url;

                    return (
                      <Card key={product.id} className="overflow-hidden">
                        <div
                          role="button"
                          tabIndex={0}
                          className="relative block aspect-square w-full cursor-zoom-in bg-muted"
                          onClick={() => openProductModal(product.id, currentIndex)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openProductModal(product.id, currentIndex);
                            }
                          }}
                        >
                          {currentImage ? (
                            <img
                              src={currentImage}
                              alt={product.name}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                              Sem imagem
                            </div>
                          )}

                          {images.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-1"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setProductImageIndex(product.id, currentIndex - 1, images.length);
                                }}
                                aria-label="Imagem anterior"
                              >
                                <ChevronLeft className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-1"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setProductImageIndex(product.id, currentIndex + 1, images.length);
                                }}
                                aria-label="Próxima imagem"
                              >
                                <ChevronRight className="size-4" />
                              </button>
                            </>
                          )}
                        </div>

                        <CardContent className="grid gap-3 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="grid gap-1">
                              <h2 className="font-medium">{product.name}</h2>
                              <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                            </div>
                            <Badge>{formatCurrency(product.price)}</Badge>
                          </div>

                          {images.length > 1 && (
                            <div className="flex items-center gap-1">
                              {images.map((image, index) => (
                                <button
                                  key={image.id}
                                  type="button"
                                  className={`h-1.5 w-6 rounded-full ${index === currentIndex ? "bg-primary" : "bg-muted"}`}
                                  aria-label={`Ir para imagem ${index + 1}`}
                                  onClick={() => setProductImageIndex(product.id, index, images.length)}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={quantity}
                              onChange={(event) => updateQuantity(product.id, Number(event.target.value))}
                              className="max-w-24"
                            />
                            <Button variant="outline" onClick={() => updateQuantity(product.id, quantity + 1)}>
                              +1
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </section>

        <Button
          type="button"
          size="icon"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
          onClick={() => setIsCartDrawerOpen(true)}
          aria-label="Abrir carrinho"
        >
          <ShoppingBag className="size-6" />
          {cartQuantity > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground">
              {cartQuantity}
            </span>
          )}
        </Button>

        {isCartDrawerOpen && (
          <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm">
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default"
              aria-label="Fechar carrinho"
              onClick={() => setIsCartDrawerOpen(false)}
            />
            <aside className="relative z-50 ml-auto flex h-full w-full max-w-md flex-col border-l bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="grid gap-1">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <ShoppingBag className="size-4 text-primary" />
                    Carrinho
                  </h2>
                  <p className="text-sm text-muted-foreground">Seu carrinho permanece salvo mesmo durante o login.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCartDrawerOpen(false)}
                  aria-label="Fechar drawer do carrinho"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="grid flex-1 content-start gap-4 overflow-y-auto pr-1">
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
              </div>

              <Button
                type="button"
                size="lg"
                className="mt-4"
                onClick={() => void handleFinalizeOrder()}
                disabled={submittingOrder || cartItems.length === 0}
              >
                {submittingOrder ? "Processando..." : "Finalizar pedido"}
              </Button>
            </aside>
          </div>
        )}

        {modalState && modalProduct && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 py-6 backdrop-blur-sm"
            onClick={() => setModalState(null)}
          >
            <div
              className="grid w-full max-w-4xl gap-4 rounded-2xl border bg-card p-4 shadow-lg max-h-[90vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative w-full overflow-hidden rounded-xl border bg-muted">
                {modalImages[modalCurrentIndex]?.url ? (
                  <img
                    src={modalImages[modalCurrentIndex].url}
                    alt={modalProduct.name}
                    className="mx-auto max-h-[55vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex min-h-[260px] w-full items-center justify-center text-sm text-muted-foreground">
                    Sem imagem
                  </div>
                )}

                {modalImages.length > 1 && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      onClick={() =>
                        setModalState((current) =>
                          current
                            ? {
                                ...current,
                                imageIndex: ((modalCurrentIndex - 1 + modalImages.length) % modalImages.length) || 0
                              }
                            : current
                        )
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() =>
                        setModalState((current) =>
                          current
                            ? {
                                ...current,
                                imageIndex: ((modalCurrentIndex + 1) % modalImages.length) || 0
                              }
                            : current
                        )
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <h2 className="text-xl font-semibold">{modalProduct.name}</h2>
                  <p className="text-sm text-muted-foreground">{modalProduct.description}</p>
                </div>
                <Badge>{formatCurrency(modalProduct.price)}</Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {modalImages.length > 1 &&
                    modalImages.map((image, index) => (
                      <button
                        key={`${image.id}-modal`}
                        type="button"
                        className={`h-2 w-6 rounded-full ${index === modalCurrentIndex ? "bg-primary" : "bg-muted"}`}
                        onClick={() =>
                          setModalState((current) => (current ? { ...current, imageIndex: index } : current))
                        }
                        aria-label={`Ver imagem ${index + 1}`}
                      />
                    ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={modalQuantity}
                    onChange={(event) => updateQuantity(modalProduct.id, Number(event.target.value))}
                    className="max-w-24"
                  />
                  <Button variant="outline" onClick={() => updateQuantity(modalProduct.id, modalQuantity + 1)}>
                    +1
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
