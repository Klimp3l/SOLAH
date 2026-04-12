import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { OrderItemSnapshot, OrderStatus } from "@/types/domain";

export class OrderRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listAll() {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at,users(email,name,phone)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async listByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(
        "id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at,order_items(quantity,price,products(name),product_variants(id,product_colors(name),sizes(name)))"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findByUserAndIdempotencyKey(userId: string, idempotencyKey: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createWithItems(input: {
    userId: string;
    idempotencyKey: string;
    total: number;
    status: OrderStatus;
    items: OrderItemSnapshot[];
  }) {
    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .insert({
        user_id: input.userId,
        total: input.total,
        status: input.status,
        idempotency_key: input.idempotencyKey
      })
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .single();

    if (orderError) throw orderError;

    const orderItems = input.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await this.supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const { data, error } = await this.supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Pedido não encontrado");
    return data;
  }

  async updateTracking(orderId: string, trackingCode: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .update({ tracking_code: trackingCode, status: "enviado" })
      .eq("id", orderId)
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Pedido não encontrado");
    return data;
  }

  async updatePaymentProof(orderId: string, paymentProofPath: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .update({ payment_proof_url: paymentProofPath, status: "aguardando_comprovante" })
      .eq("id", orderId)
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Pedido não encontrado");
    return data;
  }

  async getById(orderId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getByIdForUser(orderId: string, userId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,user_id,total,status,tracking_code,payment_proof_url,idempotency_key,created_at")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
