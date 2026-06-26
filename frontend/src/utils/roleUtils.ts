import type { UserRole } from '../components/AuthContext';

// Role hierarchy — lower index = higher privilege (mirrors backend ROLE_HIERARCHY)
export const ROLE_HIERARCHY: UserRole[] = [
  'admin',
  'hr_manager',
  'recruiter',
  'employee',
  'viewer',
];

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'employee', label: 'Employee' },
  { value: 'viewer', label: 'Viewer' },
];

/**
 * Return the rank index for a role (0 = most privileged).
 */
export function getRoleRank(role: UserRole): number {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? ROLE_HIERARCHY.length : idx;
}

/**
 * Return only the roles the caller is allowed to assign.
 * A user may assign roles at or below their own rank.
 */
export function getAssignableRoles(callerRole: UserRole) {
  const callerRank = getRoleRank(callerRole);
  return ALL_ROLES.filter((r) => getRoleRank(r.value) >= callerRank);
}

/**
 * Check whether `callerRole` is allowed to modify a user with `targetRole`.
 *
 * This mirrors the backend's `_assert_can_modify_target()` logic exactly
 * (Option A): non-admins cannot modify admin accounts.
 *
 * NOTE: This is a **UI convenience only**. The backend enforces the real
 * security check — hiding buttons merely prevents users from seeing
 * actions that would be rejected server-side.
 */
export function canModifyUser(callerRole: UserRole, targetRole: UserRole): boolean {
  // Admins can modify anyone
  if (callerRole === 'admin') return true;

  // Non-admins cannot modify admin accounts
  if (targetRole === 'admin') return false;

  return true;
}
