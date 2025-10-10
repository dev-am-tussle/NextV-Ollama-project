import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, Mail } from 'lucide-react';
import { AddEmployeeModal } from './AddEmployeeModal';
import { BulkAddEmployeesModal } from './BulkAddEmployeesModal';

export const OrganizationUsers: React.FC = () => {
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

  const handleEmployeeAdded = () => {
    // Refresh the employee list or update state
    console.log('Employee added successfully, refreshing list...');
    // You would typically call a function to refresh the employee list here
  };

  const handleBulkEmployeesAdded = () => {
    // Refresh the employee list or update state
    console.log('Bulk employees added, refreshing list...');
    // You would typically call a function to refresh the employee list here
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage and invite employees to your organization
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsBulkAddModalOpen(true)}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Bulk Add</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">35</div>
            <p className="text-xs text-muted-foreground">
              83% of total employees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Employee list will appear here</p>
            <p className="text-sm">
              This would typically contain a table or list of all employees
              with their status, department, role, and action buttons.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddEmployeeModal
        open={isAddEmployeeModalOpen}
        onOpenChange={setIsAddEmployeeModalOpen}
        onSuccess={handleEmployeeAdded}
      />

      <BulkAddEmployeesModal
        open={isBulkAddModalOpen}
        onOpenChange={setIsBulkAddModalOpen}
        onSuccess={handleBulkEmployeesAdded}
      />
    </div>
  );
};