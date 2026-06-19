import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Flex, Heading, Link, Button, HStack, Container } from '@chakra-ui/react';
import { useAuth } from './AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box bg="white" borderBottom="1px solid" borderColor="gray.200" boxShadow="sm">
      <Container maxW="container.xl" py={4}>
        <Flex justify="space-between" align="center">
          {/* Brand */}
          <Link as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
            <Heading size="lg" color="blue.600">
              TalentFlow
            </Heading>
          </Link>

          {/* Navigation */}
          <HStack spacing={6}>
            {isAuthenticated ? (
              <>
                <Link as={RouterLink} to="/dashboard" _hover={{ color: 'blue.600' }}>
                  Dashboard
                </Link>
                <Link as={RouterLink} to="/users" _hover={{ color: 'blue.600' }}>
                  Users
                </Link>
                <Link as={RouterLink} to="/profile" _hover={{ color: 'blue.600' }}>
                  Profile ({user?.full_name || user?.email})
                </Link>
                <Button colorScheme="red" variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button as={RouterLink} to="/login" colorScheme="blue">
                Login
              </Button>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default Navbar;
