import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import AdminDrawer from '@/components/AdminDrawer';
import { View } from 'react-native';

export default function AdminLayout() {
  const { user } = useAuth();

  // Redirect to home if user is not an admin
  if (user?.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminDrawer>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: 'Dashboard',
          }}
        />
        <Stack.Screen
          name="seller-requests"
          options={{
            headerShown: false,
            title: 'Seller Requests',
          }}
        />
        <Stack.Screen
          name="revenue"
          options={{
            headerShown: false,
            title: 'Revenue Streams',
          }}
        />
      </AdminDrawer>
    </View>
  );
}