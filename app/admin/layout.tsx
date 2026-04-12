import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { makeUserRepository } from "@/lib/factories/api-deps";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNavLinks } from "./nav-links";
import { LogoutButton } from "./logout-button";

type AdminLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" }
];

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    redirect("/auth/login?next=/admin");
  }

  const user = data.user;
  if (!user) {
    redirect("/auth/login?next=/admin");
  }

  const role = await makeUserRepository().getRoleByUserId(user.id);
  if (role !== "admin") {
    redirect("/auth/login?next=/admin&reason=forbidden");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold tracking-wide">SOLAH Admin</p>
            <Badge variant="secondary">Seguro</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
            <Link
              href="/"
              className="rounded-md border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              Ver loja
            </Link>
            <span className="max-w-[180px] truncate md:max-w-none">{user.email ?? user.id}</span>
            <Separator orientation="vertical" className="hidden h-5 md:block" />
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-6">
          <AdminNavLinks items={navItems} />
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">{children}</section>
    </main>
  );
}
