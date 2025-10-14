'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import styled from '@emotion/styled'

const Container = styled.div`max-width: 1200px; margin: 0 auto; padding: 2rem;`
const Title = styled.h1`color: #333; margin-bottom: 2rem;`
const JobGrid = styled.div`display: grid; gap: 1rem;`
const JobCard = styled.div<{ state: string }>`
  padding: 1.5rem; border-radius: 8px; border: 2px solid ${p => p.state === 'completed' ? '#4caf50' : p.state === 'running' ? '#ff9800' : p.state === 'failed' ? '#f44336' : '#2196f3'};
  background: ${p => p.state === 'completed' ? '#e8f5e9' : p.state === 'running' ? '#fff3e0' : p.state === 'failed' ? '#ffebee' : '#e3f2fd'};
`
const JobName = styled.h3`margin: 0 0 0.5rem 0; color: #333;`
const JobMeta = styled.div`display: flex; gap: 1rem; font-size: 0.875rem; color: #666;`
const Badge = styled.span<{ state: string }>`
  padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  background: ${p => p.state === 'completed' ? '#4caf50' : p.state === 'running' ? '#ff9800' : p.state === 'failed' ? '#f44336' : '#2196f3'};
  color: white;
`

const HomePage = () => {
  // const { data: jobs, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: api.getJobs, refetchInterval: 2000 })
  const { data: jobs, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: api.getJobs })

  if (isLoading) return <Container><Title>Loading...</Title></Container>

  return (
    <Container>
      <Title>Constellation Dashboard</Title>
      <JobGrid>
        {jobs?.map(job => (
          <JobCard key={job.id} state={job.state}>
            <JobName>{job.name}</JobName>
            <JobMeta>
              <Badge state={job.state}>{job.state}</Badge>
              <span>Priority: {job.priority}</span>
              <span>{new Date(job.created_at).toLocaleString()}</span>
            </JobMeta>
          </JobCard>
        ))}
      </JobGrid>
    </Container>
  )
}

export default HomePage
