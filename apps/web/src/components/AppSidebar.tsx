'use client';

import styled from '@emotion/styled';
import {BarChart3, Package} from 'lucide-react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';

const SidebarContainer = styled.aside<{$isOpen?: boolean}>`
  width: 240px;
  min-width: 240px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  left: 0;

  @media (max-width: 768px) {
    position: fixed;
    z-index: 50;
    transform: translateX(${props => (props.$isOpen ? '0' : '-100%')});
    transition: transform 0.3s ease;
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
`;

const SidebarGroup = styled.div`
  padding: 0 12px;
  margin-bottom: 24px;
`;

const SidebarGroupLabel = styled.div`
  padding: 0 12px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SidebarMenu = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SidebarMenuItem = styled.li`
  margin: 2px 0;
`;

const SidebarMenuButton = styled(Link, {
  shouldForwardProp: prop => prop !== 'isActive',
})<{isActive?: boolean}>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => (props.isActive ? '#2563eb' : '#374151')};
  background: ${props => (props.isActive ? '#eff6ff' : 'transparent')};
  border-radius: 6px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => (props.isActive ? '#eff6ff' : '#f3f4f6')};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SidebarFooter = styled.div`
  padding: 16px;
  border-top: 1px solid #e5e7eb;
`;

const UserButton = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
`;

const SignOutButton = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #dc2626;
  background: transparent;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fef2f2;
    border-color: #dc2626;
  }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
`;

const UserName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const UserRole = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

interface MenuItem {
  title: string;
  icon: any;
  path: string;
}

const menuItems: MenuItem[] = [
  {title: 'Jobs', icon: Package, path: '/jobs'},
  {title: 'Admin', icon: BarChart3, path: '/admin'},
];

interface AppSidebarProps {
  isOpen?: boolean;
}

export function AppSidebar({isOpen}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    // TODO: Implement proper sign out
    console.warn('TODO: Sign out - localStorage.removeItem(isAuthenticated)');
    router.push('/login');
  };

  return (
    <SidebarContainer $isOpen={isOpen}>
      <SidebarHeader>
        <Logo>Planet</Logo>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.path);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton href={item.path} isActive={isActive}>
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserButton>
          <Avatar>JD</Avatar>
          <UserInfo>
            <UserName>John Doe</UserName>
            <UserRole>Admin</UserRole>
          </UserInfo>
        </UserButton>
        <SignOutButton onClick={handleSignOut}>Sign Out</SignOutButton>
      </SidebarFooter>
    </SidebarContainer>
  );
}
