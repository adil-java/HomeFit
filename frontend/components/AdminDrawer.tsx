import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
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
  Store
} from 'lucide-react-native';
import { Text } from 'react-native-paper';

const DrawerContent = (props: any) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      onPress: () => router.push('/admin'),
      roles: ['admin']
    },
    { 
      label: 'Seller Requests', 
      icon: UserCheck, 
      onPress: () => router.push('/admin/seller-requests'),
      roles: ['admin']
    },
    { 
      label: 'Revenue Streams', 
      icon: BarChart2, 
      onPress: () => router.push('/admin/revenue'),
      roles: ['admin']
    },
    { 
      label: 'Products', 
      icon: Package, 
      onPress: () => router.push('/admin/products'),
      roles: ['admin', 'seller']
    },
    { 
      label: 'Orders', 
      icon: ShoppingCart, 
      onPress: () => router.push('/admin/orders'),
      roles: ['admin', 'seller']
    },
    { 
      label: 'Sellers', 
      icon: Store, 
      onPress: () => router.push('/admin/sellers'),
      roles: ['admin']
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      onPress: () => router.push('/admin/settings'),
      roles: ['admin', 'seller']
    },
  ];

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
          Admin Panel
        </Text>
      </View>

      <View style={styles.menuContainer}>
        {filteredMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => {
              item.onPress();
              props.navigation.closeDrawer();
            }}
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

export default function AdminDrawer({ children }: { children: React.ReactNode }) {
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
  },
});
