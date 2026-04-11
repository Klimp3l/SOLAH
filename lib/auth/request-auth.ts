import { UnauthorizedError } from "@/lib/errors";

export type RequestAuthContext = {
  userId: string;
};

export function getRequestAuthContext(request: Request): RequestAuthContext {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    throw new UnauthorizedError("Header x-user-id é obrigatório nesta fase backend-first.");
  }

  return { userId };
}
