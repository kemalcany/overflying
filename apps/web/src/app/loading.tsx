'use client';
import styled from '@emotion/styled';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  margin-top: 1.5rem;
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

export default function Loading() {
  return (
    <LoadingContainer>
      <Spinner />
      <LoadingText>CUSTOM Yow Loading...</LoadingText>
    </LoadingContainer>
  );
}
