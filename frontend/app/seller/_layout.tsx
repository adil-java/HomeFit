import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import SellerDrawer from '@/components/SellerDrawer';
import { View } from 'react-native';

export default function SellerLayout() {
  const { user } = useAuth();


  // Redirect to home if user is not a seller
  if (user?.role !== 'seller') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SellerDrawer>
        <Stack.Screen
          name="dashboard"
          options={{
            headerShown: false,
            title: 'Dashboard',
          }}
        />
        <Stack.Screen
          name="products"
          options={{
            headerShown: false,
            title: 'Products',
          }}
        />
        <Stack.Screen
          name="orders"
          options={{
            headerShown: false,
            title: 'Orders',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            title: 'Payment Setup',
          }}
        />
        <Stack.Screen
          name="sellerBalance"
          options={{
            headerShown: false,
            title: 'Seller Balance',
          }}
        />
      </SellerDrawer>
    </View>
  );
}