import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Comment {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  date: string;
  helpful: number;
  replies?: Comment[];
}

interface CommentsState {
  comments: Comment[];
  loading: boolean;
}

const mockComments: Comment[] = [
  {
    id: '1',
    productId: '1',
    userId: 'user1',
    userName: 'Sarah Johnson',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face',
    rating: 5,
    text: 'Absolutely love this sofa! The leather quality is exceptional and it fits perfectly in our living room. Highly recommend!',
    date: '2024-01-15',
    helpful: 12,
  },
  {
    id: '2',
    productId: '1',
    userId: 'user2',
    userName: 'Mike Chen',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
    rating: 4,
    text: 'Great quality furniture. The only downside is that it\'s quite heavy to move around, but that speaks to its solid construction.',
    date: '2024-01-10',
    helpful: 8,
  },
  {
    id: '3',
    productId: '2',
    userId: 'user3',
    userName: 'Emily Rodriguez',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face',
    rating: 5,
    text: 'Perfect for long work sessions. The lumbar support is fantastic and it\'s very adjustable. Worth every penny!',
    date: '2024-01-08',
    helpful: 15,
  },
];

const initialState: CommentsState = {
  comments: mockComments,
  loading: false,
};

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    addComment: (state, action: PayloadAction<Comment>) => {
      state.comments.unshift(action.payload);
    },
    updateComment: (state, action: PayloadAction<Comment>) => {
      const index = state.comments.findIndex(comment => comment.id === action.payload.id);
      if (index !== -1) {
        state.comments[index] = action.payload;
      }
    },
    deleteComment: (state, action: PayloadAction<string>) => {
      state.comments = state.comments.filter(comment => comment.id !== action.payload);
    },
    addReply: (state, action: PayloadAction<{ commentId: string; reply: Comment }>) => {
      const comment = state.comments.find(c => c.id === action.payload.commentId);
      if (comment) {
        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push(action.payload.reply);
      }
    },
    updateCommentHelpful: (state, action: PayloadAction<{ commentId: string; helpful: number }>) => {
      const comment = state.comments.find(c => c.id === action.payload.commentId);
      if (comment) {
        comment.helpful = action.payload.helpful;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  addComment,
  updateComment,
  deleteComment,
  addReply,
  updateCommentHelpful,
  setLoading,
} = commentsSlice.actions;

export default commentsSlice.reducer;
