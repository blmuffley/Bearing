"""Claude API client for AI-powered analysis."""

from __future__ import annotations

import logging

import anthropic

from bearing.config import Settings

logger = logging.getLogger(__name__)


class AIClient:
    """Wrapper around the Anthropic Claude API for assessment analysis."""

    def __init__(self, settings: Settings) -> None:
        self.enabled = settings.has_ai
        if self.enabled:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        else:
            self.client = None

    def generate_summary(self, prompt: str) -> str:
        """Generate an AI summary using Claude.

        Args:
            prompt: The analysis prompt.

        Returns:
            AI-generated text, or empty string if AI is not configured.
        """
        if not self.enabled or not self.client:
            logger.info("AI analysis skipped (ANTHROPIC_API_KEY not configured)")
            return ""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text if message.content else ""
        except Exception:
            logger.exception("AI analysis failed")
            return ""
