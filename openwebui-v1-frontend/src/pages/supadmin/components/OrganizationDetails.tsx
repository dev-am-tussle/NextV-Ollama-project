import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed inline edit textarea usage
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  Crown, 
  Users, 
  ArrowLeft,
  Settings,
  Activity,
  Edit,
  Plus,
  X,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchOrganizationById, 
  updateOrganization,
  fetchAvailableModels,
  fetchOrganizationModels,
  assignModelsToOrganization,
  fetchOrganizationAdmins,
  createOrganizationAdmin,
  updateAdmin,
  resetAdminPassword,
  deleteAdmin,
  type OrganizationDetails as OrgDetailsType 
} from "@/services/organizationManagement";
import AddOrganizationDialog from "@/components/admin/AddOrganizationDialog";

export const OrganizationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orgData, setOrgData] = useState<OrgDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Model management state
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [organizationModels, setOrganizationModels] = useState<any[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelManagementOpen, setModelManagementOpen] = useState(false);
  
  // Admin management state
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdmins, setNewAdmins] = useState<any[]>([{ name: "", email: "", password: "" }]);
  const [adminManagementOpen, setAdminManagementOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    if (id) {
      loadOrganizationDetails();
      loadAvailableModels();
      loadOrganizationModels();
      loadAdmins();
    }
  }, [id]);

  const loadOrganizationDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetchOrganizationById(id);
      
      if (response.success) {
        setOrgData(response.data);
        // data loaded
      }
    } catch (error) {
      console.error("Failed to load organization details:", error);
      toast({
        title: "Error",
        description: "Failed to load organization details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const response = await fetchAvailableModels();
      if (response.success) {
        setAvailableModels(response.data);
      }
    } catch (error) {
      console.error("Failed to load available models:", error);
    }
  };

  const loadOrganizationModels = async () => {
    if (!id) return;
    try {
      const response = await fetchOrganizationModels(id);
      if (response.success) {
        setOrganizationModels(response.data);
        setSelectedModels(response.data.map((m: any) => m.model_id._id || m.model_id));
      }
    } catch (error) {
      console.error("Failed to load organization models:", error);
    }
  };

  const loadAdmins = async () => {
    if (!id) return;
    try {
      const response = await fetchOrganizationAdmins(id);
      if (response.success) {
        setAdminsList(response.data);
      }
    } catch (error) {
      console.error("Failed to load admins:", error);
    }
  };

  const handlePostEditSuccess = () => {
    loadOrganizationDetails();
  };

  const handleSaveModels = async () => {
    if (!id) return;
    try {
      await assignModelsToOrganization(id, selectedModels);
      toast({
        title: "Success",
        description: "Models assigned successfully",
      });
      setModelManagementOpen(false);
      loadOrganizationModels();
      loadOrganizationDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign models",
        variant: "destructive",
      });
    }
  };

  const addNewAdminRow = () => {
    setNewAdmins([...newAdmins, { name: "", email: "", password: "" }]);
  };

  const removeAdminRow = (index: number) => {
    setNewAdmins(newAdmins.filter((_, i) => i !== index));
  };

  const updateNewAdmin = (index: number, field: string, value: string) => {
    const updated = [...newAdmins];
    updated[index][field] = value;
    setNewAdmins(updated);
  };

  const handleCreateAdmins = async () => {
    if (!id) return;
    try {
      for (const admin of newAdmins) {
        if (admin.name && admin.email && admin.password) {
          await createOrganizationAdmin(id, admin);
        }
      }
      toast({
        title: "Success",
        description: "Admins created successfully",
      });
      setAdminManagementOpen(false);
      setNewAdmins([{ name: "", email: "", password: "" }]);
      loadAdmins();
      loadOrganizationDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create admins",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (adminId: string) => {
    const newPassword = prompt("Enter new password (min 8 characters):");
    if (newPassword && newPassword.length >= 8) {
      try {
        await resetAdminPassword(adminId, newPassword);
        toast({
          title: "Success",
          description: "Password reset successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reset password",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (confirm("Are you sure you want to delete this admin?")) {
      try {
        await deleteAdmin(adminId);
        toast({
          title: "Success",
          description: "Admin deleted successfully",
        });
        loadAdmins();
        loadOrganizationDetails();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete admin",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Departments not found</h2>
          <Button onClick={() => navigate('/superadmin/departments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Departments
          </Button>
        </div>
      </div>
    );
  }

  const { organization, admins, employees, stats } = orgData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/superadmin/departments')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
            <p className="text-muted-foreground">{organization.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditDialogOpen(true)} size="sm" variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Department
          </Button>
          <Dialog open={modelManagementOpen} onOpenChange={setModelManagementOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Manage Models
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Models to Department</DialogTitle>
                <DialogDescription>
                  Select which models this department can access
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableModels.map((model) => (
                  <div key={model._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={model._id}
                      checked={selectedModels.includes(model._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModels([...selectedModels, model._id]);
                        } else {
                          setSelectedModels(selectedModels.filter(id => id !== model._id));
                        }
                      }}
                    />
                    <Label htmlFor={model._id} className="flex-1">
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-sm text-muted-foreground">{model.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModelManagementOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveModels}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <AddOrganizationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        organization={organization as any}
        onSuccess={handlePostEditSuccess}
      />
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={
          organization.status === 'active' 
            ? 'text-green-600 bg-green-100' 
            : 'text-gray-600 bg-gray-100'
        }>
          {organization.status}
        </Badge>
        <Badge variant="secondary">
          {organization.subscription.plan}
        </Badge>
      </div>
      

  {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.admin_count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Department administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.total_employees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active_employees} active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.allowed_models_count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{organization.subscription.plan}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {organization.subscription.status}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
          <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Department Admins</CardTitle>
                  <CardDescription>
                    Administrators managing this organization
                  </CardDescription>
                </div>
                <Dialog open={adminManagementOpen} onOpenChange={setAdminManagementOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Admins
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Create New Admins</DialogTitle>
                      <DialogDescription>
                        Add multiple administrators for this department
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {newAdmins.map((admin, index) => (
                        <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                          <div>
                            <Label htmlFor={`name-${index}`}>Name</Label>
                            <Input
                              id={`name-${index}`}
                              value={admin.name}
                              onChange={(e) => updateNewAdmin(index, 'name', e.target.value)}
                              placeholder="Admin name"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`email-${index}`}>Email</Label>
                            <Input
                              id={`email-${index}`}
                              type="email"
                              value={admin.email}
                              onChange={(e) => updateNewAdmin(index, 'email', e.target.value)}
                              placeholder="admin@company.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`password-${index}`}>Password</Label>
                            <div className="relative">
                              <Input
                                id={`password-${index}`}
                                type={showPasswords[index] ? "text" : "password"}
                                value={admin.password}
                                onChange={(e) => updateNewAdmin(index, 'password', e.target.value)}
                                placeholder="Min 8 characters"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPasswords({
                                  ...showPasswords,
                                  [index]: !showPasswords[index]
                                })}
                              >
                                {showPasswords[index] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-end">
                            {newAdmins.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAdminRow(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addNewAdminRow}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another Admin
                      </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAdminManagementOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAdmins}>
                        Create Admins
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Merge admins from org details and separate paged admins avoiding duplicates
                const combined = [...admins, ...adminsList];
                const uniqueById = combined.reduce((acc: Record<string, any>, adm: any) => {
                  if (!acc[adm._id]) acc[adm._id] = adm;
                  return acc;
                }, {});
                const mergedAdmins = Object.values(uniqueById);
                return mergedAdmins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No admins found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mergedAdmins.map((admin: any) => (
                    <div key={admin._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{admin.name}</h3>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {admin.profile?.job_title && `${admin.profile.job_title} • `}
                          Joined {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                          {admin.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(admin._id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAdmin(admin._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );})()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Organization Employees</CardTitle>
              <CardDescription>
                Employees using the organization's resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No employees found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div key={employee._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(employee.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Configuration and preferences for this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Subscription Details</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Plan: {organization.subscription.plan}</p>
                        <p>Status: {organization.subscription.status}</p>
                        <p>Billing: {organization.subscription.billing_cycle}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Organization Info</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Created: {new Date(organization.created_at).toLocaleDateString()}</p>
                        <p>Status: {organization.status}</p>
                        <p>Verified: {organization.verified ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Models ({organizationModels.length})</CardTitle>
                <CardDescription>
                  Models available to this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizationModels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No models assigned</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {organizationModels.map((modelAssignment, index) => {
                      const model = modelAssignment.model_id;
                      return (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{model.name || model}</h3>
                              <p className="text-sm text-muted-foreground">
                                {model.description || 'No description'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Added: {new Date(modelAssignment.added_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={modelAssignment.enabled ? 'default' : 'secondary'}>
                              {modelAssignment.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationDetails;