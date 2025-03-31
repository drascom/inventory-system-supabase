import { supabase } from './supabase.js';
import stockManager from './stock.js';
import { showToast } from './utils.js';

class BulkPurchaseManager {
    constructor() {
        this.currentUser = null;
        this.productRowTemplate = this.createProductRowTemplate();
        this.bulkPurchaseId = null;
        this.products = []; // Add this to store products
        this.quickAddModal = null;
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

    initializeSelect2ForProductSelect($select) {
        $select.select2({
            theme: 'bootstrap-5',
            placeholder: $select.prop('disabled') ? 'Select Supplier First' : 'Select Product',
            width: '100%',
            templateResult: function (data) {
                if (data.id === 'quick-add') {
                    return $('<span><i class="bi bi-plus-circle me-1"></i><strong>Quick Add Product</strong></span>');
                }
                return data.text;
            },
            templateSelection: function (data) {
                if (data.id === 'quick-add') {
                    return '+ Quick Add Product';
                }
                return data.text;
            },
            matcher: function (params, data) {
                // Always show Quick Add option
                if (data.id === 'quick-add') return data;

                // If there's no search term, return all data
                if (!params.term) return data;

                // Otherwise, do the normal text matching
                if (data.text.toLowerCase().includes(params.term.toLowerCase())) {
                    return data;
                }

                return null;
            }
        }).on('select2:select', (e) => {
            if (e.params.data.id === 'quick-add') {
                $select.select2('close');

                const $currentRow = $select.closest('tr');
                $('#quickAddProductModal').data('triggerRow', $currentRow);

                this.quickAddModal.show();

                // Reset back to placeholder
                $select.val('').trigger('change');
            }
        });
    }

    updateProductSelects() {
        $('.product-select').each((i, select) => {
            const $select = $(select);
            const supplierId = $('#purchaseSupplier').val();

            // Destroy existing Select2 if it exists
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }

            // Clear existing options
            $select.empty();

            if (!supplierId) {
                // If no supplier selected, show placeholder and disable
                $select.append('<option value="">Select Supplier First</option>');
                $select.prop('disabled', true);
                this.initializeSelect2ForProductSelect($select);
                return;
            }

            // Enable select and add default option
            $select.prop('disabled', false);
            $select.append('<option value="">Select Product</option>');

            // Add supplier's products
            this.products.forEach(product => {
                const option = new Option(product.name, product.id);
                $(option).data('unit_price', product.unit_price);
                $select.append(option);
            });

            // Add Quick Add option
            $select.append(new Option('+ Quick Add Product', 'quick-add'));

            // Initialize Select2
            this.initializeSelect2ForProductSelect($select);

            // Restore previous selection if valid
            if ($select.data('previous-value') &&
                (this.products.some(p => p.id === $select.data('previous-value')) ||
                    $select.data('previous-value') === 'quick-add')) {
                $select.val($select.data('previous-value')).trigger('change');
            }
        });
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

            // Initialize Quick Add Product Modal
            this.setupQuickAddProductModal();

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

    setupQuickAddProductModal() {
        // Add modal HTML if it doesn't exist
        if (!document.getElementById('quickAddProductModal')) {
            const modalHtml = `
                <div class="modal fade" id="quickAddProductModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Quick Add Product</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="quickAddProductForm" class="needs-validation" novalidate>
                                    <div class="mb-3">
                                        <label for="quickProductName" class="form-label">Product Name</label>
                                        <input type="text" class="form-control" id="quickProductName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quickProductType" class="form-label">Type</label>
                                        <select class="form-select" id="quickProductType" required>
                                            <option value="">Select Type</option>
                                            <option value="SELLABLE">Sellable</option>
                                            <option value="CONSUMABLE">Consumable</option>
                                            <option value="FIXTURE">Fixture</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quickProductPrice" class="form-label">Unit Price</label>
                                        <div class="input-group">
                                            <span class="input-group-text">£</span>
                                            <input type="number" step="0.01" class="form-control" id="quickProductPrice" required>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="quickAddProductBtn">Add Product</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Initialize modal
        this.quickAddModal = new bootstrap.Modal(document.getElementById('quickAddProductModal'));

        // Setup event listeners for the modal
        document.getElementById('quickAddProductBtn').addEventListener('click', async () => {
            const form = document.getElementById('quickAddProductForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            const name = document.getElementById('quickProductName').value;
            const type = document.getElementById('quickProductType').value;
            const unitPrice = parseFloat(document.getElementById('quickProductPrice').value);

            await this.quickAddProduct(name, type, unitPrice);
        });

        // Reset form when modal is hidden
        document.getElementById('quickAddProductModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('quickAddProductForm').reset();
            document.getElementById('quickAddProductForm').classList.remove('was-validated');
        });
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
                .select('id, name, unit_price')  // Added unit_price
                .order('name');

            if (error) throw error;

            this.products = products.map(product => ({
                ...product,
                unit_price: parseFloat(product.unit_price) || 0
            }));
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Failed to load products', 'error');
        }
    }

    setupEventListeners() {
        $('#addProductRow').on('click', () => this.addProductRow());

        // Update supplier change event listener
        $('#purchaseSupplier').on('change', async (e) => {
            const supplierId = e.target.value;
            if (supplierId) {
                try {
                    console.log('Selected supplier ID:', supplierId);

                    const { data: products, error } = await supabase
                        .from('products')
                        .select('id, name, min_stock, unit_price')
                        .eq('supplier_id', supplierId)
                        .order('name');

                    if (error) throw error;

                    console.log('Fetched products:', products);

                    // Store products in the class property
                    this.products = products.map(product => ({
                        ...product,
                        unit_price: parseFloat(product.unit_price) || 0
                    }));

                    console.log('Processed products:', this.products);

                    // Clear existing rows and add a new one
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

        // Clear existing options first
        $select.empty();

        // Add empty option
        $select.append(new Option('Select Product', ''));

        // Populate products
        if (this.products && this.products.length > 0) {
            this.products.forEach(product => {
                const option = new Option(product.name, product.id);
                $(option).data('unit_price', product.unit_price);
                $select.append(option);
            });
        }

        // Add Quick Add option
        $select.prepend(new Option('+ Add Product', 'quick-add'));

        // Initialize Select2 with our custom configuration
        this.initializeSelect2ForProductSelect($select);

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

    async quickAddProduct(name, type, unitPrice) {
        try {
            const supplierId = $('#purchaseSupplier').val();
            if (!supplierId) {
                showToast('Please select a supplier first.', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('products')
                .insert({
                    name,
                    type,
                    unit_price: unitPrice,
                    supplier_id: supplierId
                })
                .select()
                .single();

            if (error) throw error;

            // Reload products and refresh selects
            await this.loadProducts();
            this.updateProductSelects();

            // Close modal
            this.quickAddModal.hide();

            showToast('Product added successfully', 'success');

            // Optional: Automatically select the newly added product in the triggering row
            const $triggerRow = $('#quickAddProductModal').data('triggerRow');
            if ($triggerRow && data?.id) {
                const $select = $triggerRow.find('.product-select');
                $select.val(data.id).trigger('change');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            showToast('Failed to add product', 'error');
        }
    }

    checkDependencies() {
        return typeof $ !== 'undefined' && typeof supabase !== 'undefined';
    }
}

// Create and export a single instance
const bulkPurchaseManager = new BulkPurchaseManager();
export default bulkPurchaseManager;
