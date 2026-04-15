type BuildMailtoOptions = {
  subject?: string;
  body?: string;
};

export function buildMailtoLink(email: string, options: BuildMailtoOptions = {}): string {
  const normalizedEmail = email.trim();
  const query = new URLSearchParams();
  if (options.subject !== undefined) {
    query.set("subject", options.subject);
  }
  if (options.body !== undefined) {
    query.set("body", options.body);
  }

  const queryString = query.toString();
  if (!queryString) return `mailto:${normalizedEmail}`;
  return `mailto:${normalizedEmail}?${queryString}`;
}
