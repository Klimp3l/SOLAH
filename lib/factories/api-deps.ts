import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { OrderRepository } from "@/lib/repositories/order.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { ProductService } from "@/lib/services/product.service";
import { OrderService } from "@/lib/services/order.service";

export function makeProductService() {
  const supabase = createSupabaseAdminClient();
  const productRepository = new ProductRepository(supabase);
  return new ProductService(productRepository);
}

export function makeOrderService() {
  const supabase = createSupabaseAdminClient();
  const productRepository = new ProductRepository(supabase);
  const orderRepository = new OrderRepository(supabase);
  const userRepository = new UserRepository(supabase);
  return new OrderService({ orderRepository, productRepository, userRepository });
}

export function makeUserRepository() {
  const supabase = createSupabaseAdminClient();
  return new UserRepository(supabase);
}
