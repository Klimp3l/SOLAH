import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { NotFoundError, ValidationError } from "@/lib/errors";

const MAX_PROOF_SIZE_BYTES = 6 * 1024 * 1024;

function getFileExtension(fileName: string) {
  const rawExtension = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const normalizedExtension = rawExtension.replace(/[^a-z0-9]/g, "");
  return normalizedExtension || "bin";
}

export async function uploadPaymentProofFile(file: File) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new ValidationError("Envie um comprovante em JPG, PNG, WEBP ou PDF.");
  }

  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new ValidationError("O comprovante deve ter no máximo 6MB.");
  }

  const supabase = createSupabaseAdminClient();
  const { paymentProofsBucket } = getSupabaseEnv();
  const extension = getFileExtension(file.name);
  const filePath = `payment-proofs/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(paymentProofsBucket).upload(filePath, fileBuffer, {
    upsert: false,
    contentType: file.type
  });
  if (uploadError) throw uploadError;

  return filePath;
}

export async function createPaymentProofSignedUrl(filePath: string, expiresInSeconds = 600) {
  if (!filePath || filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  const supabase = createSupabaseAdminClient();
  const { paymentProofsBucket } = getSupabaseEnv();
  const { data, error } = await supabase.storage
    .from(paymentProofsBucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new NotFoundError("Não foi possível gerar a URL temporária do comprovante.");
  }

  return data.signedUrl;
}
