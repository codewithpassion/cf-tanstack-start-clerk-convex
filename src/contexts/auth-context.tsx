import { useUser } from "@clerk/tanstack-react-start";
import { useConvexAuth } from "convex/react";
import { createContext, useCallback, useEffect, useState } from "react";
import { useClerkConvexSync } from "../hooks/use-clerk-convex-sync";
import { PermissionChecker, rolesHavePermission } from "../lib/permissions";
import type { Permission } from "../lib/permissions";

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
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
	const { isAuthenticated: isConvexAuthtenticated, isLoading } =
		useConvexAuth();

	// Sync Clerk user to Convex database
	useClerkConvexSync();

	// Track if initial auth load has ever completed
	const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

	// useEffect(() => {
	// 	console.log({
	// 		user,
	// 		isUserLoaded,
	// 		isSignedIn,
	// 		isConvexAuthtenticated,
	// 		isLoading,
	// 	});
	// }, [user, isUserLoaded, isSignedIn, isConvexAuthtenticated, isLoading]);

	// Determine if we're still in the initial pending state
	const isInitiallyPending =
		!isUserLoaded || !isSignedIn || isLoading || !isConvexAuthtenticated;

	// Once auth has loaded successfully, mark it and never go back to pending
	useEffect(() => {
		if (!isInitiallyPending && !hasInitiallyLoaded) {
			setHasInitiallyLoaded(true);
		}
	}, [isInitiallyPending, hasInitiallyLoaded]);

	// isPending only reflects initial load, not subsequent reconnections
	const isPending = !hasInitiallyLoaded;
	const isAuthenticated = (isSignedIn && isConvexAuthtenticated) === true;

	// Get roles from Clerk's publicMetadata
	const userRoles = (user?.publicMetadata?.roles as UserRole[]) || ["user"];

	const hasRole = useCallback(
		(role: UserRole) => {
			return userRoles.includes(role);
		},
		[userRoles],
	);

	const hasPermission = (permission: Permission) => {
		// Use the granular permission system
		return rolesHavePermission(userRoles, permission);
	};

	const isAdmin = useCallback(() => {
		return hasRole("admin") || hasRole("superadmin");
	}, [hasRole]);

	const isSuperAdmin = () => hasRole("superadmin");

	// Create a permission checker instance for advanced permission operations
	const permissionChecker = isAuthenticated
		? new PermissionChecker(userRoles)
		: null;

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
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
