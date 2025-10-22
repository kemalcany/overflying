'use client';
import styled from '@emotion/styled';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  jobName: string;
  isDeleting?: boolean;
}

const Overlay = styled(AlertDialog.Overlay)`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  animation: fadeIn 150ms ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Content = styled(AlertDialog.Content)`
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 450px;
  padding: 1.5rem;
  animation: scaleIn 150ms ease-out;

  &:focus {
    outline: none;
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
`;

const Title = styled(AlertDialog.Title)`
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #333;
`;

const Description = styled(AlertDialog.Description)`
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const JobName = styled.span`
  font-weight: 600;
  color: #333;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const Button = styled.button<{variant?: 'danger' | 'secondary'}>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s;

  ${p =>
    p.variant === 'danger'
      ? `
    background: #f44336;
    color: white;
    &:hover:not(:disabled) {
      background: #d32f2f;
    }
  `
      : `
    background: #f5f5f5;
    color: #333;
    &:hover:not(:disabled) {
      background: #e0e0e0;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  jobName,
  isDeleting,
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <Overlay />
        <Content>
          <Title>Delete Job?</Title>
          <Description>
            Are you sure you want to delete <JobName>{jobName}</JobName>? This
            action cannot be undone.
          </Description>
          <ButtonGroup>
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={isDeleting}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant="danger"
                onClick={onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialog.Action>
          </ButtonGroup>
        </Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
