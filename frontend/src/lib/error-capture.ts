let lastCapturedError: Error | null = null;

export function captureError(error: Error): void {
  lastCapturedError = error;
}

export function consumeLastCapturedError(): Error | null {
  const error = lastCapturedError;
  lastCapturedError = null;
  return error;
}
