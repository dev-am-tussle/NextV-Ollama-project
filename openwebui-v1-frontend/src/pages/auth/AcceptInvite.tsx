import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Loader2, Mail, Building, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types for invitation acceptance
interface InvitationDetails {
  _id: string;
  name: string;
  email: string;
  organization_id: {
    _id: string;
    name: string;
  };
  employee_details?: {
    department?: string;
    job_title?: string;
  };
  invited_by: {
    name: string;
    email: string;
  };
  expires_at: string;
  status: string;
}

interface ProfileFormData {
  name: string;
  password: string;
  confirmPassword: string;
  department: string;
  job_title: string;
}

interface FormErrors {
  name?: string;
  password?: string;
  confirmPassword?: string;
  department?: string;
  job_title?: string;
  general?: string;
}

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const token = searchParams.get('token');
  
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    password: '',
    confirmPassword: '',
    department: '',
    job_title: ''
  });

  // Verify invitation token on component mount
  useEffect(() => {
    if (!token) {
      setStep('error');
      setErrors({ general: 'No invitation token provided' });
      setIsLoading(false);
      return;
    }

    verifyInvitationToken();
  }, [token]);

  // API call to verify invitation token
  const verifyInvitationToken = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Verifying invitation token:', token);

      const response = await fetch(`/api/invitations/verify/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInvitationDetails(data.data);
        setFormData(prev => ({
          ...prev,
          name: data.data.name || '',
          department: data.data.employee_details?.department || '',
          job_title: data.data.employee_details?.job_title || ''
        }));
        setStep('form');
        console.log('✅ Invitation verified successfully');
      } else {
        setStep('error');
        setErrors({ general: data.error || 'Invalid or expired invitation' });
        console.error('❌ Invitation verification failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Error verifying invitation:', error);
      setStep('error');
      setErrors({ general: 'Failed to verify invitation. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Optional field validation
    if (formData.department && formData.department.trim().length < 2) {
      newErrors.department = 'Department must be at least 2 characters long';
    }

    if (formData.job_title && formData.job_title.trim().length < 2) {
      newErrors.job_title = 'Job title must be at least 2 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Submit profile completion form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      console.log('📝 Submitting profile completion:', { token, formData: { ...formData, password: '***' } });

      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          password: formData.password,
          department: formData.department.trim() || undefined,
          job_title: formData.job_title.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        
        toast({
          title: "Account Created Successfully!",
          description: `Welcome to ${invitationDetails?.organization_id.name}`,
          duration: 5000,
        });

        // Redirect to chat after 3 seconds
        setTimeout(() => {
          navigate('/user/chat');
        }, 3000);

        console.log('✅ Profile completed successfully');
      } else {
        setErrors({ general: data.error || 'Failed to complete profile' });
        toast({
          title: "Error",
          description: data.error || "Failed to complete profile. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        console.error('❌ Profile completion failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Error completing profile:', error);
      setErrors({ general: 'Failed to complete profile. Please try again.' });
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if invitation is expired
  const isExpired = invitationDetails && new Date() > new Date(invitationDetails.expires_at);

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => navigate('/auth/login')}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Account Created Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Welcome to {invitationDetails?.organization_id.name}!
              </p>
              <p className="text-sm text-muted-foreground">
                You will be redirected to the chat interface in a few seconds...
              </p>
              <Button onClick={() => navigate('/user/chat')} className="w-full">
                Go to Chat Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mail className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          </div>
          
          {invitationDetails && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-medium">
                  {invitationDetails.organization_id.name}
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Invited by {invitationDetails.invited_by.name}</span>
              </div>

              {isExpired && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invitation has expired. Please contact your administrator for a new invitation.
                  </AlertDescription>
                </Alert>
              )}

              {invitationDetails.status !== 'pending' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invitation is no longer valid. Status: {invitationDetails.status}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {errors.general && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isSubmitting}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitationDetails?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This email cannot be changed
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Security</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isSubmitting}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isSubmitting}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Work Information (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={isSubmitting}
                    className={errors.department ? 'border-red-500' : ''}
                    placeholder="e.g. Engineering"
                  />
                  {errors.department && <p className="text-sm text-red-500 mt-1">{errors.department}</p>}
                </div>

                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => handleInputChange('job_title', e.target.value)}
                    disabled={isSubmitting}
                    className={errors.job_title ? 'border-red-500' : ''}
                    placeholder="e.g. Software Developer"
                  />
                  {errors.job_title && <p className="text-sm text-red-500 mt-1">{errors.job_title}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/auth/login')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting || isExpired || invitationDetails?.status !== 'pending'}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;