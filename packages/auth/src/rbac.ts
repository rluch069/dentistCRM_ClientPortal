import type { StaffRole } from "@dentalos/core/constants";

export const PERMISSIONS = [
  "appointments:read",
  "appointments:write",
  "patients:read",
  "patients:write",
  "clinical:read",
  "clinical:write",
  "billing:read",
  "billing:write",
  "reports:read",
  "settings:write",
  "staff:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ALL,
  dentist: [
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:read",
    "clinical:write",
    "billing:read",
    "reports:read",
    "settings:write",
  ],
  hygienist: [
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:read",
    "clinical:write",
    "billing:read",
  ],
  assistant: [
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:read",
  ],
  receptionist: [
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "billing:read",
    "billing:write",
    "settings:write",
  ],
};

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
