# Frequently Asked Questions

## General

**Q: What ServiceNow versions does Bearing support?**
A: Bearing supports all actively maintained ServiceNow versions (Tokyo, Utah, Vancouver, Washington, Xanadu, and newer).

**Q: Does Bearing make changes to the ServiceNow instance?**
A: No. Bearing only reads configuration metadata. It never modifies, creates, or deletes records in your instance.

**Q: How long does an assessment take?**
A: Export-based assessments complete in seconds. Live API scans typically take 5-15 minutes depending on instance size.

**Q: Is my data secure?**
A: Yes. All data is encrypted in transit and at rest. Each organization's data is completely isolated using row-level security. Credentials are encrypted with AES-256-GCM.

## Assessments

**Q: How often should I run assessments?**
A: We recommend quarterly assessments to track progress. After major upgrades or changes, an immediate assessment helps identify new issues.

**Q: What happens to old assessments?**
A: Assessments remain fully visible for 30 days, then visibility is gradually reduced. After 90 days, only summary scores are retained.

**Q: Can I compare two assessments?**
A: Yes. The Trends page shows health score trends over time. You can also compare two specific assessments side-by-side to see what changed.

## Reports

**Q: Can I customize the customer report branding?**
A: Yes. Upload your logo, set brand colors, and add legal text in Settings → Branding.

**Q: What format are reports generated in?**
A: Reports and SOWs are generated as Microsoft Word (DOCX) files.

**Q: Can I edit the SOW after generating it?**
A: Yes. The generated DOCX can be opened and edited in Microsoft Word or Google Docs before sending to the customer.

## Pathfinder Integration

**Q: What is Pathfinder?**
A: Pathfinder is Avennorth's service discovery platform that uses eBPF/ETW agents to observe actual network traffic. When Pathfinder data is available, Bearing can detect issues that static analysis alone cannot find.

**Q: Do I need Pathfinder to use Bearing?**
A: No. Bearing works completely independently. Pathfinder data is additive — it enriches assessments when available but is never required.

**Q: What are fusion findings?**
A: Fusion findings are issues that can only be detected when both Bearing assessment data and Pathfinder behavioral data are available. For example, a CI marked "Active" in the CMDB but showing no traffic is a fusion finding.
