import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/domain";

export class UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getRoleByUserId(userId: string): Promise<UserRole | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.role ?? null;
  }
}
