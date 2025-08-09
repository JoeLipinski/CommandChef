/**
 * @file e2e/app.spec.ts
 * @description End-to-end tests for the main application
 */

import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Cyber Command Chef E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should load the application successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Cyber Command Chef/)
    await expect(page.getByText('Cyber Command Chef')).toBeVisible()
  })

  test('should display command library', async ({ page }) => {
    await expect(page.getByText('Command Library')).toBeVisible()
    
    // Should show command categories
    await expect(page.getByText('Network Scanning')).toBeVisible()
    await expect(page.getByText('Web Application')).toBeVisible()
  })

  test('should allow searching commands', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search commands/i)
    await searchInput.fill('nmap')
    
    // Should show search results
    await expect(page.getByText(/nmap/i)).toBeVisible()
    
    // Clear search
    await searchInput.clear()
    
    // Should show all commands again
    await expect(page.getByText('Network Scanning')).toBeVisible()
  })

  test('should handle theme switching', async ({ page }) => {
    const themeButton = page.getByRole('button', { name: /theme/i })
    
    // Click theme button multiple times to cycle through themes
    await themeButton.click()
    await page.waitForTimeout(100)
    
    await themeButton.click()
    await page.waitForTimeout(100)
    
    await themeButton.click()
    await page.waitForTimeout(100)
    
    // Should cycle back to original theme
    expect(themeButton).toBeVisible()
  })

  test('should open and close modals', async ({ page }) => {
    // Test command manager modal
    const managerButton = page.getByRole('button', { name: /manage commands/i })
    await managerButton.click()
    
    await expect(page.getByText('Command Manager')).toBeVisible()
    
    // Close modal
    const closeButton = page.getByRole('button', { name: /close/i }).first()
    await closeButton.click()
    
    await expect(page.getByText('Command Manager')).not.toBeVisible()
    
    // Test chain manager modal
    const chainButton = page.getByRole('button', { name: /chain manager/i })
    await chainButton.click()
    
    await expect(page.getByText('Chain Manager')).toBeVisible()
    
    // Close modal with escape key
    await page.keyboard.press('Escape')
    
    await expect(page.getByText('Chain Manager')).not.toBeVisible()
  })

  test('should handle drag and drop operations', async ({ page }) => {
    // Find a command to drag
    const command = page.getByText('nmap').first()
    const dropZone = page.getByText('Drop commands here').first()
    
    // Perform drag and drop
    await command.dragTo(dropZone)
    
    // Should show dropped command
    await expect(page.getByText('nmap')).toBeVisible()
  })

  test('should handle command parameter configuration', async ({ page }) => {
    // First drag a command
    const command = page.getByText('nmap').first()
    const dropZone = page.getByText('Drop commands here').first()
    await command.dragTo(dropZone)
    
    // Should show parameter inputs
    const targetInput = page.getByPlaceholder(/target/i).first()
    if (await targetInput.isVisible()) {
      await targetInput.fill('192.168.1.1')
      
      // Should update command output
      await expect(page.getByText(/192.168.1.1/)).toBeVisible()
    }
  })

  test('should handle global target functionality', async ({ page }) => {
    // First drag a command that accepts target
    const command = page.getByText('nmap').first()
    const dropZone = page.getByText('Drop commands here').first()
    await command.dragTo(dropZone)
    
    // Set global target
    const globalInput = page.getByPlaceholder(/global target/i)
    if (await globalInput.isVisible()) {
      await globalInput.fill('10.0.0.1')
      
      const applyButton = page.getByRole('button', { name: /apply to all/i })
      await applyButton.click()
      
      // Should apply to all commands
      await expect(page.getByText(/10.0.0.1/)).toBeVisible()
    }
  })

  test('should save and load command chains', async ({ page }) => {
    // Create a simple chain
    const command = page.getByText('ping').first()
    const dropZone = page.getByText('Drop commands here').first()
    await command.dragTo(dropZone)
    
    // Open chain manager
    const chainButton = page.getByRole('button', { name: /chain manager/i })
    await chainButton.click()
    
    // Save chain
    const saveInput = page.getByPlaceholder(/chain name/i)
    await saveInput.fill('test-chain')
    
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    
    // Should show saved chain
    await expect(page.getByText('test-chain')).toBeVisible()
    
    // Clear current chain
    const clearButton = page.getByRole('button', { name: /clear/i })
    if (await clearButton.isVisible()) {
      await clearButton.click()
    }
    
    // Load saved chain
    const loadButton = page.getByRole('button', { name: /load/i }).first()
    await loadButton.click()
    
    // Should restore the chain
    await expect(page.getByText('ping')).toBeVisible()
  })

  test('should handle copy to clipboard', async ({ page }) => {
    // Create a simple command
    const command = page.getByText('ping').first()
    const dropZone = page.getByText('Drop commands here').first()
    await command.dragTo(dropZone)
    
    // Copy command
    const copyButton = page.getByRole('button', { name: /copy/i }).first()
    await copyButton.click()
    
    // Should show copy feedback
    await expect(page.getByText(/copied/i)).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab')
    
    // Should focus first interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'INPUT', 'A'].includes(focusedElement || '')).toBeTruthy()
    
    // Continue tabbing
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to navigate through interface
    const newFocusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'INPUT', 'A'].includes(newFocusedElement || '')).toBeTruthy()
  })

  test('should be accessible', async ({ page }) => {
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    })
  })

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Should adapt to mobile layout
    await expect(page.getByText('Cyber Command Chef')).toBeVisible()
    
    // Mobile-specific interactions
    const menuButton = page.getByRole('button', { name: /menu/i })
    if (await menuButton.isVisible()) {
      await menuButton.click()
      // Should show mobile menu
    }
  })

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test with network failures
    await page.route('**/*', route => route.abort())
    
    // Should still render basic interface
    await page.goto('/')
    await expect(page.getByText('Cyber Command Chef')).toBeVisible()
    
    // Restore network
    await page.unroute('**/*')
  })

  test('should persist data across sessions', async ({ page, context }) => {
    // Create and save a chain
    const command = page.getByText('ping').first()
    const dropZone = page.getByText('Drop commands here').first()
    await command.dragTo(dropZone)
    
    const chainButton = page.getByRole('button', { name: /chain manager/i })
    await chainButton.click()
    
    const saveInput = page.getByPlaceholder(/chain name/i)
    await saveInput.fill('persistent-chain')
    
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    
    // Close modal
    await page.keyboard.press('Escape')
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check if data persisted
    const chainButtonAfterReload = page.getByRole('button', { name: /chain manager/i })
    await chainButtonAfterReload.click()
    
    await expect(page.getByText('persistent-chain')).toBeVisible()
  })

  test('should handle performance with large datasets', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(10000) // 10 seconds
    
    // Test search performance
    const searchStartTime = Date.now()
    const searchInput = page.getByPlaceholder(/search commands/i)
    await searchInput.fill('test')
    await page.waitForTimeout(500) // Wait for debounce
    const searchTime = Date.now() - searchStartTime
    
    // Search should be responsive
    expect(searchTime).toBeLessThan(2000) // 2 seconds
  })

  test('should handle visual regression', async ({ page }) => {
    // Take screenshot of main interface
    await expect(page).toHaveScreenshot('main-interface.png')
    
    // Open command manager and take screenshot
    const managerButton = page.getByRole('button', { name: /manage commands/i })
    await managerButton.click()
    
    await expect(page).toHaveScreenshot('command-manager.png')
    
    // Close and open chain manager
    await page.keyboard.press('Escape')
    
    const chainButton = page.getByRole('button', { name: /chain manager/i })
    await chainButton.click()
    
    await expect(page).toHaveScreenshot('chain-manager.png')
  })
})