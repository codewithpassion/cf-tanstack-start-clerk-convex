import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Vitest can't load the Cloudflare vite plugin (it boots a Workers runtime which
// crashes on node/jsdom test execution) nor TanStack Start's plugin (it expects
// a router context). We strip those plugins down to the bare minimum needed for
// our pure-logic and library-render tests: path aliases and the source dir.
export default defineConfig({
	plugins: [
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		include: [
			"src/**/*.{test,spec}.{ts,tsx}",
			"convex/**/*.{test,spec}.ts",
		],
		exclude: ["node_modules", "dist", ".direct", ".wrangler"],
	},
});
