#!/usr/bin/env python3
"""
Seed the local SQLite database directly — no Shopify API needed.

Populates products, customers, and orders with realistic demo data
so the AI scan endpoint has rich data to analyze.

Usage:
  python backend/seed_local.py
"""
import asyncio
import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent))

from app.database import init_db, get_db_context
from sqlalchemy import text

# ── Products (from seed.py catalog) ────────────────────────────────

PRODUCTS = [
    {"id": "gid://shopify/Product/1001", "title": "Classic Logo Tee", "type": "T-Shirts", "handle": "classic-logo-tee",
     "price_min": 29.0, "price_max": 29.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1001a", "title": "S / Black", "price": "29.00", "sku": "CLT-S-BLK", "inventory_quantity": 45},
         {"id": "gid://shopify/ProductVariant/1001b", "title": "M / Black", "price": "29.00", "sku": "CLT-M-BLK", "inventory_quantity": 62},
         {"id": "gid://shopify/ProductVariant/1001c", "title": "L / Black", "price": "29.00", "sku": "CLT-L-BLK", "inventory_quantity": 38},
         {"id": "gid://shopify/ProductVariant/1001d", "title": "M / White", "price": "29.00", "sku": "CLT-M-WHT", "inventory_quantity": 73},
     ]},
    {"id": "gid://shopify/Product/1002", "title": "Everyday Hoodie", "type": "Hoodies", "handle": "everyday-hoodie",
     "price_min": 65.0, "price_max": 65.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1002a", "title": "S / Charcoal", "price": "65.00", "sku": "EH-S-CHR", "inventory_quantity": 22},
         {"id": "gid://shopify/ProductVariant/1002b", "title": "M / Charcoal", "price": "65.00", "sku": "EH-M-CHR", "inventory_quantity": 41},
         {"id": "gid://shopify/ProductVariant/1002c", "title": "L / Charcoal", "price": "65.00", "sku": "EH-L-CHR", "inventory_quantity": 7},
     ]},
    {"id": "gid://shopify/Product/1003", "title": "Signature Cap", "type": "Accessories", "handle": "signature-cap",
     "price_min": 32.0, "price_max": 32.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1003a", "title": "One Size / Black", "price": "32.00", "sku": "SC-OS-BLK", "inventory_quantity": 89},
         {"id": "gid://shopify/ProductVariant/1003b", "title": "One Size / Navy", "price": "32.00", "sku": "SC-OS-NVY", "inventory_quantity": 67},
     ]},
    {"id": "gid://shopify/Product/1004", "title": "Essential Joggers", "type": "Pants", "handle": "essential-joggers",
     "price_min": 55.0, "price_max": 55.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1004a", "title": "M / Grey", "price": "55.00", "sku": "EJ-M-GRY", "inventory_quantity": 48},
         {"id": "gid://shopify/ProductVariant/1004b", "title": "L / Grey", "price": "55.00", "sku": "EJ-L-GRY", "inventory_quantity": 3},
         {"id": "gid://shopify/ProductVariant/1004c", "title": "M / Black", "price": "55.00", "sku": "EJ-M-BLK", "inventory_quantity": 52},
     ]},
    {"id": "gid://shopify/Product/1005", "title": "Weekend Tote", "type": "Bags", "handle": "weekend-tote",
     "price_min": 45.0, "price_max": 45.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1005a", "title": "One Size / Canvas", "price": "45.00", "sku": "WT-OS-CNV", "inventory_quantity": 74},
     ]},
    {"id": "gid://shopify/Product/1006", "title": "Oversized Crew Sweatshirt", "type": "Sweatshirts", "handle": "oversized-crew",
     "price_min": 58.0, "price_max": 58.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1006a", "title": "M / Sage", "price": "58.00", "sku": "OCS-M-SAG", "inventory_quantity": 55},
         {"id": "gid://shopify/ProductVariant/1006b", "title": "L / Sage", "price": "58.00", "sku": "OCS-L-SAG", "inventory_quantity": 35},
     ]},
    {"id": "gid://shopify/Product/1007", "title": "Artist Collab Hoodie - Drop 01", "type": "Hoodies", "handle": "artist-collab-hoodie",
     "price_min": 120.0, "price_max": 120.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1007a", "title": "S / Multicolor", "price": "120.00", "sku": "ACH-S-MC", "inventory_quantity": 2},
         {"id": "gid://shopify/ProductVariant/1007b", "title": "M / Multicolor", "price": "120.00", "sku": "ACH-M-MC", "inventory_quantity": 5},
         {"id": "gid://shopify/ProductVariant/1007c", "title": "L / Multicolor", "price": "120.00", "sku": "ACH-L-MC", "inventory_quantity": 3},
     ]},
    {"id": "gid://shopify/Product/1008", "title": "Embroidered Varsity Jacket", "type": "Outerwear", "handle": "varsity-jacket",
     "price_min": 185.0, "price_max": 185.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1008a", "title": "S / Black-Gold", "price": "185.00", "sku": "EVJ-S-BG", "inventory_quantity": 5},
         {"id": "gid://shopify/ProductVariant/1008b", "title": "M / Black-Gold", "price": "185.00", "sku": "EVJ-M-BG", "inventory_quantity": 8},
         {"id": "gid://shopify/ProductVariant/1008c", "title": "L / Black-Gold", "price": "185.00", "sku": "EVJ-L-BG", "inventory_quantity": 1},
     ]},
    {"id": "gid://shopify/Product/1009", "title": "Last Season Windbreaker", "type": "Outerwear", "handle": "last-season-windbreaker",
     "price_min": 49.0, "price_max": 49.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1009a", "title": "M / Orange", "price": "49.00", "sku": "LSW-M-ORG", "inventory_quantity": 8},
         {"id": "gid://shopify/ProductVariant/1009b", "title": "L / Orange", "price": "49.00", "sku": "LSW-L-ORG", "inventory_quantity": 5},
         {"id": "gid://shopify/ProductVariant/1009c", "title": "M / Teal", "price": "49.00", "sku": "LSW-M-TEL", "inventory_quantity": 12},
     ]},
    {"id": "gid://shopify/Product/1010", "title": "Heritage Leather Wallet", "type": "Accessories", "handle": "heritage-wallet",
     "price_min": 89.0, "price_max": 89.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1010a", "title": "One Size / Tan", "price": "89.00", "sku": "HLW-OS-TAN", "inventory_quantity": 20},
         {"id": "gid://shopify/ProductVariant/1010b", "title": "One Size / Black", "price": "89.00", "sku": "HLW-OS-BLK", "inventory_quantity": 25},
     ]},
    {"id": "gid://shopify/Product/1011", "title": "Denim Trucker Jacket", "type": "Outerwear", "handle": "denim-trucker",
     "price_min": 79.0, "price_max": 79.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1011a", "title": "S / Indigo", "price": "79.00", "sku": "DTJ-S-IND", "inventory_quantity": 6},
         {"id": "gid://shopify/ProductVariant/1011b", "title": "M / Indigo", "price": "79.00", "sku": "DTJ-M-IND", "inventory_quantity": 4},
         {"id": "gid://shopify/ProductVariant/1011c", "title": "L / Indigo", "price": "79.00", "sku": "DTJ-L-IND", "inventory_quantity": 2},
     ]},
    {"id": "gid://shopify/Product/1012", "title": "Slim Chinos", "type": "Pants", "handle": "slim-chinos",
     "price_min": 68.0, "price_max": 68.0, "status": "active", "vendor": "House Brand",
     "variants": [
         {"id": "gid://shopify/ProductVariant/1012a", "title": "32 / Khaki", "price": "68.00", "sku": "SC-32-KHK", "inventory_quantity": 35},
         {"id": "gid://shopify/ProductVariant/1012b", "title": "34 / Navy", "price": "68.00", "sku": "SC-34-NVY", "inventory_quantity": 30},
     ]},
]

# ── Customers (realistic with varied spend patterns) ───────────────

CUSTOMERS = [
    {"id": "gid://shopify/Customer/2001", "first_name": "Emma", "last_name": "Wilson", "email": "emma.wilson@example.com",
     "orders_count": 8, "total_spent": 847.00, "tags": ["vip", "repeat"], "days_since_last_order": 34},
    {"id": "gid://shopify/Customer/2002", "first_name": "James", "last_name": "Chen", "email": "james.chen@test.io",
     "orders_count": 1, "total_spent": 65.00, "tags": ["new"], "days_since_last_order": 5},
    {"id": "gid://shopify/Customer/2003", "first_name": "Sofia", "last_name": "Martinez", "email": "sofia.m@demo.org",
     "orders_count": 12, "total_spent": 1243.00, "tags": ["vip"], "days_since_last_order": 42},
    {"id": "gid://shopify/Customer/2004", "first_name": "Liam", "last_name": "O'Brien", "email": "liam.obrien@example.com",
     "orders_count": 5, "total_spent": 435.00, "tags": ["repeat"], "days_since_last_order": 28},
    {"id": "gid://shopify/Customer/2005", "first_name": "Ava", "last_name": "Johnson", "email": "ava.j@test.io",
     "orders_count": 2, "total_spent": 142.00, "tags": ["new"], "days_since_last_order": 12},
    {"id": "gid://shopify/Customer/2006", "first_name": "Noah", "last_name": "Kim", "email": "noah.kim@demo.org",
     "orders_count": 15, "total_spent": 2180.00, "tags": ["repeat", "vip"], "days_since_last_order": 51},
    {"id": "gid://shopify/Customer/2007", "first_name": "Mia", "last_name": "Anderson", "email": "mia.a@example.com",
     "orders_count": 3, "total_spent": 289.00, "tags": [], "days_since_last_order": 22},
    {"id": "gid://shopify/Customer/2008", "first_name": "Oliver", "last_name": "Davis", "email": "oliver.d@test.io",
     "orders_count": 1, "total_spent": 185.00, "tags": ["new"], "days_since_last_order": 3},
    {"id": "gid://shopify/Customer/2009", "first_name": "Isabella", "last_name": "Garcia", "email": "isabella.g@demo.org",
     "orders_count": 7, "total_spent": 673.00, "tags": ["vip"], "days_since_last_order": 38},
    {"id": "gid://shopify/Customer/2010", "first_name": "Ethan", "last_name": "Brown", "email": "ethan.b@example.com",
     "orders_count": 4, "total_spent": 312.00, "tags": ["repeat"], "days_since_last_order": 25},
    {"id": "gid://shopify/Customer/2011", "first_name": "Charlotte", "last_name": "Lee", "email": "charlotte.lee@test.io",
     "orders_count": 6, "total_spent": 520.00, "tags": [], "days_since_last_order": 45},
    {"id": "gid://shopify/Customer/2012", "first_name": "Mason", "last_name": "Harris", "email": "mason.h@test.io",
     "orders_count": 9, "total_spent": 1567.00, "tags": ["vip", "repeat"], "days_since_last_order": 31},
    {"id": "gid://shopify/Customer/2013", "first_name": "Scarlett", "last_name": "Lopez", "email": "scarlett.l@test.io",
     "orders_count": 11, "total_spent": 945.00, "tags": ["vip"], "days_since_last_order": 60},
    {"id": "gid://shopify/Customer/2014", "first_name": "Henry", "last_name": "Green", "email": "henry.g@test.io",
     "orders_count": 3, "total_spent": 267.00, "tags": ["repeat"], "days_since_last_order": 15},
    {"id": "gid://shopify/Customer/2015", "first_name": "Zoe", "last_name": "Adams", "email": "zoe.a@demo.org",
     "orders_count": 2, "total_spent": 198.00, "tags": [], "days_since_last_order": 7},
]


async def seed():
    await init_db()
    now = datetime.now(timezone.utc)

    async with get_db_context() as db:
        # ── Clear existing data ─────────────────────────────────
        await db.execute(text("DELETE FROM products"))
        await db.execute(text("DELETE FROM customers"))
        await db.execute(text("DELETE FROM orders"))
        print("Cleared existing data.")

        # ── Seed products ───────────────────────────────────────
        for p in PRODUCTS:
            total_inv = sum(v["inventory_quantity"] for v in p["variants"])
            await db.execute(
                text("""INSERT OR REPLACE INTO products
                    (id, title, handle, status, product_type, vendor,
                     price_min, price_max, variants, collections,
                     featured_image_url, inventory_total, created_at, updated_at)
                    VALUES (:id, :title, :handle, :status, :product_type, :vendor,
                     :price_min, :price_max, :variants, :collections,
                     :featured_image_url, :inventory_total, :created_at, :updated_at)"""),
                {
                    "id": p["id"], "title": p["title"], "handle": p["handle"],
                    "status": p["status"], "product_type": p["type"], "vendor": p["vendor"],
                    "price_min": p["price_min"], "price_max": p["price_max"],
                    "variants": json.dumps(p["variants"]),
                    "collections": json.dumps(["Best Sellers"] if total_inv > 50 else ["New Arrivals"]),
                    "featured_image_url": None, "inventory_total": total_inv,
                    "created_at": (now - timedelta(days=90)).isoformat(),
                    "updated_at": now.isoformat(),
                },
            )
        print(f"Seeded {len(PRODUCTS)} products.")

        # ── Seed customers ──────────────────────────────────────
        for c in CUSTOMERS:
            last_order_at = (now - timedelta(days=c["days_since_last_order"])).isoformat()
            await db.execute(
                text("""INSERT OR REPLACE INTO customers
                    (id, email, first_name, last_name, orders_count,
                     total_spent, tags, created_at, last_order_at)
                    VALUES (:id, :email, :first_name, :last_name, :orders_count,
                     :total_spent, :tags, :created_at, :last_order_at)"""),
                {
                    "id": c["id"], "email": c["email"],
                    "first_name": c["first_name"], "last_name": c["last_name"],
                    "orders_count": c["orders_count"], "total_spent": c["total_spent"],
                    "tags": json.dumps(c["tags"]),
                    "created_at": (now - timedelta(days=random.randint(30, 180))).isoformat(),
                    "last_order_at": last_order_at,
                },
            )
        print(f"Seeded {len(CUSTOMERS)} customers.")

        # ── Seed orders (generate from customer/product combos) ─
        order_count = 0
        for i in range(50):
            customer = random.choice(CUSTOMERS)
            product = random.choice(PRODUCTS)
            variant = random.choice(product["variants"])
            qty = random.randint(1, 3)
            price = float(variant["price"])
            total = price * qty
            days_ago = random.randint(0, 60)

            order_id = f"gid://shopify/Order/{3000 + i}"
            await db.execute(
                text("""INSERT OR REPLACE INTO orders
                    (id, order_number, total_price, subtotal_price,
                     total_discounts, total_tax, currency, financial_status,
                     fulfillment_status, line_items, customer_id, customer_email,
                     customer_name, discount_codes, landing_site, referring_site,
                     processed_at, created_at, is_simulated)
                    VALUES (:id, :order_number, :total_price, :subtotal_price,
                     :total_discounts, :total_tax, :currency, :financial_status,
                     :fulfillment_status, :line_items, :customer_id, :customer_email,
                     :customer_name, :discount_codes, :landing_site, :referring_site,
                     :processed_at, :created_at, :is_simulated)"""),
                {
                    "id": order_id,
                    "order_number": f"#{1000 + i}",
                    "total_price": total,
                    "subtotal_price": total,
                    "total_discounts": 0.0,
                    "total_tax": round(total * 0.08, 2),
                    "currency": "USD",
                    "financial_status": "paid",
                    "fulfillment_status": "fulfilled" if days_ago > 3 else "unfulfilled",
                    "line_items": json.dumps([{
                        "id": f"li-{3000+i}",
                        "title": product["title"],
                        "quantity": qty,
                        "amount": total,
                        "variant_id": variant["id"],
                        "product_id": product["id"],
                    }]),
                    "customer_id": customer["id"],
                    "customer_email": customer["email"],
                    "customer_name": f"{customer['first_name']} {customer['last_name']}",
                    "discount_codes": json.dumps([]),
                    "landing_site": "/",
                    "referring_site": random.choice(["google.com", "instagram.com", "direct", "tiktok.com"]),
                    "processed_at": (now - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat(),
                    "created_at": (now - timedelta(days=days_ago)).isoformat(),
                    "is_simulated": False,
                },
            )
            order_count += 1

        print(f"Seeded {order_count} orders.")
        print("\nLocal seed complete! Restart the backend to pick up data.")


if __name__ == "__main__":
    asyncio.run(seed())
