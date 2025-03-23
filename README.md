# Inventory Management System with Supabase

A modern web-based inventory management system built with Supabase as the backend. This project demonstrates how to create a full-featured inventory system using Supabase's powerful features including authentication, real-time database, and storage capabilities.

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
