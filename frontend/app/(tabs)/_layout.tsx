import { Tabs } from 'expo-router';
import { tabsAnimation } from '@/constants/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, ShoppingCart, Heart, User, LayoutDashboard, Bell } from 'lucide-react-native';
import { BarChart2, Package, ShoppingBag, Users, BarChart, PackagePlus, Tag, LayoutTemplate, Settings, Shield, LogOut, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { initializeNotifications, syncNotifications } from '@/store/slices/notificationsSlice';
import { useFocusEffect } from 'expo-router';

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

/** Tab icon with a soft pill behind it when the tab is active. */
function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        tabIconStyles.pill,
        focused && { backgroundColor: theme.colors.primary + (theme.dark ? '33' : '1A') },
      ]}
    >
      {children}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  pill: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function TabLayout() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const cartItemCount = useSelector((state: RootState) => state.cart.itemCount);
  const wishlistItemCount = useSelector((state: RootState) => state.wishlist.items.length);
  const notificationUnreadCount = useSelector((state: RootState) => state.notifications.unreadCount);
  const router = useRouter();
  const [showSellerMenu, setShowSellerMenu] = useState(false);
  // Bottom inset = gesture bar / home indicator height (0 on phones with buttons)
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      if (!user) return () => {};
      dispatch(initializeNotifications());
      dispatch(syncNotifications());
      return () => {};
    }, [dispatch, user])
  );

  // Add header right component for seller.
  // useCallback keeps it stable so tab headers don't re-render on every update.
  const isSeller = user?.role === 'seller';
  const primaryColor = theme.colors.primary;
  const headerRight = useCallback(() => {
    if (isSeller) {
      return (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            onPress={() => setShowSellerMenu(open => !open)}
            style={styles.dashboardButton}
          >
            <LayoutDashboard size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }, [isSeller, primaryColor]);

  // Seller menu: rendered ONCE here. It used to live inside `headerRight`, and
  // every tab has its own header, so each visited tab opened its own copy at the
  // same time — stacked dark overlays made the background look black.
  const sellerMenuModal = user?.role === 'seller' ? (
    
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
              router.navigate('/seller/dashboard');
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
              router.navigate('/seller/products');
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
              router.navigate('/seller/orders');
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
              router.navigate('/seller/onboarding');
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
              Toast.show({
                type: 'info',
                text1: 'Coming Soon',
                text2: 'The Notifications feature will be available in the next update!',
                position: 'top'
              });
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
  ) : null;

  return (
    <>
    <Tabs
      screenOptions={{
        animation: tabsAnimation,
        // Hidden tabs stop re-rendering while off-screen (e.g. on every cart or
        // wishlist update); they catch up instantly when you switch back.
        freezeOnBlur: true,
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: 'bold',
          fontFamily: 'Manrope_700Bold',
          fontSize: 20,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          // Grow by the bottom inset so labels aren't hidden under the gesture bar
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 11,
          marginTop: 2,
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
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Home color={color} size={22} strokeWidth={focused ? 2.4 : 2} /></TabIcon>,
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
                onPress={() => router.push('/notifications')}
              >
                <View>
                  <Bell size={20} color={theme.colors.text} />
                  <TabBarBadge count={notificationUnreadCount} />
                </View>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Search color={color} size={22} strokeWidth={focused ? 2.4 : 2} /></TabIcon>,
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <View>
                <ShoppingCart color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
                <TabBarBadge count={cartItemCount} />
              </View>
            </TabIcon>
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <View>
                <Heart color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
                <TabBarBadge count={wishlistItemCount} />
              </View>
            </TabIcon>
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
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><User color={color} size={22} strokeWidth={focused ? 2.4 : 2} /></TabIcon>,
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
    {sellerMenuModal}
    </>
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
    fontFamily: 'Manrope_600SemiBold',
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
    letterSpacing: -0.3,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
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
    // Transparent: the screen stays visible behind the menu; tapping outside
    // still closes it. The menu card has its own shadow to stand out.
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
  },
  sellerMenu: {
    width: 300,
    maxWidth: '90%', // fits narrow phones (300 + margins was wider than 320px screens)
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
    marginBottom: 6,
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
    fontFamily: 'Manrope_500Medium',
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.8,
  },
});