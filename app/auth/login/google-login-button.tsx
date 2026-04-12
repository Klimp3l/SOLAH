"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleLoginButtonProps = {
  nextPath: string;
};

function normalizePublicUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (trimmed.startsWith("localhost")) return `http://${trimmed}`;
  return `https://${trimmed}`;
}

export function GoogleLoginButton({ nextPath }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectBase =
        normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
        normalizePublicUrl(process.env.NEXT_PUBLIC_VERCEL_URL) ??
        normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL) ??
        window.location.origin;
      const redirectTo = new URL("/auth/callback", redirectBase);
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
        {loading ? (
          "Redirecionando..."
        ) : (
          <>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
              <path
                d="M21.805 10.023h-9.589v3.955h5.498c-.236 1.27-.949 2.347-2.024 3.07v2.54h3.273c1.915-1.764 3.02-4.365 3.02-7.56 0-.668-.06-1.31-.178-1.965Z"
                fill="#4285F4"
              />
              <path
                d="M12.216 22c2.73 0 5.02-.905 6.694-2.412l-3.273-2.54c-.91.61-2.074.97-3.421.97-2.63 0-4.857-1.778-5.65-4.17H3.19v2.621A10.097 10.097 0 0 0 12.216 22Z"
                fill="#34A853"
              />
              <path
                d="M6.566 13.849a6.068 6.068 0 0 1-.316-1.85c0-.643.114-1.263.316-1.85V7.528H3.19A10.012 10.012 0 0 0 2 12c0 1.614.386 3.143 1.19 4.472l3.376-2.623Z"
                fill="#FBBC05"
              />
              <path
                d="M12.216 5.982c1.485 0 2.818.51 3.866 1.508l2.899-2.898C17.232 2.954 14.942 2 12.216 2A10.097 10.097 0 0 0 3.19 7.528l3.376 2.621c.793-2.392 3.02-4.167 5.65-4.167Z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </>
        )}
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
