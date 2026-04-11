import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ValidationError } from "@/lib/errors";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(fileName: string) {
  const rawExtension = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const normalizedExtension = rawExtension.replace(/[^a-z0-9]/g, "");
  return normalizedExtension || "bin";
}

export async function uploadProductImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new ValidationError("O arquivo enviado precisa ser uma imagem.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ValidationError("A imagem deve ter no máximo 5MB.");
  }

  const supabase = createSupabaseAdminClient();
  const { productImagesBucket } = getSupabaseEnv();
  const extension = getFileExtension(file.name);
  const filePath = `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(productImagesBucket).upload(filePath, fileBuffer, {
    upsert: false,
    contentType: file.type
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(productImagesBucket).getPublicUrl(filePath);
  if (!data.publicUrl) {
    throw new ValidationError("Não foi possível gerar a URL pública da imagem enviada.");
  }

  return data.publicUrl;
}
