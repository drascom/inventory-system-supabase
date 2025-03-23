import { supabase } from './supabase.js';

class ProductManager {
    static instance = null;

    constructor() {
        if (ProductManager.instance) {
            return ProductManager.instance;
        }
        ProductManager.instance = this;

        this.table = null;
        this.productId = null;
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

        this.setupFormEventListeners();
        await this.loadCategories(); // Additional step for products
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
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    *,
                    categories (
                        name
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
                        display: $.fn.dataTable.Responsive.display.modal({
                            header: function (row) {
                                return 'Details for ' + row.data().name;
                            }
                        }),
                        renderer: $.fn.dataTable.Responsive.renderer.tableAll({
                            tableClass: 'table'
                        })
                    }
                },
                columns: [
                    { data: 'id', visible: false },
                    { data: 'name' },
                    { data: 'categories.name' },
                    {
                        data: 'type',
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
                        responsivePriority: 3
                    },
                    {
                        data: 'unit_price',
                        render: (data) => `$${parseFloat(data).toFixed(2)}`,
                        responsivePriority: 2
                    },
                    {
                        data: null,
                        render: function (data) {
                            const stockClass = data.stock_quantity <= data.min_stock ? 'text-danger' : 'text-success';
                            return `<span class="${stockClass}">${data.stock_quantity}</span> (min: ${data.min_stock})`;
                        },
                        responsivePriority: 1
                    },
                    {
                        data: 'created_at',
                        render: (data) => new Date(data).toLocaleDateString(),
                        responsivePriority: 4
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        responsivePriority: 1,
                        render: (data, type, row) => `
                            <div class="btn-group" role="group">
                                <a href="#add-product/${row.id}" class="btn btn-sm btn-outline-primary" title="Edit">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${row.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary stock-history-btn" data-id="${row.id}" title="Stock History">
                                    <i class="bi bi-clock-history"></i>
                                </button>
                            </div>
                        `
                    }
                ],
                dom: '<"row"<"col-md-6"l><"col-md-6"f>>' +
                    '<"row"<"col-md-12"tr>>' +
                    '<"row"<"col-md-5"i><"col-md-7"p>>',
                initComplete: function () {
                    const filterContainer = $('.filter-buttons-container');
                    filterContainer.addClass('d-flex justify-content-center');

                    const filterButtonsHtml = `
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary btn-sm active" data-type="">
                                All <span class="badge bg-secondary ms-1">${totalCount}</span>
                            </button>
                            ${Object.entries(typeConfig).map(([type, config]) => `
                                <button type="button" class="btn btn-outline-secondary btn-sm" data-type="${type}">
                                    <i class="bi ${config.icon} me-1"></i>
                                    ${config.label} <span class="badge bg-secondary ms-1">${typeCounts[type] || 0}</span>
                                </button>
                            `).join('')}
                        </div>
                    `;

                    filterContainer.html(filterButtonsHtml);

                    filterContainer.find('button').on('click', (e) => {
                        const button = $(e.currentTarget);
                        filterContainer.find('button').removeClass('active');
                        button.addClass('active');

                        const type = button.data('type');
                        this.api()
                            .column(3)
                            .search(type || '', true, false)
                            .draw();
                    });
                }
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
    }

    setupFormEventListeners() {
        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProduct();
            });
        }
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

    async loadProduct() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    categories (
                        id,
                        name
                    )
                `)
                .eq('id', this.productId)
                .single();

            if (error) throw error;

            // Populate form with data
            document.getElementById('productId').value = data.id;
            document.getElementById('productName').value = data.name;
            document.getElementById('productType').value = data.type;
            $('#productCategory').val(data.category_id).trigger('change');
            document.getElementById('productDescription').value = data.description || '';
            document.getElementById('productPrice').value = data.unit_price;
            document.getElementById('productStock').value = data.stock_quantity;
            document.getElementById('productMinStock').value = data.min_stock || 0;
        } catch (error) {
            console.error('Error loading product:', error);
            alert('Failed to load product details');
        }
    }

    async saveProduct() {
        try {
            const productData = {
                name: document.getElementById('productName').value,
                category_id: document.getElementById('productCategory').value,
                type: document.getElementById('productType').value,
                description: document.getElementById('productDescription').value,
                unit_price: parseFloat(document.getElementById('productPrice').value),
                stock_quantity: parseInt(document.getElementById('productStock').value),
                min_stock: parseInt(document.getElementById('productMinStock').value)
            };

            let error;
            const productId = document.getElementById('productId').value;

            if (productId) {
                // Update existing product
                ({ error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', productId));
            } else {
                // Insert new product
                ({ error } = await supabase
                    .from('products')
                    .insert([productData]));
            }

            if (error) throw error;

            window.location.hash = 'products-list';
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product');
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
}

// Create a single instance
const productManager = new ProductManager();
export default productManager;
