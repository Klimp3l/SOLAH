import Link from "next/link";
import { Box, ChevronRight, PackageCheck, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const quickLinks = [
  {
    title: "Produtos",
    description: "Cadastre novidades, ajuste preços e controle itens ativos.",
    href: "/admin/produtos",
    icon: Box
  },
  {
    title: "Pedidos",
    description: "Atualize status e rastreio com visão operacional centralizada.",
    href: "/admin/pedidos",
    icon: ShoppingBag
  }
];

export default function AdminHomePage() {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <Badge variant="secondary" className="w-fit">
          Visão geral
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Painel administrativo</h1>
        <p className="max-w-2xl text-muted-foreground">
          Experiência redesenhada para gestão de catálogo e pedidos com visual clean, foco em produtividade e feedback
          claro nas ações.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((item) => (
          <Card key={item.href}>
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2">
                <item.icon className="size-5 text-primary" />
                {item.title}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={item.href}>
                  Abrir {item.title.toLowerCase()}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="size-5 text-primary" />
            Próximo passo sugerido
          </CardTitle>
          <CardDescription>
            Comece por produtos para manter o catálogo atualizado e depois avance para a rotina de pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <Button asChild>
            <Link href="/admin/produtos">Gerenciar catálogo agora</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
