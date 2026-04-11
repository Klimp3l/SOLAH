"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/types/domain";

type ApiError = {
  error?: string;
  message?: string;
};

type ApiResponse<T> = {
  data: T;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");

  async function loadProducts() {
    setLoading(true);
    setFeedbackError("");

    try {
      const response = await fetch("/api/admin/products");
      const payload = (await response.json()) as ApiResponse<Product[]> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao carregar produtos.");
      }
      setProducts(payload.data ?? []);
      toast.success("Produtos atualizados.");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao listar produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedbackError("");

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          active,
          images: [{ url: imageUrl, position: 0 }]
        })
      });

      const payload = (await response.json()) as ApiResponse<Product> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao criar produto.");
      }

      setName("");
      setDescription("");
      setPrice("0");
      setActive(true);
      setImageUrl("");
      toast.success("Produto criado com sucesso.");
      await loadProducts();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao criar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active })
      });

      const payload = (await response.json()) as ApiResponse<Product> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao atualizar produto.");
      }
      toast.success(`Produto ${payload.data.name} atualizado.`);
      await loadProducts();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao atualizar produto.");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Admin · Produtos</CardTitle>
            <CardDescription>Gerencie o catálogo com controle de status e atualização rápida.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => void loadProducts()} disabled={loading}>
            <RefreshCcw className="size-4" />
            Recarregar
          </Button>
        </CardHeader>
        {feedbackError && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Erro ao processar produtos</AlertTitle>
              <AlertDescription>{feedbackError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo produto</CardTitle>
          <CardDescription>Inclua os dados principais e uma imagem principal válida.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome
              </label>
              <Input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="price" className="text-sm font-medium">
                Preço
              </label>
              <Input
                id="price"
                required
                type="number"
                min={0.01}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea id="description" required value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label htmlFor="imageUrl" className="text-sm font-medium">
                URL da imagem principal
              </label>
              <Input
                id="imageUrl"
                required
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-dashed p-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Produto ativo
              </label>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Criar produto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos cadastrados</CardTitle>
          <CardDescription>{products.length} itens carregados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : products.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="grid gap-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>R$ {Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "secondary" : "outline"}>
                        {product.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => void toggleProduct(product)}>
                        {product.active ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
