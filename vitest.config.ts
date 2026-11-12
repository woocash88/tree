import { configDefaults, defineConfig } from "vitest/config";

// Testy reguł Firestore wymagają emulatora – uruchamia je osobno `npm run test:reguly`.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, "tests/reguly/**"] } });
