import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, MoreVertical, Mail, Calendar, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { 
  fetchEmployeesByOrgSlug, 
  createEmployeeByOrgSlug, 
  createBulkEmployeesByOrgSlug,
  type OrganizationEmployee,
  type CreateEmployeeData 
} from '@/services/organizationManagement';
import { CircleLoader } from '@/components/ui/loader';

interface UserManagementProps {
  orgSlug?: string;
}

export const UserManagement = ({ orgSlug }: UserManagementProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<OrganizationEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBulkUserModal, setShowBulkUserModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    job_title: '',
    employee_id: '',
    hired_date: ''
  });

  const [bulkUserText, setBulkUserText] = useState('');

  // Load users when component mounts or orgSlug changes
  useEffect(() => {
    if (orgSlug) {
      loadUsers();
    }
  }, [orgSlug]);

  const loadUsers = async () => {
    if (!orgSlug) {
      toast.error('Organization slug is required');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading employees for org:', orgSlug);
      
      const response = await fetchEmployeesByOrgSlug(orgSlug, pagination.page, pagination.limit);
      console.log('📦 Employees response:', response);
      
      if (response.success && response.data) {
        setUsers(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        console.error('Failed to load employees:', response);
        toast.error(response.error || 'Failed to load users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Helper function to get time ago
  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return 'Unknown';
    }
  };

  const filtered = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.employee_details?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.employee_details?.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = (action: string, userId: string) => {
    toast.success(`${action} action triggered for user ${userId}`);
  };

  // Form handlers
  const resetUserForm = () => {
    setNewUser({
      name: '',
      email: '',
      department: '',
      job_title: '',
      employee_id: '',
      hired_date: ''
    });
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const validateUserForm = (): string | null => {
    if (!newUser.name.trim()) {
      return 'Name is required';
    }
    if (!newUser.email.trim()) {
      return 'Email is required';
    }
    if (!isValidEmail(newUser.email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleAddUser = async () => {
    // Validate form
    const validationError = validateUserForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!orgSlug) {
      toast.error('Organization slug is required');
      return;
    }

    try {
      setAddingUser(true);
      console.log('Adding user:', newUser, 'to org:', orgSlug);
      
      const employeeData: CreateEmployeeData = {
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        department: newUser.department.trim(),
        job_title: newUser.job_title.trim(),
        employee_id: newUser.employee_id.trim(),
        hired_date: newUser.hired_date
      };

      const response = await createEmployeeByOrgSlug(orgSlug, employeeData);
      
      if (response.success) {
        toast.success(response.message || 'Employee added successfully');
        setShowAddUserModal(false);
        resetUserForm();
        // Reload users list
        loadUsers();
      } else {
        toast.error(response.error || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add employee');
    } finally {
      setAddingUser(false);
    }
  };

  const handleBulkAddUsers = async () => {
    if (!bulkUserText.trim()) {
      toast.error('Please enter user data');
      return;
    }

    if (!orgSlug) {
      toast.error('Organization slug is required');
      return;
    }

    try {
      setAddingUser(true);
      // Parse bulk user text (expecting CSV-like format)
      const lines = bulkUserText.trim().split('\n');
      const employees: CreateEmployeeData[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const [name, email, department, jobTitle] = line.split(',').map(s => s.trim());
        
        if (!name) {
          errors.push(`Line ${i + 1}: Name is required`);
          continue;
        }
        if (!email) {
          errors.push(`Line ${i + 1}: Email is required`);
          continue;
        }
        if (!isValidEmail(email)) {
          errors.push(`Line ${i + 1}: Invalid email format`);
          continue;
        }
        
        employees.push({ 
          name, 
          email: email.toLowerCase(), 
          department: department || '', 
          job_title: jobTitle || '' 
        });
      }

      if (errors.length > 0) {
        toast.error(`Validation errors:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
        return;
      }

      if (employees.length === 0) {
        toast.error('No valid users found in the text');
        return;
      }

      console.log('Bulk adding users:', employees, 'to org:', orgSlug);
      
      const response = await createBulkEmployeesByOrgSlug(orgSlug, employees);
      
      if (response.success) {
        const created = response.data?.created || 0;
        const failed = response.data?.failed || 0;
        
        if (failed > 0) {
          toast.success(`${created} employees added successfully, ${failed} failed`);
        } else {
          toast.success(`${created} employees added successfully`);
        }
        
        setShowBulkUserModal(false);
        setBulkUserText('');
        // Reload users list
        loadUsers();
      } else {
        toast.error(response.error || 'Failed to add employees');
      }
    } catch (error) {
      console.error('Error bulk adding users:', error);
      toast.error('Failed to add employees');
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organization Users</CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={showBulkUserModal} onOpenChange={setShowBulkUserModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Bulk Add Users
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Loading employees...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {users.length === 0 ? 'No employees found' : 'No employees match your search'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(user => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-medium">{user.name || 'Unknown User'}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email || 'No email'}
                              {user.email_verified && <span className="text-green-600 ml-1">✓</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="capitalize">
                            {user.role || 'employee'}
                          </Badge>
                          {user.employee_details?.job_title && (
                            <div className="text-xs text-muted-foreground">
                              {user.employee_details.job_title}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant="default"
                            className="bg-green-500/10 text-green-700 dark:text-green-400"
                          >
                            Active
                          </Badge>
                          {user.employee_details?.department && (
                            <div className="text-xs text-muted-foreground">
                              {user.employee_details.department}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <div>
                            <div>{formatDate(user.created_at)}</div>
                            <div className="text-xs">{getTimeAgo(user.created_at)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>
                          <div>{formatDate(user.updated_at)}</div>
                          <div className="text-xs">{getTimeAgo(user.updated_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction('Edit', user._id)}>Edit Employee</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction('Reset Password', user._id)}>Reset Password</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction('View Activity', user._id)}>View Activity</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleAction('Remove', user._id)}>
                              Remove Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                disabled={addingUser}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                disabled={addingUser}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                  disabled={addingUser}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={newUser.job_title}
                  onChange={(e) => setNewUser(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="e.g. Software Engineer"
                  disabled={addingUser}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={newUser.employee_id}
                  onChange={(e) => setNewUser(prev => ({ ...prev, employee_id: e.target.value }))}
                  placeholder="e.g. EMP001"
                  disabled={addingUser}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="hired_date">Hire Date</Label>
                <Input
                  id="hired_date"
                  type="date"
                  value={newUser.hired_date}
                  onChange={(e) => setNewUser(prev => ({ ...prev, hired_date: e.target.value }))}
                  disabled={addingUser}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddUserModal(false);
                resetUserForm();
              }}
              disabled={addingUser}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Users Modal */}
      <Dialog open={showBulkUserModal} onOpenChange={setShowBulkUserModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Add Employees</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-users">Employee Data</Label>
              <p className="text-sm text-muted-foreground">
                Enter one employee per line in the format: Name, Email, Department, Job Title
              </p>
              <p className="text-xs text-muted-foreground">
                Example: John Doe, john@company.com, Engineering, Software Engineer
              </p>
              <Textarea
                id="bulk-users"
                value={bulkUserText}
                onChange={(e) => setBulkUserText(e.target.value)}
                placeholder="John Doe, john@company.com, Engineering, Software Engineer&#10;Jane Smith, jane@company.com, HR, HR Manager&#10;Bob Wilson, bob@company.com, Sales, Sales Representative"
                className="min-h-[200px] font-mono text-sm"
                disabled={addingUser}
              />
            </div>
            
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-2">Format Guidelines:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Each line represents one employee</li>
                <li>• Use commas to separate fields: Name, Email, Department, Job Title</li>
                <li>• Name and Email are required fields</li>
                <li>• Department and Job Title are optional</li>
                <li>• Empty lines will be ignored</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBulkUserModal(false);
                setBulkUserText('');
              }}
              disabled={addingUser}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAddUsers} disabled={addingUser}>
              {addingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Employees
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
