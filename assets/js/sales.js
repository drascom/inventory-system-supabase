import { supabase } from './supabase.js';
import stockManager from './stock.js';
import { showToast } from './utils.js';

class SaleManager {
    static instance = null;

    constructor() {
        if (SaleManager.instance) {
            return SaleManager.instance;
        }
        SaleManager.instance = this;

        this.table = null;
        this.saleId = null;
        this.currentUser = null;
    }

    async initializeList() {
        console.log('Initializing SaleManager List');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        await this.initializeDataTable();
        this.setupListEventListeners();
    }

    async initializeForm() {
        console.log('Initializing SaleManager Form');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        this.setupFormEventListeners();
        await this.loadCustomers();
        await this.loadProducts();
        await this.checkForEdit();
    }

    checkDependencies() {
        if (typeof $ === 'undefined') {
            console.error('jQuery is not loaded');
            return false;
        }
        if (!$.fn.DataTable) {
            console.error('DataTables is not loaded');
            return false;
        }
        return true;
    }

    async initializeDataTable() {
        console.log('Initializing DataTable');
        try {
            const { data: sales, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    customers (
                        name
                    ),
                    products (
                        name
                    )
                `);

            if (error) throw error;

            console.log('Sales fetched:', sales);

            this.table = $('#salesTable').DataTable({
                data: sales,
                columns: [
                    {
                        data: 'id',
                        visible: false
                    },
                    { data: 'customers.name' },
                    { data: 'products.name' },
                    { data: 'quantity' },
                    {
                        data: 'unit_price',
                        render: (data) => `$${parseFloat(data).toFixed(2)}`
                    },
                    {
                        data: 'total_amount',
                        render: (data) => `$${parseFloat(data).toFixed(2)}`
                    },
                    {
                        data: 'sale_date',
                        render: (data) => new Date(data).toLocaleDateString()
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => `
                            <a href="#add-sale/${row.id}" class="btn btn-sm btn-link text-primary">
                                <i class="bi bi-pencil-square"></i>
                            </a>
                            <button class="btn btn-sm btn-link text-danger delete-btn" data-id="${row.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        `
                    }
                ],
                responsive: true,
                order: [[6, 'desc']] // Order by sale date descending
            });

            console.log('DataTable initialized');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
        }
    }

    async loadCustomers() {
        try {
            const { data: customers, error } = await supabase
                .from('customers')
                .select('id, name')
                .order('name');

            if (error) throw error;

            const customerSelect = $('#saleCustomer');
            customerSelect.empty().append('<option value="">Select Customer</option>');

            customers.forEach(customer => {
                customerSelect.append(new Option(customer.name, customer.id));
            });

            customerSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Customer',
                width: '100%'
            });
        } catch (error) {
            console.error('Error loading customers:', error);
            alert('Failed to load customers');
        }
    }

    async loadProducts() {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, unit_price')
                .eq('type', 'SELLABLE')  // Only load sellable products
                .order('name');

            if (error) throw error;

            const productSelect = $('#saleProduct');
            productSelect.empty().append('<option value="">Select Product</option>');

            products.forEach(product => {
                const option = new Option(product.name, product.id);
                $(option).data('price', product.unit_price);
                productSelect.append(option);
            });

            productSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Product',
                width: '100%'
            });
        } catch (error) {
            console.error('Error loading products:', error);
            alert('Failed to load products');
        }
    }

    setupListEventListeners() {
        $('#salesTable').on('click', '.delete-btn', async (e) => {
            const id = $(e.target).closest('button').data('id');
            if (confirm('Are you sure you want to delete this sale?')) {
                await this.deleteSale(id);
            }
        });
    }

    setupFormEventListeners() {
        const form = document.getElementById('saleForm');
        if (form) {
            // Update unit price when product is selected
            $('#saleProduct').on('select2:select', (e) => {
                const selectedOption = e.params.data.element;
                const unitPrice = $(selectedOption).data('price') || 0;
                document.getElementById('saleUnitPrice').value = unitPrice;
                this.updateTotalAmount();
            });

            // Update total amount when quantity changes
            document.getElementById('saleQuantity').addEventListener('input', () => {
                this.updateTotalAmount();
            });

            // Check stock availability when quantity changes
            document.getElementById('saleQuantity').addEventListener('input', async (e) => {
                const productId = document.getElementById('saleProduct').value;
                const quantity = parseInt(e.target.value);

                if (productId && quantity) {
                    const { available, currentStock } = await this.checkStockAvailability(productId, quantity);

                    if (!available) {
                        alert(`Insufficient stock. Current stock: ${currentStock}`);
                        e.target.value = currentStock;
                        this.updateTotalAmount();
                    }
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const productId = document.getElementById('saleProduct').value;
                const quantity = parseInt(document.getElementById('saleQuantity').value);

                const { available, currentStock } = await this.checkStockAvailability(productId, quantity);

                if (!available) {
                    alert(`Cannot process sale. Insufficient stock. Current stock: ${currentStock}`);
                    return;
                }

                await this.saveSale();
            });
        }
    }

    updateTotalAmount() {
        const quantity = parseFloat(document.getElementById('saleQuantity').value) || 0;
        const unitPrice = parseFloat(document.getElementById('saleUnitPrice').value) || 0;
        const totalAmount = quantity * unitPrice;
        document.getElementById('saleTotalAmount').value = totalAmount.toFixed(2);
    }

    async checkForEdit() {
        const path = window.location.hash.split('/');
        if (path.length > 1) {
            this.saleId = path[1];
            document.getElementById('formTitle').textContent = 'Edit Sale';
            document.getElementById('breadcrumbAction').textContent = 'Edit';
            await this.loadSale();
        }
    }

    async loadSale() {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select('*')
                .eq('id', this.saleId)
                .single();

            if (error) throw error;

            document.getElementById('saleId').value = data.id;
            $('#saleCustomer').val(data.customer_id).trigger('change');
            $('#saleProduct').val(data.product_id).trigger('change');
            document.getElementById('saleQuantity').value = data.quantity;
            document.getElementById('saleUnitPrice').value = data.unit_price;
            document.getElementById('saleTotalAmount').value = data.total_amount;
        } catch (error) {
            console.error('Error loading sale:', error);
            alert('Failed to load sale details');
        }
    }

    async saveSale() {
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            this.currentUser = user;

            const saleData = {
                customer_id: document.getElementById('saleCustomer').value,
                product_id: document.getElementById('saleProduct').value,
                quantity: parseInt(document.getElementById('saleQuantity').value),
                unit_price: parseFloat(document.getElementById('saleUnitPrice').value),
                total_amount: parseFloat(document.getElementById('saleTotalAmount').value),
                sale_date: document.getElementById('saleDate').value || new Date().toISOString().split('T')[0],
                created_by: this.currentUser.id,
                selling_user_id: this.currentUser.id
            };

            let result;
            const saleId = document.getElementById('saleId').value;

            if (saleId) {
                // Update existing sale
                const { data, error } = await supabase
                    .from('sales')
                    .update({
                        ...saleData,
                        updated_by: this.currentUser.id
                    })
                    .eq('id', saleId)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Insert new sale
                const { data, error } = await supabase
                    .from('sales')
                    .insert([saleData])
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Record stock movement
            await stockManager.recordStockMovement({
                product_id: saleData.product_id,
                movement_type: 'SALE',
                quantity: -saleData.quantity,
                reference_type: 'SALE',
                reference_id: result.id,
                notes: `Sale to customer ${saleData.customer_id}`,
                user_id: this.currentUser.id
            });

            window.location.hash = 'sales-list';
            showToast('Sale saved successfully', 'success');
        } catch (error) {
            console.error('Error saving sale:', error);
            showToast('Failed to save sale', 'error');
        }
    }

    async deleteSale(id) {
        try {
            // Get current user first
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            this.currentUser = user;

            // Get the sale details before deleting
            const { data: sale, error: fetchError } = await supabase
                .from('sales')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Delete the sale
            const { error: deleteError } = await supabase
                .from('sales')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Reverse the stock movement (add back to stock)
            await stockManager.recordStockMovement({
                product_id: sale.product_id,
                movement_type: 'ADJUSTMENT',
                quantity: sale.quantity, // Positive quantity to add back to stock
                reference_type: 'SALE_DELETION',
                reference_id: id,
                notes: `Reversal of deleted sale ${id}`,
                user_id: this.currentUser.id
            });

            if (this.table) {
                this.table.destroy();
            }
            await this.initializeDataTable();
            showToast('Sale deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting sale:', error);
            showToast('Failed to delete sale', 'error');
        }
    }

    // Add method to check stock availability before sale
    async checkStockAvailability(productId, requestedQuantity) {
        try {
            const { data: product, error } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', productId)
                .single();

            if (error) throw error;

            return {
                available: product.stock_quantity >= requestedQuantity,
                currentStock: product.stock_quantity
            };
        } catch (error) {
            console.error('Error checking stock availability:', error);
            throw error;
        }
    }
}

// Create a single instance
const saleManager = new SaleManager();
export default saleManager;
