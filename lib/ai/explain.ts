import OpenAI from "openai";
import type { RankedFareOffer } from "../fares/types";
import type { PricePrediction } from "../prediction/types";

export interface ExplanationInput {
  bestOffer: RankedFareOffer;
  prediction: PricePrediction;
}

function fallbackExplanation({ bestOffer, prediction }: ExplanationInput) {
  const action = prediction.recommendation === "buy_now" ? "buy now" : prediction.recommendation === "wait" ? "wait" : "watch closely";
  return `I would ${action}. The best fare is $${bestOffer.price}, compared with an expected range of $${prediction.expectedLow}-$${prediction.expectedHigh}. Confidence is ${prediction.confidence}%, and the strongest signal is: ${prediction.rationale[0]}`;
}

export async function explainRecommendation(input: ExplanationInput) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackExplanation(input);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are an airfare prediction assistant. Be concise, practical, and transparent about uncertainty. Do not invent facts beyond the provided data.",
        },
        {
          role: "user",
          content: JSON.stringify({
            bestOffer: input.bestOffer,
            prediction: input.prediction,
          }),
        },
      ],
    });

    return response.choices[0]?.message.content?.trim() || fallbackExplanation(input);
  } catch {
    return fallbackExplanation(input);
  }
}
