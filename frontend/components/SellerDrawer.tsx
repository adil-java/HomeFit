import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router, usePathname } from 'expo-router';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Package, 
  LogOut,
  Menu,
  ChevronRight,
  ShoppingCart,
  BarChart2,
  UserCheck,
  Settings,
  Store,
  CreditCard,
  ShieldCheck
} from 'lucide-react-native';
import { Text } from 'react-native-paper';

const DrawerContent = (props: any) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/seller',
      roles: ['seller']
    },
    { 
      label: 'Revenue Streams', 
      icon: BarChart2, 
      path: '/seller/revenue',
      roles: ['seller']
    },
    { 
      label: 'Products', 
      icon: Package, 
      path: '/seller/products',
      roles: ['seller']
    },
    { 
      label: 'Orders', 
      icon: ShoppingCart, 
      path: '/seller/orders',
      roles: ['seller']
    },
    { 
      label: 'Payment Setup', 
      icon: CreditCard, 
      path: '/seller/onboarding',
      roles: ['seller']
    },
    { 
      label: 'Sellers', 
      icon: Store, 
      path: '/seller/sellers',
      roles: ['seller']
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      path: '/seller/settings',
      roles: ['seller']
    },
  ];

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'customer')
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(tabs)');
  };

  return (
    <DrawerContentScrollView 
      {...props}
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.header}>
        <Image 
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
        />
        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.primary }]}>
          seller Panel
        </Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.filter(item => item.roles.includes(user?.role || '')).map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              router.push(item.path as any);
              props.navigation?.closeDrawer?.();
            }}
            style={[
              styles.menuItem, 
              { borderBottomColor: theme.colors.border },
              isActive(item.path) && { backgroundColor: theme.colors.primary + '20' }
            ]}
          >
            <View style={styles.menuItemContent}>
              <item.icon size={20} color={theme.colors.primary} />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{item.label}</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color={theme.colors.error} />
          <Text style={[styles.logoutText, { color: theme.colors.error }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
};

export default function sellerDrawer({ children }: { children: React.ReactNode }) {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: true,
        drawerStyle: {
          width: '80%',
          maxWidth: 300,
        },
      }}
    >
      {children}
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});
