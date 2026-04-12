import { getRequestAuthContext } from "@/lib/auth/request-auth";
import { makeUserRepository } from "@/lib/factories/api-deps";
import { assertAdminAccess } from "@/lib/guards/auth.guard";
import { jsonError, jsonOk } from "@/lib/http";
import { createManualUserSchema } from "@/lib/schemas/user.schema";

export async function GET(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    const userRepository = makeUserRepository();
    await assertAdminAccess({ userId: auth.userId, userRepository });
    const users = await userRepository.listAll();
    return jsonOk({ data: users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthContext(request);
    const userRepository = makeUserRepository();
    await assertAdminAccess({ userId: auth.userId, userRepository });

    const payload = createManualUserSchema.parse(await request.json());
    const user = await userRepository.createManualUser(payload);
    return jsonOk({ data: user }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
