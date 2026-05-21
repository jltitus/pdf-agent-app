"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
type DocumentRow = {
  id: string;
  title: string;
  filename: string;
  category?: string | null;
  version?: string | null;
  publication_date?: string | null;
  document_notes?: string | null;
  approval_status?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  previous_document_id?: string | null;
  is_active: boolean;
  storage_path?: string | null;
  vector_store_id?: string | null;
  uploaded_at?: string | null;
  replaced_by_document_id?: string | null;
  replaced_at?: string | null;
  page_count?: number;
  processing_status?: string | null;
  processing_progress?: number | null;
  processing_error?: string | null;
  processing_attempts?: number | null;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  processing_locked_until?: string | null;
  last_processed_page?: number | null;
  file_size_bytes?: number | null;
  is_encrypted?: boolean | null;
};
type AccessRequest = {
  id: string;
  full_name: string;
  email: string;
  reason?: string | null;
  status: string;
  created_at: string;
  approved_at?: string | null;
  last_invited_at?: string | null;
  invite_count?: number | null;
  profile_is_active?: boolean | null;
  profile_role?: string | null;
  last_activity_at?: string | null;
  last_login_at?: string | null;
  last_chat_at?: string | null;
  total_questions_asked?: number | null;
  last_question?: string | null;
};
type FeedbackItem = {
  id: string;
  user_id?: string | null;
  feedback_type: string;
  question: string | null;
  answer: string | null;
  created_at: string;
};
type NoAnswerItem = {
  id: string;
  user_id?: string | null;
  question: string;
  answer: string;
  category?: string | null;
  answer_mode?: string | null;
  evidence_strength?: {
    label?: string;
    description?: string;
  } | null;
  created_at: string;
};
type TrustedAnswer = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  answer_mode?: string | null;
  is_active: boolean;
  created_at: string;
};
type IssueReport = {
  id: string;
  user_email?: string | null;
  issue_type: string;
  description: string;
  related_question?: string | null;
  status: string;
  created_at: string;
};
type AuditLogItem = {
  id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  status: "success" | "failure" | string;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};
type UserAnalytics = {
  totalQuestions: number;
  uniqueUsers: number;
  modeCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  heatmap: number[][];
  recentActivity: {
    id: string;
    user_id: string;
    question: string;
    answer_mode?: string | null;
    category?: string | null;
    created_at: string;
  }[];
};
type DocEngagementStat = {
  id: string;
  title: string;
  filename: string;
  category: string | null;
  viewCount: number;
  questionCount: number;
  recentQuestions: string[];
};
type SimilarQuestion = {
  chatId: string;
  chatQuestion: string;
  createdAt: string;
  matchedTrustedId: string;
  matchedQuestion: string;
  similarity: number;
};
type ReplaceFormState = {
  documentId: string | null;
  title: string;
  category: string;
  version: string;
  publicationDate: string;
  documentNotes: string;
  approvalStatus: string;
  file: File | null;
};
type EditFormState = {
  title: string;
  category: string;
  version: string;
  publicationDate: string;
  documentNotes: string;
  approvalStatus: string;
};
export default function AdminPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingUserEmail, setDeletingUserEmail] = useState<string | null>(
    null,
  );
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentStatusFilter, setDocumentStatusFilter] = useState<
    | "all"
    | "active"
    | "archived"
    | "processed"
    | "not_processed"
    | "pending_review"
  >("all");
  const [documentHealthView, setDocumentHealthView] = useState<
    "recent" | "not_processed" | "zero_pages" | null
  >(null);
  const [engagementExpanded, setEngagementExpanded] = useState(false);
  const [documentHealth, setDocumentHealth] = useState({
    total: 0,
    active: 0,
    archived: 0,
    notProcessed: 0,
    zeroPages: 0,
    recent: [] as DocumentRow[],
  });
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<
    "all" | "helpful" | "not_helpful" | "missing_source"
  >("all");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<
    "all" | "new" | "reviewed" | "resolved" | "enhancement_candidate"
  >("all");
  const [feedbackCounts, setFeedbackCounts] = useState({
    helpful: 0,
    not_helpful: 0,
    missing_source: 0,
  });
  const [noAnswerItems, setNoAnswerItems] = useState<NoAnswerItem[]>([]);
  const [contentGaps, setContentGaps] = useState<
    {
      question: string;
      count: number;
      category?: string | null;
      answer_mode?: string | null;
    }[]
  >([]);
  const [trustedAnswers, setTrustedAnswers] = useState<TrustedAnswer[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<
    "all" | "success" | "failure"
  >("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);
  const [editingTrustedId, setEditingTrustedId] = useState<string | null>(null);
  const [trustedEditQuestion, setTrustedEditQuestion] = useState("");
  const [trustedEditAnswer, setTrustedEditAnswer] = useState("");
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics>({
    totalQuestions: 0,
    uniqueUsers: 0,
    modeCounts: {},
    categoryCounts: {},
    heatmap: [],
    recentActivity: [],
  });
  const [reviewingFeedbackId, setReviewingFeedbackId] = useState<string | null>(null);
  const [reviewFeedbackAnswers, setReviewFeedbackAnswers] = useState<Record<string, string>>({});
  const [reviewFeedbackLoading, setReviewFeedbackLoading] = useState<string | null>(null);
  const [declinedFeedbackIds, setDeclinedFeedbackIds] = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAnswers, setResolveAnswers] = useState<Record<string, string>>({});
  const [resolveLoading, setResolveLoading] = useState<string | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const [similarQuestionsLoading, setSimilarQuestionsLoading] = useState(false);
  const [similarQuestionsLoaded, setSimilarQuestionsLoaded] = useState(false);
  const [docEngagementStats, setDocEngagementStats] = useState<DocEngagementStat[]>([]);
  const [engagementExpandedId, setEngagementExpandedId] = useState<string | null>(null);
  const [engagementRange, setEngagementRange] = useState<'7' | '30' | 'all'>('all');
  const [engagementSearch, setEngagementSearch] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [savingMetadataId, setSavingMetadataId] = useState<string | null>(null);
  const [replaceForm, setReplaceForm] = useState<ReplaceFormState>({
    documentId: null,
    title: "",
    category: "",
    version: "",
    publicationDate: "",
    documentNotes: "",
    approvalStatus: "active",
    file: null,
  });
  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    category: "",
    version: "",
    publicationDate: "",
    documentNotes: "",
    approvalStatus: "active",
  });
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(
    null,
  );
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(
    null,
  );
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailWarning, setInviteEmailWarning] = useState("");
  const [userInviteSearch, setUserInviteSearch] = useState("");
  const [userInviteStatusFilter, setUserInviteStatusFilter] = useState<
    "all" | "pending" | "approved" | "declined"
  >("all");
  const [activeTab, setActiveTab] = useState<
    "overview" | "access" | "documents" | "feedback" | "audit" | "trusted"
  >("overview");
  const [approvedUserInfo, setApprovedUserInfo] = useState<{
    email: string;
    message: string;
  } | null>(null);
  const inputClass =
    "w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary shadow-sm";
  const labelClass = "mb-1 block text-sm font-semibold text-primary";
  const secondaryButton =
    "rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-[#f3f0ed] disabled:opacity-60";
  const smallSecondaryButton =
    "rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-[#f3f0ed] disabled:opacity-60";
  const primaryButton =
    "rounded-xl bg-[#d73f09] px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#e8a08a] disabled:!text-white disabled:cursor-not-allowed";
  const blueButton =
    "rounded-xl bg-[#d73f09] px-3 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#e8a08a] disabled:!text-white disabled:cursor-not-allowed";
  const cardClass =
    "rounded-3xl border border-[#d8d1c7] bg-white p-4 shadow-sm sm:p-6";
  const subCardClass = "rounded-2xl bg-[#fcfaf7] p-4";
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.session.user.id)
        .single();
      if (profile?.role === "admin" && profile?.is_active) {
        setIsAdmin(true);
        await loadData();
      }
      setLoading(false);
    }
    init();
  }, [supabase]);
  useEffect(() => {
    const inProgress = documents.some(
      (d) =>
        d.processing_status === "pending" ||
        d.processing_status === "validating" ||
        d.processing_status === "processing",
    );
    if (!inProgress) return;
    const interval = setInterval(() => {
      loadDocuments();
    }, 5000);
    return () => clearInterval(interval);
  }, [documents]);
  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }
  async function loadData() {
    await loadDocuments();
    await loadAccessRequests();
    await loadFeedback();
    await loadNoAnswerItems();
    await loadUserAnalytics();
    await loadDocumentEngagement();
    await loadTrustedAnswers();
    await loadIssueReports();
    await loadAuditLogs();
  }
  async function loadDocuments() {
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (docsError || !docs) {
      setDocuments([]);
      setDocumentHealth({
        total: 0,
        active: 0,
        archived: 0,
        notProcessed: 0,
        zeroPages: 0,
        recent: [],
      });
      return;
    }
    const { data: pages } = await supabase
      .from("document_pages")
      .select("document_id");
    const pageCounts: Record<string, number> = {};
    for (const page of pages ?? []) {
      const documentId = String(page.document_id);
      pageCounts[documentId] = (pageCounts[documentId] ?? 0) + 1;
    }
    const enrichedDocs = docs.map((doc) => ({
      ...doc,
      page_count: pageCounts[String(doc.id)] ?? 0,
    })) as DocumentRow[];
    setDocuments(enrichedDocs);
    const total = enrichedDocs.length;
    const active = enrichedDocs.filter((d) => d.is_active).length;
    const archived = enrichedDocs.filter((d) => !d.is_active).length;
    const notProcessed = enrichedDocs.filter(
      (d) => !d.page_count || d.page_count === 0,
    ).length;
    const recent = [...enrichedDocs]
      .sort(
        (a, b) =>
          new Date(b.uploaded_at ?? 0).getTime() -
          new Date(a.uploaded_at ?? 0).getTime(),
      )
      .slice(0, 5);
    setDocumentHealth({
      total,
      active,
      archived,
      notProcessed,
      zeroPages: notProcessed,
      recent,
    });
  }
  async function loadAccessRequests() {
    const token = await getToken();
    if (!token) return;
    const response = await fetch("/api/access-requests", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(`Could not load access requests: ${result.error}`);
      return;
    }
    setAccessRequests(result.requests ?? []);
  }
  async function loadFeedback() {
    const { data: feedbackData, error } = await supabase
      .from("chat_feedback")
      .select("id, user_id, feedback_type, question, answer, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !feedbackData) {
      setFeedback([]);
      setFeedbackCounts({ helpful: 0, not_helpful: 0, missing_source: 0 });
      return;
    }
    const feedbackItems = feedbackData as FeedbackItem[];
    setFeedback(feedbackItems);
    setFeedbackCounts({
      helpful: feedbackItems.filter((item) => item.feedback_type === "helpful")
        .length,
      not_helpful: feedbackItems.filter(
        (item) => item.feedback_type === "not_helpful",
      ).length,
      missing_source: feedbackItems.filter(
        (item) => item.feedback_type === "missing_source",
      ).length,
    });
  }
  async function loadNoAnswerItems() {
    const { data } = await supabase
      .from("chat_history")
      .select(
        "id, user_id, question, answer, category, answer_mode, evidence_strength, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    const items = ((data ?? []) as NoAnswerItem[]).filter(
      (item) => item.evidence_strength?.label === "Not found",
    );
    const grouped: Record<
      string,
      {
        question: string;
        count: number;
        category?: string | null;
        answer_mode?: string | null;
      }
    > = {};
    items.forEach((item) => {
      const key = item.question.trim().toLowerCase();
      if (!grouped[key]) {
        grouped[key] = {
          question: item.question,
          count: 0,
          category: item.category,
          answer_mode: item.answer_mode,
        };
      }
      grouped[key].count += 1;
    });
    setContentGaps(
      Object.values(grouped)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    );
    setNoAnswerItems(items);
  }
  async function loadTrustedAnswers() {
    const { data, error } = await supabase
      .from("trusted_answers")
      .select(
        "id, question, answer, category, answer_mode, is_active, created_at",
      )
      .order("created_at", { ascending: false });
    if (error || !data) {
      setTrustedAnswers([]);
      return;
    }
    setTrustedAnswers(data as TrustedAnswer[]);
  }
  async function loadIssueReports() {
    const { data, error } = await supabase
      .from("issue_reports")
      .select(
        "id, user_email, issue_type, description, related_question, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) {
      setIssueReports([]);
      return;
    }
    setIssueReports(data as IssueReport[]);
  }
  async function loadAuditLogs() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id, actor_user_id, actor_email, actor_role, action, target_type, target_id, status, ip_address, user_agent, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) {
      setAuditLogs([]);
      return;
    }
    setAuditLogs(data as AuditLogItem[]);
  }
  async function loadUserAnalytics() {
    const token = await getToken();
    if (!token) {
      setUserAnalytics({
        totalQuestions: 0,
        uniqueUsers: 0,
        modeCounts: {},
        categoryCounts: {},
        heatmap: [],
        recentActivity: [],
      });
      return;
    }
    const response = await fetch("/api/admin-analytics", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(
        `Could not load analytics: ${result.error ?? "Unknown analytics error."}`,
      );
      return;
    }
    setUserAnalytics({
      totalQuestions: result.totalQuestions ?? 0,
      uniqueUsers: result.uniqueUsers ?? 0,
      modeCounts: result.modeCounts ?? {},
      categoryCounts: result.categoryCounts ?? {},
      heatmap: result.heatmap ?? [],
      recentActivity: result.recentActivity ?? [],
    });
  }
  async function loadDocumentEngagement(range: '7' | '30' | 'all' = 'all') {
    const token = await getToken();
    if (!token) return;
    const response = await fetch(`/api/document-analytics?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setDocEngagementStats(result.stats ?? []);
  }
  async function loadSimilarQuestions() {
    setSimilarQuestionsLoading(true);
    const token = await getToken();
    if (!token) { setSimilarQuestionsLoading(false); return; }
    const response = await fetch('/api/admin/similar-questions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setSimilarQuestions(result.matches ?? []);
    setSimilarQuestionsLoading(false);
    setSimilarQuestionsLoaded(true);
  }
  function formatDate(value?: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  }
  function viewPdfUrl(doc: DocumentRow) {
    return `/api/view-source?file=${encodeURIComponent(doc.filename)}`;
  }
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApprovedUserInfo(null);
    if (!file) {
      setMessage("Please choose a PDF file.");
      return;
    }
    if (file.type !== "application/pdf") {
      setMessage("Only PDF files are allowed.");
      return;
    }
    setUploadStatus('uploading');
    setMessage("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be signed in.");
      setUploadStatus('idle');
      return;
    }
    const safeFileName = file.name.replaceAll(" ", "-");
    const storagePath = `${user.id}/${Date.now()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, file);
    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`);
      setUploadStatus('idle');
      return;
    }
    const { data: insertedDoc, error: insertError } = await supabase
      .from("documents")
      .insert({
        title,
        filename: file.name,
        category,
        version,
        publication_date: publicationDate || null,
        document_notes: documentNotes || null,
        is_active: true,
        storage_path: storagePath,
        uploaded_by: user.id,
      })
      .select("id")
      .single();
    if (insertError || !insertedDoc) {
      setMessage(`Document record failed: ${insertError?.message ?? "Unknown error"}`);
      setUploadStatus('idle');
      return;
    }
    setTitle("");
    setCategory("");
    setVersion("");
    setPublicationDate("");
    setDocumentNotes("");
    setFile(null);
    setUploadStatus('processing');
    await loadDocuments();
    await processDocument(insertedDoc.id);
    setUploadStatus('idle');
  }
  async function processDocument(documentId: string) {
    setProcessingId(documentId);
    setMessage("Processing started — scroll down to the Uploaded documents section to see live status.");
    setApprovedUserInfo(null);
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setProcessingId(null);
        return;
      }
      const response = await fetch("/api/process-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(
          `Processing failed: ${result.error ?? "Unknown processing error."}`,
        );
        setProcessingId(null);
        return;
      }
      setMessage(
        result.pages_processed
          ? `Document processed successfully. Pages processed: ${result.pages_processed}.`
          : "Document processed successfully for AI search.",
      );
      setProcessingId(null);
      await loadDocuments();
      const doc = documents.find((d) => d.id === documentId);
      fetch("/api/send-processing-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: doc?.title,
          filename: doc?.filename,
          pagesProcessed: result.pages_processed,
        }),
      }).catch(() => {});
      fetch("/api/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New publication added",
          body: doc?.title ?? doc?.filename ?? "A new publication is now available.",
          url: "/publications",
        }),
      }).catch(() => {});
    } catch (error: any) {
      setMessage(
        `Processing failed: ${error.message ?? "Network or server error."}`,
      );
      setProcessingId(null);
    }
  }
  function openReplaceForm(doc: DocumentRow) {
    setReplaceForm({
      documentId: doc.id,
      title: doc.title || "",
      category: doc.category || "",
      version: doc.version || "",
      publicationDate: doc.publication_date || "",
      documentNotes: doc.document_notes || "",
      approvalStatus: "active",
      file: null,
    });
    setMessage("");
  }
  function closeReplaceForm() {
    setReplaceForm({
      documentId: null,
      title: "",
      category: "",
      version: "",
      publicationDate: "",
      documentNotes: "",
      approvalStatus: "active",
      file: null,
    });
  }
  function openEditForm(doc: DocumentRow) {
    setEditingDocId(doc.id);
    setReplaceForm((prev) => ({ ...prev, documentId: null }));
    setEditForm({
      title: doc.title || "",
      category: doc.category || "",
      version: doc.version || "",
      publicationDate: doc.publication_date || "",
      documentNotes: doc.document_notes || "",
      approvalStatus:
        doc.approval_status || (doc.is_active ? "active" : "archived"),
    });
  }
  function closeEditForm() {
    setEditingDocId(null);
    setEditForm({
      title: "",
      category: "",
      version: "",
      publicationDate: "",
      documentNotes: "",
      approvalStatus: "active",
    });
  }
  async function saveDocumentMetadata(documentId: string) {
    setSavingMetadataId(documentId);
    setMessage("Saving document details...");
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setSavingMetadataId(null);
        return;
      }
      const res = await fetch("/api/update-document-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId,
          title: editForm.title,
          category: editForm.category,
          version: editForm.version,
          publicationDate: editForm.publicationDate,
          documentNotes: editForm.documentNotes,
          approvalStatus: editForm.approvalStatus,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(result.error || "Update failed.");
        setSavingMetadataId(null);
        return;
      }
      setMessage("Document details updated.");
      setSavingMetadataId(null);
      closeEditForm();
      await loadDocuments();
    } catch (error: any) {
      setMessage(
        `Update failed: ${error.message ?? "Network or server error."}`,
      );
      setSavingMetadataId(null);
    }
  }
  async function replaceDocument() {
    if (!replaceForm.documentId) {
      setMessage("Choose a document to replace.");
      return;
    }
    if (!replaceForm.file) {
      setMessage("Please select a replacement PDF.");
      return;
    }
    if (replaceForm.file.type !== "application/pdf") {
      setMessage("Only PDF files are allowed.");
      return;
    }
    const confirmed = window.confirm(
      "Replace this document? The old document will be archived, the new document will be uploaded, and the new version will be processed for chat search.",
    );
    if (!confirmed) return;
    setReplacingId(replaceForm.documentId);
    setMessage("Replacing document and preparing it for search...");
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setReplacingId(null);
        return;
      }
      const formData = new FormData();
      formData.append("oldDocumentId", replaceForm.documentId);
      formData.append("title", replaceForm.title);
      formData.append("category", replaceForm.category);
      formData.append("version", replaceForm.version);
      formData.append("publicationDate", replaceForm.publicationDate);
      formData.append("documentNotes", replaceForm.documentNotes);
      formData.append("approvalStatus", replaceForm.approvalStatus);
      formData.append("file", replaceForm.file);
      const replaceResponse = await fetch("/api/replace-document", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const replaceResult = await replaceResponse.json().catch(() => ({}));
      if (!replaceResponse.ok || !replaceResult.newDocumentId) {
        setMessage(replaceResult.error ?? "Replacement failed.");
        setReplacingId(null);
        return;
      }
      const processResponse = await fetch("/api/process-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId: replaceResult.newDocumentId }),
      });
      const processResult = await processResponse.json().catch(() => ({}));
      if (!processResponse.ok) {
        setMessage(
          `Replacement uploaded, but processing failed: ${processResult.error ?? "Unknown processing error."}`,
        );
        setReplacingId(null);
        await loadDocuments();
        return;
      }
      setMessage(
        processResult.pages_processed
          ? `Document replaced and processed successfully. Pages processed: ${processResult.pages_processed}.`
          : "Document replaced and processed successfully.",
      );
      setReplacingId(null);
      closeReplaceForm();
      await loadDocuments();
    } catch (error: any) {
      setMessage(
        `Replacement failed: ${error.message ?? "Network or server error."}`,
      );
      setReplacingId(null);
    }
  }
  async function updateDocumentStatus(documentId: string, isActive: boolean) {
    setUpdatingId(documentId);
    setMessage(isActive ? "Unarchiving document..." : "Archiving document...");
    setApprovedUserInfo(null);
    const token = await getToken();
    if (!token) {
      setMessage("You must be signed in.");
      setUpdatingId(null);
      return;
    }
    const response = await fetch("/api/update-document-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documentId, isActive }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(
        `Status update failed: ${result.error ?? "Unknown status error."}`,
      );
      setUpdatingId(null);
      return;
    }
    setMessage(isActive ? "Document unarchived." : "Document archived.");
    setUpdatingId(null);
    await loadDocuments();
  }
  async function bulkSetStatus(ids: string[], isActive: boolean) {
    setBulkActioning(true);
    setMessage(`${isActive ? 'Unarchiving' : 'Archiving'} ${ids.length} document(s)...`);
    const token = await getToken();
    if (!token) { setBulkActioning(false); return; }
    for (const documentId of ids) {
      await fetch("/api/update-document-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId, isActive }),
      });
    }
    setSelectedDocIds(new Set());
    setBulkActioning(false);
    setMessage(`${ids.length} document(s) ${isActive ? 'unarchived' : 'archived'}.`);
    await loadDocuments();
  }
  async function bulkReprocess(ids: string[]) {
    setBulkActioning(true);
    setMessage(`Reprocessing ${ids.length} document(s)...`);
    for (const documentId of ids) {
      await processDocument(documentId);
    }
    setSelectedDocIds(new Set());
    setBulkActioning(false);
  }
  async function deleteDocument(documentId: string, documentTitle: string) {
    const confirmed = window.confirm(
      `Delete "${documentTitle}"? This will remove the PDF, page chunks, OpenAI files, and document record. This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingId(documentId);
    setMessage("Deleting document...");
    setApprovedUserInfo(null);
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setDeletingId(null);
        return;
      }
      const response = await fetch("/api/delete-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(`Delete failed: ${result.error ?? "Unknown delete error."}`);
        setDeletingId(null);
        return;
      }
      setMessage("Document deleted.");
      setDeletingId(null);
      await loadDocuments();
    } catch (error: any) {
      setMessage(
        `Delete failed: ${error.message ?? "Network or server error."}`,
      );
      setDeletingId(null);
    }
  }
  async function approveAccessRequest(requestId: string) {
    setApprovingId(requestId);
    setMessage("Approving access request...");
    setApprovedUserInfo(null);
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setApprovingId(null);
        return;
      }
      const response = await fetch("/api/approve-access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(
          `Approval failed: ${result.error ?? "Unknown approval error."}`,
        );
        setApprovingId(null);
        return;
      }
      setApprovedUserInfo({
        email: result.email,
        message:
          result.message ??
          "Invitation email sent. User will set their password from the email link.",
      });
      setMessage("Access request approved. Invitation email sent.");
      setApprovingId(null);
      await loadAccessRequests();
    } catch (error: any) {
      setMessage(
        `Approval failed: ${error.message ?? "Network or server error."}`,
      );
      setApprovingId(null);
    }
  }
  async function declineRequest(requestId: string) {
    const confirmDecline = window.confirm(
      "Are you sure you want to decline this access request?",
    );
    if (!confirmDecline) return;
    setDecliningId(requestId);
    setMessage("Declining request...");
    setApprovedUserInfo(null);
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setDecliningId(null);
        return;
      }
      const res = await fetch("/api/decline-access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(result.error ?? "Decline failed.");
        setDecliningId(null);
        return;
      }
      setMessage("Access request declined.");
      setDecliningId(null);
      await loadData();
    } catch (error: any) {
      setMessage(
        `Decline failed: ${error.message ?? "Network or server error."}`,
      );
      setDecliningId(null);
    }
  }
  async function sendDirectInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSendingInvite(true);
    setMessage("Sending invite...");
    setApprovedUserInfo(null);
    try {
      const trimmedEmail = inviteEmail.trim().toLowerCase();
      setInviteEmailWarning("");
      if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
        setInviteEmailWarning(
          "Please enter a valid email address before sending an invite.",
        );
        setMessage(
          "Please enter a valid email address before sending an invite.",
        );
        setSendingInvite(false);
        return;
      }
      if (
        trimmedEmail.includes("enter_") ||
        trimmedEmail.includes("placeholder") ||
        trimmedEmail.includes("example.com")
      ) {
        setInviteEmailWarning(
          "Please replace the placeholder with a real email address.",
        );
        setMessage("Please replace the placeholder with a real email address.");
        setSendingInvite(false);
        return;
      }
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setSendingInvite(false);
        return;
      }
      const res = await fetch("/api/send-user-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: inviteFullName, email: trimmedEmail }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(result.error ?? "Invite failed.");
        setSendingInvite(false);
        return;
      }
      setInviteFullName("");
      setInviteEmail("");
      setInviteEmailWarning("");
      setApprovedUserInfo({
        email: result.email,
        message: result.message ?? "Invite sent.",
      });
      setMessage(result.message ?? "Invite sent.");
      setSendingInvite(false);
      await loadData();
    } catch (error: any) {
      setMessage(
        `Invite failed: ${error.message ?? "Network or server error."}`,
      );
      setSendingInvite(false);
    }
  }
  async function resendInvite(request: AccessRequest) {
    setResendingInviteId(request.id);
    setMessage("Resending invite...");
    setApprovedUserInfo(null);
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setResendingInviteId(null);
        return;
      }
      const res = await fetch("/api/resend-user-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: request.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(result.error ?? "Resend invite failed.");
        setResendingInviteId(null);
        return;
      }
      setApprovedUserInfo({
        email: result.email,
        message: result.message ?? "Invite resent.",
      });
      setMessage(result.message ?? "Invite resent.");
      setResendingInviteId(null);
      await loadData();
    } catch (error: any) {
      setMessage(
        `Resend invite failed: ${error.message ?? "Network or server error."}`,
      );
      setResendingInviteId(null);
    }
  }
  async function updateUserStatus(request: AccessRequest, isActive: boolean) {
    const action = isActive ? "reactivate" : "deactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${request.full_name || request.email}?`,
    );
    if (!confirmed) return;
    setUpdatingUserEmail(request.email);
    setMessage(isActive ? "Reactivating user..." : "Deactivating user...");
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setUpdatingUserEmail(null);
        return;
      }
      const res = await fetch("/api/update-user-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: request.email, isActive }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(result.error ?? "User status update failed.");
        setUpdatingUserEmail(null);
        return;
      }
      setMessage(
        result.message ??
          (isActive ? "User reactivated." : "User deactivated."),
      );
      setUpdatingUserEmail(null);
      await loadData();
    } catch (error: any) {
      setMessage(
        `User status update failed: ${error.message ?? "Network or server error."}`,
      );
      setUpdatingUserEmail(null);
    }
  }
  async function deleteUser(request: AccessRequest) {
    const confirmed = window.confirm(
      `Delete ${request.full_name || request.email}? This removes their login account and profile. Chat history, feedback, and issue reports will remain for reporting.`,
    );
    if (!confirmed) return;
    const secondConfirm = window.confirm(
      "This cannot be undone. Are you sure you want to permanently delete this user?",
    );
    if (!secondConfirm) return;
    setDeletingUserEmail(request.email);
    setMessage("Deleting user...");
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        setDeletingUserEmail(null);
        return;
      }
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: request.email,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(result.error ?? "Delete user failed.");
        setDeletingUserEmail(null);
        return;
      }
      setMessage(result.message ?? "User deleted.");
      setDeletingUserEmail(null);
      await loadData();
    } catch (error: any) {
      setMessage(
        `Delete user failed: ${error.message ?? "Network or server error."}`,
      );
      setDeletingUserEmail(null);
    }
  }
  async function saveTrustedAnswer(item: NoAnswerItem) {
    setMessage("Saving trusted answer...");
    try {
      const token = await getToken();
      if (!token) {
        setMessage("You must be signed in.");
        return;
      }
      const res = await fetch("/api/trusted-answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: item.question,
          answer: item.answer,
          category: item.category,
          answerMode: item.answer_mode,
          sources: [],
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage(result.error ?? "Failed to save trusted answer.");
        return;
      }
      setMessage("Trusted answer saved.");
      await loadTrustedAnswers();
    } catch (error: any) {
      setMessage(error.message ?? "Failed to save trusted answer.");
    }
  }
  async function resolveSourceSuggestion(item: FeedbackItem, action: 'trust' | 'email' | 'both') {
    const answer = reviewFeedbackAnswers[item.id]?.trim();
    if (!answer) { setMessage("Please write a verified answer first."); return; }
    setReviewFeedbackLoading(item.id);
    const token = await getToken();
    if (!token) { setReviewFeedbackLoading(null); return; }
    try {
      if (action === 'trust' || action === 'both') {
        const res = await fetch("/api/trusted-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: item.question, answer, category: null, answerMode: 'general', sources: [] }),
        });
        if (!res.ok) { setMessage("Failed to save trusted answer."); setReviewFeedbackLoading(null); return; }
        await loadTrustedAnswers();
      }
      if ((action === 'email' || action === 'both') && item.user_id) {
        const res = await fetch("/api/admin/send-answer-to-user", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: item.user_id, question: item.question, answer }),
        });
        if (!res.ok) { setMessage("Failed to send email to user."); setReviewFeedbackLoading(null); return; }
      }
      setMessage(
        action === 'trust' ? "Saved as trusted answer." :
        action === 'email' ? "Answer sent to user." :
        "Saved as trusted answer and sent to user."
      );
      setDeclinedFeedbackIds((prev) => new Set([...prev, item.id]));
      setReviewingFeedbackId(null);
    } catch {
      setMessage("An error occurred. Please try again.");
    }
    setReviewFeedbackLoading(null);
  }
  async function resolveNoAnswer(item: NoAnswerItem, action: 'trust' | 'email' | 'both') {
    const answer = resolveAnswers[item.id]?.trim();
    if (!answer) { setMessage("Please write an answer first."); return; }
    setResolveLoading(item.id);
    const token = await getToken();
    if (!token) { setResolveLoading(null); return; }
    try {
      if (action === 'trust' || action === 'both') {
        const res = await fetch("/api/trusted-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: item.question, answer, category: item.category, answerMode: item.answer_mode, sources: [] }),
        });
        if (!res.ok) { setMessage("Failed to save trusted answer."); setResolveLoading(null); return; }
        await loadTrustedAnswers();
      }
      if ((action === 'email' || action === 'both') && item.user_id) {
        const res = await fetch("/api/admin/send-answer-to-user", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: item.user_id, question: item.question, answer }),
        });
        if (!res.ok) { setMessage("Failed to send email to user."); setResolveLoading(null); return; }
      }
      setMessage(
        action === 'trust' ? "Saved as trusted answer." :
        action === 'email' ? "Answer sent to user." :
        "Saved as trusted answer and sent to user."
      );
      setResolvingId(null);
      setResolveAnswers((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    } catch {
      setMessage("An error occurred. Please try again.");
    }
    setResolveLoading(null);
  }
  function startEditTrustedAnswer(item: TrustedAnswer) {
    setEditingTrustedId(item.id);
    setTrustedEditQuestion(item.question);
    setTrustedEditAnswer(item.answer);
  }
  function cancelEditTrustedAnswer() {
    setEditingTrustedId(null);
    setTrustedEditQuestion("");
    setTrustedEditAnswer("");
  }
  async function updateTrustedAnswer(item: TrustedAnswer) {
    setMessage("Updating trusted answer...");
    const { error } = await supabase
      .from("trusted_answers")
      .update({
        question: trustedEditQuestion,
        answer: trustedEditAnswer,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }
    setMessage("Trusted answer updated.");
    cancelEditTrustedAnswer();
    await loadTrustedAnswers();
  }
  async function toggleTrustedAnswer(item: TrustedAnswer) {
    setMessage(
      item.is_active
        ? "Deactivating trusted answer..."
        : "Activating trusted answer...",
    );
    const { error } = await supabase
      .from("trusted_answers")
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      setMessage(`Status update failed: ${error.message}`);
      return;
    }
    setMessage(
      item.is_active
        ? "Trusted answer deactivated."
        : "Trusted answer activated.",
    );
    await loadTrustedAnswers();
  }
  async function deleteTrustedAnswer(item: TrustedAnswer) {
    const confirmed = window.confirm(
      `Delete trusted answer for: "${item.question}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    setMessage("Deleting trusted answer...");
    const { error } = await supabase
      .from("trusted_answers")
      .delete()
      .eq("id", item.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    setMessage("Trusted answer deleted.");
    await loadTrustedAnswers();
  }
  async function updateIssueStatus(
    item: IssueReport,
    status: "new" | "reviewed" | "resolved" | "enhancement_candidate",
  ) {
    setUpdatingIssueId(item.id);
    setMessage(`Updating issue to ${status}...`);
    const { error } = await supabase
      .from("issue_reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      setMessage(`Issue update failed: ${error.message}`);
      setUpdatingIssueId(null);
      return;
    }
    setMessage(`Issue marked ${status}.`);
    setUpdatingIssueId(null);
    await loadIssueReports();
  }
  const filteredFeedback = feedback.filter((item) => {
    const search = feedbackSearch.trim().toLowerCase();
    const matchesType =
      feedbackFilter === "all" || item.feedback_type === feedbackFilter;
    const matchesSearch =
      !search ||
      (item.question ?? "").toLowerCase().includes(search) ||
      (item.answer ?? "").toLowerCase().includes(search) ||
      item.feedback_type.toLowerCase().includes(search);
    return matchesType && matchesSearch;
  });
  const pendingRequests = accessRequests.filter(
    (request) => request.status === "pending",
  );
  const approvedRequests = accessRequests.filter(
    (request) => request.status === "approved",
  );
  const filteredInviteDirectory = accessRequests.filter((request) => {
    const search = userInviteSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      request.full_name.toLowerCase().includes(search) ||
      request.email.toLowerCase().includes(search) ||
      (request.reason ?? "").toLowerCase().includes(search);
    const matchesStatus =
      userInviteStatusFilter === "all" ||
      request.status === userInviteStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const openIssues = issueReports.filter(
    (issue) => issue.status === "new" || issue.status === "open",
  );
  const reviewedIssues = issueReports.filter(
    (issue) => issue.status === "reviewed",
  );
  const resolvedIssues = issueReports.filter(
    (issue) => issue.status === "resolved",
  );
  const enhancementCandidateIssues = issueReports.filter(
    (issue) => issue.status === "enhancement_candidate",
  );
  const problemFeedback = feedback.filter(
    (item) =>
      item.feedback_type === "not_helpful" ||
      item.feedback_type === "missing_source",
  );
  const topProblemQuestions = Object.values(
    problemFeedback.reduce(
      (
        acc: Record<
          string,
          { question: string; count: number; types: Set<string> }
        >,
        item,
      ) => {
        const questionText = item.question || "No question saved";
        const key = questionText.trim().toLowerCase();
        if (!acc[key])
          acc[key] = {
            question: questionText,
            count: 0,
            types: new Set<string>(),
          };
        acc[key].count += 1;
        acc[key].types.add(item.feedback_type.replaceAll("_", " "));
        return acc;
      },
      {},
    ),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const issueTypeCounts = Object.entries(
    issueReports.reduce((acc: Record<string, number>, item) => {
      acc[item.issue_type] = (acc[item.issue_type] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const filteredIssueReports = issueReports.filter((issue) => {
    const search = issueSearch.trim().toLowerCase();
    const normalizedStatus = issue.status === "open" ? "new" : issue.status;
    const matchesStatus =
      issueStatusFilter === "all" || normalizedStatus === issueStatusFilter;
    const matchesSearch =
      !search ||
      issue.issue_type.toLowerCase().includes(search) ||
      issue.description.toLowerCase().includes(search) ||
      (issue.related_question ?? "").toLowerCase().includes(search) ||
      (issue.user_email ?? "").toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
  const auditActionOptions = Array.from(
    new Set(auditLogs.map((log) => log.action).filter(Boolean)),
  ).sort();
  const filteredAuditLogs = auditLogs.filter((log) => {
    const search = auditSearch.trim().toLowerCase();
    const metadataText = formatAuditMetadata(log.metadata).toLowerCase();
    const matchesStatus =
      auditStatusFilter === "all" || log.status === auditStatusFilter;
    const matchesAction =
      auditActionFilter === "all" || log.action === auditActionFilter;
    const matchesSearch =
      !search ||
      log.action.toLowerCase().includes(search) ||
      (log.actor_email ?? "").toLowerCase().includes(search) ||
      (log.actor_role ?? "").toLowerCase().includes(search) ||
      (log.target_type ?? "").toLowerCase().includes(search) ||
      (log.target_id ?? "").toLowerCase().includes(search) ||
      metadataText.includes(search);
    return matchesStatus && matchesAction && matchesSearch;
  });
  const totalPages = documents.reduce(
    (sum, doc) => sum + (doc.page_count ?? 0),
    0,
  );
  const pendingReviewDocuments = documents.filter(
    (doc) => doc.approval_status === "pending_review",
  );
  const activeUnprocessedDocuments = documents.filter(
    (doc) => doc.is_active && (!doc.page_count || doc.page_count === 0),
  );
  const mostRecentUpload = documents
    .filter((doc) => doc.uploaded_at)
    .sort(
      (a, b) =>
        new Date(b.uploaded_at ?? 0).getTime() -
        new Date(a.uploaded_at ?? 0).getTime(),
    )[0];
  const filteredDocumentsForAdmin = documents.filter((doc) => {
    const search = documentSearch.trim().toLowerCase();
    const isProcessed = (doc.page_count ?? 0) > 0;
    const matchesSearch =
      !search ||
      doc.title.toLowerCase().includes(search) ||
      doc.filename.toLowerCase().includes(search) ||
      (doc.category ?? "").toLowerCase().includes(search) ||
      (doc.version ?? "").toLowerCase().includes(search) ||
      (doc.publication_date ?? "").toLowerCase().includes(search) ||
      (doc.approval_status ?? "").toLowerCase().includes(search);
    const matchesStatus =
      documentStatusFilter === "all" ||
      (documentStatusFilter === "active" && doc.is_active) ||
      (documentStatusFilter === "archived" && !doc.is_active) ||
      (documentStatusFilter === "processed" && isProcessed) ||
      (documentStatusFilter === "not_processed" && !isProcessed) ||
      (documentStatusFilter === "pending_review" &&
        doc.approval_status === "pending_review");
    return matchesSearch && matchesStatus;
  });
  const documentHealthDocs = (() => {
    const sorted = [...documents].sort(
      (a, b) =>
        new Date(b.uploaded_at ?? 0).getTime() -
        new Date(a.uploaded_at ?? 0).getTime(),
    );
    if (documentHealthView === "not_processed")
      return sorted.filter((doc) => !doc.page_count || doc.page_count === 0);
    if (documentHealthView === "zero_pages")
      return sorted.filter((doc) => !doc.page_count || doc.page_count === 0);
    return sorted.slice(0, 15);
  })();
  function getIssueStatusDisplay(status: string) {
    if (status === "open") return "new";
    if (status === "enhancement_candidate") return "enhancement candidate";
    return status.replaceAll("_", " ");
  }
  function getIssueStatusClass(status: string) {
    if (status === "new" || status === "open") return "bg-red-100 text-red-700";
    if (status === "reviewed") return "bg-yellow-100 text-yellow-800";
    if (status === "enhancement_candidate") return "bg-blue-100 text-blue-700";
    if (status === "resolved") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-secondary";
  }
  function getAccessStatusClass(status: string) {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    if (status === "declined") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-secondary";
  }
  function getProfileStatusClass(request: AccessRequest) {
    if (request.profile_is_active === false) return "bg-red-100 text-red-700";
    if (request.profile_is_active === true)
      return "bg-green-100 text-green-700";
    return "bg-gray-100 text-secondary";
  }
  function getProfileStatusLabel(request: AccessRequest) {
    if (request.profile_is_active === false) return "inactive";
    if (request.profile_is_active === true)
      return request.profile_role || "active";
    return "no profile";
  }
  function getAuditStatusClass(status: string) {
    if (status === "success") return "bg-green-100 text-green-700";
    if (status === "failure") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-secondary";
  }
  function formatAuditMetadata(metadata?: Record<string, unknown> | null) {
    if (!metadata || Object.keys(metadata).length === 0) return "—";
    try {
      return JSON.stringify(metadata);
    } catch {
      return "Metadata unavailable";
    }
  }
  function csvValue(value: unknown) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadTextFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportRowsAsCSV(
    filename: string,
    headers: string[],
    rows: unknown[][],
  ) {
    if (rows.length === 0) {
      setMessage("No records available to export for this view.");
      return;
    }

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvValue).join(","))
      .join("\n");

    downloadTextFile(filename, csvContent, "text/csv;charset=utf-8;");
    setMessage(`Export downloaded: ${filename}`);
  }

  function exportJSONFile(filename: string, data: Record<string, unknown>) {
    downloadTextFile(
      filename,
      JSON.stringify(data, null, 2),
      "application/json;charset=utf-8;",
    );
    setMessage(`Export downloaded: ${filename}`);
  }

  function exportFeedbackCSV() {
    exportRowsAsCSV(
      "mfp-feedback-export.csv",
      ["Question", "Answer", "Feedback Type", "Created At"],
      feedback.map((item) => [
        item.question ?? "",
        item.answer ?? "",
        item.feedback_type,
        item.created_at,
      ]),
    );
  }

  function exportIssueReportsCSV() {
    exportRowsAsCSV(
      "mfp-issue-reports-export.csv",
      [
        "Issue Type",
        "Status",
        "User Email",
        "Related Question",
        "Description",
        "Created At",
      ],
      issueReports.map((item) => [
        item.issue_type,
        item.status,
        item.user_email ?? "",
        item.related_question ?? "",
        item.description,
        item.created_at,
      ]),
    );
  }

  function exportAccessRequestsCSV() {
    exportRowsAsCSV(
      "mfp-access-requests-export.csv",
      [
        "Full Name",
        "Email",
        "Status",
        "Profile Active",
        "Profile Role",
        "Created At",
        "Approved At",
        "Last Invited At",
        "Invite Count",
        "Last Activity",
        "Last Login",
        "Last Chat",
        "Total Questions",
      ],
      accessRequests.map((item) => [
        item.full_name,
        item.email,
        item.status,
        item.profile_is_active ?? "",
        item.profile_role ?? "",
        item.created_at,
        item.approved_at ?? "",
        item.last_invited_at ?? "",
        item.invite_count ?? 0,
        item.last_activity_at ?? "",
        item.last_login_at ?? "",
        item.last_chat_at ?? "",
        item.total_questions_asked ?? 0,
      ]),
    );
  }

  function exportDocumentInventoryCSV() {
    exportRowsAsCSV(
      "mfp-document-inventory-export.csv",
      [
        "Title",
        "Filename",
        "Category",
        "Version",
        "Publication Date",
        "Uploaded At",
        "Active",
        "Approval Status",
        "Pages",
        "Storage Path",
        "Vector Store ID",
      ],
      documents.map((doc) => [
        doc.title,
        doc.filename,
        doc.category ?? "",
        doc.version ?? "",
        doc.publication_date ?? "",
        doc.uploaded_at ?? "",
        doc.is_active,
        doc.approval_status ?? "",
        doc.page_count ?? 0,
        doc.storage_path ?? "",
        doc.vector_store_id ?? "",
      ]),
    );
  }

  function exportTrustedAnswersJSON() {
    exportJSONFile("mfp-trusted-answers-export.json", {
      exported_at: new Date().toISOString(),
      record_count: trustedAnswers.length,
      trusted_answers: trustedAnswers,
    });
  }

  function exportAuditLogsCSV() {
    exportRowsAsCSV(
      "mfp-audit-logs-export.csv",
      [
        "Created At",
        "Actor Email",
        "Actor Role",
        "Action",
        "Target Type",
        "Target ID",
        "Status",
        "Metadata",
      ],
      auditLogs.map((item) => [
        item.created_at,
        item.actor_email ?? "",
        item.actor_role ?? "",
        item.action,
        item.target_type ?? "",
        item.target_id ?? "",
        item.status ?? "",
        JSON.stringify(item.metadata ?? {}),
      ]),
    );
  }

  function exportSystemSnapshotJSON() {
    exportJSONFile("mfp-operational-backup-snapshot.json", {
      exported_at: new Date().toISOString(),
      export_scope: "admin_operational_snapshot",
      notes:
        "Lightweight admin export for backup readiness, reporting, and disaster recovery reference. PDF binary files remain in Supabase Storage and are not embedded in this JSON export.",
      counts: {
        documents: documents.length,
        active_documents: documents.filter((doc) => doc.is_active).length,
        access_requests: accessRequests.length,
        feedback: feedback.length,
        issue_reports: issueReports.length,
        trusted_answers: trustedAnswers.length,
        audit_logs: auditLogs.length,
      },
      documents,
      access_requests: accessRequests,
      feedback,
      issue_reports: issueReports,
      trusted_answers: trustedAnswers,
      audit_logs: auditLogs,
      document_health: {
        ...documentHealth,
        total_pages: totalPages,
        pending_review: documents.filter(
          (doc) => doc.approval_status === "pending_review",
        ).length,
      },
      user_analytics: userAnalytics,
    });
  }

  function isDocumentProcessing(doc: DocumentRow) {
    const status = doc.processing_status;
    const lockedUntil = doc.processing_locked_until
      ? new Date(doc.processing_locked_until)
      : null;
    const lockActive = lockedUntil ? lockedUntil.getTime() > Date.now() : false;
    return (status === "processing" || status === "validating") && lockActive;
  }
  function renderDocumentMeta(doc: DocumentRow) {
    const isProcessed = (doc.page_count ?? 0) > 0;
    const processingStatus =
      doc.processing_status || (isProcessed ? "processed" : "pending");
    const processingActive = isDocumentProcessing(doc);
    return (
      <div className="mt-2 grid gap-1 text-xs text-muted md:grid-cols-2">
        <p>
          <strong className="text-secondary">Category:</strong>{" "}
          {doc.category || "Uncategorized"}
        </p>
        <p>
          <strong className="text-secondary">Version:</strong>{" "}
          {doc.version || "—"}
        </p>
        <p>
          <strong className="text-secondary">Publication date:</strong>{" "}
          {formatDate(doc.publication_date)}
        </p>
        <p>
          <strong className="text-secondary">Uploaded:</strong>{" "}
          {formatDate(doc.uploaded_at)}
        </p>
        <p>
          <strong className="text-secondary">Pages:</strong>{" "}
          {doc.page_count || 0}
        </p>
        <p>
          <strong className="text-secondary">Search status:</strong>{" "}
          {isProcessed ? "Processed" : "Not processed"}
        </p>
        <p>
          <strong className="text-secondary">Processing:</strong>{" "}
          {processingActive ? `${processingStatus}...` : processingStatus}
        </p>
        <p>
          <strong className="text-secondary">Progress:</strong>{" "}
          {doc.processing_progress ?? 0}%
        </p>
        <p>
          <strong className="text-secondary">Attempts:</strong>{" "}
          {doc.processing_attempts ?? 0}
        </p>
        <p>
          <strong className="text-secondary">Last page:</strong>{" "}
          {doc.last_processed_page ?? 0}
        </p>
        <p>
          <strong className="text-secondary">Document status:</strong>{" "}
          {doc.is_active ? "Active" : "Archived"}
        </p>
        <p>
          <strong className="text-secondary">Approval:</strong>{" "}
          {doc.approval_status || (doc.is_active ? "active" : "archived")}
        </p>
        {doc.replaced_at && (
          <p>
            <strong className="text-secondary">Replaced:</strong>{" "}
            {formatDate(doc.replaced_at)}
          </p>
        )}
        {doc.processing_locked_until && (
          <p>
            <strong className="text-secondary">Lock until:</strong>{" "}
            {new Date(doc.processing_locked_until).toLocaleString()}
          </p>
        )}
        {doc.processing_error && (
          <p className="md:col-span-2 text-red-700">
            <strong className="text-secondary">Last error:</strong>{" "}
            {doc.processing_error}
          </p>
        )}
        {doc.document_notes && (
          <p className="md:col-span-2">
            <strong className="text-secondary">Notes:</strong>{" "}
            {doc.document_notes}
          </p>
        )}
      </div>
    );
  }
  function renderStatusPill(doc: DocumentRow) {
    const status =
      doc.approval_status || (doc.is_active ? "active" : "archived");
    const className =
      status === "active"
        ? "bg-green-100 text-green-700"
        : status === "pending_review"
          ? "bg-yellow-100 text-yellow-800"
          : status === "approved"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-secondary";
    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}
      >
        {status}
      </span>
    );
  }
  if (loading) {
    return (
      <>
    
        <main className="min-h-screen bg-[#f7f4ef] p-8 text-primary">
          Loading...
        </main>
      </>
    );
  }
  if (!isAdmin) {
    return (
      <>
    
        <main className="min-h-screen bg-[#f7f4ef] p-8 text-primary">
          <h1 className="text-2xl font-bold text-primary">Access denied</h1>
          <p className="mt-2 text-secondary">
            You must be an admin to manage this app.
          </p>
        </main>
      </>
    );
  }
  return (
    <>
  
      <main className="min-h-screen bg-[#f7f4ef] text-primary">
        <div className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-6 sm:py-8">
          <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
            <div className="bg-[#d73f09] px-5 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Oregon State University Extension
              </p>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#fff1eb] px-3 py-1 text-xs font-semibold text-[#b93808]">
                  Operations Console
                </span>

                <span className="rounded-full bg-[#f3f0ed] px-3 py-1 text-xs font-semibold text-secondary">
                  Master Food Preserver Knowledge System
                </span>
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  Administration
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
                  Manage publications, monitor processing health, review feedback,
                  support trusted preservation guidance, and oversee operational readiness.
                </p>
              </div>
            </div>
          </section>
          {message && (
            <div className={`rounded-xl border p-3 text-sm shadow-sm ${message.toLowerCase().includes("processing") ? "border-orange-200 bg-orange-50 text-orange-900" : "border-[#d8d1c7] bg-white text-primary"}`}>
              {message}
            </div>
          )}
          {approvedUserInfo && (
            <section className={`${cardClass} space-y-3`}>
              <h2 className="text-xl font-bold text-primary">
                Approved User Invitation
              </h2>
              <p className="text-sm text-secondary">
                The user has been approved and should receive an email
                invitation to set their password.
              </p>
              <div className="space-y-1 rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] p-3 text-sm text-primary">
                <p>
                  <strong>Email:</strong> {approvedUserInfo.email}
                </p>
                <p>
                  <strong>Status:</strong> {approvedUserInfo.message}
                </p>
              </div>
            </section>
          )}
          <div className="sticky top-[155px] z-40 rounded-3xl border border-[#d8d1c7] bg-white/90 p-2 shadow-sm backdrop-blur sm:top-[145px] lg:top-[92px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
              {[
                { key: "overview", label: "Overview" },
                { key: "access", label: "Access" },
                { key: "documents", label: "Documents" },
                { key: "feedback", label: "Feedback" },
                { key: "enhancements", label: "Enhancements" },
                { key: "audit", label: "Audit Logs" },
                { key: "trusted", label: "Trusted" },
                { key: "releases", label: "Releases" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    if (tab.key === "enhancements") {
                      window.location.href = "/admin/enhancements";
                      return;
                    }
                    if (tab.key === "releases") {
                      window.location.href = "/admin/releases";
                      return;
                    }
                    setActiveTab(tab.key as any);
                  }}
                  className={`min-h-11 rounded-xl px-2 py-2 text-center text-xs font-semibold leading-tight sm:px-3 sm:text-sm lg:w-auto ${
                    activeTab === tab.key
                      ? "bg-[#d73f09] !text-white shadow-sm"
                      : "border border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {activeTab === "overview" && (
            <>
              <section className={`${cardClass} space-y-4`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Operational Exports & Readiness
                    </h2>
                    <p className="text-sm text-secondary">
                      Download lightweight CSV and JSON exports for reporting,
                      backup readiness, and disaster recovery reference.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportSystemSnapshotJSON}
                    className={primaryButton}
                  >
                    Export full backup JSON
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Backup readiness
                    </p>
                    <p className="mt-1 text-sm text-primary">
                      {documents.length > 0
                        ? "Document inventory available for export."
                        : "No document inventory yet."}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Last upload:{" "}
                      {mostRecentUpload?.uploaded_at
                        ? new Date(
                            mostRecentUpload.uploaded_at,
                          ).toLocaleString()
                        : "No uploads yet"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Processing watch items
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold ${activeUnprocessedDocuments.length > 0 ? "text-red-700" : "text-green-700"}`}
                    >
                      {activeUnprocessedDocuments.length}
                    </p>
                    <p className="text-xs text-secondary">
                      Active documents not processed for search
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#d8d1c7] bg-[#fcfaf7] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Review watch items
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold ${pendingReviewDocuments.length > 0 ? "text-yellow-800" : "text-green-700"}`}
                    >
                      {pendingReviewDocuments.length}
                    </p>
                    <p className="text-xs text-secondary">
                      Documents marked pending review
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={exportDocumentInventoryCSV}
                    className={secondaryButton}
                  >
                    Export document inventory CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportAccessRequestsCSV}
                    className={secondaryButton}
                  >
                    Export access requests CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportFeedbackCSV}
                    className={secondaryButton}
                  >
                    Export feedback CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportIssueReportsCSV}
                    className={secondaryButton}
                  >
                    Export issue reports CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportAuditLogsCSV}
                    className={secondaryButton}
                  >
                    Export audit logs CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportTrustedAnswersJSON}
                    className={secondaryButton}
                  >
                    Export trusted answers JSON
                  </button>
                </div>

                <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  Exports download to your browser only. They do not change
                  production data and do not include PDF binary files from
                  Supabase Storage.
                </p>
              </section>

              <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {[
                  ["Total documents", documentHealth.total, "normal"],
                  ["Active", documentHealth.active, "normal"],
                  ["Archived", documentHealth.archived, "normal"],
                  ["Processed pages", totalPages, "normal"],
                  ["Pending requests", pendingRequests.length, "warning"],
                  ["Approved users", approvedRequests.length, "success"],
                  ["Open issues", openIssues.length, "danger"],
                ].map(([label, value, type]) => {
                  const hasValue = Number(value) > 0;
                  return (
                    <div
                      key={label}
                      className={`rounded-xl border px-3 py-2 text-center shadow-sm ${type === "warning" && hasValue ? "border-yellow-300 bg-yellow-50" : type === "danger" && hasValue ? "border-red-300 bg-red-50" : type === "success" && hasValue ? "border-green-300 bg-green-50" : "border-[#d8d1c7] bg-white"}`}
                    >
                      <p className="text-[11px] font-medium leading-tight text-secondary">
                        {label}
                      </p>
                      <p
                        className={`text-xl font-bold leading-tight ${type === "warning" && hasValue ? "text-yellow-800" : type === "danger" && hasValue ? "text-red-700" : type === "success" && hasValue ? "text-green-700" : "text-primary"}`}
                      >
                        {value}
                      </p>
                    </div>
                  );
                })}
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <section className={`${cardClass} space-y-4`}>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      User Analytics
                    </h2>
                    <p className="text-sm text-secondary">
                      See how users are using the reference system.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#d8d1c7] p-4">
                      <p className="text-sm text-secondary">Questions asked</p>
                      <p className="text-2xl font-bold text-primary">
                        {userAnalytics.totalQuestions}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#d8d1c7] p-4">
                      <p className="text-sm text-secondary">Unique users</p>
                      <p className="text-2xl font-bold text-primary">
                        {userAnalytics.uniqueUsers}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#d8d1c7] p-4">
                      <h3 className="font-bold text-primary">Answer modes</h3>
                      <div className="mt-3 space-y-2">
                        {Object.entries(userAnalytics.modeCounts).map(
                          ([mode, count]) => (
                            <div
                              key={mode}
                              className="flex justify-between text-sm text-primary"
                            >
                              <span>{mode}</span>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#d8d1c7] p-4">
                      <h3 className="font-bold text-primary">Categories</h3>
                      <div className="mt-3 space-y-2">
                        {Object.entries(userAnalytics.categoryCounts).map(
                          ([cat, count]) => (
                            <div
                              key={cat}
                              className="flex justify-between text-sm text-primary"
                            >
                              <span>{cat}</span>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </section>
                <section className={`${cardClass} space-y-4`}>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Document Health
                    </h2>
                    <p className="text-sm text-secondary">
                      Overview of document processing and readiness.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#d8d1c7] p-4">
                      <p className="text-xs font-medium text-muted">
                        Not processed
                      </p>
                      <p className="text-xl font-bold text-red-700">
                        {documentHealth.notProcessed}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#d8d1c7] p-4">
                      <p className="text-xs font-medium text-muted">
                        Zero pages
                      </p>
                      <p className="text-xl font-bold text-red-700">
                        {documentHealth.zeroPages}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["recent", "Recent uploads"],
                      ["not_processed", "Not processed"],
                      ["zero_pages", "Zero pages"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDocumentHealthView(documentHealthView === key ? null : key as any)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold ${documentHealthView === key ? "bg-[#d73f09] !text-white shadow-sm" : "border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {documentHealthView !== null && (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {documentHealthDocs.length === 0 ? (
                      <p className="rounded-xl border border-[#d8d1c7] p-3 text-sm text-muted">
                        No documents found for this view.
                      </p>
                    ) : (
                      documentHealthDocs.map((doc) => {
                        const isProcessed = (doc.page_count ?? 0) > 0;
                        return (
                          <div
                            key={doc.id}
                            className="rounded-xl border border-[#d8d1c7] p-3"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-primary">
                                    {doc.title || doc.filename}
                                  </p>
                                  {(processingId === doc.id ||
                                    doc.processing_status === "pending" ||
                                    doc.processing_status === "validating" ||
                                    doc.processing_status === "processing") &&
                                    !isProcessed && (
                                      <span className="animate-pulse rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                                        {processingId === doc.id
                                          ? "Processing…"
                                          : `${doc.processing_status}…`}
                                      </span>
                                    )}
                                </div>
                                {renderDocumentMeta(doc)}
                              </div>
                              {!isProcessed && (
                                <button
                                  type="button"
                                  onClick={() => processDocument(doc.id)}
                                  disabled={
                                    processingId === doc.id ||
                                    deletingId === doc.id
                                  }
                                  className={smallSecondaryButton}
                                >
                                  {processingId === doc.id
                                    ? "Processing..."
                                    : "Process"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  )}
                </section>
              </section>
              {userAnalytics.heatmap.length === 7 && (
                <section className={`${cardClass} space-y-4`}>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Activity Heatmap</h2>
                    <p className="text-sm text-secondary">Questions asked by day and hour (your local time).</p>
                  </div>
                  {(() => {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const max = Math.max(1, ...userAnalytics.heatmap.flat());
                    return (
                      <div className="overflow-x-auto">
                        <div className="min-w-[520px]">
                          {/* Hour labels */}
                          <div className="mb-1 flex pl-10">
                            {Array.from({ length: 24 }, (_, h) => (
                              <div key={h} className="flex-1 text-center text-[9px] text-muted">
                                {h % 6 === 0 ? `${h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}` : ''}
                              </div>
                            ))}
                          </div>
                          {/* Grid rows */}
                          {userAnalytics.heatmap.map((hours, day) => (
                            <div key={day} className="mb-0.5 flex items-center gap-1">
                              <span className="w-9 shrink-0 text-right text-xs font-semibold text-secondary">{days[day]}</span>
                              {hours.map((count, hour) => {
                                const intensity = count === 0 ? 0 : Math.ceil((count / max) * 4);
                                const bg = ['bg-[#f3f0ed]', 'bg-orange-100', 'bg-orange-200', 'bg-orange-400', 'bg-[#d73f09]'][intensity];
                                return (
                                  <div
                                    key={hour}
                                    title={`${days[day]} ${hour}:00 — ${count} question${count !== 1 ? 's' : ''}`}
                                    className={`h-5 flex-1 rounded-sm ${bg}`}
                                  />
                                );
                              })}
                            </div>
                          ))}
                          {/* Legend */}
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-muted">Less</span>
                            {['bg-[#f3f0ed]', 'bg-orange-100', 'bg-orange-200', 'bg-orange-400', 'bg-[#d73f09]'].map((bg, i) => (
                              <div key={i} className={`h-4 w-4 rounded-sm ${bg}`} />
                            ))}
                            <span className="text-xs text-muted">More</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}
              <section className={`${cardClass} space-y-4`}>
                <button
                  type="button"
                  onClick={() => setEngagementExpanded((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Document Engagement
                    </h2>
                    <p className="text-sm text-secondary">
                      {engagementExpanded
                        ? 'How often each publication is viewed and questioned.'
                        : `${docEngagementStats.length} publications · ${docEngagementStats.reduce((s, d) => s + d.viewCount, 0)} views · ${docEngagementStats.reduce((s, d) => s + d.questionCount, 0)} questions`}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-lg text-secondary">{engagementExpanded ? '▲' : '▼'}</span>
                </button>
                {engagementExpanded && (
                <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div />
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex gap-1">
                      {(['7', '30', 'all'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setEngagementRange(r);
                            loadDocumentEngagement(r);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${engagementRange === r ? 'bg-[#d73f09] !text-white' : 'border border-[#d8d1c7] bg-white text-primary hover:bg-[#f3f0ed]'}`}
                        >
                          {r === '7' ? 'Last 7 days' : r === '30' ? 'Last 30 days' : 'All time'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={engagementSearch}
                      onChange={(e) => setEngagementSearch(e.target.value)}
                      placeholder="Search publications..."
                      className="w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-1.5 text-sm text-primary shadow-sm sm:w-56"
                    />
                  </div>
                </div>
                {docEngagementStats.length === 0 ? (
                  <p className="text-sm text-secondary">No engagement data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#d8d1c7] text-left text-xs font-semibold text-secondary">
                          <th className="pb-2 pr-4">Publication</th>
                          <th className="pb-2 pr-4 text-right">Views</th>
                          <th className="pb-2 pr-4 text-right">Questions</th>
                          <th className="pb-2">Recent questions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docEngagementStats.filter((s) => {
                          const q = engagementSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (s.title ?? '').toLowerCase().includes(q) || s.filename.toLowerCase().includes(q);
                        }).map((stat) => (
                          <React.Fragment key={stat.id}>
                            <tr
                              className="border-b border-[#f0ede9] cursor-pointer hover:bg-[#faf8f6]"
                              onClick={() =>
                                setEngagementExpandedId(
                                  engagementExpandedId === stat.id ? null : stat.id,
                                )
                              }
                            >
                              <td className="py-2 pr-4 font-medium text-primary max-w-[200px] truncate">
                                {stat.title || stat.filename}
                              </td>
                              <td className="py-2 pr-4 text-right font-semibold text-primary">
                                {stat.viewCount}
                              </td>
                              <td className="py-2 pr-4 text-right font-semibold text-primary">
                                {stat.questionCount}
                              </td>
                              <td className="py-2 text-secondary">
                                {stat.recentQuestions[0]
                                  ? <span className="truncate block max-w-[260px]">{stat.recentQuestions[0]}</span>
                                  : <span className="italic">—</span>}
                              </td>
                            </tr>
                            {engagementExpandedId === stat.id && stat.recentQuestions.length > 1 && (
                              <tr className="border-b border-[#f0ede9] bg-[#faf8f6]">
                                <td colSpan={4} className="pb-3 pt-1 pl-4">
                                  <p className="mb-1 text-xs font-semibold text-secondary">Recent questions</p>
                                  <ul className="space-y-1">
                                    {stat.recentQuestions.map((q, i) => (
                                      <li key={i} className="text-sm text-primary">• {q}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </>
                )}
              </section>
            </>
          )}
          {activeTab === "access" && (
            <section className={`${cardClass} space-y-6`}>
              <div>
                <h2 className="text-2xl font-bold text-primary">
                  Access & Invites
                </h2>
                <p className="text-sm text-secondary">
                  Approve access requests, send direct invites, or resend setup
                  links.
                </p>
              </div>
              <form
                onSubmit={sendDirectInvite}
                className={`${subCardClass} space-y-3`}
              >
                <div>
                  <h3 className="font-semibold text-primary">
                    Send direct invite
                  </h3>
                  <p className="text-sm text-secondary">
                    Use this when you want to invite someone without asking them
                    to complete the request form first.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteEmailWarning("");
                      }}
                      className={`${inputClass} ${
                        inviteEmailWarning ? "border-red-300 bg-red-50" : ""
                      }`}
                      required
                    />
                    {inviteEmailWarning && (
                      <p className="mt-1 text-xs text-red-700">
                        {inviteEmailWarning}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sendingInvite}
                    className={primaryButton}
                  >
                    {sendingInvite ? "Sending..." : "Send invite"}
                  </button>
                </div>
              </form>
              <div>
                <h3 className="font-semibold text-primary">
                  Pending access requests
                </h3>
                {pendingRequests.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-[#d8d1c7] bg-white p-4 text-sm text-secondary">
                    No pending access requests.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 grid gap-3 lg:hidden">
                      {pendingRequests.map((request) => (
                        <article
                          key={request.id}
                          className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-bold text-primary">
                                  {request.full_name}
                                </h4>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${getAccessStatusClass(request.status)}`}
                                >
                                  {request.status}
                                </span>
                              </div>
                              <p className="mt-1 break-words text-sm text-secondary">
                                {request.email}
                              </p>
                            </div>
                            <dl className="grid gap-2 text-sm">
                              <div className="rounded-xl bg-[#fcfaf7] p-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Reason
                                </dt>
                                <dd className="mt-1 whitespace-pre-wrap text-primary">
                                  {request.reason || "—"}
                                </dd>
                              </div>
                              <div className="rounded-xl bg-[#fcfaf7] p-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Submitted
                                </dt>
                                <dd className="mt-1 text-primary">
                                  {new Date(
                                    request.created_at,
                                  ).toLocaleString()}
                                </dd>
                              </div>
                            </dl>
                            <div className="grid grid-cols-2 gap-2 border-t border-[#e8e1d8] pt-3">
                              <button
                                type="button"
                                onClick={() => approveAccessRequest(request.id)}
                                disabled={
                                  approvingId === request.id ||
                                  decliningId === request.id
                                }
                                className="min-h-11 rounded-xl bg-[#d73f09] px-3 py-2 text-sm font-semibold !text-white shadow-sm disabled:bg-[#e8a08a]"
                              >
                                {approvingId === request.id
                                  ? "Approving..."
                                  : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => declineRequest(request.id)}
                                disabled={
                                  approvingId === request.id ||
                                  decliningId === request.id
                                }
                                className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-60"
                              >
                                {decliningId === request.id
                                  ? "Declining..."
                                  : "Decline"}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="mt-3 hidden overflow-x-auto rounded-xl border border-[#d8d1c7] lg:block">
                      <table className="w-full text-sm text-primary">
                        <thead className="bg-[#fcfaf7]">
                          <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Reason</th>
                            <th className="p-3 text-left">Submitted</th>
                            <th className="p-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingRequests.map((request) => (
                            <tr
                              key={request.id}
                              className="border-t border-[#d8d1c7] align-top"
                            >
                              <td className="p-3 font-medium">
                                {request.full_name}
                              </td>
                              <td className="p-3 text-xs text-secondary">
                                {request.email}
                              </td>
                              <td className="p-3 text-xs text-secondary">
                                {request.reason || "—"}
                              </td>
                              <td className="p-3 text-xs text-secondary">
                                {new Date(request.created_at).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      approveAccessRequest(request.id)
                                    }
                                    disabled={
                                      approvingId === request.id ||
                                      decliningId === request.id
                                    }
                                    className={primaryButton}
                                  >
                                    {approvingId === request.id
                                      ? "Approving..."
                                      : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => declineRequest(request.id)}
                                    disabled={
                                      approvingId === request.id ||
                                      decliningId === request.id
                                    }
                                    className={smallSecondaryButton}
                                  >
                                    {decliningId === request.id
                                      ? "Declining..."
                                      : "Decline"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">
                      Users & Invites Directory
                    </h3>
                    <p className="text-sm text-secondary">
                      Search everyone who has requested access or been invited.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      type="text"
                      value={userInviteSearch}
                      onChange={(e) => setUserInviteSearch(e.target.value)}
                      placeholder="Search name, email, or reason..."
                      className={inputClass}
                    />
                    <select
                      value={userInviteStatusFilter}
                      onChange={(e) =>
                        setUserInviteStatusFilter(e.target.value as any)
                      }
                      className={inputClass}
                    >
                      <option value="all">All statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {[
                    ["Total records", accessRequests.length],
                    ["Pending", pendingRequests.length],
                    ["Approved", approvedRequests.length],
                    ["Showing", filteredInviteDirectory.length],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-[#d8d1c7] bg-white p-3"
                    >
                      <p className="text-xs text-secondary">{label}</p>
                      <p className="text-2xl font-bold text-primary">{value}</p>
                    </div>
                  ))}
                </div>
                {accessRequests.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">
                    No users or invites yet.
                  </p>
                ) : filteredInviteDirectory.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-[#d8d1c7] p-3 text-sm text-secondary">
                    No users or invites match your search/filter.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 grid gap-3 lg:hidden">
                      {filteredInviteDirectory.map((request) => (
                        <article
                          key={request.id}
                          className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm"
                        >
                          <div className="space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-bold text-primary">
                                  {request.full_name}
                                </h4>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${getAccessStatusClass(request.status)}`}
                                >
                                  {request.status}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${getProfileStatusClass(request)}`}
                                >
                                  {getProfileStatusLabel(request)}
                                </span>
                              </div>
                              <p className="mt-1 break-words text-sm text-secondary">
                                {request.email}
                              </p>
                            </div>
                            {request.reason && (
                              <div className="rounded-xl bg-[#fcfaf7] p-3 text-sm text-secondary">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Reason
                                </p>
                                <p className="mt-1 line-clamp-3">
                                  {request.reason}
                                </p>
                              </div>
                            )}
                            <div className="rounded-xl bg-[#fcfaf7] p-3 text-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Last activity
                              </p>
                              <p className="mt-1 text-primary">
                                {request.last_activity_at
                                  ? new Date(
                                      request.last_activity_at,
                                    ).toLocaleString()
                                  : "No activity"}
                              </p>
                              {request.last_question && (
                                <p className="mt-1 line-clamp-3 text-xs text-secondary">
                                  {request.last_question}
                                </p>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-secondary">
                              <p>
                                <strong>Last login:</strong>{" "}
                                {request.last_login_at
                                  ? new Date(
                                      request.last_login_at,
                                    ).toLocaleString()
                                  : "Never"}
                              </p>
                              <p>
                                <strong>Last chat:</strong>{" "}
                                {request.last_chat_at
                                  ? new Date(
                                      request.last_chat_at,
                                    ).toLocaleString()
                                  : "Never"}
                              </p>
                              <p>
                                <strong>Total questions:</strong>{" "}
                                {request.total_questions_asked ?? 0}
                              </p>
                            </div>
                            {request.status === "approved" && (
                              <div className="grid gap-2 border-t border-[#e8e1d8] pt-3 sm:grid-cols-3">
                                <button
                                  type="button"
                                  onClick={() => resendInvite(request)}
                                  disabled={resendingInviteId === request.id}
                                  className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-60"
                                >
                                  {resendingInviteId === request.id
                                    ? "Resending..."
                                    : "Resend"}
                                </button>
                                {request.profile_is_active === false ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateUserStatus(request, true)
                                    }
                                    disabled={
                                      updatingUserEmail === request.email
                                    }
                                    className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                                  >
                                    {updatingUserEmail === request.email
                                      ? "Updating..."
                                      : "Reactivate"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateUserStatus(request, false)
                                    }
                                    disabled={
                                      updatingUserEmail === request.email
                                    }
                                    className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                  >
                                    {updatingUserEmail === request.email
                                      ? "Updating..."
                                      : "Deactivate"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteUser(request)}
                                  disabled={deletingUserEmail === request.email}
                                  className="min-h-11 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                                >
                                  {deletingUserEmail === request.email
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="mt-3 hidden max-h-[420px] overflow-y-auto rounded-xl border border-[#d8d1c7] lg:block">
                      <table className="w-full text-sm text-primary">
                        <thead className="sticky top-0 bg-[#fcfaf7]">
                          <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">User</th>
                            <th className="p-3 text-left">Last activity</th>
                            <th className="p-3 text-left">Usage</th>
                            <th className="p-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInviteDirectory.map((request) => (
                            <tr
                              key={request.id}
                              className="border-t border-[#d8d1c7] align-top"
                            >
                              <td className="p-3">
                                <p className="font-semibold text-primary">
                                  {request.full_name}
                                </p>
                                {request.reason && (
                                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                                    {request.reason}
                                  </p>
                                )}
                              </td>
                              <td className="p-3 text-xs text-secondary">
                                {request.email}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${getAccessStatusClass(request.status)}`}
                                >
                                  {request.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${getProfileStatusClass(request)}`}
                                >
                                  {getProfileStatusLabel(request)}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-muted">
                                {request.last_activity_at
                                  ? new Date(
                                      request.last_activity_at,
                                    ).toLocaleString()
                                  : "No activity"}
                                {request.last_question && (
                                  <p className="mt-1 line-clamp-2 text-[11px] text-secondary">
                                    {request.last_question}
                                  </p>
                                )}
                              </td>
                              <td className="p-3 text-xs text-muted">
                                <div className="space-y-1">
                                  <p>
                                    <strong>Login:</strong>{" "}
                                    {request.last_login_at
                                      ? new Date(
                                          request.last_login_at,
                                        ).toLocaleDateString()
                                      : "—"}
                                  </p>
                                  <p>
                                    <strong>Chat:</strong>{" "}
                                    {request.last_chat_at
                                      ? new Date(
                                          request.last_chat_at,
                                        ).toLocaleDateString()
                                      : "—"}
                                  </p>
                                  <p>
                                    <strong>Questions:</strong>{" "}
                                    {request.total_questions_asked ?? 0}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  {request.status === "approved" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => resendInvite(request)}
                                        disabled={
                                          resendingInviteId === request.id
                                        }
                                        className={smallSecondaryButton}
                                      >
                                        {resendingInviteId === request.id
                                          ? "Resending..."
                                          : "Resend"}
                                      </button>
                                      {request.profile_is_active === false ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateUserStatus(request, true)
                                          }
                                          disabled={
                                            updatingUserEmail === request.email
                                          }
                                          className="rounded-xl border border-[#d8d1c7] px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                                        >
                                          {updatingUserEmail === request.email
                                            ? "Updating..."
                                            : "Reactivate"}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateUserStatus(request, false)
                                          }
                                          disabled={
                                            updatingUserEmail === request.email
                                          }
                                          className="rounded-xl border border-[#d8d1c7] px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                        >
                                          {updatingUserEmail === request.email
                                            ? "Updating..."
                                            : "Deactivate"}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => deleteUser(request)}
                                        disabled={
                                          deletingUserEmail === request.email
                                        }
                                        className="rounded-xl border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                                      >
                                        {deletingUserEmail === request.email
                                          ? "Deleting..."
                                          : "Delete"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
          {activeTab === "documents" && (
            <>
              <section className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    Upload PDF
                  </h2>
                  <p className="text-sm text-secondary">
                    Add active publications for the Reference system to search. Publication
                    date and notes are optional but recommended.
                  </p>
                </div>
                <form
                  onSubmit={handleUpload}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Example: Drying Fruits and Vegetables"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Example: Food safety, Canning, Freezing"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Version</label>
                    <input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="Example: 2026, v1, current"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Publication date</label>
                    <input
                      type="date"
                      value={publicationDate}
                      onChange={(e) => setPublicationDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Document notes</label>
                    <textarea
                      value={documentNotes}
                      onChange={(e) => setDocumentNotes(e.target.value)}
                      placeholder="Optional notes for admins, such as source, update context, or review notes."
                      className="min-h-[84px] w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>PDF file</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped?.type === 'application/pdf') setFile(dropped);
                      }}
                      onClick={() => document.getElementById('pdf-file-input')?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${isDragging ? 'border-[#d73f09] bg-[#fff5f2]' : 'border-[#d8d1c7] bg-[#fcfaf7] hover:bg-[#f3f0ed]'}`}
                    >
                      <svg className="h-8 w-8 text-[#d73f09]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {file ? (
                        <p className="text-sm font-semibold text-primary">{file.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-primary">Drop PDF here or click to browse</p>
                          <p className="text-xs text-secondary">PDF files only</p>
                        </>
                      )}
                      <input
                        id="pdf-file-input"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <button
                      type="submit"
                      disabled={uploadStatus !== 'idle'}
                      className={primaryButton}
                    >
                      {uploadStatus === 'uploading'
                        ? 'Uploading…'
                        : uploadStatus === 'processing'
                          ? 'Processing…'
                          : 'Upload & Process'}
                    </button>
                    {uploadStatus !== 'idle' && (
                      <p className="animate-pulse text-sm font-medium text-orange-700">
                        {uploadStatus === 'uploading'
                          ? 'Uploading PDF to storage…'
                          : 'Processing complete — building search index. Scroll down to see live status in Uploaded documents.'}
                      </p>
                    )}
                  </div>
                </form>
              </section>
              <section className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    Uploaded documents
                  </h2>
                  <p className="text-sm text-secondary">
                    View full PDFs, replace updated publications, archive old
                    versions, and process documents for page-level citations.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <input
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    placeholder="Search title, filename, category, version, or publication date..."
                    className={inputClass}
                  />
                  <select
                    value={documentStatusFilter}
                    onChange={(e) =>
                      setDocumentStatusFilter(e.target.value as any)
                    }
                    className={inputClass}
                  >
                    <option value="all">All documents</option>
                    <option value="active">Active only</option>
                    <option value="archived">Archived only</option>
                    <option value="pending_review">Pending review</option>
                    <option value="processed">Processed only</option>
                    <option value="not_processed">Not processed only</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 text-sm text-secondary md:flex-row md:items-center md:justify-between">
                  <p>
                    Showing <strong>{filteredDocumentsForAdmin.length}</strong>{" "}
                    of <strong>{documents.length}</strong> uploaded documents
                  </p>
                  {(documentSearch || documentStatusFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentSearch("");
                        setDocumentStatusFilter("all");
                      }}
                      className={smallSecondaryButton}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                {selectedDocIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#d8d1c7] bg-[#faf8f6] px-4 py-3">
                    <span className="text-sm font-semibold text-primary">
                      {selectedDocIds.size} selected
                    </span>
                    <button
                      type="button"
                      disabled={bulkActioning}
                      onClick={() => bulkSetStatus([...selectedDocIds], false)}
                      className={smallSecondaryButton}
                    >
                      Archive all
                    </button>
                    <button
                      type="button"
                      disabled={bulkActioning}
                      onClick={() => bulkSetStatus([...selectedDocIds], true)}
                      className={smallSecondaryButton}
                    >
                      Unarchive all
                    </button>
                    <button
                      type="button"
                      disabled={bulkActioning}
                      onClick={() => bulkReprocess([...selectedDocIds])}
                      className={smallSecondaryButton}
                    >
                      Reprocess all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDocIds(new Set())}
                      className="ml-auto text-xs text-secondary hover:text-primary"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
                {filteredDocumentsForAdmin.length === 0 ? (
                  <p className="rounded-xl border border-[#d8d1c7] p-3 text-sm text-secondary">
                    No documents match your search/filter.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredDocumentsForAdmin.map((doc) => {
                      const isProcessed = (doc.page_count ?? 0) > 0;
                      const isReplacingThis = replacingId === doc.id;
                      const replacementOpen = replaceForm.documentId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className={`rounded-xl border bg-white p-4 ${selectedDocIds.has(doc.id) ? 'border-[#d73f09]' : 'border-[#d8d1c7]'}`}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedDocIds.has(doc.id)}
                                  onChange={(e) => {
                                    const next = new Set(selectedDocIds);
                                    e.target.checked ? next.add(doc.id) : next.delete(doc.id);
                                    setSelectedDocIds(next);
                                  }}
                                  className="h-4 w-4 accent-[#d73f09]"
                                />
                                <p className="font-semibold text-primary">
                                  {doc.title || doc.filename}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${doc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-secondary"}`}
                                >
                                  {doc.is_active ? "Active" : "Archived"}
                                </span>
                                {renderStatusPill(doc)}
                                {(processingId === doc.id ||
                                  doc.processing_status === "pending" ||
                                  doc.processing_status === "validating" ||
                                  doc.processing_status === "processing") &&
                                  !isProcessed && (
                                    <span className="animate-pulse rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                                      {processingId === doc.id
                                        ? "Processing…"
                                        : `${doc.processing_status}…`}
                                    </span>
                                  )}
                                {doc.replaced_by_document_id && (
                                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                                    Replaced
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 break-all text-xs text-muted">
                                {doc.filename}
                              </p>
                              {renderDocumentMeta(doc)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={viewPdfUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={smallSecondaryButton}
                              >
                                View PDF
                              </a>
                              {!isProcessed && (
                                <button
                                  type="button"
                                  onClick={() => processDocument(doc.id)}
                                  disabled={
                                    processingId === doc.id ||
                                    deletingId === doc.id ||
                                    isReplacingThis
                                  }
                                  className={smallSecondaryButton}
                                >
                                  {processingId === doc.id
                                    ? "Processing..."
                                    : "Process"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditForm(doc)}
                                disabled={isReplacingThis}
                                className={smallSecondaryButton}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openReplaceForm(doc)}
                                disabled={
                                  deletingId === doc.id || isReplacingThis
                                }
                                className={smallSecondaryButton}
                              >
                                Replace PDF
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentStatus(doc.id, !doc.is_active)
                                }
                                disabled={
                                  updatingId === doc.id ||
                                  deletingId === doc.id ||
                                  isReplacingThis
                                }
                                className={smallSecondaryButton}
                              >
                                {updatingId === doc.id
                                  ? "Updating..."
                                  : doc.is_active
                                    ? "Archive"
                                    : "Unarchive"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteDocument(
                                    doc.id,
                                    doc.title || doc.filename,
                                  )
                                }
                                disabled={
                                  deletingId === doc.id || isReplacingThis
                                }
                                className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                {deletingId === doc.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                          {editingDocId === doc.id && (
                            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                              <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h3 className="font-semibold text-primary">
                                    Edit document details
                                  </h3>
                                  <p className="text-sm text-secondary">
                                    Update metadata without replacing the PDF.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={closeEditForm}
                                  className={smallSecondaryButton}
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className={labelClass}>Title</label>
                                  <input
                                    value={editForm.title}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>Category</label>
                                  <input
                                    value={editForm.category}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        category: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>Version</label>
                                  <input
                                    value={editForm.version}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        version: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>
                                    Publication date
                                  </label>
                                  <input
                                    type="date"
                                    value={editForm.publicationDate}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        publicationDate: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>
                                    Approval status
                                  </label>
                                  <select
                                    value={editForm.approvalStatus}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        approvalStatus: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  >
                                    <option value="active">Active</option>
                                    <option value="approved">Approved</option>
                                    <option value="pending_review">
                                      Pending review
                                    </option>
                                    <option value="archived">Archived</option>
                                    <option value="draft">Draft</option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>
                                    Admin notes
                                  </label>
                                  <textarea
                                    value={editForm.documentNotes}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        documentNotes: e.target.value,
                                      }))
                                    }
                                    className="min-h-[80px] w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                                  />
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveDocumentMetadata(doc.id)}
                                  disabled={savingMetadataId === doc.id}
                                  className={blueButton}
                                >
                                  {savingMetadataId === doc.id
                                    ? "Saving..."
                                    : "Save changes"}
                                </button>
                                <button
                                  type="button"
                                  onClick={closeEditForm}
                                  disabled={savingMetadataId === doc.id}
                                  className={secondaryButton}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          {replacementOpen && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                              <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h3 className="font-semibold text-primary">
                                    Replace this PDF
                                  </h3>
                                  <p className="text-sm text-secondary">
                                    The current document will be archived. The
                                    replacement will be uploaded, processed, and
                                    made active automatically.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={closeReplaceForm}
                                  className={smallSecondaryButton}
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className={labelClass}>
                                    Replacement title
                                  </label>
                                  <input
                                    value={replaceForm.title}
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>Category</label>
                                  <input
                                    value={replaceForm.category}
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        category: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>Version</label>
                                  <input
                                    value={replaceForm.version}
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        version: e.target.value,
                                      }))
                                    }
                                    placeholder="Example: 2026 update"
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>
                                    Publication date
                                  </label>
                                  <input
                                    type="date"
                                    value={replaceForm.publicationDate}
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        publicationDate: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>
                                    Approval status
                                  </label>
                                  <select
                                    value={replaceForm.approvalStatus}
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        approvalStatus: e.target.value,
                                      }))
                                    }
                                    className={inputClass}
                                  >
                                    <option value="active">Active</option>
                                    <option value="pending_review">
                                      Pending review
                                    </option>
                                    <option value="approved">Approved</option>
                                    <option value="draft">Draft</option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>
                                    Admin notes
                                  </label>
                                  <textarea
                                    value={replaceForm.documentNotes}
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        documentNotes: e.target.value,
                                      }))
                                    }
                                    className="min-h-[80px] w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>
                                    Replacement PDF
                                  </label>
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) =>
                                      setReplaceForm((prev) => ({
                                        ...prev,
                                        file: e.target.files?.[0] ?? null,
                                      }))
                                    }
                                    className="w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                                  />
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={replaceDocument}
                                  disabled={isReplacingThis}
                                  className={blueButton}
                                >
                                  {isReplacingThis
                                    ? "Replacing and processing..."
                                    : "Replace and process"}
                                </button>
                                <button
                                  type="button"
                                  onClick={closeReplaceForm}
                                  disabled={isReplacingThis}
                                  className={secondaryButton}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
          {activeTab === "feedback" && (
            <>
              <section className={`${cardClass} space-y-5`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Feedback Insights
                    </h2>
                    <p className="text-sm text-secondary">
                      Spot weak answers, missing sources, issue trends, and
                      repeated content gaps.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href="/admin/feedback"
                        className={smallSecondaryButton}
                      >
                        Open detailed feedback review
                      </a>
                      <a href="/admin/issues" className={smallSecondaryButton}>
                        Open detailed issue review
                      </a>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_180px_auto]">
                    <input
                      type="text"
                      value={feedbackSearch}
                      onChange={(e) => setFeedbackSearch(e.target.value)}
                      placeholder="Search feedback..."
                      className={inputClass}
                    />
                    <select
                      value={feedbackFilter}
                      onChange={(e) => setFeedbackFilter(e.target.value as any)}
                      className={inputClass}
                    >
                      <option value="all">All feedback</option>
                      <option value="helpful">Helpful</option>
                      <option value="not_helpful">Not helpful</option>
                      <option value="missing_source">Missing source</option>
                    </select>
                    <button
                      type="button"
                      onClick={exportFeedbackCSV}
                      className={secondaryButton}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  {[
                    ["Helpful", feedbackCounts.helpful, "green"],
                    ["Not helpful", feedbackCounts.not_helpful, "red"],
                    ["Missing source", feedbackCounts.missing_source, "yellow"],
                    ["Open issues", openIssues.length, "red"],
                    ["Reviewed", reviewedIssues.length, "yellow"],
                    ["Resolved", resolvedIssues.length, "green"],
                    ["Enhancements", enhancementCandidateIssues.length, "blue"],
                  ].map(([label, value, color]) => (
                    <div
                      key={label}
                      className={`rounded-xl border p-3 ${color === "green" ? "border-green-300 bg-green-50" : color === "red" ? "border-red-300 bg-red-50" : color === "blue" ? "border-blue-300 bg-blue-50" : "border-yellow-300 bg-yellow-50"}`}
                    >
                      <p className="text-xs font-medium text-secondary">
                        {label}
                      </p>
                      <p
                        className={`text-2xl font-bold ${color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : color === "blue" ? "text-blue-700" : "text-yellow-800"}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className={subCardClass}>
                    <h3 className="font-semibold text-primary">
                      Top problem questions
                    </h3>
                    <p className="text-xs text-secondary">
                      Questions marked not helpful or missing source most often.
                    </p>
                    {topProblemQuestions.length === 0 ? (
                      <p className="mt-3 text-sm text-secondary">
                        No problem questions yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {topProblemQuestions.map((item, index) => (
                          <div
                            key={`${item.question}-${index}`}
                            className="rounded-xl border border-[#d8d1c7] bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="line-clamp-2 text-sm font-semibold text-primary">
                                {item.question}
                              </p>
                              <span className="shrink-0 rounded-full border border-[#d8d1c7] px-2 py-1 text-xs text-secondary">
                                {item.count}x
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {Array.from(item.types).join(", ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <section className={subCardClass}>
                    <h3 className="font-semibold text-primary">
                      Most common issue types
                    </h3>
                    <p className="text-xs text-secondary">
                      Issue report categories submitted by users.
                    </p>
                    {issueTypeCounts.length === 0 ? (
                      <p className="mt-3 text-sm text-secondary">
                        No issue types yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {issueTypeCounts.map(([issueType, count]) => (
                          <div
                            key={issueType}
                            className="flex items-center justify-between rounded-xl border border-[#d8d1c7] bg-white p-3 text-sm text-primary"
                          >
                            <span>{issueType}</span>
                            <span className="rounded-full border border-[#d8d1c7] px-2 py-1 text-xs text-secondary">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                <section className={subCardClass}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-primary">
                        Recent feedback
                      </h3>
                      <p className="text-xs text-secondary">
                        Filtered list for quick review and export.
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-[#d8d1c7] bg-white px-2 py-1 text-xs font-semibold text-secondary">
                      {filteredFeedback.length} showing
                    </span>
                  </div>
                  {filteredFeedback.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-[#d8d1c7] bg-white p-3 text-sm text-secondary">
                      No feedback matches the current search/filter.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {filteredFeedback.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="whitespace-pre-wrap text-sm font-semibold text-primary">
                                {item.question || "No question saved"}
                              </p>
                              {item.answer && (
                                <div className="mt-3 rounded-xl bg-[#fcfaf7] p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    Answer excerpt
                                  </p>
                                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted">
                                    {item.answer}
                                  </p>
                                </div>
                              )}
                              <p className="mt-2 text-xs text-muted">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span className="w-fit rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-secondary">
                              {item.feedback_type.replaceAll("_", " ")}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </section>
              {(() => {
                const suggestions = feedback.filter(
                  (f) => (f.feedback_type === 'source_issue' || f.feedback_type === 'missing_source') && !declinedFeedbackIds.has(f.id)
                );
                if (suggestions.length === 0) return null;
                return (
                  <section className={`${cardClass} space-y-4`}>
                    <div>
                      <h2 className="text-2xl font-bold text-primary">Source Suggestions</h2>
                      <p className="text-sm text-secondary">
                        Users suggested these sources when they felt an answer was incomplete. Review each one, write a verified answer, then approve or decline.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {suggestions.map((item) => {
                        const marker = 'User source suggestion:';
                        const idx = (item.answer ?? '').indexOf(marker);
                        const suggestion = idx !== -1 ? item.answer!.slice(idx + marker.length).trim() : '';
                        const isReviewing = reviewingFeedbackId === item.id;
                        const isLoading = reviewFeedbackLoading === item.id;
                        return (
                          <div key={item.id} className="rounded-xl border border-[#d8d1c7] p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-primary">{item.question || '—'}</p>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() => setReviewingFeedbackId(isReviewing ? null : item.id)}
                                  className="rounded-lg border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                                >
                                  {isReviewing ? 'Cancel' : 'Review'}
                                </button>
                                {!isReviewing && (
                                  <button
                                    type="button"
                                    onClick={() => setDeclinedFeedbackIds((prev) => new Set([...prev, item.id]))}
                                    className="rounded-lg border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Decline
                                  </button>
                                )}
                              </div>
                            </div>
                            {suggestion && (
                              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                                <p className="text-xs font-semibold text-blue-700 mb-1">User&apos;s suggestion</p>
                                <p className="text-sm text-blue-900">{suggestion}</p>
                              </div>
                            )}
                            <p className="text-xs text-muted">{new Date(item.created_at).toLocaleString()}{!item.user_id ? ' • anonymous' : ''}</p>
                            {isReviewing && (
                              <div className="space-y-2 border-t border-[#f0ede9] pt-2">
                                <label className="text-xs font-semibold text-secondary">Your verified answer</label>
                                <textarea
                                  rows={4}
                                  value={reviewFeedbackAnswers[item.id] ?? ''}
                                  onChange={(e) => setReviewFeedbackAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  placeholder="Write the correct, verified answer based on the source suggestion..."
                                  className="w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => resolveSourceSuggestion(item, 'trust')}
                                    className={smallSecondaryButton}
                                  >
                                    Save as trusted answer
                                  </button>
                                  {item.user_id && (
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => resolveSourceSuggestion(item, 'email')}
                                      className={smallSecondaryButton}
                                    >
                                      Email user
                                    </button>
                                  )}
                                  {item.user_id && (
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => resolveSourceSuggestion(item, 'both')}
                                      className="rounded-xl border border-[#d73f09] bg-[#d73f09] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                      {isLoading ? 'Saving…' : 'Save & send to user'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => {
                                      setDeclinedFeedbackIds((prev) => new Set([...prev, item.id]));
                                      setReviewingFeedbackId(null);
                                    }}
                                    className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}
              <section className={`${cardClass} space-y-4`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Issue Reports
                    </h2>
                    <p className="text-sm text-secondary">
                      Review user-reported problems, questions, source
                      concerns, and enhancement candidates.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href="/admin/issues" className={smallSecondaryButton}>
                      Open detailed review
                    </a>
                    <span className="w-fit rounded-full border border-[#d8d1c7] bg-[#fcfaf7] px-3 py-1 text-xs font-semibold text-secondary">
                      {openIssues.length} new
                    </span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_220px]">
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    placeholder="Search issue type, user, question, or description..."
                    className={inputClass}
                  />
                  <select
                    value={issueStatusFilter}
                    onChange={(e) =>
                      setIssueStatusFilter(e.target.value as any)
                    }
                    className={inputClass}
                  >
                    <option value="all">All issue statuses</option>
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="enhancement_candidate">
                      Enhancement candidate
                    </option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                {issueReports.length === 0 ? (
                  <p className="text-sm text-secondary">
                    No issue reports submitted yet.
                  </p>
                ) : filteredIssueReports.length === 0 ? (
                  <p className="rounded-xl border border-[#d8d1c7] bg-white p-3 text-sm text-secondary">
                    No issue reports match the current search/filter.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {filteredIssueReports.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-primary">
                                {item.issue_type}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${getIssueStatusClass(item.status)}`}
                              >
                                {getIssueStatusDisplay(item.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {item.user_email || "Unknown user"} •{" "}
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                            {item.related_question && (
                              <div className="mt-3 rounded-xl bg-[#fcfaf7] p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Related question
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-primary">
                                  {item.related_question}
                                </p>
                              </div>
                            )}
                            <div className="mt-3 rounded-xl bg-[#fcfaf7] p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Description
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-primary">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-56 lg:grid-cols-1">
                            {item.status !== "reviewed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateIssueStatus(item, "reviewed")
                                }
                                disabled={updatingIssueId === item.id}
                                className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-60"
                              >
                                Mark reviewed
                              </button>
                            )}
                            {item.status !== "enhancement_candidate" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateIssueStatus(
                                    item,
                                    "enhancement_candidate",
                                  )
                                }
                                disabled={updatingIssueId === item.id}
                                className="min-h-11 rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                              >
                                Enhancement
                              </button>
                            )}
                            {item.status !== "resolved" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateIssueStatus(item, "resolved")
                                }
                                disabled={updatingIssueId === item.id}
                                className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-60"
                              >
                                Mark resolved
                              </button>
                            )}
                            {item.status !== "new" &&
                              item.status !== "open" && (
                                <button
                                  type="button"
                                  onClick={() => updateIssueStatus(item, "new")}
                                  disabled={updatingIssueId === item.id}
                                  className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-60"
                                >
                                  Reopen
                                </button>
                              )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    Content Gaps
                  </h2>
                  <p className="text-sm text-secondary">
                    Questions the Reference system could not answer and frequently
                    requested topics.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-primary">
                      Top repeated gaps
                    </h3>
                    {contentGaps.length === 0 ? (
                      <p className="mt-2 text-sm text-secondary">
                        No gaps yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {contentGaps.map((gap, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-[#d8d1c7] p-3"
                          >
                            <div className="flex justify-between gap-3">
                              <p className="text-sm font-semibold text-primary">
                                {gap.question}
                              </p>
                              <span className="text-xs text-muted">
                                {gap.count}x
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              Mode: {gap.answer_mode || "general"}
                              {gap.category
                                ? ` • Category: ${gap.category}`
                                : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">
                      Unanswered questions
                    </h3>
                    <p className="mt-1 text-sm text-secondary">
                      Questions where the AI returned no answer. Write a response, save it as a trusted answer, and optionally email the user who asked.
                    </p>
                    {noAnswerItems.length === 0 ? (
                      <p className="mt-2 text-sm text-secondary">
                        No unanswered questions yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {noAnswerItems.slice(0, 20).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-[#d8d1c7] p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-primary">{item.question}</p>
                              <button
                                type="button"
                                onClick={() => setResolvingId(resolvingId === item.id ? null : item.id)}
                                className="shrink-0 rounded-lg border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                              >
                                {resolvingId === item.id ? 'Cancel' : 'Resolve'}
                              </button>
                            </div>
                            <p className="text-xs text-muted">
                              {item.answer_mode || "general"}
                              {item.category ? ` • ${item.category}` : ""}
                              {" • "}{new Date(item.created_at).toLocaleString()}
                              {!item.user_id && " • anonymous"}
                            </p>
                            {resolvingId === item.id && (
                              <div className="space-y-2 border-t border-[#f0ede9] pt-2">
                                <label className="text-xs font-semibold text-secondary">Your answer</label>
                                <textarea
                                  rows={4}
                                  value={resolveAnswers[item.id] ?? ""}
                                  onChange={(e) => setResolveAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  placeholder="Write the answer to this question..."
                                  className="w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={resolveLoading === item.id}
                                    onClick={() => resolveNoAnswer(item, 'trust')}
                                    className={smallSecondaryButton}
                                  >
                                    Save as trusted answer
                                  </button>
                                  {item.user_id && (
                                    <button
                                      type="button"
                                      disabled={resolveLoading === item.id}
                                      onClick={() => resolveNoAnswer(item, 'email')}
                                      className={smallSecondaryButton}
                                    >
                                      Email user
                                    </button>
                                  )}
                                  {item.user_id && (
                                    <button
                                      type="button"
                                      disabled={resolveLoading === item.id}
                                      onClick={() => resolveNoAnswer(item, 'both')}
                                      className="rounded-xl border border-[#d73f09] bg-[#d73f09] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                      {resolveLoading === item.id ? 'Saving…' : 'Save & send to user'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
          {activeTab === "audit" && (
            <section className={`${cardClass} space-y-5`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    Audit Logs
                  </h2>
                  <p className="text-sm text-secondary">
                    Review recent admin actions captured by the audit logging
                    system. Showing the latest 100 events for performance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAuditLogs}
                  className={secondaryButton}
                >
                  Refresh logs
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_180px_220px]">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search actor, action, target, or metadata..."
                  className={inputClass}
                />
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value as any)}
                  className={inputClass}
                >
                  <option value="all">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                </select>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All actions</option>
                  {auditActionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Loaded logs", auditLogs.length],
                  ["Showing", filteredAuditLogs.length],
                  [
                    "Successful",
                    auditLogs.filter((log) => log.status === "success").length,
                  ],
                  [
                    "Failures",
                    auditLogs.filter((log) => log.status === "failure").length,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-[#d8d1c7] bg-white p-3"
                  >
                    <p className="text-xs text-secondary">{label}</p>
                    <p className="text-2xl font-bold text-primary">{value}</p>
                  </div>
                ))}
              </div>
              {auditLogs.length === 0 ? (
                <p className="rounded-xl border border-[#d8d1c7] bg-white p-4 text-sm text-secondary">
                  No audit logs found yet. Admin actions logged after Phase 11B
                  should appear here.
                </p>
              ) : filteredAuditLogs.length === 0 ? (
                <p className="rounded-xl border border-[#d8d1c7] bg-white p-4 text-sm text-secondary">
                  No audit logs match the current search/filter.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 lg:hidden">
                    {filteredAuditLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-2xl border border-[#d8d1c7] bg-white p-4 shadow-sm"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="break-words text-sm font-bold text-primary">
                                {log.action}
                              </p>
                              <p className="mt-1 break-words text-xs text-muted">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${getAuditStatusClass(log.status)}`}
                            >
                              {log.status}
                            </span>
                          </div>
                          <div className="grid gap-2 text-sm">
                            <div className="rounded-xl bg-[#fcfaf7] p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Actor
                              </p>
                              <p className="mt-1 break-words text-primary">
                                {log.actor_email || "Unknown actor"}
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                {log.actor_role || "No role saved"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-[#fcfaf7] p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Target
                              </p>
                              <p className="mt-1 break-words text-primary">
                                {log.target_type || "—"}
                              </p>
                              <p className="mt-1 break-all text-xs text-muted">
                                {log.target_id || "—"}
                              </p>
                            </div>
                            <div className="min-w-0 rounded-xl bg-[#fcfaf7] p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Metadata
                              </p>
                              <pre className="mt-1 max-h-28 max-w-full overflow-hidden whitespace-pre-wrap break-all rounded-xl bg-white p-2 text-xs text-muted">
                                {formatAuditMetadata(log.metadata)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden max-h-[620px] overflow-y-auto rounded-xl border border-[#d8d1c7] lg:block">
                    <table className="w-full text-sm text-primary">
                      <thead className="sticky top-0 bg-[#fcfaf7]">
                        <tr>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Actor</th>
                          <th className="p-3 text-left">Action</th>
                          <th className="p-3 text-left">Target</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Metadata</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAuditLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-t border-[#d8d1c7] align-top"
                          >
                            <td className="p-3 text-xs text-muted">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <p className="break-words text-xs font-semibold text-primary">
                                {log.actor_email || "Unknown actor"}
                              </p>
                              <p className="mt-1 text-[11px] text-muted">
                                {log.actor_role || "No role"}
                              </p>
                            </td>
                            <td className="p-3 text-xs font-semibold text-primary">
                              {log.action}
                            </td>
                            <td className="p-3 text-xs text-muted">
                              <p>{log.target_type || "—"}</p>
                              <p className="mt-1 break-all text-[11px]">
                                {log.target_id || "—"}
                              </p>
                            </td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${getAuditStatusClass(log.status)}`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="max-w-xs p-3 text-xs text-muted">
                              <p className="line-clamp-4 break-all">
                                {formatAuditMetadata(log.metadata)}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
          {activeTab === "trusted" && (
            <section className={`${cardClass} space-y-4`}>
              <div>
                <h2 className="text-2xl font-bold text-primary">
                  Trusted Answers
                </h2>
                <p className="text-sm text-secondary">
                  Manage administrator-approved answers reused by chat before
                  calling AI search.
                </p>
              </div>
              {trustedAnswers.length === 0 ? (
                <p className="text-sm text-secondary">
                  No trusted answers saved yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {trustedAnswers.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-3 rounded-xl border border-[#d8d1c7] p-4"
                    >
                      {editingTrustedId === item.id ? (
                        <>
                          <div>
                            <label className={labelClass}>
                              Trusted question
                            </label>
                            <input
                              value={trustedEditQuestion}
                              onChange={(e) =>
                                setTrustedEditQuestion(e.target.value)
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Trusted answer</label>
                            <textarea
                              value={trustedEditAnswer}
                              onChange={(e) =>
                                setTrustedEditAnswer(e.target.value)
                              }
                              className="min-h-[160px] w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm text-primary"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateTrustedAnswer(item)}
                              className={primaryButton}
                            >
                              Save changes
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditTrustedAnswer}
                              className={secondaryButton}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-primary">
                                {item.question}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">
                                {item.answer}
                              </p>
                              <p className="mt-2 text-xs text-muted">
                                Mode: {item.answer_mode || "general"}
                                {item.category
                                  ? ` • Category: ${item.category}`
                                  : ""}{" "}
                                • {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-secondary"}`}
                            >
                              {item.is_active ? "active" : "inactive"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-[#d8d1c7] pt-3">
                            <button
                              type="button"
                              onClick={() => startEditTrustedAnswer(item)}
                              className={smallSecondaryButton}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTrustedAnswer(item)}
                              className={smallSecondaryButton}
                            >
                              {item.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTrustedAnswer(item)}
                              className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[#d8d1c7] pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">Similar user questions</h3>
                    <p className="text-sm text-secondary">Chat history questions that closely match an existing trusted answer.</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSimilarQuestions}
                    disabled={similarQuestionsLoading}
                    className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-[#f3f0ed] disabled:opacity-50"
                  >
                    {similarQuestionsLoading ? 'Scanning…' : similarQuestionsLoaded ? 'Re-scan' : 'Scan now'}
                  </button>
                </div>
                {similarQuestionsLoaded && (
                  similarQuestions.length === 0 ? (
                    <p className="text-sm text-secondary">No close matches found — your trusted answers cover the ground well.</p>
                  ) : (
                    <div className="space-y-2">
                      {similarQuestions.map((item) => (
                        <div key={item.chatId} className="rounded-xl border border-[#d8d1c7] p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-primary">{item.chatQuestion}</p>
                            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{item.similarity}% match</span>
                          </div>
                          <p className="text-xs text-muted">
                            Matches trusted: <span className="italic">{item.matchedQuestion}</span>
                          </p>
                          <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
