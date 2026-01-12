import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Globe, 
  Linkedin, 
  Github, 
  FileText, 
  MapPin, 
  Calendar, 
  Loader2,
  Eye,
  Mail,
  Phone,
  Download
} from "lucide-react";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { getCurrentUser } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

// Function to download profile as PDF with enhanced color rendering
const downloadProfileAsPDF = async (fullName: string) => {
  try {
    // Dynamic import html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    
    const element = document.getElementById('profile-content');
    if (!element) {
      alert('Không tìm thấy nội dung profile để tải xuống');
      return;
    }

    // Add print styles to ensure colors are preserved
    const printStyle = document.createElement('style');
    printStyle.id = 'pdf-print-styles';
    printStyle.textContent = `
      #profile-content * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    `;
    if (!document.getElementById('pdf-print-styles')) {
      document.head.appendChild(printStyle);
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `${fullName.replace(/\s+/g, '_')}_Profile.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 1.0  // Maximum quality
      },
      html2canvas: { 
        scale: 3,  // Higher scale for better quality and colors
        useCORS: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#ffffff',
        removeContainer: false,
        allowTaint: true,
        foreignObjectRendering: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc: Document) => {
          // Force all colors to be preserved in the cloned document
          const clonedElement = clonedDoc.getElementById('profile-content');
          if (clonedElement) {
            // Apply color preservation to all elements
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const computedStyle = window.getComputedStyle(el as Element);
              
              // Preserve all color-related styles
              htmlEl.style.color = computedStyle.color;
              htmlEl.style.backgroundColor = computedStyle.backgroundColor;
              
              // Preserve border colors
              if (computedStyle.borderColor && computedStyle.borderColor !== 'rgba(0, 0, 0, 0)') {
                htmlEl.style.borderColor = computedStyle.borderColor;
              }
              
              // Preserve gradient backgrounds by converting to solid colors where possible
              const bgImage = computedStyle.backgroundImage;
              if (bgImage && bgImage !== 'none') {
                // Keep gradient if it's a linear gradient
                htmlEl.style.backgroundImage = bgImage;
              }
              
              // Ensure text colors are preserved
              htmlEl.style.webkitPrintColorAdjust = 'exact';
              htmlEl.style.printColorAdjust = 'exact';
              htmlEl.style.colorAdjust = 'exact';
            });
          }
        }
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: false  // Don't compress to maintain quality
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: ['.border-b', 'section', 'h2', 'h3']
      }
    };

    await html2pdf().set(opt).from(element).save();
    
    // Cleanup
    if (document.getElementById('pdf-print-styles')) {
      document.head.removeChild(printStyle);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback: Use browser print
    window.print();
  }
};

type CandidateSkill = { id: string; skillId: string; level?: string | null; skill?: { id: string; name: string } };
type Experience = {
  id: string;
  companyName: string;
  position: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
};

type Education = {
  id: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  technologies?: string[];
};

type CandidateProfile = {
  id: string;
  isPublic: boolean;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  address?: string | null;
  cvUrl?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    notificationEmail?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  };
  skills?: CandidateSkill[];
  experiences?: Experience[];
  educations?: Education[];
  projects?: Project[];
};

export default function CandidatePublicProfile() {
  const { candidateProfileId } = useParams();
  const { getToken } = useAuth();
  const staffUser = getCurrentUser();
  const isStaff = staffUser?.role === "ADMIN" || staffUser?.role === "RECRUITER";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [canView, setCanView] = useState<boolean>(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fullName = useMemo(() => {
    const fn = profile?.user?.firstName ?? "";
    const ln = profile?.user?.lastName ?? "";
    const name = `${fn} ${ln}`.trim();
    return name || "Candidate";
  }, [profile]);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!candidateProfileId) return;
      try {
        setLoading(true);
        setError(null);

        // Permission rule:
        // - Staff (admin/recruiter) can view any published profile via public endpoint.
        // - Candidates can only view their OWN profile (self preview).
        let allow = false;
        if (isStaff) {
          allow = true;
        } else {
          const token = await getToken().catch(() => null);
          if (token) {
            const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
            const meJson = await meRes.json().catch(() => null);
            const myId = String(meJson?.candidateProfile?.id || "");
            allow = Boolean(myId && myId === String(candidateProfileId));
          }
        }
        if (abort) return;
        setCanView(Boolean(allow));
        if (!allow) {
          setError("Profile unavailable");
          setProfile(null);
          return;
        }

        const res = await fetch(`${API_BASE}/public/candidate-profiles/${encodeURIComponent(candidateProfileId)}`);
        const json = await res.json();
        if (abort) return;
        if (!json?.success) {
          setError(json?.message || "Profile not found");
          setProfile(null);
          return;
        }
        setProfile(json.data as CandidateProfile);
      } catch {
        if (abort) return;
        setError("Failed to load profile");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => {
      abort = true;
    };
  }, [candidateProfileId, getToken, isStaff]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-white dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-sm text-muted-foreground">Loading profile…</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!canView || error || !profile) {
    return (
      <main className="min-h-dvh bg-white dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-12 space-y-4 text-center">
              <div className="text-sm text-red-600 dark:text-red-400">{error || "Profile not found or not available"}</div>
              <div className="flex gap-2 justify-center">
                <SignedOut>
                  <Button variant="outline" onClick={() => (window.location.href = "/login")}>
                    Login
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button variant="outline" onClick={() => (window.location.href = "/candidate/profile")}>
                    Back to Profile
                  </Button>
                </SignedIn>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const skills = profile.skills || [];
  const experiences = profile.experiences || [];
  const sortedExperiences = [...experiences].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const educations = profile.educations || [];
  const sortedEducations = [...educations].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const projects = profile.projects || [];
  const sortedProjects = [...projects].sort((a, b) => {
    const aDate = a.startDate || "";
    const bDate = b.startDate || "";
    return aDate < bDate ? 1 : -1;
  });

  return (
    <main className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8 print:py-0 print:bg-white">
      <div className="container mx-auto px-4 max-w-4xl print:max-w-full print:px-8">
        {/* CV Document */}
        <Card id="profile-content" className="border border-gray-200 dark:border-gray-800 shadow-xl print:shadow-none bg-white dark:bg-gray-900 overflow-hidden relative">
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 print:hidden"></div>
          <CardContent className="p-6 print:p-4 space-y-5 relative">
            {/* Header - CV Style */}
            <div className="border-b border-gray-200 dark:border-gray-800 pb-5 mb-5">
              <div className="flex items-start justify-between gap-6 mb-4">
                {/* Avatar and Name Section */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  {profile.user?.avatarUrl ? (
                    <div className="relative flex-shrink-0 group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity blur-sm print:hidden"></div>
                      <img
                        src={profile.user.avatarUrl}
                        alt={`${fullName} avatar`}
                        className="relative h-20 w-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700 shadow-md group-hover:shadow-lg transition-all print:h-16 print:w-16"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow print:h-16 print:w-16">
                      <div className="text-xl font-semibold text-white print:text-lg">
                        {(fullName || "C")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((s) => s[0]?.toUpperCase())
                          .join("")}
                      </div>
                    </div>
                  )}
                  
                  {/* Name and Headline */}
                  <div className="flex-1 pt-0.5">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 print:text-xl">
                      {fullName}
                    </h1>
                    {profile.headline && (
                      <p className="text-base text-gray-600 dark:text-gray-400 font-medium mb-2 print:text-sm">
                        {profile.headline}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 print:hidden">
                  <Badge variant="outline" className="gap-1.5 px-2 py-1 text-xs">
                    <Eye className="h-3 w-3" />
                    Public Profile
                  </Badge>
                  <div className="flex gap-1.5">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5 h-8 text-xs px-3"
                      onClick={async () => {
                        setDownloadingPDF(true);
                        try {
                          await downloadProfileAsPDF(fullName);
                        } catch (error) {
                          console.error('Failed to download PDF:', error);
                          alert('Không thể tải xuống PDF. Vui lòng thử lại.');
                        } finally {
                          setDownloadingPDF(false);
                        }
                      }}
                      disabled={downloadingPDF}
                    >
                      {downloadingPDF ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Đang tạo PDF...
                        </>
                      ) : (
                        <>
                          <FileText className="h-3 w-3" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                  {profile.cvUrl && (
                    <a
                      href={profile.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200/50 dark:border-orange-800/50 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/50 dark:hover:to-amber-900/50 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm transition-all group"
                    >
                      <div className="p-1 rounded-md bg-orange-500/10 dark:bg-orange-400/10 group-hover:bg-orange-500/20 dark:group-hover:bg-orange-400/20 transition-colors">
                        <FileText className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                        View Resume
                      </span>
                    </a>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                {/* Contact Details: Email, Phone, Address - Enhanced styling */}
                {(profile.user?.notificationEmail || profile.user?.email || profile.user?.phone || profile.address) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {profile.user?.notificationEmail && (
                      <a 
                        href={`mailto:${profile.user.notificationEmail}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/50 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group"
                      >
                        <div className="p-1.5 rounded-md bg-blue-500/10 dark:bg-blue-400/10 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20 transition-colors">
                          <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          {profile.user.notificationEmail}
                        </span>
                      </a>
                    )}
                    {profile.user?.email && profile.user.email !== profile.user?.notificationEmail && (
                      <a 
                        href={`mailto:${profile.user.email}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/50 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all group"
                      >
                        <div className="p-1.5 rounded-md bg-indigo-500/10 dark:bg-indigo-400/10 group-hover:bg-indigo-500/20 dark:group-hover:bg-indigo-400/20 transition-colors">
                          <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                          {profile.user.email}
                        </span>
                      </a>
                    )}
                    {profile.user?.phone && (
                      <a 
                        href={`tel:${profile.user.phone}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-800/50 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/50 dark:hover:to-pink-900/50 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all group"
                      >
                        <div className="p-1.5 rounded-md bg-purple-500/10 dark:bg-purple-400/10 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-400/20 transition-colors">
                          <Phone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {profile.user.phone}
                        </span>
                      </a>
                    )}
                    {profile.address && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-800/50 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm transition-all group">
                        <div className="p-1.5 rounded-md bg-green-500/10 dark:bg-green-400/10 group-hover:bg-green-500/20 dark:group-hover:bg-green-400/20 transition-colors">
                          <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {profile.address}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Social Links: Website, LinkedIn, GitHub - No header, subtle styling */}
                {(profile.website || profile.linkedin || profile.github) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {profile.website && (
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all group"
                      >
                        <Globe className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                      </a>
                    )}
                    {profile.linkedin && (
                      <a 
                        href={profile.linkedin} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all group"
                      >
                        <Linkedin className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          LinkedIn
                        </span>
                      </a>
                    )}
                    {profile.github && (
                      <a 
                        href={profile.github} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all group"
                      >
                        <Github className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                          GitHub
                        </span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {profile.bio && (
              <section className="mb-5">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </section>
            )}

            {/* Experience */}
            {sortedExperiences.length > 0 && (
              <section className="mb-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-1.5 border-b border-amber-200 dark:border-amber-800 print:text-sm print:border-gray-300">
                  Professional Experience
                </h2>
                <div className="space-y-3">
                  {sortedExperiences.map((exp, idx) => (
                    <div key={exp.id} className="relative pl-6 border-l-2 border-amber-300 dark:border-amber-700 pb-4 last:pb-0 group hover:border-amber-400 dark:hover:border-amber-600 transition-colors">
                      <div className="absolute -left-2.5 top-0 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white dark:border-gray-900 shadow-sm group-hover:scale-110 transition-all print:h-2 print:w-2 print:border-gray-300"></div>
                      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50/40 via-orange-50/20 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 border border-amber-100 dark:border-amber-900/30 hover:shadow-sm hover:border-amber-200 dark:hover:border-amber-800 transition-all print:bg-transparent print:border-0 print:p-0">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5 print:text-xs">
                              {exp.position}
                            </h3>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 print:text-xs">
                              {exp.companyName}
                            </p>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-medium print:text-xs">
                            {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                            {exp.isCurrent || !exp.endDate ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold shadow-sm">Present</span>
                            ) : (
                              new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            )}
                          </div>
                        </div>
                        {exp.location && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1 print:text-xs">
                            <MapPin className="h-3 w-3 text-amber-500" />
                            {exp.location}
                          </p>
                        )}
                        {exp.description && (
                          <ul className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-1 mt-2 print:text-xs">
                            {exp.description.split('\n').filter(Boolean).map((line, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="text-amber-500 dark:text-amber-400 mt-1.5 font-bold">•</span>
                                <span className="flex-1">{line.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {sortedEducations.length > 0 && (
              <section className="mb-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-1.5 border-b border-purple-200 dark:border-purple-800 print:text-sm print:border-gray-300">
                  Education
                </h2>
                <div className="space-y-3">
                  {sortedEducations.map((edu, idx) => (
                    <div key={edu.id} className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-50/40 via-pink-50/20 to-transparent dark:from-purple-950/20 dark:via-pink-950/10 border border-purple-100 dark:border-purple-900/30 hover:shadow-sm hover:border-purple-200 dark:hover:border-purple-800 transition-all print:bg-transparent print:border-0 print:p-0">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5 print:text-xs">
                          {edu.institution}
                        </h3>
                        {(edu.degree || edu.fieldOfStudy) && (
                          <p className="text-xs text-purple-700 dark:text-purple-400 font-medium print:text-xs print:text-gray-700">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {edu.grade && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 font-medium print:text-xs print:bg-transparent print:p-0">
                            Grade: {edu.grade}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-medium print:text-xs">
                        {new Date(edu.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                        {edu.endDate ? new Date(edu.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Present"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {sortedProjects.length > 0 && (
              <section className="mb-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-1.5 border-b border-cyan-200 dark:border-cyan-800 print:text-sm print:border-gray-300">
                  Projects
                </h2>
                <div className="space-y-3">
                  {sortedProjects.map((proj, idx) => (
                    <div key={proj.id} className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-cyan-50/40 via-teal-50/20 to-transparent dark:from-cyan-950/20 dark:via-teal-950/10 border border-cyan-100 dark:border-cyan-900/30 hover:shadow-sm hover:border-cyan-200 dark:hover:border-cyan-800 transition-all print:bg-transparent print:border-0 print:p-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white print:text-xs">
                            {proj.name}
                          </h3>
                          {proj.url && (
                            <a href={proj.url} target="_blank" rel="noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors print:hidden">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-1.5 print:text-xs">
                            {proj.description}
                          </p>
                        )}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {proj.technologies.map((tech) => (
                              <Badge key={tech} variant="outline" className="text-xs px-1.5 py-0.5 border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 print:text-[10px] print:border-gray-300 print:bg-transparent">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {proj.startDate && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-medium print:text-xs">
                          {new Date(proj.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                          {proj.isCurrent || !proj.endDate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold shadow-sm">Ongoing</span>
                          ) : (
                            new Date(proj.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <section className="mb-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-1.5 border-b border-emerald-200 dark:border-emerald-800 print:text-sm print:border-gray-300">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s, idx) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className="text-xs px-2 py-1 font-medium border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all print:text-xs print:border-gray-300 print:bg-transparent"
                    >
                      {s.skill?.name || s.skillId}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
