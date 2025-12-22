import { SignedIn, SignedOut, RedirectToSignIn, useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  User, 
  Save, 
  Globe, 
  Linkedin, 
  Github, 
  FileText, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Edit, 
  Trash2, 
  Plus,
  CheckCircle2,
  Eye,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  GraduationCap,
  Code,
  ExternalLink
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

type SkillOption = { id: string; name: string };

type CandidateSkill = {
  id: string;
  skillId: string;
  level?: string | null;
  skill?: { id: string; name: string };
};

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
  userId: string;
  isPublic?: boolean;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  address?: string | null;
  cvUrl?: string | null;
  skills?: CandidateSkill[];
  experiences?: Experience[];
  educations?: Education[];
  projects?: Project[];
};

export default function Profile({ embedded }: { embedded?: boolean }) {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Section-specific errors
  const [aboutError, setAboutError] = useState<string | null>(null);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [educationError, setEducationError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [user, setUser] = useState<{ firstName?: string | null; lastName?: string | null; email?: string } | null>(null);
  const [skills, setSkills] = useState<SkillOption[]>([]);

  // Draft form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [address, setAddress] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [initialSkillIds, setInitialSkillIds] = useState<string[]>([]);
  const [savingName, setSavingName] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState<"experience" | "education" | "project" | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  // Unsaved changes detection
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const initialFormDataRef = useRef<{
    headline: string;
    bio: string;
    website: string;
    linkedin: string;
    github: string;
    address: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  // Experience form
  const [expEditingId, setExpEditingId] = useState<string | null>(null);
  const [expCompanyName, setExpCompanyName] = useState("");
  const [expPosition, setExpPosition] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expStartDate, setExpStartDate] = useState("");
  const [expEndDate, setExpEndDate] = useState("");
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState("");
  const [expSaving, setExpSaving] = useState(false);

  // Education form
  const [eduEditingId, setEduEditingId] = useState<string | null>(null);
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduFieldOfStudy, setEduFieldOfStudy] = useState("");
  const [eduStartDate, setEduStartDate] = useState("");
  const [eduEndDate, setEduEndDate] = useState("");
  const [eduGrade, setEduGrade] = useState("");
  const [eduSaving, setEduSaving] = useState(false);

  // Project form
  const [projEditingId, setProjEditingId] = useState<string | null>(null);
  const [projName, setProjName] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projStartDate, setProjStartDate] = useState("");
  const [projEndDate, setProjEndDate] = useState("");
  const [projIsCurrent, setProjIsCurrent] = useState(false);
  const [projTechnologies, setProjTechnologies] = useState<string[]>([]);
  const [projTechInput, setProjTechInput] = useState("");
  const [projSaving, setProjSaving] = useState(false);

  // Modal states
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);

  const skillNameById = useMemo(() => {
    const m = new Map<string, string>();
    skills.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [skills]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setAboutError(null);
        setExperienceError(null);
        setEducationError(null);
        setProjectError(null);
        setNameError(null);
        const token = await getToken();
        if (!token) return;

        const [meRes, skillsRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/skills?pageSize=200`),
        ]);
        
        if (!meRes.ok) {
          const errorData = await meRes.json().catch(() => ({ message: "Failed to fetch profile" }));
          setAboutError(errorData.message || "Failed to fetch profile");
          return;
        }
        
        const me = await meRes.json();
        const skillsJson = await skillsRes.json();
        if (cancelled) return;

        if (!me?.success) {
          setAboutError(me?.message || "Failed to load profile");
          return;
        }

        // Check if user is not a candidate
        if (me?.role !== "CANDIDATE") {
          setAboutError("This page is only available for candidates.");
          return;
        }
        
        // Store user data from database
        setUser({
          firstName: me.firstName,
          lastName: me.lastName,
          email: me.email,
        });
        
        // Set name fields for editing
        setFirstName(me.firstName || "");
        setLastName(me.lastName || "");
        
        const cp = me?.candidateProfile as CandidateProfile | undefined;
        if (!cp?.id) {
          setAboutError("Candidate profile not found. Please refresh and try again.");
          return;
        }
        setProfile(cp);

        setSkills((skillsJson?.data || []).map((r: { id: string | number; name?: string | null }) => ({ id: String(r.id), name: String(r.name ?? r.id) })));

        setHeadline(cp.headline ?? "");
        setBio(cp.bio ?? "");
        setWebsite(cp.website ?? "");
        setLinkedin(cp.linkedin ?? "");
        setGithub(cp.github ?? "");
        setAddress(cp.address ?? "");
        setCvUrl(cp.cvUrl ?? "");
        setIsPublic(Boolean(cp.isPublic));
        const ids = (cp.skills || [])
          .map((cs) => cs.skillId || cs.skill?.id)
          .filter((v): v is string => Boolean(v));
        setSelectedSkillIds(ids);
        setInitialSkillIds(ids);

        // Store initial form data for unsaved changes detection
        initialFormDataRef.current = {
          headline: cp.headline ?? "",
          bio: cp.bio ?? "",
          website: cp.website ?? "",
          linkedin: cp.linkedin ?? "",
          github: cp.github ?? "",
          address: cp.address ?? "",
          firstName: me.firstName || "",
          lastName: me.lastName || "",
        };

        // Clear forms on load
        setExpEditingId(null);
        setExpCompanyName("");
        setExpPosition("");
        setExpLocation("");
        setExpStartDate("");
        setExpEndDate("");
        setExpIsCurrent(false);
        setExpDescription("");

        setEduEditingId(null);
        setEduInstitution("");
        setEduDegree("");
        setEduFieldOfStudy("");
        setEduStartDate("");
        setEduEndDate("");
        setEduGrade("");

        setProjEditingId(null);
        setProjName("");
        setProjDescription("");
        setProjUrl("");
        setProjStartDate("");
        setProjEndDate("");
        setProjIsCurrent(false);
        setProjTechnologies([]);
        setProjTechInput("");
      } catch (err) {
        console.error("Failed to load profile", err);
        setAboutError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const uploadCv = async (file: File): Promise<string | null> => {
    try {
      setCvUploading(true);
      setCvUploadError(null);

      const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowed.includes(file.type)) {
        setCvUploadError("Only PDF, DOC, and DOCX are allowed.");
        return null;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setCvUploadError("File too large. Maximum size is 5MB.");
        return null;
      }

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE}/upload/resume`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!json?.success || !json?.url) {
        setCvUploadError(json?.message || "Failed to upload CV.");
        return null;
      }
      return String(json.url);
    } catch (e) {
      console.error(e);
      setCvUploadError("Failed to upload CV.");
      return null;
    } finally {
      setCvUploading(false);
    }
  };

  const handleUploadCv = async () => {
    if (!cvFile) {
      setCvUploadError("Please choose a file first.");
      return;
    }
    const url = await uploadCv(cvFile);
    if (url) {
      setCvUrl(url);
      setCvFile(null);
      // Persist immediately so public profile can show CV without requiring an extra Save click.
      try {
        if (profile?.id) {
          const token = await getToken();
          if (token) {
            const res = await fetch(`${API_BASE}/candidate-profiles/${encodeURIComponent(profile.id)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ cvUrl: url }),
            });
            const json = await res.json().catch(() => null);
            if (!json?.success) {
              setCvUploadError(json?.message || "Uploaded CV, but failed to save to profile. Please click Save.");
            }
          }
        }
      } catch (e) {
        console.error(e);
        setCvUploadError("Uploaded CV, but failed to save to profile. Please click Save.");
      }
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) => (prev.includes(skillId) ? prev.filter((v) => v !== skillId) : [...prev, skillId]));
  };

  const handleSaveSkills = async () => {
    if (!profile) return;
    try {
      setSavingSkills(true);
      setSkillsError(null);
      const token = await getToken();
      if (!token) return;

      await syncCandidateSkills(token, profile.id);

      // Refresh from /auth/me to reflect includes
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const me = await meRes.json();
      if (me?.success && me?.candidateProfile) {
        setProfile(me.candidateProfile as CandidateProfile);
        const ids = (me.candidateProfile.skills || [])
          .map((s: CandidateSkill) => String(s.skillId || s.skill?.id))
          .filter((v: string | undefined): v is string => Boolean(v));
        setSelectedSkillIds(ids);
        setInitialSkillIds(ids);
      }
    } catch (err) {
      console.error("Save skills failed", err);
      setSkillsError("Failed to save skills");
    } finally {
      setSavingSkills(false);
    }
  };

  const syncCandidateSkills = async (token: string, candidateId: string) => {
    const existingRes = await fetch(`${API_BASE}/candidate-skills?candidateId=${candidateId}&pageSize=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existingJson = await existingRes.json();
    const existing: CandidateSkill[] = existingJson?.data || [];

    const existingBySkillId = new Map(existing.map((cs) => [String(cs.skillId), cs]));

    // delete removed
    await Promise.all(
      existing
        .filter((cs) => !selectedSkillIds.includes(String(cs.skillId)))
        .map((cs) =>
          fetch(`${API_BASE}/candidate-skills/${encodeURIComponent(String(cs.id))}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
    );

    // add new
    await Promise.all(
      selectedSkillIds
        .filter((sid) => !existingBySkillId.has(String(sid)))
        .map((sid) =>
          fetch(`${API_BASE}/candidate-skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ candidateId, skillId: sid, level: null }),
          })
        )
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setAboutError(null);
      const token = await getToken();
      if (!token) return;

      const payload = {
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        linkedin: linkedin.trim() || null,
        github: github.trim() || null,
        address: address.trim() || null,
        cvUrl: cvUrl.trim() || null,
        isPublic,
      };

      const res = await fetch(`${API_BASE}/candidate-profiles/${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const updatedJson = await res.json();
      if (!updatedJson?.success) {
        setAboutError(updatedJson?.message || "Failed to save profile");
        return;
      }

      await syncCandidateSkills(token, profile.id);

      // Refresh from /auth/me to reflect includes
      const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const me = await meRes.json();
      if (me?.success && me?.candidateProfile) {
        setProfile(me.candidateProfile as CandidateProfile);
        
        // Update initial form data after successful save
        if (initialFormDataRef.current) {
          initialFormDataRef.current = {
            headline: headline.trim() || "",
            bio: bio.trim() || "",
            website: website.trim() || "",
            linkedin: linkedin.trim() || "",
            github: github.trim() || "",
            address: address.trim() || "",
            firstName: firstName.trim() || "",
            lastName: lastName.trim() || "",
          };
        }
      }
    } catch (err) {
      console.error("Save profile failed", err);
      setAboutError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    return (
      headline.trim() !== initial.headline ||
      bio.trim() !== initial.bio ||
      website.trim() !== initial.website ||
      linkedin.trim() !== initial.linkedin ||
      github.trim() !== initial.github ||
      address.trim() !== initial.address ||
      firstName.trim() !== initial.firstName ||
      lastName.trim() !== initial.lastName ||
      expEditingId !== null ||
      eduEditingId !== null ||
      projEditingId !== null
    );
  }, [headline, bio, website, linkedin, github, address, firstName, lastName, expEditingId, eduEditingId, projEditingId]);

  // Handle browser navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    console.log("handleDeleteConfirm called", { deleteConfirmId, deleteConfirmType });
    if (!deleteConfirmId || !deleteConfirmType) {
      console.log("Missing deleteConfirmId or deleteConfirmType");
      return;
    }
    
    if (deleteConfirmType === "experience") {
      await deleteExperience(deleteConfirmId);
    } else if (deleteConfirmType === "education") {
      await deleteEducation(deleteConfirmId);
    } else if (deleteConfirmType === "project") {
      await deleteProject(deleteConfirmId);
    }
  };

  const getDeleteConfirmTitle = () => {
    if (deleteConfirmType === "experience") return "Delete Experience?";
    if (deleteConfirmType === "education") return "Delete Education?";
    if (deleteConfirmType === "project") return "Delete Project?";
    return "Are you sure?";
  };

  const getDeleteConfirmDescription = () => {
    if (deleteConfirmType === "experience") return "This experience entry will be permanently deleted. This action cannot be undone.";
    if (deleteConfirmType === "education") return "This education entry will be permanently deleted. This action cannot be undone.";
    if (deleteConfirmType === "project") return "This project entry will be permanently deleted. This action cannot be undone.";
    return "This action cannot be undone.";
  };

  const refreshFromMe = async () => {
    const token = await getToken();
    if (!token) return;
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = await meRes.json();
    if (me?.success && me?.candidateProfile) {
      setProfile(me.candidateProfile as CandidateProfile);
    }
  };

  const resetExperienceForm = () => {
    setExpEditingId(null);
    setExpCompanyName("");
    setExpPosition("");
    setExpLocation("");
    setExpStartDate("");
    setExpEndDate("");
    setExpIsCurrent(false);
    setExpDescription("");
    setExpModalOpen(false);
  };

  const startEditExperience = (exp: Experience) => {
    setExpEditingId(exp.id);
    setExpCompanyName(exp.companyName);
    setExpPosition(exp.position);
    setExpLocation(exp.location ?? "");
    setExpStartDate(exp.startDate ? exp.startDate.slice(0, 10) : "");
    setExpEndDate(exp.endDate ? exp.endDate.slice(0, 10) : "");
    setExpIsCurrent(Boolean(exp.isCurrent) || !exp.endDate);
    setExpDescription(exp.description ?? "");
    setExpModalOpen(true);
  };

  const saveExperience = async () => {
    if (!profile) return;
    if (!expCompanyName.trim() || !expPosition.trim() || !expStartDate) {
      setExperienceError("Company, position, and start date are required.");
      return;
    }
    try {
      setExpSaving(true);
      setExperienceError(null);
      const token = await getToken();
      if (!token) return;

      const payload = {
        companyName: expCompanyName.trim(),
        position: expPosition.trim(),
        location: expLocation.trim() || null,
        startDate: expStartDate,
        endDate: expIsCurrent ? null : expEndDate || null,
        isCurrent: expIsCurrent,
        description: expDescription.trim() || null,
      };

      const url = expEditingId ? `${API_BASE}/auth/experience/${encodeURIComponent(expEditingId)}` : `${API_BASE}/auth/experience`;
      const method = expEditingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setExperienceError(data?.message || "Failed to save experience");
        return;
      }
      await refreshFromMe();
      resetExperienceForm();
      setExpModalOpen(false);
    } catch (err) {
      console.error("Save experience failed", err);
      setExperienceError("Failed to save experience");
    } finally {
      setExpSaving(false);
    }
  };

  const handleDeleteExperience = (id: string) => {
    console.log("handleDeleteExperience called with id:", id);
    setDeleteConfirmType("experience");
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
    console.log("deleteConfirmOpen set to true, deleteConfirmType:", "experience", "deleteConfirmId:", id);
  };

  const deleteExperience = async (id: string) => {
    try {
      setDeleteConfirmLoading(true);
      setExperienceError(null);
      const token = await getToken();
      if (!token) {
        setDeleteConfirmLoading(false);
        setDeleteConfirmOpen(false);
        setDeleteConfirmType(null);
        setDeleteConfirmId(null);
        return;
      }
      const res = await fetch(`${API_BASE}/auth/experience/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data?.success) {
        setExperienceError(data?.message || "Failed to delete experience");
        setDeleteConfirmLoading(false);
        setDeleteConfirmOpen(false);
        setDeleteConfirmType(null);
        setDeleteConfirmId(null);
        return;
      }
      await refreshFromMe();
      if (expEditingId === id) resetExperienceForm();
    } catch (err) {
      console.error("Delete experience failed", err);
      setExperienceError("Failed to delete experience");
    } finally {
      setDeleteConfirmLoading(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmType(null);
      setDeleteConfirmId(null);
    }
  };

  // Education functions
  const resetEducationForm = () => {
    setEduEditingId(null);
    setEduInstitution("");
    setEduDegree("");
    setEduFieldOfStudy("");
    setEduStartDate("");
    setEduEndDate("");
    setEduGrade("");
    setEduModalOpen(false);
  };

  const startEditEducation = (edu: Education) => {
    setEduEditingId(edu.id);
    setEduInstitution(edu.institution);
    setEduDegree(edu.degree ?? "");
    setEduFieldOfStudy(edu.fieldOfStudy ?? "");
    setEduStartDate(edu.startDate ? edu.startDate.slice(0, 10) : "");
    setEduEndDate(edu.endDate ? edu.endDate.slice(0, 10) : "");
    setEduGrade(edu.grade ?? "");
    setEduModalOpen(true);
  };

  const saveEducation = async () => {
    if (!profile) return;
    if (!eduInstitution.trim() || !eduStartDate) {
      setEducationError("Institution and start date are required.");
      return;
    }
    try {
      setEduSaving(true);
      setEducationError(null);
      const token = await getToken();
      if (!token) return;

      const payload = {
        institution: eduInstitution.trim(),
        degree: eduDegree.trim() || null,
        fieldOfStudy: eduFieldOfStudy.trim() || null,
        startDate: eduStartDate,
        endDate: eduEndDate || null,
        grade: eduGrade.trim() || null,
      };

      const url = eduEditingId ? `${API_BASE}/auth/education/${encodeURIComponent(eduEditingId)}` : `${API_BASE}/auth/education`;
      const method = eduEditingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setEducationError(data?.message || "Failed to save education");
        return;
      }
      await refreshFromMe();
      resetEducationForm();
      setEduModalOpen(false);
    } catch (err) {
      console.error("Save education failed", err);
      setEducationError("Failed to save education");
    } finally {
      setEduSaving(false);
    }
  };

  const handleDeleteEducation = (id: string) => {
    console.log("handleDeleteEducation called with id:", id);
    setDeleteConfirmType("education");
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
  };

  const deleteEducation = async (id: string) => {
    try {
      setDeleteConfirmLoading(true);
      setEducationError(null);
      const token = await getToken();
      if (!token) {
        setDeleteConfirmLoading(false);
        setDeleteConfirmOpen(false);
        setDeleteConfirmType(null);
        setDeleteConfirmId(null);
        return;
      }
      const res = await fetch(`${API_BASE}/auth/education/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data?.success) {
        setEducationError(data?.message || "Failed to delete education");
        setDeleteConfirmLoading(false);
        setDeleteConfirmOpen(false);
        setDeleteConfirmType(null);
        setDeleteConfirmId(null);
        return;
      }
      await refreshFromMe();
      if (eduEditingId === id) resetEducationForm();
    } catch (err) {
      console.error("Delete education failed", err);
      setEducationError("Failed to delete education");
    } finally {
      setDeleteConfirmLoading(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmType(null);
      setDeleteConfirmId(null);
    }
  };

  // Project functions
  const resetProjectForm = () => {
    setProjEditingId(null);
    setProjName("");
    setProjDescription("");
    setProjUrl("");
    setProjStartDate("");
    setProjEndDate("");
    setProjIsCurrent(false);
    setProjTechnologies([]);
    setProjTechInput("");
    setProjModalOpen(false);
  };

  const startEditProject = (proj: Project) => {
    setProjEditingId(proj.id);
    setProjName(proj.name);
    setProjDescription(proj.description ?? "");
    setProjUrl(proj.url ?? "");
    setProjStartDate(proj.startDate ? proj.startDate.slice(0, 10) : "");
    setProjEndDate(proj.endDate ? proj.endDate.slice(0, 10) : "");
    setProjIsCurrent(Boolean(proj.isCurrent) || !proj.endDate);
    setProjTechnologies(proj.technologies || []);
    setProjModalOpen(true);
  };

  const addTechnology = () => {
    const tech = projTechInput.trim();
    if (tech && !projTechnologies.includes(tech)) {
      setProjTechnologies([...projTechnologies, tech]);
      setProjTechInput("");
    }
  };

  const removeTechnology = (tech: string) => {
    setProjTechnologies(projTechnologies.filter((t) => t !== tech));
  };

  const saveProject = async () => {
    if (!profile) return;
    if (!projName.trim()) {
      setProjectError("Project name is required.");
      return;
    }
    try {
      setProjSaving(true);
      setProjectError(null);
      const token = await getToken();
      if (!token) return;

      const payload = {
        name: projName.trim(),
        description: projDescription.trim() || null,
        url: projUrl.trim() || null,
        startDate: projStartDate || null,
        endDate: projIsCurrent ? null : (projEndDate || null),
        isCurrent: projIsCurrent,
        technologies: projTechnologies,
      };

      const url = projEditingId ? `${API_BASE}/auth/project/${encodeURIComponent(projEditingId)}` : `${API_BASE}/auth/project`;
      const method = projEditingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setProjectError(data?.message || "Failed to save project");
        return;
      }
      await refreshFromMe();
      resetProjectForm();
      setProjModalOpen(false);
    } catch (err) {
      console.error("Save project failed", err);
      setProjectError("Failed to save project");
    } finally {
      setProjSaving(false);
    }
  };

  const handleDeleteProject = (id: string) => {
    console.log("handleDeleteProject called with id:", id);
    setDeleteConfirmType("project");
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
  };

  const deleteProject = async (id: string) => {
    try {
      setDeleteConfirmLoading(true);
      setProjectError(null);
      const token = await getToken();
      if (!token) {
        setDeleteConfirmLoading(false);
        setDeleteConfirmOpen(false);
        setDeleteConfirmType(null);
        setDeleteConfirmId(null);
        return;
      }
      const res = await fetch(`${API_BASE}/auth/project/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data?.success) {
        setProjectError(data?.message || "Failed to delete project");
        setDeleteConfirmLoading(false);
        setDeleteConfirmOpen(false);
        setDeleteConfirmType(null);
        setDeleteConfirmId(null);
        return;
      }
      await refreshFromMe();
      if (projEditingId === id) resetProjectForm();
    } catch (err) {
      console.error("Delete project failed", err);
      setProjectError("Failed to delete project");
    } finally {
      setDeleteConfirmLoading(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmType(null);
      setDeleteConfirmId(null);
    }
  };

  const content = (
    <div className={`space-y-6 pb-24 ${embedded ? 'px-4 md:px-6 lg:px-8 pt-6' : ''}`}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {clerkUser?.imageUrl ? (
            <div className="relative">
              <img 
                src={clerkUser.imageUrl} 
                alt="avatar" 
                className="h-16 w-16 rounded-full object-cover border-4 border-primary/20 shadow-lg" 
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background"></div>
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center border-4 border-primary/20 shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || "My Profile"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your professional profile and CV</p>
          </div>
        </div>
        
        {/* Public Profile Toggle - Compact */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">Profile Visibility</span>
              <span className={`text-xs transition-colors ${
                isPublic ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
              }`}>
                {isPublic ? "Visible to recruiters" : "Only you can see"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label="Toggle profile visibility"
              onClick={() => setIsPublic((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isPublic 
                  ? "bg-green-500 hover:bg-green-600 focus:ring-green-500 shadow-lg shadow-green-500/50" 
                  : "bg-muted hover:bg-muted/80 focus:ring-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                  isPublic ? "translate-x-6 scale-110" : "translate-x-1"
                }`}
              >
                {isPublic && (
                  <Eye className="h-3 w-3 text-green-600 absolute inset-0 m-auto animate-in fade-in duration-200" />
                )}
              </span>
            </button>
          </div>
          {isPublic && (
            <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <Eye className="h-3 w-3 mr-1 animate-pulse" />
              Public
            </Badge>
          )}
        </div>
      </div>

      {/* Public Profile Link - Show when public */}
      {isPublic && profile?.id && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <LinkIcon className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Public Profile Link:</div>
            <a 
              className="text-sm text-primary hover:underline break-all font-medium" 
              href={`/candidates/${profile.id}`} 
              target="_blank" 
              rel="noreferrer"
            >
              {window.location.origin}/candidates/{profile.id}
            </a>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const url = `${window.location.origin}/candidates/${profile.id}`;
              navigator.clipboard.writeText(url);
              alert("Link copied to clipboard!");
            }}
          >
            Copy
          </Button>
        </div>
      )}


      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">Loading profile...</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full">
          {/* Main Content */}
          <div className="space-y-6">
            {/* About Section */}
            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/30 via-background to-background dark:from-blue-950/10">
              <CardHeader className="border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-lg text-blue-700 dark:text-blue-400">About</CardTitle>
                </div>
                <CardDescription>Tell recruiters about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {aboutError && (
                  <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {aboutError}
                    </div>
                  </div>
                )}
                {/* Name Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Full Name
                    {(firstName === "Candidate" && lastName === "User") && (
                      <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
                        Please update
                      </Badge>
                    )}
                  </Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className={`bg-background ${firstName === "Candidate" && lastName === "User" ? "border-amber-300 focus:border-amber-500" : ""}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className={`bg-background ${firstName === "Candidate" && lastName === "User" ? "border-amber-300 focus:border-amber-500" : ""}`}
                      />
                    </div>
                  </div>
                  {(firstName === "Candidate" && lastName === "User") && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Please enter your real name to complete your profile
                    </p>
                  )}
                  {firstName !== user?.firstName || lastName !== user?.lastName ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!firstName.trim() || !lastName.trim()) {
                          setNameError("First name and last name are required");
                          return;
                        }
                        try {
                          setSavingName(true);
                          setNameError(null);
                          const token = await getToken();
                          if (!token) return;
                          
                          const res = await fetch(`${API_BASE}/auth/name`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setUser({ ...user, firstName: firstName.trim(), lastName: lastName.trim() });
                            // Refresh from /auth/me
                            const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
                            const me = await meRes.json();
                            if (me?.success) {
                              setUser({
                                firstName: me.firstName,
                                lastName: me.lastName,
                                email: me.email,
                              });
                            }
                          } else {
                            setNameError(data.message || "Failed to update name");
                          }
                        } catch (err) {
                          console.error("Update name failed", err);
                          setNameError("Failed to update name");
                        } finally {
                          setSavingName(false);
                        }
                      }}
                      disabled={savingName || !firstName.trim() || !lastName.trim()}
                      className="w-full md:w-auto"
                    >
                      {savingName ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-2" />
                          Save Name
                        </>
                      )}
                    </Button>
                  ) : null}
                  {nameError && (
                    <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {nameError}
                    </div>
                  )}
                </div>

                {/* Address Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Address
                  </Label>
                  <Input 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="e.g. Ho Chi Minh City, Vietnam" 
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Headline
                  </Label>
                  <Input 
                    value={headline} 
                    onChange={(e) => setHeadline(e.target.value)} 
                    placeholder="e.g. Frontend Engineer | React | TypeScript" 
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    rows={6} 
                    placeholder="A short summary about you, your experience, and what you're looking for..." 
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Website
                    </Label>
                    <Input 
                      value={website} 
                      onChange={(e) => setWebsite(e.target.value)} 
                      placeholder="https://yourwebsite.com" 
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-blue-600" />
                      LinkedIn
                    </Label>
                    <Input 
                      value={linkedin} 
                      onChange={(e) => setLinkedin(e.target.value)} 
                      placeholder="https://linkedin.com/in/yourname" 
                      className="bg-background"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-foreground" />
                      GitHub
                    </Label>
                    <Input 
                      value={github} 
                      onChange={(e) => setGithub(e.target.value)} 
                      placeholder="https://github.com/yourname" 
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      CV / Resume
                    </Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                          className="text-sm bg-background cursor-pointer"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleUploadCv} 
                          disabled={cvUploading || !cvFile}
                          className="gap-2"
                        >
                          {cvUploading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              Upload
                            </>
                          )}
                        </Button>
                        {cvUrl && (
                          <>
                            <Button size="sm" variant="outline" asChild className="gap-2">
                              <a href={cvUrl} target="_blank" rel="noreferrer">
                                <Eye className="h-3 w-3" />
                                View
                              </a>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setCvUrl("")} 
                              disabled={cvUploading}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      {cvUploadError && (
                        <div className="text-xs text-destructive flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          {cvUploadError}
                        </div>
                      )}
                      {cvFile && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          Selected: {cvFile.name} ({(cvFile.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                      {!cvFile && !cvUrl && (
                        <div className="text-xs text-muted-foreground">Upload a PDF/DOC/DOCX file (max 5MB)</div>
                      )}
                    </div>
                  </div>
                </div>
                {hasUnsavedChanges && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills Section - Moved to main content */}
            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/30 via-background to-background dark:from-emerald-950/10">
              <CardHeader className="border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Skills</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedSkillIds.length} selected
                  </Badge>
                </div>
                <CardDescription>Select your technical skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="text-sm text-muted-foreground">
                  Click on skills to add or remove them from your profile
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => {
                      const active = selectedSkillIds.includes(s.id);
                      return (
                        <Badge
                          key={s.id}
                          variant={active ? "default" : "outline"}
                          className={`cursor-pointer transition-all hover:scale-105 ${
                            active 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' 
                              : 'hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                          }`}
                          onClick={() => toggleSkill(s.id)}
                          title={active ? "Click to remove" : "Click to add"}
                        >
                          {s.name}
                        </Badge>
                      );
                    })}
                    {skills.length === 0 && (
                      <div className="text-sm text-muted-foreground py-4 text-center w-full">
                        No skills available.
                      </div>
                    )}
                  </div>
                </div>

                {selectedSkillIds.length > 0 && (
                  <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Selected Skills Preview
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkillIds.slice(0, 20).map((id) => (
                        <Badge 
                          key={`sel-${id}`} 
                          variant="outline" 
                          className="bg-background border-emerald-300 dark:border-emerald-700"
                        >
                          {skillNameById.get(id) || id}
                        </Badge>
                      ))}
                      {selectedSkillIds.length > 20 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedSkillIds.length - 20} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {skillsError && (
                  <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {skillsError}
                    </div>
                  </div>
                )}
                {JSON.stringify(selectedSkillIds.sort()) !== JSON.stringify(initialSkillIds.sort()) && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={handleSaveSkills} 
                      disabled={savingSkills}
                      className="gap-2"
                    >
                      {savingSkills ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Skills
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Experience Section */}
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/30 via-background to-background dark:from-amber-950/10">
              <CardHeader className="border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <CardTitle className="text-lg text-amber-700 dark:text-amber-400">Experience</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(profile?.experiences || []).length} {(profile?.experiences || []).length === 1 ? 'entry' : 'entries'}
                  </Badge>
                </div>
                <CardDescription>Add your work experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {experienceError && (
                  <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {experienceError}
                    </div>
                  </div>
                )}
                <div className="flex justify-end pb-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      resetExperienceForm();
                      setExpModalOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Experience
                  </Button>
                </div>

                <div className="space-y-3">
                  {(profile?.experiences || []).length === 0 && (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10">
                      <Briefcase className="h-12 w-12 mx-auto text-amber-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No experience added yet</div>
                      <div className="text-xs text-muted-foreground mt-1">Add your work experience to showcase your background</div>
                    </div>
                  )}
                  {(profile?.experiences || [])
                    .slice()
                    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
                    .map((exp, index) => (
                      <Card 
                        key={exp.id} 
                        className={`border-2 transition-all hover:shadow-md ${
                          index % 3 === 0 ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10' :
                          index % 3 === 1 ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/10' :
                          'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10'
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`h-3 w-3 rounded-full ${
                                  index % 3 === 0 ? 'bg-blue-500' :
                                  index % 3 === 1 ? 'bg-purple-500' :
                                  'bg-green-500'
                                }`} />
                                <div className="text-base font-semibold text-foreground">
                                  {exp.position}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-primary mb-2">
                                {exp.companyName}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                                  {exp.isCurrent || !exp.endDate ? (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">Present</Badge>
                                  ) : (
                                    new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                  )}
                                </div>
                                {exp.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {exp.location}
                                  </div>
                                )}
                              </div>
                              {exp.description && (
                                <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                  {exp.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => startEditExperience(exp)} 
                                disabled={expSaving}
                                className="gap-1.5"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => handleDeleteExperience(exp.id)}
                                disabled={expSaving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Education Section */}
            <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/30 via-background to-background dark:from-purple-950/10">
              <CardHeader className="border-b border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-lg text-purple-700 dark:text-purple-400">Education</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(profile?.educations || []).length} {(profile?.educations || []).length === 1 ? 'entry' : 'entries'}
                  </Badge>
                </div>
                <CardDescription>Add your educational background</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {educationError && (
                  <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {educationError}
                    </div>
                  </div>
                )}
                <div className="flex justify-end pb-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      resetEducationForm();
                      setEduModalOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Education
                  </Button>
                </div>

                <div className="space-y-3">
                  {(profile?.educations || []).length === 0 && (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10">
                      <GraduationCap className="h-12 w-12 mx-auto text-purple-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No education added yet</div>
                    </div>
                  )}
                  {(profile?.educations || [])
                    .slice()
                    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
                    .map((edu, index) => (
                      <Card
                        key={edu.id}
                        className={`border-2 transition-all hover:shadow-md ${
                          index % 2 === 0 ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10' :
                          'border-pink-200 dark:border-pink-800 bg-pink-50/30 dark:bg-pink-950/10'
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`h-3 w-3 rounded-full ${index % 2 === 0 ? 'bg-indigo-500' : 'bg-pink-500'}`} />
                                <div className="text-base font-semibold text-foreground">
                                  {edu.institution}
                                </div>
                              </div>
                              {(edu.degree || edu.fieldOfStudy) && (
                                <div className="text-sm font-medium text-primary mb-2">
                                  {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" • ")}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(edu.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                                  {edu.endDate ? new Date(edu.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Present"}
                                </div>
                                {edu.grade && (
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    {edu.grade}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => startEditEducation(edu)} 
                                disabled={eduSaving}
                                className="gap-1.5"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => handleDeleteEducation(edu.id)}
                                disabled={eduSaving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Projects Section */}
            <Card className="border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 via-background to-background dark:from-cyan-950/10">
              <CardHeader className="border-b border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    <CardTitle className="text-lg text-cyan-700 dark:text-cyan-400">Projects</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(profile?.projects || []).length} {(profile?.projects || []).length === 1 ? 'project' : 'projects'}
                  </Badge>
                </div>
                <CardDescription>Showcase your projects and portfolio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {projectError && (
                  <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {projectError}
                    </div>
                  </div>
                )}
                <div className="flex justify-end pb-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      resetProjectForm();
                      setProjModalOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Project
                  </Button>
                </div>

                <div className="space-y-3">
                  {(profile?.projects || []).length === 0 && (
                    <div className="text-center py-8 rounded-lg border-2 border-dashed border-cyan-200 dark:border-cyan-800 bg-cyan-50/20 dark:bg-cyan-950/10">
                      <Code className="h-12 w-12 mx-auto text-cyan-400 mb-3" />
                      <div className="text-sm text-muted-foreground">No projects added yet</div>
                    </div>
                  )}
                  {(profile?.projects || [])
                    .slice()
                    .sort((a, b) => {
                      const aDate = a.startDate || "";
                      const bDate = b.startDate || "";
                      return aDate < bDate ? 1 : -1;
                    })
                    .map((proj, index) => (
                      <Card
                        key={proj.id}
                        className={`border-2 transition-all hover:shadow-md ${
                          index % 3 === 0 ? 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/30 dark:bg-cyan-950/10' :
                          index % 3 === 1 ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/10' :
                          'border-sky-200 dark:border-sky-800 bg-sky-50/30 dark:bg-sky-950/10'
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`h-3 w-3 rounded-full ${
                                  index % 3 === 0 ? 'bg-cyan-500' :
                                  index % 3 === 1 ? 'bg-teal-500' :
                                  'bg-sky-500'
                                }`} />
                                <div className="text-base font-semibold text-foreground">
                                  {proj.name}
                                </div>
                                {proj.url && (
                                  <Button size="sm" variant="ghost" asChild className="h-6 px-2">
                                    <a href={proj.url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                              {proj.description && (
                                <div className="text-sm text-muted-foreground mb-2 whitespace-pre-line">
                                  {proj.description}
                                </div>
                              )}
                              {proj.technologies && proj.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {proj.technologies.map((tech) => (
                                    <Badge key={tech} variant="outline" className="text-xs">
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {proj.startDate && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(proj.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{" "}
                                  {proj.isCurrent || !proj.endDate ? (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">Ongoing</Badge>
                                  ) : (
                                    new Date(proj.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => startEditProject(proj)} 
                                disabled={projSaving}
                                className="gap-1.5"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => handleDeleteProject(proj.id)}
                                disabled={projSaving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Experience Modal */}
      <Dialog open={expModalOpen} onOpenChange={setExpModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {expEditingId ? "Edit Experience" : "Add New Experience"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Company *</Label>
                <Input value={expCompanyName} onChange={(e) => setExpCompanyName(e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-1">
                <Label>Position *</Label>
                <Input value={expPosition} onChange={(e) => setExpPosition(e.target.value)} placeholder="Role / title" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Start date *</Label>
                <Input type="date" value={expStartDate} onChange={(e) => setExpStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={expEndDate}
                  onChange={(e) => setExpEndDate(e.target.value)}
                  disabled={expIsCurrent}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="exp-current-modal"
                type="checkbox"
                checked={expIsCurrent}
                onChange={(e) => setExpIsCurrent(e.target.checked)}
              />
              <Label htmlFor="exp-current-modal">I currently work here</Label>
            </div>

            <div className="space-y-1">
              <Label>Location (optional)</Label>
              <Input value={expLocation} onChange={(e) => setExpLocation(e.target.value)} placeholder="City, Country" />
            </div>

            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea value={expDescription} onChange={(e) => setExpDescription(e.target.value)} rows={4} placeholder="What did you work on?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetExperienceForm()}>
              Cancel
            </Button>
            <Button 
              onClick={saveExperience} 
              disabled={expSaving}
              className="gap-2"
            >
              {expSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : expEditingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Experience
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Education Modal */}
      <Dialog open={eduModalOpen} onOpenChange={setEduModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {eduEditingId ? "Edit Education" : "Add New Education"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Institution *</Label>
                <Input value={eduInstitution} onChange={(e) => setEduInstitution(e.target.value)} placeholder="School/University name" />
              </div>
              <div className="space-y-1">
                <Label>Degree</Label>
                <Input value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} placeholder="e.g. Bachelor's, Master's" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Field of Study</Label>
              <Input value={eduFieldOfStudy} onChange={(e) => setEduFieldOfStudy(e.target.value)} placeholder="e.g. Computer Science" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Start date *</Label>
                <Input type="date" value={eduStartDate} onChange={(e) => setEduStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input type="date" value={eduEndDate} onChange={(e) => setEduEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Grade/GPA</Label>
                <Input value={eduGrade} onChange={(e) => setEduGrade(e.target.value)} placeholder="e.g. 3.8/4.0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetEducationForm()}>
              Cancel
            </Button>
            <Button 
              onClick={saveEducation} 
              disabled={eduSaving}
              className="gap-2"
            >
              {eduSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : eduEditingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Education
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Modal */}
      <Dialog open={projModalOpen} onOpenChange={setProjModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {projEditingId ? "Edit Project" : "Add New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Project Name *</Label>
              <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Project name" />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={projDescription} onChange={(e) => setProjDescription(e.target.value)} rows={4} placeholder="Describe your project..." />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Project URL</Label>
                <Input value={projUrl} onChange={(e) => setProjUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label>Technologies</Label>
                <div className="flex gap-2">
                  <Input 
                    value={projTechInput} 
                    onChange={(e) => setProjTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTechnology();
                      }
                    }}
                    placeholder="Add technology..."
                  />
                  <Button size="sm" variant="outline" onClick={addTechnology} type="button">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {projTechnologies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projTechnologies.map((tech) => (
                      <Badge key={tech} variant="outline" className="gap-1">
                        {tech}
                        <button
                          type="button"
                          onClick={() => removeTechnology(tech)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input type="date" value={projStartDate} onChange={(e) => setProjStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={projEndDate}
                  onChange={(e) => setProjEndDate(e.target.value)}
                  disabled={projIsCurrent}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="proj-current-modal"
                type="checkbox"
                checked={projIsCurrent}
                onChange={(e) => setProjIsCurrent(e.target.checked)}
              />
              <Label htmlFor="proj-current-modal">Ongoing project</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetProjectForm()}>
              Cancel
            </Button>
            <Button 
              onClick={saveProject} 
              disabled={projSaving}
              className="gap-2"
            >
              {projSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : projEditingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Delete Actions */}
      {(() => {
        console.log("About to render ConfirmationDialog", { 
          deleteConfirmOpen, 
          deleteConfirmType, 
          deleteConfirmId, 
          title: getDeleteConfirmTitle(), 
          description: getDeleteConfirmDescription() 
        });
        return null;
      })()}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          console.log("ConfirmationDialog onOpenChange called with:", open, "deleteConfirmType:", deleteConfirmType, "deleteConfirmId:", deleteConfirmId);
          setDeleteConfirmOpen(open);
          if (!open) {
            setDeleteConfirmType(null);
            setDeleteConfirmId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={getDeleteConfirmTitle()}
        description={getDeleteConfirmDescription()}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleteConfirmLoading}
      />
    </div>
  );

  if (embedded) return content;

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <main className="min-h-dvh bg-muted/40 py-8">
          <div className="w-full pt-6">
            {content}
          </div>
        </main>

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onOpenChange={setShowUnsavedDialog}
          onDiscard={() => {
            setPendingNavigation(null);
            // Reset form to initial state
            if (initialFormDataRef.current) {
              setHeadline(initialFormDataRef.current.headline);
              setBio(initialFormDataRef.current.bio);
              setWebsite(initialFormDataRef.current.website);
              setLinkedin(initialFormDataRef.current.linkedin);
              setGithub(initialFormDataRef.current.github);
              setAddress(initialFormDataRef.current.address);
              setFirstName(initialFormDataRef.current.firstName);
              setLastName(initialFormDataRef.current.lastName);
              resetExperienceForm();
              resetEducationForm();
              resetProjectForm();
            }
          }}
          onSave={async () => {
            await handleSave();
            if (pendingNavigation) {
              window.location.href = pendingNavigation;
            }
          }}
          saving={saving}
        />
      </SignedIn>
    </>
  );
}


