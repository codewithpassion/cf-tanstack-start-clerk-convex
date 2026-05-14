import { useUser } from "@clerk/tanstack-react-start";
import { useLocation } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useClerkConvexSync } from "../hooks/use-clerk-convex-sync";
import {
	orgRoleHasPermission,
	PermissionChecker,
	rolesHavePermission,
} from "../lib/permissions";
import type { OrgPermission, OrgRole, Permission } from "../lib/permissions";

export type UserRole = "user" | "admin" | "superadmin";

export interface AuthContextValue {
	user: {
		id: string;
		email: string | undefined;
		name: string | null;
		image: string;
		roles: UserRole[];
		createdAt: Date | null;
		updatedAt: Date | null;
	} | null;
	isAuthenticated: boolean;
	isPending: boolean;
	error: unknown;
	hasPermission: (permission: Permission) => boolean;
	hasRole: (role: UserRole) => boolean;
	isAdmin: () => boolean;
	isSuperAdmin: () => boolean;
	permissionChecker: PermissionChecker | null;
	currentOrgSlug: string | null;
	currentOrgRole: OrgRole | null;
	hasOrgPermission: (perm: OrgPermission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function parseOrgSlugFromPath(pathname: string): string | null {
	const match = pathname.match(/^\/org\/([^/]+)/);
	return match ? match[1] : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
	const { isAuthenticated: isConvexAuthenticated, isLoading } = useConvexAuth();
	const location = useLocation();

	useClerkConvexSync();

	const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

	const isInitiallyPending =
		!isUserLoaded || !isSignedIn || isLoading || !isConvexAuthenticated;

	useEffect(() => {
		if (!isInitiallyPending && !hasInitiallyLoaded) {
			setHasInitiallyLoaded(true);
		}
	}, [isInitiallyPending, hasInitiallyLoaded]);

	const isPending = !hasInitiallyLoaded;
	const isAuthenticated = (isSignedIn && isConvexAuthenticated) === true;

	const userRoles = useMemo<UserRole[]>(
		() => (user?.publicMetadata?.roles as UserRole[]) || ["user"],
		[user?.publicMetadata?.roles],
	);

	const currentOrgSlug = parseOrgSlugFromPath(location.pathname);

	const orgs = useQuery(
		api.organizations.listMine,
		isAuthenticated ? {} : "skip",
	);

	const currentOrgRole: OrgRole | null = useMemo(() => {
		if (!currentOrgSlug || !orgs) return null;
		const match = orgs.find((o) => o.slug === currentOrgSlug);
		return match ? match.role : null;
	}, [currentOrgSlug, orgs]);

	const hasRole = useCallback(
		(role: UserRole) => userRoles.includes(role),
		[userRoles],
	);

	const hasPermission = (permission: Permission) =>
		rolesHavePermission(userRoles, permission);

	const isAdmin = useCallback(
		() => hasRole("admin") || hasRole("superadmin"),
		[hasRole],
	);

	const isSuperAdmin = () => hasRole("superadmin");

	const permissionChecker = isAuthenticated
		? new PermissionChecker(userRoles)
		: null;

	const hasOrgPermission = (perm: OrgPermission) =>
		orgRoleHasPermission(currentOrgRole, perm);

	const value: AuthContextValue = {
		user: user
			? {
				id: user.id,
				email: user.primaryEmailAddress?.emailAddress,
				name: user.fullName || user.firstName || user.username,
				image: user.imageUrl,
				roles: userRoles,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			}
			: null,
		isAuthenticated,
		isPending,
		error: null,
		hasPermission,
		hasRole,
		isAdmin,
		isSuperAdmin,
		permissionChecker,
		currentOrgSlug,
		currentOrgRole,
		hasOrgPermission,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
