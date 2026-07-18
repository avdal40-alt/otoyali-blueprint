import { t } from "@/i18n/get-dictionary";
import { createAssistantAction } from "../domain/actions";
import { getAiIntent } from "../domain/intents";
import { getDefaultWarnings } from "../domain/safety";
import type { AiAction, AiChecklistItem, AiIntentId, AiProviderId, AiRequest, AiResponse } from "../domain/types";
import type { AiProvider } from "./provider";

const providerId: AiProviderId = "local";

export const localDeterministicAiProvider: AiProvider = {
  id: providerId,
  isAvailable() {
    return true;
  },
  getCapabilities() {
    return ["assistant_chat", "trust_guidance", "publishing_assistance"];
  },
  async generate(request) {
    const startedAt = Date.now();
    const intent = getAiIntent(request.intent);
    const response = buildDeterministicResponse(request);

    return {
      requestId: request.requestId,
      status: response.status,
      message: response.message,
      structuredData: response.structuredData,
      suggestions: response.suggestions,
      actions: response.actions,
      warnings: response.warnings ?? getDefaultWarnings(response.status),
      confidence: intent.availability === "local_preview" ? 0.72 : 0.35,
      provider: providerId,
      latencyMs: Math.max(Date.now() - startedAt, 0)
    };
  }
};

type LocalResponseShape = Pick<AiResponse, "status" | "message" | "structuredData" | "suggestions" | "actions" | "warnings">;

function buildDeterministicResponse(request: AiRequest): LocalResponseShape {
  const normalizedText = request.userMessage.toLocaleLowerCase(request.locale === "tr" ? "tr-TR" : "en-US");
  const inferredIntent = request.intent === "unsupported" ? inferIntentFromMessage(normalizedText) : request.intent;

  if (request.surface === "service_marketplace" || request.surface === "service_provider") {
    return serviceGuidance(request);
  }

  if (request.vertical !== "cars" && inferredIntent !== "general_help" && inferredIntent !== "trust_and_safety") {
    return {
      status: "unsupported",
      message: t(request.locale, "ai.responses.verticalComingSoon"),
      actions: compactActions([createAssistantAction("open_search", t(request.locale, "ai.actions.openCars"), "/search", request.locale)]),
      warnings: ["feature_not_connected", "informational_only"]
    };
  }

  switch (inferredIntent) {
    case "search_vehicles":
      return searchGuidance(request);
    case "explain_listing":
    case "interpret_price":
    case "compare_vehicles":
      return listingGuidance(request);
    case "publishing_help":
    case "improve_listing":
      return publishingGuidance(request);
    case "trust_and_safety":
      return trustGuidance(request);
    case "ownership_guidance":
      return {
        status: "unsupported",
        message: t(request.locale, "ai.responses.ownershipPlanned"),
        warnings: ["feature_not_connected", "informational_only"]
      };
    case "general_help":
    default:
      return introResponse(request);
  }
}

function serviceGuidance(request: AiRequest): LocalResponseShape {
  const categories =
    request.locale === "tr"
      ? ["Ekspertiz", "Periyodik bakım", "Arıza tespit", "Lastik", "Kaporta/boya", "Elektrikli araç servisi"]
      : ["Inspection", "Scheduled maintenance", "Diagnostics", "Tires", "Body/paint", "EV service"];
  const unavailableFeatures =
    request.locale === "tr"
      ? ["Randevu oluşturma", "Müsaitlik kontrolü", "Fiyat garantisi", "Servis sonucu doğrulaması"]
      : ["Booking creation", "Availability checks", "Price guarantees", "Service-outcome verification"];

  return {
    status: "success",
    message: t(request.locale, "ai.responses.serviceGuidance"),
    structuredData: [
      {
        type: "service_guidance",
        categories,
        unavailableFeatures
      }
    ],
    actions: compactActions([
      createAssistantAction("navigate", t(request.locale, "ai.actions.openServices"), "/servisler", request.locale),
      createAssistantAction("navigate", t(request.locale, "ai.actions.joinServiceNetwork"), "/servisler/basvuru", request.locale),
      createAssistantAction("open_trust_center", t(request.locale, "ai.actions.openTrustCenter"), "/trust", request.locale)
    ]),
    warnings: ["informational_only", "feature_not_connected", "verify_independently"]
  };
}

function introResponse(request: AiRequest): LocalResponseShape {
  return {
    status: "success",
    message: t(request.locale, "ai.responses.intro"),
    structuredData: [
      {
        type: "assistant_intro",
        capabilities: ["assistant_chat", "trust_guidance", "publishing_assistance"]
      }
    ],
    actions: [
      createAssistantAction("open_search", t(request.locale, "ai.actions.openSearch"), "/search", request.locale),
      createAssistantAction("open_trust_center", t(request.locale, "ai.actions.openTrustCenter"), "/trust", request.locale)
    ].filter((action): action is NonNullable<typeof action> => Boolean(action)),
    warnings: ["informational_only", "feature_not_connected"]
  };
}

function searchGuidance(request: AiRequest): LocalResponseShape {
  const filters =
    request.locale === "tr"
      ? ["Marka ve model", "Şehir", "Fiyat aralığı", "Yıl ve kilometre", "Yakıt tipi ve vites"]
      : ["Make and model", "City", "Price range", "Year and mileage", "Fuel type and transmission"];

  return {
    status: "success",
    message: t(request.locale, "ai.responses.searchGuidance"),
    structuredData: [{ type: "search_guidance", filters }],
    actions: [createAssistantAction("open_search", t(request.locale, "ai.actions.openSearch"), "/search?advanced=1", request.locale)].filter(
      (action): action is NonNullable<typeof action> => Boolean(action)
    ),
    warnings: ["informational_only", "feature_not_connected"]
  };
}

function listingGuidance(request: AiRequest): LocalResponseShape {
  return {
    status: "success",
    message: request.context.listing?.listingId
      ? t(request.locale, "ai.responses.listingGuidanceWithContext")
      : t(request.locale, "ai.responses.listingGuidance"),
    structuredData: [
      {
        type: "trust_checklist",
        items: trustChecklist(request.locale)
      }
    ],
    actions: [createAssistantAction("open_trust_center", t(request.locale, "ai.actions.openTrustCenter"), "/trust", request.locale)].filter(
      (action): action is NonNullable<typeof action> => Boolean(action)
    ),
    warnings: ["informational_only", "verify_independently", "incomplete_data", "feature_not_connected"]
  };
}

function publishingGuidance(request: AiRequest): LocalResponseShape {
  return {
    status: "success",
    message: t(request.locale, "ai.responses.publishingGuidance"),
    structuredData: [
      {
        type: "publishing_checklist",
        items: publishingChecklist(request.locale)
      }
    ],
    actions: [createAssistantAction("open_sell", t(request.locale, "ai.actions.openSell"), "/sell", request.locale)].filter(
      (action): action is NonNullable<typeof action> => Boolean(action)
    ),
    warnings: ["informational_only", "verify_independently"]
  };
}

function trustGuidance(request: AiRequest): LocalResponseShape {
  return {
    status: "success",
    message: t(request.locale, "ai.responses.trustGuidance"),
    structuredData: [
      {
        type: "trust_checklist",
        items: trustChecklist(request.locale)
      }
    ],
    actions: [createAssistantAction("open_trust_center", t(request.locale, "ai.actions.openTrustCenter"), "/trust", request.locale)].filter(
      (action): action is NonNullable<typeof action> => Boolean(action)
    ),
    warnings: ["informational_only", "verify_independently"]
  };
}

function publishingChecklist(locale: AiRequest["locale"]): AiChecklistItem[] {
  const items =
    locale === "tr"
      ? ["Net ve güncel fotoğraflar ekleyin", "Araç bilgilerini doğru girin", "Açıklamayı açık ve dürüst yazın", "Hasar/geçmiş bilgilerini saklamayın", "Fiyatı benzer ilanlarla karşılaştırarak belirleyin"]
      : ["Add clear and recent photos", "Enter vehicle details accurately", "Write a clear and honest description", "Do not hide damage or history details", "Set the price by reviewing comparable listings"];

  return items.map((label, index) => ({ id: `publish_${index + 1}`, label, status: "guidance" }));
}

function trustChecklist(locale: AiRequest["locale"]): AiChecklistItem[] {
  const items =
    locale === "tr"
      ? ["Araç ve ruhsat bilgilerini karşılaştırın", "Ekspertiz veya bağımsız kontrol yaptırın", "Satıcı bilgilerini görüşme öncesi doğrulayın", "Bilinmeyen kişilere kapora göndermeyin", "Hasar, sigorta ve borç durumunu bağımsız kaynaklardan kontrol edin"]
      : ["Compare the vehicle and registration details", "Use an inspection or independent check", "Verify seller information before meeting", "Do not send deposits to unknown people", "Check damage, insurance and lien status through independent sources"];

  return items.map((label, index) => ({ id: `trust_${index + 1}`, label, status: "guidance" }));
}

function inferIntentFromMessage(text: string): AiIntentId {
  if (containsAny(text, ["filtre", "arama", "search", "filter", "bul", "find"])) return "search_vehicles";
  if (containsAny(text, ["ilan", "listing", "değerlendir", "review", "açıkla", "explain"])) return "explain_listing";
  if (containsAny(text, ["yayın", "hazırla", "publish", "sell", "description", "açıklama"])) return "publishing_help";
  if (containsAny(text, ["güven", "trust", "kapora", "belge", "document", "safety", "safe"])) return "trust_and_safety";
  if (containsAny(text, ["fiyat", "price", "piyasa", "valuation"])) return "interpret_price";
  return "general_help";
}

function containsAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function compactActions(actions: Array<AiAction | null>): AiAction[] {
  return actions.filter((action): action is AiAction => Boolean(action));
}
