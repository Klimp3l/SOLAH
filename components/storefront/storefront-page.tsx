"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildLoginUrl,
  createOrderPayload,
  OrderRequestError,
  resolveFinalizeIntent,
  submitOrderRequest
} from "@/lib/storefront/checkout-flow";
import type { CartItemInput, ProductImage, ProductVariant, ProductWithImages, UserRole } from "@/types/domain";

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

function getVariantLabel(variant: ProductVariant) {
  const color = variant.product_colors?.name ?? "Cor";
  const size = variant.sizes?.name ?? "Tamanho";
  return `${color} · ${size}`;
}

function getColorPreview(variant: ProductVariant) {
  const colorValue = variant.product_colors?.image_url?.trim();
  if (!colorValue) return null;
  if (colorValue.startsWith("#")) {
    return {
      kind: "hex" as const,
      value: colorValue
    };
  }
  if (colorValue.startsWith("http://") || colorValue.startsWith("https://")) {
    return {
      kind: "image" as const,
      value: colorValue
    };
  }
  return null;
}

type VariantColorOption = {
  id: string;
  name: string;
  preview: ReturnType<typeof getColorPreview>;
};

type VariantSizeOption = {
  id: string;
  name: string;
};

function getColorOptions(variants: ProductVariant[]): VariantColorOption[] {
  const seen = new Set<string>();
  const options: VariantColorOption[] = [];
  for (const variant of variants) {
    if (seen.has(variant.product_color_id)) continue;
    seen.add(variant.product_color_id);
    options.push({
      id: variant.product_color_id,
      name: variant.product_colors?.name ?? "Cor",
      preview: getColorPreview(variant)
    });
  }
  return options;
}

function getSizeOptions(variants: ProductVariant[]): VariantSizeOption[] {
  const seen = new Set<string>();
  const options: VariantSizeOption[] = [];
  for (const variant of variants) {
    if (seen.has(variant.size_id)) continue;
    seen.add(variant.size_id);
    options.push({
      id: variant.size_id,
      name: variant.sizes?.name ?? "Tamanho"
    });
  }
  return options;
}

export function StorefrontPage({ initialStep = "catalogo" }: StorefrontPageProps) {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
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
    setSelectedVariantByProduct((current) => {
      const next = { ...current };
      for (const product of products) {
        const activeVariants = (product.product_variants ?? []).filter((variant) => variant.active);
        if (!activeVariants.length) continue;
        if (!next[product.id] || !activeVariants.some((variant) => variant.id === next[product.id])) {
          next[product.id] = activeVariants[0].id;
        }
      }
      return next;
    });
  }, [products]);

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
    const variantIndex = new Map<string, { product: ProductWithImages; variant: ProductVariant }>();
    for (const product of products) {
      for (const variant of product.product_variants ?? []) {
        if (!variant.active) continue;
        variantIndex.set(variant.id, { product, variant });
      }
    }

    return Object.entries(cart)
      .map(([variantId, quantity]) => {
        const indexed = variantIndex.get(variantId);
        if (!indexed || quantity <= 0) return null;
        return {
          variantId,
          quantity,
          product: indexed.product,
          variant: indexed.variant
        };
      })
      .filter((item): item is { variantId: string; quantity: number; product: ProductWithImages; variant: ProductVariant } => Boolean(item));
  }, [cart, products]);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
  }, [cartItems]);

  const cartQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  function updateQuantity(variantId: string, quantity: number) {
    const safeQuantity = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
    setCart((prev) => {
      const next = { ...prev };
      if (safeQuantity === 0) {
        delete next[variantId];
      } else {
        next[variantId] = safeQuantity;
      }
      return next;
    });
  }

  function toOrderItems(): CartItemInput[] {
    return cartItems.map((item) => ({
      productId: item.product.id,
      variantId: item.variant.id,
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

  function syncImageWithVariant(product: ProductWithImages, variant: ProductVariant, syncModal: boolean) {
    const preview = getColorPreview(variant);
    if (!preview || preview.kind !== "image") return;

    const images = normalizeProductImages(product.product_images);
    const imageIndex = images.findIndex((image) => image.url === preview.value);
    if (imageIndex < 0) return;

    setProductImageIndex(product.id, imageIndex, images.length);
    if (syncModal) {
      setModalState((current) => {
        if (!current || current.productId !== product.id) return current;
        return { ...current, imageIndex };
      });
    }
  }

  function selectVariant(product: ProductWithImages, variantId: string, syncModalImage = false) {
    const activeVariants = (product.product_variants ?? []).filter((variant) => variant.active);
    const selected = activeVariants.find((variant) => variant.id === variantId);
    if (!selected) return;

    setSelectedVariantByProduct((current) => ({ ...current, [product.id]: selected.id }));
    syncImageWithVariant(product, selected, syncModalImage);
  }

  function selectColor(product: ProductWithImages, colorId: string, syncModalImage = false) {
    const activeVariants = (product.product_variants ?? []).filter((variant) => variant.active);
    const currentVariantId = selectedVariantByProduct[product.id];
    const currentVariant = activeVariants.find((variant) => variant.id === currentVariantId) ?? null;

    const byColor = activeVariants.filter((variant) => variant.product_color_id === colorId);
    if (!byColor.length) return;

    const nextVariant =
      byColor.find((variant) => variant.size_id === currentVariant?.size_id) ??
      byColor.find((variant) => variant.id === currentVariantId) ??
      byColor[0];

    selectVariant(product, nextVariant.id, syncModalImage);
  }

  function selectSize(product: ProductWithImages, sizeId: string, syncModalImage = false) {
    const activeVariants = (product.product_variants ?? []).filter((variant) => variant.active);
    const currentVariantId = selectedVariantByProduct[product.id];
    const currentVariant = activeVariants.find((variant) => variant.id === currentVariantId) ?? null;

    const nextVariant =
      activeVariants.find((variant) => variant.product_color_id === currentVariant?.product_color_id && variant.size_id === sizeId) ??
      activeVariants.find((variant) => variant.size_id === sizeId) ??
      null;

    if (!nextVariant) return;
    selectVariant(product, nextVariant.id, syncModalImage);
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
  const modalActiveVariants = (modalProduct?.product_variants ?? []).filter((variant) => variant.active);
  const modalSelectedVariantId = modalProduct
    ? selectedVariantByProduct[modalProduct.id] ?? modalActiveVariants[0]?.id ?? ""
    : "";
  const modalSelectedVariant = modalActiveVariants.find((variant) => variant.id === modalSelectedVariantId) ?? null;
  const modalColorOptions = getColorOptions(modalActiveVariants);
  const modalSelectedColorId = modalSelectedVariant?.product_color_id ?? modalColorOptions[0]?.id ?? "";
  const modalVariantsByColor = modalActiveVariants.filter((variant) => variant.product_color_id === modalSelectedColorId);
  const modalSizeOptions = getSizeOptions(modalVariantsByColor.length ? modalVariantsByColor : modalActiveVariants);
  const modalHasMultipleSizes = modalSizeOptions.length > 1;
  const modalQuantity = modalSelectedVariantId ? cart[modalSelectedVariantId] ?? 0 : 0;

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
                    const images = normalizeProductImages(product.product_images);
                    const currentIndex = getSafeImageIndex(images.length, imageIndexByProduct[product.id] ?? 0);
                    const currentImage = images[currentIndex]?.url;
                    const activeVariants = (product.product_variants ?? []).filter((variant) => variant.active);
                    const selectedVariantId = selectedVariantByProduct[product.id] ?? activeVariants[0]?.id ?? "";
                    const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? null;
                    const colorOptions = getColorOptions(activeVariants);
                    const selectedColorId = selectedVariant?.product_color_id ?? colorOptions[0]?.id ?? "";
                    const variantsBySelectedColor = activeVariants.filter((variant) => variant.product_color_id === selectedColorId);
                    const sizeOptions = getSizeOptions(variantsBySelectedColor.length ? variantsBySelectedColor : activeVariants);
                    const hasMultipleSizes = sizeOptions.length > 1;
                    const quantity = selectedVariant ? cart[selectedVariant.id] ?? 0 : 0;

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
                            <Badge>{formatCurrency(Number(selectedVariant?.price ?? product.price))}</Badge>
                          </div>

                          <div className="grid gap-2">
                            {colorOptions.length > 0 && (
                              <div className="grid gap-1.5">
                                <span className="text-xs text-muted-foreground">Cores disponíveis</span>
                                <div className="flex flex-wrap gap-2">
                                  {colorOptions.map((color) => (
                                    <button
                                      key={color.id}
                                      type="button"
                                      className={`relative size-7 rounded-full border transition ${color.id === selectedColorId ? "ring-2 ring-primary ring-offset-2" : ""
                                        }`}
                                      onClick={() => selectColor(product, color.id)}
                                      aria-label={`Selecionar cor ${color.name}`}
                                      title={color.name}
                                    >
                                      {color.preview?.kind === "image" ? (
                                        <img
                                          src={color.preview.value}
                                          alt=""
                                          className="size-full rounded-full object-cover"
                                          aria-hidden
                                        />
                                      ) : (
                                        <span
                                          className="block size-full rounded-full"
                                          style={{ backgroundColor: color.preview?.value ?? "#e5e7eb" }}
                                          aria-hidden
                                        />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {hasMultipleSizes ? (
                              <div className="grid gap-1.5">
                                <span className="text-xs text-muted-foreground">Tamanho</span>
                                <Select
                                  value={selectedVariant?.size_id ?? ""}
                                  onValueChange={(sizeId) => selectSize(product, sizeId)}
                                  disabled={!sizeOptions.length}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tamanho" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sizeOptions.map((size) => (
                                      <SelectItem key={size.id} value={size.id}>
                                        {size.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Tamanho único</span>
                            )}
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
                              onChange={(event) => {
                                if (!selectedVariant) return;
                                updateQuantity(selectedVariant.id, Number(event.target.value));
                              }}
                              className="max-w-24"
                              disabled={!selectedVariant}
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (!selectedVariant) return;
                                updateQuantity(selectedVariant.id, quantity + 1);
                              }}
                              disabled={!selectedVariant}
                            >
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
                        <div key={item.variantId} className="flex items-center justify-between gap-3 text-sm">
                          <span className="grid">
                            <span>
                              {item.quantity}x {item.product.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{getVariantLabel(item.variant)}</span>
                          </span>
                          <span className="font-medium">{formatCurrency(Number(item.variant.price) * item.quantity)}</span>
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
                <Badge>
                  {formatCurrency(
                    Number(modalSelectedVariant?.price ?? modalProduct.price)
                  )}
                </Badge>
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

                <div className="flex flex-wrap items-center gap-3">
                  {modalColorOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Cores:</span>
                      <div className="flex flex-wrap gap-2">
                        {modalColorOptions.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            className={`relative size-7 rounded-full border transition ${color.id === modalSelectedColorId ? "ring-2 ring-primary ring-offset-2" : ""
                              }`}
                            onClick={() => selectColor(modalProduct, color.id, true)}
                            aria-label={`Selecionar cor ${color.name}`}
                            title={color.name}
                          >
                            {color.preview?.kind === "image" ? (
                              <img
                                src={color.preview.value}
                                alt=""
                                className="size-full rounded-full object-cover"
                                aria-hidden
                              />
                            ) : (
                              <span
                                className="block size-full rounded-full"
                                style={{ backgroundColor: color.preview?.value ?? "#e5e7eb" }}
                                aria-hidden
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {modalHasMultipleSizes ? (
                    <Select value={modalSelectedVariant?.size_id ?? ""} onValueChange={(sizeId) => selectSize(modalProduct, sizeId, true)}>
                      <SelectTrigger className="min-w-44">
                        <SelectValue placeholder="Selecione o tamanho" />
                      </SelectTrigger>
                      <SelectContent>
                        {modalSizeOptions.map((size) => (
                          <SelectItem key={size.id} value={size.id}>
                            {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">Tamanho único</span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    value={modalQuantity}
                    onChange={(event) => {
                      if (!modalSelectedVariantId) return;
                      updateQuantity(modalSelectedVariantId, Number(event.target.value));
                    }}
                    className="max-w-24"
                    disabled={!modalSelectedVariantId}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!modalSelectedVariantId) return;
                      updateQuantity(modalSelectedVariantId, modalQuantity + 1);
                    }}
                    disabled={!modalSelectedVariantId}
                  >
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
