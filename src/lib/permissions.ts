import type { UserRole } from "../contexts/auth-context";

/**
 * Granular permission system for role-based access control
 */

// Define all available permissions in the system
export const PERMISSIONS = {
	// User management permissions
	"users.view": "View user list and details",
	"users.create": "Create new users",
	"users.edit": "Edit user information",
	"users.delete": "Delete users",
	"users.manage_roles": "Manage user roles",

	// Admin permissions
	"admin.access": "Access admin dashboard",
	"admin.view_stats": "View system statistics",
	"admin.manage_settings": "Manage system settings",
	"admin.view_logs": "View system logs",

	// System permissions
	"system.manage_api": "Manage API keys and webhooks",
	"system.manage_database": "Manage database operations",
	"system.manage_security": "Manage security settings",
	"system.impersonate": "Impersonate other users",
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Role-permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
	user: [
	],

	admin: [
		// Admin-specific permissions
		"admin.access",
		"admin.view_stats",
		"users.view",
		"users.create",
		"users.edit",
	],

	superadmin: [
		// Superadmins have all permissions
		...(Object.keys(PERMISSIONS) as Permission[]),
	],
};

// Permission groups for easier management
export const PERMISSION_GROUPS = {
	"User Management": [
		"users.view",
		"users.create",
		"users.edit",
		"users.delete",
		"users.manage_roles",
	],
	"Todo Management": [
		"todos.view_own",
		"todos.create_own",
		"todos.edit_own",
		"todos.delete_own",
		"todos.view_all",
		"todos.edit_all",
		"todos.delete_all",
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

/**
 * Check if a set of roles has a specific permission
 */
export function rolesHavePermission(
	roles: UserRole[],
	permission: Permission,
): boolean {
	// Check each role to see if it has the permission
	for (const role of roles) {
		const rolePermissions = ROLE_PERMISSIONS[role];
		if (rolePermissions?.includes(permission)) {
			return true;
		}
	}
	return false;
}

/**
 * Get all permissions for a set of roles
 */
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

/**
 * Get human-readable description for a permission
 */
export function getPermissionDescription(permission: Permission): string {
	return PERMISSIONS[permission] || permission;
}

/**
 * Check if one role is higher than another in the hierarchy
 */
export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
	const hierarchy: Record<UserRole, number> = {
		user: 1,
		admin: 2,
		superadmin: 3,
	};

	return hierarchy[role1] > hierarchy[role2];
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: UserRole[]): UserRole {
	if (roles.includes("superadmin")) return "superadmin";
	if (roles.includes("admin")) return "admin";
	return "user";
}

/**
 * Validate if a user can assign a role to another user
 * (Users can only assign roles lower than or equal to their own)
 */
export function canAssignRole(
	assignerRoles: UserRole[],
	roleToAssign: UserRole,
): boolean {
	const assignerHighestRole = getHighestRole(assignerRoles);

	// Superadmins can assign any role
	if (assignerHighestRole === "superadmin") return true;

	// Admins can assign user and admin roles (not superadmin)
	if (assignerHighestRole === "admin") {
		return roleToAssign !== "superadmin";
	}

	// Regular users cannot assign any roles
	return false;
}

/**
 * Get available roles that a user can assign based on their own roles
 */
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

/**
 * Check if a user can perform an action on another user
 * (e.g., edit, delete, change roles)
 */
export function canManageUser(
	actorRoles: UserRole[],
	targetRoles: UserRole[],
): boolean {
	const actorHighestRole = getHighestRole(actorRoles);
	const targetHighestRole = getHighestRole(targetRoles);

	// Users can only manage users with lower or equal roles
	// Exception: superadmins can manage anyone
	if (actorHighestRole === "superadmin") return true;

	// Admins can manage users and other admins (but not superadmins)
	if (actorHighestRole === "admin") {
		return targetHighestRole !== "superadmin";
	}

	// Regular users cannot manage anyone
	return false;
}

/**
 * Permission helper for React components
 */
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
