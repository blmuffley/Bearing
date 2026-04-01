---
outline: deep
---

<!--@include: ../../docs/internal/03_fusion_engine_reference.md-->

## Fusion Findings Diagram

![Fusion Findings](/06_fusion_findings.svg)

## FusionFindingGenerator Source

The `FusionFindingGenerator` compares CMDB assessment data with Pathfinder behavioral observations to produce findings that are only detectable when both data sources are available.

### Detection Methods

```python
class FusionFindingGenerator:
    """Generates fusion findings by comparing CMDB data with Pathfinder observations."""

    def __init__(self, confidence_store: ConfidenceStore) -> None:
        self.store = confidence_store

    def generate(self, cmdb_cis: list[dict[str, object]]) -> list[FindingResponse]:
        """Generate fusion findings from CMDB data + Pathfinder confidence."""
        if not self.store.has_data:
            return []

        findings: list[FindingResponse] = []
        cmdb_sys_ids = {str(ci.get("sys_id", "")) for ci in cmdb_cis}

        findings.extend(self._detect_shadow_it(cmdb_sys_ids))
        findings.extend(self._detect_ghost_cis(cmdb_cis))
        findings.extend(self._detect_misclassification(cmdb_cis))
        findings.extend(self._detect_unconfirmed_relationships())
        findings.extend(self._detect_confidence_gaps(cmdb_cis))

        logger.info("Generated %d fusion findings", len(findings))
        return findings
```

### Shadow IT Detection

Detects CIs that Pathfinder observes with active traffic but have no corresponding CMDB record. These represent undocumented infrastructure invisible to change management, security, and compliance.

```python
    def _detect_shadow_it(self, cmdb_sys_ids: set[str]) -> list[FindingResponse]:
        """Detect CIs Pathfinder observes that have no CMDB record."""
        shadow_cis = []
        for sys_id, record in self.store.records.items():
            if sys_id not in cmdb_sys_ids and record.traffic_state.value == "active":
                shadow_cis.append(record)

        if not shadow_cis:
            return []

        return [FindingResponse(
            finding_id=str(uuid.uuid4()),
            finding_type=FindingType.FUSION,
            severity=Severity.CRITICAL,
            dimension=Dimension.COMPLETENESS,
            category="shadow_it",
            title=f"{len(shadow_cis)} active hosts discovered with no CMDB record (Shadow IT)",
            description=(
                f"Pathfinder observes {len(shadow_cis)} hosts with active network traffic "
                f"that have no corresponding CI in the CMDB. These represent undocumented "
                f"infrastructure -- invisible to change management, security, and compliance."
            ),
            affected_count=len(shadow_cis),
            remediation="Create CMDB records for these hosts. Deploy Pathfinder's auto-CI creation to resolve automatically.",
            avennorth_product=AvennorthProduct.PATHFINDER,
            automation_potential=AutomationPotential.FULL,
            fusion_source=FusionSource.FUSION,
        )]
```

### Ghost CI Detection

Detects CIs marked Operational in the CMDB but Pathfinder observes zero or deprecated traffic. These CIs may have been decommissioned without updating the CMDB.

```python
    def _detect_ghost_cis(self, cmdb_cis: list[dict[str, object]]) -> list[FindingResponse]:
        """Detect CIs in CMDB that Pathfinder never observes (ghost CIs)."""
        ghost_count = 0
        for ci in cmdb_cis:
            sys_id = str(ci.get("sys_id", ""))
            status = str(ci.get("operational_status", ""))
            record = self.store.records.get(sys_id)

            if status == "1":  # Operational
                if record and record.traffic_state.value == "deprecated":
                    ghost_count += 1
                elif not record and sys_id not in self.store.records:
                    pass  # Not monitored -- can't determine ghost status

        if ghost_count == 0:
            return []

        return [FindingResponse(
            finding_id=str(uuid.uuid4()),
            finding_type=FindingType.FUSION,
            severity=Severity.HIGH,
            dimension=Dimension.ACCURACY,
            category="ghost_cis",
            title=f"{ghost_count} 'Operational' CIs with no observed traffic (Ghost CIs)",
            description=(
                f"{ghost_count} CIs are marked 'Operational' in the CMDB but Pathfinder "
                f"has observed zero or deprecated traffic. These CIs may have been "
                f"decommissioned without updating the CMDB."
            ),
            affected_count=ghost_count,
            remediation="Validate these CIs against current infrastructure. Update status to Retired if decommissioned.",
            avennorth_product=AvennorthProduct.PATHFINDER,
            automation_potential=AutomationPotential.PARTIAL,
            fusion_source=FusionSource.FUSION,
        )]
```

### Misclassification Detection

Detects CIs where Pathfinder behavioral analysis (based on observed traffic patterns) suggests a different CMDB class than what is recorded, with high confidence.

```python
    def _detect_misclassification(self, cmdb_cis: list[dict[str, object]]) -> list[FindingResponse]:
        """Detect CIs where Pathfinder behavioral classification disagrees with CMDB."""
        misclassified = 0
        for ci in cmdb_cis:
            sys_id = str(ci.get("sys_id", ""))
            cmdb_class = str(ci.get("sys_class_name", ""))
            record = self.store.records.get(sys_id)

            if record and record.behavioral_classification:
                bc = record.behavioral_classification
                if bc.suggested_class != cmdb_class and bc.classification_confidence > 75:
                    misclassified += 1

        if misclassified == 0:
            return []

        return [FindingResponse(
            finding_id=str(uuid.uuid4()),
            finding_type=FindingType.FUSION,
            severity=Severity.HIGH,
            dimension=Dimension.CLASSIFICATION,
            category="behavioral_misclassification",
            title=f"{misclassified} CIs with behavioral class mismatch",
            description=(
                f"Pathfinder behavioral analysis suggests {misclassified} CIs should be "
                f"classified differently based on observed traffic patterns. High-confidence "
                f"mismatches indicate CMDB class assignment errors."
            ),
            affected_count=misclassified,
            remediation="Review Pathfinder's suggested classifications and reclassify affected CIs.",
            avennorth_product=AvennorthProduct.PATHFINDER,
            automation_potential=AutomationPotential.PARTIAL,
            fusion_source=FusionSource.FUSION,
        )]
```

### Unconfirmed Relationships and Confidence Gaps

```python
    def _detect_unconfirmed_relationships(self) -> list[FindingResponse]:
        """Detect CMDB relationships with no observed traffic backing them."""
        unconfirmed = 0
        for record in self.store.records.values():
            for rel in record.relationship_confirmations:
                if not rel.confirmed:
                    unconfirmed += 1

        if unconfirmed == 0:
            return []

        return [FindingResponse(
            finding_id=str(uuid.uuid4()),
            finding_type=FindingType.FUSION,
            severity=Severity.MEDIUM,
            dimension=Dimension.RELATIONSHIPS,
            category="unconfirmed_relationships",
            title=f"{unconfirmed} CMDB relationships not confirmed by traffic observation",
            description=(
                f"{unconfirmed} relationships exist in the CMDB but Pathfinder has not "
                f"observed network traffic between the connected CIs. These relationships "
                f"may be stale or incorrectly mapped."
            ),
            affected_count=unconfirmed,
            remediation="Review unconfirmed relationships. Remove stale entries and validate remaining with application teams.",
            avennorth_product=AvennorthProduct.PATHFINDER,
            automation_potential=AutomationPotential.PARTIAL,
            fusion_source=FusionSource.FUSION,
        )]

    def _detect_confidence_gaps(self, cmdb_cis: list[dict[str, object]]) -> list[FindingResponse]:
        """Detect CIs marked operational but with low Pathfinder confidence."""
        low_confidence = 0
        for ci in cmdb_cis:
            sys_id = str(ci.get("sys_id", ""))
            status = str(ci.get("operational_status", ""))
            record = self.store.records.get(sys_id)

            if status == "1" and record and record.confidence_score < 30:
                low_confidence += 1

        if low_confidence == 0:
            return []

        return [FindingResponse(
            finding_id=str(uuid.uuid4()),
            finding_type=FindingType.FUSION,
            severity=Severity.MEDIUM,
            dimension=Dimension.ACCURACY,
            category="low_confidence_operational",
            title=f"{low_confidence} 'Operational' CIs with low Pathfinder confidence (<30%)",
            description=(
                f"{low_confidence} CIs are marked Operational but Pathfinder has low "
                f"confidence in their data accuracy. These CIs may need manual verification."
            ),
            affected_count=low_confidence,
            remediation="Investigate CIs with low confidence scores. Validate data and update CMDB records.",
            fusion_source=FusionSource.FUSION,
        )]
```
