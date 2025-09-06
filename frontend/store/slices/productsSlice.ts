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
    name: 'Modern Leather Sofa',
    price: 1299.99,
    originalPrice: 1499.99,
    image: 'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg',
    images: [
      'https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg',
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
    ],
    description: 'Luxurious leather sofa with modern design and premium comfort for your living space.',
    rating: 4.8,
    reviews: 1250,
    category: 'Sofas',
    tags: ['leather', 'modern', 'living-room'],
    inStock: true,
    colors: ['Black', 'Brown', 'Beige'],
  },
  {
    id: '2',
    name: 'Ergonomic Office Chair',
    price: 349.99,
    image: 'https://images.pexels.com/photos/15379284/pexels-photo-15379284/free-photo-of-modern-office-chair-in-a-modern-office.jpeg',
    images: [
      'https://images.pexels.com/photos/15379284/pexels-photo-15379284/free-photo-of-modern-office-chair-in-a-modern-office.jpeg',
      'https://images.pexels.com/photos/4352247/pexels-photo-4352247.jpeg',
    ],
    description: 'Comfortable ergonomic chair with adjustable height and lumbar support for long working hours.',
    rating: 4.6,
    reviews: 890,
    category: 'Chairs',
    tags: ['ergonomic', 'office', 'adjustable'],
    inStock: true,
    colors: ['Black', 'Gray', 'Blue'],
  },
  {
    id: '3',
    name: 'Wooden Dining Table',
    price: 899.99,
    originalPrice: 1099.99,
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
    images: [
      'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
      'https://images.pexels.com/photos/1643389/pexels-photo-1643389.jpeg',
    ],
    description: 'Elegant wooden dining table that seats six, perfect for family gatherings and dinner parties.',
    rating: 4.7,
    reviews: 456,
    category: 'Tables',
    tags: ['wooden', 'dining', 'family'],
    inStock: true,
    colors: ['Oak', 'Walnut', 'Mahogany'],
  },
  {
    id: '4',
    name: 'King Size Bed Frame',
    price: 1599.99,
    image: 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
    images: [
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
      'https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg',
    ],
    description: 'Luxurious king size bed frame with upholstered headboard and sturdy wooden frame.',
    rating: 4.5,
    reviews: 723,
    category: 'Beds',
    tags: ['king-size', 'upholstered', 'bedroom'],
    inStock: true,
    colors: ['Gray', 'Navy', 'Beige'],
  },
  {
    id: '5',
    name: 'Decorative Wall Art',
    price: 149.99,
    originalPrice: 199.99,
    image: 'https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg',
    images: [
      'https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg',
      'https://images.pexels.com/photos/1112080/pexels-photo-1112080.jpeg',
    ],
    description: 'Set of 3 modern abstract wall art pieces to enhance your home decor.',
    rating: 4.4,
    reviews: 289,
    category: 'Decor',
    tags: ['wall-art', 'modern', 'abstract'],
    inStock: true,
    colors: ['Multicolor', 'Black & White', 'Blue & Gold'],
  },
];

const initialState: ProductsState = {
  products: mockProducts,
  featuredProducts: mockProducts.filter((_, index) => index < 3),
  categories: ['Sofas', 'Chairs', 'Tables', 'Beds', 'Decor'],
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