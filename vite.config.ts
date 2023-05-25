import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import * as path from "path"

export default defineConfig({
    plugins: [tsconfigPaths()],
    build: {
        manifest: true,
        minify: true,
        reportCompressedSize: true,
        lib: {
            entry: path.resolve(__dirname, "src/saddlebag.ts"),
            fileName: "saddlebag",
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: [],
            plugins: [
                typescriptPaths({
                    preserveExtensions: true,
                }),
                typescript({
                    sourceMap: false,
                    declaration: true,
                    outDir: "dist",
                }),
            ],
        },
    },
})