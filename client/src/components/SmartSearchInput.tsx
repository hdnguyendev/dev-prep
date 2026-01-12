import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  iconClassName?: string;
  suggestionType?: "job" | "company"; // Type of suggestions to fetch
}

/**
 * Dictionary mapping abbreviations and partial words to full suggestions
 */
const searchSuggestions: Record<string, string[]> = {
  // Abbreviations
  "be": ["backend engineer", "backend", "engineer", "backend developer"],
  "fe": ["frontend engineer", "frontend", "frontend developer", "front-end"],
  "fs": ["full stack", "fullstack", "full stack developer", "fullstack engineer"],
  "se": ["software engineer", "senior engineer", "software engineering"],
  "swe": ["software engineer", "software engineering"],
  "sde": ["software development engineer", "software developer engineer"],
  "sre": ["site reliability engineer", "site reliability engineering"],
  "qa": ["quality assurance", "qa engineer", "qa tester", "quality assurance engineer"],
  "dev": ["developer", "development", "devops"],
  "devops": ["devops engineer", "devops", "dev ops"],
  "ml": ["machine learning", "ml engineer", "machine learning engineer"],
  "ai": ["artificial intelligence", "ai engineer", "ai developer"],
  "ds": ["data science", "data scientist", "data science engineer"],
  "de": ["data engineer", "data engineering"],
  "pm": ["product manager", "project manager", "product management"],
  "ui": ["ui designer", "ui/ux", "ui design"],
  "ux": ["ux designer", "ui/ux", "ux design"],
  "seo": ["seo specialist", "seo", "search engine optimization"],
  "db": ["database", "database engineer", "database administrator"],
  "api": ["api developer", "api engineer", "rest api"],
  "aws": ["aws engineer", "aws developer", "amazon web services"],
  "react": ["react developer", "react engineer", "react.js"],
  "node": ["node.js", "nodejs", "node.js developer"],
  "python": ["python developer", "python engineer"],
  "java": ["java developer", "java engineer"],
  "js": ["javascript", "javascript developer", "js developer"],
  "ts": ["typescript", "typescript developer", "ts developer"],
  "go": ["golang", "go developer", "go engineer"],
  "rust": ["rust developer", "rust engineer"],
  "php": ["php developer", "php engineer"],
  "ruby": ["ruby developer", "ruby on rails"],
  "swift": ["swift developer", "ios developer"],
  "kotlin": ["kotlin developer", "android developer"],
  "flutter": ["flutter developer", "mobile developer"],
  "react native": ["react native developer", "mobile developer"],
  "vue": ["vue.js", "vue developer", "vue.js developer"],
  "angular": ["angular developer", "angular.js"],
  "docker": ["docker engineer", "containerization"],
  "kubernetes": ["kubernetes engineer", "k8s", "container orchestration"],
  "terraform": ["terraform engineer", "infrastructure as code"],
  "jenkins": ["jenkins engineer", "ci/cd engineer"],
  "git": ["git engineer", "version control"],
  "linux": ["linux engineer", "linux administrator"],
  "security": ["security engineer", "cybersecurity", "security specialist"],
  "blockchain": ["blockchain developer", "blockchain engineer", "web3"],
  "solidity": ["solidity developer", "smart contract developer"],
  "game": ["game developer", "game engineer", "game programming"],
  "mobile": ["mobile developer", "mobile engineer", "ios android"],
  "web": ["web developer", "web engineer", "web development"],
  "cloud": ["cloud engineer", "cloud developer", "cloud architect"],
  "architect": ["software architect", "system architect", "solution architect"],
  "lead": ["lead engineer", "lead developer", "tech lead"],
  "senior": ["senior engineer", "senior developer", "senior software engineer"],
  "junior": ["junior engineer", "junior developer", "entry level"],
  "intern": ["internship", "intern", "software intern"],
  "remote": ["remote work", "work from home", "wfh"],
  "full time": ["full-time", "fulltime", "permanent"],
  "part time": ["part-time", "parttime"],
  "contract": ["contractor", "contract work", "freelance"],
};

/**
 * Common job titles and keywords
 */
const commonJobTitles = [
  "software engineer",
  "backend engineer",
  "frontend engineer",
  "full stack developer",
  "devops engineer",
  "data engineer",
  "machine learning engineer",
  "product manager",
  "ui/ux designer",
  "qa engineer",
  "security engineer",
  "mobile developer",
  "cloud engineer",
  "site reliability engineer",
  "blockchain developer",
];

/**
 * Generate static suggestions based on input (abbreviations, common terms)
 */
function generateStaticSuggestions(input: string): string[] {
  if (!input || input.length < 2) return [];

  const lowerInput = input.toLowerCase().trim();
  const suggestions = new Set<string>();

  // 1. Check exact abbreviation matches
  if (searchSuggestions[lowerInput]) {
    searchSuggestions[lowerInput].forEach(s => suggestions.add(s));
  }

  // 2. Check if input is a prefix of any abbreviation
  Object.keys(searchSuggestions).forEach(key => {
    if (key.startsWith(lowerInput) || lowerInput.startsWith(key)) {
      searchSuggestions[key].forEach(s => suggestions.add(s));
    }
  });

  // 3. Check if input matches common job titles
  commonJobTitles.forEach(title => {
    if (title.includes(lowerInput) || lowerInput.includes(title.split(" ")[0])) {
      suggestions.add(title);
    }
  });

  // 4. Generate partial matches from suggestions
  Object.values(searchSuggestions).flat().forEach(suggestion => {
    if (suggestion.includes(lowerInput) || lowerInput.includes(suggestion.split(" ")[0])) {
      suggestions.add(suggestion);
    }
  });

  // 5. If input looks like it could be expanded (e.g., "be" -> "backend")
  if (lowerInput.length <= 3) {
    Object.keys(searchSuggestions).forEach(key => {
      if (key.includes(lowerInput) || lowerInput.includes(key)) {
        searchSuggestions[key].forEach(s => suggestions.add(s));
      }
    });
  }

  // Limit to top 5 suggestions
  return Array.from(suggestions).slice(0, 5);
}

/**
 * Smart Search Input Component with intelligent suggestions
 * 
 * Features:
 * - Auto-complete suggestions based on abbreviations and common terms
 * - Example: typing "be" suggests "backend engineer", "backend", "engineer"
 * - Shows suggestions dropdown when typing
 * - Keyboard navigation support
 */
export function SmartSearchInput({
  value,
  onChange,
  onKeyPress,
  placeholder = "Job title, company, keywords...",
  className,
  iconClassName,
  suggestionType = "job", // Default to job suggestions
}: SmartSearchInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { getToken } = useAuth();

  /**
   * Fetch suggestions from database only (job titles or company names)
   * All suggestions are lowercase
   */
  const fetchDatabaseSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      const response = suggestionType === "company"
        ? await apiClient.getCompanySuggestions(query.toLowerCase(), token ?? undefined)
        : await apiClient.getJobSuggestions(query.toLowerCase(), token ?? undefined);
      
      if (response.success && response.data) {
        // Backend already returns lowercase, but ensure it's lowercase
        return response.data.map(s => s.toLowerCase());
      }
      return [];
    } catch (error) {
      console.error(`Error fetching ${suggestionType} suggestions:`, error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getToken, suggestionType]);

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Only fetch from database, no static suggestions
    // Debounce database fetch (wait 300ms after user stops typing)
    debounceTimerRef.current = setTimeout(async () => {
      const dbSuggestions = await fetchDatabaseSuggestions(value);
      
      // All suggestions are already lowercase from backend
      setSuggestions(dbSuggestions);
      setShowSuggestions(dbSuggestions.length > 0);
      setSelectedIndex(-1);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, fetchDatabaseSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      onKeyPress?.(e);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          onKeyPress?.(e);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        onKeyPress?.(e);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", iconClassName)} />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value && value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn("pl-9", className)}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <div className="p-1">
            {loading && suggestions.length === 0 ? (
              <div className="flex items-center justify-center px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Đang tìm kiếm...</span>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground outline-none",
                    selectedIndex === index && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

