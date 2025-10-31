'use client';

import styled from '@emotion/styled';
import {Menu} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {type ReactNode, useEffect, useState} from 'react';
import {AppSidebar} from '@/components/AppSidebar';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Start open by default
  const [isResiumEnabled, setIsResiumEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Check authentication status from proper auth provider
    // console.log('TODO: Check auth - localStorage.getItem(isAuthenticated)');
    // For now, assume authenticated for static export
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    return null;
  }

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
        </Header>
        <ContentWrapper>
          <AnimatedPanel $isOpen={isResiumEnabled} />
          <Content>{children}</Content>
        </ContentWrapper>
      </Main>
    </Container>
  );
}
