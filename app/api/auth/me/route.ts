import { createSupabaseServerClient } from "@/lib/supabase/server";
import { makeUserRepository } from "@/lib/factories/api-deps";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return jsonOk({ data: null });
    }
    if (!data.user) {
      return jsonOk({ data: null });
    }

    const userRepository = makeUserRepository();
    const role = await userRepository.getRoleByUserId(data.user.id);
    const profile = await userRepository.getById(data.user.id);
    return jsonOk({
      data: {
        id: data.user.id,
        email: data.user.email,
        role,
        phone: profile?.phone ?? null,
        name: profile?.name ?? null
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
