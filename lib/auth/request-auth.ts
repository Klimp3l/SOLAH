import { UnauthorizedError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RequestAuthContext = {
  userId: string;
};

export async function getRequestAuthContext(_request: Request): Promise<RequestAuthContext> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new UnauthorizedError("Faça login para acessar este recurso.");
  }

  return { userId };
}
