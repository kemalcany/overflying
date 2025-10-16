'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import styled from '@emotion/styled'

const jobFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  priority: z.number().min(0).max(100),
})

export type JobFormData = z.infer<typeof jobFormSchema>

interface JobFormProps {
  defaultValues?: Partial<JobFormData>
  onSubmit: (data: JobFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
`

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  &:focus {
    outline: none;
    border-color: #2196f3;
  }
`

const ErrorMessage = styled.span`
  font-size: 0.75rem;
  color: #f44336;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
`

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s;

  ${(p) =>
    p.variant === 'primary'
      ? `
    background: #2196f3;
    color: white;
    &:hover:not(:disabled) {
      background: #1976d2;
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
`

export const JobForm = ({ defaultValues, onSubmit, onCancel, isSubmitting }: JobFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      priority: defaultValues?.priority ?? 0,
    },
  })

  return (
    <Form onSubmit={handleSubmit((data) => onSubmit(data))}>
      <FormGroup>
        <Label htmlFor="name">Job Name *</Label>
        <Input id="name" {...register('name')} placeholder="Enter job name" />
        {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="priority">Priority</Label>
        <Input id="priority" type="number" {...register('priority', { valueAsNumber: true })} min={0} max={100} placeholder="0" />
        {errors.priority && <ErrorMessage>{errors.priority.message}</ErrorMessage>}
      </FormGroup>

      <ButtonGroup>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </ButtonGroup>
    </Form>
  )
}
