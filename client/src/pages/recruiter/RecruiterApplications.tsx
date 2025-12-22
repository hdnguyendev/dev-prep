import RecruiterDashboard from "./RecruiterDashboard";

/**
 * Wrapper component to show only Applications section from RecruiterDashboard
 */
export default function RecruiterApplications() {
  return <RecruiterDashboard showOnly="applications" />;
}

