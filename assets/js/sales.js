import { supabase } from './supabase.js';
import { showToast } from './utils.js';
import stockManager from './stock.js';

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
        this.products = [];
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

    async initializeList() {
        console.log('Initializing SaleManager List');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        await this.initializeDataTable();
        this.setupListEventListeners();
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
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }

            this.table = $('#salesTable').DataTable({
                data: sales,
                columns: [
                    { data: 'customers.name' },
                    { data: 'products.name' },
                    {
                        data: 'quantity',
                        className: 'text-end'
                    },
                    {
                        data: 'unit_type',
                        render: (data) => data === 'BOX' ? 'Box' : 'Piece'
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
                        data: 'sale_date',
                        render: (data) => new Date(data).toLocaleDateString()
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => `
                            <div class="btn-group">
                                <a href="#edit-sale/${row.id}" 
                                   class="btn btn-sm btn-link text-primary" 
                                   data-bs-toggle="tooltip" 
                                   data-bs-title="Edit Sale">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <button class="btn btn-sm btn-link text-danger delete-sale" 
                                        data-id="${row.id}" 
                                        data-bs-toggle="tooltip" 
                                        data-bs-title="Delete Sale">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        `
                    }
                ],
                drawCallback: function () {
                    // Reinitialize tooltips after table redraw
                    $('[data-bs-toggle="tooltip"]').tooltip();
                }
            });

            console.log('DataTable initialized');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
            showToast('Error loading sales data', 'error');
        }
    }

    setupListEventListeners() {
        // Initialize tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();

        $('#salesTable').on('click', '.delete-sale', async (e) => {
            e.preventDefault();
            const button = $(e.target).closest('.delete-sale');
            const id = button.data('id');

            // Destroy tooltip before showing confirm dialog
            $(button).tooltip('dispose');

            if (confirm('Are you sure you want to delete this sale?')) {
                await this.deleteSale(id);
            } else {
                // Reinitialize tooltip if deletion was cancelled
                $(button).tooltip();
            }
        });

        // Handle tooltip cleanup on table updates
        $('#salesTable').on('draw.dt', () => {
            $('[data-bs-toggle="tooltip"]').tooltip();
        });

        // Destroy tooltips before table updates
        $('#salesTable').on('preDrawCallback.dt', () => {
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

    async initializeForm() {
        console.log('Initializing SaleManager Form');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            this.currentUser = user;

            await this.loadCustomers();
            await this.loadProducts();
            this.setupFormEventListeners();
            await this.checkForEdit();
        } catch (error) {
            console.error('Error initializing form:', error);
            showToast('Error initializing form. Please try again.', 'error');
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

            // Destroy existing Select2 if it exists
            if (customerSelect.hasClass('select2-hidden-accessible')) {
                customerSelect.select2('destroy');
            }

            // Clear and add the default option
            customerSelect.empty().append('<option value="">Select Customer</option>');

            // Add all customers
            customers.forEach(customer => {
                customerSelect.append(new Option(customer.name, customer.id));
            });

            // Initialize Select2
            customerSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Customer',
                width: '100%',
                dropdownParent: customerSelect.parent()
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
            const productSelect = $('#saleProduct');

            // Destroy existing Select2 if it exists
            if (productSelect.hasClass('select2-hidden-accessible')) {
                productSelect.select2('destroy');
            }

            // Clear and add the default option
            productSelect.empty().append('<option value="">Select Product</option>');

            // Add all products
            this.products.forEach(product => {
                const option = new Option(product.name, product.id);
                $(option).data('price', product.unit_price);
                $(option).data('pieces_per_box', product.pieces_per_box || 1);
                productSelect.append(option);
            });

            // Initialize Select2
            productSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Product',
                width: '100%',
                dropdownParent: productSelect.parent()
            });

        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Failed to load products', 'error');
        }
    }

    setupFormEventListeners() {
        // Product selection change handler
        $('#saleProduct').on('change', (e) => {
            const selectedOption = $(e.target).find('option:selected');
            const boxPrice = parseFloat(selectedOption.data('price')) || 0;
            const piecesPerBox = parseInt(selectedOption.data('pieces_per_box')) || 1;
            const unitType = $('#saleUnitType').val();

            console.log('Product change:', { boxPrice, piecesPerBox, unitType }); // Debug log

            const unitPrice = unitType === 'PIECE' ? (boxPrice / piecesPerBox) : boxPrice;
            $('#saleUnitPrice').val(unitPrice.toFixed(2));
            this.updateQuantityLabel();
            this.updateTotalAmount();
        });

        // Unit type change handler
        $('#saleUnitType').on('change', (e) => {
            const $selectedProduct = $('#saleProduct').find('option:selected');
            const boxPrice = parseFloat($selectedProduct.data('price')) || 0;
            const piecesPerBox = parseInt($selectedProduct.data('pieces_per_box')) || 1;
            const unitType = e.target.value;

            console.log('Unit type change:', { boxPrice, piecesPerBox, unitType }); // Debug log

            let newUnitPrice;
            if (unitType === 'PIECE') {
                // Converting from BOX to PIECE
                newUnitPrice = boxPrice / piecesPerBox;
            } else {
                // Converting from PIECE to BOX
                newUnitPrice = boxPrice;
            }

            console.log('New unit price:', newUnitPrice); // Debug log

            $('#saleUnitPrice').val(newUnitPrice.toFixed(2));
            this.updateQuantityLabel();
            this.updateTotalAmount();
        });

        // Quantity and price change handlers
        $('#saleQuantity, #saleUnitPrice').on('input', () => this.updateTotalAmount());

        // Form submit handler
        $('#saleForm').on('submit', async (e) => {
            e.preventDefault();
            await this.saveSale();
        });
    }

    updateQuantityLabel() {
        const selectedOption = $('#saleProduct').find('option:selected');
        const piecesPerBox = parseInt(selectedOption.data('pieces_per_box')) || 1;
        const unitType = $('#saleUnitType').val();
        const quantityLabel = $('label[for="saleQuantity"]');
        const quantityHelp = $('#quantityHelp');

        if (unitType === 'BOX') {
            quantityLabel.text('Quantity (Boxes)');
            quantityHelp.text(`1 box = ${piecesPerBox} pieces`).show();
        } else {
            quantityLabel.text('Quantity (Pieces)');
            quantityHelp.text(`${piecesPerBox} pieces = 1 box`).show();
        }
    }

    updateTotalAmount() {
        const quantity = parseFloat($('#saleQuantity').val()) || 0;
        const unitPrice = parseFloat($('#saleUnitPrice').val()) || 0;
        const totalAmount = quantity * unitPrice;

        console.log('Updating total:', { quantity, unitPrice, totalAmount }); // Debug log

        $('#saleTotalAmount').val(totalAmount.toFixed(2));
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
        if (!this.saleId) return;

        try {
            const { data: sale, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    customers (
                        id,
                        name
                    ),
                    products (
                        id,
                        name,
                        unit_price
                    )
                `)
                .eq('id', this.saleId)
                .single();

            if (error) throw error;

            // Wait for customers and products to be loaded first
            await this.loadCustomers();
            await this.loadProducts();

            // Set the customer in Select2
            $('#saleCustomer').val(sale.customers.id).trigger('change');

            // Set the product in Select2
            $('#saleProduct').val(sale.product_id).trigger('change');

            // Set other form values
            $('#saleId').val(sale.id);
            $('#saleQuantity').val(sale.quantity);
            $('#saleUnitPrice').val(sale.unit_price);
            $('#saleUnitType').val(sale.unit_type);
            $('#saleTotalAmount').val(sale.total_amount);
            $('#saleDate').val(sale.sale_date);
            $('#saleNotes').val(sale.notes || '');

            // Update the quantity label to show pieces per box
            this.updateQuantityLabel();

        } catch (error) {
            console.error('Error loading sale:', error);
            showToast('Failed to load sale details', 'error');
        }
    }

    async saveSale() {
        try {
            const saleId = $('#saleId').val();
            const customerId = $('#saleCustomer').val();
            const productId = $('#saleProduct').val();
            const unitType = $('#saleUnitType').val();
            const quantity = parseInt($('#saleQuantity').val());
            const unitPrice = parseFloat($('#saleUnitPrice').val());
            const totalAmount = parseFloat($('#saleTotalAmount').val());
            const saleDate = $('#saleDate').val();
            const notes = $('#saleNotes').val();

            // Calculate actual quantity in pieces for storage
            const selectedProduct = $('#saleProduct').find('option:selected');
            const piecesPerBox = selectedProduct.data('pieces_per_box') || 1;
            const actualQuantity = unitType === 'BOX' ? quantity * piecesPerBox : quantity;

            const saleData = {
                customer_id: customerId,
                product_id: productId,
                quantity: actualQuantity,
                unit_type: unitType,
                unit_price: unitPrice,
                total_amount: totalAmount,
                sale_date: saleDate,
                notes: notes,
                updated_at: new Date(),
                updated_by: this.currentUser.id
            };

            let error;
            if (saleId) {
                // Update existing sale
                ({ error } = await supabase
                    .from('sales')
                    .update(saleData)
                    .eq('id', saleId));
            } else {
                // Insert new sale
                saleData.created_by = this.currentUser.id;
                ({ error } = await supabase
                    .from('sales')
                    .insert(saleData));
            }

            if (error) throw error;

            showToast(saleId ? 'Sale updated successfully' : 'Sale created successfully', 'success');
            window.location.hash = 'sales-list';
        } catch (error) {
            console.error('Error saving sale:', error);
            showToast('Failed to save sale', 'error');
        }
    }

    async initializeCustomerSales() {
        console.log('Initializing Customer Sales');
        try {
            const customerId = window.location.hash.split('/')[1];

            // Get customer details
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('name')
                .eq('id', customerId)
                .single();

            if (customerError) throw customerError;

            // Set customer name in header
            $('#customerName').text(customer.name);

            // Get customer sales
            const { data: sales, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    products (
                        name
                    )
                `)
                .eq('customer_id', customerId)
                .order('sale_date', { ascending: false });

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }

            this.table = $('#customerSalesTable').DataTable({
                data: sales,
                columns: [
                    { data: 'products.name' },
                    {
                        data: 'quantity',
                        className: 'text-end'
                    },
                    {
                        data: 'unit_type',
                        render: (data) => data === 'BOX' ? 'Box' : 'Piece'
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
                        data: 'sale_date',
                        render: (data) => new Date(data).toLocaleDateString()
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => `
                            <div class="btn-group">
                                <a href="#add-sale/${row.id}" class="btn btn-sm btn-link text-primary" data-bs-toggle="tooltip" data-bs-title="Edit Sale">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <button class="btn btn-sm btn-link text-danger delete-sale" data-id="${row.id}" data-bs-toggle="tooltip" data-bs-title="Delete Sale">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        `
                    }
                ],
                drawCallback: function () {
                    // Reinitialize tooltips after table redraw
                    $('[data-bs-toggle="tooltip"]').tooltip();
                }
            });

            // Add tooltip event listeners for customer sales table
            $('#customerSalesTable').on('draw.dt', () => {
                $('[data-bs-toggle="tooltip"]').tooltip();
            });

            $('#customerSalesTable').on('preDrawCallback.dt', () => {
                $('[data-bs-toggle="tooltip"]').tooltip('dispose');
            });
        } catch (error) {
            console.error('Error initializing customer sales:', error);
            showToast('Error loading customer sales data', 'error');
        }
    }
}

// Create and export a singleton instance
export default new SaleManager();
