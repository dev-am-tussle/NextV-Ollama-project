import apiFetch from "@/lib/api";

// Admin-specific conversation API endpoints
// These will use admin authentication context

export async function listAdminConversations(limit: number = 50) {
  try {
    // TODO: Replace with actual admin conversation endpoint when backend is ready
    // For now using user conversations but with admin auth
    const response = await apiFetch(`/conversation?limit=${limit}`, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error listing admin conversations:', error);
    throw error;
  }
}

export async function createAdminConversation(data: any) {
  try {
    // TODO: Replace with actual admin conversation endpoint
    // Should include organization context for admin
    const response = await apiFetch('/conversation', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        // Add admin context
        admin_context: true,
        user_type: 'admin'
      })
    });
    return response;
  } catch (error) {
    console.error('Error creating admin conversation:', error);
    throw error;
  }
}

export async function getAdminMessages(conversationId: string, limit: number = 200) {
  try {
    // TODO: Replace with actual admin messages endpoint
    const response = await apiFetch(`/conversation/${conversationId}/messages?limit=${limit}`, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error getting admin messages:', error);
    throw error;
  }
}

export async function postAdminMessage(conversationId: string, data: any) {
  try {
    // TODO: Replace with actual admin message endpoint
    // Should include admin context
    const response = await apiFetch(`/conversation/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        // Add admin context
        admin_context: true,
        user_type: 'admin'
      })
    });
    return response;
  } catch (error) {
    console.error('Error posting admin message:', error);
    throw error;
  }
}

export async function deleteAdminConversation(conversationId: string) {
  try {
    // TODO: Replace with actual admin conversation delete endpoint
    const response = await apiFetch(`/conversation/${conversationId}`, {
      method: 'DELETE'
    });
    return response;
  } catch (error) {
    console.error('Error deleting admin conversation:', error);
    throw error;
  }
}

// Admin-specific saved prompts
export async function createAdminSavedPrompt(title: string, content: string) {
  try {
    // TODO: Replace with actual admin saved prompts endpoint
    const response = await apiFetch('/savedprompts', {
      method: 'POST',
      body: JSON.stringify({
        title,
        content,
        // Add admin context
        admin_context: true,
        user_type: 'admin'
      })
    });
    return response;
  } catch (error) {
    console.error('Error creating admin saved prompt:', error);
    throw error;
  }
}

export async function deleteAdminSavedPrompt(id: string) {
  try {
    // TODO: Replace with actual admin saved prompts endpoint
    const response = await apiFetch(`/savedprompts/${id}`, {
      method: 'DELETE'
    });
    return response;
  } catch (error) {
    console.error('Error deleting admin saved prompt:', error);
    throw error;
  }
}

export async function updateAdminSavedPrompt(id: string, data: any) {
  try {
    // TODO: Replace with actual admin saved prompts endpoint
    const response = await apiFetch(`/savedprompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        // Add admin context
        admin_context: true,
        user_type: 'admin'
      })
    });
    return response;
  } catch (error) {
    console.error('Error updating admin saved prompt:', error);
    throw error;
  }
}