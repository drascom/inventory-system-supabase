import { supabase } from './supabase.js';
import { showToast } from './utils.js';

class CategoryManager {
    static instance = null;

    constructor() {
        if (CategoryManager.instance) {
            return CategoryManager.instance;
        }
        CategoryManager.instance = this;

        this.table = null;
        this.categoryId = null;
    }

    async initializeList() {
        console.log('Initializing CategoryManager List');
        if (!this.checkDependencies()) {
            console.error('Dependencies not met');
            return;
        }

        await this.initializeDataTable();
        this.setupListEventListeners();
    }

    async initializeForm() {
        console.log('Initializing CategoryManager Form');
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
            const { data: categories, error } = await supabase
                .from('categories')
                .select('*');

            if (error) throw error;

            console.log('Categories fetched:', categories);

            this.table = $('#categoriesTable').DataTable({
                data: categories,
                columns: [
                    {
                        data: 'id',
                        visible: false
                    },
                    { data: 'name' },
                    { data: 'description' },
                    {
                        data: 'created_at',
                        render: (data) => new Date(data).toLocaleDateString()
                    },
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => `
                            <a href="#add-category/${row.id}" class="btn btn-sm btn-link text-primary">
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
        $('#categoriesTable').on('click', '.delete-btn', async (e) => {
            const id = $(e.target).closest('button').data('id');
            if (confirm('Are you sure you want to delete this category?')) {
                await this.deleteCategory(id);
            }
        });
    }

    setupFormEventListeners() {
        const form = document.getElementById('categoryForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCategory();
            });
        }
    }

    async checkForEdit() {
        const path = window.location.hash.split('/');
        if (path.length > 1) {
            this.categoryId = path[1];
            document.getElementById('formTitle').textContent = 'Edit Category';
            document.getElementById('breadcrumbAction').textContent = 'Edit';
            await this.loadCategory();
        }
    }

    async loadCategory() {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select()
                .eq('id', this.categoryId)
                .single();

            if (error) throw error;

            document.getElementById('categoryId').value = data.id;
            document.getElementById('categoryName').value = data.name;
            document.getElementById('categoryDescription').value = data.description || '';
        } catch (error) {
            console.error('Error loading category:', error);
            alert('Failed to load category details');
        }
    }

    async saveCategory() {
        try {
            const categoryData = {
                name: document.getElementById('categoryName').value,
                description: document.getElementById('categoryDescription').value
            };

            let error;
            const categoryId = document.getElementById('categoryId').value;

            if (categoryId) {
                // Update existing category
                ({ error } = await supabase
                    .from('categories')
                    .update(categoryData)
                    .eq('id', categoryId));
            } else {
                // Insert new category
                ({ error } = await supabase
                    .from('categories')
                    .insert([categoryData]));
            }

            if (error) throw error;

            // Redirect without showing success alert
            window.location.hash = 'categories-list';
            showToast('Category saved successfully', 'success');
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Failed to save category', 'error');
        }
    }

    async deleteCategory(id) {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (this.table) {
                this.table.destroy();
            }
            await this.initializeDataTable();
            showToast('Category deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category', 'error');
        }
    }
}

// Create a single instance
const categoryManager = new CategoryManager();
export default categoryManager;
