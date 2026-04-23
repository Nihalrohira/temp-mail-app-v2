import { test, expect } from '@playwright/test';

test('delete email removes it from inbox', async ({ page }) => {
await page.goto('http://localhost:3000');

await page.route('**/inbox**', async (route) => {
await route.fulfill({
status: 200,
contentType: 'application/json',
body: JSON.stringify([
{
id: "1",
from: "[test@test.com](mailto:test@test.com)",
subject: "Test Email",
body: "Hello World",
timestamp: new Date().toISOString(),
deleted: false
}
])
});
});

// Mock delete API
await page.route('**/delete-message**', async (route) => {
await route.fulfill({
status: 200,
contentType: 'application/json',
body: JSON.stringify({ success: true })
});
});

await page.click('[data-testid="generate-email-btn"]');
await page.click('text=Refresh Inbox');

await expect(page.locator('text=Test Email')).toBeVisible();

// Open email
await page.click('text=Test Email');

// Click delete WITHOUT waiting for stability
await page.locator('[data-testid="delete-email-btn"]').click({
force: true,
timeout: 5000
});

// Immediately verify email disappears (no delay)
await expect(page.locator('text=Test Email')).not.toBeVisible();
});
