import { z } from "zod";
import { rankOffers } from "./utils";
import type { FareSearchInput } from "./types";
import { demoProvider } from "./providers/demo";
import { amadeusProvider, duffelProvider, kiwiProvider, skyscannerProvider } from "./providers/stubs";
import { memoryFareHistoryStore } from "../history/store";
import { predictPurchaseTiming } from "../prediction/model";
import { explainRecommendation } from "../ai/explain";

export const fareSearchSchema = z.object({
  origin: z.string().min(3).max(8),
  destination: z.string().min(3).max(8),
  departureDate: z.string().date(),
  returnDate: z.string().date().optional().or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  tripType: z.enum(["one-way", "round-trip"]).default("round-trip"),
  nonstopOnly: z.coerce.boolean().default(false),
});

const providers = [amadeusProvider, duffelProvider, kiwiProvider, skyscannerProvider, demoProvider];
const historyStore = memoryFareHistoryStore;

export async function searchFares(rawInput: unknown) {
  const parsed = fareSearchSchema.parse(rawInput);
  const input: FareSearchInput = {
    ...parsed,
    returnDate: parsed.returnDate || undefined,
  };

  const [providerResults, historicalFares] = await Promise.all([
    Promise.all(providers.map((provider) => provider.search(input))),
    historyStore.loadHistory(input),
  ]);
  const offers = providerResults.flatMap((result) => result.offers);
  const rankedOffers = rankOffers(offers);
  const prediction = predictPurchaseTiming({ search: input, rankedOffers, historicalFares });
  const bestOffer = rankedOffers[0];
  const explanation = bestOffer ? await explainRecommendation({ bestOffer, prediction }) : "No fare offers were returned for this search.";

  await historyStore.saveObservation(input, rankedOffers);

  return {
    search: input,
    providerResults,
    rankedOffers,
    prediction,
    explanation,
  };
}
