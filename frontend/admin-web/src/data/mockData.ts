import {
  BadgeCheck,
  Banknote,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  LibraryBig,
  MessageSquareText,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  ClipboardCheck
} from "lucide-react";
import type { RoleProfile } from "../types";

export const schoolProfile = {
  name: "Nova Demonstration School",
  shortName: "NDS",
  primaryColor: "#166534",
  secondaryColor: "#1e3a8a",
  accentColor: "#f59e0b",
  term: "Term 2",
  academicYear: "2026"
};

export const roles: RoleProfile[] = [
  {
    key: "super-admin",
    label: "Super Admin",
    email: "platform@novasms.local",
    title: "Platform Control",
    accent: "#111827",
    icon: ShieldCheck,
    nav: ["Dashboard", "Schools", "Audit Log", "System Alerts", "System Check", "Support"]
  },
  {
    key: "admin",
    label: "Headteacher",
    email: "admin@novasms.local",
    title: "School Control Center",
    accent: "#1e3a8a",
    icon: UserRoundCog,
    nav: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications"]
  },
  {
    key: "headteacher",
    label: "Head Teacher",
    email: "headteacher@novasms.local",
    title: "Academic Leadership",
    accent: "#0f766e",
    icon: ClipboardCheck,
    nav: ["Dashboard", "Staff", "Attendance", "Performance", "Leave Requests", "Messages"]
  },
  {
    key: "secretary",
    label: "Secretary",
    email: "secretary@novasms.local",
    title: "Front Desk",
    accent: "#0f766e",
    icon: UsersRound,
    nav: ["Register Student", "Student Profiles", "Import Students", "Guardians", "Documents"]
  },
  {
    key: "bursar",
    label: "Bursar",
    email: "bursar@novasms.local",
    title: "Finance Office",
    accent: "#b45309",
    icon: Banknote,
    nav: ["Home", "Payments", "Receipts", "Cashbook", "Quotations", "Requisitions", "Reports", "Settings"]
  },
  {
    key: "librarian",
    label: "Librarian",
    email: "librarian@novasms.local",
    title: "Library Management",
    accent: "#4338ca",
    icon: LibraryBig,
    nav: ["Catalog", "Issue & Return", "Book Requests", "Upload to Students", "Reports"]
  },
  {
    key: "teacher",
    label: "Teacher",
    email: "teacher@novasms.local",
    title: "Teaching Workspace",
    accent: "#2563eb",
    icon: GraduationCap,
    nav: ["My Classes", "Attendance", "Assessments", "Report Remarks", "Messages"]
  },
  {
    key: "parent",
    label: "Parent",
    email: "parent@novasms.local",
    title: "Parent Portal",
    accent: "#15803d",
    icon: MessageSquareText,
    nav: ["Home", "Fees", "Receipts", "Attendance", "Report Card", "Messages"]
  },
  {
    key: "student",
    label: "Student",
    email: "student@novasms.local",
    title: "Student Portal",
    accent: "#7c3aed",
    icon: BookOpen,
    nav: ["Dashboard", "My Fees", "Attendance", "Report Card", "Library", "Announcements"]
  },
  {
    key: "ict-admin",
    label: "ICT Admin",
    email: "ict-admin@novasms.local",
    title: "System Maintenance",
    accent: "#6366f1",
    icon: UserRoundCog,
    nav: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications", "System"]
  }
];
