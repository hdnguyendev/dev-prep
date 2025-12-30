import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export interface MembershipStatus {
  membership: {
    id: string;
    plan: {
      id: string;
      name: string;
      planType: "FREE" | "VIP";
      features: string[];
    };
    startDate: string;
    endDate: string | null;
    status: string;
  } | null;
  usage: {
    planType: "FREE" | "VIP";
    planName: string;
    interviewsUsed?: number;
    interviewsLimit?: number | null;
    interviewsRemaining?: number | null;
  };
}

/**
 * Hook to get current user's membership status
 * Only fetches for candidates (Clerk users), not for recruiters/admins
 * @returns { membershipStatus, loading, error, refetch, isVIP }
 */
export function useMembership() {
  const { getToken, isSignedIn } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembership = async () => {
    // Only fetch for Clerk users (candidates), not for staff (recruiters/admins)
    const customUser = getCurrentUser();
    if (customUser) {
      // Staff user (recruiter/admin) - don't fetch membership
      setMembershipStatus(null);
      setLoading(false);
      return;
    }

    if (!isSignedIn) {
      setMembershipStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const res = await apiClient.getMembershipStatus(token || undefined);
      
      if (res.success && res.data) {
        setMembershipStatus(res.data);
      } else {
        throw new Error(res.message || "Failed to fetch membership status");
      }
    } catch (err: unknown) {
      setError("Failed to load membership status");
      setMembershipStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, [isSignedIn, getToken]);

  return {
    membershipStatus,
    loading,
    error,
    refetch: fetchMembership,
    isVIP: membershipStatus?.usage.planType === "VIP",
  };
}

