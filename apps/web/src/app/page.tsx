'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, connectJobEvents } from '@/app/api'
import styled from '@emotion/styled'
import { toast } from 'sonner'
import { JobDialog } from '@/components/JobDialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import type { JobFormData } from '@/components/JobForm'
import { SplineScene } from '@/components/SplineScene'

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  color: #333;
  margin: 0;
`

const CreateButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1976d2;
  }
`

const JobGrid = styled.div`
  display: grid;
  gap: 1rem;
`

const JobCard = styled.div<{ state: string }>`
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid ${(p) => (p.state === 'completed' ? '#4caf50' : p.state === 'running' ? '#ff9800' : p.state === 'failed' ? '#f44336' : '#2196f3')};
  background: ${(p) => (p.state === 'completed' ? '#e8f5e9' : p.state === 'running' ? '#fff3e0' : p.state === 'failed' ? '#ffebee' : '#e3f2fd')};
  position: relative;
`

const JobHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`

const JobName = styled.h3`
  margin: 0;
  color: #333;
  flex: 1;
`

const JobActions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const IconButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  color: #666;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    border-color: #bbb;
  }
`

const JobMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
  flex-wrap: wrap;
`

const Badge = styled.span<{ state: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${(p) => (p.state === 'completed' ? '#4caf50' : p.state === 'running' ? '#ff9800' : p.state === 'failed' ? '#f44336' : '#2196f3')};
  color: white;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
`

interface Job {
  id: string
  name: string
  priority: number
  state: string
  created_at: string
}

const HomePage = () => {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deletingJob, setDeletingJob] = useState<Job | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<any>(null)

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.getJobs,
  })

  useEffect(() => {
    if (!sseConnected) return

    const eventSource = connectJobEvents(
      (event) => {
        setLastEvent(event)
        if (event.job_id && event.state) {
          queryClient.invalidateQueries({ queryKey: ['jobs'] })
          toast.info(`Job ${event.job_id.slice(0, 8)}: ${event.state}`)
        }
      },
      (error) => {
        toast.error('SSE connection error')
        setSseConnected(false)
      }
    )

    return () => {
      eventSource.close()
    }
  }, [sseConnected, queryClient])

  const createMutation = useMutation({
    mutationFn: api.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setIsCreateDialogOpen(false)
      toast.success('Job created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create job: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobFormData> }) => api.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setEditingJob(null)
      toast.success('Job updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update job: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setDeletingJob(null)
      toast.success('Job deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete job: ${error.message}`)
    },
  })

  const handleCreate = (data: JobFormData) => {
    createMutation.mutate({
      name: data.name,
      priority: data.priority,
      params: {},
    })
  }

  const handleEdit = (data: JobFormData) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data })
    }
  }

  const handleDelete = () => {
    if (deletingJob) {
      deleteMutation.mutate(deletingJob.id)
    }
  }

  if (isLoading) {
    return (
      <Container>
        <Title>Loading...</Title>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Dashboard</Title>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CreateButton
            onClick={() => setSseConnected(!sseConnected)}
            style={{ background: sseConnected ? '#f44336' : '#4caf50' }}
          >
            {sseConnected ? '🔴 Stop SSE' : '🟢 Start SSE'}
          </CreateButton>
          <CreateButton onClick={() => setIsCreateDialogOpen(true)}>Create Job</CreateButton>
        </div>
      </Header>

      {/*
      <SplineScene scene="https://prod.spline.design/Tx1XLWOMrLaBfrR6/scene.splinecode" />
      */}

      {jobs && jobs.length > 0 ? (
        <JobGrid>
          {jobs.map((job) => (
            <JobCard key={job.id} state={job.state}>
              <JobHeader>
                <JobName>{job.name}</JobName>
                <JobActions>
                  <IconButton onClick={() => setEditingJob(job)} title="Edit job">
                    Edit
                  </IconButton>
                  <IconButton onClick={() => setDeletingJob(job)} title="Delete job">
                    Delete
                  </IconButton>
                </JobActions>
              </JobHeader>
              <JobMeta>
                <Badge state={job.state}>{job.state}</Badge>
                <span>Priority: {job.priority}</span>
                <span>{new Date(job.created_at).toLocaleString()}</span>
              </JobMeta>
            </JobCard>
          ))}
        </JobGrid>
      ) : (
        <EmptyState>
          <p>No jobs yet. Create your first job to get started!</p>
        </EmptyState>
      )}

      <JobDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSubmit={handleCreate} title="Create Job" isSubmitting={createMutation.isPending} />

      <JobDialog
        open={!!editingJob}
        onOpenChange={(open) => !open && setEditingJob(null)}
        onSubmit={handleEdit}
        defaultValues={editingJob ? { name: editingJob.name, priority: editingJob.priority } : undefined}
        title="Edit Job"
        isSubmitting={updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
        onConfirm={handleDelete}
        jobName={deletingJob?.name || ''}
        isDeleting={deleteMutation.isPending}
      />
    </Container>
  )
}

export default HomePage
