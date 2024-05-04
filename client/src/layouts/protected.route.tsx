import React from 'react';
import { Route } from 'react-router-dom';
import { useHistory } from 'react-router-dom';
import SweetAlert from 'react-bootstrap-sweetalert';
import { useAuth } from 'contexts/auth.context';
import Card from 'components/card/Card';
import { Button } from '@chakra-ui/react';

export const ProtectedRoute = ({ ...rest }) => {
  const history = useHistory();
  let { user } = useAuth();
  if (!user || !user.token || user.token === '') {
    return (
      <Card
        alignItems="center"
        flexDirection="column"
        w="100%"
        maxW="max-content"
        p="20px 15px"
        h="max-content"
        margin="auto"
      >
        <h2>You must be signed in!</h2>
        <Button
          colorScheme="blue"
          onClick={() => history.push('/auth/sign-in')}
        >
          Sign In
        </Button>
      </Card>
    );
  }

  return <Route {...rest} />;
};
