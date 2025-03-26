import { supabase } from './supabase.js';
import stockManager from './stock.js';
import { showToast } from './utils.js';

class PurchaseManager {
    static instance = null;

    constructor() {
        if (PurchaseManager.instance) {
            return PurchaseManager.instance;
        }
        PurchaseManager.instance = this;

        this.table = null;
        this.returnsTable = null;
        this.purchaseId = null;
        this.currentUser = null;
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

    async initialize() {
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        this.currentUser = user;

        this.setupListEventListeners();
        await this.initializePurchasesTable();
        await this.initializeReturnsTable();

        $('a[data-bs-toggle="tab"]').on('shown.bs.tab', async (e) => {
            const target = $(e.target).attr("href");
            if (target === "#returns") {
                if (this.returnsTable) {
                    this.returnsTable.destroy();
                }
                await this.initializeReturnsTable();
            } else if (target === "#purchases") {
                if (this.table) {
                    this.table.destroy();
                }
                await this.initializePurchasesTable();
            }
        });
    }

    async initializeForm() {
        console.log('Initializing PurchaseManager Form');
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
            this.setupFormEventListeners();
            await this.checkForEdit();
        } catch (error) {
            console.error('Error initializing form:', error);
            showToast('Error initializing form. Please try again.', 'error');
        }
    }
    setupListEventListeners() {
        // Initialize tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();

        // Delete purchase handler
        $('#purchasesTable').on('click', '.delete-btn', async (e) => {
            e.preventDefault();
            const button = $(e.target).closest('button');
            const id = button.data('id');

            // Destroy tooltip before showing confirm dialog
            $(button).tooltip('dispose');

            if (confirm('Are you sure you want to delete this purchase?')) {
                await this.deletePurchase(id);
            } else {
                // Reinitialize tooltip if deletion was cancelled
                $(button).tooltip();
            }
        });

        // Returns table action handlers
        $('#returnsTable').on('click', '.mark-sent', async (e) => {
            e.preventDefault();
            const button = $(e.target).closest('button');
            const id = button.data('id');

            // Destroy tooltip before action
            $(button).tooltip('dispose');

            try {
                button.prop('disabled', true);
                await this.updateReturnStatus(id, 'SENT');
            } finally {
                button.prop('disabled', false);
                // Reinitialize tooltip after action
                $(button).tooltip();
            }
        });

        $('#returnsTable').on('click', '.mark-confirmed', async (e) => {
            e.preventDefault();
            const button = $(e.target).closest('button');
            const id = button.data('id');

            // Destroy tooltip before action
            $(button).tooltip('dispose');

            try {
                button.prop('disabled', true);
                await this.updateReturnStatus(id, 'CONFIRMED');
            } finally {
                button.prop('disabled', false);
                // Reinitialize tooltip after action
                $(button).tooltip();
            }
        });

        // Handle tooltip cleanup on table updates
        $('#purchasesTable, #returnsTable').on('draw.dt', () => {
            $('[data-bs-toggle="tooltip"]').tooltip();
        });

        // Destroy tooltips before table updates
        $('#purchasesTable, #returnsTable').on('preDrawCallback.dt', () => {
            $('[data-bs-toggle="tooltip"]').tooltip('dispose');
        });

        // Cleanup tooltips before any modals
        $('.modal').on('show.bs.modal', () => {
            $('[data-bs-toggle="tooltip"]').tooltip('dispose');
        });

        // Reinitialize tooltips after modals close
        $('.modal').on('hidden.bs.modal', () => {
            $('[data-bs-toggle="tooltip"]').tooltip();
        });
    }
    async initializePurchasesTable() {
        console.log('Initializing DataTable');
        try {
            const { data: purchases, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    suppliers (
                        company_name
                    ),
                    products (
                        name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }

            this.table = $('#purchasesTable').DataTable({
                data: purchases,
                columns: [
                    { data: 'suppliers.company_name' },
                    { data: 'products.name' },
                    { data: 'reference_number' },
                    {
                        data: 'quantity',
                        className: 'text-end'
                    },
                    {
                        data: 'unit_price',
                        className: 'text-end',
                        render: (data) => `£${parseFloat(data).toFixed(2)}`
                    },
                    {
                        data: 'total_amount',
                        className: 'text-end',
                        render: (data) => `£${parseFloat(data).toFixed(2)}`
                    },
                    {
                        data: 'created_at',
                        render: (data) => new Date(data).toLocaleDateString()
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => `
                            <div class="btn-group">
                                <a href="#edit-purchase/${row.id}" 
                                   class="btn btn-sm btn-link text-primary" 
                                   data-bs-toggle="tooltip" 
                                   data-bs-title="Edit Purchase">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <button class="btn btn-sm btn-link text-danger delete-btn" 
                                        data-id="${row.id}" 
                                        data-bs-toggle="tooltip" 
                                        data-bs-title="Delete Purchase">
                                    <i class="bi bi-trash"></i>
                                </button>
                                <a href="#add-return-purchase/${row.id}" 
                                   class="btn btn-sm btn-link text-warning"
                                   data-bs-toggle="tooltip" 
                                   data-bs-title="Create Return">
                                    <i class="bi bi-arrow-return-left"></i>
                                </a>
                            </div>
                        `
                    }
                ],
                drawCallback: function () {
                    // Reinitialize tooltips after table redraw
                    $('[data-bs-toggle="tooltip"]').tooltip();
                }
            });

        } catch (error) {
            console.error('Error initializing DataTable:', error);
            showToast('Error loading purchases data', 'error');
        }
    }

    setupFormEventListeners() {
        const form = document.getElementById('purchaseForm');
        if (form) {
            document.getElementById('purchaseQuantity').addEventListener('input', () => {
                this.updateTotalAmount();
            });

            document.getElementById('purchaseUnitPrice').addEventListener('input', () => {
                this.updateTotalAmount();
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.savePurchase();
            });
        }
    }

    updateTotalAmount() {
        const quantity = parseFloat(document.getElementById('purchaseQuantity').value) || 0;
        const unitPrice = parseFloat(document.getElementById('purchaseUnitPrice').value) || 0;
        const totalAmount = quantity * unitPrice;
        document.getElementById('purchaseTotalAmount').value = totalAmount.toFixed(2);
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
                .select('id, name, unit_price')
                .order('name');

            if (error) throw error;

            const productSelect = $('#purchaseProduct');
            productSelect.empty().append('<option value="">Select Product</option>');

            products.forEach(product => {
                productSelect.append(new Option(product.name, product.id));
                // Store the unit price directly in the option element
                productSelect.find(`option[value='${product.id}']`).data('unit_price', product.unit_price);
            });

            productSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Product',
                width: '100%'
            });

            // Product selection change handler
            productSelect.on('change', (e) => {
                const selectedOption = productSelect.find('option:selected');
                const unitPrice = selectedOption.data('unit_price') || 0;
                $('#purchaseUnitPrice').val(unitPrice.toFixed(2));
                this.updateTotalAmount();
            });

        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Failed to load products', 'error');
        }
    }

    async checkForEdit() {
        const path = window.location.hash.split('/');
        if (path.length > 1) {
            this.purchaseId = path[1];
            document.getElementById('formTitle').textContent = 'Edit Purchase';
            document.getElementById('breadcrumbAction').textContent = 'Edit';
            await this.loadPurchase();
        }
    }

    async loadPurchase() {
        if (!this.purchaseId) return;

        try {
            const { data: purchase, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    suppliers (
                        id,
                        company_name
                    ),
                    products (
                        id,
                        name,
                        unit_price
                    )
                `)
                .eq('id', this.purchaseId)
                .single();

            if (error) throw error;

            // Clear any existing options and add the selected supplier
            $('#purchaseSupplier').empty().append(new Option(
                purchase.suppliers.company_name,
                purchase.suppliers.id,
                true,
                true
            )).trigger('change');

            // Clear any existing options and add the selected product
            $('#purchaseProduct').empty().append(new Option(
                purchase.products.name,
                purchase.products.id,
                true,
                true
            )).trigger('change');

            // Set other form values
            document.getElementById('purchaseId').value = purchase.id;
            document.getElementById('purchaseReference').value = purchase.reference_number;
            document.getElementById('purchaseQuantity').value = purchase.quantity;
            document.getElementById('purchaseUnitPrice').value = purchase.unit_price;
            document.getElementById('purchaseNotes').value = purchase.notes || '';
            document.getElementById('purchaseTotalAmount').value = purchase.total_amount;
        } catch (error) {
            console.error('Error loading purchase:', error);
            alert('Failed to load purchase');
        }
    }

    async savePurchase() {
        try {
            const purchaseData = {
                supplier_id: document.getElementById('purchaseSupplier').value,
                product_id: document.getElementById('purchaseProduct').value,
                reference_number: document.getElementById('purchaseReference').value,
                quantity: parseInt(document.getElementById('purchaseQuantity').value),
                unit_price: parseFloat(document.getElementById('purchaseUnitPrice').value),
                total_amount: parseFloat(document.getElementById('purchaseTotalAmount').value),
                notes: document.getElementById('purchaseNotes').value,
                created_by: this.currentUser.id,
                buying_user_id: this.currentUser.id
            };

            const purchaseId = document.getElementById('purchaseId')?.value;
            let result;

            if (purchaseId) {
                const { data, error } = await supabase
                    .from('purchases')
                    .update({
                        ...purchaseData,
                        updated_by: this.currentUser.id
                    })
                    .eq('id', purchaseId)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                const { data, error } = await supabase
                    .from('purchases')
                    .insert(purchaseData)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            await stockManager.recordStockMovement({
                product_id: purchaseData.product_id,
                movement_type: 'PURCHASE',
                quantity: purchaseData.quantity,
                reference_type: 'PURCHASE',
                reference_id: result.id,
                notes: purchaseData.notes,
                user_id: this.currentUser.id
            });

            window.location.hash = 'purchases-list';
            showToast('Purchase saved successfully', 'success');
        } catch (error) {
            console.error('Error saving purchase:', error);
            showToast('Failed to save purchase', 'error');
        }
    }

    async deletePurchase(id) {
        try {
            // First ensure we have the current user
            if (!this.currentUser) {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;
                this.currentUser = user;
            }

            // Get the purchase details for stock reversal
            const { data: purchase, error: fetchError } = await supabase
                .from('purchases')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            const { error: deleteError } = await supabase
                .from('purchases')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Record stock movement to reverse the purchase
            await stockManager.recordStockMovement({
                product_id: purchase.product_id,
                movement_type: 'ADJUSTMENT', // This is valid
                quantity: -purchase.quantity, // Negative quantity to remove from stock
                reference_type: 'ADJUSTMENT', // Changed to use a valid reference type
                reference_id: id,
                notes: `Reversal of deleted purchase ${purchase.reference_number || id}`,
                user_id: this.currentUser.id
            });

            if (this.table) {
                this.table.destroy();
            }
            await this.initializePurchasesTable();
            showToast('Purchase deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting purchase:', error);
            showToast('Failed to delete purchase', 'error');
            throw error; // Re-throw to see the full error in console
        }
    }

    async initializeReturnsTable() {
        try {
            // Remove existing event listeners to prevent duplicates
            $(document).off('click', '#returnsTable .mark-sent');
            $(document).off('click', '#returnsTable .mark-confirmed');

            // Add event listeners using event delegation with proper binding
            $(document).on('click', '#returnsTable .mark-sent', async (e) => {
                e.preventDefault();
                const button = $(e.target).closest('button');
                const id = button.data('id');
                const self = this;
                try {
                    button.prop('disabled', true);
                    await self.updateReturnStatus(id, 'SENT');
                } finally {
                    button.prop('disabled', false);
                }
            });

            $(document).on('click', '#returnsTable .mark-confirmed', async (e) => {
                e.preventDefault();
                const button = $(e.target).closest('button');
                const id = button.data('id');
                const self = this;
                try {
                    button.prop('disabled', true);
                    await self.updateReturnStatus(id, 'CONFIRMED');
                } finally {
                    button.prop('disabled', false);
                }
            });

            const { data: returns, error } = await supabase
                .from('purchase_returns')
                .select(`
                    id,
                    quantity,
                    reason,
                    status,
                    created_at,
                    purchase:purchase_id (
                        reference_number,
                        product:product_id (
                            name
                        ),
                        supplier:supplier_id (
                            company_name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (this.returnsTable) {
                this.returnsTable.destroy();
            }

            this.returnsTable = $('#returnsTable').DataTable({
                data: returns,
                columns: [
                    {
                        data: 'created_at',
                        render: (data) => new Date(data).toLocaleString()
                    },
                    {
                        data: 'purchase.reference_number',
                        render: (data) => data || 'N/A'
                    },
                    {
                        data: 'purchase.product.name',
                        render: (data) => data || 'N/A'
                    },
                    {
                        data: 'purchase.supplier.company_name',
                        render: (data) => data || 'N/A'
                    },
                    { data: 'quantity' },
                    { data: 'reason' },
                    {
                        data: 'status',
                        render: (data) => {
                            const badges = {
                                'WAITING': 'bg-warning',
                                'SENT': 'bg-info',
                                'CONFIRMED': 'bg-success'
                            };
                            return `<span class="badge ${badges[data]}">${data}</span>`;
                        }
                    },
                    {
                        data: null,
                        render: (data) => {
                            let actions = `
                                <a href="#add-return-purchase/${data.id}" 
                                   class="btn btn-sm btn-link text-primary"
                                   data-bs-toggle="tooltip"
                                   data-bs-title="Edit Return">
                                    <i class="bi bi-pencil-square"></i>
                                </a>`;

                            if (data.status === 'WAITING') {
                                actions += `
                                    <button class="btn btn-sm btn-link text-success mark-sent" 
                                            data-id="${data.id}"
                                            data-bs-toggle="tooltip"
                                            data-bs-title="Mark as Sent">
                                        <i class="bi bi-send"></i>
                                    </button>`;
                            } else if (data.status === 'SENT') {
                                actions += `
                                    <button type="button" 
                                            class="btn btn-sm btn-link text-success mark-confirmed" 
                                            data-id="${data.id}"
                                            data-bs-toggle="tooltip"
                                            data-bs-title="Mark as Confirmed">
                                        <i class="bi bi-check2-all"></i>
                                    </button>`;
                            }

                            return actions;
                        }
                    }
                ],
                order: [[0, 'desc']],
                responsive: true,
                drawCallback: function () {
                    // Reinitialize tooltips after table redraw
                    $('[data-bs-toggle="tooltip"]').tooltip();
                }
            });

        } catch (error) {
            console.error('Error initializing returns table:', error);
            showToast('Failed to initialize returns table', 'error');
        }
    }

    async updateReturnStatus(id, status) {
        try {
            // Get the current user from the instance that was set during form initialization
            if (!this.currentUser) {
                // If somehow currentUser is not available, refresh it
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;
                this.currentUser = user;
            }

            const { error } = await supabase
                .from('purchase_returns')
                .update({
                    status: status,
                    updated_by: this.currentUser.id,
                    updated_at: new Date()
                })
                .eq('id', id);

            if (error) throw error;

            // Refresh the table
            await this.initializeReturnsTable();
        } catch (error) {
            console.error('Error updating return status:', error);
            alert('Failed to update return status');
        }
    }

    async initializeReturnForm() {
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            this.currentUser = user;

            // Initialize Select2 for purchase selection
            $('#purchaseSelect').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search purchase by reference or product...',
                width: '100%',
                ajax: {
                    delay: 250,
                    transport: async (params, success, failure) => {
                        try {
                            const { data: purchases, error } = await supabase
                                .from('purchases')
                                .select(`
                                    id,
                                    reference_number,
                                    quantity,
                                    products (name),
                                    suppliers (company_name)
                                `)
                                .ilike('reference_number', `%${params.data.term || ''}%`)
                                .order('created_at', { ascending: false });

                            if (error) throw error;

                            const results = purchases.map(p => ({
                                id: p.id,
                                text: `${p.reference_number} - ${p.products.name} (${p.suppliers.company_name})`,
                                quantity: p.quantity
                            }));

                            success({ results });
                        } catch (error) {
                            console.error('Search error:', error);
                            failure('Failed to fetch purchases');
                        }
                    }
                },
                templateResult: (data) => {
                    if (data.loading) return 'Searching...';
                    return data.text;
                },
                templateSelection: (data) => {
                    return data.text || 'Select a purchase';
                }
            });

            // Handle purchase selection
            $('#purchaseSelect').on('select2:select', (e) => {
                const data = e.params.data;
                $('#originalQuantity').text(data.quantity);
                $('#returnQuantity').attr('max', data.quantity);
            });

            // Handle form submission
            $('#returnPurchaseForm').on('submit', async (e) => {
                e.preventDefault();
                await this.processPurchaseReturn();
            });

            // Check URL for purchase ID
            const path = window.location.hash.split('/');
            if (path[0] === '#add-return-purchase' && path.length > 1) {
                const purchaseId = path[1];
                await this.loadPurchaseForReturn(purchaseId);
            }

        } catch (error) {
            console.error('Error initializing return form:', error);
            showToast('Error initializing form. Please try again.', 'error');
        }
    }

    async processPurchaseReturn() {
        try {
            const returnId = document.getElementById('returnId')?.value;
            const purchaseId = $('#purchaseSelect').val();
            const returnQuantity = parseInt($('#returnQuantity').val());
            const returnReason = $('#returnReason').val();
            const returnStatus = $('#returnStatus').val();

            if (returnId) {
                // Update existing return
                const { error: returnError } = await supabase
                    .from('purchase_returns')
                    .update({
                        quantity: returnQuantity,
                        reason: returnReason,
                        status: returnStatus,
                        updated_by: this.currentUser.id,
                        updated_at: new Date()
                    })
                    .eq('id', returnId);

                if (returnError) throw returnError;

            } else {
                // Get the original purchase
                const { data: purchase, error: purchaseError } = await supabase
                    .from('purchases')
                    .select('*')
                    .eq('id', purchaseId)
                    .single();

                if (purchaseError) throw purchaseError;

                // Create new return record
                const { data: returnData, error: returnError } = await supabase
                    .from('purchase_returns')
                    .insert({
                        purchase_id: purchaseId,
                        quantity: returnQuantity,
                        reason: returnReason,
                        status: returnStatus || 'WAITING',
                        created_by: this.currentUser.id
                    })
                    .select()
                    .single();

                if (returnError) throw returnError;

                // Record stock movement for new returns only
                await stockManager.recordStockMovement({
                    product_id: purchase.product_id,
                    movement_type: 'RETURN',
                    quantity: -returnQuantity,
                    reference_type: 'PURCHASE_RETURN',
                    reference_id: returnData.id,
                    notes: returnReason,
                    user_id: this.currentUser.id
                });
            }

            alert('Purchase return processed successfully');
            window.location.href = '#return-purchase-list';
            setTimeout(() => {
                const returnsTab = document.querySelector('a[href="#returns"]');
                if (returnsTab) {
                    const tab = new bootstrap.Tab(returnsTab);
                    tab.show();
                }
            }, 100);

        } catch (error) {
            console.error('Error processing return:', error);
            alert('Failed to process return');
        }
    }

    async loadPurchaseForReturn(purchaseId) {
        try {
            const { data: purchase, error } = await supabase
                .from('purchases')
                .select(`
                    id,
                    reference_number,
                    quantity,
                    products (name),
                    suppliers (company_name)
                `)
                .eq('id', purchaseId)
                .single();

            if (error) throw error;

            // Create the option data
            const optionData = {
                id: purchase.id,
                text: `${purchase.reference_number} - ${purchase.products.name} (${purchase.suppliers.company_name})`,
                quantity: purchase.quantity
            };

            // Create the option element
            const option = new Option(optionData.text, optionData.id, true, true);

            // Append it to Select2
            $('#purchaseSelect').empty().append(option).trigger('change');

            // Set the quantity information
            $('#originalQuantity').text(purchase.quantity);
            $('#returnQuantity').attr('max', purchase.quantity);

        } catch (error) {
            console.error('Error loading purchase for return:', error);
            showToast('Failed to load purchase details', 'error');
        }
    }
}

// Create and export a single instance
const purchaseManager = new PurchaseManager();
export default purchaseManager;
