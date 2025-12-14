import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Briefcase, Building2, Mail, Lock, User, Globe } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type Company = {
  id: string;
  name: string;
};

const RecruiterRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState("");
  const [createNewCompany, setCreateNewCompany] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    companyId: "",
    position: "",
    // New company fields
    companyName: "",
    companyWebsite: "",
    companyIndustry: "",
    companyCity: "",
    companyCountry: "",
  });

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`${API_BASE}/companies?pageSize=100`);
        const data = await response.json();
        if (data.success) {
          setCompanies(data.data || []);
          // If no companies exist, auto-switch to create mode
          if (!data.data || data.data.length === 0) {
            setCreateNewCompany(true);
          }
        }
      } catch (err) {
        console.error("Failed to load companies:", err);
        setCreateNewCompany(true); // Fallback to create mode
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError("Please fill in all required fields");
      return;
    }

    if (createNewCompany && !formData.companyName) {
      setError("Company name is required");
      return;
    }

    if (!createNewCompany && !formData.companyId) {
      setError("Please select a company");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position || undefined,
      };

      if (createNewCompany) {
        payload.newCompany = {
          name: formData.companyName,
          website: formData.companyWebsite || undefined,
          industry: formData.companyIndustry || undefined,
          city: formData.companyCity || undefined,
          country: formData.companyCountry || undefined,
        };
      } else {
        payload.companyId = formData.companyId;
      }

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Registration successful, redirect to login
        alert("Registration successful! Please login.");
        navigate("/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <main className="min-h-dvh flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Recruiter Registration</CardTitle>
          <CardDescription className="text-center">
            Join our platform to post jobs and find talented candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Personal Info */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <h3 className="font-semibold text-sm">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    First Name *
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Last Name *
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="recruiter@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password *
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm Password *
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Position (Optional)
                </label>
                <Input
                  id="position"
                  name="position"
                  type="text"
                  placeholder="e.g. Talent Acquisition Manager"
                  value={formData.position}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Company Selection/Creation */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Company Information</h3>
                {!loadingCompanies && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateNewCompany(!createNewCompany)}
                  >
                    {createNewCompany ? (
                      companies.length > 0 ? "Select Existing" : "Back"
                    ) : (
                      "Create New Company"
                    )}
                  </Button>
                )}
              </div>

              {loadingCompanies ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Loading companies...
                </div>
              ) : !createNewCompany ? (
                <div className="space-y-2">
                  <label htmlFor="companyId" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Select Company *
                  </label>
                  {companies.length === 0 ? (
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 text-sm space-y-2">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        No companies available
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                        Click "Create New Company" button above to add your company
                      </p>
                    </div>
                  ) : (
                    <select
                      id="companyId"
                      name="companyId"
                      value={formData.companyId}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required={!createNewCompany}
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Name *
                    </label>
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      placeholder="TechCorp Inc."
                      value={formData.companyName}
                      onChange={handleChange}
                      required={createNewCompany}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyWebsite" className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website (Optional)
                    </label>
                    <Input
                      id="companyWebsite"
                      name="companyWebsite"
                      type="url"
                      placeholder="https://company.com"
                      value={formData.companyWebsite}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="companyIndustry" className="text-sm font-medium">
                        Industry (Optional)
                      </label>
                      <Input
                        id="companyIndustry"
                        name="companyIndustry"
                        type="text"
                        placeholder="Technology"
                        value={formData.companyIndustry}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="companyCity" className="text-sm font-medium">
                        City (Optional)
                      </label>
                      <Input
                        id="companyCity"
                        name="companyCity"
                        type="text"
                        placeholder="San Francisco"
                        value={formData.companyCity}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyCountry" className="text-sm font-medium">
                      Country (Optional)
                    </label>
                    <Input
                      id="companyCountry"
                      name="companyCountry"
                      type="text"
                      placeholder="United States"
                      value={formData.companyCountry}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                    💡 You will be the primary recruiter for this company
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || loadingCompanies}
              >
                {loading ? "Registering..." : createNewCompany ? "Create Account & Company" : "Create Recruiter Account"}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate("/login")}
                >
                  Login here
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default RecruiterRegister;
