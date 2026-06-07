import { addDays, differenceInCalendarDays, formatISO, parseISO } from "date-fns";
import type { FareOffer, FareSearchInput, RankedFareOffer } from "./types";

export function normalizeAirportCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

export function daysUntilDeparture(input: FareSearchInput, now = new Date()) {
  return Math.max(0, differenceInCalendarDays(parseISO(input.departureDate), now));
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildDemoOffers(input: FareSearchInput): FareOffer[] {
  const origin = normalizeAirportCode(input.origin) || "JFK";
  const destination = normalizeAirportCode(input.destination) || "LAX";
  const daysOut = daysUntilDeparture(input);
  const routeSeed = [...origin, ...destination].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const seasonalLift = Math.sin(daysOut / 9) * 32;
  const base = 160 + (routeSeed % 220) + Math.max(0, 42 - daysOut) * 3.4 + seasonalLift;
  const providers = ["amadeus", "duffel", "kiwi", "skyscanner"] as const;

  return providers.map((provider, index) => {
    const departure = addDays(new Date(`${input.departureDate}T08:00:00`), 0);
    departure.setHours(6 + index * 3, index * 7, 0, 0);
    const duration = 145 + (routeSeed % 180) + index * 24;
    const arrival = new Date(departure.getTime() + duration * 60_000);
    const stops = input.nonstopOnly ? 0 : index === 2 ? 1 : 0;
    const price = Math.max(79, Math.round(base * (0.88 + index * 0.07) + (stops ? -38 : 0)));

    return {
      id: `${provider}-${origin}-${destination}-${input.departureDate}`,
      provider,
      airline: ["Delta", "United", "JetBlue", "American"][index],
      price,
      currency: "USD",
      stops,
      durationMinutes: duration,
      departureTime: formatISO(departure),
      arrivalTime: formatISO(arrival),
      segments: [
        {
          airline: ["Delta", "United", "JetBlue", "American"][index],
          departureAirport: origin,
          arrivalAirport: destination,
          departureTime: formatISO(departure),
          arrivalTime: formatISO(arrival),
          durationMinutes: duration,
        },
      ],
      baggageIncluded: index !== 2,
      refundable: index === 1,
      rawConfidence: 0.7 + index * 0.05,
      deeplink: "https://www.google.com/travel/flights",
    };
  });
}

export function rankOffers(offers: FareOffer[]): RankedFareOffer[] {
  const prices = offers.map((offer) => offer.price);
  const medianPrice = median(prices) || 1;
  const fastest = Math.min(...offers.map((offer) => offer.durationMinutes));

  return [...offers]
    .sort((a, b) => a.price - b.price)
    .map((offer, index) => {
      const priceAdvantage = Math.max(0, (medianPrice - offer.price) / medianPrice);
      const durationPenalty = Math.max(0, (offer.durationMinutes - fastest) / Math.max(fastest, 1));
      const stopPenalty = offer.stops * 0.08;
      const baggageBonus = offer.baggageIncluded ? 0.04 : 0;
      const refundBonus = offer.refundable ? 0.03 : 0;
      const providerConsensus = Math.max(0, 1 - Math.abs(offer.price - medianPrice) / medianPrice);
      const valueScore = Math.round((0.62 + priceAdvantage - durationPenalty * 0.25 - stopPenalty + baggageBonus + refundBonus) * 100);
      const reasons = [
        offer.price <= medianPrice ? "below the cross-provider median" : "above the cross-provider median",
        offer.stops === 0 ? "nonstop itinerary" : `${offer.stops} stop itinerary`,
        offer.baggageIncluded ? "bag included" : "verify baggage fees",
      ];

      return {
        ...offer,
        valueScore: Math.max(1, Math.min(99, valueScore)),
        priceRank: index + 1,
        providerConsensus: Number(providerConsensus.toFixed(2)),
        reasons,
      };
    });
}
