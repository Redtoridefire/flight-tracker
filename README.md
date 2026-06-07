# Flight Price Scout

A Next.js airfare comparison and price-prediction app inspired by Hopper. It searches multiple fare-provider adapters, normalizes results into one comparable shape, ranks the best value, and produces a buy/watch/wait recommendation with an AI-ready explanation layer.

## What works now

- Usable fare search UI for origin, destination, dates, cabin, traveler count, and nonstop preference
- `/api/search` endpoint that validates searches and returns ranked offers
- Provider adapter boundaries for Amadeus, Duffel, Kiwi/Tequila, Skyscanner-style APIs, and demo data
- Cross-provider value scoring using price, duration, stops, baggage, refundability, and provider consensus
- Transparent prediction model using current prices, modeled historical baseline, volatility, and days until departure
- Optional OpenAI explanation when `OPENAI_API_KEY` is configured
- SQL schema for storing fare searches and historical fare observations

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and search a route. Without provider keys, the app uses synthetic demo fares so the product flow still works.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the providers you want to enable.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
DUFFEL_ACCESS_TOKEN=
KIWI_API_KEY=
SKYSCANNER_API_KEY=
```

## Architecture

- `app/page.tsx` - interactive search and results interface
- `app/api/search/route.ts` - fare search API endpoint
- `lib/fares` - normalized fare types, provider adapters, ranking, and orchestration
- `lib/prediction` - buy/watch/wait model and prediction types
- `lib/ai` - OpenAI-backed recommendation explanation with deterministic fallback
- `lib/history` - history-store interface ready for a Postgres implementation
- `db/schema.sql` - starting schema for persisted fare observations

## Next build steps

1. Implement the first live adapter, likely Amadeus, then normalize its response into `FareOffer`.
2. Add a Postgres-backed `FareHistoryStore` and call `db/schema.sql` during setup/migration.
3. Schedule repeated fare checks for saved searches so predictions learn from real observations.
4. Train or tune route-specific models once enough historical observations exist.
5. Add user accounts, saved watches, and alerts for price drops or confidence changes.

## Accuracy note

Airfare prediction quality depends on repeated historical observations for the exact route, dates, cabin, airline mix, and booking window. This first version is intentionally transparent and conservative: it gives a useful recommendation today, then improves as live providers and stored history come online.
