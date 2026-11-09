import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiService, AddressInput, SavedAddress } from '@/services/api';
import { friendlyError } from '@/utils/errorMessages';

/**
 * The signed-in user's saved delivery addresses (stored on the server).
 * Used by Profile → Addresses and by Checkout.
 */
interface AddressesState {
  items: SavedAddress[];
  loaded: boolean;   // fetched at least once this session
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AddressesState = {
  items: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,
};

const reject = (e: unknown, fallback: string) => friendlyError(e, fallback);

export const fetchAddresses = createAsyncThunk<SavedAddress[], void, { rejectValue: string }>(
  'addresses/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getAddresses();
    } catch (e) {
      return rejectWithValue(reject(e, 'Could not load your addresses'));
    }
  }
);

export const saveAddress = createAsyncThunk<
  SavedAddress[],
  { id?: string; address: AddressInput },
  { rejectValue: string }
>('addresses/save', async ({ id, address }, { rejectWithValue }) => {
  try {
    return id ? await apiService.updateAddress(id, address) : await apiService.createAddress(address);
  } catch (e) {
    return rejectWithValue(reject(e, 'Could not save the address'));
  }
});

export const removeAddress = createAsyncThunk<SavedAddress[], string, { rejectValue: string }>(
  'addresses/remove',
  async (id, { rejectWithValue }) => {
    try {
      return await apiService.deleteAddress(id);
    } catch (e) {
      return rejectWithValue(reject(e, 'Could not delete the address'));
    }
  }
);

export const makeDefaultAddress = createAsyncThunk<SavedAddress[], string, { rejectValue: string }>(
  'addresses/makeDefault',
  async (id, { rejectWithValue }) => {
    try {
      return await apiService.setDefaultAddress(id);
    } catch (e) {
      return rejectWithValue(reject(e, 'Could not change the default address'));
    }
  }
);

const addressesSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Could not load your addresses';
      });

    // Mutations: all return the full updated list
    for (const thunk of [saveAddress, removeAddress, makeDefaultAddress]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.items = action.payload;
          state.saving = false;
          state.loaded = true;
          state.error = null;
        })
        .addCase(thunk.rejected, (state) => {
          state.saving = false;
        });
    }
  },
});

export default addressesSlice.reducer;
