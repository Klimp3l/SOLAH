export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const productImagesBucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images";

  if (!url || !anonKey) {
    throw new Error("Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias.");
  }

  return { url, anonKey, serviceRoleKey, productImagesBucket };
}
