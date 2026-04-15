"use client";

import { useRef } from "react";
import { Loader2, Mail, MessageCircle, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageChannel = "whatsapp" | "email";

type MessageComposerDialogProps = {
  open: boolean;
  channel: MessageChannel;
  recipient: string;
  defaultMessage?: string;
  loading?: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: (message: string) => void;
};

export function MessageComposerDialog({
  open,
  channel,
  recipient,
  defaultMessage = "",
  loading = false,
  title,
  description,
  onClose,
  onConfirm
}: MessageComposerDialogProps) {
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  if (!open) return null;

  const channelLabel = channel === "whatsapp" ? "WhatsApp" : "E-mail";
  const resolvedTitle = title ?? `Enviar mensagem por ${channelLabel}`;
  const resolvedDescription = description ?? `Revise ou edite a mensagem antes de abrir ${channelLabel}.`;

  return (
    <div className="fixed inset-0 z-[60] flex h-dvh w-screen items-start justify-center overflow-hidden bg-black/60 p-0 sm:items-center sm:overflow-y-auto sm:p-4">
      <div className="h-dvh w-screen overflow-y-auto rounded-none border-0 bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:rounded-xl sm:border">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold">{resolvedTitle}</h2>
            <p className="text-sm text-muted-foreground">{resolvedDescription}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-4 sm:p-6">
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">Destino</p>
            <p className="break-all text-sm font-medium">{recipient}</p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="contact-message" className="text-sm font-medium">
              Mensagem
            </label>
            <Textarea
              id="contact-message"
              ref={messageRef}
              key={`${channel}-${recipient}-${defaultMessage}`}
              defaultValue={defaultMessage}
              placeholder="Digite sua mensagem..."
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onConfirm(messageRef.current?.value ?? "")} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {channel === "whatsapp" ? <MessageCircle className="size-4" /> : <Mail className="size-4" />}
              {channel === "whatsapp" ? "Abrir WhatsApp" : "Abrir E-mail"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
