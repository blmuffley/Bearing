"""Chart generation for reports using matplotlib."""

from __future__ import annotations

import logging
from io import BytesIO

import matplotlib
import matplotlib.pyplot as plt
import numpy as np

from bearing.api.schemas import DimensionScoreResponse

matplotlib.use("Agg")

logger = logging.getLogger(__name__)

# Avennorth colors
OBSIDIAN = "#1C1917"
ELECTRIC_LIME = "#39FF14"
GRAY = "#A8A29E"
BG_DARK = "#0A0A0A"


def generate_dimension_bar_chart(scores: list[DimensionScoreResponse]) -> bytes:
    """Generate a horizontal bar chart of dimension scores."""
    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    dimensions = [s.dimension.value.replace("_", " ").title() for s in scores]
    values = [s.score for s in scores]
    colors = [_score_color(v) for v in values]

    y_pos = np.arange(len(dimensions))
    ax.barh(y_pos, values, color=colors, height=0.6)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(dimensions, color="white", fontsize=10)
    ax.set_xlim(0, 100)
    ax.set_xlabel("Score", color="white")
    ax.tick_params(axis="x", colors="white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color(GRAY)
    ax.spines["left"].set_color(GRAY)

    # Add score labels
    for i, v in enumerate(values):
        ax.text(v + 2, i, str(v), va="center", color="white", fontsize=10)

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def generate_score_donut(score: int) -> bytes:
    """Generate a donut chart for the overall health score."""
    fig, ax = plt.subplots(figsize=(4, 4))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    color = _score_color(score)
    sizes = [score, 100 - score]
    colors_list = [color, "#292524"]

    wedges, _ = ax.pie(
        sizes,
        colors=colors_list,
        startangle=90,
        counterclock=False,
        wedgeprops={"width": 0.3, "edgecolor": BG_DARK},
    )

    ax.text(0, 0, str(score), ha="center", va="center", fontsize=36, fontweight="bold", color="white")
    ax.text(0, -0.15, "/ 100", ha="center", va="top", fontsize=12, color=GRAY)

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def _score_color(score: int) -> str:
    if score >= 75:
        return "#22C55E"
    if score >= 40:
        return "#F59E0B"
    return "#EF4444"
