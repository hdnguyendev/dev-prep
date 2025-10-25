import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to your Dev Prep dashboard</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {user?.fullName || 'Not set'}</p>
                <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress || 'Not set'}</p>
                <p><strong>User ID:</strong> {user?.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Applications</CardTitle>
              <CardDescription>Track your job applications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-600">Applications submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview Prep</CardTitle>
              <CardDescription>Practice for your interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-600">Practice sessions completed</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
