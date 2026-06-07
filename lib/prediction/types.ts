import type { FareSearchInput, RankedFareOffer } from "../fares/types";

export type PurchaseRecommendation = "buy_now" | "watch" | "wait";

export interface HistoricalFarePoint {
  observedAt: string;
  minPrice: number;
  medianPrice: number;
  currency: string;
}

export interface PricePrediction {
  recommendation: PurchaseRecommendation;
  confidence: number;
  expectedLow: number;
  expectedHigh: number;
  currentMedian: number;
  bestPrice: number;
  volatility: number;
  daysUntilDeparture: number;
  estimatedChangePercent: number;
  rationale: string[];
}

export interface PredictionInput {
  search: FareSearchInput;
  rankedOffers: RankedFareOffer[];
  historicalFares?: HistoricalFarePoint[];
}
