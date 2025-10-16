import { test, expect } from '@playwright/test'

test.describe('Job Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Open create dialog
    await page.getByRole('button', { name: /create job/i }).click()
  })

  test('shows validation error for empty job name', async ({ page }) => {
    // Try to submit without filling name
    await page.getByRole('button', { name: /save/i }).click()

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible()

    // Dialog should still be open - check for the heading specifically
    await expect(page.getByRole('heading', { name: /create job/i })).toBeVisible()
  })

  test('shows validation error for whitespace-only name', async ({ page }) => {
    // Fill name with only spaces
    await page.getByLabel(/job name/i).fill('   ')
    await page.getByRole('button', { name: /save/i }).click()

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible()
  })

  test('accepts valid job name', async ({ page }) => {
    await page.getByLabel(/job name/i).fill('Valid Job Name')
    await page.getByRole('button', { name: /save/i }).click()

    // Should not show validation error
    await expect(page.getByText(/name is required/i)).not.toBeVisible()

    // Should show success
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
  })

  test('validates priority is within range', async ({ page }) => {
    await page.getByLabel(/job name/i).fill('Test Job')

    // Try to set negative priority - the min attribute should prevent it
    const priorityInput = page.getByLabel(/priority/i)

    // Check that the min attribute is set
    await expect(priorityInput).toHaveAttribute('min', '0')

    // Fill with -1 and verify the form validation will catch it
    await priorityInput.fill('-1')
    await page.getByRole('button', { name: /save/i }).click()

    // The form should still be open (HTML5 validation should prevent submission)
    await expect(page.getByRole('heading', { name: /create job/i })).toBeVisible()
  })

  test('accepts priority of 0', async ({ page }) => {
    await page.getByLabel(/job name/i).fill('Zero Priority Job')
    await page.getByLabel(/priority/i).fill('0')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Check the created job - use first() to handle multiple matches
    await expect(page.getByRole('heading', { name: 'Zero Priority Job' }).first()).toBeVisible()
    await expect(page.getByText(/priority: 0/i).first()).toBeVisible()
  })

  test('accepts maximum priority of 100', async ({ page }) => {
    await page.getByLabel(/job name/i).fill('Max Priority Job')
    await page.getByLabel(/priority/i).fill('100')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/priority: 100/i).first()).toBeVisible()
  })

  test('validation works in edit mode', async ({ page }) => {
    // First create a job
    await page.getByLabel(/job name/i).fill('Job to Edit')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()

    // Find and click the edit button - use a more specific selector
    await page.getByRole('button', { name: /edit/i }).first().click()

    // Wait for edit dialog to open
    await expect(page.getByRole('heading', { name: /edit job/i })).toBeVisible()

    // Clear the name
    await page.getByLabel(/job name/i).clear()

    // Try to save
    await page.getByRole('button', { name: /save/i }).click()

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible()

    // Dialog should still be open
    await expect(page.getByRole('heading', { name: /edit job/i })).toBeVisible()
  })

  test('allows special characters in job name', async ({ page }) => {
    const specialName = 'Job_123-Test@Example.com (v2)'
    await page.getByLabel(/job name/i).fill(specialName)
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: specialName }).first()).toBeVisible()
  })

  test('handles very long job names', async ({ page }) => {
    const longName = 'A'.repeat(200)
    await page.getByLabel(/job name/i).fill(longName)
    await page.getByRole('button', { name: /save/i }).click()

    // Should accept long names (backend will validate if there's a limit)
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
  })

  test('default priority is 0 when not specified', async ({ page }) => {
    await page.getByLabel(/job name/i).fill('Default Priority Job')

    // Don't touch priority field (should default to 0)
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/priority: 0/i).first()).toBeVisible()
  })

  test('can clear and re-enter form data', async ({ page }) => {
    // Fill form
    await page.getByLabel(/job name/i).fill('First Name')
    await page.getByLabel(/priority/i).fill('50')

    // Clear and re-enter
    await page.getByLabel(/job name/i).clear()
    await page.getByLabel(/job name/i).fill('Second Name')
    await page.getByLabel(/priority/i).clear()
    await page.getByLabel(/priority/i).fill('75')

    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: 'Second Name' }).first()).toBeVisible()
    await expect(page.getByText(/priority: 75/i).first()).toBeVisible()
  })

  test('validation persists until fixed', async ({ page }) => {
    // Submit empty form
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/name is required/i)).toBeVisible()

    // Fill in valid name
    await page.getByLabel(/job name/i).fill('Fixed Job')

    // Submit again
    await page.getByRole('button', { name: /save/i }).click()

    // Should succeed now
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })
  })

  test('close button works even with validation errors', async ({ page }) => {
    // Trigger validation error
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/name is required/i)).toBeVisible()

    // Should still be able to close dialog
    await page.getByRole('button', { name: /cancel/i }).click()

    // Dialog should close - check that heading is not visible
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()
  })
})
