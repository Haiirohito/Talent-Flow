import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardBody,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../api/client';

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const data = {
        full_name: fullName,
        email: email,
      };
      await fetchApi('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setMessage('Profile updated successfully');
      const token = localStorage.getItem('access_token');
      if (token) login(token);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage('');
    setPwdError('');

    try {
      const data = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      await fetchApi('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setPwdMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update password');
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={8}>Profile</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        {/* Personal Information Form */}
        <Card bg="white" boxShadow="sm">
          <CardBody>
            <VStack spacing={6} align="start" width="full">
              <Heading size="md">Personal Information</Heading>

              {message && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  {message}
                </Alert>
              )}
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <form onSubmit={handleUpdateProfile} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      size="lg"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      size="lg"
                    />
                  </FormControl>

                  <Button type="submit" colorScheme="blue" width="full" size="lg">
                    Save Changes
                  </Button>
                </VStack>
              </form>
            </VStack>
          </CardBody>
        </Card>

        {/* Change Password Form */}
        <Card bg="white" boxShadow="sm">
          <CardBody>
            <VStack spacing={6} align="start" width="full">
              <Heading size="md">Change Password</Heading>

              {pwdMessage && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  {pwdMessage}
                </Alert>
              )}
              {pwdError && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {pwdError}
                </Alert>
              )}

              <form onSubmit={handleUpdatePassword} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Current Password</FormLabel>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      size="lg"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>New Password</FormLabel>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      size="lg"
                    />
                  </FormControl>

                  <Button type="submit" colorScheme="blue" width="full" size="lg">
                    Update Password
                  </Button>
                </VStack>
              </form>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Container>
  );
};

export default Profile;
