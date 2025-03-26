import { supabase } from './supabase.js';
import { showToast } from './utils.js';

class CustomerManager {
    static instance = null;

    constructor() {
        if (CustomerManager.instance) {
            return CustomerManager.instance;
        }
        CustomerManager.instance = this;

        this.table = null;
        this.customerId = null;
    }

    async initializeList() {
        console.log('Initializing CustomerManager List');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        await this.initializeDataTable();
        this.setupListEventListeners();
    }

    async initializeForm() {
        console.log('Initializing CustomerManager Form');
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
        try {
            const { data: customers, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }

            this.table = $('#customersTable').DataTable({
                data: customers,
                columns: [
                    { data: 'name' },
                    { data: 'email' },
                    { data: 'phone' },
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
                                <a href="#customer-sales/${row.id}" class="btn btn-sm btn-link text-info" data-bs-toggle="tooltip" data-bs-title="View Customer Sales">
                                    <i class="bi bi-list-ul"></i>
                                </a>
                                <a href="#add-customer/${row.id}" class="btn btn-sm btn-link text-primary" data-bs-toggle="tooltip" data-bs-title="Edit Customer">
                                    <i class="bi bi-pencil-square"></i>
                                </a>
                                <button class="btn btn-sm btn-link text-danger delete-btn" data-id="${row.id}" data-bs-toggle="tooltip" data-bs-title="Delete Customer">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        `
                    }
                ]
            });

            console.log('DataTable initialized');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
        }
    }

    setupListEventListeners() {
        // Initialize tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();
        $('#customersTable').on('click', '.delete-btn', async (e) => {
            const id = $(e.target).closest('button').data('id');
            if (confirm('Are you sure you want to delete this customer?')) {
                await this.deleteCustomer(id);
            }
        });
    }

    setupFormEventListeners() {
        const form = document.getElementById('customerForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCustomer();
            });
        }
    }

    async checkForEdit() {
        const path = window.location.hash.split('/');
        if (path.length > 1) {
            this.customerId = path[1];
            document.getElementById('formTitle').textContent = 'Edit Customer';
            document.getElementById('breadcrumbAction').textContent = 'Edit';
            await this.loadCustomer();
        }
    }

    async loadCustomer() {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', this.customerId)
                .single();

            if (error) throw error;

            document.getElementById('customerId').value = data.id;
            document.getElementById('customerName').value = data.name;
            document.getElementById('customerEmail').value = data.email || '';
            document.getElementById('customerPhone').value = data.phone || '';
        } catch (error) {
            console.error('Error loading customer:', error);
            alert('Failed to load customer details');
        }
    }

    async saveCustomer() {
        try {
            const customerData = {
                name: document.getElementById('customerName').value,
                email: document.getElementById('customerEmail').value,
                phone: document.getElementById('customerPhone').value
            };

            let error;
            const customerId = document.getElementById('customerId').value;

            if (customerId) {
                // Update existing customer
                ({ error } = await supabase
                    .from('customers')
                    .update(customerData)
                    .eq('id', customerId));
            } else {
                // Insert new customer
                ({ error } = await supabase
                    .from('customers')
                    .insert([customerData]));
            }

            if (error) throw error;

            window.location.hash = 'customers-list';
            showToast('Customer saved successfully', 'success');
        } catch (error) {
            console.error('Error saving customer:', error);
            showToast('Failed to save customer', 'error');
        }
    }

    async deleteCustomer(id) {
        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }
            await this.initializeDataTable();
            showToast('Customer deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting customer:', error);
            showToast('Failed to delete customer', 'error');
        }
    }
}

// Create a single instance
const customerManager = new CustomerManager();
export default customerManager;
