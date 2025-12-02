/**
 * ThemeToggle component for switching between light, dark, and system themes.
 * Task Group 23: Dark Mode Support
 */
import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "./ThemeProvider";

/**
 * ThemeToggle dropdown component
 */
export function ThemeToggle() {
	const { theme, effectiveTheme, setTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const updateThemePreference = useMutation(api.workspaces.updateThemePreference);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen]);

	const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
		setTheme(newTheme);
		setIsOpen(false);

		// Update workspace preference
		try {
			await updateThemePreference({ themePreference: newTheme });
		} catch (error) {
			console.error("Failed to update theme preference:", error);
		}
	};

	// Get icon based on effective theme
	const ThemeIcon = effectiveTheme === "dark" ? Moon : Sun;

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				aria-label="Toggle theme"
				type="button"
			>
				<ThemeIcon size={20} className="text-gray-900 dark:text-white" />
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
					<button
						onClick={() => handleThemeChange("light")}
						className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${theme === "light"
								? "bg-gray-100 dark:bg-gray-700 text-cyan-600 dark:text-cyan-400"
								: "text-gray-900 dark:text-gray-100"
							}`}
						type="button"
					>
						<Sun size={18} />
						<span className="font-medium">Light</span>
					</button>

					<button
						onClick={() => handleThemeChange("dark")}
						className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${theme === "dark"
								? "bg-gray-100 dark:bg-gray-700 text-cyan-600 dark:text-cyan-400"
								: "text-gray-900 dark:text-gray-100"
							}`}
						type="button"
					>
						<Moon size={18} />
						<span className="font-medium">Dark</span>
					</button>

					<button
						onClick={() => handleThemeChange("system")}
						className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${theme === "system"
								? "bg-gray-100 dark:bg-gray-700 text-cyan-600 dark:text-cyan-400"
								: "text-gray-900 dark:text-gray-100"
							}`}
						type="button"
					>
						<Monitor size={18} />
						<span className="font-medium">System</span>
					</button>
				</div>
			)}
		</div>
	);
}
