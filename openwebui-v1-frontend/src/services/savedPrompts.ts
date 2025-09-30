import apiFetch from "@/lib/api";

export interface SavedPrompt {
  _id: string;
  user_id: string;
  title: string;
  prompt: string;
  created_at: string;
}

export async function createSavedPrompt(
  title: string,
  prompt: string
): Promise<SavedPrompt> {
  return apiFetch("saved-prompts", {
    method: "POST",
    body: { title, prompt } as any,
  });
}

export async function getUserSavedPrompts(
  userId: string
): Promise<SavedPrompt[]> {
  console.log(`[savedPrompts] Fetching prompts for user: ${userId}`);
  const result = await apiFetch(`saved-prompts/user/${userId}`);
  console.log(
    `[savedPrompts] Received ${
      Array.isArray(result) ? result.length : "non-array"
    } prompts:`,
    result
  );
  return result;
}

export async function deleteSavedPrompt(promptId: string): Promise<void> {
  return apiFetch(`saved-prompts/${promptId}`, {
    method: "DELETE",
  });
}

export async function updateSavedPrompt(
  promptId: string,
  updates: { title?: string; prompt?: string }
): Promise<SavedPrompt> {
  return apiFetch(`saved-prompts/${promptId}`, {
    method: "PATCH",
    body: updates as any,
  });
}
