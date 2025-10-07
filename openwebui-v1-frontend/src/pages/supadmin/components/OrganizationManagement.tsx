import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Building2, 
  Search, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Plus,
  Users, 
  Crown,
  Activity,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchOrganizations, deleteOrganization, type OrganizationWithStats } from "@/services/organizationManagement";
import AddOrganizationDialog from "@/components/admin/AddOrganizationDialog";

export const OrganizationManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      const response = await fetchOrganizations(pagination.page, pagination.limit);
      
      if (response.success) {
        setOrganizations(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrganization = async (orgId: string) => {
    setDeletingOrgId(orgId);
    
    try {
      const response = await deleteOrganization(orgId);
      
      if (response.success) {
        toast({
          title: "Organization deleted",
          description: "Organization and all related data have been deleted successfully.",
        });
        loadOrganizations(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingOrgId(null);
    }
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
      case 'suspended':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalStats = () => {
    return {
      totalOrgs: organizations.length,
      activeOrgs: organizations.filter(org => org.status === 'active').length,
      totalAdmins: organizations.reduce((sum, org) => sum + org.stats.admin_count, 0),
      totalEmployees: organizations.reduce((sum, org) => sum + org.stats.employee_count, 0)
    };
  };

  const stats = getTotalStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization Management</h1>
          <p className="text-muted-foreground mt-1">Manage all organizations and their settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadOrganizations} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddOrgDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Organization
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalOrgs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeOrgs} active organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Organization Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalAdmins}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Organizations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations ({organizations.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading organizations...</p>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground mt-2">No organizations found</p>
              <Button 
                className="mt-4"
                onClick={() => setShowAddOrgDialog(true)}
              >
                Create First Organization
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrganizations.map((org) => (
                <Card key={org._id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{org.name}</h3>
                            <p className="text-sm text-muted-foreground">{org.description || 'No description'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(org.status)}
                            <Badge variant="outline" className={getStatusColor(org.status)}>
                              {org.status}
                            </Badge>
                            <Badge variant="secondary">
                              {org.subscription.plan}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <span className="text-muted-foreground">{org.stats.admin_count} admins</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span className="text-muted-foreground">{org.stats.employee_count} employees</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-muted-foreground">{org.stats.active_employees} active</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            <span className="text-muted-foreground">Created {formatDate(org.created_at)}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Subscription: {org.subscription.plan} ({org.subscription.status})</span>
                          <span>Models: {org.stats.allowed_models_count}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/superadmin/organization/${org._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              disabled={deletingOrgId === org._id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{org.name}"? 
                                This will permanently delete the organization and all its data including 
                                admins, employees, and settings. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrganization(org._id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Organization
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Organization Dialog */}
      <AddOrganizationDialog
        open={showAddOrgDialog}
        onOpenChange={setShowAddOrgDialog}
        onSuccess={loadOrganizations}
      />
    </div>
  );
};