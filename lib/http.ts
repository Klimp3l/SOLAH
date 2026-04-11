import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        message: "Entrada inválida",
        details: error.flatten()
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.statusCode }
    );
  }

  return Response.json(
    { error: "INTERNAL_ERROR", message: "Erro interno no servidor" },
    { status: 500 }
  );
}
