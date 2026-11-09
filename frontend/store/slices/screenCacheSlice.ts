import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * In-memory cache of the last API response for screens that load their own
 * data (seller dashboard, seller products, my orders, ...).
 *
 * Screens show the cached copy instantly when reopened and refresh it in the
 * background. Keys include the user id so one account never sees another's
 * data. Only plain JSON (raw API responses) should be stored here.
 */
interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

type ScreenCacheState = Record<string, CacheEntry>;

const initialState: ScreenCacheState = {};

const screenCacheSlice = createSlice({
  name: 'screenCache',
  initialState,
  reducers: {
    setScreenCache: (state, action: PayloadAction<{ key: string; data: unknown }>) => {
      state[action.payload.key] = { data: action.payload.data, fetchedAt: Date.now() };
    },
    clearScreenCache: () => initialState,
  },
});

export const { setScreenCache, clearScreenCache } = screenCacheSlice.actions;
export default screenCacheSlice.reducer;
