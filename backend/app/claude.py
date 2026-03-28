"""
Claude API helper — thin wrapper around the Anthropic Python SDK.

Uses ANTHROPIC_API_KEY from .env. All calls use claude-sonnet-4-20250514 for speed.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    """Lazy-init the Anthropic client."""
    global _client
    if _client is None:
        from app.config import get_settings
        from dotenv import dotenv_values
        from pathlib import Path

        settings = get_settings()
        api_key = settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY") or ""

        # Fallback: read directly from .env if pydantic-settings missed it
        if not api_key:
            repo_root = Path(__file__).resolve().parent.parent.parent
            env_vals = dotenv_values(repo_root / ".env")
            api_key = env_vals.get("ANTHROPIC_API_KEY", "")

        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set in environment")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def call_claude_json(
    system: str,
    user_prompt: str,
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 4096,
) -> dict:
    """
    Call Claude and parse the response as JSON.

    The system prompt should instruct Claude to return valid JSON.
    """
    client = get_client()

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Extract text from response
    text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        # Remove first line (```json or ```) and last line (```)
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse Claude response as JSON: %s", e)
        logger.debug("Raw response: %s", text[:500])
        raise ValueError(f"Claude returned invalid JSON: {e}") from e
