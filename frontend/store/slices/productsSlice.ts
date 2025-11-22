import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Comment } from './commentsSlice';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description?: string;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  comparePrice: boolean;
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  description: string;
  rating: number;
  reviews: number;
  category: string; // For backward compatibility
  categories?: Category[]; // New field for multiple categories
  tags: string[];
  inStock: boolean;
  colors?: string[];
  sizes?: string[];
  modelUrl: string;
  comments?: Comment[];
}


interface ProductsState {
  products: Product[];
  featuredProducts: Product[];
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedTags: string[];
}

const initialState: ProductsState = {
  products: [],
  featuredProducts: [],
  categories: [] as Category[],
  loading: false,
  searchQuery: '',
  selectedCategory: '',
  selectedTags: [],
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSelectedTags: (state, action: PayloadAction<string[]>) => {
      state.selectedTags = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload);
    },
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },
    deleteProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(p => p.id !== action.payload);
    },
  },
});

export const {
  setCategories,
  setProducts,
  setSearchQuery,
  setSelectedCategory,
  setSelectedTags,
  setLoading,
  addProduct,
  updateProduct,
  deleteProduct,
} = productsSlice.actions;

export default productsSlice.reducer;