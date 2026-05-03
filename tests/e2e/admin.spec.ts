import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'Admin123!');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await expect(page).toHaveURL(/admin/);
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText(/Dashboard/i)).toBeVisible();
  });

  test('should navigate to products', async ({ page }) => {
    await page.goto('/admin/productos');
    await expect(page.getByRole('heading', { name: /Productos/i })).toBeVisible();
  });

  test('should navigate to sales', async ({ page }) => {
    await page.goto('/admin/ventas');
    await expect(page.getByRole('heading', { name: /Ventas/i })).toBeVisible();
  });

  test('should navigate to inventory', async ({ page }) => {
    await page.goto('/admin/inventario');
    await expect(page.getByRole('heading', { name: /Inventario/i })).toBeVisible();
  });

  test('should navigate to notifications', async ({ page }) => {
    await page.goto('/admin/notificaciones');
    await expect(page.getByRole('heading', { name: /Notificaciones/i })).toBeVisible();
  });
});