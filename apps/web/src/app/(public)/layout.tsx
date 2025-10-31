'use client';

import styled from '@emotion/styled';
import {type ReactNode} from 'react';
import {SplineScene} from '@/components/SplineScene';

const Container = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #000000;
`;

const SplinePanel = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Content = styled.div`
  position: relative;
  z-index: 10;
`;

export default function PublicLayout({children}: {children: ReactNode}) {
  return (
    <Container>
      <SplinePanel>
        <Content>{children}</Content>
        <SplineScene scene="https://prod.spline.design/Al3ikp4PcdkGJyIJ/scene.splinecode" />
      </SplinePanel>
    </Container>
  );
}
