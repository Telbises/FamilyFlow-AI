import { GetCommand, PutCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Idempotency records for Alexa/TV mutating requests.
 * Stored in a dedicated table (or same table with IDEM# keys in local single-table mode).
 */
export class IdempotencyStore {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly useMainTable: boolean,
  ) {}

  private key(householdId: string, key: string) {
    if (this.useMainTable) {
      return { PK: `HOUSEHOLD#${householdId}`, SK: `IDEM#${key}` };
    }
    return { PK: `${householdId}#${key}`, SK: "META" };
  }

  async get<T>(householdId: string, key: string): Promise<T | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: this.key(householdId, key),
      }),
    );
    return (res.Item?.response as T | undefined) ?? null;
  }

  async put(householdId: string, key: string, response: unknown, ttlSeconds = 86400): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          ...this.key(householdId, key),
          response,
          expiresAt,
          entityType: "Idempotency",
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }
}
