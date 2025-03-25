import { supabase } from './supabase.js';
import { showToast } from './utils.js';

class SupplierManager {
    static instance = null;

    constructor() {
        if (SupplierManager.instance) {
            return SupplierManager.instance;
        }
        SupplierManager.instance = this;

        this.table = null;
        this.supplierId = null;
        this.europeanCountries = [
            'United Kingdom', 'Turkiye', 'Germany', 'France', 'Italy', 'Spain',
            'Poland', 'Romania', 'Netherlands', 'Belgium', 'Greece',
            'Czech Republic', 'Portugal', 'Sweden', 'Hungary', 'Austria',
            'Switzerland', 'Bulgaria', 'Denmark', 'Finland', 'Slovakia',
            'Norway', 'Ireland', 'Croatia', 'Moldova', 'Albania',
            'Lithuania', 'Slovenia', 'Latvia', 'Estonia', 'Luxembourg',
            'Montenegro', 'Malta', 'Iceland'
        ];
    }

    async initializeList() {
        console.log('Initializing SupplierManager List');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        await this.initializeDataTable();
        this.setupListEventListeners();
    }

    async initializeForm() {
        console.log('Initializing SupplierManager Form');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        this.initializeCountrySelect();
        this.setupFormEventListeners();
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
            const { data: suppliers, error } = await supabase
                .from('suppliers')
                .select('*');

            if (error) throw error;

            console.log('Suppliers fetched:', suppliers);

            this.table = $('#suppliersTable').DataTable({
                data: suppliers,
                columns: [
                    {
                        data: 'id',
                        visible: false
                    },
                    { data: 'company_name' },
                    { data: 'contact_person' },
                    { data: 'email' },
                    { data: 'phone' },
                    { data: 'postal_code' },
                    { data: 'country' },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => `
                            <a href="#add-supplier/${row.id}" class="btn btn-sm btn-link text-primary">
                                <i class="bi bi-pencil-square"></i>
                            </a>
                            <button class="btn btn-sm btn-link text-danger delete-btn" data-id="${row.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        `
                    }
                ],
                responsive: true
            });

            console.log('DataTable initialized');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
        }
    }

    setupListEventListeners() {
        $('#suppliersTable').on('click', '.delete-btn', async (e) => {
            const id = $(e.target).closest('button').data('id');
            if (confirm('Are you sure you want to delete this supplier?')) {
                await this.deleteSupplier(id);
            }
        });
    }

    setupFormEventListeners() {
        const form = document.getElementById('supplierForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveSupplier();
            });
        }
    }

    async checkForEdit() {
        const hash = window.location.hash;
        if (hash.includes('add-supplier/')) {
            this.supplierId = hash.split('/')[1];
            document.getElementById('formTitle').textContent = 'Edit Supplier';
            await this.loadSupplier(this.supplierId);
        }
    }

    initializeCountrySelect() {
        const countrySelect = $('#country');
        countrySelect.empty();

        // Add default option
        countrySelect.append(new Option('Select Country', ''));

        // Add all European countries
        this.europeanCountries.forEach(country => {
            countrySelect.append(new Option(country, country));
        });

        // Initialize Select2
        countrySelect.select2({
            theme: 'bootstrap-5',
            placeholder: 'Select Country',
            width: '100%'
        });

        // Set default value to United Kingdom
        countrySelect.val('United Kingdom').trigger('change');
    }

    async loadSupplier(id) {
        try {
            const { data: supplier, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (supplier) {
                document.getElementById('companyName').value = supplier.company_name;
                document.getElementById('contactPerson').value = supplier.contact_person || '';
                document.getElementById('email').value = supplier.email || '';
                document.getElementById('phone').value = supplier.phone || '';
                document.getElementById('address').value = supplier.address || '';
                document.getElementById('postalCode').value = supplier.postal_code || '';
                $('#country').val(supplier.country || 'United Kingdom').trigger('change');
            }
        } catch (error) {
            console.error('Error loading supplier:', error);
            alert('Failed to load supplier');
        }
    }

    async saveSupplier() {
        try {
            const companyName = document.getElementById('companyName').value.trim();

            if (!companyName) {
                alert('Company name is required');
                return;
            }

            const formData = {
                company_name: companyName,
                contact_person: document.getElementById('contactPerson').value || null,
                email: document.getElementById('email').value || null,
                phone: document.getElementById('phone').value || null,
                address: document.getElementById('address').value || null,
                postal_code: document.getElementById('postalCode').value || null,
                country: $('#country').val() || 'United Kingdom'
            };

            let error;

            if (this.supplierId) {
                ({ error } = await supabase
                    .from('suppliers')
                    .update(formData)
                    .eq('id', this.supplierId));
            } else {
                ({ error } = await supabase
                    .from('suppliers')
                    .insert([formData]));
            }

            if (error) throw error;

            window.location.hash = 'suppliers-list';
            showToast('Supplier saved successfully', 'success');
        } catch (error) {
            console.error('Error saving supplier:', error);
            showToast('Failed to save supplier', 'error');
        }
    }

    async deleteSupplier(id) {
        try {
            // First check if supplier has any products
            const { data: products, error: checkError } = await supabase
                .from('products')
                .select('id, name')
                .eq('supplier_id', id);

            if (checkError) throw checkError;

            if (products && products.length > 0) {
                showToast('Cannot delete supplier: This supplier has associated products. Please reassign or delete the products first.', 'warning');
                return;
            }

            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }
            await this.initializeDataTable();
            showToast('Supplier deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting supplier:', error);
            showToast('Failed to delete supplier', 'error');
        }
    }
}

// Create a single instance
const supplierManager = new SupplierManager();
export default supplierManager;
