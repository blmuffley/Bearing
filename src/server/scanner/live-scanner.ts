/**
 * Live scanner engine for real-time ServiceNow instance assessment.
 *
 * Connects to a ServiceNow instance via the REST API, queries live data
 * across enabled modules, converts it into the ExportPayload format,
 * and reuses the existing ScanEngine rule evaluation logic.
 */

import { ServiceNowClient, ServiceNowApiError } from '@/lib/servicenow/api';
import type { ExportPayload } from '@/server/scanner/export-parser';
import { ScanEngine } from '@/server/scanner/engine';
import type { ScanResult } from '@/server/scanner/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveScanConfig {
  instanceUrl: string;
  auth:
    | { type: 'basic'; username: string; password: string }
    | { type: 'oauth'; accessToken: string };
  modules: string[];
  onProgress?: (status: LiveScanProgress) => void;
}

export interface LiveScanProgress {
  phase: 'connecting' | 'querying' | 'analyzing' | 'scoring';
  module?: string;
  table?: string;
  recordsFetched?: number;
  totalRecords?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Module-to-table mapping with field definitions
// ---------------------------------------------------------------------------

interface TableQueryDef {
  table: string;
  fields: string[];
  query?: string;
  maxRecords?: number;
}

const CORE_TABLE_QUERIES: TableQueryDef[] = [
  {
    table: 'sys_script',
    fields: [
      'sys_id', 'name', 'script', 'collection', 'when', 'active', 'scope',
    ],
    query: 'active=true',
  },
  {
    table: 'sys_script_include',
    fields: [
      'sys_id', 'name', 'script', 'api_name', 'active', 'scope',
    ],
    query: 'active=true',
  },
  {
    table: 'sys_ui_policy',
    fields: [
      'sys_id', 'short_description', 'table', 'active', 'script_true',
      'script_false',
    ],
    query: 'active=true',
  },
  {
    table: 'sys_ui_action',
    fields: ['sys_id', 'name', 'script', 'table', 'active'],
    query: 'active=true',
  },
  {
    table: 'sys_update_set',
    fields: [
      'sys_id', 'name', 'state', 'application', 'sys_created_on',
      'sys_updated_on',
    ],
  },
  {
    table: 'sys_update_xml',
    fields: ['sys_id', 'update_set', 'name', 'type', 'action'],
    maxRecords: 50000,
  },
  {
    table: 'sys_security_acl',
    fields: [
      'sys_id', 'name', 'operation', 'type', 'script', 'condition', 'active',
      'admin_overrides',
    ],
    query: 'active=true',
  },
  {
    table: 'sys_user_has_role',
    fields: ['sys_id', 'user', 'role', 'inherited'],
    query: 'inherited=false',
  },
  {
    table: 'sys_properties',
    fields: ['sys_id', 'name', 'value', 'description'],
  },
];

const CMDB_TABLE_QUERIES: TableQueryDef[] = [
  {
    table: 'cmdb_ci',
    fields: [
      'sys_id', 'name', 'sys_class_name', 'operational_status',
      'install_status', 'last_discovered', 'discovery_source',
    ],
    maxRecords: 100000,
  },
  {
    table: 'cmdb_rel_ci',
    fields: ['sys_id', 'parent', 'child', 'type'],
    maxRecords: 100000,
  },
];

const ITSM_TABLE_QUERIES: TableQueryDef[] = [
  {
    table: 'incident',
    fields: [
      'sys_id', 'number', 'state', 'priority', 'assignment_group',
      'assigned_to', 'category', 'opened_at', 'resolved_at',
    ],
    maxRecords: 100000,
  },
  {
    table: 'change_request',
    fields: [
      'sys_id', 'number', 'type', 'state', 'approval', 'backout_plan',
      'opened_at', 'closed_at',
    ],
    maxRecords: 50000,
  },
];

const ITAM_TABLE_QUERIES: TableQueryDef[] = [
  {
    table: 'alm_hardware',
    fields: [
      'sys_id', 'display_name', 'model', 'serial_number', 'ci',
      'install_status', 'warranty_expiration', 'assigned_to',
    ],
    maxRecords: 100000,
  },
];

const MODULE_QUERY_MAP: Record<string, TableQueryDef[]> = {
  core: CORE_TABLE_QUERIES,
  cmdb: CMDB_TABLE_QUERIES,
  itsm: ITSM_TABLE_QUERIES,
  itam: ITAM_TABLE_QUERIES,
};

// ---------------------------------------------------------------------------
// LiveScanner class
// ---------------------------------------------------------------------------

export class LiveScanner {
  private client: ServiceNowClient;
  private config: LiveScanConfig;

  constructor(config: LiveScanConfig) {
    this.config = config;
    this.client = new ServiceNowClient({
      instanceUrl: config.instanceUrl,
      auth: config.auth,
    });
  }

  /**
   * Execute a full live scan against the connected ServiceNow instance.
   *
   * 1. Test connection and retrieve instance version
   * 2. Query relevant tables for each enabled module
   * 3. Build an ExportPayload from the live data
   * 4. Pass to ScanEngine for rule evaluation and scoring
   * 5. Return the same ScanResult type as an export scan
   */
  async runScan(): Promise<ScanResult> {
    // ── Phase 1: Connect ──────────────────────────────────────────────────

    this.emitProgress({
      phase: 'connecting',
      message: `Connecting to ${this.config.instanceUrl}...`,
    });

    const connectionResult = await this.client.testConnection();

    if (!connectionResult.success) {
      throw new Error(
        `Failed to connect to ServiceNow instance: ${connectionResult.error}`,
      );
    }

    const instanceVersion = connectionResult.version ?? 'unknown';

    this.emitProgress({
      phase: 'connecting',
      message: `Connected. Instance version: ${instanceVersion}`,
    });

    // ── Phase 2: Query each module ────────────────────────────────────────

    const rawData: Record<string, Record<string, unknown[]>> = {};

    for (const moduleName of this.config.modules) {
      const queries = MODULE_QUERY_MAP[moduleName];
      if (!queries) continue;

      rawData[moduleName] = {};

      for (const queryDef of queries) {
        this.emitProgress({
          phase: 'querying',
          module: moduleName,
          table: queryDef.table,
          message: `Querying ${queryDef.table}...`,
        });

        try {
          const records = await this.client.queryAllRecords({
            table: queryDef.table,
            query: queryDef.query,
            fields: queryDef.fields,
            maxRecords: queryDef.maxRecords,
            onProgress: (fetched, total) => {
              this.emitProgress({
                phase: 'querying',
                module: moduleName,
                table: queryDef.table,
                recordsFetched: fetched,
                totalRecords: total,
                message: `Querying ${queryDef.table}: ${fetched}/${total} records`,
              });
            },
          });

          rawData[moduleName][queryDef.table] = records;
        } catch (err) {
          // If a table does not exist (404), skip it gracefully
          if (
            err instanceof ServiceNowApiError &&
            (err.statusCode === 404 || err.statusCode === 400)
          ) {
            rawData[moduleName][queryDef.table] = [];
            continue;
          }
          throw err;
        }
      }
    }

    // ── Phase 3: Build ExportPayload ──────────────────────────────────────

    this.emitProgress({
      phase: 'analyzing',
      message: 'Converting live data to export format...',
    });

    const payload = this.buildExportPayload(rawData, instanceVersion);

    // ── Phase 4: Run ScanEngine ───────────────────────────────────────────

    this.emitProgress({
      phase: 'scoring',
      message: 'Running scan rules and computing scores...',
    });

    const engine = new ScanEngine();
    const result = await engine.runExportScan(payload);

    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Convert raw API data into the ExportPayload format so we can reuse
   * the existing scan engine rules without duplication.
   */
  private buildExportPayload(
    rawData: Record<string, Record<string, unknown[]>>,
    instanceVersion: string,
  ): ExportPayload {
    const payload: ExportPayload = {
      metadata: {
        instance_url: this.config.instanceUrl,
        instance_version: instanceVersion,
        export_date: new Date().toISOString(),
        licensed_plugins: [],
      },
      modules: {},
    };

    // ── Core module ──
    const core = rawData['core'];
    if (core) {
      payload.modules.core = {
        business_rules: this.mapCoreRecords(
          core['sys_script'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            script: String(r.script ?? ''),
            collection: String(r.collection ?? ''),
            when: String(r.when ?? ''),
            active: r.active === true || r.active === 'true',
            scope: r.scope != null ? String(r.scope) : undefined,
          }),
        ),
        script_includes: this.mapCoreRecords(
          core['sys_script_include'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            script: String(r.script ?? ''),
            api_name: String(r.api_name ?? ''),
            active: r.active === true || r.active === 'true',
            scope: r.scope != null ? String(r.scope) : undefined,
          }),
        ),
        ui_policies: this.mapCoreRecords(
          core['sys_ui_policy'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            short_description: String(r.short_description ?? ''),
            table: String(r.table ?? ''),
            active: r.active === true || r.active === 'true',
            script_true: r.script_true != null ? String(r.script_true) : undefined,
            script_false: r.script_false != null ? String(r.script_false) : undefined,
          }),
        ),
        ui_actions: this.mapCoreRecords(
          core['sys_ui_action'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            script: String(r.script ?? ''),
            table: String(r.table ?? ''),
            active: r.active === true || r.active === 'true',
          }),
        ),
        update_sets: this.mapCoreRecords(
          core['sys_update_set'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            state: String(r.state ?? ''),
            application: String(r.application ?? ''),
            created_on: String(r.sys_created_on ?? ''),
            updated_on: String(r.sys_updated_on ?? ''),
          }),
        ),
        update_set_entries: this.mapCoreRecords(
          core['sys_update_xml'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            update_set: String(r.update_set ?? ''),
            name: String(r.name ?? ''),
            type: String(r.type ?? ''),
            action: String(r.action ?? ''),
          }),
        ),
        acls: this.mapCoreRecords(
          core['sys_security_acl'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            operation: String(r.operation ?? ''),
            type: String(r.type ?? ''),
            script: String(r.script ?? ''),
            condition: String(r.condition ?? ''),
            active: r.active === true || r.active === 'true',
            admin_overrides: r.admin_overrides === true || r.admin_overrides === 'true',
          }),
        ),
        role_assignments: this.mapCoreRecords(
          core['sys_user_has_role'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            user: String(r.user ?? ''),
            role: String(r.role ?? ''),
            inherited: r.inherited === true || r.inherited === 'true',
          }),
        ),
        system_properties: this.mapCoreRecords(
          core['sys_properties'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            value: String(r.value ?? ''),
            description: String(r.description ?? ''),
          }),
        ),
      };
    }

    // ── CMDB module ──
    const cmdb = rawData['cmdb'];
    if (cmdb) {
      payload.modules.cmdb = {
        cis: this.mapCoreRecords(
          cmdb['cmdb_ci'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            name: String(r.name ?? ''),
            sys_class_name: String(r.sys_class_name ?? ''),
            operational_status: String(r.operational_status ?? ''),
            install_status: String(r.install_status ?? ''),
            last_discovered: String(r.last_discovered ?? ''),
            discovery_source: String(r.discovery_source ?? ''),
          }),
        ),
        relationships: this.mapCoreRecords(
          cmdb['cmdb_rel_ci'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            parent: String(r.parent ?? ''),
            child: String(r.child ?? ''),
            type: String(r.type ?? ''),
          }),
        ),
      };
    }

    // ── ITSM module ──
    const itsm = rawData['itsm'];
    if (itsm) {
      payload.modules.itsm = {
        incidents: this.mapCoreRecords(
          itsm['incident'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            number: String(r.number ?? ''),
            state: String(r.state ?? ''),
            priority: String(r.priority ?? ''),
            assignment_group: String(r.assignment_group ?? ''),
            assigned_to: String(r.assigned_to ?? ''),
            category: String(r.category ?? ''),
            opened_at: String(r.opened_at ?? ''),
            resolved_at: r.resolved_at != null ? String(r.resolved_at) : undefined,
          }),
        ),
        changes: this.mapCoreRecords(
          itsm['change_request'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            number: String(r.number ?? ''),
            type: String(r.type ?? ''),
            state: String(r.state ?? ''),
            approval: String(r.approval ?? ''),
            backout_plan: r.backout_plan != null ? String(r.backout_plan) : undefined,
            opened_at: String(r.opened_at ?? ''),
            closed_at: r.closed_at != null ? String(r.closed_at) : undefined,
          }),
        ),
      };
    }

    // ── ITAM module ──
    const itam = rawData['itam'];
    if (itam) {
      payload.modules.itam = {
        hardware_assets: this.mapCoreRecords(
          itam['alm_hardware'] ?? [],
          (r: Record<string, unknown>) => ({
            sys_id: String(r.sys_id ?? ''),
            display_name: String(r.display_name ?? ''),
            model: String(r.model ?? ''),
            serial_number: String(r.serial_number ?? ''),
            ci: r.ci != null ? String(r.ci) : undefined,
            install_status: String(r.install_status ?? ''),
            warranty_expiration: r.warranty_expiration != null
              ? String(r.warranty_expiration)
              : undefined,
            assigned_to: r.assigned_to != null ? String(r.assigned_to) : undefined,
          }),
        ),
      };
    }

    return payload;
  }

  /**
   * Generic mapper that casts raw API records through a transform function.
   */
  private mapCoreRecords<T>(
    records: unknown[],
    transform: (r: Record<string, unknown>) => T,
  ): T[] {
    return records.map((r) => transform(r as Record<string, unknown>));
  }

  private emitProgress(status: LiveScanProgress): void {
    this.config.onProgress?.(status);
  }
}
