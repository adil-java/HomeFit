import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Comment } from './commentsSlice';

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
  category: string;
  tags: string[];
  inStock: boolean;
  colors?: string[];
  sizes?: string[];
  modelUrl?: string;
  comments?: Comment[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description?: string;
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

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Modern Leather Sofa',
    price: 1299.99,
    originalPrice: 1499.99,
    image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883398/sofa4_auz1fp.jpg',
    images: [
      'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883398/sofa4_auz1fp.jpg',
    ],
    description: 'Luxurious leather sofa with modern design and premium comfort for your living space.',
    rating: 4.8,
    reviews: 1250,
    category: 'Sofas',
    tags: ['leather', 'modern', 'living-room'],
    inStock: true,
    colors: ['Black', 'Brown', 'Beige'],
    modelUrl: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883258/sofa_brown_cpbfmj.glb',
  },
  {
    id: '2',
    name: 'Dining table',
    price: 349.99,
    image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883395/8-2-dining-table-png_uliglv.png',
    images: [
      'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883395/8-2-dining-table-png_uliglv.png',
    ],
    description: 'Comfortable dining table with adjustable height and lumbar support for long working hours.',
    rating: 4.6,
    reviews: 890,
    category: 'Tables',
    tags: ['ergonomic', 'office', 'adjustable'],
    inStock: true,
    colors: ['Black', 'Gray', 'Blue'],
    modelUrl: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883313/dining_table_rpjqgv.glb',
  },
  {
    id: '3',
    name: 'Sofa',
    price: 899.99,
    originalPrice: 1099.99,
    image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760469014/ecommerce/products/zea2mvkeguferzogxjfq.jpg',
    images: [
      'https://res.cloudinary.com/dmpinsiam/image/upload/v1760469014/ecommerce/products/zea2mvkeguferzogxjfq.jpg',
    ],
    description: 'Elegant wooden sofa that seats six, perfect for family gatherings and dinner parties.',
    rating: 4.7,
    reviews: 456,
    category: 'Sofas',
    tags: ['wooden', 'dining', 'family'],
    inStock: true,
    colors: ['Oak', 'Walnut', 'Mahogany'],
    modelUrl: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883292/sofa_lpqlv7.glb',
  },
  {
    id: '4',
    name: 'King Size Bed Frame',
    price: 1599.99,
    image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760470454/ecommerce/products/khlt31mjw6ejdwmrz28t.jpg',
    images: [
      'https://res.cloudinary.com/dmpinsiam/image/upload/v1760470454/ecommerce/products/khlt31mjw6ejdwmrz28t.jpg',
    ],
    description: 'Luxurious king size bed frame with upholstered headboard and sturdy wooden frame.',
    rating: 4.5,
    reviews: 723,
    category: 'Beds',
    tags: ['king-size', 'upholstered', 'bedroom'],
    inStock: true,
    colors: ['Gray', 'Navy', 'Beige'],
    modelUrl: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760883153/bed_jasul8.glb',
  },
  {
    id: '5',
    name: 'casual chair',
    price: 149.99,
    originalPrice: 199.99,
    image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760468327/ecommerce/products/vxhlmqpx0wlkqmg8yeyj.webp',
    images: [
      'https://res.cloudinary.com/dmpinsiam/image/upload/v1760468327/ecommerce/products/vxhlmqpx0wlkqmg8yeyj.webp',
    ],
    description: 'casual chair',
    rating: 4.4,
    reviews: 289,
    category: 'Chairs',
    tags: ['wall-art', 'modern', 'abstract'],
    inStock: true,
    colors: ['Multicolor', 'Black & White', 'Blue & Gold'],
    modelUrl: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760781979/Cloudinary%203D/models/textured_mesh_pa1sji.glb',
  },
];

const initialState: ProductsState = {
  products: mockProducts,
  featuredProducts: mockProducts.filter((_, index) => index < 3),
  categories: [] as Category[],
  loading: false,
  searchQuery: '',
  selectedCategory: null,
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