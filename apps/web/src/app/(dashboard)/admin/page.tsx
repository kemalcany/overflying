'use client';

import styled from '@emotion/styled';
import {useMutation} from '@tanstack/react-query';
import {type ChangeEvent, useState} from 'react';
import {toast} from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const Section = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const Warning = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  color: #92400e;
  display: flex;
  gap: 12px;
  align-items: start;
`;

const WarningIcon = styled.span`
  font-size: 20px;
  line-height: 1;
`;

const WarningContent = styled.div`
  flex: 1;

  strong {
    font-weight: 600;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #111827;
  font-size: 14px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const DangerButton = styled.button`
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #dc2626;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

interface PurgeResponse {
  message?: string;
}

export default function AdminPage() {
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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStreamName(e.target.value);
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
      </Header>

      <Section>
        <SectionTitle>NATS Stream Management</SectionTitle>

        <Warning>
          <WarningIcon>⚠️</WarningIcon>
          <WarningContent>
            <strong>Warning:</strong> Purging a stream will permanently delete
            all messages. This action cannot be undone.
          </WarningContent>
        </Warning>

        <FormGroup>
          <Label htmlFor="streamName">Stream Name:</Label>
          <Input
            id="streamName"
            type="text"
            value={streamName}
            onChange={handleInputChange}
            placeholder="JOBS"
          />
        </FormGroup>

        <DangerButton
          onClick={handlePurge}
          disabled={purgeMutation.isPending || !streamName}
        >
          {purgeMutation.isPending ? 'Purging...' : '🗑️ Purge NATS Stream'}
        </DangerButton>
      </Section>
    </Container>
  );
}
