import { useConfirm } from '@/components/ConfirmDialog';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

/**
 * Confirm + delete a product. Products that were ordered are hidden instead
 * (the server decides). Resolves to 'deleted', 'archived' or null.
 */
export const useProductDelete = () => {
  const confirm = useConfirm();

  return async (product) => {
    const hasOrders = Number(product.orderCount || 0) > 0;
    const ok = await confirm({
      title: hasOrders ? `Hide "${product.name}"?` : `Delete "${product.name}"?`,
      description: hasOrders ? (
        <>
          <p>This product appears in {product.orderCount} order{product.orderCount > 1 ? 's' : ''}, so it can't be deleted without breaking those orders.</p>
          <p>It will be hidden from the shop instead. You can show it again from its page.</p>
        </>
      ) : (
        <>
          <p>The product, its photos, 3D model link and reviews are removed for good. It also disappears from carts and wishlists.</p>
          <p>This can't be undone.</p>
        </>
      ),
      confirmText: hasOrders ? 'Hide product' : 'Delete product',
      destructive: true,
    });
    if (!ok) return null;
    try {
      const res = await adminApi.deleteProduct(product.id);
      if (res?.archived) {
        toast.success('Product hidden', { description: res.message });
        return 'archived';
      }
      toast.success('Product deleted');
      return 'deleted';
    } catch (err) {
      toast.error(err.message || 'Could not delete product');
      return null;
    }
  };
};
