import type { CartItemInput } from "@/types/domain";

export type AuthenticatedUser = {
  id: string;
};

export type FinalizeIntent =
  | {
      action: "redirect_to_login";
      loginUrl: string;
    }
  | {
      action: "submit_order";
    };

export type OrderSuccessResponse = {
  data: {
    id: string;
  };
  meta?: {
    idempotent: boolean;
  };
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class OrderRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "OrderRequestError";
  }
}

function sanitizeNextPath(nextPath: string) {
  if (!nextPath.startsWith("/")) return "/checkout";
  return nextPath;
}

export function buildLoginUrl(nextPath: string) {
  const safeNextPath = sanitizeNextPath(nextPath);
  return `/auth/login?next=${encodeURIComponent(safeNextPath)}`;
}

export function resolveFinalizeIntent(user: AuthenticatedUser | null, nextPath: string): FinalizeIntent {
  if (!user?.id) {
    return {
      action: "redirect_to_login",
      loginUrl: buildLoginUrl(nextPath)
    };
  }

  return { action: "submit_order" };
}

export function createOrderPayload(
  items: CartItemInput[],
  phone: string,
  idempotencyKey = crypto.randomUUID()
) {
  return {
    idempotencyKey,
    phone,
    items
  };
}

export async function submitOrderRequest(
  fetchImpl: FetchLike,
  payload: ReturnType<typeof createOrderPayload>
): Promise<OrderSuccessResponse> {
  const response = await fetchImpl("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const body = (await response.json().catch(() => null)) as (OrderSuccessResponse & { message?: string }) | null;
  if (!response.ok) {
    throw new OrderRequestError(body?.message ?? "Não foi possível finalizar o pedido.", response.status);
  }

  if (!body?.data?.id) {
    throw new OrderRequestError("Resposta inválida ao finalizar pedido.", response.status);
  }

  return body;
}
