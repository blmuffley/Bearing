/**
 * ServiceNow table name constants organized by module.
 *
 * Re-exports MODULE_TABLES from the central constants file and provides
 * helper functions for looking up tables by module (and vice versa).
 */

import { MODULE_TABLES, MODULES } from '@/lib/constants';
import type { Module } from '@/types/assessment';

// Re-export so consumers can import from the servicenow barrel
export { MODULE_TABLES };

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the list of ServiceNow table names associated with the given
 * module key (e.g. 'cmdb' -> ['cmdb_ci', 'cmdb_rel_ci', ...]).
 * Returns an empty array if the module is not recognised.
 */
export function getTablesForModule(module: string): string[] {
  if (module in MODULE_TABLES) {
    return [...MODULE_TABLES[module as Module]];
  }
  return [];
}

/**
 * Given a ServiceNow table name, returns the module it belongs to.
 * Returns `undefined` if the table is not mapped to any module.
 *
 * Note: `discovery_status` appears in both `cmdb` and `itom`. This
 * function returns the first match (cmdb) since MODULES is iterated in
 * declaration order.
 */
export function getModuleForTable(table: string): Module | undefined {
  for (const mod of MODULES) {
    const tables = MODULE_TABLES[mod] as readonly string[];
    if (tables.includes(table)) {
      return mod;
    }
  }
  return undefined;
}

/**
 * Returns a flat, deduplicated list of every ServiceNow table name across
 * all modules.
 */
export function getAllTables(): string[] {
  const seen = new Set<string>();
  for (const mod of MODULES) {
    for (const table of MODULE_TABLES[mod]) {
      seen.add(table);
    }
  }
  return [...seen];
}
