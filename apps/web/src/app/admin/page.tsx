'use client';
import styled from '@emotion/styled';
import {useMutation} from '@tanstack/react-query';

import {type ChangeEvent, useState} from 'react';
import {toast} from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #fff;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: #999;
  margin: 0;
`;

const Section = styled.div`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  color: #fff;
  font-size: 1.25rem;
  margin: 0 0 1rem 0;
`;

const Warning = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #856404;
`;

const DangerButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #c82333;
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const BackLink = styled.a`
  color: #2196f3;
  text-decoration: none;
  font-size: 0.875rem;

  &:hover {
    text-decoration: underline;
  }
`;

interface PurgeResponse {
  message?: string;
}

const AdminPage = () => {
  const [streamName, setStreamName] = useState('JOBS');

  const purgeMutation = useMutation({
    mutationFn: async (stream: string) => {
      const response = await fetch(
        `${API_URL}/admin/purge-stream?stream_name=${stream}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as {detail?: string};
        throw new Error(error.detail || 'Failed to purge stream');
      }

      return response.json() as Promise<PurgeResponse>;
    },
    onSuccess: (data: PurgeResponse) => {
      toast.success(data.message || 'Stream purged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to purge stream: ${error.message}`);
    },
  });

  const handleInputChange = (_e: ChangeEvent<HTMLInputElement>) => {
    setStreamName('Changed');
  };

  const handlePurge = () => {
    if (
      window.confirm(
        `Are you sure you want to purge the ${streamName} stream? This will delete all messages.`,
      )
    ) {
      purgeMutation.mutate(streamName);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Admin Dashboard</Title>
        <Subtitle>Dangerous operations - use with caution</Subtitle>
        <BackLink href="/">← Back to Dashboard</BackLink>
      </Header>

      <Section>
        <SectionTitle>NATS Stream Management</SectionTitle>

        <Warning>
          ⚠️ <strong>Warning:</strong> Purging a stream will permanently delete
          all messages. This action cannot be undone.
        </Warning>

        <div style={{marginBottom: '1rem'}}>
          <label
            style={{color: '#fff', display: 'block', marginBottom: '0.5rem'}}
          >
            Stream Name:
          </label>
          <input
            type="text"
            value={streamName}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#000',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.875rem',
            }}
            placeholder="JOBS"
          />
        </div>

        <DangerButton
          onClick={handlePurge}
          disabled={purgeMutation.isPending || !streamName}
        >
          {purgeMutation.isPending ? 'Purging...' : '🗑️ Purge NATS Stream'}
        </DangerButton>
      </Section>
    </Container>
  );
};

export default AdminPage;
