import { supabase } from './supabase.js';

class SupplierManager {
    static instance = null;

    constructor() {
        if (SupplierManager.instance) {
            return SupplierManager.instance;
        }
        SupplierManager.instance = this;

        this.table = null;
        this.supplierId = null;
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
                    { data: 'city' },
                    { data: 'country' },
                    {
                        data: 'created_at',
                        render: (data) => new Date(data).toLocaleDateString()
                    },
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
                document.getElementById('contactPerson').value = supplier.contact_person;
                document.getElementById('email').value = supplier.email;
                document.getElementById('phone').value = supplier.phone;
                document.getElementById('address').value = supplier.address;
                document.getElementById('city').value = supplier.city;
                document.getElementById('state').value = supplier.state;
                document.getElementById('postalCode').value = supplier.postal_code;
                document.getElementById('country').value = supplier.country;
            }
        } catch (error) {
            console.error('Error loading supplier:', error);
            alert('Failed to load supplier');
        }
    }

    async saveSupplier() {
        try {
            const formData = {
                company_name: document.getElementById('companyName').value,
                contact_person: document.getElementById('contactPerson').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                postal_code: document.getElementById('postalCode').value,
                country: document.getElementById('country').value
            };

            let error;

            if (this.supplierId) {
                // Update existing supplier
                ({ error } = await supabase
                    .from('suppliers')
                    .update(formData)
                    .eq('id', this.supplierId));
            } else {
                // Insert new supplier
                ({ error } = await supabase
                    .from('suppliers')
                    .insert([formData]));
            }

            if (error) throw error;

            window.location.hash = 'suppliers-list';
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Failed to save supplier');
        }
    }

    async deleteSupplier(id) {
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }
            await this.initializeDataTable();
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert('Failed to delete supplier');
        }
    }
}

// Create a single instance
const supplierManager = new SupplierManager();
export default supplierManager;