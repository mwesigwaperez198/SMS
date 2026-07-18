import type { ConnectedData, RoleKey } from "../api";

const FIRST_NAMES_M = [
  "James", "David", "Peter", "Moses", "Frank", "John", "Samuel", "Paul",
  "Joseph", "Michael", "Daniel", "Stephen", "Isaac", "Andrew", "Martin",
];
const FIRST_NAMES_F = [
  "Sarah", "Grace", "Florence", "Helen", "Jane", "Agnes", "Betty", "Joyce",
  "Mary", "Rose", "Catherine", "Janet", "Sylvia", "Esther", "Phiona",
];
const LAST_NAMES = [
  "Nakamya", "Okello", "Namukasa", "Ssempijja", "Auma", "Byaruhanga",
  "Nabirye", "Kiiza", "Nakato", "Tumusiime", "Kiggundu", "Mugisha",
  "Namutebi", "Wasswa", "Kizza", "Akello", "Opio", "Nansubuga",
  "Sserwanga", "Kabanda", "Namaganda", "Ochieng", "Balinda", "Mubiru",
  "Kyalimpa", "Sseguya", "Nantongo", "Lukwago", "Katende", "Bukenya",
];
const GUARDIAN_NAMES = [
  "Mr. Ssempijja David", "Mrs. Nakamya Sarah", "Mr. Okello James",
  "Mrs. Auma Florence", "Mr. Byaruhanga Peter", "Mrs. Nabirye Helen",
  "Mr. Kiiza Moses", "Mrs. Nakato Jane", "Mr. Tumusiime Frank",
  "Mrs. Kiggundu Agnes", "Mr. Mugisha Samuel", "Mrs. Namutebi Rose",
];
const SUBJECTS = ["Mathematics", "English", "Science", "Social Studies", "Kiswahili"];
const CLASS_NAMES = ["P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"];
const STREAMS = ["A", "B"];

let _id = 0;
function uid(): string { return `DEMO-${String(++_id).padStart(4, "0")}`; }

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function makeStudentName(): { first: string; last: string; full: string } {
  const first = pick([...FIRST_NAMES_M, ...FIRST_NAMES_F]);
  const last = pick(LAST_NAMES);
  return { first, last, full: `${last} ${first}` };
}

function generateStudents(count: number): ConnectedData["students"] {
  const result: ConnectedData["students"] = [];
  for (let i = 0; i < count; i++) {
    const { full } = makeStudentName();
    const gender = pick(["Male", "Female"] as const);
    result.push({
      id: i + 1,
      admissionNo: `NVD/2026/${String(i + 1).padStart(3, "0")}`,
      name: full,
      gender,
      className: pick(CLASS_NAMES),
      stream: pick(STREAMS),
      guardian: pick(GUARDIAN_NAMES),
      guardianPhone: `07${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      status: "Active",
      userId: i < 18 ? i + 20 : null,
    });
  }
  return result;
}

function generateFullStudents(students: ConnectedData["students"]): ConnectedData["fullStudents"] {
  return students.map((s) => ({
    admissionNo: s.admissionNo,
    name: s.name,
    gender: s.gender,
    dob: `${2010 + Math.floor(Math.random() * 8)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    className: s.className,
    stream: s.stream,
    previousSchool: pick(["Kampala Primary School", "Entebbe Demonstration", "Mukono Kings", "New System School", ""]),
    guardian: s.guardian,
    guardianContact: s.guardianPhone ?? `07${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
    guardianAddress: pick(["Kampala Road", "Ntinda", "Kisaasi", "Bukasa", "Munyonyo", "Kyanja", "Lugogo"]),
    parentsAlive: pick(["Both", "Mother Only", "Father Only", "Guardian"]),
    skills: pickN(["Football", "Netball", "Music", "Drama", "Debate", "Art", "Swimming", "Athletics"], Math.floor(Math.random() * 3) + 1),
    desiredSkills: pickN(["Coding", "Robotics", "Photography", "Cooking", "Carpentry", "Tailoring"], Math.floor(Math.random() * 3) + 1),
    status: "Active",
  }));
}

function generateStaff(): ConnectedData["staff"] {
  const roles = [
    { role: "Mathematics Teacher", dept: "Academics" },
    { role: "English Teacher", dept: "Academics" },
    { role: "Science Teacher", dept: "Academics" },
    { role: "Social Studies Teacher", dept: "Academics" },
    { role: "Kiswahili Teacher", dept: "Academics" },
    { role: "Headteacher", dept: "Administration" },
    { role: "Bursar", dept: "Finance" },
    { role: "Secretary", dept: "Administration" },
    { role: "Librarian", dept: "Library" },
    { role: "ICT Administrator", dept: "ICT" },
  ];
  return roles.map((r, i) => ({
    staffNo: `STF/2026/${String(i + 1).padStart(3, "0")}`,
    name: pick(LAST_NAMES) + " " + pick([...FIRST_NAMES_M, ...FIRST_NAMES_F]),
    role: r.role,
    department: r.dept,
    status: "Active",
  }));
}

function generateLibraryBooks(): ConnectedData["libraryBooks"] {
  const books = [
    "Understanding Mathematics P3", "English Composition Writing", "Primary Science P4",
    "Social Studies of Uganda", "Kiswahili Ferdina", "New Primary Science P5",
    "Creative Composition P6", "Primary Mathematics P7", "Secondary Biology S1",
    "Physics Principles S2", "Chemistry Essentials S3", "Literature in English S4",
    "Uganda History & Geography", "Agriculture for Schools", "Fine Art & Design",
    "Music Theory & Practice", "Physical Education Guide", "Computer Studies P5",
    "Religious Education P3", "Moral Education P4", "Home Economics P6",
    "French for Beginners", "Entrepreneurship S3", "Nutrition & Health P4",
    "Environmental Education", "Life Skills Handbook", "Study Skills Guide",
    "Mathematics Dictionary", "English Grammar Handbook", "Science Lab Manual",
  ];
  return books.map((title, i) => ({
    code: `LIB/${String(i + 1).padStart(4, "0")}`,
    title,
    shelf: `Shelf ${pick(["A", "B", "C", "D", "E"])}${Math.floor(Math.random() * 5) + 1}`,
    available: Math.floor(Math.random() * 8) + 1,
    borrowed: Math.floor(Math.random() * 5),
    status: pick(["Available", "Available", "Available", "Low Stock"]),
  }));
}

function generatePayments(): ConnectedData["payments"] {
  const methods = ["Mobile Money", "Bank Transfer", "Cash", "Card"];
  const students = pickN(
    generateStudents(15).map((s) => s.name),
    10,
  );
  return students.map((name, i) => ({
    reference: `PAY/2026/${String(i + 1).padStart(4, "0")}`,
    student: name,
    method: pick(methods),
    amount: `UGX ${(Math.floor(Math.random() * 9) + 2) * 50000}`,
    date: `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    status: pick(["Completed", "Completed", "Completed", "Pending"]),
  }));
}

function generateReceipts(): ConnectedData["receipts"] {
  const staffNames = ["Mrs. Nakamya Sarah", "Mr. Okello James", "Mrs. Auma Florence"];
  const students = pickN(
    generateStudents(15).map((s) => s.name),
    10,
  );
  return students.map((name, i) => ({
    receiptNo: `RCT/2026/${String(i + 1).padStart(4, "0")}`,
    student: name,
    amount: `UGX ${(Math.floor(Math.random() * 9) + 2) * 50000}`,
    method: pick(["Mobile Money", "Bank Transfer", "Cash"]),
    date: `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    issuedBy: pick(staffNames),
  }));
}

function generateFeeBalances(): ConnectedData["feeBalances"] {
  const students = pickN(generateStudents(15), 5);
  return students.map((s) => {
    const expected = (Math.floor(Math.random() * 5) + 3) * 50000;
    const paid = Math.floor(Math.random() * expected);
    return {
      student: s.name,
      className: `${s.className}${s.stream}`,
      expected: `UGX ${expected.toLocaleString()}`,
      paid: `UGX ${paid.toLocaleString()}`,
      balance: `UGX ${(expected - paid).toLocaleString()}`,
      status: paid >= expected ? "Cleared" : paid > 0 ? "Partial" : "Unpaid",
    };
  });
}

function generateNotifications(): ConnectedData["notifications"] {
  return [
    { id: uid(), title: "Fee Deadline Reminder", message: "Term 2 fees due by 15th July 2026", type: "deadline", severity: "warning", status: "unread" },
    { id: uid(), title: "Staff Meeting", message: "General staff meeting on Monday 20th July at 8:00 AM", type: "meeting", severity: "info", status: "read" },
    { id: uid(), title: "Exam Schedule Published", message: "Mid-term exams start 28th July 2026. Check timetable.", type: "exam", severity: "info", status: "unread" },
    { id: uid(), title: "New Student Admission", message: "3 new students admitted in S1A. Welcome packets ready.", type: "admission", severity: "info", status: "read" },
    { id: uid(), title: "System Maintenance", message: "Scheduled maintenance on Sunday 26th July 2:00 AM - 4:00 AM", type: "system", severity: "critical", status: "unread" },
  ];
}

function generateApprovals(): ConnectedData["approvals"] {
  return [
    { id: uid(), type: "transfer", title: "Student Transfer Request — Nakato Jane", submitted_by: "Mrs. Nakamya Sarah", status: "Pending", priority: "High" },
    { id: uid(), type: "fee_waiver", title: "Fee Waiver Application — Okello James", submitted_by: "Bursar Office", status: "Pending", priority: "Medium" },
    { id: uid(), type: "event", title: "Sports Day Budget Approval", submitted_by: "Mr. Byaruhanga Peter", status: "Approved", priority: "Low" },
  ];
}

function generateImports(): ConnectedData["imports"] {
  return [
    { batch: "BATCH/2026/001", type: "Students", total: 45, male: 22, female: 23, invalid: 1, status: "Completed" },
    { batch: "BATCH/2026/002", type: "Students", total: 30, male: 14, female: 16, invalid: 0, status: "Completed" },
    { batch: "BATCH/2026/003", type: "Staff", total: 10, male: 6, female: 4, invalid: 0, status: "Completed" },
  ];
}

function generateFinanceDocuments(): ConnectedData["financeDocuments"] {
  return [
    { number: "FIN/2026/001", type: "Budget", title: "Term 2 School Budget", amount: "UGX 45,000,000", preparedBy: "Mrs. Nabirye Helen", status: "Approved" },
    { number: "FIN/2026/002", type: "Expense", title: "Laboratory Equipment Purchase", amount: "UGX 3,200,000", preparedBy: "Mr. Kiiza Moses", status: "Approved" },
    { number: "FIN/2026/003", type: "Invoice", title: "Printer Maintenance Invoice", amount: "UGX 450,000", preparedBy: "Mrs. Nakato Jane", status: "Pending" },
    { number: "FIN/2026/004", type: "Receipt", title: "PTA Contribution Receipts", amount: "UGX 8,750,000", preparedBy: "Bursar", status: "Completed" },
    { number: "FIN/2026/005", type: "Report", title: "Monthly Financial Summary June", amount: "UGX 12,400,000", preparedBy: "Mrs. Nabirye Helen", status: "Completed" },
  ];
}

function generateMessageBatches(): ConnectedData["messageBatches"] {
  return [
    { batch: "MSG/2026/001", channel: "SMS", recipients: "All Parents (320)", message: "Reminder: Term 2 fees deadline is 15th July", status: "Delivered" },
    { batch: "MSG/2026/002", channel: "SMS", recipients: "S4 Students (48)", message: "Mock exams start next Monday", status: "Delivered" },
    { batch: "MSG/2026/003", channel: "Email", recipients: "All Staff (10)", message: "Staff meeting agenda for Monday", status: "Sent" },
    { batch: "MSG/2026/004", channel: "SMS", recipients: "P7 Parents (35)", message: "PLE registration documents due", status: "Pending" },
    { batch: "MSG/2026/005", channel: "WhatsApp", recipients: "Class Representatives (12)", message: "Sports day coordination meeting", status: "Sent" },
  ];
}

function generateParentMessages(): ConnectedData["parentMessages"] {
  const senders = ["Mr. Ssempijja David", "Mrs. Nakamya Sarah", "Mr. Okello James", "Mrs. Auma Florence", "Mr. Byaruhanga Peter"];
  return Array.from({ length: 10 }, (_, i) => ({
    id: uid(),
    from: pick(senders),
    subject: pick(["Fee Payment Query", "Leave Request", "Medical Report", "PTA Meeting", "Term Report", "Uniform Issue", "Transport Inquiry"]),
    body: pick([
      "Good morning, I would like to inquire about the outstanding balance for my child.",
      "My child will be absent tomorrow due to a medical appointment.",
      "Please share the report card for last term.",
      "When is the next PTA meeting scheduled?",
      "Can we arrange a meeting with the class teacher?",
    ]),
    date: `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    read: Math.random() > 0.4,
    type: pick(["personal", "fee", "announcement"] as const),
  }));
}

function generateStudentMessages(): ConnectedData["studentMessages"] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: uid(),
    from: pick(["Mrs. Nakamya Sarah", "Mr. Okello James", "School Admin"]),
    subject: pick(["Exam Timetable", "Fee Reminder", "School Event", "Library Notice", "Assignment Update"]),
    body: pick([
      "Please check the updated exam timetable posted on the notice board.",
      "Your fee balance is due before end of month.",
      "Sports day practice is every Wednesday after school.",
      "Return overdue library books by Friday.",
      "Mathematics assignment due next Tuesday.",
    ]),
    date: `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    read: Math.random() > 0.4,
    type: pick(["announcement", "personal", "fee", "attendance"] as const),
  }));
}

function generateSmsGroups(): ConnectedData["smsGroups"] {
  return [
    { id: uid(), label: "All Parents", count: 320, description: "Every parent/guardian on file", roleId: 8 },
    { id: uid(), label: "All Students", count: 280, description: "All enrolled students", roleId: 9 },
    { id: uid(), label: "Teaching Staff", count: 7, description: "All teachers", roleId: 3 },
    { id: uid(), label: "P7 Parents", count: 35, description: "Parents of P7 students (PLE year)", roleId: 8 },
    { id: uid(), label: "S4 Students", count: 48, description: "Senior 4 candidates", roleId: 9 },
    { id: uid(), label: "Non-Teaching Staff", count: 3, description: "Bursar, Secretary, Librarian", roleId: 5 },
  ];
}

function generateRedFlags(): ConnectedData["redFlags"] {
  return [
    { label: "Overdue Fees", value: "18 students", tone: "danger" },
    { label: "Low Attendance", value: "S2B — 62%", tone: "warning" },
    { label: "Library Overdue", value: "12 books", tone: "warning" },
    { label: "Unread Messages", value: "24 messages", tone: "info" },
    { label: "Exam Prep", value: "2 weeks left", tone: "neutral" },
  ];
}

function generateTeacherClasses(): ConnectedData["teacherClasses"] {
  const students = generateStudents(25);
  const classes: ConnectedData["teacherClasses"] = [
    { id: "tc1", name: "P5", stream: "A", subject: "Mathematics", totalStudents: 42 },
    { id: "tc2", name: "P5", stream: "B", subject: "Mathematics", totalStudents: 40 },
    { id: "tc3", name: "S1", stream: "A", subject: "Science", totalStudents: 38 },
    { id: "tc4", name: "S2", stream: "A", subject: "Mathematics", totalStudents: 35 },
    { id: "tc5", name: "S3", stream: "B", subject: "English", totalStudents: 32 },
  ];
  return classes;
}

function generateAssessmentData(): ConnectedData["assessmentData"] {
  const students = pickN(generateStudents(20), 12);
  const classKey = "S1A";
  const records: ConnectedData["assessmentData"][string] = students.map((s) => {
    const bot = Math.floor(Math.random() * 40) + 40;
    const mot = Math.floor(Math.random() * 40) + 45;
    const eot = Math.floor(Math.random() * 35) + 50;
    const avg = Math.round((bot + mot + eot) / 3);
    return {
      studentId: String(s.id),
      studentName: s.name,
      admissionNo: s.admissionNo,
      bot,
      mot,
      eot,
      average: avg,
      grade: avg >= 80 ? "A" : avg >= 70 ? "B" : avg >= 60 ? "C" : avg >= 50 ? "D" : "F",
      remarks: avg >= 70 ? "Excellent" : avg >= 50 ? "Good" : "Needs improvement",
    };
  });
  const classKey2 = "P6A";
  const students2 = pickN(generateStudents(20), 10);
  const records2: ConnectedData["assessmentData"][string] = students2.map((s) => {
    const bot = Math.floor(Math.random() * 40) + 40;
    const mot = Math.floor(Math.random() * 40) + 45;
    const eot = Math.floor(Math.random() * 35) + 50;
    const avg = Math.round((bot + mot + eot) / 3);
    return {
      studentId: String(s.id + 100),
      studentName: s.name,
      admissionNo: s.admissionNo,
      bot,
      mot,
      eot,
      average: avg,
      grade: avg >= 80 ? "A" : avg >= 70 ? "B" : avg >= 60 ? "C" : avg >= 50 ? "D" : "F",
      remarks: avg >= 70 ? "Excellent" : avg >= 50 ? "Good" : "Needs improvement",
    };
  });
  return { [classKey]: records, [classKey2]: records2 };
}

function generateAttendanceData(): ConnectedData["attendanceData"] {
  const statuses: Array<"Present" | "Absent" | "Late" | "Excused"> = ["Present", "Present", "Present", "Present", "Present", "Absent", "Late", "Excused"];
  const students = pickN(generateStudents(20), 15);
  const classKey = "S1A";
  const records: ConnectedData["attendanceData"][string] = students.map((s) => ({
    studentId: String(s.id),
    studentName: s.name,
    admissionNo: s.admissionNo,
    status: pick(statuses),
    time: `${7 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
  }));
  const classKey2 = "P5A";
  const students2 = pickN(generateStudents(20), 12);
  const records2: ConnectedData["attendanceData"][string] = students2.map((s) => ({
    studentId: String(s.id + 100),
    studentName: s.name,
    admissionNo: s.admissionNo,
    status: pick(statuses),
    time: `${7 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
  }));
  return { [classKey]: records, [classKey2]: records2 };
}

function generateSecretaryDocuments(): ConnectedData["secretaryDocuments"] {
  return [
    { id: uid(), title: "Admission Form — Kiiza Moses", type: "admission" as const, student: "Kiiza Moses", date: "2026-02-10", size: "245 KB" },
    { id: uid(), title: "Transfer Certificate — Ochieng Samuel", type: "transfer" as const, student: "Ochieng Samuel", date: "2026-03-15", size: "128 KB" },
    { id: uid(), title: "Term 1 Report Cards", type: "report" as const, date: "2026-04-20", size: "3.2 MB" },
    { id: uid(), title: "PTA Circular — Sports Day", type: "circular" as const, date: "2026-05-01", size: "89 KB" },
    { id: uid(), title: "Staff Meeting Minutes June", type: "upload" as const, date: "2026-06-05", size: "156 KB" },
  ];
}

function generateAuditLogs(): ConnectedData["auditLogs"] {
  const actors = ["Mrs. Nakamya Sarah", "Mr. Okello James", "Mrs. Auma Florence", "Mr. Byaruhanga Peter", "System"];
  return Array.from({ length: 10 }, (_, i) => ({
    id: uid(),
    action: pick(["Login", "Student Added", "Fee Updated", "Report Generated", "Settings Changed", "Book Issued", "SMS Sent", "Staff Updated", "Document Uploaded", "Attendance Marked"]),
    actor: pick(actors),
    role: pick(["admin", "bursar", "headteacher", "secretary", "librarian", "system"]),
    school: "Nova Demonstration School",
    entity: pick(["Student", "Fee", "Library", "SMS", "Report", "Staff", "System"]),
    timestamp: `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}T${String(Math.floor(Math.random() * 12) + 7).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00Z`,
    severity: pick(["info", "info", "info", "warning", "critical"]),
  }));
}

function generateSystemSchools(): ConnectedData["systemSchools"] {
  return [
    { id: uid(), name: "Nova Demonstration School", code: "NVD-001", tier: "Premium", plan: "Enterprise", students: 280, status: "Active", activeSince: "2024-01-15" },
    { id: uid(), name: "Kampala International Academy", code: "KIA-002", tier: "Standard", plan: "Professional", students: 420, status: "Active", activeSince: "2024-06-01" },
    { id: uid(), name: "Entebbe Secondary School", code: "ESS-003", tier: "Basic", plan: "Starter", students: 180, status: "Active", activeSince: "2025-01-10" },
    { id: uid(), name: "Mukono Kings College", code: "MKC-004", tier: "Premium", plan: "Enterprise", students: 520, status: "Active", activeSince: "2024-03-20" },
    { id: uid(), name: "Jinja Technical School", code: "JTS-005", tier: "Standard", plan: "Professional", students: 310, status: "Trial", activeSince: "2026-05-01" },
  ];
}

function generateSystemAlerts(): ConnectedData["systemAlerts"] {
  return [
    { id: uid(), type: "security", message: "3 failed login attempts detected for admin account", severity: "warning", school: "Nova Demonstration School", time: "2026-07-10T14:30:00Z" },
    { id: uid(), type: "performance", message: "API response time exceeded 2s threshold", severity: "info", time: "2026-07-10T09:15:00Z" },
    { id: uid(), type: "backup", message: "Daily database backup completed successfully", severity: "info", time: "2026-07-10T03:00:00Z" },
    { id: uid(), type: "subscription", message: "Jinja Technical School trial expires in 15 days", severity: "warning", school: "Jinja Technical School", time: "2026-07-09T10:00:00Z" },
    { id: uid(), type: "storage", message: "School storage usage at 78%", severity: "info", school: "Mukono Kings College", time: "2026-07-08T16:00:00Z" },
    { id: uid(), type: "security", message: "New API key generated for ICT admin", severity: "info", school: "Nova Demonstration School", time: "2026-07-08T11:45:00Z" },
    { id: uid(), type: "system", message: "Scheduled maintenance window: July 26, 2:00-4:00 AM", severity: "critical", time: "2026-07-07T08:00:00Z" },
    { id: uid(), type: "performance", message: "Database connection pool nearing limit on primary", severity: "warning", time: "2026-07-07T13:20:00Z" },
    { id: uid(), type: "backup", message: "Weekly full backup completed — 2.4 GB", severity: "info", time: "2026-07-06T04:00:00Z" },
    { id: uid(), type: "subscription", message: "Entebbe Secondary School renewed — Premium plan", severity: "info", school: "Entebbe Secondary School", time: "2026-07-05T09:30:00Z" },
  ];
}

function generateHome(): ConnectedData["home"] {
  return {
    student_summary: {
      total: 280,
      male: 145,
      female: 135,
      pending_admissions: 3,
      last_import_batch: "BATCH/2026/003",
    },
    finance_summary: {
      expected: "UGX 84,000,000",
      collected: "UGX 62,500,000",
      outstanding: "UGX 21,500,000",
      collection_rate: 74,
    },
    enrollment_by_class: [
      { label: "P3", male: 18, female: 22, total: 40 },
      { label: "P4", male: 20, female: 18, total: 38 },
      { label: "P5", male: 16, female: 20, total: 36 },
      { label: "P6", male: 22, female: 19, total: 41 },
      { label: "P7", male: 19, female: 16, total: 35 },
      { label: "S1", male: 24, female: 20, total: 44 },
      { label: "S2", male: 12, female: 14, total: 26 },
      { label: "S3", male: 8, female: 6, total: 14 },
      { label: "S4", male: 4, female: 2, total: 6 },
    ],
    attendance_by_class: [
      { label: "P3", present: 36, absent: 3, late: 1 },
      { label: "P4", present: 34, absent: 2, late: 2 },
      { label: "P5", present: 32, absent: 3, late: 1 },
      { label: "P6", present: 38, absent: 2, late: 1 },
      { label: "P7", present: 32, absent: 2, late: 1 },
      { label: "S1", present: 40, absent: 3, late: 1 },
      { label: "S2", present: 23, absent: 2, late: 1 },
      { label: "S3", present: 13, absent: 1, late: 0 },
      { label: "S4", present: 5, absent: 1, late: 0 },
    ],
    performance_by_class: [
      { label: "P3", average: 68, pass_rate: 82 },
      { label: "P4", average: 72, pass_rate: 88 },
      { label: "P5", average: 65, pass_rate: 78 },
      { label: "P6", average: 71, pass_rate: 85 },
      { label: "P7", average: 69, pass_rate: 80 },
      { label: "S1", average: 62, pass_rate: 75 },
      { label: "S2", average: 58, pass_rate: 70 },
      { label: "S3", average: 64, pass_rate: 72 },
      { label: "S4", average: 70, pass_rate: 83 },
    ],
    finance_trend: [
      { label: "Jan", collected: 12000000, outstanding: 2000000 },
      { label: "Feb", collected: 10500000, outstanding: 3500000 },
      { label: "Mar", collected: 11200000, outstanding: 2800000 },
      { label: "Apr", collected: 9800000, outstanding: 4200000 },
      { label: "May", collected: 10000000, outstanding: 4000000 },
      { label: "Jun", collected: 9000000, outstanding: 5000000 },
    ],
  };
}

const NAV_MAP: Record<RoleKey, string[]> = {
  "super-admin": ["Dashboard", "Schools", "Users", "Audit Log", "System Alerts", "System Check", "Support"],
  admin: ["Home", "Approvals", "Students", "Staff", "Finance", "Communication", "Reports", "Settings", "Notifications"],
  headteacher: ["Dashboard", "Staff", "Attendance", "Performance", "Leave Requests", "Messages"],
  secretary: ["Dashboard", "Register Student", "Student Profiles", "Student Requirements", "Import Students", "Guardians", "Documents"],
  bursar: ["Home", "Payments", "Receipts", "Cashbook", "Quotations", "Requisitions", "Reports", "Settings"],
  librarian: ["Catalog", "Issue & Return", "Book Requests", "Upload to Students", "Reports"],
  teacher: ["My Classes", "Attendance", "Assessments", "Report Remarks", "Student Register", "Messages"],
  parent: ["Home", "Fees", "Receipts", "Attendance", "Report Card", "Messages"],
  student: ["Dashboard", "My Fees", "Attendance", "Report Card", "Library", "Announcements"],
  "ict-admin": ["Dashboard", "User Verification", "System Health", "Notifications"],
};

const METRIC_MAP: Record<RoleKey, Array<{ label: string; value: string; hint: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }>> = {
  "super-admin": [
    { label: "Total Schools", value: "5", hint: "Across all tiers", tone: "info" },
    { label: "Active Users", value: "42", hint: "Currently online", tone: "success" },
    { label: "System Uptime", value: "99.8%", hint: "Last 30 days", tone: "success" },
    { label: "Alerts", value: "3", hint: "Requires attention", tone: "warning" },
  ],
  admin: [
    { label: "Total Students", value: "280", hint: "Enrolled this term", tone: "info" },
    { label: "Staff Count", value: "10", hint: "All departments", tone: "success" },
    { label: "Collection Rate", value: "74%", hint: "UGX 62.5M collected", tone: "warning" },
    { label: "Pending Approvals", value: "2", hint: "Requires review", tone: "danger" },
  ],
  headteacher: [
    { label: "Total Staff", value: "10", hint: "8 teaching, 2 admin", tone: "info" },
    { label: "Attendance Today", value: "94%", hint: "Above average", tone: "success" },
    { label: "Pending Leave", value: "1", hint: "Awaiting decision", tone: "warning" },
    { label: "Class Average", value: "67%", hint: "School-wide", tone: "info" },
  ],
  secretary: [
    { label: "Documents", value: "23", hint: "This month", tone: "info" },
    { label: "Pending Admissions", value: "3", hint: "Awaiting approval", tone: "warning" },
    { label: "Messages Sent", value: "45", hint: "Last 7 days", tone: "success" },
    { label: "Guardians", value: "280", hint: "On record", tone: "info" },
  ],
  bursar: [
    { label: "Expected Fees", value: "UGX 84M", hint: "Term 2 total", tone: "info" },
    { label: "Collected", value: "UGX 62.5M", hint: "74% collection", tone: "success" },
    { label: "Outstanding", value: "UGX 21.5M", hint: "18 students", tone: "danger" },
    { label: "Receipts Issued", value: "156", hint: "This term", tone: "info" },
  ],
  librarian: [
    { label: "Total Books", value: "30", hint: "In catalog", tone: "info" },
    { label: "Available", value: "22", hint: "On shelves", tone: "success" },
    { label: "Borrowed", value: "8", hint: "Currently out", tone: "warning" },
    { label: "Overdue", value: "2", hint: "Past due date", tone: "danger" },
  ],
  teacher: [
    { label: "My Classes", value: "5", hint: "Across 3 grades", tone: "info" },
    { label: "Total Students", value: "187", hint: "Enrolled", tone: "info" },
    { label: "Attendance", value: "92%", hint: "This week", tone: "success" },
    { label: "Avg Score", value: "67%", hint: "Last assessment", tone: "warning" },
  ],
  parent: [
    { label: "Children", value: "1", hint: "Enrolled", tone: "info" },
    { label: "Fee Balance", value: "UGX 150K", hint: "Outstanding", tone: "warning" },
    { label: "Attendance", value: "96%", hint: "This month", tone: "success" },
    { label: "Messages", value: "3", hint: "Unread", tone: "info" },
  ],
  student: [
    { label: "Attendance", value: "95%", hint: "This term", tone: "success" },
    { label: "Fee Balance", value: "UGX 100K", hint: "Outstanding", tone: "warning" },
    { label: "Average Score", value: "72%", hint: "Last exams", tone: "info" },
    { label: "Library Books", value: "2", hint: "Currently borrowed", tone: "info" },
  ],
  "ict-admin": [
    { label: "API Server", value: "Online", hint: "12ms latency", tone: "success" },
    { label: "Database", value: "Healthy", hint: "45ms response", tone: "success" },
    { label: "Active Users", value: "38", hint: "Currently logged in", tone: "info" },
    { label: "API Keys", value: "5", hint: "Active keys", tone: "info" },
  ],
};

export function generateDemoData(role: RoleKey): ConnectedData {
  const students = generateStudents(25);
  const fullStudents = generateFullStudents(students);

  return {
    school: {
      name: "Nova Demonstration School",
      short_name: "NVD",
      primary_color: "#0891b2",
      secondary_color: "#764ba2",
      accent_color: "#f59e0b",
      term: "Term 2",
      academic_year: "2026",
      address: "Plot 14, Kampala Road, P.O. Box 1234, Kampala",
      phone: "+256 700 123456",
      email: "info@novademo.sc.ug",
      cashless_enabled: true,
      admission_number_format: "NVD/YYYY/NNN",
    },
    metrics: METRIC_MAP[role] ?? METRIC_MAP.admin,
    nav: NAV_MAP[role] ?? NAV_MAP.admin,
    home: generateHome(),
    notifications: generateNotifications(),
    approvals: generateApprovals(),
    students,
    fullStudents,
    imports: generateImports(),
    financeDocuments: generateFinanceDocuments(),
    payments: generatePayments(),
    receipts: generateReceipts(),
    feeBalances: generateFeeBalances(),
    libraryBooks: generateLibraryBooks(),
    studentLibraryBooks: [],
    requestedBooks: [],
    staff: generateStaff(),
    messageBatches: generateMessageBatches(),
    parentMessages: generateParentMessages(),
    studentMessages: generateStudentMessages(),
    smsGroups: generateSmsGroups(),
    redFlags: generateRedFlags(),
    teacherClasses: generateTeacherClasses(),
    assessmentData: generateAssessmentData(),
    attendanceData: generateAttendanceData(),
    secretaryDocuments: generateSecretaryDocuments(),
    auditLogs: generateAuditLogs(),
    systemSchools: generateSystemSchools(),
    systemAlerts: generateSystemAlerts(),
  };
}
