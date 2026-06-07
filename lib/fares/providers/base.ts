import type { FareSearchInput, ProviderResult } from "../types";

export interface FareProvider {
  id: ProviderResult["provider"];
  label: string;
  isConfigured(): boolean;
  search(input: FareSearchInput): Promise<ProviderResult>;
}

export function providerUnavailable(provider: ProviderResult["provider"], reason: string): ProviderResult {
  return {
    provider,
    offers: [],
    warnings: [reason],
    fetchedAt: new Date().toISOString(),
  };
}
