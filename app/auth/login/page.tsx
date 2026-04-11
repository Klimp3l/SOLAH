import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleLoginButton } from "./google-login-button";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeNextPath(next: string | undefined) {
  if (!next) return "/admin";
  return next.startsWith("/") ? next : "/admin";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(getSingleParam(params.next));
  const reason = getSingleParam(params.reason);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-secondary/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Entrar com Google</CardTitle>
            <CardDescription>Para finalizar seu pedido por favor faça login com sua conta Google.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <GoogleLoginButton nextPath={nextPath} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
