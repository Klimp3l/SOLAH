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
    </div>
  );
}
