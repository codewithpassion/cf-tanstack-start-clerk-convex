import { createContext, useContext, type ReactNode } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { OrgPermission, OrgRole } from "@/lib/permissions";
import { orgRoleHasPermission } from "@/lib/permissions";

export interface OrgContextValue {
	orgId: Id<"organizations">;
	slug: string;
	name: string;
	role: OrgRole;
	hasOrgPermission: (perm: OrgPermission) => boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
	value,
	children,
}: {
	value: Omit<OrgContextValue, "hasOrgPermission">;
	children: ReactNode;
}) {
	const ctx: OrgContextValue = {
		...value,
		hasOrgPermission: (perm) => orgRoleHasPermission(value.role, perm),
	};
	return <OrgContext.Provider value={ctx}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
	const ctx = useContext(OrgContext);
	if (!ctx) {
		throw new Error("useOrg must be used inside an OrgProvider");
	}
	return ctx;
}

export function useMaybeOrg(): OrgContextValue | null {
	return useContext(OrgContext);
}
