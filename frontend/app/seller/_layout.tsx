import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect, router } from 'expo-router';
import SellerDrawer from '@/components/SellerDrawer';
import { View, BackHandler } from 'react-native';
import { useEffect } from 'react';

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
          name="index"
          options={{
            headerShown: false,
            title: 'Dashboard',
          }}
        />
        <Stack.Screen
          name="products/index"
          options={{
            headerShown: false,
            title: 'Products',
          }}
        />
        <Stack.Screen
          name="products/[id]"
          options={{
            headerShown: false,
            title: 'Product Details',
          }}
        />
        <Stack.Screen
          name="products/new"
          options={{
            headerShown: false,
            title: 'New Product',
          }}
        />
        <Stack.Screen
          name="orders/index"
          options={{
            headerShown: false,
            title: 'Orders',
          }}
        />
        <Stack.Screen
          name="orders/[id]"
          options={{
            headerShown: false,
            title: 'Order Details',
          }}
        />
        <Stack.Screen
          name="sellers"
          options={{
            headerShown: false,
            title: 'Sellers',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            title: 'Settings',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            title: 'Payment Setup',
          }}
        />
      </SellerDrawer>
    </View>
  );
}