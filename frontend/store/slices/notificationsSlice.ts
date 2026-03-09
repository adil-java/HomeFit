import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/services/api';
import { RootState } from '../store';

const NOTIFICATIONS_STORAGE_KEY = 'homefit_notifications_v1';

export type NotificationType =
  | 'ORDER_STATUS'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'REFUND'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  entityId?: string;
}

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
};

const loadStoredNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const toSafeDateString = (value: string | undefined) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const normalizeOrderStatus = (status: string | undefined): string => {
  if (!status) return 'pending';
  return String(status).toLowerCase();
};

const normalizePaymentStatus = (status: string | undefined): string => {
  if (!status) return 'pending';
  return String(status).toLowerCase();
};

const buildNotificationFromOrder = (order: any): NotificationItem[] => {
  const notifications: NotificationItem[] = [];
  const orderId = order?.id;
  const orderNumber = order?.orderNumber || orderId?.slice(0, 8) || 'Order';
  const updatedAt = toSafeDateString(order?.updatedAt || order?.createdAt);

  if (!orderId) return notifications;

  const orderStatus = normalizeOrderStatus(order?.status);
  if (orderStatus && orderStatus !== 'pending') {
    notifications.push({
      id: `order-status-${orderId}-${orderStatus}`,
      type: 'ORDER_STATUS',
      title: `Order ${orderNumber} updated`,
      message: `Your order is now ${orderStatus}.`,
      createdAt: updatedAt,
      isRead: false,
      entityId: orderId,
    });
  }

  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);
  if (paymentStatus === 'paid') {
    notifications.push({
      id: `payment-${orderId}-paid`,
      type: 'PAYMENT_SUCCESS',
      title: `Payment received for ${orderNumber}`,
      message: 'Your payment was successful.',
      createdAt: updatedAt,
      isRead: false,
      entityId: orderId,
    });
  } else if (paymentStatus === 'failed') {
    notifications.push({
      id: `payment-${orderId}-failed`,
      type: 'PAYMENT_FAILED',
      title: `Payment failed for ${orderNumber}`,
      message: 'Please retry your payment method.',
      createdAt: updatedAt,
      isRead: false,
      entityId: orderId,
    });
  } else if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    notifications.push({
      id: `payment-${orderId}-refund-${paymentStatus}`,
      type: 'REFUND',
      title: `Refund update for ${orderNumber}`,
      message:
        paymentStatus === 'partially_refunded'
          ? 'A partial refund has been processed.'
          : 'Your refund has been processed.',
      createdAt: updatedAt,
      isRead: false,
      entityId: orderId,
    });
  }

  return notifications;
};

export const initializeNotifications = createAsyncThunk(
  'notifications/initialize',
  async () => {
    return await loadStoredNotifications();
  }
);

export const syncNotifications = createAsyncThunk(
  'notifications/sync',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const stored = await loadStoredNotifications();
    const existing = [...stored, ...state.notifications.items];
    const existingMap = new Map(existing.map((item) => [item.id, item]));

    const response = await apiService.getUserOrders({ page: 1, limit: 30 });
    const orders = Array.isArray((response as any)?.data)
      ? (response as any).data
      : Array.isArray((response as any)?.orders)
      ? (response as any).orders
      : Array.isArray(response)
      ? response
      : [];

    const generated = orders.flatMap((order: any) => buildNotificationFromOrder(order));

    const mergedMap = new Map<string, NotificationItem>();

    for (const item of existing) {
      mergedMap.set(item.id, item);
    }

    for (const item of generated) {
      const existingItem = existingMap.get(item.id);
      mergedMap.set(item.id, existingItem ? { ...item, isRead: existingItem.isRead } : item);
    }

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }
);

export const persistNotifications = createAsyncThunk(
  'notifications/persist',
  async (_, { getState }) => {
    const state = getState() as RootState;
    await AsyncStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(state.notifications.items)
    );
    return true;
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find((notification) => notification.id === action.payload);
      if (item) item.isRead = true;
      state.unreadCount = state.items.filter((notification) => !notification.isRead).length;
    },
    markAllNotificationsAsRead: (state) => {
      state.items = state.items.map((item) => ({ ...item, isRead: true }));
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.unreadCount = action.payload.filter((item) => !item.isRead).length;
        state.loading = false;
      })
      .addCase(initializeNotifications.rejected, (state) => {
        state.loading = false;
      })
      .addCase(syncNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(syncNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.unreadCount = action.payload.filter((item) => !item.isRead).length;
        state.loading = false;
      })
      .addCase(syncNotifications.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { markNotificationAsRead, markAllNotificationsAsRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
