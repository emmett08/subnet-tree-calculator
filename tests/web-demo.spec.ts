import { test, expect } from '@playwright/test';

/**
 * Subnet Tree Calculator - Web UI Demo
 * 
 * This test creates a comprehensive video demonstration of all web UI features:
 * 1. Initial state & IPv4 basics
 * 2. Tree operations (split, merge)
 * 3. Zoom & pan controls
 * 4. Base CIDR changes
 * 5. Max depth control
 * 6. IPv6 mode
 * 7. Dark theme
 * 8. Combined operations
 * 
 * Video output: test-results/.../video.webm (can be converted to MP4)
 */

test.describe('Subnet Tree Calculator - Complete Web Demo', () => {
  test('demonstrates all web UI use-cases', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // ========================================
    // SECTION 1: Introduction & Initial State
    // ========================================
    await page.waitForTimeout(2000); // Pause to show initial state
    
    // Verify SVG is rendered
    await expect(page.locator('svg')).toBeVisible();
    await page.waitForTimeout(1500);
    
    // ========================================
    // SECTION 2: IPv4 Basic Operations
    // ========================================
    
    // Split the root node multiple times
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    // ========================================
    // SECTION 3: View Controls
    // ========================================
    
    // Fit view
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.waitForTimeout(2000);
    
    // ========================================
    // SECTION 4: Change Base CIDR
    // ========================================
    
    // Change to a different IPv4 network
    const cidrInput = page.locator('input[placeholder*="e.g."]');
    await cidrInput.clear();
    await cidrInput.fill('192.168.0.0/24');
    await page.waitForTimeout(1000);
    
    await page.locator('.stc__button--primary').click();
    await page.waitForTimeout(2500);
    
    // Split the new network
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(1500);
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    // ========================================
    // SECTION 5: Max Depth Control
    // ========================================
    
    // Change max depth
    const depthInput = page.locator('input[type="number"]');
    await depthInput.clear();
    await depthInput.fill('8');
    await page.waitForTimeout(1500);
    
    // ========================================
    // SECTION 6: IPv6 Mode
    // ========================================
    
    // Switch to IPv6
    await page.locator('label:has-text("IPv6") input[type="radio"]').click();
    await page.waitForTimeout(3000); // Wait for IPv6 to load
    
    // Verify IPv6 CIDR is loaded
    await expect(page.locator('svg')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Split IPv6 network multiple times
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    // Fit view to see the whole IPv6 tree
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.waitForTimeout(2000);
    
    // ========================================
    // SECTION 7: Dark Theme
    // ========================================
    
    // Enable dark theme
    await page.locator('label:has-text("Dark theme") input[type="checkbox"]').click();
    await page.waitForTimeout(3000); // Wait to show dark theme
    
    // Fit view in dark theme
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.waitForTimeout(1500);
    
    // ========================================
    // SECTION 8: Back to IPv4 with Dark Theme
    // ========================================
    
    // Switch back to IPv4 with dark theme
    await page.locator('label:has-text("IPv4") input[type="radio"]').click();
    await page.waitForTimeout(3000);
    
    // Perform operations in dark theme
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(1500);
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    await page.locator('.stc__button--ok').first().click();
    await page.waitForTimeout(2000);
    
    // ========================================
    // SECTION 9: Final View
    // ========================================
    
    // Fit view for final showcase
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.waitForTimeout(3000);
    
    // End with a clean view
    await page.waitForTimeout(2000);
  });
});

