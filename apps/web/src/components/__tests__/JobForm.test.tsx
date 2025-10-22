import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {JobForm} from '../JobForm';

describe('JobForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form with all fields', () => {
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/job name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /cancel/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
  });

  it('displays default values when provided', () => {
    render(
      <JobForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        defaultValues={{name: 'Test Job', priority: 10}}
      />,
    );

    expect(screen.getByLabelText(/job name/i)).toHaveValue('Test Job');
    expect(screen.getByLabelText(/priority/i)).toHaveValue(10);
  });

  it('validates required name field', async () => {
    const user = userEvent.setup();
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', {name: /save/i});
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates priority range', async () => {
    const user = userEvent.setup();
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/job name/i);
    const priorityInput = screen.getByLabelText(/priority/i);

    await user.type(nameInput, 'Test Job');
    await user.clear(priorityInput);
    await user.type(priorityInput, '101');

    const submitButton = screen.getByRole('button', {name: /save/i});
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/job name/i);
    const priorityInput = screen.getByLabelText(/priority/i);

    await user.type(nameInput, 'New Job');
    await user.clear(priorityInput);
    await user.type(priorityInput, '5');

    const submitButton = screen.getByRole('button', {name: /save/i});
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Job',
          priority: 5,
        }),
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', {name: /cancel/i});
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('disables buttons when isSubmitting is true', () => {
    render(
      <JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting />,
    );

    const submitButton = screen.getByRole('button', {name: /saving/i});
    const cancelButton = screen.getByRole('button', {name: /cancel/i});

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('shows "Saving..." text when submitting', () => {
    render(
      <JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting />,
    );

    expect(screen.getByRole('button', {name: /saving/i})).toBeInTheDocument();
  });

  it('accepts priority of 0', async () => {
    const user = userEvent.setup();
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/job name/i);
    const priorityInput = screen.getByLabelText(/priority/i);

    await user.type(nameInput, 'Zero Priority Job');
    await user.clear(priorityInput);
    await user.type(priorityInput, '0');

    const submitButton = screen.getByRole('button', {name: /save/i});
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Zero Priority Job',
          priority: 0,
        }),
      );
    });
  });

  it('trims whitespace from name', async () => {
    const user = userEvent.setup();
    render(<JobForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/job name/i);
    await user.type(nameInput, '  Trimmed Job  ');

    const submitButton = screen.getByRole('button', {name: /save/i});
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Trimmed Job'),
        }),
      );
    });
  });
});
