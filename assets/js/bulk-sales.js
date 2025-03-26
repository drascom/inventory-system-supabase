import { supabase } from './supabase.js';
import stockManager from './stock.js';
import { showToast } from './utils.js';

class BulkSaleManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
    }

    async initializeForm() {
        try {
            if (!this.checkDependencies()) {
                showToast('Required dependencies not loaded', 'error');
                return;
            }

            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            this.currentUser = user;

            // Set default date to today
            document.getElementById('saleDate').valueAsDate = new Date();

            await this.loadCustomers();
            await this.loadProducts();
            this.setupEventListeners();
            this.addProductRow(); // Add first row by default
        } catch (error) {
            console.error('Error initializing form:', error);
            showToast('Error initializing form', 'error');
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

            // Initialize Select2
            customerSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Customer',
                width: '100%'
            });
        } catch (error) {
            console.error('Error loading customers:', error);
            showToast('Failed to load customers', 'error');
        }
    }

    async loadProducts() {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, unit_price, pieces_per_box')
                .eq('type', 'SELLABLE')
                .order('name');

            if (error) throw error;

            this.products = products;
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Failed to load products', 'error');
        }
    }

    setupEventListeners() {
        $('#addProductRow').on('click', () => this.addProductRow());

        $('#productsTableBody').on('click', '.remove-row', (e) => {
            $(e.target).closest('tr').remove();
            this.updateGrandTotal();
        });

        $('#saleForm').on('submit', async (e) => {
            e.preventDefault();
            await this.saveSale();
        });
    }

    addProductRow() {
        const rowHtml = `
            <tr class="product-row">
                <td>
                    <select class="form-select product-select" required>
                        <option value="">Select Product</option>
                        ${this.products.map(p => `
                            <option value="${p.id}" 
                                data-price="${p.unit_price}"
                                data-pieces="${p.pieces_per_box}">
                                ${p.name}
                            </option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <select class="form-select unit-type-select" required>
                        <option value="BOX">Box</option>
                        <option value="PIECE">Piece</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control quantity-input" min="1" value="1" required>
                    <small class="text-muted quantity-help"></small>
                </td>
                <td>
                    <input type="number" class="form-control price-input" step="0.01" required>
                </td>
                <td class="row-total">0.00</td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm remove-row">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        const $row = $(rowHtml);
        $('#productsTableBody').append($row);

        // Product selection change handler
        $row.find('.product-select').on('change', (e) => {
            const selectedOption = $(e.target).find('option:selected');
            const boxPrice = selectedOption.data('price') || 0;
            const piecesPerBox = selectedOption.data('pieces') || 1;
            const unitType = $row.find('.unit-type-select').val();

            // Calculate price based on unit type
            const price = unitType === 'PIECE' ? (boxPrice / piecesPerBox) : boxPrice;

            $row.find('.price-input').val(price.toFixed(2));
            $row.find('.quantity-help').text(piecesPerBox ? `1 box = ${piecesPerBox} pieces` : '').toggle(!!piecesPerBox);
            this.updateRowTotal($row);
        });

        // Unit type change handler
        $row.find('.unit-type-select').on('change', (e) => {
            const $selectedProduct = $row.find('.product-select option:selected');
            const boxPrice = $selectedProduct.data('price') || 0;
            const piecesPerBox = $selectedProduct.data('pieces') || 1;
            const unitType = $(e.target).val();

            // Calculate price based on unit type
            const price = unitType === 'PIECE' ? (boxPrice / piecesPerBox) : boxPrice;

            $row.find('.price-input').val(price.toFixed(2));
            this.updateRowTotal($row);
        });

        // Quantity and price change handlers
        $row.find('.quantity-input, .price-input').on('input', () => {
            this.updateRowTotal($row);
        });
    }

    updateRowTotal($row) {
        const quantity = parseFloat($row.find('.quantity-input').val()) || 0;
        const unitPrice = parseFloat($row.find('.price-input').val()) || 0;
        const total = quantity * unitPrice;

        $row.find('.row-total').text(total.toFixed(2));
        this.updateGrandTotal();
    }

    updateGrandTotal() {
        let grandTotal = 0;
        $('.product-row').each((i, row) => {
            grandTotal += parseFloat($(row).find('.row-total').text()) || 0;
        });
        $('#grandTotal').text(grandTotal.toFixed(2));
    }

    async saveSale() {
        try {
            const customerId = $('#saleCustomer').val();
            const saleDate = $('#saleDate').val();
            const notes = $('#saleNotes').val();

            if (!customerId) {
                showToast('Please select a customer', 'error');
                return;
            }

            const sales = [];
            let hasErrors = false;

            $('.product-row').each((i, row) => {
                const $row = $(row);
                const productId = $row.find('.product-select').val();
                const unitType = $row.find('.unit-type-select').val();
                const quantity = parseInt($row.find('.quantity-input').val());
                const unitPrice = parseFloat($row.find('.price-input').val());
                const total = parseFloat($row.find('.row-total').text());

                // Find the selected product data
                const product = this.products.find(p => p.id === parseInt(productId));

                if (!productId || !unitType || !quantity || !unitPrice) {
                    hasErrors = true;
                    return false;
                }

                const actualQuantity = unitType === 'BOX'
                    ? quantity * (product?.pieces_per_box || 1)
                    : quantity;

                sales.push({
                    customer_id: customerId,
                    product_id: productId,
                    quantity: quantity,
                    unit_type: unitType,
                    unit_price: unitPrice,
                    total_amount: total,
                    sale_date: saleDate,
                    actual_quantity: actualQuantity,
                    pieces_per_box: product?.pieces_per_box || 1,
                    notes: notes,
                    selling_user_id: this.currentUser.id,
                    created_by: this.currentUser.id
                });
            });

            if (hasErrors) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            if (sales.length === 0) {
                showToast('Please add at least one product', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('sales')
                .insert(sales)
                .select();

            if (error) throw error;

            // Record stock movements for each sale
            for (const sale of data) {
                await stockManager.recordStockMovement({
                    product_id: sale.product_id,
                    movement_type: 'SALE',
                    quantity: -sale.actual_quantity,
                    reference_type: 'SALE',
                    reference_id: sale.id,
                    notes: `Sale to customer ${$('#saleCustomer option:selected').text()}`,
                    created_by: this.currentUser.id
                });
            }

            window.location.hash = 'sales-list';
            showToast('Sales saved successfully', 'success');
        } catch (error) {
            console.error('Error saving sales:', error);
            showToast('Failed to save sales', 'error');
        }
    }

    checkDependencies() {
        return typeof $ !== 'undefined' && typeof supabase !== 'undefined';
    }
}

export default new BulkSaleManager();
