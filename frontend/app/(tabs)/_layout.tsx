import { Tabs } from 'expo-router';
import { Home, Search, ShoppingCart, Heart, User, LayoutDashboard, Bell } from 'lucide-react-native';
import { BarChart2, Package, ShoppingBag, Users, BarChart, PackagePlus, Tag, LayoutTemplate, Settings, Shield, LogOut, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable, ScrollView } from 'react-native';
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
  const [showSellerMenu, setShowSellerMenu] = useState(false);

  // Add header right component for seller
  const headerRight = () => {
    if (user?.role === 'seller') {
      return (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            onPress={() => setShowSellerMenu(!showSellerMenu)}
            style={styles.dashboardButton}
          >
            <LayoutDashboard size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <Modal
            animationType="fade"
            transparent={true}
            visible={showSellerMenu}
            onRequestClose={() => setShowSellerMenu(false)}
          >
            <Pressable 
              style={styles.modalOverlay} 
              onPress={() => setShowSellerMenu(false)}
            >
              <ScrollView style={[styles.sellerMenu, { backgroundColor: theme.colors.surface }]}>
                {/* Dashboard */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/dashboard');
                    setShowSellerMenu(false);
                  }}
                >
                  <BarChart2 size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Dashboard
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Overview & Analytics
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/seller-requests');
                    setShowSellerMenu(false);
                  }}
                >
                  <Users size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Users
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Manage users, sellers management
                    </Text>
                  </View>
                </TouchableOpacity> */}

                {/* Product Management */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/products');
                    setShowSellerMenu(false);
                  }}
                >
                  <Package size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Products
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Manage inventory & listings
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Order Management */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/orders');
                    setShowSellerMenu(false);
                  }}
                >
                  <ShoppingBag size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Orders
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Process & track orders
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Payment Setup */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/onboarding');
                    setShowSellerMenu(false);
                  }}
                >
                  <CreditCard size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Payment Setup
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Connect your payment account
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Promotions & Discounts */}
                {/* <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/promotions');
                    setShowSellerMenu(false);
                  }}
                >
                  <Tag size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Promotions
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Manage discounts & offers
                    </Text>
                  </View>
                </TouchableOpacity> */}

                {/* Content Management */}
                {/* <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/content');
                    setShowSellerMenu(false);
                  }}
                >
                  <LayoutTemplate size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Content
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Banners & categories
                    </Text>
                  </View>
                </TouchableOpacity> */}

                {/* Notification Center */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/notifications');
                    setShowSellerMenu(false);
                  }}
                >
                  <Bell size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Notifications
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      Send announcements
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Settings */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/seller/settings');
                    setShowSellerMenu(false);
                  }}
                >
                  <Settings size={20} color={theme.colors.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, { color: theme.colors.text }]}>
                      Settings
                    </Text>
                    <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                      App configuration
                    </Text>
                  </View>
                </TouchableOpacity>


                {/* Logout */}
                <TouchableOpacity 
                  style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8, paddingTop: 12 }]}
                  onPress={() => {
                    logout();
                    setShowSellerMenu(false);
                  }}
                >
                  <LogOut size={20} color={theme.colors.error} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: theme.colors.error }]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
  },
  sellerMenu: {
    width: 300,
    maxHeight: '55%',
    borderRadius: 12,
    marginRight: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuIcon: {
    width: 36,
    marginRight: 8,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 12,
    opacity: 0.8,
  },
});