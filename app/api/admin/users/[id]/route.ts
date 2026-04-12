import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { updateUserSchema } from "@/lib/schemas/user.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getRequestAuthContext(request);
    const userRepository = makeUserRepository();
    await assertAdminAccess({ userId: auth.userId, userRepository });

    const { id } = await context.params;
    const payload = updateUserSchema.parse(await request.json());
    const user = await userRepository.updateUser(id, payload);

    return jsonOk({ data: user });
  } catch (error) {
    return jsonError(error);
  }
}
