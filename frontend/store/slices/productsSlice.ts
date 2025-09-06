import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  description: string;
  rating: number;
  reviews: number;
  category: string;
  tags: string[];
  inStock: boolean;
  colors?: string[];
  sizes?: string[];
}

interface ProductsState {
  products: Product[];
  featuredProducts: Product[];
  categories: string[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedTags: string[];
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 299.99,
    originalPrice: 399.99,
    image: 'https://images.pexels.com/photos/3587478/pexels-photo-3587478.jpeg',
    images: [
      'https://images.pexels.com/photos/3587478/pexels-photo-3587478.jpeg',
      'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg',
    ],
    description: 'Experience premium sound quality with these wireless headphones featuring noise cancellation and 30-hour battery life.',
    rating: 4.8,
    reviews: 1250,
    category: 'Electronics',
    tags: ['wireless', 'premium', 'noise-cancellation'],
    inStock: true,
    colors: ['Black', 'White', 'Silver'],
  },
  {
    id: '2',
    name: 'Smart Fitness Watch',
    price: 199.99,
    image: 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg',
    images: [
      'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg',
      'https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg',
    ],
    description: 'Track your fitness goals with this advanced smartwatch featuring heart rate monitoring and GPS.',
    rating: 4.6,
    reviews: 890,
    category: 'Wearables',
    tags: ['fitness', 'smart', 'health'],
    inStock: true,
    colors: ['Black', 'Rose Gold', 'Silver'],
  },
  {
    id: '3',
    name: 'Leather Laptop Bag',
    price: 89.99,
    originalPrice: 129.99,
    image: 'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg',
    images: [
      'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg',
      'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg',
    ],
    description: 'Professional leather laptop bag with multiple compartments and adjustable strap.',
    rating: 4.7,
    reviews: 456,
    category: 'Accessories',
    tags: ['leather', 'professional', 'laptop'],
    inStock: true,
    colors: ['Brown', 'Black', 'Tan'],
  },
  {
    id: '4',
    name: 'Wireless Bluetooth Speaker',
    price: 79.99,
    image: 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg',
    images: [
      'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg',
      'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg',
    ],
    description: 'Portable Bluetooth speaker with 360-degree sound and waterproof design.',
    rating: 4.5,
    reviews: 723,
    category: 'Electronics',
    tags: ['wireless', 'portable', 'waterproof'],
    inStock: true,
    colors: ['Black', 'Blue', 'Red'],
  },
];

const initialState: ProductsState = {
  products: mockProducts,
  featuredProducts: mockProducts.slice(0, 3),
  categories: ['Electronics', 'Wearables', 'Accessories', 'Fashion', 'Home'],
  loading: false,
  searchQuery: '',
  selectedCategory: '',
  selectedTags: [],
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
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