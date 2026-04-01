"""Tests for the maturity model scorer."""

from __future__ import annotations

from bearing.api.schemas import Dimension, DimensionScoreResponse
from bearing.assessment.maturity import MaturityScorer


def test_level_1_adhoc() -> None:
    scorer = MaturityScorer()
    scores = [
        DimensionScoreResponse(dimension=Dimension.COMPLETENESS, score=20, weight=0.20, checks_passed=0, checks_total=0),
        DimensionScoreResponse(dimension=Dimension.ACCURACY, score=10, weight=0.15, checks_passed=0, checks_total=0),
        DimensionScoreResponse(dimension=Dimension.CSDM, score=5, weight=0.10, checks_passed=0, checks_total=0),
    ]
    level, label = scorer.assess(15, scores, [])
    assert level == 1
    assert label == "Ad-hoc"


def test_level_2_managed() -> None:
    scorer = MaturityScorer()
    scores = [
        DimensionScoreResponse(dimension=Dimension.ACCURACY, score=40, weight=0.15, checks_passed=0, checks_total=0),
        DimensionScoreResponse(dimension=Dimension.CSDM, score=10, weight=0.10, checks_passed=0, checks_total=0),
    ]
    level, label = scorer.assess(35, scores, [])
    assert level == 2
    assert label == "Managed"


def test_level_5_optimized() -> None:
    scorer = MaturityScorer()
    scores = [
        DimensionScoreResponse(dimension=Dimension.ACCURACY, score=95, weight=0.15, checks_passed=0, checks_total=0),
        DimensionScoreResponse(dimension=Dimension.CSDM, score=95, weight=0.10, checks_passed=0, checks_total=0),
    ]
    level, label = scorer.assess(95, scores, [])
    assert level == 5
    assert label == "Optimized"
