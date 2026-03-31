/**
 * Customer-facing report generator (white-labeled, no pricing).
 *
 * Produces a DOCX report focused on risk and remediation guidance,
 * branded with the consulting org's identity. Contains NO pricing,
 * revenue, margin, rate card, effort estimates, or hours.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertInchesToTwip,
} from 'docx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentInput {
  id: string;
  customerName: string;
  instanceUrl: string;
  healthScore: number;
  domainScores: Record<string, number>;
  scanDate: string;
  instanceVersion?: string;
}

interface FindingInput {
  id: string;
  title: string;
  description: string;
  module: string;
  category: string;
  severity: string;
  effortTshirt: string;
  riskScore: number;
  compositeScore: number;
  affectedCount: number;
  remediationDescription: string;
}

interface BrandingInput {
  orgName: string;
  primaryColor?: string;   // hex like '#CCFF00'
  secondaryColor?: string; // hex like '#1A1A2E'
  legalText?: string;
}

interface CustomerReportParams {
  assessment: AssessmentInput;
  findings: FindingInput[];
  branding: BrandingInput;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip leading '#' from a hex color for docx (which expects bare hex). */
function hex(color: string | undefined, fallback: string): string {
  const c = color ?? fallback;
  return c.startsWith('#') ? c.slice(1) : c;
}

/** Format a date string into a human-readable form. */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Capitalize the first letter of a string. */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Format a module key as a readable label (e.g. "cmdb" -> "CMDB"). */
function moduleLabel(mod: string): string {
  const uppers = new Set(['cmdb', 'itsm', 'itam', 'hrsd', 'spm', 'secops', 'grc', 'csm', 'itom', 'ea']);
  if (uppers.has(mod.toLowerCase())) return mod.toUpperCase();
  return capitalize(mod);
}

/** Severity sort order (highest first). */
const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function severitySortKey(s: string): number {
  return SEVERITY_ORDER[s.toLowerCase()] ?? 99;
}

/** Recommended action timeline by severity. */
function actionTimeline(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return 'Immediate (0-30 days)';
    case 'high':     return 'Short-term (30-60 days)';
    case 'medium':   return 'Medium-term (60-120 days)';
    case 'low':      return 'Scheduled maintenance';
    default:         return 'As needed';
  }
}

/** Risk level label based on a 0-100 score. */
function riskLevel(score: number): string {
  if (score >= 80) return 'Low Risk';
  if (score >= 60) return 'Moderate Risk';
  if (score >= 40) return 'Elevated Risk';
  return 'High Risk';
}

/** Qualitative assessment text based on health score. */
function qualitativeAssessment(score: number): string {
  if (score >= 80) {
    return 'Your instance is in good health with minor improvements recommended. The platform is well-maintained and follows ServiceNow best practices in most areas. We recommend addressing the identified items during regular maintenance cycles to maintain this strong posture.';
  }
  if (score >= 60) {
    return 'Your instance is in fair health with several areas for improvement. While the platform is functional, there are configuration patterns and technical debt items that, if left unaddressed, could lead to increased maintenance burden and operational risk over time.';
  }
  if (score >= 40) {
    return 'Your instance has substantial technical debt that should be addressed in the near term. Multiple areas of the platform show patterns that increase operational risk, hinder upgrades, and create unnecessary complexity. A structured remediation plan is strongly recommended.';
  }
  return 'Your instance has critical technical debt that poses significant operational risk. The current state of the platform presents challenges for stability, security, and future upgrades. We strongly recommend immediate remediation of the most critical items followed by a phased approach to address remaining debt.';
}

// ---------------------------------------------------------------------------
// Table builder helpers
// ---------------------------------------------------------------------------

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'CCCCCC',
};

const ALL_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
};

function headerCell(text: string, widthPct: number, secondaryColor: string): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: secondaryColor, fill: secondaryColor },
    borders: ALL_BORDERS,
    children: [
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text, bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' }),
        ],
      }),
    ],
  });
}

function dataCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: ALL_BORDERS,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text, size: 20, font: 'Calibri' }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildCoverPage(
  assessment: AssessmentInput,
  branding: BrandingInput,
  primaryColor: string,
  secondaryColor: string,
): Paragraph[] {
  return [
    // Spacer
    new Paragraph({ spacing: { before: 3000 } }),
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'ServiceNow Platform',
          size: 56,
          bold: true,
          color: secondaryColor,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: 'Health Assessment',
          size: 56,
          bold: true,
          color: secondaryColor,
          font: 'Calibri',
        }),
      ],
    }),
    // Accent bar (simulated with a colored line of text)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: '________________________________________',
          color: primaryColor,
          size: 28,
          bold: true,
        }),
      ],
    }),
    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Prepared for ${assessment.customerName}`,
          size: 32,
          color: '666666',
          font: 'Calibri',
        }),
      ],
    }),
    // Prepared by
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Prepared by ${branding.orgName}`,
          size: 24,
          color: '888888',
          font: 'Calibri',
        }),
      ],
    }),
    // Date
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: formatDate(assessment.scanDate),
          size: 24,
          color: '888888',
          font: 'Calibri',
        }),
      ],
    }),
    // Instance
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Instance: ${assessment.instanceUrl}`,
          size: 20,
          color: '888888',
          font: 'Calibri',
        }),
      ],
    }),
    // Version (if available)
    ...(assessment.instanceVersion
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `Version: ${assessment.instanceVersion}`,
                size: 20,
                color: '888888',
                font: 'Calibri',
              }),
            ],
          }),
        ]
      : []),
  ];
}

function buildExecutiveSummary(
  assessment: AssessmentInput,
  findings: FindingInput[],
  secondaryColor: string,
): Paragraph[] {
  // Count findings by severity
  const countsBySeverity: Record<string, number> = {};
  for (const f of findings) {
    const sev = f.severity.toLowerCase();
    countsBySeverity[sev] = (countsBySeverity[sev] ?? 0) + 1;
  }

  // Top 3 modules by worst domain score
  const domainEntries = Object.entries(assessment.domainScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3);

  const paragraphs: Paragraph[] = [
    // Page break
    new Paragraph({ children: [new PageBreak()] }),
    // Heading
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Executive Summary',
          bold: true,
          color: secondaryColor,
          size: 36,
          font: 'Calibri',
        }),
      ],
    }),
    // Health score
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Your ServiceNow instance health score is ${assessment.healthScore}/100.`,
          size: 28,
          bold: true,
          font: 'Calibri',
        }),
      ],
    }),
    // Qualitative assessment
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: qualitativeAssessment(assessment.healthScore),
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
    // Findings summary heading
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'Findings Summary',
          bold: true,
          color: secondaryColor,
          size: 28,
          font: 'Calibri',
        }),
      ],
    }),
  ];

  // Findings by severity list
  for (const sev of ['critical', 'high', 'medium', 'low']) {
    const count = countsBySeverity[sev] ?? 0;
    if (count > 0) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: `${capitalize(sev)}: `,
              bold: true,
              size: 22,
              font: 'Calibri',
            }),
            new TextRun({
              text: `${count} finding${count !== 1 ? 's' : ''}`,
              size: 22,
              font: 'Calibri',
            }),
          ],
        }),
      );
    }
  }

  // Total
  paragraphs.push(
    new Paragraph({
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({
          text: `Total: ${findings.length} finding${findings.length !== 1 ? 's' : ''} identified across ${Object.keys(assessment.domainScores).length} domains.`,
          size: 22,
          italics: true,
          font: 'Calibri',
        }),
      ],
    }),
  );

  // Key risk areas
  if (domainEntries.length > 0) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'Key Risk Areas',
            bold: true,
            color: secondaryColor,
            size: 28,
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: 'The following domains represent the highest areas of risk based on health score analysis:',
            size: 22,
            font: 'Calibri',
          }),
        ],
      }),
    );

    for (const [domain, score] of domainEntries) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: `${moduleLabel(domain)}: `,
              bold: true,
              size: 22,
              font: 'Calibri',
            }),
            new TextRun({
              text: `${score}/100 (${riskLevel(score)})`,
              size: 22,
              font: 'Calibri',
            }),
          ],
        }),
      );
    }
  }

  return paragraphs;
}

function buildRiskOverview(
  assessment: AssessmentInput,
  findings: FindingInput[],
  secondaryColor: string,
): (Paragraph | Table)[] {
  // Count by severity
  const countsBySeverity: Record<string, number> = {};
  for (const f of findings) {
    const sev = f.severity.toLowerCase();
    countsBySeverity[sev] = (countsBySeverity[sev] ?? 0) + 1;
  }

  const severities = ['critical', 'high', 'medium', 'low'].filter(
    (s) => (countsBySeverity[s] ?? 0) > 0,
  );

  const elements: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Risk Overview',
          bold: true,
          color: secondaryColor,
          size: 36,
          font: 'Calibri',
        }),
      ],
    }),
    // Severity summary table
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'Severity Distribution',
          bold: true,
          color: secondaryColor,
          size: 28,
          font: 'Calibri',
        }),
      ],
    }),
  ];

  // Severity table
  const sevHeaderRow = new TableRow({
    children: [
      headerCell('Severity', 30, secondaryColor),
      headerCell('Count', 25, secondaryColor),
      headerCell('Recommended Action Timeline', 45, secondaryColor),
    ],
  });

  const sevDataRows = severities.map(
    (sev) =>
      new TableRow({
        children: [
          dataCell(capitalize(sev), 30),
          dataCell(String(countsBySeverity[sev] ?? 0), 25),
          dataCell(actionTimeline(sev), 45),
        ],
      }),
  );

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [sevHeaderRow, ...sevDataRows],
    }),
  );

  // Domain health table
  const domainEntries = Object.entries(assessment.domainScores).sort(
    ([, a], [, b]) => a - b,
  );

  if (domainEntries.length > 0) {
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 100 },
        children: [
          new TextRun({
            text: 'Domain Health Scores',
            bold: true,
            color: secondaryColor,
            size: 28,
            font: 'Calibri',
          }),
        ],
      }),
    );

    const domainHeaderRow = new TableRow({
      children: [
        headerCell('Domain', 40, secondaryColor),
        headerCell('Score', 25, secondaryColor),
        headerCell('Risk Level', 35, secondaryColor),
      ],
    });

    const domainDataRows = domainEntries.map(
      ([domain, score]) =>
        new TableRow({
          children: [
            dataCell(moduleLabel(domain), 40),
            dataCell(`${score}/100`, 25),
            dataCell(riskLevel(score), 35),
          ],
        }),
    );

    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [domainHeaderRow, ...domainDataRows],
      }),
    );
  }

  return elements;
}

function buildPriorityRecommendations(
  findings: FindingInput[],
  secondaryColor: string,
): Paragraph[] {
  const top10 = [...findings]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 10);

  const paragraphs: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Priority Recommendations',
          bold: true,
          color: secondaryColor,
          size: 36,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'The following items represent the highest-priority findings based on a composite analysis of severity, risk, and remediation impact. We recommend addressing these items first.',
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
  ];

  for (let i = 0; i < top10.length; i++) {
    const f = top10[i];
    paragraphs.push(
      // Title
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 80 },
        children: [
          new TextRun({
            text: `${i + 1}. ${f.title}`,
            bold: true,
            size: 24,
            font: 'Calibri',
            color: secondaryColor,
          }),
        ],
      }),
      // Severity + risk
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Severity: ${capitalize(f.severity)}`,
            bold: true,
            size: 20,
            font: 'Calibri',
          }),
          new TextRun({
            text: `  |  Risk Level: ${riskLevel(100 - f.riskScore * 20)}`,
            size: 20,
            font: 'Calibri',
          }),
        ],
      }),
      // What we found
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: 'What we found: ',
            bold: true,
            size: 20,
            font: 'Calibri',
          }),
          new TextRun({
            text: f.description,
            size: 20,
            font: 'Calibri',
          }),
        ],
      }),
      // What we recommend
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: 'What we recommend: ',
            bold: true,
            size: 20,
            font: 'Calibri',
          }),
          new TextRun({
            text: f.remediationDescription,
            size: 20,
            font: 'Calibri',
          }),
        ],
      }),
      // Impact
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: 'Impact: ',
            bold: true,
            size: 20,
            font: 'Calibri',
          }),
          new TextRun({
            text: `${f.affectedCount} affected item${f.affectedCount !== 1 ? 's' : ''}`,
            size: 20,
            font: 'Calibri',
          }),
        ],
      }),
    );
  }

  return paragraphs;
}

function buildDetailedFindings(
  findings: FindingInput[],
  secondaryColor: string,
): Paragraph[] {
  // Group by module
  const byModule: Record<string, FindingInput[]> = {};
  for (const f of findings) {
    const mod = f.module || 'Other';
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(f);
  }

  // Sort modules alphabetically, sort findings within each by severity then composite
  const moduleKeys = Object.keys(byModule).sort();

  const paragraphs: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Detailed Findings',
          bold: true,
          color: secondaryColor,
          size: 36,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'The following section provides a complete inventory of all findings identified during the assessment, organized by platform domain.',
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
  ];

  for (const mod of moduleKeys) {
    const moduleFindings = byModule[mod].sort((a, b) => {
      const sevDiff = severitySortKey(a.severity) - severitySortKey(b.severity);
      if (sevDiff !== 0) return sevDiff;
      return b.compositeScore - a.compositeScore;
    });

    // Module heading
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: moduleLabel(mod),
            bold: true,
            color: secondaryColor,
            size: 28,
            font: 'Calibri',
          }),
          new TextRun({
            text: `  (${moduleFindings.length} finding${moduleFindings.length !== 1 ? 's' : ''})`,
            size: 22,
            color: '888888',
            font: 'Calibri',
          }),
        ],
      }),
    );

    for (const f of moduleFindings) {
      paragraphs.push(
        // Finding title
        new Paragraph({
          spacing: { before: 200, after: 60 },
          children: [
            new TextRun({
              text: f.title,
              bold: true,
              size: 22,
              font: 'Calibri',
            }),
          ],
        }),
        // Severity | Risk score
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${capitalize(f.severity)} Severity`,
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: `  |  Risk Score: ${f.riskScore}/5`,
              size: 20,
              font: 'Calibri',
            }),
          ],
        }),
        // Description
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: 'Description: ',
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: f.description,
              size: 20,
              font: 'Calibri',
            }),
          ],
        }),
        // Remediation
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: 'Recommended Remediation: ',
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: f.remediationDescription,
              size: 20,
              font: 'Calibri',
            }),
          ],
        }),
        // Affected count
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: 'Affected Items: ',
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: String(f.affectedCount),
              size: 20,
              font: 'Calibri',
            }),
          ],
        }),
      );
    }
  }

  return paragraphs;
}

function buildNextSteps(
  branding: BrandingInput,
  secondaryColor: string,
): Paragraph[] {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Next Steps',
          bold: true,
          color: secondaryColor,
          size: 36,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'We recommend the following engagement approach:',
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      numbering: { reference: 'next-steps', level: 0 },
      children: [
        new TextRun({
          text: 'Address critical findings within the first 30 days.',
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: ' Critical items represent the highest risk to platform stability, security, and upgrade readiness. These should be prioritized immediately.',
          size: 22,
          font: 'Calibri',
          color: '666666',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      numbering: { reference: 'next-steps', level: 0 },
      children: [
        new TextRun({
          text: 'Plan remediation sprints for high-severity items.',
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: ' High-severity findings should be addressed in structured sprints over the following 30-60 days, with clear ownership and acceptance criteria.',
          size: 22,
          font: 'Calibri',
          color: '666666',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      numbering: { reference: 'next-steps', level: 0 },
      children: [
        new TextRun({
          text: 'Schedule a follow-up assessment in 90 days.',
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: ' A reassessment will validate remediation progress, identify any new technical debt, and establish a trend line for platform health improvement.',
          size: 22,
          font: 'Calibri',
          color: '666666',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: `Contact ${branding.orgName} to discuss a remediation roadmap tailored to your organization's priorities, resources, and timeline.`,
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
  ];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateCustomerReport(params: CustomerReportParams): Promise<Buffer> {
  const { assessment, findings, branding } = params;

  const primaryColor = hex(branding.primaryColor, '#CCFF00');
  const secondaryColor = hex(branding.secondaryColor, '#1A1A2E');

  // Build footer text
  const footerParts: TextRun[] = [
    new TextRun({
      text: `${branding.orgName}`,
      size: 16,
      color: '888888',
      font: 'Calibri',
    }),
  ];

  if (branding.legalText) {
    footerParts.push(
      new TextRun({
        text: `  |  ${branding.legalText}`,
        size: 16,
        color: '888888',
        font: 'Calibri',
      }),
    );
  }

  footerParts.push(
    new TextRun({
      text: '  |  Page ',
      size: 16,
      color: '888888',
      font: 'Calibri',
    }),
    new TextRun({
      children: [PageNumber.CURRENT],
      size: 16,
      color: '888888',
      font: 'Calibri',
    }),
  );

  // Assemble all sections into one document section
  const children: (Paragraph | Table)[] = [
    ...buildCoverPage(assessment, branding, primaryColor, secondaryColor),
    ...buildExecutiveSummary(assessment, findings, secondaryColor),
    ...buildRiskOverview(assessment, findings, secondaryColor),
    ...buildPriorityRecommendations(findings, secondaryColor),
    ...buildDetailedFindings(findings, secondaryColor),
    ...buildNextSteps(branding, secondaryColor),
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'next-steps',
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.3) },
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: branding.orgName,
                    size: 16,
                    color: '888888',
                    font: 'Calibri',
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: footerParts,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
