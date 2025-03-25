import { supabase } from './supabase.js';
import stockManager from './stock.js';
import { showToast } from './utils.js';

class BulkPurchaseManager {
    constructor() {
        this.currentUser = null;
        this.productRowTemplate = this.createProductRowTemplate();
        this.bulkPurchaseId = null;
        this.products = []; // Add this to store products
    }

    createProductRowTemplate() {
        return `
            <tr class="product-row">
                <td>
                    <select class="form-select product-select" required>
                        <option value="">Select Product</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control quantity-input" min="1" required>
                </td>
                <td>
                    <input type="number" class="form-control price-input" min="0" step="0.01" required>
                </td>
                <td>
                    <span class="row-total">0.00</span>
                </td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm remove-row">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    async initializeForm() {
        console.log('Initializing Bulk Purchase Form');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            this.currentUser = user;

            await this.loadSuppliers();
            await this.loadProducts();
            this.setupEventListeners();
            this.addProductRow(); // Add first row by default
            await this.checkForEdit();
        } catch (error) {
            console.error('Error initializing form:', error);
            showToast('Error initializing form. Please try again.', 'error');
        }
    }

    async checkForEdit() {
        const hash = window.location.hash;
        if (hash.includes('add-bulk-purchase/')) {
            this.bulkPurchaseId = hash.split('/')[1];
            document.getElementById('formTitle').textContent = 'Edit Bulk Purchase';
            await this.loadBulkPurchase();
        }
    }

    async loadBulkPurchase() {
        try {
            const { data: purchase, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    suppliers (
                        id,
                        company_name
                    )
                `)
                .eq('id', this.bulkPurchaseId)
                .single();

            if (error) throw error;

            if (purchase) {
                // Clear any existing options and add the selected supplier
                $('#purchaseSupplier').empty().append(new Option(
                    purchase.suppliers.company_name,
                    purchase.suppliers.id,
                    true,
                    true
                )).trigger('change');

                // Set other fields
                document.getElementById('purchaseReference').value = purchase.reference_number || '';
                document.getElementById('purchaseNotes').value = purchase.notes || '';
            }
        } catch (error) {
            console.error('Error loading bulk purchase:', error);
            showToast('Failed to load bulk purchase', 'error');
        }
    }


    async loadSuppliers() {
        try {
            const { data: suppliers, error } = await supabase
                .from('suppliers')
                .select('id, company_name')
                .order('company_name');

            if (error) throw error;

            const supplierSelect = $('#purchaseSupplier');
            supplierSelect.empty().append('<option value="">Select Supplier</option>');

            suppliers.forEach(supplier => {
                supplierSelect.append(new Option(supplier.company_name, supplier.id));
            });

            supplierSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Supplier',
                width: '100%'
            });
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    }

    async loadProducts() {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, min_stock')
                .order('name');

            if (error) throw error;

            this.products = products; // Store products for later use
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Failed to load products', 'error');
        }
    }

    setupEventListeners() {
        $('#addProductRow').on('click', () => this.addProductRow());

        // Add supplier change event listener
        $('#purchaseSupplier').on('change', async (e) => {
            const supplierId = e.target.value;
            if (supplierId) {
                try {
                    const { data: products, error } = await supabase
                        .from('products')
                        .select('id, name, min_stock')
                        .eq('supplier_id', supplierId)
                        .order('name');

                    if (error) throw error;

                    this.products = products;
                    $('#productsTableBody').empty();
                    this.addProductRow();
                } catch (error) {
                    console.error('Error loading supplier products:', error);
                    showToast('Failed to load supplier products', 'error');
                }
            } else {
                this.products = [];
                $('#productsTableBody').empty();
            }
        });

        // Fix delete button event delegation
        $(document).on('click', '.remove-row', (e) => {
            const $row = $(e.target).closest('tr');
            $row.remove();
            this.updateTotals();
        });

        $('#productsTableBody').on('input', '.quantity-input, .price-input', () => this.updateTotals());
        $('#bulkPurchaseForm').on('submit', (e) => this.saveBulkPurchase(e));
    }

    addProductRow() {
        const $row = $(this.productRowTemplate);
        const $select = $row.find('.product-select');

        // Populate products
        this.products.forEach(product => {
            $select.append(new Option(product.name, product.id));
        });

        // Initialize Select2
        $select.select2({
            theme: 'bootstrap-5',
            placeholder: 'Select Product',
            width: '100%'
        });

        $('#productsTableBody').append($row);
    }

    removeProductRow(e) {
        $(e.target).closest('tr').remove();
        this.updateTotals();
    }

    updateTotals() {
        let grandTotal = 0;
        $('.product-row').each((i, row) => {
            const quantity = parseFloat($(row).find('.quantity-input').val()) || 0;
            const price = parseFloat($(row).find('.price-input').val()) || 0;
            const total = quantity * price;
            $(row).find('.row-total').text(total.toFixed(2));
            grandTotal += total;
        });
        $('#grandTotal').text(grandTotal.toFixed(2));
    }

    async saveBulkPurchase(e) {
        e.preventDefault();
        try {
            const supplierId = $('#purchaseSupplier').val();
            const referenceNumber = $('#purchaseReference').val();
            const notes = $('#purchaseNotes').val();

            const purchases = [];
            let hasErrors = false;

            $('.product-row').each((i, row) => {
                const $row = $(row);
                const productId = $row.find('.product-select').val();
                const quantity = parseInt($row.find('.quantity-input').val());
                const unitPrice = parseFloat($row.find('.price-input').val());

                if (!productId || !quantity || !unitPrice) {
                    hasErrors = true;
                    return false;
                }

                purchases.push({
                    supplier_id: supplierId,
                    product_id: productId,
                    reference_number: referenceNumber,
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_amount: quantity * unitPrice,
                    notes: notes,
                    created_by: this.currentUser.id,
                    buying_user_id: this.currentUser.id
                });
            });

            if (hasErrors) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('purchases')
                .insert(purchases)
                .select();

            if (error) throw error;

            // Record stock movements for each purchase
            for (const purchase of data) {
                await stockManager.recordStockMovement({
                    product_id: purchase.product_id,
                    movement_type: 'PURCHASE',
                    quantity: purchase.quantity,
                    reference_type: 'PURCHASE',
                    reference_id: purchase.id,
                    notes: purchase.notes,
                    user_id: this.currentUser.id
                });
            }

            window.location.hash = 'purchases-list';
            showToast('Bulk purchase saved successfully', 'success');
        } catch (error) {
            console.error('Error saving bulk purchase:', error);
            showToast('Failed to save bulk purchase', 'error');
        }
    }

    checkDependencies() {
        return typeof $ !== 'undefined' && typeof supabase !== 'undefined';
    }
}

// Create and export a single instance
const bulkPurchaseManager = new BulkPurchaseManager();
export default bulkPurchaseManager;
