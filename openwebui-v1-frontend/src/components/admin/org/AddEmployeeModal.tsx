import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Loader from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { inviteEmployee } from '@/services/invitations';
import type { EmployeeData, FormErrors } from '@/types/invitation';

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<EmployeeData>({
    name: '',
    email: '',
    department: '',
    job_title: '',
    employee_id: ''
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Optional field validation
    if (formData.employee_id && formData.employee_id.length < 3) {
      newErrors.employee_id = 'Employee ID must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EmployeeData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const invitationData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        department: formData.department.trim() || undefined,
        job_title: formData.job_title.trim() || undefined,
        employee_id: formData.employee_id.trim() || undefined,
        custom_message: `Welcome to our organization, ${formData.name}!`
      };

      await inviteEmployee(invitationData);

      toast({
        title: "Invitation Sent Successfully",
        description: `Invitation has been sent to ${formData.email}`,
        duration: 5000,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        department: '',
        job_title: '',
        employee_id: ''
      });

      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('Failed to send invitation:', error);
      
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to send invitation. Please try again.'
      });

      toast({
        title: "Error",
        description: "Failed to send invitation. Please check your input and try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        email: '',
        department: '',
        job_title: '',
        employee_id: ''
      });
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter employee's full name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="employee@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              type="text"
              placeholder="e.g., Engineering, Marketing, Sales"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              disabled={isLoading}
              className={errors.department ? 'border-red-500' : ''}
            />
            {errors.department && (
              <p className="text-sm text-red-500">{errors.department}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              type="text"
              placeholder="e.g., Software Developer, Marketing Manager"
              value={formData.job_title}
              onChange={(e) => handleInputChange('job_title', e.target.value)}
              disabled={isLoading}
              className={errors.job_title ? 'border-red-500' : ''}
            />
            {errors.job_title && (
              <p className="text-sm text-red-500">{errors.job_title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input
              id="employee_id"
              type="text"
              placeholder="e.g., EMP001, DEV123"
              value={formData.employee_id}
              onChange={(e) => handleInputChange('employee_id', e.target.value)}
              disabled={isLoading}
              className={errors.employee_id ? 'border-red-500' : ''}
            />
            {errors.employee_id && (
              <p className="text-sm text-red-500">{errors.employee_id}</p>
            )}
          </div>

          <DialogFooter className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};