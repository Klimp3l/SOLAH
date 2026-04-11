type LogPayload = Record<string, unknown>;

export const logger = {
  info(message: string, payload?: LogPayload): void {
    console.info(JSON.stringify({ level: "info", message, payload }));
  },
  warn(message: string, payload?: LogPayload): void {
    console.warn(JSON.stringify({ level: "warn", message, payload }));
  },
  error(message: string, payload?: LogPayload): void {
    console.error(JSON.stringify({ level: "error", message, payload }));
  }
};
