import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/domain";
export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  created_at: string;
};

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

  async getById(userId: string): Promise<UserRecord | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,email,name,role,phone,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await this.supabase
      .from("users")
      .select("id,email,name,role,phone,created_at")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async listAll(): Promise<UserRecord[]> {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,email,name,role,phone,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async updatePhone(userId: string, phone: string) {
    const { data, error } = await this.supabase
      .from("users")
      .update({ phone })
      .eq("id", userId)
      .select("id,email,name,role,phone,created_at")
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(
    userId: string,
    input: Partial<Pick<UserRecord, "name" | "phone" | "role">> & { email?: string }
  ) {
    const patch: Record<string, string | null> = {};
    if (typeof input.name === "string") patch.name = input.name;
    if (typeof input.phone === "string" || input.phone === null) patch.phone = input.phone;
    if (typeof input.role === "string") patch.role = input.role;
    if (typeof input.email === "string") patch.email = input.email.toLowerCase();

    const { data, error } = await this.supabase
      .from("users")
      .update(patch)
      .eq("id", userId)
      .select("id,email,name,role,phone,created_at")
      .single();

    if (error) throw error;
    return data;
  }

  async createManualUser(input: { email: string; name?: string; phone?: string | null }): Promise<UserRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) return existing;

    const { data, error } = await this.supabase
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name: input.name?.trim() || normalizedEmail.split("@")[0] || "Cliente",
        role: "user",
        phone: input.phone?.trim() || null
      })
      .select("id,email,name,role,phone,created_at")
      .single();

    if (error) throw error;
    return data;
  }

  async linkAccountByEmail(authUserId: string, email: string) {
    const existing = await this.findByEmail(email);
    if (!existing) return null;

    if (existing.id === authUserId) {
      return existing;
    }

    const authProfile = await this.getById(authUserId);
    if (authProfile) {
      await this.supabase
        .from("users")
        .update({
          name: existing.name || authProfile.name,
          phone: existing.phone || authProfile.phone,
          role: authProfile.role
        })
        .eq("id", authUserId);
    }

    await this.supabase.from("orders").update({ user_id: authUserId }).eq("user_id", existing.id);
    await this.supabase.from("users").delete().eq("id", existing.id);

    return this.getById(authUserId);
  }
}
