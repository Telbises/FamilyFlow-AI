import { loadConfig, type AppConfig } from "./config.js";
import { createDocClient } from "./lib/dynamo.js";
import { IdempotencyStore } from "./lib/idempotency.js";
import { MemoryIdempotencyStore } from "./lib/memory-idempotency.js";
import { MemoryFamilyFlowRepository } from "./lib/memory-repository.js";
import { FamilyFlowRepository } from "./lib/repository.js";
import { FamilyFlowService } from "./services/familyflow-service.js";

export function createApp(config: AppConfig = loadConfig()) {
  const store = process.env.FAMILYFLOW_STORE ?? (config.dynamoEndpoint ? "dynamodb" : "memory");

  if (store === "memory") {
    const repo = new MemoryFamilyFlowRepository() as unknown as FamilyFlowRepository;
    const idem = new MemoryIdempotencyStore() as unknown as IdempotencyStore;
    const service = new FamilyFlowService(repo, idem, config);
    return { config, doc: null, repo, idem, service, store: "memory" as const };
  }

  const doc = createDocClient(config);
  const repo = new FamilyFlowRepository(doc, config.tableName);
  const idem = new IdempotencyStore(doc, config.tableName, true);
  const service = new FamilyFlowService(repo, idem, config);
  return { config, doc, repo, idem, service, store: "dynamodb" as const };
}
