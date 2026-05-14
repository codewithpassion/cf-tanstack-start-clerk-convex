import { describe, expect, it } from "vitest";
import { draftStatusLabel, draftStatusVariant } from "./draft-status";

describe("draftStatusLabel", () => {
	it("labels every draft status", () => {
		expect(draftStatusLabel("generating")).toBe("Generating");
		expect(draftStatusLabel("ready")).toBe("Ready");
		expect(draftStatusLabel("finalized")).toBe("Finalized");
		expect(draftStatusLabel("reopened")).toBe("Reopened");
	});
});

describe("draftStatusVariant", () => {
	it("assigns a distinct variant per status family", () => {
		expect(draftStatusVariant("generating")).toBe("outline");
		expect(draftStatusVariant("finalized")).toBe("default");
		expect(draftStatusVariant("ready")).toBe("secondary");
		expect(draftStatusVariant("reopened")).toBe("secondary");
	});
});
