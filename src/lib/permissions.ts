import type { UserRole } from "../contexts/auth-context";

export const PERMISSIONS = {
	"users.view": "View user list and details",
	"users.create": "Create new users",
	"users.edit": "Edit user information",
	"users.delete": "Delete users",
	"users.manage_roles": "Manage user roles",

	"admin.access": "Access admin dashboard",
	"admin.view_stats": "View system statistics",
	"admin.manage_settings": "Manage system settings",
	"admin.view_logs": "View system logs",

	"system.manage_api": "Manage API keys and webhooks",
	"system.manage_database": "Manage database operations",
	"system.manage_security": "Manage security settings",
	"system.impersonate": "Impersonate other users",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
	user: [],
	admin: [
		"admin.access",
		"admin.view_stats",
		"users.view",
		"users.create",
		"users.edit",
	],
	superadmin: [...(Object.keys(PERMISSIONS) as Permission[])],
};

export const ORG_PERMISSIONS = {
	"org.members.invite": "Invite teammates to the organization",
	"org.members.remove": "Remove members from the organization",
	"org.members.changeRole": "Change a member's role",
	"org.settings.edit": "Edit organization settings",
	"org.sources.write": "Create, edit, pause or delete news sources",
	"org.ghostWriter.write": "Manage ghost writer profile and examples",
	"org.autoDraft.write": "Configure auto-draft schedule",
	"org.drafts.create": "Create newsletter drafts",
	"org.drafts.finalize": "Finalize newsletter drafts",
	"org.entries.markUsed": "Mark news entries as used or unused",
} as const;

export type OrgPermission = keyof typeof ORG_PERMISSIONS;
export type OrgRole = "admin" | "member";

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
	admin: [...(Object.keys(ORG_PERMISSIONS) as OrgPermission[])],
	member: ["org.drafts.create", "org.drafts.finalize", "org.entries.markUsed"],
};

export function orgRoleHasPermission(
	role: OrgRole | null | undefined,
	permission: OrgPermission,
): boolean {
	if (!role) return false;
	return ORG_ROLE_PERMISSIONS[role].includes(permission);
}

export const PERMISSION_GROUPS = {
	"User Management": [
		"users.view",
		"users.create",
		"users.edit",
		"users.delete",
		"users.manage_roles",
	],
	Administration: [
		"admin.access",
		"admin.view_stats",
		"admin.manage_settings",
		"admin.view_logs",
	],
	System: [
		"system.manage_api",
		"system.manage_database",
		"system.manage_security",
		"system.impersonate",
	],
} as const;

export function rolesHavePermission(
	roles: UserRole[],
	permission: Permission,
): boolean {
	for (const role of roles) {
		const rolePermissions = ROLE_PERMISSIONS[role];
		if (rolePermissions?.includes(permission)) {
			return true;
		}
	}
	return false;
}

export function getPermissionsForRoles(roles: UserRole[]): Permission[] {
	const permissionSet = new Set<Permission>();
	for (const role of roles) {
		const rolePermissions = ROLE_PERMISSIONS[role];
		if (rolePermissions) {
			for (const permission of rolePermissions) {
				permissionSet.add(permission);
			}
		}
	}
	return Array.from(permissionSet);
}

export function getPermissionDescription(permission: Permission): string {
	return PERMISSIONS[permission] || permission;
}

export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
	const hierarchy: Record<UserRole, number> = {
		user: 1,
		admin: 2,
		superadmin: 3,
	};
	return hierarchy[role1] > hierarchy[role2];
}

export function getHighestRole(roles: UserRole[]): UserRole {
	if (roles.includes("superadmin")) return "superadmin";
	if (roles.includes("admin")) return "admin";
	return "user";
}

export function canAssignRole(
	assignerRoles: UserRole[],
	roleToAssign: UserRole,
): boolean {
	const assignerHighestRole = getHighestRole(assignerRoles);
	if (assignerHighestRole === "superadmin") return true;
	if (assignerHighestRole === "admin") {
		return roleToAssign !== "superadmin";
	}
	return false;
}

export function getAssignableRoles(userRoles: UserRole[]): UserRole[] {
	const highestRole = getHighestRole(userRoles);
	switch (highestRole) {
		case "superadmin":
			return ["user", "admin", "superadmin"];
		case "admin":
			return ["user", "admin"];
		default:
			return [];
	}
}

export function canManageUser(
	actorRoles: UserRole[],
	targetRoles: UserRole[],
): boolean {
	const actorHighestRole = getHighestRole(actorRoles);
	const targetHighestRole = getHighestRole(targetRoles);
	if (actorHighestRole === "superadmin") return true;
	if (actorHighestRole === "admin") {
		return targetHighestRole !== "superadmin";
	}
	return false;
}

export class PermissionChecker {
	private roles: UserRole[];
	private permissions: Set<Permission>;

	constructor(roles: UserRole[]) {
		this.roles = roles;
		this.permissions = new Set(getPermissionsForRoles(roles));
	}

	hasPermission(permission: Permission): boolean {
		return this.permissions.has(permission);
	}

	hasAnyPermission(...permissions: Permission[]): boolean {
		return permissions.some((p) => this.permissions.has(p));
	}

	hasAllPermissions(...permissions: Permission[]): boolean {
		return permissions.every((p) => this.permissions.has(p));
	}

	canAssignRole(role: UserRole): boolean {
		return canAssignRole(this.roles, role);
	}

	canManageUser(targetRoles: UserRole[]): boolean {
		return canManageUser(this.roles, targetRoles);
	}

	get isAdmin(): boolean {
		return this.roles.includes("admin") || this.roles.includes("superadmin");
	}

	get isSuperAdmin(): boolean {
		return this.roles.includes("superadmin");
	}
}
