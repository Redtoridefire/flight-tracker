import type { FareSearchInput, ProviderResult } from "../types";
import { providerUnavailable, type FareProvider } from "./base";

function envPresent(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]));
}

export const amadeusProvider: FareProvider = {
  id: "amadeus",
  label: "Amadeus",
  isConfigured: () => envPresent(["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"]),
  async search(_input: FareSearchInput): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return providerUnavailable("amadeus", "Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET to enable Amadeus flight offers.");
    }

    return providerUnavailable("amadeus", "Amadeus credentials detected; live adapter implementation is the next integration step.");
  },
};

export const duffelProvider: FareProvider = {
  id: "duffel",
  label: "Duffel",
  isConfigured: () => envPresent(["DUFFEL_ACCESS_TOKEN"]),
  async search(_input: FareSearchInput): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return providerUnavailable("duffel", "Set DUFFEL_ACCESS_TOKEN to enable Duffel offers.");
    }

    return providerUnavailable("duffel", "Duffel token detected; live adapter implementation is the next integration step.");
  },
};

export const kiwiProvider: FareProvider = {
  id: "kiwi",
  label: "Kiwi/Tequila",
  isConfigured: () => envPresent(["KIWI_API_KEY"]),
  async search(_input: FareSearchInput): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return providerUnavailable("kiwi", "Set KIWI_API_KEY to enable Kiwi Tequila search.");
    }

    return providerUnavailable("kiwi", "Kiwi key detected; live adapter implementation is the next integration step.");
  },
};

export const skyscannerProvider: FareProvider = {
  id: "skyscanner",
  label: "Skyscanner",
  isConfigured: () => envPresent(["SKYSCANNER_API_KEY"]),
  async search(_input: FareSearchInput): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return providerUnavailable("skyscanner", "Set SKYSCANNER_API_KEY to enable Skyscanner-style marketplace results.");
    }

    return providerUnavailable("skyscanner", "Skyscanner key detected; live adapter implementation is the next integration step.");
  },
};
