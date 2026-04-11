import { createSupabaseServerClient } from "@/lib/supabase/server";
import { makeUserRepository } from "@/lib/factories/api-deps";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) {
      return jsonOk({ data: null });
    }

    const role = await makeUserRepository().getRoleByUserId(data.user.id);
    return jsonOk({
      data: {
        ...data.user,
        role
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
