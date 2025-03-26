# Inventory Management System with Supabase

A modern web-based inventory management system built with Supabase as the backend. This project demonstrates how to create a full-featured inventory system using Supabase's powerful features including authentication, real-time database, and storage capabilities.

## Recent Updates

### Enhanced Product Management Interface
- **Quick Supplier Addition**: Added ability to create new suppliers directly from the product form
  - Quick add button next to supplier selection
  - Modal dialog for rapid supplier creation
  - Automatic supplier list refresh and selection
- **Improved Form Layout**:
  - Reorganized product form for better usability
  - Category and Type selections grouped in one row
  - Financial and stock controls (Price, Stock Count, Min Stock) consolidated in one row
  - Responsive design maintained across all screen sizes

## Developed With

### ![VS Code](assets/images/vscode.svg) Visual Studio Code
Industry-standard code editor providing a robust development environment with extensive plugin support and integrated Git functionality.

### ![Augment](assets/images/augment.svg) Augment
AI-powered code assistant that enhances developer productivity through intelligent code suggestions, documentation, and real-time assistance. Augment helps streamline development workflows and improve code quality.

### ![GitHub](assets/images/github.svg) GitHub
Version control platform used for source code management, collaboration, and project hosting.

## Screenshots

![Login Page](screenshots/login.png)
![Dashboard](screenshots/dashboard.png)
![Products List](screenshots/products.png)
![Purchases](screenshots/purchase.png)
![Returns List](screenshots/returns.png)
![Profile ](screenshots/profile.png)

## Database Setup

### 1. SQL Tables
Execute the following SQL in your Supabase SQL editor (`db/schema.sql`):
```sql
-- Create tables for inventory management system
-- Copy the entire content from db/schema.sql
```

### 2. Storage Setup
1. Create a new bucket named `inventory-avatar` with the following settings:
   - Public bucket: No
   - File size limit: 5MB
   - Allowed mime types: image/*

### 3. Storage Policies
For the `inventory-avatar` bucket, add these policies:

```sql
CREATE POLICY "Allow authenticated users to select from inventory-avatar bucket" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'inventory-avatar');

CREATE POLICY "Allow authenticated users to insert into inventory-avatar bucket" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'inventory-avatar');

CREATE POLICY "Allow authenticated users to update inventory-avatar bucket" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'inventory-avatar') 
WITH CHECK (bucket_id = 'inventory-avatar');

CREATE POLICY "Allow authenticated users to delete from inventory-avatar bucket" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'inventory-avatar');
```

### 4. Database Policies

```sql
CREATE POLICY "Allow authenticated users to select" ON public.categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.categories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.categories
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.customers
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.products
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.purchase_returns
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.purchase_returns
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.purchase_returns
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.purchase_returns
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.purchases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.purchases
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.purchases
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.sales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.sales
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.stock_movements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.stock_movements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.stock_movements
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to select" ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.suppliers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete" ON public.suppliers
FOR DELETE
TO authenticated
USING (true);
```

## Authentication Setup

### 1. Create Test User in Supabase
1. Navigate to your Supabase project dashboard
2. Go to Authentication > Users
3. Click "Add User"
4. Fill in the following details:
   - Email: `test@example.com`
   - Password: `test123456`
   - (Optional) Check "Auto-confirm user" to skip email verification

### 2. Login Credentials
Use these credentials to test the system:
```bash
Email: test@example.com
Password: test123456
```

Note: For production use, create secure credentials and enable proper email verification.

### 3. Authentication Features
- Email/Password login
- Magic link authentication (passwordless)
- User session management
- Protected routes
- Profile management

## About

This system provides a complete solution for managing inventory, featuring:
- Secure user authentication through Supabase Auth
- Real-time data synchronization using Supabase's Postgres database
- File storage for user avatars using Supabase Storage
- Modern, responsive UI built with Bootstrap 5

## Setup

1. Clone the repository:
```bash
git clone https://github.com/drascom/inventory-system-supabase.git
```

2. Copy `assets/js/config.example.js` to `assets/js/config.js` and update with your Supabase credentials:
```bash
cp assets/js/config.example.js assets/js/config.js
```

3. Open `index.html` in your web browser or use a local server (like Live Server in VS Code)

## Features

- **User Authentication** (v1.0.0)
  - Email/Password login
  - Magic link authentication (passwordless)
  - Basic profile management
  - Avatar upload and management
  - Session management (v1.2.0)
    - Session persistence with auto-refresh
    - Remember me functionality
    - Enhanced security flows

- **Inventory Management**
  - Product Management (v1.0.0)
    - Basic product CRUD operations
    - Stock level tracking
    - Product categorization
    - Product type classification (Sellable, Consumable, Fixture)
    - Product images
    - Enhanced interface (v1.3.0)
      - Quick Supplier Addition
      - Improved form layout
      - Consolidated financial controls
  - Category Management (v1.0.0)
    - Basic category CRUD operations
    - Product-category associations

- **Business Operations**
  - Sales Management (v1.0.0)
    - Basic sales entry
    - Stock reduction on sale
    - Sales history tracking
  - Purchase Management
    - Basic purchase entry (v1.0.0)
    - Stock addition on purchase
    - Bulk Purchase Management (v1.3.0)
      - Multi-product purchase entry
      - Automatic total calculations
      - Supplier-specific filtering
    - Returns System (v1.3.0)
      - Complete returns workflow
      - Status tracking (SENT, CONFIRMED)
      - Automated stock adjustments
  - Supplier Management (v1.0.0)
    - Supplier CRUD operations
    - Basic supplier details
  - Customer Management (v1.0.0)
    - Customer CRUD operations
    - Basic customer information
  - Stock Movement Tracking (v1.2.0)
    - Automatic stock updates
    - Movement history logging
    - Movement types (Purchase, Sale, Return)
    - Reference type validation

- **UI Features**
  - Bootstrap 5 responsive design (v1.0.0)
  - Enhanced UI Components (v1.1.0)
    - DataTables integration with sorting and filtering
    - Select2 enhanced dropdowns
    - Toast notifications
    - Modal dialogs
    - Tooltips with auto-cleanup

- **Real-time Features** (v1.1.0)
  - Live data updates using Supabase subscriptions
  - Real-time stock level tracking
  - Instant UI updates on data changes

## Technologies Used

- **Frontend**
  - HTML5
  - CSS3 with Bootstrap 5
  - Vanilla JavaScript
  - DataTables for data display
  - Select2 for enhanced dropdowns

- **Backend (Supabase)**
  - Supabase Auth for authentication
  - Supabase Database (Postgres) for data storage
  - Supabase Storage for file uploads
  - Real-time subscriptions

## Database Schema

The system uses a comprehensive database schema including tables for:
- Products
- Categories
- Suppliers
- Customers
- Stock Movements
- User Profiles

## Contributing

Feel free to fork this repository and submit pull requests. You can also open issues for any bugs or feature requests.

## License

MIT License - feel free to use this project for learning or business purposes.

## Version History

### Version 1.4.0 (Current)
**Released:** 2025-03-26
- Enhanced UI Responsiveness
  - Improved tooltip management
  - Optimized table rendering
  - Better mobile compatibility
- Session Management Improvements
  - Enhanced token refresh mechanism
  - More reliable session persistence
  - Improved security checks
- Stock Movement Enhancements
  - Refined movement validation
  - Better error handling
  - Improved movement history display

### Version 1.3.0
**Released:** 2025-03-20
- Enhanced Product Management Interface
  - Quick Supplier Addition feature
  - Improved form layout and organization
  - Consolidated financial controls
  - Better responsive design
- Bulk Purchase Management
  - Multi-product purchase entry
  - Automatic total calculations
  - Supplier-specific product filtering
- Purchase Returns System
  - Complete returns workflow
  - Status tracking
  - Automated stock adjustments

### Version 1.2.0
**Released:** 2025-03-15
- Stock Movement Tracking
  - Automated stock updates
  - Movement history
  - Reference type validation
- Enhanced Security
  - Improved authentication flows
  - Added storage policies
  - Updated database access controls

### Version 1.1.0
**Released:** 2025-03-10
- User Interface Improvements
  - Responsive design implementation
  - DataTables integration
  - Select2 for enhanced dropdowns
- Database Optimizations
  - Added performance indexes
  - Implemented triggers for timestamps
  - Stock movement automation

### Version 1.0.0
**Released:** 2025-03-01
- Initial Release
  - Basic inventory management
  - User authentication
  - Product CRUD operations
  - Simple purchase and sales tracking
  - Basic reporting

## Upcoming Features (Planned)
- Advanced reporting and analytics
- Barcode scanning support
- Multi-warehouse management
- Mobile app integration
- API documentation
- Batch operations for stock adjustments
