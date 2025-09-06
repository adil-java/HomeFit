import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch } from 'react-redux';
import { setSelectedCategory } from '@/store/slices/productsSlice';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.6;
const CARD_HEIGHT = CARD_WIDTH * 0.7;

interface CategoryCardProps {
  category: string;
  image?: any;
}

const categoryData = {
  'Sofas': {
    colors: ['#2A5C54', '#1E3D33'],
    image: require('.././assets/images/'),
    icon: 'sofa-outline',
  },
  'Chairs': {
    colors: ['#5D4037', '#3E2723'],
    image: require('@/assets/images/chair-category.jpeg'),
    icon: 'chair-outline',
  },
  'Tables': {
    colors: ['#8B5E3C', '#5D4037'],
    image: require('@/assets/images/table-category.jpeg'),
    icon: 'grid-outline',
  },
  'Beds': {
    colors: ['#3E2723', '#1B1B1B'],
    image: require('@/assets/images/bed-category.jpeg'),
    icon: 'bed-outline',
  },
  'Decor': {
    colors: ['#3E5151', '#1E3D33'],
    image: require('@/assets/images/decor-category.jpeg'),
    icon: 'flower-outline',
  },
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  
  const categoryInfo = categoryData[category as keyof typeof categoryData] || {
    colors: [theme.colors.primary, theme.colors.secondary],
    image: null,
    icon: 'grid-outline',
  };

  const handlePress = () => {
    dispatch(setSelectedCategory(category));
    router.push('/search');
  };

  const styles = createStyles(theme);

  return (
    <Pressable 
      onPress={handlePress} 
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }
      ]}
    >
      <View style={styles.card}>
        {categoryInfo.image && (
          <Image 
            source={categoryInfo.image} 
            style={styles.image}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        />
        
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={categoryInfo.icon as any} 
              size={24} 
              color="white" 
              style={styles.icon}
            />
          </View>
          
          <Text style={styles.title} numberOfLines={1}>
            {category}
          </Text>
          
          
        </View>
      </View>
    </Pressable>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 'auto',
  },
  arButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  arButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});