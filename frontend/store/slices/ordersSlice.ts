import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiService } from '@/services/api';

export interface Order {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal?: number;
  shippingCost?: number;
  discount?: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  statusHistory?: Array<{
    status: Order['status'];
    updatedAt: string;
  }>;
  statusTimeline?: Order['status'][];
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  paidAt?: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  notes?: Array<{
    id: string;
    author: string;
    content: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

interface OrdersState {
  orders: Order[];
  loading: boolean;
}

const initialState: OrdersState = {
  orders: [],
  loading: false,
};

// Async thunk for updating order status
export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async (
    { orderId, status }: { orderId: string; status: Order['status'] },
    { rejectWithValue }
  ) => {
    try {
      // Uses the shared API client (correct base URL + auth token).
      const data = await apiService.updateOrderStatus(orderId, String(status).toUpperCase());
      return { orderId, status, updatedAt: data?.data?.updatedAt || new Date().toISOString() };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Network error');
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
    },
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // Keep the seller order list in sync after a status change made elsewhere
    // (e.g. on the order details screen).
    setOrderStatus: (state, action: PayloadAction<{ orderId: string; status: string }>) => {
      const order = state.orders.find(o => o.id === action.payload.orderId);
      if (order) {
        (order as any).status = action.payload.status;
        (order as any).updatedAt = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { orderId, status, updatedAt } = action.payload;
        const order = state.orders.find(o => o.id === orderId);
        
        if (order) {
          // Add to status history if it doesn't exist
          if (!order.statusHistory) {
            order.statusHistory = [];
          }
          
          // Add current status to history before updating
          order.statusHistory.push({
            status: order.status,
            updatedAt: order.updatedAt || order.createdAt
          });
          
          // Update order status and timestamp
          order.status = status;
          order.updatedAt = updatedAt;
          
          // Update status-specific timestamps
          if (status === 'processing') {
            order.processedAt = updatedAt;
          } else if (status === 'shipped') {
            order.shippedAt = updatedAt;
          } else if (status === 'delivered') {
            order.deliveredAt = updatedAt;
          }
          
          // Add to status timeline if it doesn't exist
          if (!order.statusTimeline) {
            order.statusTimeline = [];
          }
          
          // Add to timeline if not already present
          if (!order.statusTimeline.includes(status)) {
            order.statusTimeline.push(status);
          }
        }
        state.loading = false;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        console.error('Failed to update order status:', action.payload);
        state.loading = false;
        // You might want to show an error toast/message here
      });
  },
});

export const { addOrder, setOrders, setLoading, setOrderStatus } = ordersSlice.actions;
export default ordersSlice.reducer;