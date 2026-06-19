import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  Text,
  Badge,
  VStack,
  HStack,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const result = await fetchApi('/dashboard/');
        setData(result);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8}>Dashboard</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        {/* Welcome Card */}
        <Card bg="white" boxShadow="sm">
          <CardBody>
            <VStack align="start" spacing={4}>
              <Heading size="md">Welcome, {user?.full_name || user?.email}</Heading>
              <HStack spacing={2}>
                <Text fontWeight="bold" color="gray.600">Role:</Text>
                <Badge colorScheme={user?.is_superuser ? 'blue' : 'gray'}>
                  {user?.is_superuser ? 'Administrator' : 'Standard User'}
                </Badge>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold" color="gray.600">Status:</Text>
                <Badge colorScheme={user?.is_active ? 'green' : 'red'}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* System Status Card */}
        <Card bg="white" boxShadow="sm">
          <CardBody>
            <VStack align="start" spacing={4}>
              <Heading size="md">System Status</Heading>
              <Text color="gray.600">Dashboard API connected successfully.</Text>
              {loading ? (
                <Center width="full">
                  <Spinner size="sm" color="blue.500" />
                </Center>
              ) : (
                <Box
                  bg="gray.100"
                  p={4}
                  borderRadius="md"
                  fontFamily="monospace"
                  fontSize="sm"
                  overflow="auto"
                  maxH="200px"
                  width="full"
                  whiteSpace="pre-wrap"
                  wordBreak="break-word"
                >
                  {JSON.stringify(data, null, 2)}
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Container>
  );
};

export default Dashboard;
