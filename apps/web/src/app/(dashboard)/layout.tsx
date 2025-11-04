'use client';

import styled from '@emotion/styled';
import {LogOut, Menu} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {type ReactNode, useState} from 'react';
import {toast} from 'sonner';
import {AppSidebar} from '@/components/AppSidebar';
import {authApi} from '@/lib/authApi';
import {useAuthStore} from '@/store/authStore';

const Container = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  background-color: #060605;
  height: 64px;
`;

const ResiumButton = styled.button<{$isActive: boolean}>`
  margin-left: auto;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => (props.$isActive ? '#2563eb' : 'white')};
  background: ${props => (props.$isActive ? 'white' : 'transparent')};
  border: ${props => (props.$isActive ? 'none' : '1px solid white')};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props =>
      props.$isActive ? '#f3f4f6' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const AnimatedPanel = styled.div<{$isOpen: boolean}>`
  width: 100%;
  background: #ef4444;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: ${props => (props.$isOpen ? '200px' : '0px')};
  height: ${props => (props.$isOpen ? '40%' : '0')};
  opacity: ${props => (props.$isOpen ? 1 : 0)};
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
`;

const SidebarTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: white;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Separator = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);

  @media (max-width: 768px) {
    display: none;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
`;

const LogoutButton = styled.button`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
  }
`;

/*
const PageTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0;
`;
*/

const Content = styled.div`
  flex: 1;
  padding: 24px;
  overflow: auto;
`;

const Overlay = styled.div<{$isOpen: boolean}>`
  display: none;

  @media (max-width: 768px) {
    display: ${props => (props.$isOpen ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
  }
`;

export default function DashboardLayout({children}: {children: ReactNode}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isResiumEnabled, setIsResiumEnabled] = useState(false);
  const {user, isAuthenticated, accessToken, clearAuth} = useAuthStore();

  const handleLogout = async () => {
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
      clearAuth();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear auth anyway
      clearAuth();
      router.push('/login');
    }
  };

  // Auth check is handled by AuthProvider in root layout
  if (!isAuthenticated) {
    return null;
  }

  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <Container>
      <AppSidebar isOpen={isSidebarOpen} />
      <Overlay
        $isOpen={isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
      />
      <Main>
        <Header>
          <SidebarTrigger onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={20} />
          </SidebarTrigger>
          <Separator />
          <ResiumButton
            $isActive={isResiumEnabled}
            onClick={() => setIsResiumEnabled(!isResiumEnabled)}
          >
            Resium
          </ResiumButton>
          <UserSection>
            <UserInfo>
              <UserAvatar>{getUserInitials()}</UserAvatar>
              <span>{user?.name || user?.email}</span>
            </UserInfo>
            <LogoutButton onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </LogoutButton>
          </UserSection>
        </Header>
        <ContentWrapper>
          <AnimatedPanel $isOpen={isResiumEnabled} />
          <Content>{children}</Content>
        </ContentWrapper>
      </Main>
    </Container>
  );
}
