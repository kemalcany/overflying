'use client';

import styled from '@emotion/styled';
import {useRouter} from 'next/navigation';
import {type FormEvent, useState} from 'react';
import {toast} from 'sonner';
import {useAuthStore} from '@/store/authStore';
import {authApi} from '@/lib/authApi';

const Card = styled.div`
  width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease forwards;

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CardHeader = styled.div`
  padding: 24px 24px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CardTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin: 0;
`;

const CardDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin: 0;
`;

const CardContent = styled.div`
  padding: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }

  &:active:not(:disabled) {
    background: #1e40af;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: #dc2626;
  font-size: 14px;
  margin: 0;
  text-align: center;
`;

const HelpText = styled.p`
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  margin-top: 16px;
`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({email, password});

      if (response.success && response.data) {
        // Store auth state
        setAuth(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken,
        );

        // Show success message
        toast.success(`Welcome back, ${response.data.user.name || response.data.user.email}!`);

        // Redirect to dashboard
        router.push('/jobs');
      } else {
        setError(response.message || 'Login failed');
        toast.error(response.message || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          Enter your credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit}>
          <FormField>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </FormField>
          <FormField>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </FormField>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </Form>
        <HelpText>
          Demo: user@planet.com / 123 or hello@kemalyalcinkaya.co.uk / 123
        </HelpText>
      </CardContent>
    </Card>
  );
}
