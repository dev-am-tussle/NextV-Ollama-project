import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, UserPlus, MoreVertical, Mail, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { 
  fetchEmployeesByOrgSlug, 
  createEmployeeByOrgSlug, 
  createBulkEmployeesByOrgSlug,
  type OrganizationEmployee,
  type CreateEmployeeData 
} from '@/services/organizationManagement';
import { AddEmployeeModal } from './AddEmployeeModal';
import { BulkAddEmployeesModal } from './BulkAddEmployeesModal';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

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

  // Callback to refresh users list after invitation actions
  const handleInvitationSuccess = () => {
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Department Users</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowBulkModal(true)}
              >
                <Users className="h-4 w-4" />
                Bulk Invite Employees
              </Button>
              
              <Button 
                className="gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus className="h-4 w-4" />
                Invite Employee
              </Button>
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

      {/* New Invitation Modal Components */}
      <AddEmployeeModal 
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleInvitationSuccess}
      />
      
      <BulkAddEmployeesModal 
        open={showBulkModal}
        onOpenChange={setShowBulkModal}
        onSuccess={handleInvitationSuccess}
      />
    </div>
  );
};

export default UserManagement;
