/**
 * Core security and ACL debt scan rules.
 *
 * These functions evaluate ServiceNow export data for security
 * configuration anti-patterns and return arrays of findings (without
 * composite scores - the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Roles considered high-privilege that warrant extra scrutiny. */
const HIGH_PRIVILEGE_ROLES = [
  'admin',
  'security_admin',
  'impersonator',
  'credential_admin',
  'maint',
];

// ---------------------------------------------------------------------------
// Minimal record shapes expected from the export payload
// ---------------------------------------------------------------------------

interface Acl {
  sys_id: string;
  name: string;
  operation: string;
  type: string;
  script: string;
  condition: string;
  active: boolean;
  admin_overrides: boolean;
}

interface RoleAssignment {
  sys_id: string;
  user: string;
  role: string;
  inherited: boolean;
}

// ---------------------------------------------------------------------------
// Rule: Permissive ACLs
// ---------------------------------------------------------------------------

/**
 * Find ACLs where admin_overrides is true, condition is empty, and script
 * is empty. These ACLs provide effectively no access restriction and
 * represent a significant security risk.
 *
 * Each permissive ACL produces a **critical** finding.
 */
export function evaluatePermissiveAcls(
  acls: Acl[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  for (const acl of acls) {
    if (!acl.active) continue;
    if (!acl.admin_overrides) continue;

    const hasNoCondition = !acl.condition || acl.condition.trim() === '';
    const hasNoScript = !acl.script || acl.script.trim() === '';

    if (!hasNoCondition || !hasNoScript) continue;

    findings.push({
      ruleKey: 'core_permissive_acl',
      title: `Permissive ACL: ${acl.name} (${acl.operation})`,
      description:
        `ACL "${acl.name}" for operation "${acl.operation}" has admin overrides ` +
        `enabled with no condition and no script restriction. This effectively ` +
        `provides unrestricted access and is a significant security risk.`,
      severity: 'critical',
      severityScore: 4,
      effortTshirt: 'S',
      effortHoursLow: 1,
      effortHoursHigh: 4,
      riskScore: 5,
      evidence: {
        table: 'sys_security_acl',
        sysId: acl.sys_id,
        field: 'admin_overrides',
        value: `admin_overrides=true, condition=empty, script=empty`,
      },
      remediationPattern: 'acl_hardening',
      remediationDescription:
        'Add appropriate conditions, scripts, or role requirements to restrict ' +
        'access. Review whether admin_overrides should be disabled. Implement ' +
        'least-privilege access controls.',
      affectedCount: 1,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Redundant ACLs
// ---------------------------------------------------------------------------

/**
 * Group ACLs by the combination of name + operation. If multiple ACLs exist
 * for the same name+operation, they may be redundant and create confusion
 * about which ACL is actually enforcing access control.
 *
 * Each redundant group produces a **high** finding.
 */
export function evaluateRedundantAcls(
  acls: Acl[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Only consider active ACLs
  const activeAcls = acls.filter((a) => a.active);

  // Group by name + operation
  const groups = new Map<string, Acl[]>();
  for (const acl of activeAcls) {
    const key = `${acl.name}::${acl.operation}`;
    const group = groups.get(key);
    if (group) {
      group.push(acl);
    } else {
      groups.set(key, [acl]);
    }
  }

  for (const [key, group] of groups) {
    if (group.length <= 1) continue;

    const [name, operation] = key.split('::');

    findings.push({
      ruleKey: 'core_redundant_acl',
      title: `Redundant ACLs: ${name} (${operation})`,
      description:
        `${group.length} active ACLs exist for "${name}" with operation ` +
        `"${operation}". Redundant ACLs create confusion about which rule ` +
        `is actually enforcing access control and can lead to unintended ` +
        `access grants or denials.`,
      severity: 'high',
      severityScore: 3,
      effortTshirt: 'S',
      effortHoursLow: 1,
      effortHoursHigh: 3,
      riskScore: 3,
      evidence: {
        table: 'sys_security_acl',
        field: 'name',
        value: `${group.length} ACLs for "${name}" (${operation})`,
      },
      remediationPattern: 'acl_consolidation',
      remediationDescription:
        'Review the redundant ACLs and consolidate them into a single ACL ' +
        'with the correct access restrictions. Remove or deactivate the ' +
        'unnecessary duplicates.',
      affectedCount: group.length,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Elevated role assignments
// ---------------------------------------------------------------------------

/**
 * Find non-inherited role assignments for high-privilege roles such as
 * admin, security_admin, impersonator, credential_admin, and maint.
 * Each user with elevated roles gets a finding.
 *
 * Each elevated assignment produces a **high** finding.
 */
export function evaluateElevatedRoles(
  roleAssignments: RoleAssignment[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  // Only consider non-inherited, directly-assigned high-privilege roles
  const elevated = roleAssignments.filter(
    (ra) => !ra.inherited && HIGH_PRIVILEGE_ROLES.includes(ra.role),
  );

  // Group by user to consolidate findings
  const userRoles = new Map<string, string[]>();
  for (const ra of elevated) {
    const existing = userRoles.get(ra.user);
    if (existing) {
      existing.push(ra.role);
    } else {
      userRoles.set(ra.user, [ra.role]);
    }
  }

  for (const [user, roles] of userRoles) {
    const roleList = roles.join(', ');

    findings.push({
      ruleKey: 'core_elevated_role',
      title: `Elevated roles for user: ${user}`,
      description:
        `User "${user}" has ${roles.length} directly-assigned high-privilege ` +
        `role(s): ${roleList}. Excessive elevated access increases the attack ` +
        `surface and violates the principle of least privilege.`,
      severity: 'high',
      severityScore: 3,
      effortTshirt: 'S',
      effortHoursLow: 1,
      effortHoursHigh: 2,
      riskScore: 4,
      evidence: {
        table: 'sys_user_has_role',
        field: 'role',
        value: `User "${user}" has roles: ${roleList}`,
      },
      remediationPattern: 'role_remediation',
      remediationDescription:
        'Review whether the user requires all assigned elevated roles. Remove ' +
        'unnecessary role assignments and consider using group-based role ' +
        'inheritance for better governance and auditability.',
      affectedCount: roles.length,
      pathfinderRelevant: false,
      pathfinderRecommendation: null,
    });
  }

  return findings;
}
