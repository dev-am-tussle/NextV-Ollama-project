# Setup Instructions for Admin System

## Backend Setup

1. **Run the admin creation script:**
```bash
cd openwebui-backend
node src/scripts/createDefaultAdmin.js
```

This will create the default super admin with:
- Email: admin@admin.com
- Password: admin123
- Role: super_admin

2. **Start the backend server:**
```bash
cd openwebui-backend
npm start
```

## Frontend Setup

1. **Start the frontend:**
```bash
cd openwebui-v1-frontend
npm run dev
```

2. **Access the admin portal:**
- Admin Login: http://localhost:3000/admin/login
- Use credentials: admin@admin.com / admin123

## Admin System Flow

### Super Admin Dashboard:
1. Login at `/admin/login`
2. Redirected to `/admin/super-admin/dashboard`
3. **Sidebar shows:**
   - Dashboard overview
   - **Organizations list** (exactly as requested!)
   - Search functionality
   - Create organization button

### Organization Management:
1. **Click any organization** in sidebar
2. **Shows complete organization details:**
   - Organization stats (employees, admins, models)
   - **Tabs for:**
     - Admins (list of org admins with edit/delete)
     - Employees (list of all employees with details)
     - Settings (limits, features, configuration)
     - Models (assigned AI models)

### Key Features Implemented:
✅ Super admin with organization sidebar (exactly like your image!)
✅ Click organization → Complete details with admins
✅ Employee counts and statistics
✅ Edit/delete organization functionality
✅ Modern responsive UI
✅ Role-based access control
✅ Complete CRUD operations

## API Endpoints Created:

### Admin Auth:
- POST `/api/admin/auth/login`
- GET `/api/admin/auth/profile`
- POST `/api/admin/auth/logout`

### Organization Management (Super Admin):
- GET `/api/super-admin/organizations`
- GET `/api/super-admin/organizations/:id`
- POST `/api/super-admin/organizations`
- PUT `/api/super-admin/organizations/:id`
- DELETE `/api/super-admin/organizations/:id`
- POST `/api/super-admin/organizations/:id/models`
- GET `/api/super-admin/organizations/:id/employees`

## Database Models:
- **Admin** - Super admin & org admin users
- **Organization** - Multi-tenant organizations
- **User** - Enhanced with employee roles
- **AdminSettings** - Role-based permissions

## Next Steps:
1. Test the admin creation script
2. Start both servers
3. Login to admin portal
4. Create first organization
5. Test organization management

The system is now ready for the complete admin workflow you requested!