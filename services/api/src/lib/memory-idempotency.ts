export class MemoryIdempotencyStore {
  private map = new Map<string, unknown>();

  async get<T>(householdId: string, key: string): Promise<T | null> {
    return (this.map.get(`${householdId}:${key}`) as T) ?? null;
  }

  async put(householdId: string, key: string, response: unknown): Promise<void> {
    const k = `${householdId}:${key}`;
    if (this.map.has(k)) throw new Error("idempotency exists");
    this.map.set(k, response);
  }
}
