'use client';

import styled from '@emotion/styled';
import {useQuery} from '@tanstack/react-query';
import {ArrowLeft} from 'lucide-react';
import {useParams, useRouter} from 'next/navigation';
import {api} from '@/lib/api.ts';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Grid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (min-width: 768px) {
    grid-column: span 2;
  }
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Card = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CardHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const JobId = styled.p`
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0 0;
  font-family: monospace;
`;

const CardContent = styled.div`
  padding: 20px;
`;

const Badge = styled.span<{state: string}>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
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

const Description = styled.p`
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const DetailValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const StatValue = styled.span`
  font-size: 30px;
  font-weight: 700;
  color: #111827;
`;

const Separator = styled.hr`
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 16px 0;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: start;
  gap: 16px;
`;

const ActivityDot = styled.div<{color: string}>`
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityText = styled.p`
  font-size: 14px;
  color: #111827;
  margin: 0 0 4px 0;
`;

const ActivityTime = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: #6b7280;
`;

const LoadingMessage = styled.div`
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
  params?: Record<string, any>;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const {data: jobs, isLoading} = useQuery({
    queryKey: ['jobs'],
    queryFn: api.getJobs,
  });

  const job = jobs?.find((j: Job) => j.id === jobId);

  if (isLoading) {
    return (
      <Container>
        <BackButton onClick={() => router.push('/jobs')}>
          <ArrowLeft />
          Back to Jobs
        </BackButton>
        <LoadingMessage>Loading job details...</LoadingMessage>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container>
        <BackButton onClick={() => router.push('/jobs')}>
          <ArrowLeft />
          Back to Jobs
        </BackButton>
        <ErrorMessage>
          <p>Job not found</p>
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <div>
        <BackButton onClick={() => router.push('/jobs')}>
          <ArrowLeft />
          Back
        </BackButton>
      </div>

      <Grid>
        <MainColumn>
          <Card>
            <CardHeader>
              <CardHeaderContent>
                <div>
                  <CardTitle>{job.name}</CardTitle>
                  <JobId>{job.id}</JobId>
                </div>
                <Badge state={job.state}>{job.state}</Badge>
              </CardHeaderContent>
            </CardHeader>
            <CardContent>
              <Description>
                This job is currently in the <strong>{job.state}</strong> state
                with a priority level of <strong>{job.priority}</strong>. Track
                detailed metrics and activity history below.
              </Description>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailsGrid>
                <DetailItem>
                  <DetailLabel>Job ID</DetailLabel>
                  <DetailValue
                    style={{fontFamily: 'monospace', fontSize: '12px'}}
                  >
                    {job.id}
                  </DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>State</DetailLabel>
                  <DetailValue style={{textTransform: 'capitalize'}}>
                    {job.state}
                  </DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Priority</DetailLabel>
                  <DetailValue>{job.priority}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Created</DetailLabel>
                  <DetailValue>
                    {new Date(job.created_at).toLocaleDateString()}
                  </DetailValue>
                </DetailItem>
              </DetailsGrid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityList>
                <ActivityItem>
                  <ActivityDot color="#3b82f6" />
                  <ActivityContent>
                    <ActivityText>
                      Job state updated to {job.state}
                    </ActivityText>
                    <ActivityTime>
                      {new Date(job.created_at).toLocaleString()}
                    </ActivityTime>
                  </ActivityContent>
                </ActivityItem>
                <ActivityItem>
                  <ActivityDot color="#10b981" />
                  <ActivityContent>
                    <ActivityText>Priority set to {job.priority}</ActivityText>
                    <ActivityTime>
                      {new Date(job.created_at).toLocaleString()}
                    </ActivityTime>
                  </ActivityContent>
                </ActivityItem>
                <ActivityItem>
                  <ActivityDot color="#8b5cf6" />
                  <ActivityContent>
                    <ActivityText>Job created</ActivityText>
                    <ActivityTime>
                      {new Date(job.created_at).toLocaleString()}
                    </ActivityTime>
                  </ActivityContent>
                </ActivityItem>
              </ActivityList>
            </CardContent>
          </Card>
        </MainColumn>

        <SideColumn>
          <Card>
            <CardHeader>
              <CardTitle>Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <StatCard>
                <StatLabel>Current Priority</StatLabel>
                <StatValue>{job.priority}</StatValue>
              </StatCard>
              <Separator />
              <DetailsGrid>
                <DetailItem>
                  <DetailLabel>Min Priority</DetailLabel>
                  <DetailValue>0</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Max Priority</DetailLabel>
                  <DetailValue>100</DetailValue>
                </DetailItem>
              </DetailsGrid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatCard>
                <StatLabel>Current State</StatLabel>
                <StatValue
                  style={{fontSize: '20px', textTransform: 'capitalize'}}
                >
                  {job.state}
                </StatValue>
              </StatCard>
              <Separator />
              <DetailsGrid>
                <DetailItem>
                  <DetailLabel>Duration</DetailLabel>
                  <DetailValue>--</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Retries</DetailLabel>
                  <DetailValue>0</DetailValue>
                </DetailItem>
              </DetailsGrid>
            </CardContent>
          </Card>
        </SideColumn>
      </Grid>
    </Container>
  );
}
