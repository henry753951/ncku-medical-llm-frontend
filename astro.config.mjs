// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server",
	security: {
		checkOrigin: false,
	},
	adapter: node({
		mode: "standalone",
	}),
	vite: {
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (!id.includes("node_modules")) {
							return undefined;
						}
						if (id.includes("@heroui") || id.includes("react-aria")) {
							return "vendor-heroui";
						}
						if (id.includes("motion")) {
							return "vendor-motion";
						}
						return undefined;
					},
				},
			},
		},
	},
	integrations: [react(), vue()],
});
