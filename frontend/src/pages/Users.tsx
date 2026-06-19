import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Alert,
  AlertIcon,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import type { User } from '../components/AuthContext';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const loadUsers = async () => {
    try {
      const data = await fetchApi('/users/');
      setUsers(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetchApi(`/users/${userId}`, { method: 'DELETE' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center minH="300px">
          <Spinner size="lg" color="blue.500" />
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" mb={8} align="start">
        <Heading>User Management</Heading>
        {user?.is_superuser && (
          <Button colorScheme="blue">Add User</Button>
        )}
      </HStack>

      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflowX="auto">
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th>ID</Th>
                <Th>Full Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                {user?.is_superuser && <Th>Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {users.map((u: any) => (
                <Tr key={u.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontSize="sm" color="gray.500">
                    {u.id.substring(0, 8)}...
                  </Td>
                  <Td>{u.full_name || '-'}</Td>
                  <Td>{u.email}</Td>
                  <Td>
                    <Badge colorScheme={u.is_superuser ? 'blue' : 'gray'}>
                      {u.is_superuser ? 'Admin' : 'User'}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={u.is_active ? 'green' : 'red'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  {user?.is_superuser && (
                    <Td>
                      <Button
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleDelete(u.id)}
                        isDisabled={u.id === user.id}
                      >
                        Delete
                      </Button>
                    </Td>
                  )}
                </Tr>
              ))}
              {users.length === 0 && (
                <Tr>
                  <Td colSpan={user?.is_superuser ? 6 : 5} textAlign="center" py={8}>
                    No users found.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Users;
