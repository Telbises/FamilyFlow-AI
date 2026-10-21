/**
 * Local Alexa intent simulator — alternative test route when Developer Console
 * account linking cannot be completed. Calls the real FamilyFlow API.
 *
 * Usage:
 *   FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 pnpm --filter @familyflow/alexa simulate:local RequestAdventure
 */
import { handler } from "./handlers.js";

const intentName = process.argv[2] ?? "LaunchFamilyFlow";
const token = process.env.FAMILYFLOW_ALEXA_TOKEN ?? "local:local-parent-001";

const event = {
  version: "1.0",
  session: {
    new: true,
    sessionId: "local-session",
    application: { applicationId: "amzn1.ask.skill.familyflow.local" },
    user: { userId: "local-user", accessToken: token },
  },
  context: {
    System: {
      application: { applicationId: "amzn1.ask.skill.familyflow.local" },
      user: { userId: "local-user", accessToken: token },
      device: { deviceId: "local-device", supportedInterfaces: {} },
      apiEndpoint: "https://api.amazonalexa.com",
    },
  },
  request:
    intentName === "LaunchRequest"
      ? { type: "LaunchRequest", requestId: "req-1", timestamp: new Date().toISOString(), locale: "en-US" }
      : {
          type: "IntentRequest",
          requestId: "req-1",
          timestamp: new Date().toISOString(),
          locale: "en-US",
          intent: { name: intentName, confirmationStatus: "NONE", slots: {} },
        },
};

const result = await handler(event, {});
console.log(JSON.stringify(result, null, 2));
