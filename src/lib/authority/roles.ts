import type { Role, JobLevel, AuthorityBands } from "@/lib/types/role";
export type { Role, JobLevel, AuthorityBands };

export interface RoleUser {
  id: string;
  roles: Role[];
  level?: JobLevel;
}

export function hasRole(user: RoleUser, role: Role): boolean {
  return user.roles.includes(role);
}

export function isAnalyst(user: RoleUser): boolean {
  return hasRole(user, "ANALYST");
}

export function isSupervisor(user: RoleUser): boolean {
  return hasRole(user, "SUPERVISOR");
}

export function isManager(user: RoleUser): boolean {
  return hasRole(user, "MANAGER");
}

export function isAdmin(user: RoleUser): boolean {
  return hasRole(user, "ADMIN");
}

export function effectiveRoles(user: RoleUser): Role[] {
  return user.roles;
}
