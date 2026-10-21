import * as Alexa from "ask-sdk-core";
import type { HandlerInput, RequestHandler } from "ask-sdk-core";

const API_BASE = process.env.FAMILYFLOW_API_BASE_URL ?? "http://127.0.0.1:3100";

/**
 * Account linking / identity:
 * Production: Alexa account linking to Cognito (OAuth) so accessToken maps to parent household.
 * Simulator limitation: Alexa Developer Console may not complete full Cognito account linking
 * in all environments. Local simulator uses FAMILYFLOW_ALEXA_TOKEN (Bearer local:...) as a
 * real alternative test route — not production-ready.
 */
async function api(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `API ${res.status}`);
  }
  return data;
}

function tokenFrom(handlerInput: HandlerInput): string | null {
  const access =
    handlerInput.requestEnvelope.context?.System?.user?.accessToken ??
    process.env.FAMILYFLOW_ALEXA_TOKEN ??
    null;
  return access;
}

function requireToken(handlerInput: HandlerInput): string {
  const token = tokenFrom(handlerInput);
  if (!token) {
    throw new Error(
      "Household not linked. A parent must link FamilyFlow in the Alexa app. Spoken names are never used as authentication.",
    );
  }
  return token;
}

const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest" ||
      (Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === "LaunchFamilyFlow")
    );
  },
  handle(handlerInput) {
    const speech =
      "Welcome to FamilyFlow. I can suggest adventures, request one for parent approval, or check mission status. I only know FamilyFlow activity — not other Alexa chats.";
    return handlerInput.responseBuilder.speak(speech).reprompt("What would you like to do?").getResponse();
  },
};

const SuggestAdventureHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "SuggestAdventure"
    );
  },
  async handle(handlerInput) {
    try {
      const token = requireToken(handlerInput);
      const data = await api("/missions", token);
      const mission = (data.missions ?? []).find((m: { status: string }) => m.status === "available");
      if (!mission) {
        return handlerInput.responseBuilder
          .speak("I do not see an available adventure yet. Ask a parent to generate one in FamilyFlow.")
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak(
          `How about ${mission.title}? It takes about ${mission.estimatedMinutes} minutes. Say request the adventure if you want a parent to approve it.`,
        )
        .reprompt("Say request the adventure, or ask for another suggestion.")
        .withSessionAttributes({ suggestedMissionId: mission.id, suggestedTitle: mission.title })
        .getResponse();
    } catch (e) {
      return handlerInput.responseBuilder.speak(String((e as Error).message)).getResponse();
    }
  },
};

const RequestAdventureHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "RequestAdventure"
    );
  },
  async handle(handlerInput) {
    try {
      const token = requireToken(handlerInput);
      const attrs = handlerInput.attributesManager.getSessionAttributes();
      const household = await api("/households/current", token);
      const child = (household.members ?? []).find(
        (m: { role: string; active: boolean }) => m.role === "child" && m.active,
      );
      if (!child) {
        return handlerInput.responseBuilder
          .speak("A parent needs to add a child profile in FamilyFlow first.")
          .getResponse();
      }
      let missionId = attrs.suggestedMissionId as string | undefined;
      if (!missionId) {
        const data = await api("/missions", token);
        missionId = (data.missions ?? []).find((m: { status: string }) => m.status === "available")?.id;
      }
      if (!missionId) {
        return handlerInput.responseBuilder.speak("I could not find a mission to request.").getResponse();
      }
      await api(`/missions/${missionId}/request`, token, {
        method: "POST",
        body: JSON.stringify({
          memberId: child.id,
          source: "alexa",
          idempotencyKey: `alexa-${missionId}-${Date.now()}`,
        }),
      });
      return handlerInput.responseBuilder
        .speak(
          "I sent the adventure request to FamilyFlow. A parent must approve it in the dashboard before it is active. I cannot approve it by voice.",
        )
        .getResponse();
    } catch (e) {
      return handlerInput.responseBuilder.speak(String((e as Error).message)).getResponse();
    }
  },
};

const CheckMissionStatusHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "CheckMissionStatus"
    );
  },
  async handle(handlerInput) {
    try {
      const token = requireToken(handlerInput);
      const data = await api("/missions", token);
      const active = (data.missions ?? []).find((m: { status: string }) =>
        ["requested", "approved", "in_progress", "completion_requested"].includes(m.status),
      );
      if (!active) {
        return handlerInput.responseBuilder
          .speak("No active FamilyFlow mission right now. You can ask me to suggest an adventure.")
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak(`${active.title} is currently ${active.status.replaceAll("_", " ")}.`)
        .getResponse();
    } catch (e) {
      return handlerInput.responseBuilder.speak(String((e as Error).message)).getResponse();
    }
  },
};

const HelpHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      ["FamilyHelp", "AMAZON.HelpIntent"].includes(Alexa.getIntentName(handlerInput.requestEnvelope))
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        "FamilyFlow helps your family pick adventures. Parents approve requests in the FamilyFlow app. I only see FamilyFlow activity, not other Alexa conversations. Try: suggest an adventure, or check mission status.",
      )
      .reprompt("What would you like to try?")
      .getResponse();
  },
};

const CancelStopHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(
        Alexa.getIntentName(handlerInput.requestEnvelope),
      )
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak("Okay. See you for the next adventure.").getResponse();
  },
};

const SessionEndedHandler: RequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "SessionEndedRequest";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error) {
    console.error(JSON.stringify({ level: "error", message: error.message }));
    return handlerInput.responseBuilder
      .speak("Sorry, something went wrong in FamilyFlow. Please try again.")
      .getResponse();
  },
};

export const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    SuggestAdventureHandler,
    RequestAdventureHandler,
    CheckMissionStatusHandler,
    HelpHandler,
    CancelStopHandler,
    SessionEndedHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .create();

export const handler = async (event: unknown, context: unknown) => skill.invoke(event as never, context as never);
