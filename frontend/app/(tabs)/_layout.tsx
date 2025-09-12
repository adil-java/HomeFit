import { Tabs } from 'expo-router';
import { Home, Search, ShoppingCart, Heart, User, LayoutDashboard, Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';

function TabBarBadge({ count }: { count: number }) {
  const { theme } = useTheme();
  
  if (count === 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
      <Text style={[styles.badgeText, { color: '#fff' }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const cartItemCount = useSelector((state: RootState) => state.cart.itemCount);
  const wishlistItemCount = useSelector((state: RootState) => state.wishlist.items.length);
  const router = useRouter();
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Add header right component for admin
  const headerRight = () => {
    if (user?.role === 'admin') {
      return (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            onPress={() => setShowAdminMenu(!showAdminMenu)}
            style={styles.dashboardButton}
          >
            <LayoutDashboard size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <Modal
            animationType="fade"
            transparent={true}
            visible={showAdminMenu}
            onRequestClose={() => setShowAdminMenu(false)}
          >
            <Pressable 
              style={styles.modalOverlay} 
              onPress={() => setShowAdminMenu(false)}
            >
              <View style={[styles.adminMenu, { backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/admin');
                    setShowAdminMenu(false);
                  }}
                >
                  <Text style={[styles.menuText, { color: theme.colors.text }]}>
                    Dashboard
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/admin/products');
                    setShowAdminMenu(false);
                  }}
                >
                  <Text style={[styles.menuText, { color: theme.colors.text }]}>
                    Manage Products
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/admin/orders');
                    setShowAdminMenu(false);
                  }}
                >
                  <Text style={[styles.menuText, { color: theme.colors.text }]}>
                    View Orders
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/admin/users');
                    setShowAdminMenu(false);
                  }}
                >
                  <Text style={[styles.menuText, { color: theme.colors.text }]}>
                    User Management
                  </Text>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    logout();
                    setShowAdminMenu(false);
                  }}
                >
                  <Text style={[styles.menuText, { color: theme.colors.error }]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        </View>
      );
    }
    return null;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: 'bold',
          fontSize: 20,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerRight: headerRight,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          headerTitle: () => (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image 
                  source={require('@/assets/images/logo.png')} 
                  style={styles.logo} 
                  resizeMode="contain"
                />
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  HomeFit
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => {}}
              >
                <Bell size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                Search Products
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingCart color={color} size={size} />
              <TabBarBadge count={cartItemCount} />
            </View>
          ),
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                My Cart
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Heart color={color} size={size} />
              <TabBarBadge count={wishlistItemCount} />
            </View>
          ),
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                My Wishlist
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                My Profile
              </Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightContainer: {
    marginRight: 16,
  },
  dashboardButton: {
    padding: 4,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 60,
    paddingRight: 16,
  },
  adminMenu: {
    width: 200,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});