import { describe, expect, it } from "vitest";
import {
	ORG_PERMISSIONS,
	ORG_ROLE_PERMISSIONS,
	orgRoleHasPermission,
	type OrgPermission,
} from "./permissions";

describe("ORG_ROLE_PERMISSIONS", () => {
	it("grants every defined org permission to admins", () => {
		const all = Object.keys(ORG_PERMISSIONS) as OrgPermission[];
		for (const perm of all) {
			expect(orgRoleHasPermission("admin", perm)).toBe(true);
		}
	});

	it("grants drafting/used permissions to members", () => {
		expect(orgRoleHasPermission("member", "org.drafts.create")).toBe(true);
		expect(orgRoleHasPermission("member", "org.drafts.finalize")).toBe(true);
		expect(orgRoleHasPermission("member", "org.entries.markUsed")).toBe(true);
	});

	it("does NOT grant member-management permissions to members", () => {
		expect(orgRoleHasPermission("member", "org.members.invite")).toBe(false);
		expect(orgRoleHasPermission("member", "org.members.remove")).toBe(false);
		expect(orgRoleHasPermission("member", "org.members.changeRole")).toBe(false);
	});

	it("does NOT grant admin-only operational permissions to members", () => {
		expect(orgRoleHasPermission("member", "org.sources.write")).toBe(false);
		expect(orgRoleHasPermission("member", "org.settings.edit")).toBe(false);
		expect(orgRoleHasPermission("member", "org.ghostWriter.write")).toBe(false);
		expect(orgRoleHasPermission("member", "org.autoDraft.write")).toBe(false);
	});

	it("returns false for null/undefined roles", () => {
		expect(orgRoleHasPermission(null, "org.drafts.create")).toBe(false);
		expect(orgRoleHasPermission(undefined, "org.drafts.create")).toBe(false);
	});

	it("matches the documented member permission set exactly", () => {
		expect(ORG_ROLE_PERMISSIONS.member.sort()).toEqual(
			[
				"org.drafts.create",
				"org.drafts.finalize",
				"org.entries.markUsed",
			].sort(),
		);
	});
});
