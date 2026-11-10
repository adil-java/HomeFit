import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Drawer, DrawerContentScrollView } from 'expo-router/drawer';
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
  UserCheck,
  Settings,
  Store,
  CreditCard,
  ShieldCheck
} from 'lucide-react-native';

const DrawerContent = (props: any) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/seller/dashboard',
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
      label: 'Earnings',
      icon: DollarSign,
      path: '/seller/sellerBalance',
      roles: ['seller']
    },
    { 
      label: 'Payment setup', 
      icon: CreditCard, 
      path: '/seller/onboarding',
      roles: ['seller']
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/profile/settings',
      roles: ['seller']
    },
  ];

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'customer')
  );

  // logout() itself returns to the sign-in screen
  const handleLogout = () => logout();

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
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Seller centre</Text>
          {!!user?.name && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{user.name}</Text>
          )}
        </View>
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
              isActive(item.path) && { backgroundColor: theme.colors.primary + (theme.dark ? '33' : '14') }
            ]}
          >
            <View style={styles.menuItemContent}>
              <item.icon size={20} color={isActive(item.path) ? theme.colors.primary : theme.colors.text} strokeWidth={1.8} />
              <Text style={[styles.menuItemText, { color: isActive(item.path) ? theme.colors.primary : theme.colors.text }]}>{item.label}</Text>
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
        // Drawer screens you're not on stop re-rendering until you return
        freezeOnBlur: true,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    marginTop: 1,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 14,
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    marginLeft: 14,
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
  },
});
