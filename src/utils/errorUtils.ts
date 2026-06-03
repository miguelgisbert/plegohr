export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Network request failed')) {
      return true;
    }
  }
  return false;
}

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function getErrorMessage(
  error: unknown,
  t: TFunction,
  networkErrorKey: string,
  fallbackKey: string,
): string {
  if (isNetworkError(error)) {
    return t(networkErrorKey);
  }
  if (error instanceof Error && error.message) {
    return t(fallbackKey, { message: error.message });
  }
  return t(fallbackKey);
}
