from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import median
from typing import Literal

import pandas as pd
import streamlit as st

Recommendation = Literal["Buy now", "Watch", "Wait"]


@dataclass
class FareOffer:
    provider: str
    airline: str
    price: int
    currency: str
    stops: int
    duration_minutes: int
    departure_time: datetime
    arrival_time: datetime
    baggage_included: bool
    refundable: bool
    confidence: float


def normalize_airport(value: str) -> str:
    return "".join(char for char in value.upper().strip() if char.isalpha())[:3]


def build_demo_offers(
    origin: str,
    destination: str,
    departure_date: date,
    trip_type: str,
    nonstop_only: bool,
) -> list[FareOffer]:
    days_out = max(0, (departure_date - date.today()).days)
    route_seed = sum(ord(char) for char in f"{origin}{destination}")
    seasonal_lift = math.sin(days_out / 9) * 32
    base = 160 + (route_seed % 220) + max(0, 42 - days_out) * 3.4 + seasonal_lift
    route_multiplier = 1.12 if trip_type == "Round trip" else 1.0

    providers = ["Amadeus", "Duffel", "Kiwi", "Skyscanner"]
    airlines = ["Delta", "United", "JetBlue", "American"]
    offers: list[FareOffer] = []

    for index, provider in enumerate(providers):
        departure_time = datetime.combine(departure_date, datetime.min.time()) + timedelta(hours=6 + index * 3, minutes=index * 7)
        duration = 145 + (route_seed % 180) + index * 24
        arrival_time = departure_time + timedelta(minutes=duration)
        stops = 0 if nonstop_only else (1 if index == 2 else 0)
        price = max(79, round(base * route_multiplier * (0.88 + index * 0.07) + (-38 if stops else 0)))
        offers.append(
            FareOffer(
                provider=provider,
                airline=airlines[index],
                price=price,
                currency="USD",
                stops=stops,
                duration_minutes=duration,
                departure_time=departure_time,
                arrival_time=arrival_time,
                baggage_included=index != 2,
                refundable=index == 1,
                confidence=0.70 + index * 0.05,
            )
        )

    return offers


def rank_offers(offers: list[FareOffer]) -> pd.DataFrame:
    if not offers:
        return pd.DataFrame()

    prices = [offer.price for offer in offers]
    median_price = median(prices)
    fastest = min(offer.duration_minutes for offer in offers)
    rows = []

    for offer in sorted(offers, key=lambda item: item.price):
        price_advantage = max(0, (median_price - offer.price) / median_price)
        duration_penalty = max(0, (offer.duration_minutes - fastest) / fastest)
        stop_penalty = offer.stops * 0.08
        baggage_bonus = 0.04 if offer.baggage_included else 0
        refund_bonus = 0.03 if offer.refundable else 0
        consensus = max(0, 1 - abs(offer.price - median_price) / median_price)
        value_score = round((0.62 + price_advantage - duration_penalty * 0.25 - stop_penalty + baggage_bonus + refund_bonus) * 100)

        rows.append(
            {
                "Provider": offer.provider,
                "Airline": offer.airline,
                "Price": offer.price,
                "Stops": "Nonstop" if offer.stops == 0 else f"{offer.stops} stop",
                "Duration": f"{offer.duration_minutes // 60}h {offer.duration_minutes % 60}m",
                "Depart": offer.departure_time.strftime("%I:%M %p"),
                "Arrive": offer.arrival_time.strftime("%I:%M %p"),
                "Bag included": "Yes" if offer.baggage_included else "Check fees",
                "Refundable": "Yes" if offer.refundable else "No",
                "Consensus": round(consensus * 100),
                "Value score": max(1, min(99, value_score)),
            }
        )

    return pd.DataFrame(rows)


def predict_timing(ranked: pd.DataFrame, departure_date: date, trip_type: str) -> dict[str, object]:
    days_out = max(0, (departure_date - date.today()).days)
    if ranked.empty:
        return {
            "recommendation": "Watch",
            "confidence": 0,
            "expected_low": 0,
            "expected_high": 0,
            "volatility": 0,
            "rationale": ["No fares were returned for this search."],
        }

    best_price = int(ranked.iloc[0]["Price"])
    current_median = int(ranked["Price"].median())
    route_pressure = 1.08 if trip_type == "Round trip" else 1.0
    late_booking_lift = 1 + max(0, 21 - days_out) * 0.012 if days_out < 21 else 1
    baseline = []

    for index in range(18):
        seasonal_wave = math.sin((index + days_out) / 4) * 0.07
        market_noise = ((index % 5) - 2) * 0.025
        baseline.append(round(current_median * route_pressure * late_booking_lift * (0.92 + seasonal_wave + market_noise)))

    expected_low = int(pd.Series(baseline).quantile(0.2))
    expected_high = int(pd.Series(baseline).quantile(0.8))
    spread = max(1, expected_high - expected_low)
    volatility = max(0.03, min(0.8, spread / max(current_median, 1)))
    price_position = (best_price - expected_low) / spread
    urgency = 0.35 if days_out < 14 else 0.18 if days_out < 30 else -0.08 if days_out > 90 else 0
    score = price_position + urgency + volatility * 0.18

    if score <= 0.34:
        recommendation: Recommendation = "Buy now"
    elif score <= 0.68:
        recommendation = "Watch"
    else:
        recommendation = "Wait"

    confidence = round(max(48, min(93, (1 - abs(score - 0.5)) * 100 + len(ranked) * 2)))
    rationale = [
        "Best fare is at or below the modeled low range." if best_price <= expected_low else "Best fare is not yet near the modeled low range.",
        "Departure is close enough that fare risk rises quickly." if days_out < 21 else "There is still time for normal fare movement.",
        "Route/date pricing looks volatile." if volatility > 0.22 else "Observed provider spread is relatively stable.",
    ]

    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "expected_low": expected_low,
        "expected_high": expected_high,
        "best_price": best_price,
        "current_median": current_median,
        "volatility": volatility,
        "days_out": days_out,
        "rationale": rationale,
    }


def explain(prediction: dict[str, object], ranked: pd.DataFrame) -> str:
    if ranked.empty:
        return "No providers returned fares yet. Try another route/date or connect live fare API keys."

    action = str(prediction["recommendation"]).lower()
    best = int(prediction["best_price"])
    low = int(prediction["expected_low"])
    high = int(prediction["expected_high"])
    confidence = int(prediction["confidence"])
    rationale = str(prediction["rationale"][0])
    return f"I would {action}. The best fare is ${best}, compared with an expected range of ${low}-${high}. Confidence is {confidence}%, and the strongest signal is: {rationale}"


st.set_page_config(page_title="Flight Price Scout", page_icon=":airplane:", layout="wide")
st.title("Flight Price Scout")
st.caption("A local Streamlit GUI for comparing fares and estimating whether to buy, watch, or wait.")

with st.sidebar:
    st.header("Search")
    origin = normalize_airport(st.text_input("From", "JFK"))
    destination = normalize_airport(st.text_input("To", "LAX"))
    departure_date = st.date_input("Depart", value=date.today() + timedelta(days=31), min_value=date.today() + timedelta(days=1))
    trip_type = st.segmented_control("Trip", ["Round trip", "One way"], default="Round trip")
    return_date = None
    if trip_type == "Round trip":
        return_date = st.date_input("Return", value=departure_date + timedelta(days=5), min_value=departure_date)
    cabin = st.selectbox("Cabin", ["Economy", "Premium economy", "Business", "First"])
    travelers = st.number_input("Travelers", min_value=1, max_value=9, value=1)
    nonstop_only = st.checkbox("Nonstop only")
    search = st.button("Search fares", type="primary", use_container_width=True)

if not origin or not destination or len(origin) < 3 or len(destination) < 3:
    st.info("Enter valid three-letter airport codes to begin.")
elif search:
    offers = build_demo_offers(origin, destination, departure_date, trip_type, nonstop_only)
    ranked = rank_offers(offers)
    prediction = predict_timing(ranked, departure_date, trip_type)

    top_left, top_mid, top_right = st.columns([1, 1, 1])
    top_left.metric("Recommendation", str(prediction["recommendation"]), f'{prediction["confidence"]}% confidence')
    top_mid.metric("Best fare", f'${int(prediction["best_price"])}')
    top_right.metric("Expected range", f'${int(prediction["expected_low"])}-${int(prediction["expected_high"])}')

    st.success(explain(prediction, ranked))

    st.subheader("Best value fares")
    display = ranked.copy()
    display["Price"] = display["Price"].map(lambda value: f"${value}")
    st.dataframe(display, hide_index=True, use_container_width=True)

    st.subheader("Signals")
    for reason in prediction["rationale"]:
        st.write(f"- {reason}")

    with st.expander("Provider status"):
        st.write("This Streamlit version currently uses demo fare generation. Add live API keys and provider adapters next to compare real Amadeus, Duffel, Kiwi, and Skyscanner-style results.")
        st.write(f"Search context: {origin} to {destination}, {departure_date}, {trip_type}, {cabin}, {travelers} traveler(s), return {return_date or 'none'}.")
else:
    st.info("Set your route in the sidebar, then run a search. The first version uses demo fares so it works immediately on localhost.")
