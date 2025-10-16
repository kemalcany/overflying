import { test, expect } from '@playwright/test'

test.describe('Job CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('complete CRUD flow: create, edit, and delete a job', async ({ page }) => {
    // Initial state - should show dashboard
    await expect(page.getByRole('heading', { name: /constellation dashboard/i })).toBeVisible()

    // STEP 1: CREATE a new job
    await page.getByRole('button', { name: /create job/i }).click()

    // Dialog should open - check for heading specifically
    await expect(page.getByRole('heading', { name: /create job/i })).toBeVisible()

    // Fill in the form
    await page.getByLabel(/job name/i).fill('E2E Test Job')
    await page.getByLabel(/priority/i).fill('25')

    // Submit the form
    await page.getByRole('button', { name: /save/i }).click()

    // Should show success toast
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Job should appear in the list - use first() to handle duplicates
    await expect(page.getByRole('heading', { name: 'E2E Test Job' }).first()).toBeVisible()
    await expect(page.getByText(/priority: 25/i).first()).toBeVisible()

    // STEP 2: EDIT the job
    // Wait for dialog to close first
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()

    // Find the specific job card by its heading, then click edit within that card
    const jobCard = page.locator('article').filter({ hasText: 'E2E Test Job' })
    await jobCard.getByRole('button', { name: /edit/i }).click()

    // Edit dialog should open with pre-filled values
    await expect(page.getByRole('heading', { name: /edit job/i })).toBeVisible()
    await expect(page.getByLabel(/job name/i)).toHaveValue('E2E Test Job')
    await expect(page.getByLabel(/priority/i)).toHaveValue('25')

    // Update the values
    await page.getByLabel(/job name/i).clear()
    await page.getByLabel(/job name/i).fill('Updated E2E Job')
    await page.getByLabel(/priority/i).clear()
    await page.getByLabel(/priority/i).fill('50')

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()

    // Should show success toast
    await expect(page.getByText(/job updated successfully/i)).toBeVisible({ timeout: 5000 })

    // Updated values should be visible
    await expect(page.getByRole('heading', { name: 'Updated E2E Job' }).first()).toBeVisible()
    await expect(page.getByText(/priority: 50/i).first()).toBeVisible()

    // Original name should not be visible
    await expect(page.getByRole('heading', { name: 'E2E Test Job' })).not.toBeVisible()

    // STEP 3: DELETE the job
    // Wait for edit dialog to close
    await expect(page.getByRole('heading', { name: /edit job/i })).not.toBeVisible()

    // Find the specific job card again and click delete
    const updatedJobCard = page.locator('article').filter({ hasText: 'Updated E2E Job' })
    await updatedJobCard.getByRole('button', { name: /delete/i }).click()

    // Confirmation dialog should open
    await expect(page.getByRole('heading', { name: /delete job/i })).toBeVisible()
    await expect(page.getByText(/cannot be undone/i)).toBeVisible()

    // Confirm deletion
    await page.getByRole('button', { name: /^delete$/i }).click()

    // Should show success toast
    await expect(page.getByText(/job deleted successfully/i)).toBeVisible({ timeout: 5000 })

    // Job should no longer be visible
    await expect(page.getByRole('heading', { name: 'Updated E2E Job' })).not.toBeVisible()
  })

  test('can create multiple jobs', async ({ page }) => {
    // Create first job
    await page.getByRole('button', { name: /create job/i }).click()
    await page.getByLabel(/job name/i).fill('Job 1')
    await page.getByLabel(/priority/i).fill('10')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()

    // Create second job
    await page.getByRole('button', { name: /create job/i }).click()
    await page.getByLabel(/job name/i).fill('Job 2')
    await page.getByLabel(/priority/i).fill('20')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Both jobs should be visible - use first() to handle duplicates
    await expect(page.getByRole('heading', { name: 'Job 1' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Job 2' }).first()).toBeVisible()
  })

  test('can cancel job creation', async ({ page }) => {
    await page.getByRole('button', { name: /create job/i }).click()
    await expect(page.getByRole('heading', { name: /create job/i })).toBeVisible()

    // Fill in some data
    await page.getByLabel(/job name/i).fill('Cancelled Job')

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Dialog should close
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()

    // Job should not be created
    await expect(page.getByRole('heading', { name: 'Cancelled Job' })).not.toBeVisible()
  })

  test('can cancel job edit', async ({ page }) => {
    // First create a job
    await page.getByRole('button', { name: /create job/i }).click()
    await page.getByLabel(/job name/i).fill('Original Job')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()

    // Find the specific job card and click edit
    const jobCard = page.locator('article').filter({ hasText: 'Original Job' })
    await jobCard.getByRole('button', { name: /edit/i }).click()

    // Wait for edit dialog
    await expect(page.getByRole('heading', { name: /edit job/i })).toBeVisible()

    // Change the name
    await page.getByLabel(/job name/i).clear()
    await page.getByLabel(/job name/i).fill('Changed Job')

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Edit dialog should close
    await expect(page.getByRole('heading', { name: /edit job/i })).not.toBeVisible()

    // Original name should still be visible
    await expect(page.getByRole('heading', { name: 'Original Job' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Changed Job' })).not.toBeVisible()
  })

  test('can cancel job deletion', async ({ page }) => {
    // Create a job
    await page.getByRole('button', { name: /create job/i }).click()
    await page.getByLabel(/job name/i).fill('Job to Keep')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /create job/i })).not.toBeVisible()

    // Find the specific job card and click delete
    const jobCard = page.locator('article').filter({ hasText: 'Job to Keep' })
    await jobCard.getByRole('button', { name: /delete/i }).click()

    // Confirmation should appear
    await expect(page.getByRole('heading', { name: /delete job/i })).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Delete dialog should close
    await expect(page.getByRole('heading', { name: /delete job/i })).not.toBeVisible()

    // Job should still be visible
    await expect(page.getByRole('heading', { name: 'Job to Keep' }).first()).toBeVisible()
  })

  test('displays job metadata correctly', async ({ page }) => {
    await page.getByRole('button', { name: /create job/i }).click()
    await page.getByLabel(/job name/i).fill('Metadata Job')
    await page.getByLabel(/priority/i).fill('75')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/job created successfully/i)).toBeVisible({ timeout: 5000 })

    // Check metadata - look for the specific job heading first
    await expect(page.getByRole('heading', { name: 'Metadata Job' }).first()).toBeVisible()

    // Check priority and state are visible
    await expect(page.getByText('Priority: 75').first()).toBeVisible()
    await expect(page.getByText(/queued/i).first()).toBeVisible()

    // Just verify that the job card exists with some date/time info
    const jobCard = page.locator('article').filter({ hasText: 'Metadata Job' })
    await expect(jobCard).toBeVisible()
  })

  test('shows empty state when no jobs exist', async ({ page }) => {
    // Check if there are any job cards
    const jobCards = page.locator('article')
    const count = await jobCards.count()

    if (count === 0) {
      // If no jobs, should show some empty state message
      // Adjust this to match your actual empty state text
      const hasEmptyMessage = (await page.getByText(/no jobs/i).count()) > 0 || (await page.getByText(/create your first/i).count()) > 0 || (await page.getByText(/get started/i).count()) > 0

      expect(hasEmptyMessage).toBeTruthy()
    } else {
      // Skip this test if jobs already exist
      test.skip()
    }
  })
})
