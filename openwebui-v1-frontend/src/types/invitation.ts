// Types for employee invitation system

export interface EmployeeData {
  name: string;
  email: string;
  department?: string;
  job_title?: string;
  employee_id?: string;
  manager_id?: string;
}

export interface InvitationRequest {
  name: string;
  email: string;
  department?: string;
  job_title?: string;
  employee_id?: string;
  manager_id?: string;
  custom_message?: string;
}

export interface BulkInvitationRequest {
  invitations: InvitationRequest[];
  expires_in_days?: number;
}

export interface InvitationResponse {
  success: boolean;
  data: {
    invitation_id: string;
    email: string;
    status: string;
    expires_at: string;
  };
  message: string;
}

export interface BulkInvitationResponse {
  success: boolean;
  data: {
    created: number;
    failed: number;
    total: number;
    results: Array<{
      index: number;
      email: string;
      invitation_id?: string;
      status: string;
    }>;
    errors: Array<{
      index: number;
      email: string;
      error: string;
    }>;
  };
  message: string;
}

export interface FormErrors {
  name?: string;
  email?: string;
  department?: string;
  job_title?: string;
  employee_id?: string;
  general?: string;
}

export interface BulkFormErrors {
  general?: string;
  lines?: Array<{
    line: number;
    error: string;
  }>;
}