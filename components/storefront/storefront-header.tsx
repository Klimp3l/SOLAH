"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, MessageCircle, PackageCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

type StorefrontHeaderView = "catalogo" | "checkout" | "pedidos";

type AuthMeResponse = {
  data: {
    id: string;
    role?: UserRole | null;
  } | null;
};

type StorefrontHeaderProps = {
  activeView: StorefrontHeaderView;
};

export function StorefrontHeader({ activeView }: StorefrontHeaderProps) {
  const [authRole, setAuthRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAuthRole() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include"
        });
        const body = (await response.json().catch(() => null)) as AuthMeResponse | null;
        if (!active) return;

        if (!response.ok || !body?.data?.id) {
          setAuthRole(null);
          return;
        }

        setAuthRole(body.data.role ?? null);
      } catch {
        if (!active) return;
        setAuthRole(null);
      }
    }

    void loadAuthRole();

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <Link href="/" className="mx-auto block w-fit md:absolute md:left-6 md:top-1/2 md:z-10 md:-translate-y-1/2">
        <Image
          src="/images/logo.png"
          alt="Logo SOLAH"
          width={56}
          height={56}
          className="rounded-sm object-contain"
          style={{ width: "auto", height: "auto" }}
        />
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-3 md:px-6 md:py-4">
        <nav className="flex w-full min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap md:flex-1 md:pl-16">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
              activeView === "catalogo"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <ShoppingBag className="size-4" />
            Catálogo
          </Link>
          <Link
            href="/checkout"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
              activeView === "checkout"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <CreditCard className="size-4" />
            Checkout
          </Link>
          <Link
            href="/meus-pedidos"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
              activeView === "pedidos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <PackageCheck className="size-4" />
            Meus pedidos
          </Link>
          <Link
            href="/#contato"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            Contato
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
          {authRole === "admin" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Acessar admin</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
