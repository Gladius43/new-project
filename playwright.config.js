const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    headless: true
  }
});
