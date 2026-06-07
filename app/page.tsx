"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, BadgeDollarSign, CalendarDays, Gauge, Loader2, Plane, Search, ShieldCheck, Sparkles } from "lucide-react";

type RankedOffer = {
  id: string;
  provider: string;
  airline: string;
  price: number;
  currency: string;
  stops: number;
  durationMinutes: number;
  departureTime: string;
  arrivalTime: string;
  baggageIncluded: boolean;
  refundable: boolean;
  valueScore: number;
  providerConsensus: number;
  reasons: string[];
};

type SearchResult = {
  rankedOffers: RankedOffer[];
  explanation: string;
  prediction: {
    recommendation: "buy_now" | "watch" | "wait";
    confidence: number;
    expectedLow: number;
    expectedHigh: number;
    currentMedian: number;
    bestPrice: number;
    volatility: number;
    daysUntilDeparture: number;
    estimatedChangePercent: number;
    rationale: string[];
  };
  providerResults: Array<{ provider: string; warnings: string[]; offers: RankedOffer[] }>;
};

const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const nextMonth = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function minutes(value: number) {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${hours}h ${mins}m`;
}

function time(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function recommendationCopy(recommendation: SearchResult["prediction"]["recommendation"]) {
  if (recommendation === "buy_now") return { label: "Buy now", tone: "bg-emerald-100 text-emerald-900", text: "The current best fare looks strong versus the modeled range." };
  if (recommendation === "wait") return { label: "Wait", tone: "bg-sky-100 text-sky-900", text: "The model sees room for better pricing before urgency rises." };
  return { label: "Watch", tone: "bg-amber-100 text-amber-950", text: "Price signals are mixed, so monitor changes before committing." };
}

export default function Home() {
  const [form, setForm] = useState({
    origin: "JFK",
    destination: "LAX",
    departureDate: nextMonth,
    returnDate: "",
    adults: 1,
    cabinClass: "economy",
    tripType: "round-trip",
    nonstopOnly: false,
  });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bestOffer = result?.rankedOffers[0];
  const rec = useMemo(() => (result ? recommendationCopy(result.prediction.recommendation) : null), [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Search failed");
      setResult(await response.json());
    } catch {
      setError("Could not search fares. Check the route and dates, then try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase text-coral">
              <Plane className="h-4 w-4" /> Flight Price Scout
            </div>
            <h1 className="max-w-3xl text-3xl font-bold text-ink sm:text-5xl">Find the best fare and the smartest time to buy.</h1>
          </div>
          <div className="max-w-md text-sm leading-6 text-slate-600">
            Compare multiple fare sources, score value across price and itinerary quality, and use prediction plus AI explanation to decide whether to book or wait.
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white/86 p-4 shadow-panel backdrop-blur md:p-5">
          <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_0.8fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              From
              <input className="h-12 rounded-md border border-slate-300 px-3 text-lg font-bold uppercase" value={form.origin} maxLength={3} onChange={(event) => setForm({ ...form, origin: event.target.value.toUpperCase() })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              To
              <input className="h-12 rounded-md border border-slate-300 px-3 text-lg font-bold uppercase" value={form.destination} maxLength={3} onChange={(event) => setForm({ ...form, destination: event.target.value.toUpperCase() })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Depart
              <input className="h-12 rounded-md border border-slate-300 px-3" type="date" min={tomorrow} value={form.departureDate} onChange={(event) => setForm({ ...form, departureDate: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Return
              <input className="h-12 rounded-md border border-slate-300 px-3" type="date" min={form.departureDate} value={form.returnDate} onChange={(event) => setForm({ ...form, returnDate: event.target.value, tripType: event.target.value ? "round-trip" : "one-way" })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Cabin
              <select className="h-12 rounded-md border border-slate-300 px-3" value={form.cabinClass} onChange={(event) => setForm({ ...form, cabinClass: event.target.value })}>
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 font-bold text-white transition hover:bg-slate-700" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              Search
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.nonstopOnly} onChange={(event) => setForm({ ...form, nonstopOnly: event.target.checked })} /> Nonstop only
            </label>
            <label className="inline-flex items-center gap-2">
              Travelers
              <input className="h-9 w-16 rounded-md border border-slate-300 px-2" type="number" min={1} max={9} value={form.adults} onChange={(event) => setForm({ ...form, adults: Number(event.target.value) })} />
            </label>
          </div>
          {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
        </section>

        {result && bestOffer && rec ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${rec.tone}`}>{rec.label}</span>
                  <span className="text-sm font-semibold text-slate-500">{result.prediction.confidence}% confidence</span>
                </div>
                <div className="flex items-end gap-3">
                  <div className="text-5xl font-black text-ink">{money(bestOffer.price, bestOffer.currency)}</div>
                  <div className="pb-2 text-sm font-semibold text-slate-600">best found fare</div>
                </div>
                <p className="mt-4 text-base leading-7 text-slate-700">{result.explanation}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-md bg-slate-50 p-3"><CalendarDays className="mb-2 h-5 w-5 text-coral" />{result.prediction.daysUntilDeparture} days out</div>
                  <div className="rounded-md bg-slate-50 p-3"><BadgeDollarSign className="mb-2 h-5 w-5 text-coral" />{money(result.prediction.expectedLow)}-{money(result.prediction.expectedHigh)}</div>
                  <div className="rounded-md bg-slate-50 p-3"><Gauge className="mb-2 h-5 w-5 text-coral" />{Math.round(result.prediction.volatility * 100)}% volatility</div>
                  <div className="rounded-md bg-slate-50 p-3"><Sparkles className="mb-2 h-5 w-5 text-coral" />{result.prediction.estimatedChangePercent}% modeled move</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="mb-3 text-xl font-bold text-ink">Provider coverage</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.providerResults.map((provider) => (
                    <div key={provider.provider} className="rounded-md border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold capitalize text-ink">{provider.provider}</span>
                        <span className="text-sm text-slate-500">{provider.offers.length} offers</span>
                      </div>
                      {provider.warnings.map((warning) => <p key={warning} className="mt-2 text-xs leading-5 text-slate-600">{warning}</p>)}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="text-2xl font-bold text-ink">Best value fares</h2>
              <div className="grid gap-3">
                {result.rankedOffers.map((offer) => (
                  <article key={offer.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-black text-ink">{money(offer.price, offer.currency)}</span>
                        <span className="rounded-full bg-mint px-2 py-1 text-xs font-bold uppercase text-emerald-950">Score {offer.valueScore}</span>
                        <span className="rounded-full bg-skyglass px-2 py-1 text-xs font-bold uppercase text-sky-950">{offer.provider}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                        <span className="font-semibold">{offer.airline}</span>
                        <span>{time(offer.departureTime)}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span>{time(offer.arrivalTime)}</span>
                        <span>{minutes(offer.durationMinutes)}</span>
                        <span>{offer.stops === 0 ? "Nonstop" : `${offer.stops} stop`}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        {offer.reasons.map((reason) => <span key={reason} className="rounded-full bg-slate-100 px-2 py-1">{reason}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:justify-end">
                      <div className="text-right text-sm text-slate-600">
                        <div className="font-bold text-ink">{Math.round(offer.providerConsensus * 100)}%</div>
                        consensus
                      </div>
                      <ShieldCheck className="h-8 w-8 text-emerald-600" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
