export function reportLovableError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Lovable Error Reporting]", error, context);
  }
}
