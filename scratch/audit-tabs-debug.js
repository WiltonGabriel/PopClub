const { chromium } = require('playwright-core');

(async () => {
  console.log("Starting Playwright script for visual debugging...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
  });
  const page = await context.newPage();

  console.log("Mocking API routes...");
  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'admin-id',
          role: 'admin',
          email: 'admin@popclub.com',
          permissions: [
            "metrics_view",
            "menu_manage",
            "promotions_manage",
            "coupons_manage",
            "theme_manage",
            "settings_manage",
            "users_manage"
          ]
        }
      })
    });
  });

  await page.route('**/api/settings', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        storeName: "PopClub",
        currentShiftId: "shift-123"
      })
    });
  });

  await page.route('**/api/**', async route => {
    try {
      await route.continue();
    } catch {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    }
  });

  console.log("Navigating to /admin...");
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  
  console.log("Waiting 5 seconds for visual debugging...");
  await page.waitForTimeout(5000);

  console.log("Taking screenshot...");
  await page.screenshot({ path: 'docs/screenshots-audit/admin-debug.png', fullPage: true });

  console.log("Done!");
  await browser.close();
})();
