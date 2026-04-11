import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40 px-4 py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8">
        <section className="grid gap-6 rounded-3xl border bg-card/70 p-8 shadow-sm md:p-12">
          <Badge variant="secondary" className="w-fit">
            Nova experiência SOLAH
          </Badge>
          <div className="grid gap-4">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Moda praia com gestão elegante, leve e pronta para escalar.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Uma interface clean para operação diária, com login seguro, catálogo organizado e fluxo de pedidos
              centralizado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/login?next=/admin">
                Acessar admin
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/admin">Abrir dashboard</Link>
            </Button>
          </div>
        </section>

        <Separator />

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                Curadoria visual
              </CardTitle>
              <CardDescription>Design minimalista para navegação rápida e foco no que importa.</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Acesso protegido
              </CardTitle>
              <CardDescription>Login com Google e controle por role para o painel administrativo.</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutDashboard className="size-4 text-primary" />
                Fluxo operacional
              </CardTitle>
              <CardDescription>Produtos e pedidos com ações rápidas e feedback claro para o time.</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>API ativa</CardTitle>
            <CardDescription>
              Endpoints continuam disponíveis em <code>/app/api</code> para as integrações backend-first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/auth/login?next=/admin">Entrar com Google</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
