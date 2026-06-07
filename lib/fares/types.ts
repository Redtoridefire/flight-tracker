export type FareProviderId = "amadeus" | "duffel" | "kiwi" | "skyscanner" | "demo";

export type TripType = "one-way" | "round-trip";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface FareSearchInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: CabinClass;
  tripType: TripType;
  nonstopOnly: boolean;
}

export interface SegmentSummary {
  airline: string;
  flightNumber?: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface FareOffer {
  id: string;
  provider: FareProviderId;
  airline: string;
  price: number;
  currency: string;
  deeplink?: string;
  bookingToken?: string;
  stops: number;
  durationMinutes: number;
  departureTime: string;
  arrivalTime: string;
  segments: SegmentSummary[];
  baggageIncluded: boolean;
  refundable: boolean;
  lastTicketingDate?: string;
  rawConfidence: number;
}

export interface ProviderResult {
  provider: FareProviderId;
  offers: FareOffer[];
  warnings: string[];
  fetchedAt: string;
}

export interface RankedFareOffer extends FareOffer {
  valueScore: number;
  priceRank: number;
  providerConsensus: number;
  reasons: string[];
}
