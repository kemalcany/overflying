import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobDialog } from '../JobDialog'

describe('JobDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnOpenChange.mockClear()
    mockOnSubmit.mockClear()
  })

  it('does not render when open is false', () => {
    render(<JobDialog open={false} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open is true', () => {
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />)

    expect(screen.getByText(/create job/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/job name/i)).toBeInTheDocument()
  })

  it('displays custom title when provided', () => {
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} title="Edit Job" />)

    expect(screen.getByText(/edit job/i)).toBeInTheDocument()
  })

  it('displays default values in form', () => {
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} defaultValues={{ name: 'Existing Job', priority: 15 }} />)

    expect(screen.getByLabelText(/job name/i)).toHaveValue('Existing Job')
    expect(screen.getByLabelText(/priority/i)).toHaveValue(15)
  })

  it('calls onSubmit with form data when form is submitted', async () => {
    const user = userEvent.setup()
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/job name/i)
    await user.type(nameInput, 'Test Job')

    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Job',
        priority: 0,
      })
    })
  })

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />)

    // Radix Dialog close button
    const closeButton = screen.getByRole('button', { name: '' })
    await user.click(closeButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows loading state when isSubmitting is true', () => {
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} isSubmitting />)

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('does not call onSubmit when form validation fails', async () => {
    const user = userEvent.setup()
    render(<JobDialog open={true} onOpenChange={mockOnOpenChange} onSubmit={mockOnSubmit} />)

    // Don't fill in the name (required field)
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})
