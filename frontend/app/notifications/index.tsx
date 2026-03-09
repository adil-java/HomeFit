import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, ChevronLeft, CreditCard, Package, RefreshCcw, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import {
  initializeNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
  persistNotifications,
  syncNotifications,
} from '@/store/slices/notificationsSlice';
import Toast from 'react-native-toast-message';

interface NotificationSection {
  title: string;
  data: NotificationItem[];
}

const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const notificationIcon = (item: NotificationItem, color: string) => {
  switch (item.type) {
    case 'ORDER_STATUS':
      return <Package size={18} color={color} />;
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED':
    case 'REFUND':
      return <CreditCard size={18} color={color} />;
    default:
      return <ShieldCheck size={18} color={color} />;
  }
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const compact = screenWidth < 360;
  const horizontalPadding = compact ? 12 : 16;

  const { items, unreadCount, loading } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    dispatch(initializeNotifications());
    dispatch(syncNotifications());
  }, [dispatch]);

  const sections = useMemo<NotificationSection[]>(() => {
    const today = items.filter((item) => isToday(item.createdAt));
    const earlier = items.filter((item) => !isToday(item.createdAt));

    const result: NotificationSection[] = [];
    if (today.length > 0) result.push({ title: 'Today', data: today });
    if (earlier.length > 0) result.push({ title: 'Earlier', data: earlier });

    return result;
  }, [items]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(syncNotifications()).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Notifications updated',
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to refresh notifications',
        position: 'top',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    dispatch(markAllNotificationsAsRead());
    await dispatch(persistNotifications());
    Toast.show({
      type: 'success',
      text1: 'All notifications marked as read',
      position: 'top',
    });
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      dispatch(markNotificationAsRead(item.id));
      await dispatch(persistNotifications());
    }

    if (item.entityId) {
      router.push(`/orders/${item.entityId}` as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: theme.colors.border, paddingHorizontal: horizontalPadding }]}> 
        <HeaderBackButton onPress={() => router.back()} />

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, compact && styles.titleCompact, { color: theme.colors.text }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.colors.surface }]}
          onPress={onRefresh}
        >
          <RefreshCcw size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {items.length > 0 && (
        <TouchableOpacity
          style={[styles.markAllButton, { borderColor: theme.colors.border, marginHorizontal: horizontalPadding }]}
          onPress={handleMarkAllRead}
        >
          <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {items.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surface }]}> 
            <Bell size={28} color={theme.colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications yet</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}> 
            Order, payment, and important account updates will appear here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.card,
                compact && styles.cardCompact,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: item.isRead ? theme.colors.border : theme.colors.primary,
                },
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: theme.colors.background }]}> 
                {notificationIcon(item, theme.colors.primary)}
              </View>

              <View style={styles.content}>
                <View style={styles.rowTop}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.colors.accent }]} />}
                </View>

                <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {item.message}
                </Text>

                <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllButton: {
    alignSelf: 'flex-end',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    paddingTop: 8,
    paddingTop: 8,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardCompact: {
    padding: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  content: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  time: {
    marginTop: 8,
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
});
