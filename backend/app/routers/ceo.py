"""CEO AI endpoints — revenue recovery scan and event analysis."""
import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Product, Order, Customer
from app.claude import call_claude_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ceo", tags=["ceo"])


# ── Request / Response models ───────────────────────────────────────

class EventPayload(BaseModel):
    event_type: str
    payload: dict


# ── Helpers to gather store data ────────────────────────────────────

async def _all_customers(db: AsyncSession) -> list[dict]:
    """All customers with spend + recency data."""
    result = await db.execute(select(Customer))
    customers = result.scalars().all()

    now = datetime.now(timezone.utc)
    out = []
    for c in customers:
        days_since = None
        if c.last_order_at:
            try:
                last = datetime.fromisoformat(c.last_order_at.replace("Z", "+00:00"))
                days_since = (now - last).days
            except (ValueError, AttributeError):
                pass

        out.append({
            "name": f"{c.first_name} {c.last_name}".strip() or c.email,
            "email": c.email,
            "orders_count": c.orders_count,
            "total_spent": round(c.total_spent, 2),
            "days_since_last_order": days_since,
            "tags": c.tags or [],
        })
    return out


async def _inventory_levels(db: AsyncSession) -> list[dict]:
    """Inventory for all products with variant detail."""
    result = await db.execute(select(Product))
    products = result.scalars().all()

    inventory = []
    for p in products:
        variants = p.variants or []
        total_qty = sum(v.get("inventory_quantity", 0) for v in variants)
        inventory.append({
            "product_id": p.id,
            "product_title": p.title,
            "total_stock": total_qty,
            "price_min": p.price_min,
            "price_max": p.price_max,
            "variant_count": len(variants),
            "variants": [
                {
                    "id": v.get("id", ""),
                    "title": v.get("title", ""),
                    "inventory_quantity": v.get("inventory_quantity", 0),
                    "price": v.get("price", 0),
                }
                for v in variants[:5]  # limit to keep prompt small
            ],
            "status": p.status,
        })
    return inventory


async def _recent_orders(db: AsyncSession, limit: int = 50) -> list[dict]:
    """Most recent orders, slim representation."""
    result = await db.execute(
        select(Order).order_by(Order.processed_at.desc()).limit(limit)
    )
    orders = result.scalars().all()

    return [
        {
            "order_number": o.order_number,
            "total": o.total_price,
            "items": [
                {"title": li.get("title", ""), "quantity": li.get("quantity", 0), "amount": li.get("amount", 0)}
                for li in (o.line_items or [])
            ],
            "financial_status": o.financial_status,
            "customer_name": o.customer_name or o.customer_email or "anonymous",
            "customer_email": o.customer_email or "",
            "date": o.processed_at,
        }
        for o in orders
    ]


async def _top_products(db: AsyncSession, limit: int = 10) -> list[dict]:
    """Top products by revenue from order line items."""
    result = await db.execute(select(Order))
    orders = result.scalars().all()

    stats: dict[str, dict] = {}
    for order in orders:
        for item in (order.line_items or []):
            pid = item.get("product_id") or "unknown"
            if pid not in stats:
                stats[pid] = {"product_id": pid, "title": item.get("title", "Unknown"), "revenue": 0.0, "units": 0}
            stats[pid]["revenue"] += float(item.get("amount", 0))
            stats[pid]["units"] += int(item.get("quantity", 0))

    sorted_products = sorted(stats.values(), key=lambda x: x["revenue"], reverse=True)[:limit]
    for p in sorted_products:
        p["revenue"] = round(p["revenue"], 2)
    return sorted_products


# ── Scan Endpoint ───────────────────────────────────────────────────

SCAN_SYSTEM = """You are StoreOS, a revenue recovery AI for Shopify stores. Your ONLY job is to find money the store is losing and generate executable actions to recover it.

IMPORTANT RULES:
1. Return ONLY a valid JSON array — no markdown, no commentary, no code fences.
2. Every headline MUST mention a specific customer name, product name, or dollar amount from the actual data provided.
3. Every proposed_action MUST be one concrete step: "Send 15% discount code WINBACK-EMMA to emma.wilson@example.com" — NOT "Launch a re-engagement campaign".
4. The action_label should be a specific verb phrase: "Send 15% off to Emma Wilson" not "Execute win-back strategy".
5. If there are zero customers AND zero products in the data, return exactly 2 cards: one saying "No customer data found — sync your Shopify store" and one saying "No product data — run initial catalog import". Do NOT generate generic advice for an empty store.

Analyze this store data and find revenue recovery opportunities in THREE categories:

1. WIN-BACK: Find customers where total_spent > $200 AND days_since_last_order > 20. For EACH qualifying customer, create a personalized discount code using their name (e.g., COMEBACK-EMMA) and draft an email mentioning their specific spend history and what they bought.

2. LOW STOCK: Find products where ANY variant has inventory_quantity < 10. Cross-reference with top sellers — if a top seller is running low, mark as URGENT. Include the specific variant and exact stock count in the headline.

3. MARGIN ALERT: Find products with high total stock (>50 units) but NOT appearing in top sellers — this is dead capital. Suggest a specific clearance discount percentage to move the inventory.

Return a JSON array of 5-8 action objects. Each must have:
- id (unique string like "action-1", "action-2")
- priority ("urgent" | "high" | "medium")
- category ("win-back" | "low-stock" | "margin-alert")
- headline (MUST include real name/product + real number, e.g., "Emma Wilson hasn't ordered in 34 days — $847 lifetime spend")
- reasoning (1-2 sentences max, cite specific data points)
- proposed_action (single concrete step, e.g., "Send 15% discount code COMEBACK-EMMA to emma.wilson@example.com with personalized email")
- action_label (short verb phrase for the button, e.g., "Send 15% off to Emma")
- execution (object with type + params):
  - discount: { "type": "discount", "code": "WINBACK-EMMA", "percentage": 15 }
  - draft_order: { "type": "draft_order", "line_items": [{ "variant_id": "gid://...", "quantity": 20 }] }
  - email: { "type": "email", "to": "email@example.com", "subject": "We miss you!", "html": "<p>personalized message</p>" }
- estimated_value (realistic dollar amount this could recover, as a number)

Sort by estimated_value descending. Be ruthlessly specific. No vague language.

ALSO: Return a JSON object (not array) with this structure:
{
  "health_score": <0-100 integer>,
  "health_summary": "<one sentence like '3 revenue leaks detected worth $2,860'>",
  "actions": [<array of action objects>]
}

health_score rules:
- Start at 100
- Subtract 5 for each customer at risk of churning (days_since > 20 and spent > $200)
- Subtract 8 for each top-selling product with stock < 10
- Subtract 3 for each slow-moving product with >50 units
- Minimum 0, maximum 100"""


@router.post("/scan")
async def scan_for_actions(db: AsyncSession = Depends(get_db)):
    """Scan store data for revenue recovery opportunities."""
    try:
        customers = await _all_customers(db)
        inventory = await _inventory_levels(db)
        orders = await _recent_orders(db, limit=50)
        top_prods = await _top_products(db)

        user_prompt = f"""STORE DATA:

Customers ({len(customers)} total):
{json.dumps(customers, indent=2)}

Inventory ({len(inventory)} products):
{json.dumps(inventory, indent=2)}

Recent Orders (last 50):
{json.dumps(orders, indent=2)}

Top Products by Revenue:
{json.dumps(top_prods, indent=2)}

Today's date: {datetime.now(timezone.utc).strftime("%Y-%m-%d")}

Analyze and return the JSON object with health_score, health_summary, and actions array now."""

        result = call_claude_json(
            system=SCAN_SYSTEM,
            user_prompt=user_prompt,
        )

        # Handle both wrapped object and bare array responses
        if isinstance(result, list):
            # Claude returned bare array — compute health score ourselves
            total_risk = sum(a.get("estimated_value", 0) for a in result)
            return {
                "health_score": max(0, 100 - len(result) * 7),
                "health_summary": f"{len(result)} revenue leaks detected worth ${total_risk:,.0f}",
                "actions": result,
            }

        actions = result.get("actions", [])
        return {
            "health_score": result.get("health_score", 65),
            "health_summary": result.get("health_summary", f"{len(actions)} opportunities found"),
            "actions": actions,
        }

    except ValueError as e:
        logger.error("Scan failed (parse): %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except RuntimeError as e:
        logger.error("Scan failed (config): %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Scan failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Scan failed: {e}")


# ── Keep the old briefing endpoint as an alias ──────────────────────

@router.post("/briefing")
async def generate_briefing(db: AsyncSession = Depends(get_db)):
    """Alias — redirects to scan."""
    return await scan_for_actions(db)


# ── Event Analysis (unchanged) ──────────────────────────────────────

ANALYZE_SYSTEM = """You are StoreOS analyzing a real-time Shopify store event.

If this event is noteworthy (unusual order size, VIP customer, low stock trigger, etc.), return JSON:
{
  "insight": "<1 sentence — what this means for the merchant>",
  "severity": "<info|warning|critical>",
  "suggested_action": "<optional action suggestion or null>"
}

If this is a routine, unremarkable event, return exactly: {"skip": true}

Return ONLY valid JSON — no markdown, no commentary."""


@router.post("/analyze-event")
async def analyze_event(event: EventPayload, db: AsyncSession = Depends(get_db)):
    """Analyze a single real-time event with AI."""
    try:
        customer_count = (await db.execute(
            select(func.count()).select_from(Customer)
        )).scalar() or 0
        order_count = (await db.execute(
            select(func.count()).select_from(Order)
        )).scalar() or 0

        store_ctx = {"customer_count": customer_count, "order_count": order_count}

        user_prompt = f"""Store context: {json.dumps(store_ctx)}

Event type: {event.event_type}
Event data: {json.dumps(event.payload)}

Analyze this event."""

        result = call_claude_json(
            system=ANALYZE_SYSTEM,
            user_prompt=user_prompt,
        )

        if result.get("skip"):
            return {"insight": None}

        return result

    except Exception as e:
        logger.error("Event analysis failed: %s", e)
        return {"insight": None, "error": str(e)}
