import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["tests/reguly/**/*.test.ts"], testTimeout: 20000 } });
