import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (user) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/signin" />;
}
