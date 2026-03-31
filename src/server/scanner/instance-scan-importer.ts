/**
 * Instance Scan importer for ServiceNow's built-in Instance Scan feature.
 *
 * Queries the scan_finding and scan_finding_entry tables from a ServiceNow
 * instance and maps the results into the Bearing finding format.
 */

import type { ServiceNowClient } from '@/lib/servicenow/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstanceScanImportConfig {
  client: ServiceNowClient;
  /** Optional: import findings from a specific scan result by sys_id. */
  scanResultSysId?: string;
}

export interface ImportedScanResult {
  findings: ImportedFinding[];
  scanMetadata: {
    scanDate: string;
    totalFindings: number;
    instanceVersion?: string;
  };
}

export interface ImportedFinding {
  title: string;
  description: string;
  severity: string;
  category: string;
  module: string;
  affectedTable: string;
  affectedRecord: string;
  remediationDescription: string;
}

// ---------------------------------------------------------------------------
// Raw Instance Scan record shapes from ServiceNow API
// ---------------------------------------------------------------------------

interface RawScanFinding {
  sys_id: string;
  check?: string;
  check_name?: string;
  severity?: string;
  category?: string;
  description?: string;
  scan_result?: string;
  sys_created_on?: string;
  source_table?: string;
  count?: string;
}

interface RawScanFindingEntry {
  sys_id: string;
  scan_finding?: string;
  source_table?: string;
  source_record?: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------------

const SEVERITY_MAP: Record<string, string> = {
  Critical: 'critical',
  critical: 'critical',
  High: 'high',
  high: 'high',
  Medium: 'medium',
  medium: 'medium',
  Warning: 'medium',
  warning: 'medium',
  Low: 'low',
  low: 'low',
  Info: 'low',
  info: 'low',
  Informational: 'low',
  informational: 'low',
};

// ---------------------------------------------------------------------------
// Category mapping (Instance Scan categories to Bearing categories)
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, { category: string; module: string }> = {
  // Performance categories
  Performance: { category: 'performance', module: 'core' },
  'Performance Issues': { category: 'performance', module: 'core' },

  // Security categories
  Security: { category: 'security', module: 'core' },
  'Security Best Practices': { category: 'security', module: 'core' },

  // Coding / scripting categories
  'Coding Best Practices': { category: 'scripting_debt', module: 'core' },
  'Scripting Issues': { category: 'scripting_debt', module: 'core' },
  'Best Practice': { category: 'scripting_debt', module: 'core' },

  // Manageability / upgrade
  Manageability: { category: 'upgrade_readiness', module: 'core' },
  'Upgrade Issues': { category: 'upgrade_readiness', module: 'core' },
  Upgradability: { category: 'upgrade_readiness', module: 'core' },

  // CMDB
  'CMDB Health': { category: 'data_quality', module: 'cmdb' },
  CMDB: { category: 'data_quality', module: 'cmdb' },

  // ITSM
  'ITSM Process': { category: 'process_health', module: 'itsm' },

  // ITAM
  'Asset Management': { category: 'reconciliation', module: 'itam' },

  // User experience
  'User Experience': { category: 'user_experience', module: 'core' },
};

const DEFAULT_CATEGORY = { category: 'general', module: 'core' };

// ---------------------------------------------------------------------------
// Remediation mapping based on finding type patterns
// ---------------------------------------------------------------------------

function inferRemediation(
  title: string,
  category: string,
): string {
  const lowerTitle = title.toLowerCase();
  const lowerCategory = category.toLowerCase();

  if (lowerTitle.includes('hard-coded') || lowerTitle.includes('hardcoded')) {
    return 'Replace hard-coded references with dynamic lookups using system properties, GlideRecord queries, or script includes.';
  }

  if (lowerTitle.includes('gliderecord') && lowerTitle.includes('client')) {
    return 'Replace client-side GlideRecord calls with GlideAjax calls to server-side script includes.';
  }

  if (lowerTitle.includes('synchronous') || lowerTitle.includes('getxmlwait')) {
    return 'Replace synchronous AJAX calls (getXMLWait) with asynchronous patterns using getXMLAnswer with callbacks.';
  }

  if (lowerTitle.includes('acl') || lowerTitle.includes('access control')) {
    return 'Review and harden ACL configurations. Add appropriate conditions, scripts, or role requirements.';
  }

  if (lowerCategory.includes('performance')) {
    return 'Review and optimize the flagged configuration to improve platform performance. Consider caching, query optimization, or architectural changes.';
  }

  if (lowerCategory.includes('security')) {
    return 'Address the security concern by applying least-privilege principles, hardening configurations, and following ServiceNow security best practices.';
  }

  if (lowerCategory.includes('upgrade') || lowerCategory.includes('manageability')) {
    return 'Refactor the flagged customization to use supported APIs and patterns. This will reduce upgrade risk and improve long-term maintainability.';
  }

  return 'Review the finding details and apply the recommended remediation based on ServiceNow best practices and the Instance Scan documentation.';
}

// ---------------------------------------------------------------------------
// InstanceScanImporter class
// ---------------------------------------------------------------------------

export class InstanceScanImporter {
  private client: ServiceNowClient;
  private scanResultSysId?: string;

  constructor(config: InstanceScanImportConfig) {
    this.client = config.client;
    this.scanResultSysId = config.scanResultSysId;
  }

  /**
   * Import findings from the ServiceNow Instance Scan tables.
   *
   * 1. Query scan_finding for finding summaries
   * 2. Query scan_finding_entry for per-record details
   * 3. Map severities, categories, and remediation patterns
   * 4. Return in a format convertible to Bearing findings
   */
  async importFindings(): Promise<ImportedScanResult> {
    // ── Query scan_finding ────────────────────────────────────────────────

    let findingQuery: string | undefined;
    if (this.scanResultSysId) {
      findingQuery = `scan_result=${this.scanResultSysId}`;
    }

    const rawFindings = await this.client.queryAllRecords<RawScanFinding>({
      table: 'scan_finding',
      query: findingQuery,
      fields: [
        'sys_id',
        'check',
        'check_name',
        'severity',
        'category',
        'description',
        'scan_result',
        'sys_created_on',
        'source_table',
        'count',
      ],
    });

    // ── Query scan_finding_entry for per-record details ───────────────────

    const findingSysIds = rawFindings.map((f) => f.sys_id);
    let rawEntries: RawScanFindingEntry[] = [];

    if (findingSysIds.length > 0) {
      // Query entries in batches to avoid overly long encoded queries
      const batchSize = 100;
      for (let i = 0; i < findingSysIds.length; i += batchSize) {
        const batch = findingSysIds.slice(i, i + batchSize);
        const entryQuery = `scan_findingIN${batch.join(',')}`;

        const batchEntries =
          await this.client.queryAllRecords<RawScanFindingEntry>({
            table: 'scan_finding_entry',
            query: entryQuery,
            fields: [
              'sys_id',
              'scan_finding',
              'source_table',
              'source_record',
              'detail',
            ],
          });

        rawEntries = rawEntries.concat(batchEntries);
      }
    }

    // ── Group entries by finding ──────────────────────────────────────────

    const entriesByFinding = new Map<string, RawScanFindingEntry[]>();
    for (const entry of rawEntries) {
      const findingId = entry.scan_finding ?? '';
      const existing = entriesByFinding.get(findingId);
      if (existing) {
        existing.push(entry);
      } else {
        entriesByFinding.set(findingId, [entry]);
      }
    }

    // ── Map to Bearing findings ───────────────────────────────────────────

    const findings: ImportedFinding[] = [];
    let scanDate = '';

    for (const raw of rawFindings) {
      const title = raw.check_name ?? raw.check ?? 'Unknown Instance Scan Finding';
      const severity = SEVERITY_MAP[raw.severity ?? ''] ?? 'medium';
      const rawCategory = raw.category ?? '';
      const mapping = CATEGORY_MAP[rawCategory] ?? DEFAULT_CATEGORY;
      const entries = entriesByFinding.get(raw.sys_id) ?? [];

      // Use the most recent scan creation date as the scan date
      if (raw.sys_created_on && raw.sys_created_on > scanDate) {
        scanDate = raw.sys_created_on;
      }

      // Determine affected table and record from entries or the finding itself
      const affectedTable =
        entries.length > 0
          ? entries[0].source_table ?? raw.source_table ?? ''
          : raw.source_table ?? '';

      const affectedRecord =
        entries.length > 0
          ? entries[0].source_record ?? ''
          : '';

      const description = raw.description ?? title;
      const remediationDescription = inferRemediation(title, rawCategory);

      findings.push({
        title,
        description,
        severity,
        category: mapping.category,
        module: mapping.module,
        affectedTable,
        affectedRecord,
        remediationDescription,
      });
    }

    // ── Get instance version if possible ──────────────────────────────────

    let instanceVersion: string | undefined;
    try {
      const connResult = await this.client.testConnection();
      instanceVersion = connResult.version;
    } catch {
      // Non-critical; we just won't have version info
    }

    return {
      findings,
      scanMetadata: {
        scanDate: scanDate || new Date().toISOString(),
        totalFindings: findings.length,
        instanceVersion,
      },
    };
  }
}
