import { supabase } from './supabase.js';

class StockManager {
    static instance = null;

    constructor() {
        if (StockManager.instance) {
            return StockManager.instance;
        }
        StockManager.instance = this;
    }

    async recordStockMovement(data) {
        try {
            const { data: currentStock } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', data.product_id)
                .single();

            if (!currentStock) {
                throw new Error('Product not found');
            }

            const movementData = {
                product_id: data.product_id,
                movement_type: data.movement_type,
                quantity: data.quantity,
                reference_type: data.reference_type,
                reference_id: data.reference_id,
                previous_quantity: currentStock.stock_quantity,
                new_quantity: currentStock.stock_quantity + data.quantity,
                notes: data.notes,
                created_by: data.user_id
            };

            const { error } = await supabase
                .from('stock_movements')
                .insert([movementData]);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error recording stock movement:', error);
            throw error;
        }
    }

    async getStockHistory(productId, options = {}) {
        try {
            let query = supabase
                .from('stock_movements')
                .select(`
                    *,
                    products (name),
                    profiles (username)
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (options.startDate) {
                query = query.gte('created_at', options.startDate);
            }
            if (options.endDate) {
                query = query.lte('created_at', options.endDate);
            }
            if (options.movementType) {
                query = query.eq('movement_type', options.movementType);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching stock history:', error);
            throw error;
        }
    }

    async adjustStock(productId, quantity, reason, userId) {
        try {
            const adjustment = {
                product_id: productId,
                movement_type: 'ADJUSTMENT',
                quantity: quantity,
                reference_type: 'ADJUSTMENT',
                reference_id: productId, // Using product ID as reference for manual adjustments
                notes: reason,
                user_id: userId
            };

            await this.recordStockMovement(adjustment);
            return true;
        } catch (error) {
            console.error('Error adjusting stock:', error);
            throw error;
        }
    }
}

const stockManager = new StockManager();
export default stockManager;