import { Stack } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
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

  // SellerDrawer renders a Drawer navigator, so its children must be
  // Drawer.Screen (expo-router ignores any other child type and only shows
  // declared screens).
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SellerDrawer>
        <Drawer.Screen
          name="dashboard"
          options={{
            headerShown: false,
            title: 'Dashboard',
          }}
        />
        <Drawer.Screen
          name="products"
          options={{
            headerShown: false,
            title: 'Products',
          }}
        />
        <Drawer.Screen
          name="orders"
          options={{
            headerShown: false,
            title: 'Orders',
          }}
        />
        <Drawer.Screen
          name="onboarding"
          options={{
            headerShown: false,
            title: 'Payment Setup',
          }}
        />
        <Drawer.Screen
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
