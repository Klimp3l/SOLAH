"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleLoginButtonProps = {
  nextPath: string;
};

export function GoogleLoginButton({ nextPath }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() }
      });

      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao iniciar login com Google.";
      setErrorMessage(message);
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button type="button" onClick={() => void handleGoogleLogin()} disabled={loading} size="lg" className="w-full">
        {loading ? "Redirecionando..." : "Entrar com Google"}
      </Button>
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível iniciar o login</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
