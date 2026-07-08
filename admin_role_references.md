# Admin Role References

This document analyzes the admin role implementation patterns from both reference systems:

1. **sch-mage-system** - Smart School Management System  
2. **library management system** - Web-based library system
3. **frontend/admin-web** - Admin workspace components

---

## 1. sch-mage-system (Backend)

### 1.1 Role Definitions
**File**: `db_models.py`

Admin-related roles in UserRole enum:
- `super_admin` - System-wide administrator
- `school_admin` - School-level administrator
- `principal` - School principal with admin capabilities
- `receptionist` - Can list users
- `accountant` - Payment verification and fee management

### 1.2 Authorization Pattern
**File**: `main.py` (lines 353-363)

```python
def require_roles(*roles: UserRole):
    allowed = {role.value for role in roles}

    def dependency(current_user: User = Depends(verify_token)) -> User:
        if current_user.role == UserRole.super_admin.value:
            return current_user
        if current_user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role permissions")
        return current_user

    return dependency
```

**Key Insight**: Super admin bypasses all role checks. Multiple roles can be granted same permissions.

### 1.3 Admin Endpoints
**File**: `main.py`

1. **List Users** (lines 407-418)
```python
@app.get("/api/v1/admin/users", response_model=List[UserSummary])
def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_roles(
        UserRole.school_admin, 
        UserRole.principal, 
        UserRole.receptionist
    )),
    db: Session = Depends(get_db),
):
```

2. **Create User** (lines 421-455)
```python
@app.post("/api/v1/admin/users", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreate,
    current_user: User = Depends(require_roles(UserRole.school_admin, UserRole.principal)),
    db: Session = Depends(get_db),
):
```

3. **View All Roles** (lines 402-404)
```python
@app.get("/api/v1/roles", response_model=RoleResponse)
def get_roles(current_user: User = Depends(require_roles(UserRole.school_admin, UserRole.principal))):
    return RoleResponse(roles=[role.value for role in UserRole])
```

### 1.4 Admin Capabilities
- Create new users with role assignment
- List and manage users within school scope
- Verify payments
- Send messages across the school platform
- View all available roles in the system

### 1.5 Data Model
**File**: `db_models.py`

```python
class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Key Fields**:
- `role` - String representation of user role
- `is_active` - Soft delete/activation flag
- `is_verified` - Email/phone verification status
- `last_login_at` - Audit tracking
- `school_id` - Multi-tenant scoping

---

## 2. Library Management System

### 2.1 Admin Authentication
**File**: `login.php`

```php
session_start();
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$stmt = $db->prepare('SELECT * FROM users WHERE username = :u');
$stmt->execute([':u' => $username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if ($user && password_verify($password, $user['password'])) {
    $_SESSION['user'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    if ($user['role'] === 'admin') {
        header('Location: admin.php');
    } else {
        header('Location: librarian.php');
    }
    exit;
}
```

**Key Insight**: Simple role-based routing after login.

### 2.2 Admin Authorization
**File**: `admin.php`

```php
session_start();
if (empty($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Admin Dashboard</h1>
    <p>Welcome, <?php echo htmlspecialchars($_SESSION['user']); ?>.</p>
    <ul>
      <li><a href="#">Manage books (placeholder)</a></li>
      <li><a href="#">Manage users (placeholder)</a></li>
    </ul>
    <p><a href="logout.php">Logout</a></p>
  </div>
</body>
</html>
```

**Key Insights**:
- Session-based authentication
- Simple role check: `$_SESSION['role'] === 'admin'`
- Minimal HTML dashboard with placeholder links
- No granular permissions or multi-role support

### 2.3 Database Initialization
**File**: `db_init.php`

```php
$db->exec("CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
);");

// Seed users
$users = [
    ['username' => 'admini', 'password' => password_hash('admin123', PASSWORD_DEFAULT), 'role' => 'admin'],
    ['username' => 'librarian', 'password' => password_hash('lib123', PASSWORD_DEFAULT), 'role' => 'librarian'],
];
```

**Key Insights**:
- SQLite database
- Minimal user schema (no email, phone, school_id)
- Two default users: admin and librarian
- Role-based access only

---

## 3. Frontend Admin Workspace

**File**: `frontend/admin-web/src/workspaces/AdminWorkspace.tsx`

### 3.1 Admin Views Structure

```typescript
interface AdminWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange: (view: string) => void;
}
```

### 3.2 Available Admin Views

1. **Overview** (default)
   - Student summary statistics
   - Staff count
   - Fee collection rate
   - Quick action buttons

2. **Relational Registry**
   - Tree view of student-parent-teacher relationships
   - Visual hierarchy of school data

3. **Data Export**
   - PDF report generation
   - Excel spreadsheet export (.xlsx)
   - Access database export (.accdb)

4. **Students**
   - Student database table
   - Search functionality
   - Add student button
   - View relational tree for each student

5. **Staff**
   - Teaching and non-teaching staff table
   - Staff number, name, role, department, status

6. **Approvals**
   - Pending approval inbox
   - Approve/Request Changes/Reject actions
   - Priority badges

7. **Notifications**
   - Notification list
   - Severity badges (High, Medium, Low)

8. **Communication**
   - Message sending form
   - Target group selection (SMS groups)
   - Message history

9. **Finance/Reports**
   - Expected fees
   - Collected amount
   - Outstanding balance
   - Collection rate

10. **Settings**
    - School profile display
    - School name, short name, phone, email, address
    - Term and academic year

### 3.3 Key UI Components

```typescript
// Stateful search component
<LocalStatefulSearch
  dataset={data.students}
  searchKeys={["name", "admissionNo", "className"]}
  placeholderText="Search students by name, admission number, or class..."
/>

// Approval cards
<div className="approval-card">
  <div className="approval-header">
    <strong>{approval.id}</strong>
    <span className={`priority-badge ${approval.priority.toLowerCase()}`}>
      {approval.priority}
    </span>
  </div>
  <h4>{approval.title}</h4>
  <p>Type: {approval.type} · Submitted by: {approval.submitted_by}</p>
  <div className="approval-actions">
    <button className="primary-button small">Approve</button>
    <button className="secondary-button small">Request Changes</button>
    <button className="danger-button small">Reject</button>
  </div>
</div>
```

---

## 4. Key Patterns & Best Practices

### 4.1 Authentication Pattern
- **JWT Tokens** (sch-mage-system) vs **Sessions** (library system)
- Token includes: user_id, school_id, role
- Verification on every protected endpoint

### 4.2 Authorization Pattern
- Role-based access control (RBAC)
- Decorator/dependency injection for permission checking
- Super admin bypass (universal access)
- Multi-role permissions on same endpoint

### 4.3 Admin Capabilities Summary

| Capability | sch-mage-system | Library System | Frontend Admin |
|------------|----------------|----------------|----------------|
| Create Users | ✓ | ✗ | ✓ |
| List Users | ✓ | ✗ | ✓ |
| Verify Payments | ✓ | ✗ | ✗ |
| Send Messages | ✓ | ✗ | ✓ |
| View Roles | ✓ | ✗ | ✗ |
| Dashboard Stats | ✗ | ✗ | ✓ |
| Data Export | ✗ | ✗ | ✓ |
| Approvals | ✗ | ✗ | ✓ |
| Staff Management | ✗ | ✗ | ✓ |

### 4.4 Database Schema Patterns

**sch-mage-system** (Production-ready):
- Rich user model with email, phone, timestamps
- Multi-tenant with school_id foreign key
- Unique constraints on email and phone
- Foreign key relationships for referential integrity

**Library System** (Minimal):
- Simple users table with username, password, role
- No multi-tenant support
- No user metadata

### 4.5 Security Considerations
1. Password hashing (bcrypt/argon2)
2. Token/session expiration
3. Role-based route protection
4. Input validation and sanitization
5. CSRF protection (sessions)
6. SQL injection prevention (prepared statements)

### 4.6 Implementation Recommendations

Based on the reference systems:

1. **Use JWT for API authentication** (more scalable than sessions)
2. **Implement RBAC with multiple roles per endpoint**
3. **Include super_admin bypass for system-level operations**
4. **Add school_id for multi-tenant school management**
5. **Create comprehensive admin dashboard with:**
   - User management
   - Approval workflows
   - Data export capabilities
   - Communication tools
   - Financial overview
6. **Add audit logging** (already in db_models as AuditLog)
7. **Implement soft delete with is_active flag**

### 4.7 Admin Role Hierarchy

```
super_admin (system-wide access)
  └── school_admin (school-level management)
        ├── principal (administrative + academic)
        ├── receptionist (user listing only)
        └── accountant (payment management)
```

---

## 5. Integration Points

### 5.1 Between sch-mage-system and Frontend
- API endpoints return JSON matching frontend expectations
- UserResponse model aligns with AdminWorkspace data needs
- Role-based routing should mirror frontend view switching

### 5.2 Potential Enhancements
1. Add more granular permissions (e.g., can_edit, can_delete)
2. Implement approval workflows for user creation
3. Add activity logging for admin actions
4. Create role-based UI component rendering
5. Add bulk operations (bulk user import, bulk messaging)

---

## Summary

The admin role implementation varies significantly across systems:

- **Library system**: Minimal, session-based, single admin role
- **sch-mage-system**: Comprehensive, JWT-based, multiple admin-related roles with granular permissions
- **Frontend**: Rich UI with multiple admin views but backend integration needed

The sch-mage-system provides the most robust pattern to follow, with proper role hierarchy, authorization patterns, and multi-tenant support.