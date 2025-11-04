import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DeleteConfirmDialog} from '../DeleteConfirmDialog.tsx';

describe('DeleteConfirmDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnConfirm.mockClear();
  });

  it('does not render when open is false', () => {
    render(
      <DeleteConfirmDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
      />,
    );

    expect(screen.getByText(/delete job/i)).toBeInTheDocument();
    expect(screen.getByText(/test job/i)).toBeInTheDocument();
  });

  it('displays the job name in the confirmation message', () => {
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="My Important Job"
      />,
    );

    expect(screen.getByText(/my important job/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('calls onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
      />,
    );

    const deleteButton = screen.getByRole('button', {name: /^delete$/i});
    await user.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
      />,
    );

    const cancelButton = screen.getByRole('button', {name: /cancel/i});
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables buttons when isDeleting is true', () => {
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
        isDeleting
      />,
    );

    const deleteButton = screen.getByRole('button', {name: /deleting/i});
    const cancelButton = screen.getByRole('button', {name: /cancel/i});

    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('shows "Deleting..." text when isDeleting is true', () => {
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
        isDeleting
      />,
    );

    expect(screen.getByRole('button', {name: /deleting/i})).toBeInTheDocument();
  });

  it('does not call onConfirm when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
      />,
    );

    const cancelButton = screen.getByRole('button', {name: /cancel/i});
    await user.click(cancelButton);

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('renders warning message about irreversibility', () => {
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        jobName="Test Job"
      />,
    );

    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });
});
