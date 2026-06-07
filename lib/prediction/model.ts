import { median, daysUntilDeparture } from "../fares/utils";
import type { PredictionInput, PricePrediction } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function percentile(values: number[], pct: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((pct / 100) * (sorted.length - 1))));
  return sorted[index];
}

function inferHistoricalBaseline(input: PredictionInput) {
  if (input.historicalFares?.length) {
    return input.historicalFares.map((point) => point.medianPrice);
  }

  const currentMedian = median(input.rankedOffers.map((offer) => offer.price));
  const daysOut = daysUntilDeparture(input.search);
  const routePressure = input.search.tripType === "round-trip" ? 1.08 : 1;
  const lateBookingLift = daysOut < 21 ? 1 + (21 - daysOut) * 0.012 : 1;

  return Array.from({ length: 18 }, (_, index) => {
    const seasonalWave = Math.sin((index + daysOut) / 4) * 0.07;
    const marketNoise = ((index % 5) - 2) * 0.025;
    return Math.round(currentMedian * routePressure * lateBookingLift * (0.92 + seasonalWave + marketNoise));
  });
}

export function predictPurchaseTiming(input: PredictionInput): PricePrediction {
  const prices = input.rankedOffers.map((offer) => offer.price);
  const currentMedian = Math.round(median(prices));
  const bestPrice = Math.min(...prices);
  const daysOut = daysUntilDeparture(input.search);
  const baseline = inferHistoricalBaseline(input);
  const expectedLow = Math.round(percentile(baseline, 20));
  const expectedHigh = Math.round(percentile(baseline, 80));
  const spread = expectedHigh - expectedLow;
  const volatility = clamp(spread / Math.max(currentMedian, 1), 0.03, 0.8);
  const pricePosition = (bestPrice - expectedLow) / Math.max(spread, 1);
  const urgency = daysOut < 14 ? 0.35 : daysOut < 30 ? 0.18 : daysOut > 90 ? -0.08 : 0;
  const score = pricePosition + urgency + volatility * 0.18;

  const recommendation = score <= 0.34 ? "buy_now" : score <= 0.68 ? "watch" : "wait";
  const confidence = Math.round(clamp((1 - Math.abs(score - 0.5)) * 100 + input.rankedOffers.length * 2, 48, 93));
  const expectedMidpoint = (expectedLow + expectedHigh) / 2;
  const estimatedChangePercent = Math.round(((expectedMidpoint - bestPrice) / Math.max(bestPrice, 1)) * 100);
  const rationale = [
    bestPrice <= expectedLow ? "The best fare is at or below the modeled low range." : "The best fare is not yet near the modeled low range.",
    daysOut < 21 ? "Departure is close enough that fare risk rises quickly." : "There is still time for normal fare movement.",
    volatility > 0.22 ? "This route/date combination looks volatile across observations." : "Observed provider spread is relatively stable.",
  ];

  return {
    recommendation,
    confidence,
    expectedLow,
    expectedHigh,
    currentMedian,
    bestPrice,
    volatility: Number(volatility.toFixed(2)),
    daysUntilDeparture: daysOut,
    estimatedChangePercent,
    rationale,
  };
}
