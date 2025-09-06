import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { CartItem as CartItemType } from '@/store/slices/cartSlice';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const { theme } = useTheme();

  const handleQuantityChange = (change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      onUpdateQuantity(item.id, newQuantity);
    } else {
      onRemove(item.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Image source={{ uri: item.image }} style={styles.image} />
      
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        
        {item.color && (
          <Text style={[styles.variant, { color: theme.colors.textSecondary }]}>
            Color: {item.color}
          </Text>
        )}
        
        {item.size && (
          <Text style={[styles.variant, { color: theme.colors.textSecondary }]}>
            Size: {item.size}
          </Text>
        )}
        
        <Text style={[styles.price, { color: theme.colors.text }]}>
          ${item.price.toFixed(2)}
        </Text>
        
        <View style={styles.controls}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => handleQuantityChange(-1)}
              style={[styles.quantityButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            >
              <Minus size={16} color={theme.colors.text} />
            </TouchableOpacity>
            
            <Text style={[styles.quantity, { color: theme.colors.text }]}>
              {item.quantity}
            </Text>
            
            <TouchableOpacity
              onPress={() => handleQuantityChange(1)}
              style={[styles.quantityButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            >
              <Plus size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
          >
            <Trash2 size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  variant: {
    fontSize: 14,
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});