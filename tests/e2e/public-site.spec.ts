import { test, expect } from '@playwright/test';

test.describe('Public Site', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Cafe Creencia/);
    await expect(page.getByText('Cafe Creencia')).toBeVisible();
  });

  test('should navigate to catalog', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Ver catálogo/i }).click();
    await expect(page).toHaveURL(/catalogo/);
    await expect(page.getByRole('heading', { name: /Nuestro café/i })).toBeVisible();
  });

  test('should filter products by presentation', async ({ page }) => {
    await page.goto('/catalogo');
    await page.getByRole('button', { name: /500g/i }).click();
    await expect(page).toHaveURL(/presentation=500g/);
  });

  test('should see products displayed', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.getByText(/Café/i).first()).toBeVisible();
  });
});

test.describe('Product Detail', () => {
  test('should navigate to product detail', async ({ page }) => {
    await page.goto('/catalogo');
    const productLink = page.locator('a[href^="/producto/"]').first();
    await productLink.click();
    await expect(page).toHaveURL(/producto\//);
  });

  test('should show product information', async ({ page }) => {
    await page.goto('/producto/cafe-tostado-medio');
    await expect(page.getByText(/Café/i)).toBeVisible();
  });

  test('should have WhatsApp button', async ({ page }) => {
    await page.goto('/catalogo');
    const productLink = page.locator('a[href^="/producto/"]').first();
    await productLink.click();
    await expect(page.getByRole('link', { name: /WhatsApp/i })).toBeVisible();
  });
});