'use client';

import styled from '@emotion/styled';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
// import {useRouter} from 'next/navigation'; // Removed for static export
import {DeleteConfirmDialog} from '@/components/DeleteConfirmDialog.tsx';
import {JobDialog} from '@/components/JobDialog.tsx';
import type {JobFormData} from '@/components/JobForm.tsx';
import {api, connectJobEvents} from '@/lib/api.ts';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderContent = styled.div``;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
`;

const Description = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button<{variant?: 'primary' | 'success' | 'danger'}>`
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: ${p =>
    p.variant === 'success'
      ? '#4caf50'
      : p.variant === 'danger'
        ? '#f44336'
        : '#2563eb'};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${p =>
      p.variant === 'success'
        ? '#388e3c'
        : p.variant === 'danger'
          ? '#d32f2f'
          : '#1d4ed8'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TableContainer = styled.div`
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &.text-right {
    text-align: right;
  }
`;

const TableCell = styled.td`
  padding: 16px;
  font-size: 14px;
  color: #111827;

  &.text-right {
    text-align: right;
  }

  &.muted {
    color: #6b7280;
  }
`;

const Badge = styled.span<{state: string}>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
  background: ${p =>
    p.state === 'completed'
      ? '#dcfce7'
      : p.state === 'running'
        ? '#fef3c7'
        : p.state === 'failed'
          ? '#fee2e2'
          : '#dbeafe'};
  color: ${p =>
    p.state === 'completed'
      ? '#166534'
      : p.state === 'running'
        ? '#92400e'
        : p.state === 'failed'
          ? '#991b1b'
          : '#1e40af'};
`;

const ActionCell = styled.div`
  display: flex;
  gap: 4px;
  justify-content: flex-end;
`;

const IconButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  color: #374151;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: #6b7280;
`;

interface Job {
  id: string;
  name: string;
  priority: number;
  state: string;
  created_at: string;
}

export default function JobsPage() {
  // const router = useRouter(); // Removed for static export
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  const {
    data: jobs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.getJobs,
    enabled: false,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!sseConnected) {
      return;
    }

    const eventSource = connectJobEvents(
      event => {
        if (event.job_id && event.state) {
          queryClient.invalidateQueries({queryKey: ['jobs']});
          toast.info(`Job ${event.job_id.slice(0, 8)}: ${event.state}`);
        }
      },
      _error => {
        toast.error('SSE connection error');
        setSseConnected(false);
      },
    );

    return () => {
      eventSource.close();
    };
  }, [sseConnected, queryClient]);

  const createMutation = useMutation({
    mutationFn: api.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['jobs']});
      setIsCreateDialogOpen(false);
      toast.success('Job created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create job: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({id, data}: {id: string; data: Partial<JobFormData>}) =>
      api.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['jobs']});
      setEditingJob(null);
      toast.success('Job updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update job: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['jobs']});
      setDeletingJob(null);
      toast.success('Job deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete job: ${error.message}`);
    },
  });

  const handleCreate = (data: JobFormData) => {
    createMutation.mutate({
      name: data.name,
      priority: data.priority,
      params: {},
    });
  };

  const handleEdit = (data: JobFormData) => {
    if (editingJob) {
      updateMutation.mutate({id: editingJob.id, data});
    }
  };

  const handleDelete = () => {
    if (deletingJob) {
      deleteMutation.mutate(deletingJob.id);
    }
  };

  const handleRowClick = (jobId: string) => {
    window.location.href = `/jobs/${jobId}`;
  };

  if (isLoading) {
    return (
      <Container>
        <Title>Loading...</Title>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>Jobs</Title>
          <Description>Manage your jobs and view job details</Description>
        </HeaderContent>
        <Actions>
          <Button
            variant={sseConnected ? 'danger' : 'success'}
            onClick={() => setSseConnected(!sseConnected)}
          >
            {sseConnected ? 'Stop SSE' : 'Start SSE'}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Add Job</Button>
        </Actions>
      </Header>

      {jobs && jobs.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Priority
                </TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell style={{width: '120px'}}></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {jobs?.map((job: Job) => (
                <TableRow key={job.id} onClick={() => handleRowClick(job.id)}>
                  <TableCell className="muted">
                    {job.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{job.name}</TableCell>
                  <TableCell>
                    <Badge state={job.state}>{job.state}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{job.priority}</TableCell>
                  <TableCell className="muted">
                    {new Date(job.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <ActionCell>
                      <IconButton
                        onClick={() => setEditingJob(job)}
                        title="Edit job"
                      >
                        Edit
                      </IconButton>
                      <IconButton
                        onClick={() => setDeletingJob(job)}
                        title="Delete job"
                      >
                        Delete
                      </IconButton>
                    </ActionCell>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState>
          <p>No jobs yet. Create your first job to get started!</p>
        </EmptyState>
      )}

      <JobDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title="Create Job"
        isSubmitting={createMutation.isPending}
      />

      <JobDialog
        open={!!editingJob}
        onOpenChange={open => !open && setEditingJob(null)}
        onSubmit={handleEdit}
        defaultValues={
          editingJob
            ? {name: editingJob.name, priority: editingJob.priority}
            : undefined
        }
        title="Edit Job"
        isSubmitting={updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deletingJob}
        onOpenChange={open => !open && setDeletingJob(null)}
        onConfirm={handleDelete}
        jobName={deletingJob?.name || ''}
        isDeleting={deleteMutation.isPending}
      />
    </Container>
  );
}
