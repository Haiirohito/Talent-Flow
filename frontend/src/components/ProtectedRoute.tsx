import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Center, Spinner, VStack, Heading } from '@chakra-ui/react';
import { useAuth } from './AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Center minH="400px">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Heading size="md" color="gray.600">Loading...</Heading>
        </VStack>
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
