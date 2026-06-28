import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3005",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3005",
    env: {
      NEXT_PUBLIC_DISABLE_AUTH: "1",
      NEXT_PUBLIC_ENABLE_MOCK_CROP: "1",
    },
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:3005",
  },
});
