# Inventory Management System with Supabase

A modern web-based inventory management system built with Supabase as the backend. This project demonstrates how to create a full-featured inventory system using Supabase's powerful features including authentication, real-time database, and storage capabilities.


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

### 3. Database and Storage Policies
Execute the policies found in `db/policies.md` to set up:
- Storage bucket policies for `inventory-avatar`
- Table-level RLS (Row Level Security) policies for all database tables

### 4. Authentication Setup
1. Navigate to your Supabase project dashboard
2. Go to Authentication > Settings
3. Enable "Email" and "Password" sign-in methods
4. Set up email templates if needed

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

3. Set up database policies by executing the SQL statements from `db/policies.md` in your Supabase SQL editor:
   - Storage bucket policies for avatar uploads
   - Table-level RLS (Row Level Security) policies
   - Authentication policies

4. Server Setup:
   - All pages and functions except for the update functionality: Open `index.html` in your web browser or use a local server (like Live Server in VS Code)
   - For update functionality: Use a PHP server (e.g., Apache, XAMPP, or PHP's built-in server) as the auto-update feature requires PHP:
     ```bash
     php -S localhost:8000
     ```
   Note: The auto-update feature will not work when opening HTML files directly in the browser or using non-PHP servers.

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

### Version 1.4.3 (Latest)
**Released:** 2024-01-09
- Enhanced Purchase Management
  - Product selection now depends on supplier selection
  - Improved UX with "Select Supplier First" placeholder
  - Disabled product selection until supplier is chosen
  - Real-time product list updates based on supplier change
- Bug Fixes
  - Fixed product dropdown state management
  - Improved form validation flow
  - Better error handling for supplier-product relationships

### Version 1.4.2
**Released:** 2025-03-27
- Auto-Update System
  - Automatic updates from GitHub releases
  - Backup creation before updates
  - Version management
  - Progress tracking
  - Rollback capability
- Bug Fixes
  - Enhanced error handling
  - Improved update reliability
  - Better version compatibility checks

### Version 1.4.0
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
