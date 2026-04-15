"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  redirectTo?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function LogoutButton({ redirectTo = "/", variant = "outline", size = "sm", className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={() => void handleLogout()} disabled={loading} className={className}>
      <LogOut className="size-4" />
      Sair
    </Button>
  );
}
