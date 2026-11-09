import { combineReducers, configureStore, ThunkAction, Action, UnknownAction } from '@reduxjs/toolkit';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import productsReducer from './slices/productsSlice';
import ordersReducer from './slices/ordersSlice';
import commentsReducer from './slices/commentsSlice';
import notificationsReducer from './slices/notificationsSlice';
import screenCacheReducer from './slices/screenCacheSlice';
import { resetUserData } from './actions';

const appReducer = combineReducers({
  cart: cartReducer,
  wishlist: wishlistReducer,
  products: productsReducer,
  orders: ordersReducer,
  comments: commentsReducer,
  notifications: notificationsReducer,
  screenCache: screenCacheReducer,
});

type AppState = ReturnType<typeof appReducer>;

// On sign-out, drop per-user slices (undefined → each reducer's initial state).
const rootReducer = (state: AppState | undefined, action: UnknownAction): AppState => {
  if (resetUserData.match(action) && state) {
    return appReducer(
      {
        ...state,
        cart: undefined,
        wishlist: undefined,
        orders: undefined,
        notifications: undefined,
        screenCache: undefined,
      } as unknown as AppState,
      action
    );
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    // These two checks run in development only (they're stripped from release
    // builds). They walk the whole state on every action, which made taps feel
    // slow in Expo Go once products and cached screens were in the store, so
    // they skip the large, plain-JSON API data.
    getDefaultMiddleware({
      serializableCheck: {
        warnAfter: 128,
        ignoredPaths: ['products', 'screenCache'],
      },
      immutableCheck: {
        warnAfter: 128,
        ignoredPaths: ['products', 'screenCache'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;