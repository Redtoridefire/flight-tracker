import type { FareSearchInput, RankedFareOffer } from "../fares/types";
import type { HistoricalFarePoint } from "../prediction/types";

export interface FareHistoryStore {
  loadHistory(search: FareSearchInput): Promise<HistoricalFarePoint[]>;
  saveObservation(search: FareSearchInput, offers: RankedFareOffer[]): Promise<void>;
}

export const memoryFareHistoryStore: FareHistoryStore = {
  async loadHistory() {
    return [];
  },
  async saveObservation() {
    // Replace this with a Postgres-backed implementation when DATABASE_URL is configured.
  },
};
