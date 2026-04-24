import { test, expect } from '@playwright/test';

test('generate email and verify UI works', async ({ page }) => {
await page.goto('http://127.0.0.1:3000');

// Click generate email
await page.click('[data-testid="generate-email-btn"]');

// Get generated email value
const emailInput = page.locator('input');
const value = await emailInput.inputValue();

// Validate email is generated
expect(value).toContain('@');

// Refresh inbox (no assumption of emails)
await page.click('text=Refresh Inbox');

// Just verify page is still working
await expect(emailInput).toBeVisible();
});
