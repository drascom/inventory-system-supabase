# Inventory Management System with Supabase

A modern web-based inventory management system built with Supabase as the backend. This project demonstrates how to create a full-featured inventory system using Supabase's powerful features including authentication, real-time database, and storage capabilities.

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
-- Allow users to view their own avatar
CREATE POLICY "Users can view own avatar" ON storage.objects FOR SELECT
USING (bucket_id = 'inventory-avatar' AND auth.uid()::text = (storage.fspath(name))[1]);

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inventory-avatar' AND
  auth.uid()::text = (storage.fspath(name))[1]
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE
USING (bucket_id = 'inventory-avatar' AND auth.uid()::text = (storage.fspath(name))[1]);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE
USING (bucket_id = 'inventory-avatar' AND auth.uid()::text = (storage.fspath(name))[1]);
```

### 4. Database Policies

```sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Allow read access to all authenticated users" ON products
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON products
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON products
FOR UPDATE TO authenticated USING (true);

-- Similar policies for other tables...
```

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

- **User Authentication**
  - Email/Password login
  - Magic link authentication
  - User profile management
  - Avatar upload and management

- **Inventory Management**
  - Product Management
  - Stock tracking
  - Category organization
  - Multiple product types (Sellable, Consumable, Fixture)

- **Business Operations**
  - Sales Management
  - Purchase Management
  - Supplier Management
  - Customer Management
  - Stock Movement Tracking

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
