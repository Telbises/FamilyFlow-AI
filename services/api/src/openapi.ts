/** Minimal OpenAPI 3 document for FamilyFlow HTTP API. */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "FamilyFlow AI API",
    version: "0.1.0",
    description:
      "Household-scoped family coordination API. Parent visibility applies to FamilyFlow activity only.",
  },
  servers: [{ url: "/", description: "Current host" }],
  paths: {
    "/health": { get: { summary: "Health", responses: { "200": { description: "OK" } } } },
    "/households": {
      post: {
        summary: "Create household for authenticated parent",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/households/current": {
      get: {
        summary: "Get current household",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/members": {
      post: {
        summary: "Add member",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/devices/pairing-code": {
      post: {
        summary: "Create short-lived TV pairing code (hashed at rest)",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/devices/pair": {
      post: {
        summary: "Pair TV using code",
        responses: { "200": { description: "Paired" } },
      },
    },
    "/missions": {
      get: {
        summary: "List missions",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/missions/generate": {
      post: {
        summary: "Generate adventure (Bedrock or curated fallback)",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/missions/{id}/request": {
      post: {
        summary: "Child/TV/Alexa request mission (pending parent approval)",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/approvals": {
      get: {
        summary: "List pending approvals",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/approvals/{id}/decision": {
      post: {
        summary: "Approve or reject mission request",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/missions/{id}/complete-request": {
      post: {
        summary: "Request completion confirmation",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/completions/{id}/decision": {
      post: {
        summary: "Parent verifies completion; awards points once",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/rewards": {
      get: {
        summary: "List non-purchasable rewards",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/audit-events": {
      get: {
        summary: "FamilyFlow activity timeline",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/settings": {
      get: {
        summary: "Settings and privacy disclosure",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
      patch: {
        summary: "Update feature flags / controls",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/data/export": {
      post: {
        summary: "Export household FamilyFlow data",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/data/delete-request": {
      post: {
        summary: "Delete household FamilyFlow data",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
} as const;
