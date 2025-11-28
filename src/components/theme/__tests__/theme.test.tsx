/**
 * Tests for dark mode theme functionality
 * Task Group 23: Dark Mode Support
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";

// Test component to access theme context
function TestComponent() {
	const { theme, effectiveTheme } = useTheme();
	return (
		<div>
			<div data-testid="theme">{theme}</div>
			<div data-testid="effective-theme">{effectiveTheme}</div>
		</div>
	);
}

describe("Dark Mode Theme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.className = "";
		// Mock matchMedia
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			configurable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: query === "(prefers-color-scheme: dark)",
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	});

	describe("ThemeProvider", () => {
		it("should read theme from localStorage when available", () => {
			localStorage.setItem("theme", "dark");

			render(
				<ThemeProvider workspaceTheme={undefined}>
					<TestComponent />
				</ThemeProvider>,
			);

			expect(screen.getByTestId("theme").textContent).toBe("dark");
			expect(screen.getByTestId("effective-theme").textContent).toBe("dark");
		});

		it("should prioritize workspace preference over localStorage", () => {
			localStorage.setItem("theme", "dark");

			render(
				<ThemeProvider workspaceTheme="light">
					<TestComponent />
				</ThemeProvider>,
			);

			expect(screen.getByTestId("theme").textContent).toBe("light");
			expect(screen.getByTestId("effective-theme").textContent).toBe("light");
		});

		it("should apply dark class to document when theme is dark", () => {
			render(
				<ThemeProvider workspaceTheme="dark">
					<TestComponent />
				</ThemeProvider>,
			);

			// Class should be applied after useEffect runs
			expect(document.documentElement.classList.contains("dark")).toBe(true);
		});

		it("should default to system theme when no preference set", () => {
			render(
				<ThemeProvider workspaceTheme={undefined}>
					<TestComponent />
				</ThemeProvider>,
			);

			expect(screen.getByTestId("theme").textContent).toBe("system");
			// With our mock, system preference is dark
			expect(screen.getByTestId("effective-theme").textContent).toBe("dark");
		});
	});
});
