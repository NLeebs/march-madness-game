export function delay(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay * 1000));
}
