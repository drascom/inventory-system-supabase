# Release Notes

## v1.4.2 (2025-03-27)
### New Features
- Auto-Update System
  - Automatic updates from GitHub releases
  - Backup creation before updates
  - Version management
  - Progress tracking
  - Rollback capability
### Bug Fixes
  - Enhanced error handling
  - Improved update reliability
  - Better version compatibility checks

## v1.4.0 (2025-03-26)
### New Features
- Enhanced UI Responsiveness
  - Improved tooltip management
  - Optimized table rendering
  - Better mobile compatibility
  - Responsive design improvements across all pages

- **Session Management**
  - Enhanced token refresh mechanism
  - More reliable session persistence
  - Improved security checks
  - Automatic session recovery

- **Stock Movement System**
  - Refined movement validation logic
  - Enhanced error handling
  - Improved movement history display
  - Real-time stock level tracking

### Core Features
- **User Authentication**
  - Email/Password login
  - Magic link authentication (passwordless)
  - Profile management with avatar support
  - Session management with auto-refresh

- **Inventory Management**
  - Complete product CRUD operations
  - Stock level tracking
  - Product categorization
  - Product images support
  - Multiple product types (Sellable, Consumable, Fixture)

- **Business Operations**
  - Sales management system
  - Purchase management
  - Returns processing
  - Supplier management
  - Customer management
  - Stock movement tracking

### Technical Details
- Built with Supabase backend
- Real-time data synchronization
- Bootstrap 5 responsive design
- DataTables integration
- Select2 enhanced dropdowns

### Security
- Secure authentication flows
- Protected routes
- Storage policies implementation
- Database access controls

### Known Issues
- None reported in this initial release

### Installation
1. Clone the repository
2. Copy `assets/js/config.example.js` to `assets/js/config.js`
3. Update Supabase credentials in config.js
4. Open index.html in a web browser or use a local server

### Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

For detailed documentation and setup instructions, please refer to the README.md file.
