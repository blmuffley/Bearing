/**
 * SOW (Statement of Work) Document Generator
 *
 * Generates a professional DOCX document from selected findings with scope,
 * pricing, milestones, and deliverables. Pulls remediation pattern templates
 * for pre-written scope language, assumptions, deliverables, and exclusions.
 *
 * This is the money feature -- the assessment-to-SOW pipeline that converts
 * technical debt findings into a ready-to-send engagement proposal.
 */

import {
  Document,
  FileChild,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  PageBreak,
  ShadingType,
  convertInchesToTwip,
} from 'docx';

import type { EngagementType } from '@/types/sow';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface SowFinding {
  id: string;
  title: string;
  description: string;
  module: string;
  severity: string;
  effortTshirt: string;
  effortHoursLow: number;
  effortHoursHigh: number;
  affectedCount: number;
  remediationPattern: string;
  remediationDescription: string;
}

export interface SowRemediationPattern {
  patternKey: string;
  displayName: string;
  sowScopeTemplate?: string;
  sowAssumptions?: string;
  sowDeliverables?: string[];
  sowExclusions?: string;
  requiredRoles?: string[];
}

export interface SowRateCard {
  blendedRate: number;
  roles?: Array<{ name: string; hourlyRate: number }>;
  marginTarget?: number;
}

export interface SowTimeline {
  startDate: string;
  durationWeeks: number;
}

export interface SowBranding {
  primaryColor?: string;
  legalText?: string;
}

export interface GenerateSowParams {
  customerName: string;
  orgName: string;
  preparedBy: string;
  date: string;
  engagementType: EngagementType;
  findings: SowFinding[];
  remediationPatterns: SowRemediationPattern[];
  rateCard: SowRateCard;
  timeline?: SowTimeline;
  branding?: SowBranding;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat('en-US');

function fmtCurrency(value: number): string {
  return currencyFmt.format(value);
}

function fmtNumber(value: number): string {
  return numberFmt.format(value);
}

/** Map hex string to docx-compatible hex (strip leading #). */
function hexColor(color?: string): string {
  return (color ?? '1A1A2E').replace(/^#/, '');
}

/** Human-readable engagement type label. */
function engagementLabel(type: EngagementType): string {
  switch (type) {
    case 'time_and_materials':
      return 'Time & Materials';
    case 'fixed_fee':
      return 'Fixed Fee';
    case 'blended':
      return 'Blended (Time & Materials + Fixed Fee)';
  }
}

/** Human-readable module name. */
function moduleDisplayName(module: string): string {
  const map: Record<string, string> = {
    core: 'Core Platform',
    cmdb: 'CMDB / CSDM',
    itsm: 'IT Service Management',
    itam: 'IT Asset Management',
    hrsd: 'HR Service Delivery',
    spm: 'Strategic Portfolio Management',
    secops: 'Security Operations',
    grc: 'Governance, Risk & Compliance',
    csm: 'Customer Service Management',
    itom: 'IT Operations Management',
    ea: 'Enterprise Architecture',
  };
  return map[module] ?? module.toUpperCase();
}

/** Build a lookup from patternKey -> pattern object. */
function buildPatternMap(
  patterns: SowRemediationPattern[],
): Map<string, SowRemediationPattern> {
  const map = new Map<string, SowRemediationPattern>();
  for (const p of patterns) {
    map.set(p.patternKey, p);
  }
  return map;
}

/** Group findings by module, then within each module by remediation pattern. */
interface ModuleGroup {
  module: string;
  patternGroups: PatternGroup[];
  totalHoursLow: number;
  totalHoursHigh: number;
}

interface PatternGroup {
  patternKey: string;
  pattern: SowRemediationPattern | undefined;
  findings: SowFinding[];
  totalHoursLow: number;
  totalHoursHigh: number;
  totalAffected: number;
}

function groupFindings(
  findings: SowFinding[],
  patternMap: Map<string, SowRemediationPattern>,
): ModuleGroup[] {
  // Group by module
  const moduleMap = new Map<string, SowFinding[]>();
  for (const f of findings) {
    const key = f.module || 'core';
    if (!moduleMap.has(key)) moduleMap.set(key, []);
    moduleMap.get(key)!.push(f);
  }

  const result: ModuleGroup[] = [];
  for (const [module, moduleFindings] of moduleMap) {
    // Sub-group by remediation pattern
    const patternGroupMap = new Map<string, SowFinding[]>();
    for (const f of moduleFindings) {
      const pk = f.remediationPattern || 'general';
      if (!patternGroupMap.has(pk)) patternGroupMap.set(pk, []);
      patternGroupMap.get(pk)!.push(f);
    }

    const patternGroups: PatternGroup[] = [];
    let moduleLow = 0;
    let moduleHigh = 0;
    for (const [patternKey, pFindings] of patternGroupMap) {
      let low = 0;
      let high = 0;
      let affected = 0;
      for (const f of pFindings) {
        low += f.effortHoursLow * f.affectedCount;
        high += f.effortHoursHigh * f.affectedCount;
        affected += f.affectedCount;
      }
      moduleLow += low;
      moduleHigh += high;
      patternGroups.push({
        patternKey,
        pattern: patternMap.get(patternKey),
        findings: pFindings,
        totalHoursLow: low,
        totalHoursHigh: high,
        totalAffected: affected,
      });
    }

    result.push({
      module,
      patternGroups,
      totalHoursLow: moduleLow,
      totalHoursHigh: moduleHigh,
    });
  }

  // Sort modules alphabetically for consistent output
  result.sort((a, b) => a.module.localeCompare(b.module));
  return result;
}

// ---------------------------------------------------------------------------
// Reusable paragraph / table builders
// ---------------------------------------------------------------------------

const STANDARD_DELIVERABLES = [
  'Remediation completion report',
  'Updated documentation for all modified configurations',
  'Knowledge transfer session',
];

const STANDARD_ASSUMPTIONS = [
  'Client will provide access to a sub-production instance for testing',
  'Client will provide a designated point of contact',
  'Work will be performed remotely unless otherwise specified',
  'Change management processes will be followed for all production changes',
];

const STANDARD_EXCLUSIONS = [
  'New feature development or enhancements beyond remediation scope',
  'Third-party application integration changes',
  'Data migration services',
];

function blankLine(): Paragraph {
  return new Paragraph({ text: '' });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading: level });
}

function bodyText(text: string, opts?: { bold?: boolean; italic?: boolean }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        italics: opts?.italic,
        size: 22, // 11pt
        font: 'Calibri',
      }),
    ],
    spacing: { after: 120 },
  });
}

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, size: 22, font: 'Calibri' }),
    ],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function numberedItem(text: string, num: number): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num}. ${text}`, size: 22, font: 'Calibri' }),
    ],
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.25) },
  });
}

/** Simple table with optional header shading. */
function simpleTable(
  headers: string[],
  rows: string[][],
  primaryColor: string,
): Table {
  const headerCells = headers.map(
    (h) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: h, bold: true, size: 20, font: 'Calibri', color: 'FFFFFF' }),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ],
        shading: { fill: primaryColor, type: ShadingType.SOLID, color: primaryColor },
        width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      }),
  );

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, size: 20, font: 'Calibri' })],
                }),
              ],
              width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
            }),
        ),
      }),
  );

  return new Table({
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildCoverPage(params: GenerateSowParams, color: string): FileChild[] {
  const spacer = (lines: number) =>
    new Paragraph({
      children: [new TextRun({ text: '', size: 22 })],
      spacing: { before: lines * 240 },
    });

  return [
    spacer(6),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Statement of Work',
          bold: true,
          size: 56, // 28pt
          font: 'Calibri',
          color,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'ServiceNow Platform Remediation Services',
          size: 32, // 16pt
          font: 'Calibri',
          color: '6B6B7B',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    spacer(2),
    new Paragraph({
      children: [
        new TextRun({ text: 'Prepared for: ', size: 24, font: 'Calibri', color: '6B6B7B' }),
        new TextRun({ text: params.customerName, bold: true, size: 24, font: 'Calibri' }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Prepared by: ', size: 24, font: 'Calibri', color: '6B6B7B' }),
        new TextRun({ text: params.orgName, bold: true, size: 24, font: 'Calibri' }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Author: ', size: 24, font: 'Calibri', color: '6B6B7B' }),
        new TextRun({ text: params.preparedBy, bold: true, size: 24, font: 'Calibri' }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', size: 24, font: 'Calibri', color: '6B6B7B' }),
        new TextRun({ text: params.date, bold: true, size: 24, font: 'Calibri' }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    spacer(1),
    new Paragraph({
      children: [
        new TextRun({
          text: '1.0 \u2014 DRAFT',
          size: 22,
          font: 'Calibri',
          color: '999999',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

function buildTableOfContents(): FileChild[] {
  const tocItems = [
    '1. Engagement Overview',
    '2. Scope of Work',
    '3. Deliverables',
    '4. Assumptions',
    '5. Exclusions',
    '6. Timeline',
    '7. Pricing',
    '8. Terms and Conditions',
    'Signature Block',
  ];

  return [
    new Paragraph({ children: [new PageBreak()] }),
    heading('Table of Contents', HeadingLevel.HEADING_1),
    blankLine(),
    ...tocItems.map(
      (item) =>
        new Paragraph({
          children: [new TextRun({ text: item, size: 24, font: 'Calibri' })],
          spacing: { after: 120 },
          indent: { left: convertInchesToTwip(0.25) },
        }),
    ),
  ];
}

function buildEngagementOverview(
  params: GenerateSowParams,
  totalHoursLow: number,
  totalHoursHigh: number,
  totalRevenueLow: number,
  totalRevenueHigh: number,
  color: string,
): FileChild[] {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    heading('1. Engagement Overview', HeadingLevel.HEADING_1),
    blankLine(),
    bodyText(
      `This Statement of Work defines the scope, deliverables, timeline, and pricing for ServiceNow ` +
        `platform remediation services to be provided by ${params.orgName} for ${params.customerName}. ` +
        `The objective of this engagement is to address identified technical debt, improve platform ` +
        `health, and establish sustainable configuration practices aligned with ServiceNow best practices.`,
    ),
    blankLine(),
    bodyText(`Engagement Type: ${engagementLabel(params.engagementType)}`, { bold: true }),
    blankLine(),
    simpleTable(
      ['Metric', 'Value'],
      [
        ['Total Scope Items', fmtNumber(params.findings.length)],
        ['Estimated Hours', `${fmtNumber(totalHoursLow)} \u2013 ${fmtNumber(totalHoursHigh)}`],
        ['Estimated Investment', `${fmtCurrency(totalRevenueLow)} \u2013 ${fmtCurrency(totalRevenueHigh)}`],
      ],
      color,
    ),
  ];
}

function buildScopeOfWork(
  moduleGroups: ModuleGroup[],
  color: string,
): FileChild[] {
  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('2. Scope of Work', HeadingLevel.HEADING_1),
    blankLine(),
    bodyText(
      'The following sections detail the remediation scope organized by ServiceNow module. ' +
        'Each scope item includes the remediation approach, affected item count, and estimated effort.',
    ),
    blankLine(),
  ];

  let sectionNum = 1;
  for (const mg of moduleGroups) {
    paragraphs.push(
      heading(`2.${sectionNum} ${moduleDisplayName(mg.module)} Remediation`, HeadingLevel.HEADING_2),
    );
    paragraphs.push(blankLine());

    for (const pg of mg.patternGroups) {
      const displayName =
        pg.pattern?.displayName ??
        pg.findings[0]?.title ??
        pg.patternKey;
      const scopeDesc =
        pg.pattern?.sowScopeTemplate ??
        pg.findings.map((f) => f.remediationDescription).join(' ') ??
        'Remediation of identified findings.';

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: displayName, bold: true, size: 22, font: 'Calibri' }),
          ],
          spacing: { after: 60 },
        }),
      );
      paragraphs.push(bodyText(scopeDesc));
      paragraphs.push(
        bodyText(`Affected items: ${fmtNumber(pg.totalAffected)}`),
      );
      paragraphs.push(
        bodyText(
          `Effort estimate: ${fmtNumber(pg.totalHoursLow)} \u2013 ${fmtNumber(pg.totalHoursHigh)} hours`,
        ),
      );
      paragraphs.push(blankLine());
    }

    sectionNum++;
  }

  return paragraphs;
}

function buildDeliverables(
  patterns: SowRemediationPattern[],
): FileChild[] {
  const allDeliverables = new Set<string>();
  for (const p of patterns) {
    if (p.sowDeliverables) {
      for (const d of p.sowDeliverables) {
        allDeliverables.add(d);
      }
    }
  }
  for (const d of STANDARD_DELIVERABLES) {
    allDeliverables.add(d);
  }

  const items = Array.from(allDeliverables);
  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('3. Deliverables', HeadingLevel.HEADING_1),
    blankLine(),
    bodyText('The following deliverables will be provided upon completion of the engagement:'),
    blankLine(),
  ];

  items.forEach((item, idx) => {
    paragraphs.push(numberedItem(item, idx + 1));
  });

  return paragraphs;
}

function buildAssumptions(patterns: SowRemediationPattern[]): FileChild[] {
  const allAssumptions = new Set<string>();
  for (const p of patterns) {
    if (p.sowAssumptions) {
      allAssumptions.add(p.sowAssumptions);
    }
  }
  for (const a of STANDARD_ASSUMPTIONS) {
    allAssumptions.add(a);
  }

  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('4. Assumptions', HeadingLevel.HEADING_1),
    blankLine(),
    bodyText('This Statement of Work is based on the following assumptions:'),
    blankLine(),
  ];

  for (const assumption of allAssumptions) {
    paragraphs.push(bulletItem(assumption));
  }

  return paragraphs;
}

function buildExclusions(patterns: SowRemediationPattern[]): FileChild[] {
  const allExclusions = new Set<string>();
  for (const p of patterns) {
    if (p.sowExclusions) {
      allExclusions.add(p.sowExclusions);
    }
  }
  for (const e of STANDARD_EXCLUSIONS) {
    allExclusions.add(e);
  }

  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('5. Exclusions', HeadingLevel.HEADING_1),
    blankLine(),
    bodyText('The following items are explicitly excluded from the scope of this engagement:'),
    blankLine(),
  ];

  for (const exclusion of allExclusions) {
    paragraphs.push(bulletItem(exclusion));
  }

  return paragraphs;
}

function buildTimeline(
  params: GenerateSowParams,
  moduleGroups: ModuleGroup[],
  color: string,
): FileChild[] {
  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('6. Timeline', HeadingLevel.HEADING_1),
    blankLine(),
  ];

  if (params.timeline) {
    paragraphs.push(
      bodyText(
        `Estimated start: ${params.timeline.startDate}. ` +
          `Duration: ${params.timeline.durationWeeks} weeks.`,
        { bold: true },
      ),
    );
    paragraphs.push(blankLine());
  }

  paragraphs.push(
    bodyText(
      'The engagement will be organized into phases based on finding severity to maximize early risk reduction:',
    ),
  );
  paragraphs.push(blankLine());

  // Build severity-based phases
  type SeverityBucket = 'critical' | 'high' | 'medium_low';
  const buckets: Record<SeverityBucket, { findings: SowFinding[]; hoursLow: number; hoursHigh: number }> = {
    critical: { findings: [], hoursLow: 0, hoursHigh: 0 },
    high: { findings: [], hoursLow: 0, hoursHigh: 0 },
    medium_low: { findings: [], hoursLow: 0, hoursHigh: 0 },
  };

  for (const f of params.findings) {
    const sev = f.severity.toLowerCase();
    let bucket: SeverityBucket;
    if (sev === 'critical') bucket = 'critical';
    else if (sev === 'high') bucket = 'high';
    else bucket = 'medium_low';

    buckets[bucket].findings.push(f);
    buckets[bucket].hoursLow += f.effortHoursLow * f.affectedCount;
    buckets[bucket].hoursHigh += f.effortHoursHigh * f.affectedCount;
  }

  const durationWeeks = params.timeline?.durationWeeks ?? 8;
  const phases: string[][] = [];

  if (buckets.critical.findings.length > 0) {
    phases.push([
      'Phase 1 (Weeks 1\u20132)',
      `Critical findings (${buckets.critical.findings.length} items)`,
      `${fmtNumber(buckets.critical.hoursLow)} \u2013 ${fmtNumber(buckets.critical.hoursHigh)}`,
      'Week 2',
    ]);
  }

  if (buckets.high.findings.length > 0) {
    phases.push([
      'Phase 2 (Weeks 3\u20134)',
      `High findings (${buckets.high.findings.length} items)`,
      `${fmtNumber(buckets.high.hoursLow)} \u2013 ${fmtNumber(buckets.high.hoursHigh)}`,
      'Week 4',
    ]);
  }

  if (buckets.medium_low.findings.length > 0) {
    phases.push([
      `Phase 3 (Weeks 5\u2013${durationWeeks})`,
      `Medium/Low findings (${buckets.medium_low.findings.length} items)`,
      `${fmtNumber(buckets.medium_low.hoursLow)} \u2013 ${fmtNumber(buckets.medium_low.hoursHigh)}`,
      `Week ${durationWeeks}`,
    ]);
  }

  if (phases.length > 0) {
    paragraphs.push(
      simpleTable(
        ['Phase', 'Scope', 'Estimated Hours', 'Target Completion'],
        phases,
        color,
      ),
    );
  }

  return paragraphs;
}

function buildPricing(
  params: GenerateSowParams,
  totalHoursLow: number,
  totalHoursHigh: number,
  totalRevenueLow: number,
  totalRevenueHigh: number,
  color: string,
): FileChild[] {
  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('7. Pricing', HeadingLevel.HEADING_1),
    blankLine(),
  ];

  const showTM =
    params.engagementType === 'time_and_materials' ||
    params.engagementType === 'blended';
  const showFixed =
    params.engagementType === 'fixed_fee' ||
    params.engagementType === 'blended';

  // ---- Time & Materials ----
  if (showTM) {
    paragraphs.push(heading('Time & Materials', HeadingLevel.HEADING_2));
    paragraphs.push(blankLine());

    if (params.rateCard.roles && params.rateCard.roles.length > 0) {
      paragraphs.push(bodyText('Rate Card:', { bold: true }));
      paragraphs.push(
        simpleTable(
          ['Role', 'Hourly Rate'],
          params.rateCard.roles.map((r) => [r.name, fmtCurrency(r.hourlyRate)]),
          color,
        ),
      );
      paragraphs.push(blankLine());
    }

    paragraphs.push(
      bodyText(`Blended Rate: ${fmtCurrency(params.rateCard.blendedRate)}/hr`, { bold: true }),
    );
    paragraphs.push(
      bodyText(
        `Estimated Hours: ${fmtNumber(totalHoursLow)} \u2013 ${fmtNumber(totalHoursHigh)}`,
      ),
    );
    paragraphs.push(
      bodyText(
        `Estimated Investment: ${fmtCurrency(totalRevenueLow)} \u2013 ${fmtCurrency(totalRevenueHigh)}`,
        { bold: true },
      ),
    );
    paragraphs.push(blankLine());
    paragraphs.push(
      bodyText('Actual costs will be based on time incurred. Hours are estimates and may vary.', {
        italic: true,
      }),
    );
    paragraphs.push(blankLine());
  }

  // ---- Fixed Fee ----
  if (showFixed) {
    paragraphs.push(heading('Fixed Fee', HeadingLevel.HEADING_2));
    paragraphs.push(blankLine());

    const margin = params.rateCard.marginTarget ?? 0;
    const fixedPrice = Math.ceil(totalRevenueHigh * (1 + margin));

    paragraphs.push(
      bodyText(`Fixed Price: ${fmtCurrency(fixedPrice)}`, { bold: true }),
    );
    paragraphs.push(blankLine());
    paragraphs.push(bodyText('Payment Schedule:', { bold: true }));
    paragraphs.push(blankLine());

    const milestone30 = Math.ceil(fixedPrice * 0.3);
    const milestone40 = Math.ceil(fixedPrice * 0.4);
    const milestone30Final = fixedPrice - milestone30 - milestone40;

    paragraphs.push(
      simpleTable(
        ['Milestone', 'Percentage', 'Amount'],
        [
          ['Upon signing', '30%', fmtCurrency(milestone30)],
          ['Project midpoint', '40%', fmtCurrency(milestone40)],
          ['Upon completion', '30%', fmtCurrency(milestone30Final)],
        ],
        color,
      ),
    );
  }

  return paragraphs;
}

function buildTermsAndConditions(branding?: SowBranding): FileChild[] {
  const paragraphs: FileChild[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('8. Terms and Conditions', HeadingLevel.HEADING_1),
    blankLine(),
  ];

  // Payment Terms
  paragraphs.push(heading('Payment Terms', HeadingLevel.HEADING_3));
  paragraphs.push(
    bodyText(
      'All invoices are due Net 30 from the date of invoice. Late payments may be subject to a ' +
        'finance charge of 1.5% per month on the unpaid balance.',
    ),
  );
  paragraphs.push(blankLine());

  // Change Orders
  paragraphs.push(heading('Change Orders', HeadingLevel.HEADING_3));
  paragraphs.push(
    bodyText(
      'Any changes to the scope, deliverables, timeline, or pricing outlined in this Statement of Work ' +
        'must be documented in a written change order and approved by authorized representatives of both parties ' +
        'prior to implementation. Change orders may affect project timelines and costs.',
    ),
  );
  paragraphs.push(blankLine());

  // Warranty
  paragraphs.push(heading('Warranty', HeadingLevel.HEADING_3));
  paragraphs.push(
    bodyText(
      'A 30-day warranty period will commence upon completion of each deliverable. During the warranty period, ' +
        'any defects in the remediation work that are attributable to the service provider will be corrected at ' +
        'no additional cost. This warranty does not cover issues arising from subsequent changes made by the client ' +
        'or third parties.',
    ),
  );
  paragraphs.push(blankLine());

  // Confidentiality
  paragraphs.push(heading('Confidentiality', HeadingLevel.HEADING_3));
  paragraphs.push(
    bodyText(
      'Both parties agree to maintain the confidentiality of all proprietary and sensitive information exchanged ' +
        'during the course of this engagement. Neither party shall disclose such information to third parties without ' +
        'the prior written consent of the disclosing party. This obligation shall survive the termination of this ' +
        'Statement of Work.',
    ),
  );

  // Custom legal text from branding
  if (branding?.legalText) {
    paragraphs.push(blankLine());
    paragraphs.push(heading('Additional Terms', HeadingLevel.HEADING_3));
    paragraphs.push(bodyText(branding.legalText));
  }

  return paragraphs;
}

function buildSignatureBlock(
  customerName: string,
  orgName: string,
): FileChild[] {
  const signatureLine = '\u2009'.repeat(1) + '_'.repeat(40);

  const makeSignatureColumn = (label: string) => [
    new Paragraph({
      children: [
        new TextRun({ text: label, bold: true, size: 24, font: 'Calibri' }),
      ],
      spacing: { after: 360 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: signatureLine, size: 22, font: 'Calibri' }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Signature', size: 18, font: 'Calibri', color: '999999' })],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: signatureLine, size: 22, font: 'Calibri' }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Name', size: 18, font: 'Calibri', color: '999999' })],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: signatureLine, size: 22, font: 'Calibri' }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Title', size: 18, font: 'Calibri', color: '999999' })],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: signatureLine, size: 22, font: 'Calibri' }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Date', size: 18, font: 'Calibri', color: '999999' })],
    }),
  ];

  return [
    new Paragraph({ children: [new PageBreak()] }),
    heading('Signature Block', HeadingLevel.HEADING_1),
    blankLine(),
    bodyText(
      'By signing below, both parties acknowledge and agree to the terms outlined in this Statement of Work.',
    ),
    blankLine(),
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: makeSignatureColumn(`Client \u2014 ${customerName}`),
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
            }),
            new TableCell({
              children: makeSignatureColumn(`Service Provider \u2014 ${orgName}`),
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a professional Statement of Work DOCX document.
 *
 * @returns Buffer containing the DOCX file bytes
 */
export async function generateSow(params: GenerateSowParams): Promise<Buffer> {
  const color = hexColor(params.branding?.primaryColor);
  const patternMap = buildPatternMap(params.remediationPatterns);
  const moduleGroups = groupFindings(params.findings, patternMap);

  // Compute totals
  let totalHoursLow = 0;
  let totalHoursHigh = 0;
  for (const f of params.findings) {
    totalHoursLow += f.effortHoursLow * f.affectedCount;
    totalHoursHigh += f.effortHoursHigh * f.affectedCount;
  }
  const totalRevenueLow = totalHoursLow * params.rateCard.blendedRate;
  const totalRevenueHigh = totalHoursHigh * params.rateCard.blendedRate;

  // Collect all used patterns (for deliverables, assumptions, exclusions)
  const usedPatternKeys = new Set(params.findings.map((f) => f.remediationPattern));
  const usedPatterns = params.remediationPatterns.filter((p) => usedPatternKeys.has(p.patternKey));

  // Assemble all sections
  const children: FileChild[] = [
    ...buildCoverPage(params, color),
    ...buildTableOfContents(),
    ...buildEngagementOverview(params, totalHoursLow, totalHoursHigh, totalRevenueLow, totalRevenueHigh, color),
    ...buildScopeOfWork(moduleGroups, color),
    ...buildDeliverables(usedPatterns),
    ...buildAssumptions(usedPatterns),
    ...buildExclusions(usedPatterns),
    ...buildTimeline(params, moduleGroups, color),
    ...buildPricing(params, totalHoursLow, totalHoursHigh, totalRevenueLow, totalRevenueHigh, color),
    ...buildTermsAndConditions(params.branding),
    ...buildSignatureBlock(params.customerName, params.orgName),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22, // 11pt
          },
        },
        heading1: {
          run: {
            font: 'Calibri',
            size: 36, // 18pt
            bold: true,
            color,
          },
        },
        heading2: {
          run: {
            font: 'Calibri',
            size: 28, // 14pt
            bold: true,
            color: '2D2D3D',
          },
        },
        heading3: {
          run: {
            font: 'Calibri',
            size: 24, // 12pt
            bold: true,
            color: '2D2D3D',
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
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
