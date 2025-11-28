/**
 * ThemeProvider component for managing application theme state.
 * Supports light, dark, and system preference modes.
 * Task Group 23: Dark Mode Support
 */
import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
	theme: Theme;
	effectiveTheme: EffectiveTheme;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
	children: ReactNode;
	workspaceTheme?: Theme;
}

/**
 * Get the effective theme based on system preference
 */
function getSystemTheme(): EffectiveTheme {
	if (typeof window === "undefined") {
		return "light";
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Resolve the effective theme (light or dark) from the theme setting
 */
function resolveEffectiveTheme(theme: Theme): EffectiveTheme {
	if (theme === "system") {
		return getSystemTheme();
	}
	return theme;
}

/**
 * ThemeProvider component that manages theme state and applies it to the document
 */
export function ThemeProvider({ children, workspaceTheme }: ThemeProviderProps) {
	// Initialize with deterministic values for SSR consistency
	const [theme, setThemeState] = useState<Theme>(workspaceTheme || "system");
	const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("light");
	const [mounted, setMounted] = useState(false);

	// Handle initialization on client side
	useEffect(() => {
		setMounted(true);

		// 1. Determine initial theme
		let initialTheme = workspaceTheme || "system";
		if (!workspaceTheme) {
			const stored = localStorage.getItem("theme");
			if (stored === "light" || stored === "dark" || stored === "system") {
				initialTheme = stored;
			}
		}
		setThemeState(initialTheme);

		// 2. Determine effective theme
		setEffectiveTheme(resolveEffectiveTheme(initialTheme));
	}, [workspaceTheme]);

	// Update theme when workspace theme changes (after mount)
	useEffect(() => {
		if (mounted && workspaceTheme) {
			setThemeState(workspaceTheme);
			setEffectiveTheme(resolveEffectiveTheme(workspaceTheme));
		}
	}, [workspaceTheme, mounted]);

	// Listen for system theme changes when theme is set to "system"
	useEffect(() => {
		if (!mounted || theme !== "system") {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => {
			setEffectiveTheme(getSystemTheme());
		};

		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, [theme, mounted]);

	// Apply theme class to document
	useEffect(() => {
		if (!mounted) return;

		const root = document.documentElement;
		const isDark = effectiveTheme === "dark";

		// Remove transition class to prevent flash on initial load
		root.classList.add("theme-transition-disabled");

		if (isDark) {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}

		// Re-enable transitions after a brief delay
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				root.classList.remove("theme-transition-disabled");
			});
		});
	}, [effectiveTheme, mounted]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
		setEffectiveTheme(resolveEffectiveTheme(newTheme));

		// Persist to localStorage
		if (typeof window !== "undefined") {
			localStorage.setItem("theme", newTheme);
		}
	};

	return (
		<ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

/**
 * Hook to access theme context
 */
export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
