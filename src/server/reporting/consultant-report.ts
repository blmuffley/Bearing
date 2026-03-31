/**
 * Consultant Report Generator
 *
 * Generates an internal DOCX report for the consulting firm. Includes ALL data
 * including pricing, margin analysis, and revenue projections. This report is
 * CONFIDENTIAL and NOT shared with the customer.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageBreak,
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
  effortHoursLow: number;
  effortHoursHigh: number;
  riskScore: number;
  compositeScore: number;
  affectedCount: number;
  remediationDescription: string;
  remediationPattern: string;
}

interface RateCardInput {
  blendedRate: number;
  roles?: Array<{ name: string; hourlyRate: number }>;
  marginTarget?: number;
}

interface ConsultantReportParams {
  assessment: AssessmentInput;
  findings: FindingInput[];
  rateCard: RateCardInput;
  orgName: string;
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const COLORS = {
  obsidian: '1A1A2E',
  electricLime: 'CCFF00',
  darkGray: '2D2D3D',
  mediumGray: '6B6B7B',
  white: 'FFFFFF',
  black: '000000',
  lightGray: 'F0F0F0',
  headerBg: '1A1A2E',
  headerText: 'FFFFFF',
  criticalBg: 'FFE0E0',
  warningBg: 'FFF3E0',
  healthyBg: 'E0F5E0',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCurrencyRange(low: number, high: number): string {
  return `${formatCurrency(low)} — ${formatCurrency(high)}`;
}

function formatHoursRange(low: number, high: number): string {
  return `${low.toLocaleString()} — ${high.toLocaleString()}`;
}

function healthLabel(score: number): string {
  if (score < 20) return 'Critical';
  if (score < 40) return 'Poor';
  if (score < 60) return 'Fair';
  if (score < 80) return 'Good';
  return 'Excellent';
}

function domainStatusLabel(score: number): string {
  if (score < 40) return 'Critical';
  if (score < 70) return 'Warning';
  return 'Healthy';
}

function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity.toLowerCase()] ?? severity.toUpperCase();
}

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

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
};

function headerCell(text: string, widthPct?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            color: COLORS.headerText,
            size: 20,
            font: 'Calibri',
          }),
        ],
        spacing: { before: 60, after: 60 },
      }),
    ],
    shading: { type: ShadingType.SOLID, color: COLORS.headerBg },
    borders: TABLE_BORDERS,
    ...(widthPct != null
      ? { width: { size: widthPct, type: WidthType.PERCENTAGE } }
      : {}),
  });
}

function dataCell(
  text: string,
  opts?: {
    bold?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shading?: string;
    widthPct?: number;
  },
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts?.bold ?? false,
            size: 20,
            font: 'Calibri',
          }),
        ],
        alignment: opts?.alignment ?? AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
      }),
    ],
    borders: TABLE_BORDERS,
    ...(opts?.shading
      ? { shading: { type: ShadingType.SOLID, color: opts.shading } }
      : {}),
    ...(opts?.widthPct != null
      ? { width: { size: opts.widthPct, type: WidthType.PERCENTAGE } }
      : {}),
  });
}

function rightCell(text: string, opts?: { bold?: boolean; shading?: string; widthPct?: number }): TableCell {
  return dataCell(text, { alignment: AlignmentType.RIGHT, ...opts });
}

function styledTable(headerRow: TableRow, dataRows: TableRow[]): Table {
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildCoverPage(
  assessment: AssessmentInput,
  orgName: string,
): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Technical Debt Assessment',
          bold: true,
          size: 56,
          font: 'Calibri',
          color: COLORS.obsidian,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'CONFIDENTIAL',
          bold: true,
          size: 40,
          font: 'Calibri',
          color: COLORS.mediumGray,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Internal Consultant Report',
          size: 32,
          font: 'Calibri',
          color: COLORS.darkGray,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Customer: ${assessment.customerName}`,
          size: 24,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Instance: ${assessment.instanceUrl}`,
          size: 24,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    }),
    ...(assessment.instanceVersion
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: `Version: ${assessment.instanceVersion}`,
                size: 24,
                font: 'Calibri',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
          }),
        ]
      : []),
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared by: ${orgName}`,
          size: 24,
          font: 'Calibri',
          color: COLORS.darkGray,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${formatDate(assessment.scanDate)}`,
          size: 24,
          font: 'Calibri',
          color: COLORS.darkGray,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    }),
    new Paragraph({ spacing: { before: 800 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'CONFIDENTIAL — FOR INTERNAL USE ONLY',
          bold: true,
          size: 28,
          font: 'Calibri',
          color: COLORS.mediumGray,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

function buildExecutiveSummary(
  assessment: AssessmentInput,
  findings: FindingInput[],
  rateCard: RateCardInput,
): Paragraph[] {
  const severityCounts = countBySeverity(findings);
  const { totalRevenueLow, totalRevenueHigh, quickWinsRevenueLow, quickWinsRevenueHigh } =
    computeRevenueSummary(findings, rateCard.blendedRate);

  return [
    new Paragraph({
      children: [new TextRun({ text: '' })],
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: 'Executive Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    // Health Score
    new Paragraph({
      children: [
        new TextRun({ text: 'Instance Health Score: ', bold: true, size: 24, font: 'Calibri' }),
        new TextRun({
          text: `${assessment.healthScore}/100 — ${healthLabel(assessment.healthScore)}`,
          bold: true,
          size: 24,
          font: 'Calibri',
        }),
      ],
      spacing: { before: 200, after: 100 },
    }),
    // Total findings
    new Paragraph({
      children: [
        new TextRun({ text: 'Total Findings: ', bold: true, size: 24, font: 'Calibri' }),
        new TextRun({ text: `${findings.length}`, size: 24, font: 'Calibri' }),
      ],
      spacing: { after: 100 },
    }),
    // Severity breakdown
    new Paragraph({
      children: [
        new TextRun({ text: 'Findings by Severity: ', bold: true, size: 24, font: 'Calibri' }),
        new TextRun({
          text: `Critical: ${severityCounts.critical}  |  High: ${severityCounts.high}  |  Medium: ${severityCounts.medium}  |  Low: ${severityCounts.low}`,
          size: 24,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 200 },
    }),
    // Revenue
    new Paragraph({
      children: [
        new TextRun({ text: 'Total Addressable Revenue: ', bold: true, size: 24, font: 'Calibri' }),
        new TextRun({
          text: formatCurrencyRange(totalRevenueLow, totalRevenueHigh),
          size: 24,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Quick Wins Revenue: ', bold: true, size: 24, font: 'Calibri' }),
        new TextRun({
          text: formatCurrencyRange(quickWinsRevenueLow, quickWinsRevenueHigh),
          size: 24,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Blended Rate: ', bold: true, size: 24, font: 'Calibri' }),
        new TextRun({
          text: `${formatCurrency(rateCard.blendedRate)}/hr`,
          size: 24,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 100 },
    }),
  ];
}

function buildRevenueAnalysis(
  findings: FindingInput[],
  rateCard: RateCardInput,
): (Paragraph | Table)[] {
  const blendedRate = rateCard.blendedRate;
  const byModule = aggregateByModule(findings, blendedRate);
  const modules = Object.keys(byModule).sort();

  let totalFindingsCount = 0;
  let totalHoursLow = 0;
  let totalHoursHigh = 0;
  let totalRevLow = 0;
  let totalRevHigh = 0;

  for (const mod of modules) {
    const m = byModule[mod];
    totalFindingsCount += m.count;
    totalHoursLow += m.hoursLow;
    totalHoursHigh += m.hoursHigh;
    totalRevLow += m.revenueLow;
    totalRevHigh += m.revenueHigh;
  }

  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: '' })],
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: 'Revenue Analysis',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Revenue by Module',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 },
    }),
  ];

  // Module revenue table
  const moduleHeader = new TableRow({
    children: [
      headerCell('Module', 25),
      headerCell('Findings', 15),
      headerCell('Hours (Low — High)', 25),
      headerCell('Revenue (Low — High)', 35),
    ],
  });

  const moduleRows = modules.map(
    (mod) =>
      new TableRow({
        children: [
          dataCell(mod.toUpperCase(), { bold: true, widthPct: 25 }),
          rightCell(String(byModule[mod].count), { widthPct: 15 }),
          rightCell(formatHoursRange(byModule[mod].hoursLow, byModule[mod].hoursHigh), { widthPct: 25 }),
          rightCell(formatCurrencyRange(byModule[mod].revenueLow, byModule[mod].revenueHigh), { widthPct: 35 }),
        ],
      }),
  );

  // Total row
  moduleRows.push(
    new TableRow({
      children: [
        dataCell('TOTAL', { bold: true, shading: COLORS.lightGray, widthPct: 25 }),
        rightCell(String(totalFindingsCount), { bold: true, shading: COLORS.lightGray, widthPct: 15 }),
        rightCell(formatHoursRange(totalHoursLow, totalHoursHigh), {
          bold: true,
          shading: COLORS.lightGray,
          widthPct: 25,
        }),
        rightCell(formatCurrencyRange(totalRevLow, totalRevHigh), {
          bold: true,
          shading: COLORS.lightGray,
          widthPct: 35,
        }),
      ],
    }),
  );

  elements.push(styledTable(moduleHeader, moduleRows));

  // Margin analysis
  if (rateCard.marginTarget != null && rateCard.marginTarget > 0) {
    elements.push(
      new Paragraph({ spacing: { before: 300 } }),
      new Paragraph({
        text: 'Margin Analysis',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
    );

    const costLow = totalRevLow * (1 - rateCard.marginTarget);
    const costHigh = totalRevHigh * (1 - rateCard.marginTarget);
    const marginLow = totalRevLow * rateCard.marginTarget;
    const marginHigh = totalRevHigh * rateCard.marginTarget;

    const marginHeader = new TableRow({
      children: [
        headerCell('Metric', 40),
        headerCell('Low Estimate', 30),
        headerCell('High Estimate', 30),
      ],
    });

    const marginRows = [
      new TableRow({
        children: [
          dataCell('Total Revenue', { widthPct: 40 }),
          rightCell(formatCurrency(totalRevLow), { widthPct: 30 }),
          rightCell(formatCurrency(totalRevHigh), { widthPct: 30 }),
        ],
      }),
      new TableRow({
        children: [
          dataCell(`Estimated Cost (at ${formatPercent(1 - rateCard.marginTarget)} of revenue)`, { widthPct: 40 }),
          rightCell(formatCurrency(costLow), { widthPct: 30 }),
          rightCell(formatCurrency(costHigh), { widthPct: 30 }),
        ],
      }),
      new TableRow({
        children: [
          dataCell(`Target Margin (${formatPercent(rateCard.marginTarget)})`, {
            bold: true,
            shading: COLORS.lightGray,
            widthPct: 40,
          }),
          rightCell(formatCurrency(marginLow), {
            bold: true,
            shading: COLORS.lightGray,
            widthPct: 30,
          }),
          rightCell(formatCurrency(marginHigh), {
            bold: true,
            shading: COLORS.lightGray,
            widthPct: 30,
          }),
        ],
      }),
    ];

    elements.push(styledTable(marginHeader, marginRows));
  }

  // Rate card breakdown
  if (rateCard.roles && rateCard.roles.length > 0) {
    elements.push(
      new Paragraph({ spacing: { before: 300 } }),
      new Paragraph({
        text: 'Rate Card Breakdown',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
    );

    const rateHeader = new TableRow({
      children: [headerCell('Role', 60), headerCell('Hourly Rate', 40)],
    });

    const rateRows = rateCard.roles.map(
      (role) =>
        new TableRow({
          children: [
            dataCell(role.name, { widthPct: 60 }),
            rightCell(formatCurrency(role.hourlyRate) + '/hr', { widthPct: 40 }),
          ],
        }),
    );

    // Blended rate row
    rateRows.push(
      new TableRow({
        children: [
          dataCell('Blended Rate', { bold: true, shading: COLORS.lightGray, widthPct: 60 }),
          rightCell(formatCurrency(rateCard.blendedRate) + '/hr', {
            bold: true,
            shading: COLORS.lightGray,
            widthPct: 40,
          }),
        ],
      }),
    );

    elements.push(styledTable(rateHeader, rateRows));
  }

  return elements;
}

function buildDomainHealthScores(
  assessment: AssessmentInput,
  findings: FindingInput[],
): (Paragraph | Table)[] {
  const domains = Object.entries(assessment.domainScores).sort(
    ([, a], [, b]) => a - b,
  );

  const findingCountByDomain: Record<string, number> = {};
  for (const f of findings) {
    const mod = f.module.toLowerCase();
    findingCountByDomain[mod] = (findingCountByDomain[mod] ?? 0) + 1;
  }

  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: '' })],
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: 'Domain Health Scores',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  ];

  const domainHeader = new TableRow({
    children: [
      headerCell('Domain', 30),
      headerCell('Health Score', 20),
      headerCell('Finding Count', 25),
      headerCell('Status', 25),
    ],
  });

  const domainRows = domains.map(([domain, score]) => {
    const status = domainStatusLabel(score);
    let shadingColor: string | undefined;
    if (score < 40) shadingColor = COLORS.criticalBg;
    else if (score < 70) shadingColor = COLORS.warningBg;
    else shadingColor = COLORS.healthyBg;

    return new TableRow({
      children: [
        dataCell(domain.toUpperCase(), { bold: true, widthPct: 30 }),
        rightCell(`${score}/100`, { widthPct: 20 }),
        rightCell(String(findingCountByDomain[domain.toLowerCase()] ?? 0), { widthPct: 25 }),
        dataCell(status, { bold: true, shading: shadingColor, widthPct: 25 }),
      ],
    });
  });

  elements.push(styledTable(domainHeader, domainRows));

  return elements;
}

function buildFindingsDetail(
  findings: FindingInput[],
  blendedRate: number,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: '' })],
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: 'Findings Detail',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  ];

  // Group by module
  const grouped: Record<string, FindingInput[]> = {};
  for (const f of findings) {
    const mod = f.module;
    if (!grouped[mod]) grouped[mod] = [];
    grouped[mod].push(f);
  }

  const sortedModules = Object.keys(grouped).sort();

  for (const mod of sortedModules) {
    // Sort findings within module by composite score descending
    const moduleFindingsList = grouped[mod].sort(
      (a, b) => b.compositeScore - a.compositeScore,
    );

    elements.push(
      new Paragraph({
        text: mod.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
    );

    for (const finding of moduleFindingsList) {
      const revLow = finding.effortHoursLow * finding.affectedCount * blendedRate;
      const revHigh = finding.effortHoursHigh * finding.affectedCount * blendedRate;

      elements.push(
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: finding.title,
              bold: true,
              size: 22,
              font: 'Calibri',
            }),
          ],
          spacing: { before: 200, after: 60 },
        }),
        // Metadata line
        new Paragraph({
          children: [
            new TextRun({
              text: `Severity: ${severityLabel(finding.severity)}`,
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: `  |  Effort: ${finding.effortTshirt}  |  Risk Score: ${finding.riskScore}  |  Composite Score: ${finding.compositeScore.toFixed(2)}  |  Affected Count: ${finding.affectedCount}`,
              size: 20,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 60 },
        }),
        // Description
        new Paragraph({
          children: [
            new TextRun({
              text: finding.description,
              size: 20,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 60 },
        }),
        // Remediation
        new Paragraph({
          children: [
            new TextRun({
              text: 'Remediation: ',
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: finding.remediationDescription,
              size: 20,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 60 },
        }),
        // Revenue impact
        new Paragraph({
          children: [
            new TextRun({
              text: 'Revenue Impact: ',
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: formatCurrencyRange(revLow, revHigh),
              size: 20,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 120 },
        }),
      );
    }
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function countBySeverity(findings: FindingInput[]): Record<string, number> {
  const counts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const f of findings) {
    const sev = f.severity.toLowerCase();
    if (sev in counts) {
      counts[sev]++;
    }
  }
  return counts;
}

interface ModuleAggregate {
  count: number;
  hoursLow: number;
  hoursHigh: number;
  revenueLow: number;
  revenueHigh: number;
}

function aggregateByModule(
  findings: FindingInput[],
  blendedRate: number,
): Record<string, ModuleAggregate> {
  const result: Record<string, ModuleAggregate> = {};
  for (const f of findings) {
    const mod = f.module;
    if (!result[mod]) {
      result[mod] = { count: 0, hoursLow: 0, hoursHigh: 0, revenueLow: 0, revenueHigh: 0 };
    }
    const hoursLow = f.effortHoursLow * f.affectedCount;
    const hoursHigh = f.effortHoursHigh * f.affectedCount;
    result[mod].count++;
    result[mod].hoursLow += hoursLow;
    result[mod].hoursHigh += hoursHigh;
    result[mod].revenueLow += hoursLow * blendedRate;
    result[mod].revenueHigh += hoursHigh * blendedRate;
  }
  return result;
}

const QUICK_WIN_SEVERITIES = new Set(['critical', 'high']);
const QUICK_WIN_EFFORTS = new Set(['XS', 'S']);

function computeRevenueSummary(
  findings: FindingInput[],
  blendedRate: number,
): {
  totalRevenueLow: number;
  totalRevenueHigh: number;
  quickWinsRevenueLow: number;
  quickWinsRevenueHigh: number;
} {
  let totalRevenueLow = 0;
  let totalRevenueHigh = 0;
  let quickWinsRevenueLow = 0;
  let quickWinsRevenueHigh = 0;

  for (const f of findings) {
    const hoursLow = f.effortHoursLow * f.affectedCount;
    const hoursHigh = f.effortHoursHigh * f.affectedCount;
    const revLow = hoursLow * blendedRate;
    const revHigh = hoursHigh * blendedRate;

    totalRevenueLow += revLow;
    totalRevenueHigh += revHigh;

    if (
      QUICK_WIN_SEVERITIES.has(f.severity.toLowerCase()) &&
      QUICK_WIN_EFFORTS.has(f.effortTshirt)
    ) {
      quickWinsRevenueLow += revLow;
      quickWinsRevenueHigh += revHigh;
    }
  }

  return { totalRevenueLow, totalRevenueHigh, quickWinsRevenueLow, quickWinsRevenueHigh };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateConsultantReport(params: ConsultantReportParams): Promise<Buffer> {
  const { assessment, findings, rateCard, orgName } = params;

  const doc = new Document({
    creator: orgName,
    title: `Technical Debt Assessment — ${assessment.customerName} — Consultant Report`,
    description: 'Internal consultant report with pricing and margin analysis. CONFIDENTIAL.',
    styles: {
      default: {
        heading1: {
          run: {
            size: 32,
            bold: true,
            color: COLORS.obsidian,
            font: 'Calibri',
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        heading2: {
          run: {
            size: 26,
            bold: true,
            color: COLORS.darkGray,
            font: 'Calibri',
          },
          paragraph: {
            spacing: { before: 200, after: 80 },
          },
        },
        document: {
          run: {
            size: 22,
            font: 'Calibri',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'CONFIDENTIAL — FOR INTERNAL USE ONLY',
                    bold: true,
                    size: 16,
                    font: 'Calibri',
                    color: COLORS.mediumGray,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `CONFIDENTIAL — ${orgName}`,
                    size: 16,
                    font: 'Calibri',
                    color: COLORS.mediumGray,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // Cover Page
          ...buildCoverPage(assessment, orgName),
          // Executive Summary
          ...buildExecutiveSummary(assessment, findings, rateCard),
          // Revenue Analysis
          ...buildRevenueAnalysis(findings, rateCard),
          // Domain Health Scores
          ...buildDomainHealthScores(assessment, findings),
          // Findings Detail
          ...buildFindingsDetail(findings, rateCard.blendedRate),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
