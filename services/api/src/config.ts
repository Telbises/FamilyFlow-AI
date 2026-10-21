export interface AppConfig {
  mode: "local" | "aws";
  region: string;
  tableName: string;
  idempotencyTableName: string;
  dynamoEndpoint?: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
  cognitoIssuer?: string;
  allowLocalDevAuth: boolean;
  localDevOwnerSub: string;
  corsOrigins: string[];
  featureFlags: {
    voice: boolean;
    ai: boolean;
    rewards: boolean;
    devicePairing: boolean;
  };
  bedrockEnabled: boolean;
  bedrockRegion: string;
  bedrockModelId: string;
  pairingTtlSeconds: number;
  pointsPerCompletion: number;
  auditRetentionDays: number;
  requestRetentionDays: number;
}

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    mode: env.FAMILYFLOW_MODE === "aws" ? "aws" : "local",
    region: env.AWS_REGION ?? "us-east-1",
    tableName: env.TABLE_NAME ?? "FamilyFlow",
    idempotencyTableName: env.IDEMPOTENCY_TABLE_NAME ?? "FamilyFlowIdempotency",
    dynamoEndpoint: env.DYNAMODB_ENDPOINT,
    cognitoUserPoolId: env.COGNITO_USER_POOL_ID,
    cognitoClientId: env.COGNITO_CLIENT_ID,
    cognitoIssuer: env.COGNITO_ISSUER,
    allowLocalDevAuth: bool(env.ALLOW_LOCAL_DEV_AUTH, env.FAMILYFLOW_MODE !== "aws"),
    localDevOwnerSub: env.LOCAL_DEV_OWNER_SUB ?? "local-parent-001",
    corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()),
    featureFlags: {
      voice: bool(env.FEATURE_VOICE, true),
      ai: bool(env.FEATURE_AI, true),
      rewards: bool(env.FEATURE_REWARDS, true),
      devicePairing: bool(env.FEATURE_DEVICE_PAIRING, true),
    },
    bedrockEnabled: bool(env.BEDROCK_ENABLED, false),
    bedrockRegion: env.BEDROCK_REGION ?? env.AWS_REGION ?? "us-east-1",
    bedrockModelId: env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0",
    pairingTtlSeconds: Number(env.PAIRING_CODE_TTL_SECONDS ?? 600),
    pointsPerCompletion: Number(env.POINTS_PER_COMPLETION ?? 10),
    auditRetentionDays: Number(env.AUDIT_RETENTION_DAYS ?? 365),
    requestRetentionDays: Number(env.REQUEST_RETENTION_DAYS ?? 180),
  };
}
