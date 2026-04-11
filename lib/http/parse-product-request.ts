import { z } from "zod";
import { ValidationError } from "@/lib/errors";

const COLOR_UPLOAD_TOKEN_PREFIX = "__color_upload__:";

function parsePayloadField(payloadField: FormDataEntryValue | null) {
  if (typeof payloadField !== "string") {
    throw new ValidationError("Campo payload é obrigatório no envio multipart.");
  }

  try {
    return JSON.parse(payloadField) as Record<string, unknown>;
  } catch {
    throw new ValidationError("Campo payload precisa ser um JSON válido.");
  }
}

async function resolveColorUploads(payload: Record<string, unknown>, formData: FormData, uploadImage: (file: File) => Promise<string>) {
  const variantsRaw = payload.variants;
  if (!Array.isArray(variantsRaw)) return;

  const uploadCache = new Map<string, string>();

  for (const variantRaw of variantsRaw) {
    if (!variantRaw || typeof variantRaw !== "object") continue;
    const variant = variantRaw as Record<string, unknown>;
    if (!variant.color || typeof variant.color !== "object") continue;

    const color = variant.color as Record<string, unknown>;
    const currentImageUrl = color.imageUrl;
    if (typeof currentImageUrl !== "string" || !currentImageUrl.startsWith(COLOR_UPLOAD_TOKEN_PREFIX)) {
      continue;
    }

    let uploadedUrl = uploadCache.get(currentImageUrl);
    if (!uploadedUrl) {
      const uploadId = currentImageUrl.slice(COLOR_UPLOAD_TOKEN_PREFIX.length);
      const fileFieldKey = `colorImageFile:${uploadId}`;
      const colorImageFile = formData.get(fileFieldKey);

      if (!(colorImageFile instanceof File) || colorImageFile.size <= 0) {
        throw new ValidationError("Uma das cores customizadas não possui arquivo de imagem válido.");
      }

      uploadedUrl = await uploadImage(colorImageFile);
      uploadCache.set(currentImageUrl, uploadedUrl);
    }

    color.imageUrl = uploadedUrl;
  }
}

export async function parseRequestWithOptionalImageUpload<T>(
  request: Request,
  schema: z.ZodType<T>,
  uploadImage: (file: File) => Promise<string>
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return schema.parse(await request.json());
  }

  const formData = await request.formData();
  const payload = parsePayloadField(formData.get("payload"));
  const imageFile = formData.get("imageFile");

  if (imageFile instanceof File && imageFile.size > 0) {
    const imageUrl = await uploadImage(imageFile);
    payload.images = [{ url: imageUrl, position: 0 }];
  }

  await resolveColorUploads(payload, formData, uploadImage);

  return schema.parse(payload);
}
