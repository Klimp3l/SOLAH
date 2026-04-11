import { ForbiddenError } from "@/lib/errors";
import type { UserRepository } from "@/lib/repositories/user.repository";

export async function assertAdminAccess(input: {
  userId: string;
  userRepository: UserRepository;
}) {
  const role = await input.userRepository.getRoleByUserId(input.userId);
  if (role !== "admin") {
    throw new ForbiddenError("Apenas administradores podem executar esta operação.");
  }
}
