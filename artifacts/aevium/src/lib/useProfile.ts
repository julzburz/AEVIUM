import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

export const PROFILE_QUERY_KEY = ["me/profile"] as const;

export interface UserProfile {
  userId: string;
  theme: string | null;
  language: string | null;
  displayName: string | null;
  bio: string | null;
}

async function fetchWithAuth(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Profile API error: ${res.status}`);
  return res.json() as Promise<UserProfile>;
}

export function useProfile() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<UserProfile>({
    queryKey: PROFILE_QUERY_KEY,
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return fetchWithAuth("/api/me/profile", token);
    },
  });
}

export function useUpdateProfile() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<UserProfile, "theme" | "language" | "displayName" | "bio">>) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return fetchWithAuth("/api/me/profile", token, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<UserProfile>(PROFILE_QUERY_KEY, updated);
    },
  });
}
