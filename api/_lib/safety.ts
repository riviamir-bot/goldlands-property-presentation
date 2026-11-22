/** A key pasted into a settings form can pick up line breaks or spaces; none are ever valid inside one. */
export function cleanSecret(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, "");
}

const SECRET_PATTERNS = [
  /sb_(?:secret|publishable)_[\s\S]*?(?=["'\s]*(?:is an|$))/g,
  /eyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){0,2}/g,
];

/** Error text that is safe to write to a server log: key material is replaced before it is logged. */
export function describeErrorForLog(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";

  let message = error.message;
  if (/sb_secret_|invalid header value/i.test(message)) {
    // Header errors echo the header value, which is the key itself.
    message = "[redacted: the message contained key material]";
  }
  for (const pattern of SECRET_PATTERNS) message = message.replace(pattern, "[redacted]");

  return `${error.name}: ${message}`;
}
