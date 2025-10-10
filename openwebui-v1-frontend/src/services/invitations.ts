import { adminApiFetch } from './adminAuth';
import type { 
  InvitationRequest, 
  BulkInvitationRequest, 
  InvitationResponse, 
  BulkInvitationResponse 
} from '../types/invitation';

// Single employee invitation
export const inviteEmployee = async (employeeData: InvitationRequest): Promise<InvitationResponse> => {
  console.log('📞 Calling API: POST /api/admin/invitations');
  
  const response = await adminApiFetch('/api/admin/invitations', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to send invitation');
  }

  return response;
};

// Bulk employee invitations
export const bulkInviteEmployees = async (bulkData: BulkInvitationRequest): Promise<BulkInvitationResponse> => {
  console.log('📞 Calling API: POST /api/admin/invitations/bulk');
  
  const response = await adminApiFetch('/api/admin/invitations/bulk', {
    method: 'POST',
    body: JSON.stringify(bulkData),
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to send bulk invitations');
  }

  return response;
};

// Get all invitations for organization
export const getInvitations = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  department?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.department) queryParams.append('department', params.department);

  const query = queryParams.toString();
  return adminApiFetch(`/api/admin/invitations${query ? `?${query}` : ''}`);
};

// Resend invitation
export const resendInvitation = async (invitationId: string) => {
  console.log(`📞 Calling API: POST /api/admin/invitations/${invitationId}/resend`);
  
  return adminApiFetch(`/api/admin/invitations/${invitationId}/resend`, {
    method: 'POST',
  });
};

// Cancel invitation
export const cancelInvitation = async (invitationId: string) => {
  console.log(`📞 Calling API: DELETE /api/admin/invitations/${invitationId}`);
  
  return adminApiFetch(`/api/admin/invitations/${invitationId}`, {
    method: 'DELETE',
  });
};