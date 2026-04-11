"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCcw, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Category, ProductColor, ProductWithImages, ProductType, Size } from "@/types/domain";

type ApiError = {
  error?: string;
  message?: string;
};

type ApiResponse<T> = {
  data: T;
};

type LookupResponse = {
  categories: Category[];
  productTypes: ProductType[];
  sizes: Size[];
};

type CustomColorInput = {
  name: string;
  imageFile: File | null;
  imagePreviewUrl: string;
};

type ExistingColorEditInput = {
  uploadKey: string;
  file: File;
  imagePreviewUrl: string;
};

const COLOR_UPLOAD_TOKEN_PREFIX = "__color_upload__:";
const DEFAULT_COLOR_ID = "__default_color__";
const DEFAULT_COLOR_NAME = "Padrão";

function normalizeLookupName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [lookups, setLookups] = useState<LookupResponse>({
    categories: [],
    productTypes: [],
    sizes: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [categoryId, setCategoryId] = useState("__new__");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productTypeId, setProductTypeId] = useState("__new__");
  const [newProductTypeName, setNewProductTypeName] = useState("");
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [customColors, setCustomColors] = useState<CustomColorInput[]>([]);
  const [customSizes, setCustomSizes] = useState<string[]>([""]);
  const [productScopedColors, setProductScopedColors] = useState<ProductColor[]>([]);
  const [isColorLookupModalOpen, setIsColorLookupModalOpen] = useState(false);
  const [isSizeLookupModalOpen, setIsSizeLookupModalOpen] = useState(false);
  const [newLookupColorName, setNewLookupColorName] = useState("");
  const [newLookupColorImageFile, setNewLookupColorImageFile] = useState<File | null>(null);
  const [newLookupColorImagePreviewUrl, setNewLookupColorImagePreviewUrl] = useState("");
  const [editingLookupColorId, setEditingLookupColorId] = useState<string | null>(null);
  const [existingColorEdits, setExistingColorEdits] = useState<Record<string, ExistingColorEditInput>>({});
  const [newLookupSizeName, setNewLookupSizeName] = useState("");
  const [creatingLookup, setCreatingLookup] = useState<"color" | "size" | null>(null);
  const defaultColorOption = productScopedColors.find((color) => normalizeLookupName(color.name) === "padrao") ?? null;
  const effectiveDefaultColorOption: ProductColor = defaultColorOption ?? {
    id: DEFAULT_COLOR_ID,
    product_id: editingProduct?.id ?? "",
    name: DEFAULT_COLOR_NAME,
    image_url: null
  };
  const uniqueSizeOption = lookups.sizes.find((size) => normalizeLookupName(size.name) === "unico") ?? null;
  const regularColors = productScopedColors.filter((color) => color.id !== effectiveDefaultColorOption.id);
  const regularSizes = lookups.sizes.filter((size) => size.id !== uniqueSizeOption?.id);
  const availableProductImageUrls = Array.from(
    new Set(
      [
        ...((editingProduct?.product_images ?? []).map((image) => image.url).filter(Boolean) as string[]),
        imagePreviewUrl.startsWith("http://") || imagePreviewUrl.startsWith("https://") ? imagePreviewUrl : ""
      ].filter(Boolean)
    )
  );

  async function loadProducts() {
    try {
      const response = await fetch("/api/admin/products");
      const payload = (await response.json()) as ApiResponse<ProductWithImages[]> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao carregar produtos.");
      }
      setProducts(payload.data ?? []);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao listar produtos.");
    }
  }

  async function loadLookups() {
    try {
      const response = await fetch("/api/admin/product-lookups");
      const payload = (await response.json()) as ApiResponse<LookupResponse> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao carregar opções de cadastro.");
      }

      setLookups(payload.data);
      setSelectedSizeIds((current) => current.filter((id) => payload.data.sizes.some((size) => size.id === id)));
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao carregar opções de produto.");
    }
  }

  async function refreshData(showToast = true) {
    setLoading(true);
    setFeedbackError("");
    await Promise.all([loadProducts(), loadLookups()]);
    setLoading(false);
    if (showToast) {
      toast.success("Dados atualizados.");
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setFeedbackError("");
      await Promise.all([loadProducts(), loadLookups()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isModalOpen || editingProduct) return;
    setSelectedColorIds((current) => (current.length ? current : [DEFAULT_COLOR_ID]));
    if (uniqueSizeOption) {
      setSelectedSizeIds((current) => (current.length ? current : [uniqueSizeOption.id]));
    }
  }, [isModalOpen, editingProduct, uniqueSizeOption]);

  function toggleSelection(values: string[], value: string) {
    if (values.includes(value)) {
      return values.filter((item) => item !== value);
    }
    return [...values, value];
  }

  function clearImagePreview() {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl("");
  }

  function clearCustomColorPreviews() {
    customColors.forEach((color) => {
      if (color.imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(color.imagePreviewUrl);
      }
    });
  }

  function clearExistingColorEditsPreviews() {
    Object.values(existingColorEdits).forEach((item) => {
      if (item.imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.imagePreviewUrl);
      }
    });
  }

  function onImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function onCustomColorImageChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setCustomColors((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (item.imagePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.imagePreviewUrl);
        }

        return {
          ...item,
          imageFile: file,
          imagePreviewUrl: file ? URL.createObjectURL(file) : ""
        };
      })
    );
  }

  function onLookupColorImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (newLookupColorImagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(newLookupColorImagePreviewUrl);
    }
    setNewLookupColorImageFile(file);
    setNewLookupColorImagePreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  function removeCustomColor(index: number) {
    setCustomColors((current) => {
      const target = current[index];
      if (target?.imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.imagePreviewUrl);
      }

      const next = current.filter((_, itemIndex) => itemIndex !== index);
      if (next.length > 0) return next;
      return [];
    });
  }

  function removeCustomSize(index: number) {
    setCustomSizes((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      if (next.length > 0) return next;
      return [""];
    });
  }

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("0");
    setActive(true);
    setImageFile(null);
    clearImagePreview();
    clearCustomColorPreviews();
    setCategoryId("__new__");
    setNewCategoryName("");
    setProductTypeId("__new__");
    setNewProductTypeName("");
    setSelectedColorIds([DEFAULT_COLOR_ID]);
    setSelectedSizeIds(uniqueSizeOption ? [uniqueSizeOption.id] : []);
    setProductScopedColors([]);
    clearExistingColorEditsPreviews();
    setExistingColorEdits({});
    setCustomColors([]);
    setCustomSizes([""]);
  }

  function openCreateModal() {
    setEditingProduct(null);
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(product: ProductWithImages) {
    const variantsForSelection = product.product_variants.filter((variant) => variant.product_id === product.id);
    const activeVariantsForSelection = variantsForSelection.filter((variant) => variant.active);
    const scopedColors = Array.from(
      new Map(
        variantsForSelection
          .map((variant) => variant.product_colors)
          .filter((color): color is NonNullable<typeof variantsForSelection[number]["product_colors"]> => Boolean(color))
          .map((color) => [color.id, color])
      ).values()
    );

    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(String(product.price));
    setActive(product.active);
    setImageFile(null);
    clearImagePreview();
    setImagePreviewUrl(product.product_images[0]?.url ?? "");
    setCategoryId(product.category_id ?? "__new__");
    setNewCategoryName("");
    setProductTypeId(product.product_type_id ?? "__new__");
    setNewProductTypeName("");
    setProductScopedColors(scopedColors);
    setSelectedColorIds([...new Set(activeVariantsForSelection.map((variant) => variant.product_color_id))]);
    setSelectedSizeIds([...new Set(activeVariantsForSelection.map((variant) => variant.size_id))]);
    clearExistingColorEditsPreviews();
    setExistingColorEdits({});
    clearCustomColorPreviews();
    setCustomColors([]);
    setCustomSizes([""]);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    resetForm();
  }

  function closeColorLookupModal() {
    if (newLookupColorImagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(newLookupColorImagePreviewUrl);
    }
    setIsColorLookupModalOpen(false);
    setEditingLookupColorId(null);
    setNewLookupColorName("");
    setNewLookupColorImageFile(null);
    setNewLookupColorImagePreviewUrl("");
  }

  function openEditColorLookupModal(color: ProductColor) {
    setEditingLookupColorId(color.id);
    setNewLookupColorName(color.name);
    setNewLookupColorImageFile(null);
    setNewLookupColorImagePreviewUrl(existingColorEdits[color.id]?.imagePreviewUrl ?? color.image_url ?? "");
    setIsColorLookupModalOpen(true);
  }

  function closeSizeLookupModal() {
    setIsSizeLookupModalOpen(false);
    setNewLookupSizeName("");
  }

  async function onCreateColorLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingLookup("color");
    try {
      const colorName = newLookupColorName.trim();
      if (colorName.length < 2) {
        throw new Error("Informe um nome de cor válido.");
      }

      if (editingLookupColorId) {
        setProductScopedColors((current) =>
          current.map((color) => (color.id === editingLookupColorId ? { ...color, name: colorName } : color))
        );
        setSelectedColorIds((current) =>
          current.includes(editingLookupColorId) ? current : [...current, editingLookupColorId]
        );
        if (newLookupColorImageFile) {
          const uploadKey = `existing-${editingLookupColorId}-${Date.now()}`;
          setExistingColorEdits((current) => {
            const previous = current[editingLookupColorId];
            if (previous?.imagePreviewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(previous.imagePreviewUrl);
            }
            return {
              ...current,
              [editingLookupColorId]: {
                uploadKey,
                file: newLookupColorImageFile,
                imagePreviewUrl: newLookupColorImagePreviewUrl
              }
            };
          });
        }
        toast.success("Cor atualizada no produto.");
        closeColorLookupModal();
        return;
      }

      const appendedImageFile = newLookupColorImageFile;
      const appendedImagePreview = newLookupColorImagePreviewUrl;
      setCustomColors((current) => [
        ...current,
        {
          name: colorName,
          imageFile: appendedImageFile,
          imagePreviewUrl: appendedImagePreview
        }
      ]);
      toast.success("Cor adicionada ao produto.");
      setIsColorLookupModalOpen(false);
      setNewLookupColorName("");
      setNewLookupColorImageFile(null);
      setNewLookupColorImagePreviewUrl("");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao adicionar cor.");
    } finally {
      setCreatingLookup(null);
    }
  }

  async function onCreateSizeLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingLookup("size");
    try {
      const response = await fetch("/api/admin/product-lookups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "size",
          name: newLookupSizeName.trim()
        })
      });
      const payload = (await response.json()) as ApiResponse<Size> & ApiError;
      if (!response.ok || !payload.data?.id) {
        throw new Error(payload.message ?? "Falha ao criar tamanho.");
      }

      await loadLookups();
      setSelectedSizeIds((current) => {
        const withoutUnique = current.filter((id) => id !== uniqueSizeOption?.id);
        return withoutUnique.includes(payload.data.id) ? withoutUnique : [...withoutUnique, payload.data.id];
      });
      toast.success("Tamanho criado com sucesso.");
      closeSizeLookupModal();
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao criar tamanho.");
    } finally {
      setCreatingLookup(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedbackError("");

    try {
      const normalizedCustomColors = customColors
        .map((item, index) => ({
          name: item.name.trim(),
          imageFile: item.imageFile,
          imagePreviewUrl: item.imagePreviewUrl,
          uploadKey: String(index)
        }))
        .filter((item) => item.name.length >= 2);
      const normalizedCustomSizes = customSizes.map((item) => item.trim()).filter((item) => item.length >= 1);

      const selectedColors = [
        ...(selectedColorIds.includes(DEFAULT_COLOR_ID)
          ? [{ name: DEFAULT_COLOR_NAME, imageUrl: undefined as string | undefined }]
          : []),
        ...productScopedColors
          .filter((color) => selectedColorIds.includes(color.id))
          .map((color) => {
            const colorEdit = existingColorEdits[color.id];
            return {
              id: color.id,
              name: color.name,
              imageUrl: colorEdit ? `${COLOR_UPLOAD_TOKEN_PREFIX}${colorEdit.uploadKey}` : color.image_url ?? undefined
            };
          }),
        ...normalizedCustomColors.map((color) => ({
          name: color.name,
          imageUrl: color.imageFile
            ? `${COLOR_UPLOAD_TOKEN_PREFIX}${color.uploadKey}`
            : color.imagePreviewUrl.startsWith("http://") || color.imagePreviewUrl.startsWith("https://")
              ? color.imagePreviewUrl
              : undefined
        }))
      ];

      const selectedSizes = [
        ...lookups.sizes
          .filter((size) => selectedSizeIds.includes(size.id))
          .map((size) => ({ id: size.id, name: size.name, sortOrder: size.sort_order })),
        ...normalizedCustomSizes.map((size, index) => ({ name: size, sortOrder: lookups.sizes.length + index + 1 }))
      ];

      if (!selectedColors.length || !selectedSizes.length) {
        throw new Error("Selecione ou crie pelo menos 1 cor e 1 tamanho.");
      }
      if (categoryId === "__new__" && newCategoryName.trim().length < 2) {
        throw new Error("Informe o nome da categoria.");
      }
      if (productTypeId === "__new__" && newProductTypeName.trim().length < 2) {
        throw new Error("Informe o nome do tipo.");
      }
      if (!editingProduct && !imageFile) {
        throw new Error("Faça o upload da imagem principal do produto.");
      }

      const endpoint = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = editingProduct ? "PATCH" : "POST";
      const requestPayload = {
        name,
        description,
        price: Number(price),
        active,
        category: categoryId === "__new__" ? { name: newCategoryName.trim() } : { id: categoryId },
        productType: productTypeId === "__new__" ? { name: newProductTypeName.trim() } : { id: productTypeId },
        variants: selectedColors.flatMap((color) =>
          selectedSizes.map((size) => ({
            color,
            size,
            price: Number(price),
            active
          }))
        )
      };
      const formData = new FormData();
      formData.append("payload", JSON.stringify(requestPayload));
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }
      normalizedCustomColors.forEach((color) => {
        if (color.imageFile) {
          formData.append(`colorImageFile:${color.uploadKey}`, color.imageFile);
        }
      });
      Object.values(existingColorEdits).forEach((colorEdit) => {
        formData.append(`colorImageFile:${colorEdit.uploadKey}`, colorEdit.file);
      });

      const response = await fetch(endpoint, {
        method,
        body: formData
      });

      const responsePayload = (await response.json()) as ApiResponse<ProductWithImages> & ApiError;
      if (!response.ok) {
        throw new Error(responsePayload.message ?? `Falha ao ${editingProduct ? "atualizar" : "criar"} produto.`);
      }

      toast.success(editingProduct ? "Produto atualizado com sucesso." : "Produto criado com sucesso.");
      closeModal();
      await refreshData(false);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : `Erro ao ${editingProduct ? "atualizar" : "criar"} produto.`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: ProductWithImages) {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active })
      });

      const payload = (await response.json()) as ApiResponse<ProductWithImages> & ApiError;
      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao atualizar produto.");
      }
      toast.success(`Produto ${payload.data.name} atualizado.`);
      await refreshData();
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
            <CardDescription>
              Gerencie catálogo com categoria, tipo, cores, tamanhos e combinações de variantes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void refreshData()} disabled={loading}>
              <RefreshCcw className="size-4" />
              Recarregar
            </Button>
            <Button onClick={openCreateModal}>
              <Plus className="size-4" />
              Adicionar produto
            </Button>
          </div>
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
          <CardTitle>Produtos cadastrados</CardTitle>
          <CardDescription>{products.length} itens carregados (duplo clique para editar)</CardDescription>
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
                  <TableHead>Categoria / Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Variantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onDoubleClick={() => {
                      openEditModal(product);
                    }}
                  >
                    <TableCell>
                      <div className="grid gap-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1 text-xs text-muted-foreground">
                        <span>{product.categories?.name ?? "Sem categoria"}</span>
                        <span>{product.product_types?.name ?? "Sem tipo"}</span>
                      </div>
                    </TableCell>
                    <TableCell>R$ {Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {(product.product_variants ?? []).filter((variant) => variant.active).length}
                    </TableCell>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">{editingProduct ? "Editar produto" : "Novo produto"}</h2>
                <p className="text-sm text-muted-foreground">
                  Selecione opções já cadastradas ou adicione novas no momento do cadastro.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeModal} aria-label="Fechar modal de produto">
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome
                </label>
                <Input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Nova categoria</SelectItem>
                    {lookups.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {categoryId === "__new__" && (
                <div className="grid gap-2">
                  <label htmlFor="newCategoryName" className="text-sm font-medium">
                    Nome da nova categoria
                  </label>
                  <Input
                    id="newCategoryName"
                    required
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={productTypeId} onValueChange={setProductTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Novo tipo</SelectItem>
                    {lookups.productTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {productTypeId === "__new__" && (
                <div className="grid gap-2">
                  <label htmlFor="newProductTypeName" className="text-sm font-medium">
                    Nome do novo tipo
                  </label>
                  <Input
                    id="newProductTypeName"
                    required
                    value={newProductTypeName}
                    onChange={(event) => setNewProductTypeName(event.target.value)}
                  />
                </div>
              )}
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
              <div className="grid gap-2 md:col-span-2 xl:col-span-3">
                <label htmlFor="description" className="text-sm font-medium">
                  Descrição
                </label>
                <Textarea id="description" required value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="grid gap-2 md:col-span-2 xl:col-span-3">
                <label htmlFor="imageFile" className="text-sm font-medium">
                  Imagem principal (upload)
                </label>
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  required={!editingProduct}
                  onChange={onImageFileChange}
                />
                {imagePreviewUrl ? (
                  <div className="mt-2">
                    <Image
                      src={imagePreviewUrl}
                      alt="Pré-visualização da imagem do produto"
                      className="h-32 w-32 rounded-md border object-cover"
                      width={128}
                      height={128}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-xl border p-4 md:col-span-2 xl:col-span-3">
                <p className="text-sm font-medium">Cores (selecione existentes e/ou crie novas)</p>
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cor padrão (exclusiva)</p>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        clearCustomColorPreviews();
                        setCustomColors([]);
                        setSelectedColorIds([effectiveDefaultColorOption.id]);
                      }}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${selectedColorIds.length === 1 && selectedColorIds.includes(effectiveDefaultColorOption.id)
                        ? "border-primary bg-primary/10"
                        : "border-muted-foreground/20 hover:border-primary/50"
                        }`}
                    >
                      {effectiveDefaultColorOption.image_url?.startsWith("#") ? (
                        <span
                          className="size-6 rounded-full border shadow-sm"
                          style={{ backgroundColor: effectiveDefaultColorOption.image_url }}
                          aria-hidden
                        />
                      ) : effectiveDefaultColorOption.image_url ? (
                        <Image
                          src={effectiveDefaultColorOption.image_url}
                          alt={`Imagem da cor ${effectiveDefaultColorOption.name}`}
                          className="size-8 rounded-md border object-cover"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <span className="size-6 rounded-full border bg-muted" aria-hidden />
                      )}
                      <span className="font-medium">{effectiveDefaultColorOption.name}</span>
                    </button>
                  </div>
                </>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {regularColors.map((color) => (
                    (() => {
                      const colorPreview = existingColorEdits[color.id]?.imagePreviewUrl ?? color.image_url;
                      return (
                        <div
                          key={color.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border p-1 pr-2 transition-colors ${selectedColorIds.includes(color.id)
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/20 hover:border-primary/50"
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedColorIds((current) =>
                                toggleSelection(
                                  current.filter((id) => id !== effectiveDefaultColorOption.id),
                                  color.id
                                )
                              )
                            }
                            className="flex flex-1 items-center gap-3 rounded-md p-2 text-left text-sm"
                          >
                            {colorPreview?.startsWith("#") ? (
                              <span className="size-6 rounded-full border shadow-sm" style={{ backgroundColor: colorPreview }} aria-hidden />
                            ) : colorPreview ? (
                              <Image
                                src={colorPreview}
                                alt={`Imagem da cor ${color.name}`}
                                className="size-8 rounded-md border object-cover"
                                width={32}
                                height={32}
                              />
                            ) : (
                              <span className="size-6 rounded-full border bg-muted" aria-hidden />
                            )}
                            <span className="font-medium">{color.name}</span>
                          </button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEditColorLookupModal(color)}>
                            Editar
                          </Button>
                        </div>
                      );
                    })()
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingLookupColorId(null);
                      setIsColorLookupModalOpen(true);
                    }}
                    className="grid gap-1 rounded-xl border border-dashed p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <Plus className="size-4" />
                      Nova cor
                    </span>
                  </button>
                </div>
                {customColors.filter((color) => color.name.trim().length >= 2).length > 0 ? (
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cores adicionadas neste produto
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {customColors
                        .filter((color) => color.name.trim().length >= 2)
                        .map((color, index) => (
                          <div
                            key={`custom-color-card-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {color.imagePreviewUrl ? (
                                <Image
                                  src={color.imagePreviewUrl}
                                  alt={`Imagem da cor ${color.name}`}
                                  className="size-8 rounded-md border object-cover"
                                  width={32}
                                  height={32}
                                />
                              ) : (
                                <span className="size-6 rounded-full border bg-muted" aria-hidden />
                              )}
                              <span className="font-medium">{color.name}</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomColor(index)}>
                              Remover
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-xl border p-4 md:col-span-2 xl:col-span-3">
                <p className="text-sm font-medium">Tamanhos (selecione existentes e/ou crie novos)</p>
                {uniqueSizeOption ? (
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tamanho único (exclusivo)
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSizes([""]);
                        setSelectedSizeIds([uniqueSizeOption.id]);
                      }}
                      className={`w-fit rounded-full border px-3 py-1 text-sm transition-colors ${selectedSizeIds.length === 1 && selectedSizeIds.includes(uniqueSizeOption.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/20 hover:border-primary/50"
                        }`}
                    >
                      {uniqueSizeOption.name}
                    </button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {regularSizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() =>
                        setSelectedSizeIds((current) =>
                          toggleSelection(
                            current.filter((id) => id !== uniqueSizeOption?.id),
                            size.id
                          )
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedSizeIds.includes(size.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/20 hover:border-primary/50"
                        }`}
                    >
                      {size.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsSizeLookupModalOpen(true)}
                    className="w-fit rounded-full border border-dashed px-3 py-1 text-sm transition-colors hover:border-primary/60 hover:bg-primary/5"
                  >
                    + Novo tamanho
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-dashed p-4 md:col-span-2 xl:col-span-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                  Produto ativo
                </label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {editingProduct ? "Salvar alterações" : "Criar produto e variantes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {isColorLookupModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {editingLookupColorId ? "Editar cor selecionada" : "Cadastrar nova cor"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {editingLookupColorId
                    ? "Atualize os dados da cor para este produto."
                    : "Crie uma cor e já use no produto atual."}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeColorLookupModal} aria-label="Fechar modal de nova cor">
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={onCreateColorLookup} className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="newLookupColorName" className="text-sm font-medium">
                  Nome da cor
                </label>
                <Input
                  id="newLookupColorName"
                  required
                  minLength={2}
                  value={newLookupColorName}
                  onChange={(event) => setNewLookupColorName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="newLookupColorImageFile" className="text-sm font-medium">
                  Imagem da cor (opcional)
                </label>
                <Input id="newLookupColorImageFile" type="file" accept="image/*" onChange={onLookupColorImageChange} />
                {newLookupColorImagePreviewUrl ? (
                  <Image
                    src={newLookupColorImagePreviewUrl}
                    alt="Pré-visualização da imagem da nova cor"
                    className="h-16 w-16 rounded-md border object-cover"
                    width={64}
                    height={64}
                  />
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeColorLookupModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingLookup === "color"}>
                  {creatingLookup === "color" && <Loader2 className="size-4 animate-spin" />}
                  {editingLookupColorId ? "Salvar edição" : "Salvar cor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isSizeLookupModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Cadastrar novo tamanho</h3>
                <p className="text-sm text-muted-foreground">Crie um tamanho e já use no produto atual.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeSizeLookupModal}
                aria-label="Fechar modal de novo tamanho"
              >
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={onCreateSizeLookup} className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="newLookupSizeName" className="text-sm font-medium">
                  Nome do tamanho
                </label>
                <Input
                  id="newLookupSizeName"
                  required
                  minLength={1}
                  value={newLookupSizeName}
                  onChange={(event) => setNewLookupSizeName(event.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeSizeLookupModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingLookup === "size"}>
                  {creatingLookup === "size" && <Loader2 className="size-4 animate-spin" />}
                  Salvar tamanho
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
