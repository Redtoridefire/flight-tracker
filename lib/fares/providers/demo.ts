import { buildDemoOffers } from "../utils";
import type { FareSearchInput, ProviderResult } from "../types";
import type { FareProvider } from "./base";

export const demoProvider: FareProvider = {
  id: "demo",
  label: "Demo fare simulator",
  isConfigured: () => true,
  async search(input: FareSearchInput): Promise<ProviderResult> {
    return {
      provider: "demo",
      offers: buildDemoOffers(input),
      warnings: ["Demo fares are synthetic until live provider API keys are configured."],
      fetchedAt: new Date().toISOString(),
    };
  },
};
