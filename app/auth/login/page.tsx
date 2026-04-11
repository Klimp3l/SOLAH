import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 px-4 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <Card className="order-2 lg:order-1">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              Acesso administrativo
            </Badge>
            <CardTitle className="text-3xl">Painel SOLAH</CardTitle>
            <CardDescription className="text-base">
              Gestão de catálogo e pedidos com uma experiência clean, rápida e orientada à operação.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Interface otimizada para o fluxo diário de time comercial.
            </p>
            <p className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              Proteção por login Google e autorização por perfil.
            </p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/">Voltar para a home</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2">
          <CardHeader>
            <CardTitle>Entrar com Google</CardTitle>
            <CardDescription>Use uma conta autorizada para acessar o painel administrativo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {reason === "forbidden" && (
              <Alert variant="destructive">
                <AlertTitle>Acesso negado</AlertTitle>
                <AlertDescription>Seu usuário não possui perfil de administrador.</AlertDescription>
              </Alert>
            )}
            <GoogleLoginButton nextPath={nextPath} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
