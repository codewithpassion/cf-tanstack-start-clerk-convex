import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "./dedupe";

describe("canonicalizeUrl", () => {
	const cases: { name: string; input: string; expected: string }[] = [
		{
			name: "lowercases the hostname",
			input: "https://EXAMPLE.com/path",
			expected: "https://example.com/path",
		},
		{
			name: "removes the URL fragment",
			input: "https://example.com/post#section-2",
			expected: "https://example.com/post",
		},
		{
			name: "strips utm_* parameters",
			input:
				"https://example.com/post?utm_source=newsletter&utm_medium=email&utm_campaign=launch",
			expected: "https://example.com/post",
		},
		{
			name: "strips fbclid",
			input: "https://example.com/post?fbclid=abc123",
			expected: "https://example.com/post",
		},
		{
			name: "strips gclid",
			input: "https://example.com/post?gclid=xyz",
			expected: "https://example.com/post",
		},
		{
			name: "drops a trailing slash on non-root paths",
			input: "https://example.com/blog/post/",
			expected: "https://example.com/blog/post",
		},
		{
			name: "keeps the root slash",
			input: "https://example.com/",
			expected: "https://example.com/",
		},
		{
			name: "strips the default https port",
			input: "https://example.com:443/post",
			expected: "https://example.com/post",
		},
		{
			name: "strips the default http port",
			input: "http://example.com:80/post",
			expected: "http://example.com/post",
		},
		{
			name: "preserves www.",
			input: "https://www.example.com/post",
			expected: "https://www.example.com/post",
		},
		{
			name: "preserves non-tracking query params in original order",
			input: "https://example.com/search?q=hello&page=2&utm_source=foo",
			expected: "https://example.com/search?q=hello&page=2",
		},
		{
			name: "returns the trimmed input when not a valid URL",
			input: "   not a url   ",
			expected: "not a url",
		},
	];

	for (const c of cases) {
		it(c.name, () => {
			expect(canonicalizeUrl(c.input)).toBe(c.expected);
		});
	}
});
