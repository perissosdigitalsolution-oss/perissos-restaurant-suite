import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/db/tests/setup-env.ts"],
  },
});
