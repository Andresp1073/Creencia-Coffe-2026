import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Admin/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="username"]', 'wronguser');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await expect(page.getByText(/Credenciales incorrectas/i)).toBeVisible();
  });

  test('should redirect to admin after successful login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'Admin123!');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await expect(page).toHaveURL(/admin/);
  });

  test('should redirect to login when accessing admin without session', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/login/);
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /Olvidaste tu contraseña/i })).toBeVisible();
  });
});