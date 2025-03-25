import { supabase } from './supabase.js';
import { showToast } from './utils.js';

/**
 * Product Management System Updates - Version 1.2.0
 * Last Updated: [Current Date]
 * 
 * CHANGES:
 * ========
 * 1. User Interface Improvements
 *    - Reorganized form layout for better user experience
 *    - Grouped related fields:
 *      * Category and Type selectors in single row
 *      * Financial and inventory controls (Price, Stock, Min Stock) consolidated
 * 
 * 2. Quick Supplier Addition Feature
 *    - Added modal dialog for rapid supplier creation
 *    - Implemented real-time supplier list updates
 *    - Auto-selection of newly created suppliers
 * 
 * 3. Form Validation Enhancements
 *    - Added validation for quick supplier addition
 *    - Improved feedback for required fields
 * 
 * 4. Technical Improvements
 *    - Optimized Select2 initialization
 *    - Enhanced modal handling
 *    - Improved error handling and user feedback
 * 
 * USAGE:
 * ======
 * Quick Add Supplier:
 * 1. Click '+' button next to supplier dropdown
 * 2. Enter company name in modal
 * 3. Submit to create supplier and auto-select
 * 
 * Form Layout:
 * - Top row: Category and Type selection
 * - Middle row: Price, Stock Count, and Minimum Stock
 * - Bottom: Description field
 * 
 * @class ProductManager
 * @requires bootstrap 5.x
 * @requires select2 4.x
 * @requires supabase-js
 */

class ProductManager {
    static instance = null;

    constructor() {
        if (ProductManager.instance) {
            return ProductManager.instance;
        }
        ProductManager.instance = this;

        this.table = null;
        this.productId = null;
        this.quickAddModal = null;
    }

    async initializeList() {
        console.log('Initializing ProductManager List');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        await this.initializeDataTable();
        this.setupListEventListeners();
    }

    async initializeForm() {
        console.log('Initializing ProductManager Form');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        // Initialize the modal
        this.quickAddModal = new bootstrap.Modal(document.getElementById('quickAddSupplierModal'));

        await this.loadSuppliers();
        this.setupSupplierEventListener();
        this.setupQuickAddSupplierListener();
        this.setupFormEventListeners();

        if (window.location.hash.includes('/')) {
            await this.loadCategories();
            await this.checkForEdit();
        }
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
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    *,
                    categories (
                        name
                    ),
                    suppliers (
                        company_name
                    )
                `);

            if (error) throw error;

            // Define type configurations
            const typeConfig = {
                'SELLABLE': {
                    badge: 'bg-success',
                    icon: 'bi-tag',
                    label: 'Sellable'
                },
                'CONSUMABLE': {
                    badge: 'bg-warning',
                    icon: 'bi-box-seam',
                    label: 'Consumable'
                },
                'FIXTURE': {
                    badge: 'bg-info',
                    icon: 'bi-building-gear',
                    label: 'Fixture'
                }
            };

            // Calculate type counts
            const typeCounts = products.reduce((acc, product) => {
                acc[product.type] = (acc[product.type] || 0) + 1;
                return acc;
            }, {});

            // Calculate total count
            const totalCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

            // Add stock status indicator
            products.forEach(product => {
                product.stock_status = product.stock_quantity <= product.min_stock ? 'Low' : 'OK';
            });

            this.table = $('#productsTable').DataTable({
                data: products,
                responsive: {
                    details: {
                        type: 'column',
                        target: 'tr',
                        renderer: function (api, rowIdx, columns) {
                            const data = columns.reduce((acc, col) => {
                                if (col.hidden) {
                                    acc += `
                                        <tr>
                                            <td class="fw-bold">${col.title}:</td>
                                            <td>${col.data}</td>
                                        </tr>`;
                                }
                                return acc;
                            }, '');

                            return data ?
                                `<table class="table table-sm table-borderless m-0">${data}</table>` :
                                false;
                        }
                    }
                },
                columns: [
                    {
                        data: 'id',
                        visible: false
                    },
                    {
                        data: 'categories.name',
                        className: 'min-sm',
                        width: '15%'
                    },
                    {
                        data: 'name',
                        className: 'all',
                        width: '25%',
                        render: function (data, type, row) {
                            if (type === 'display') {
                                const category = row.categories?.name ?
                                    `<small class="text-muted d-block d-sm-none">${row.categories.name}</small>` : '';
                                return `${data}${category}`;
                            }
                            return data;
                        }
                    },

                    {
                        data: 'type',
                        className: 'min-md',
                        width: '12%',
                        render: (data) => {
                            const config = typeConfig[data];
                            return `
                                <span class="badge ${config.badge}">
                                    <i class="bi ${config.icon} me-1"></i>
                                    ${config.label}
                                </span>
                            `;
                        }
                    },
                    {
                        data: 'description',
                        className: 'min-lg',
                        width: '20%',
                        render: function (data, type, row) {
                            if (type === 'display' && data) {
                                return data.length > 50 ?
                                    `<span title="${data}">${data.substring(0, 50)}...</span>` :
                                    data;
                            }
                            return data || 'No description';
                        }
                    },
                    {
                        data: 'unit_price',
                        className: 'all text-end',
                        width: '10%',
                        render: (data) => `$${parseFloat(data).toFixed(2)}`
                    },
                    {
                        data: 'stock_quantity',
                        className: 'min-md text-center',
                        width: '8%',
                        render: function (data, type, row) {
                            const stockClass = data <= row.min_stock ? 'text-danger' : 'text-success';
                            return `<span class="${stockClass}">${data}</span>`;
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'all text-end',
                        width: '10%',
                        render: (data, type, row) => `
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-primary edit-btn" data-id="${row.id}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger delete-btn" data-id="${row.id}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        `
                    }
                ],
                order: [[1, 'asc']], // Sort by name by default
                pageLength: 25,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                    '<"row"<"col-sm-12"tr>>' +
                    '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                language: {
                    search: "",
                    searchPlaceholder: "Search products..."
                },
                scrollX: true,
                scrollY: true,
                fixedHeader: true
            });

            console.log('DataTable initialized');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
        }
    }

    setupListEventListeners() {
        $('#productsTable').on('click', '.delete-btn', async (e) => {
            const id = $(e.target).closest('button').data('id');
            if (confirm('Are you sure you want to delete this product?')) {
                await this.deleteProduct(id);
            }
        });

        // Fix hash format to be 'add-product'
        $('#productsTable').on('click', '.edit-btn', (e) => {
            const id = $(e.target).closest('button').data('id');
            window.location.hash = `add-product/${id}`;
        });
    }

    setupFormEventListeners() {
        const form = document.getElementById('productForm');
        if (form) {
            // Convert text to uppercase while typing
            const textInputs = ['productName', 'productDescription'];
            textInputs.forEach(inputId => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.addEventListener('input', (e) => {
                        const start = e.target.selectionStart;
                        const end = e.target.selectionEnd;
                        e.target.value = e.target.value.toUpperCase();
                        // Restore cursor position
                        e.target.setSelectionRange(start, end);
                    });
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProduct();
            });
        }
    }

    setupSupplierEventListener() {
        $('#productSupplier').on('change', async (e) => {
            const supplierId = e.target.value;
            if (supplierId) {
                await this.loadCategories();
                $('#productFields').slideDown();
            } else {
                $('#productFields').slideUp();
                // Clear all fields when supplier is deselected
                $('#productForm')[0].reset();
                $('#productCategory').val('').trigger('change');
            }
        });
    }

    setupQuickAddSupplierListener() {
        // Handle quick add button click
        document.getElementById('quickAddSupplierBtn').addEventListener('click', async () => {
            const form = document.getElementById('quickAddSupplierForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            const companyName = document.getElementById('quickSupplierName').value.trim();
            await this.quickAddSupplier(companyName);
        });

        // Reset form when modal is hidden
        document.getElementById('quickAddSupplierModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('quickAddSupplierForm').reset();
            document.getElementById('quickAddSupplierForm').classList.remove('was-validated');
        });
    }

    async checkForEdit() {
        const path = window.location.hash.split('/');
        if (path.length > 1) {
            this.productId = path[1];
            document.getElementById('formTitle').textContent = 'Edit Product';
            document.getElementById('breadcrumbAction').textContent = 'Edit';
            // Remove readonly attribute for edit mode
            document.getElementById('productStock').removeAttribute('readonly');
            await this.loadProduct();
        }
    }

    async loadCategories() {
        try {
            const { data: categories, error } = await supabase
                .from('categories')
                .select('id, name');

            if (error) throw error;

            const categorySelect = $('#productCategory');
            categorySelect.empty().append('<option value="">Select Category</option>');

            categories.forEach(category => {
                categorySelect.append(new Option(category.name, category.id));
            });

            categorySelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Category',
                width: '100%'
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadSuppliers() {
        try {
            const { data: suppliers, error } = await supabase
                .from('suppliers')
                .select('id, company_name')
                .order('company_name');

            if (error) throw error;

            const supplierSelect = $('#productSupplier');
            supplierSelect.empty().append('<option value="">Select Supplier</option>');

            suppliers.forEach(supplier => {
                supplierSelect.append(new Option(supplier.company_name, supplier.id));
            });

            // Reinitialize Select2
            supplierSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Supplier',
                width: '80%'
            });

            // Fix the Select2 container width when used in input-group
            supplierSelect.on('select2:open', () => {
                document.querySelector('.select2-container--open').style.width = 'auto';
            });
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    }

    async loadProduct() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    categories (
                        id,
                        name
                    ),
                    suppliers (
                        id,
                        company_name
                    )
                `)
                .eq('id', this.productId)
                .single();

            if (error) throw error;

            if (data) {
                // Show the fields container first
                $('#productFields').show();

                // First set the supplier and wait for categories to load
                await $('#productSupplier').val(data.supplier_id).trigger('change');

                // Wait for categories to be loaded
                await this.loadCategories();

                // Then populate all other fields
                document.getElementById('productName').value = data.name.toUpperCase();
                document.getElementById('productDescription').value = (data.description || '').toUpperCase();
                document.getElementById('productPrice').value = data.unit_price;
                document.getElementById('productStock').value = data.stock_quantity;
                document.getElementById('productMinStock').value = data.min_stock;
                document.getElementById('productType').value = data.type;

                // Now set the category
                $('#productCategory').val(data.category_id).trigger('change');
            }
        } catch (error) {
            console.error('Error loading product:', error);
            showToast('Failed to load product', 'error');
        }
    }

    async saveProduct() {
        try {
            const supplierId = document.getElementById('productSupplier').value;
            const categoryId = document.getElementById('productCategory').value;

            // Validate required fields
            if (!supplierId) {
                alert('Please select a supplier');
                return;
            }

            if (!categoryId) {
                alert('Please select a category');
                return;
            }

            const productData = {
                name: document.getElementById('productName').value.toUpperCase(),
                category_id: categoryId,
                supplier_id: supplierId,
                type: document.getElementById('productType').value,
                description: document.getElementById('productDescription').value?.toUpperCase() || '',
                unit_price: parseFloat(document.getElementById('productPrice').value) || 0,
                stock_quantity: parseInt(document.getElementById('productStock').value) || 0,
                min_stock: parseInt(document.getElementById('productMinStock').value) || 1
            };

            // Get productId from class property
            if (this.productId) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', this.productId);

                if (error) {
                    console.error('Update error:', error);
                    throw error;
                }
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) {
                    console.error('Insert error:', error);
                    throw error;
                }
            }

            window.location.hash = 'products-list';
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product: ' + error.message);
        }
    }

    async deleteProduct(id) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }
            await this.initializeDataTable();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product');
        }
    }

    async quickAddSupplier(companyName) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .insert([{ company_name: companyName }])
                .select()
                .single();

            if (error) throw error;

            // Close the modal
            this.quickAddModal.hide();

            // Reload suppliers and select the new one
            await this.loadSuppliers();
            $('#productSupplier').val(data.id).trigger('change');

            // Show success message
            alert('Supplier added successfully');
        } catch (error) {
            console.error('Error adding supplier:', error);
            alert('Failed to add supplier');
        }
    }
}

// Create a single instance
const productManager = new ProductManager();
export default productManager;
