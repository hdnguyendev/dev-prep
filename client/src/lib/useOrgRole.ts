import { useOrganization, useUser } from "@clerk/clerk-react";

export type OrgRole = "org:admin" | "org:recruiter" | "org:member" | null;

/**
 * Hook to get the current user's role in the active organization.
 * Returns role string or null if not in an org.
 */
export const useOrgRole = (): OrgRole => {
  const { organization, membership } = useOrganization();
  const { user } = useUser();

  // If no organization or user, return null
  if (!organization || !user) {
    return null;
  }

  // Check membership role
  const role = membership?.role;
  if (role === "org:admin" || role === "org:recruiter" || role === "org:member") {
    return role as OrgRole;
  }

  return null;
};

/**
 * Check if user has admin role in organization
 */
export const useIsOrgAdmin = (): boolean => {
  const role = useOrgRole();
  return role === "org:admin";
};

/**
 * Check if user has recruiter role in organization
 */
export const useIsRecruiter = (): boolean => {
  const role = useOrgRole();
  return role === "org:recruiter";
};

/**
 * Check if user has admin or recruiter role (can manage recruitment)
 */
export const useCanManageRecruitment = (): boolean => {
  const role = useOrgRole();
  return role === "org:admin" || role === "org:recruiter";
};

/**
 * Permission checks for specific resources
 */
export const usePermissions = () => {
  const role = useOrgRole();

  return {
    canViewJobs: role === "org:admin" || role === "org:recruiter",
    canEditJobs: role === "org:admin" || role === "org:recruiter",
    canViewCandidates: role === "org:admin" || role === "org:recruiter",
    canViewApplications: role === "org:admin" || role === "org:recruiter",
    canViewInterviews: role === "org:admin" || role === "org:recruiter",
    canManageInterviews: role === "org:admin" || role === "org:recruiter",
    canViewQuestions: role === "org:admin" || role === "org:recruiter",
    canManageQuestions: role === "org:admin" || role === "org:recruiter",
    canAccessAdmin: role === "org:admin",
    canManageOrg: role === "org:admin",
    isRecruiter: role === "org:recruiter",
    isAdmin: role === "org:admin",
  };
};
