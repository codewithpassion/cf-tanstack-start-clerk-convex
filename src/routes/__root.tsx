import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ClerkProvider } from "@clerk/tanstack-react-start";
import { useQuery } from "convex/react";

import Header from "../components/Header";

import appCss from "../styles.css?url";
import { ConvexClientProvider } from "@/lib/convex";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { api } from "../../convex/_generated/api";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
		scripts: [
			{
				children: `
					(function() {
						try {
							var storageKey = 'theme';
							var className = 'dark';
							var element = document.documentElement;
							var stored = localStorage.getItem(storageKey);
							var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
							
							if (isDark) {
								element.classList.add(className);
							}
							
							// Disable transitions until hydration is complete to prevent flashing
							element.classList.add('theme-transition-disabled');
						} catch (e) {}
					})();
				`,
			},
		],
	}),

	shellComponent: RootDocument,
	notFoundComponent: () => <div>404 - Not Found</div>,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<ClerkProvider>
			<ConvexClientProvider convexUrl={import.meta.env.VITE_CONVEX_URL}>
				<AuthProvider>
					<ThemeWrapper>{children}</ThemeWrapper>
				</AuthProvider>
			</ConvexClientProvider>
		</ClerkProvider>
	);
}

/**
 * ThemeWrapper component to fetch workspace theme and wrap with ThemeProvider
 */
function ThemeWrapper({ children }: { children: React.ReactNode }) {
	const workspace = useQuery(api.workspaces.getMyWorkspace);
	const workspaceTheme = workspace?.themePreference;

	return (
		<ThemeProvider workspaceTheme={workspaceTheme}>
			<html lang="en">
				<head>
					<HeadContent />
				</head>
				<body>
					<Header />
					{children}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
					<Scripts />
				</body>
			</html>
		</ThemeProvider>
	);
}
