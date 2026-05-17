"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import HeaderBar from "../components/HeaderBar";

type Source = {
  title: string;
  filename: string;
  pages?: number[];
};

type EvidenceStrength = {
  label: "Strong" | "Moderate" | "Limited" | "Not found";
  description: string;
};

type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  answer_mode?: string | null;
  sources?: Source[];
  evidence_strength?: EvidenceStrength | null;
  created_at: string;
};

type DocumentOption = {
  id: string;
  title: string;
  filename: string;
  category?: string | null;
};

type ConversationTurn = {
  question: string
  answer: string
  sources?: Source[]
  evidenceStrength?: EvidenceStrength | null
  chatHistoryId?: string | null
  feedbackSubmitted?: string | null
  trustedSaved?: boolean
  suggestedFollowUps?: string[]
  sourceSuggestionOpen?: boolean
  sourceSuggestionText?: string
}

type SearchState = "idle" | "searching" | "reviewing" | "generating";

const searchStates: {
  key: SearchState;
  label: string;
  description: string;
}[] = [
  {
    key: "searching",
    label: "Searching",
    description: "Looking across active publications.",
  },
  {
    key: "reviewing",
    label: "Reviewing sources",
    description: "Checking source matches and page references.",
  },
  {
    key: "generating",
    label: "Generating answer",
    description: "Writing a source-grounded response.",
  },
];

function evidenceBadgeClass(label?: EvidenceStrength["label"]) {
  if (label === "Strong") return "border-green-300 bg-green-50 text-green-800";
  if (label === "Moderate") return "border-blue-300 bg-blue-50 text-blue-800";
  if (label === "Limited")
    return "border-yellow-300 bg-yellow-50 text-yellow-900";
  return "border-red-300 bg-red-50 text-red-800";
}

function answerNeedsSourceSuggestion(turn: ConversationTurn) {
  const lowerAnswer = turn.answer.toLowerCase();

  return (
    turn.evidenceStrength?.label === "Not found" ||
    !turn.sources ||
    turn.sources.length === 0 ||
    lowerAnswer.includes("couldn't find") ||
    lowerAnswer.includes("couldn’t find") ||
    lowerAnswer.includes("not enough information") ||
    lowerAnswer.includes("no supported")
  );
}

export default function ChatPage() {
  const supabase = createClient();

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");

  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [documentId, setDocumentId] = useState("all");
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [answerMode, setAnswerMode] = useState("general");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [conversationTurns, setConversationTurns] = useState<
    ConversationTurn[]
  >([]);

  const filteredDocuments = useMemo(() => {
    if (category === "all") return documents;
    return documents.filter((doc) => doc.category === category);
  }, [documents, category]);

  useEffect(() => {
    if (
      documentId !== "all" &&
      !filteredDocuments.some((doc) => doc.id === documentId)
    ) {
      setDocumentId("all");
    }
  }, [category, documentId, filteredDocuments]);

  useEffect(() => {
    async function loadData() {
      const { data: docData } = await supabase
        .from("documents")
        .select("id, title, filename, category")
        .eq("is_active", true)
        .order("title", { ascending: true });

      const activeDocs = (docData ?? []) as DocumentOption[];
      setDocuments(activeDocs);

      const uniqueCategories = Array.from(
        new Set(
          activeDocs.map((doc) => doc.category).filter(Boolean) as string[],
        ),
      ).sort();

      setCategories(uniqueCategories);

      const { data: hist } = await supabase
        .from("chat_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setHistory((hist ?? []) as HistoryItem[]);
    }

    loadData();
  }, [supabase]);

  useEffect(() => {
    if (!loading) {
      setSearchState("idle");
      return;
    }

    setSearchState("searching");

    const reviewingTimer = window.setTimeout(() => {
      setSearchState("reviewing");
    }, 900);

    const generatingTimer = window.setTimeout(() => {
      setSearchState("generating");
    }, 1800);

    return () => {
      window.clearTimeout(reviewingTimer);
      window.clearTimeout(generatingTimer);
    };
  }, [loading]);

  async function refreshHistory() {
    const { data } = await supabase
      .from("chat_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    setHistory((data ?? []) as HistoryItem[]);
  }

  async function submitQuestion(
    currentQuestion: string,
    priorTurns: ConversationTurn[],
  ) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("You must be signed in.");
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: currentQuestion,
        category,
        documentId,
        answerMode,
        conversationTurns: priorTurns.map((turn) => ({
          question: turn.question,
          answer: turn.answer,
        })),
      }),
    });

const result = await res.json();

if (!res.ok) {
  throw new Error(result.error ?? "Something went wrong.");
}

const activityRes = await fetch('/api/track-user-activity', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    activityType: 'chat',
  }),
})

if (!activityRes.ok) {
  const activityError = await activityRes.json().catch(() => null)
  console.error('Activity tracking failed:', activityError)
}

return result;


  }

  async function askQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setLoading(true);
    setMessage("");

    const currentQuestion = trimmedQuestion;
    const priorTurns = conversationTurns;

    setQuestion("");

    try {
      const result = await submitQuestion(currentQuestion, priorTurns);

      setConversationTurns((prev) =>
        [
          ...prev,
          {
            question: currentQuestion,
            answer: result.answer,
            sources: result.sources ?? [],
            evidenceStrength: result.evidenceStrength ?? null,
            chatHistoryId: result.chatHistoryId ?? null,
            feedbackSubmitted: null,
            suggestedFollowUps: result.suggestedFollowUps ?? [],
            sourceSuggestionOpen: false,
            sourceSuggestionText: "",
          },
        ].slice(-6),
      );

      setLoading(false);
      await refreshHistory();
    } catch (error: any) {
      setMessage(error.message ?? "Connection error.");
      setQuestion(currentQuestion);
      setLoading(false);
    }
  }

  async function regenerateTurn(index: number) {
    const turn = conversationTurns[index];
    if (!turn) return;

    setLoading(true);
    setMessage("");

    const priorTurns = conversationTurns.slice(0, index);

    try {
      const result = await submitQuestion(turn.question, priorTurns);

      setConversationTurns((prev) =>
        prev.map((existingTurn, turnIndex) =>
          turnIndex === index
            ? {
                ...existingTurn,
                answer: result.answer,
                sources: result.sources ?? [],
                evidenceStrength: result.evidenceStrength ?? null,
                chatHistoryId: result.chatHistoryId ?? null,
                feedbackSubmitted: null,
                suggestedFollowUps: result.suggestedFollowUps ?? [],
                sourceSuggestionOpen: false,
                sourceSuggestionText: "",
              }
            : existingTurn,
        ),
      );

      setLoading(false);
      await refreshHistory();
    } catch (error: any) {
      setMessage(error.message ?? "Could not regenerate answer.");
      setLoading(false);
    }
  }

  async function tryBroaderSearch(index: number) {
    const turn = conversationTurns[index];
    if (!turn) return;

    setLoading(true);
    setMessage("");

    const previousCategory = category;
    const previousDocumentId = documentId;

    setCategory("all");
    setDocumentId("all");

    const priorTurns = conversationTurns.slice(0, index);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setMessage("You must be signed in.");
        setLoading(false);
        setCategory(previousCategory);
        setDocumentId(previousDocumentId);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: turn.question,
          category: "all",
          documentId: "all",
          answerMode,
          conversationTurns: priorTurns.map((priorTurn) => ({
            question: priorTurn.question,
            answer: priorTurn.answer,
          })),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.error ?? "Broader search failed.");
        setLoading(false);
        setCategory(previousCategory);
        setDocumentId(previousDocumentId);
        return;
      }

      setConversationTurns((prev) =>
        prev.map((existingTurn, turnIndex) =>
          turnIndex === index
            ? {
                ...existingTurn,
                answer: result.answer,
                sources: result.sources ?? [],
                evidenceStrength: result.evidenceStrength ?? null,
                chatHistoryId: result.chatHistoryId ?? null,
                feedbackSubmitted: null,
                suggestedFollowUps: result.suggestedFollowUps ?? [],
                sourceSuggestionOpen: false,
                sourceSuggestionText: "",
              }
            : existingTurn,
        ),
      );

      setLoading(false);
      await refreshHistory();
    } catch (error: any) {
      setMessage(error.message ?? "Broader search failed.");
      setLoading(false);
    } finally {
      setCategory(previousCategory);
      setDocumentId(previousDocumentId);
    }
  }

  async function submitFeedback(
    index: number,
    feedbackType: string,
    note?: string,
  ) {
    const turn = conversationTurns[index];
    if (!turn) return;

    setMessage("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("You must be signed in.");
      return;
    }

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatHistoryId: turn.chatHistoryId,
        feedbackType,
        question: turn.question,
        answer: note
          ? `${turn.answer}\n\nUser source suggestion: ${note}`
          : turn.answer,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error ?? "Feedback could not be saved.");
      return;
    }

    setConversationTurns((prev) =>
      prev.map((existingTurn, turnIndex) =>
        turnIndex === index
          ? {
              ...existingTurn,
              feedbackSubmitted: feedbackType,
              sourceSuggestionOpen: false,
            }
          : existingTurn,
      ),
    );
  }

  async function saveTrustedFromChat(index: number) {
    const turn = conversationTurns[index];
    if (!turn) return;

    setMessage("Saving trusted answer...");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

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
        question: turn.question,
        answer: turn.answer,
        category,
        answerMode,
        sources: turn.sources ?? [],
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error ?? "Trusted answer could not be saved.");
      return;
    }

    setConversationTurns((prev) =>
  prev.map((existingTurn, turnIndex) =>
    turnIndex === index
      ? { ...existingTurn, trustedSaved: true }
      : existingTurn
  )
)

setMessage('');
  }

  function startNewChat() {
    setQuestion("");
    setConversationTurns([]);
    setMessage("");
  }

  function loadHistoryItem(item: HistoryItem) {
    setQuestion("");
    setConversationTurns([
      {
        question: item.question,
        answer: item.answer,
        sources: item.sources || [],
        evidenceStrength: item.evidence_strength || null,
        chatHistoryId: item.id,
        feedbackSubmitted: null,
        sourceSuggestionOpen: false,
        sourceSuggestionText: "",
      },
    ]);
    setAnswerMode(item.answer_mode || "general");
    setCategory(item.category || "all");
    setMessage("");
  }

  function toggleSourceSuggestion(index: number) {
    setConversationTurns((prev) =>
      prev.map((turn, turnIndex) =>
        turnIndex === index
          ? { ...turn, sourceSuggestionOpen: !turn.sourceSuggestionOpen }
          : turn,
      ),
    );
  }

  function updateSourceSuggestion(index: number, value: string) {
    setConversationTurns((prev) =>
      prev.map((turn, turnIndex) =>
        turnIndex === index ? { ...turn, sourceSuggestionText: value } : turn,
      ),
    );
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-32 text-primary md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-5 sm:px-6 md:px-8">
          <section className="rounded-2xl border border-gray-300 bg-white p-4 text-primary shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                MFP Publication Agent
              </p>
              <h1 className="mt-1 text-2xl font-bold text-primary sm:text-3xl">
                Ask a publication question
              </h1>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Search active MFP publications, review cited sources, and submit
                feedback when an answer needs improvement.
              </p>
            </div>

            <div className="md:hidden">
              {!filtersOpen ? (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="w-full rounded-2xl border-2 border-blue-300 bg-blue-50 p-3 text-left shadow-sm transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  aria-expanded={filtersOpen}
                  aria-controls="mobile-search-options"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-900">
                        <span aria-hidden="true">🔎</span>
                        Search options
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-primary">
                        {answerMode === "general"
                          ? "General question"
                          : answerMode === "recipe"
                            ? "Find a recipe"
                            : answerMode === "compare"
                              ? "Compare documents"
                              : "Safety guidance"}
                        {" · "}
                        {category === "all" ? "All categories" : category}
                        {" · "}
                        {documentId === "all"
                          ? "All publications"
                          : filteredDocuments.find(
                              (doc) => doc.id === documentId,
                            )?.title ||
                            filteredDocuments.find(
                              (doc) => doc.id === documentId,
                            )?.filename ||
                            "Selected publication"}
                      </p>

                      <p className="mt-2 text-xs font-medium text-blue-900">
                        Tap to filter by answer type, category, or publication.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-black px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Change
                    </span>
                  </div>
                </button>
              ) : (
                <div
                  id="mobile-search-options"
                  className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-primary">
                        Search options
                      </p>
                      <p className="text-xs leading-5 text-secondary">
                        Adjust how the agent searches publications.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm"
                    >
                      Done
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-primary">
                      Answer mode
                    </label>
                    <select
                      value={answerMode}
                      onChange={(e) => setAnswerMode(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-2 text-primary"
                    >
                      <option value="general">General question</option>
                      <option value="recipe">Find a recipe</option>
                      <option value="compare">Compare documents</option>
                      <option value="safety">Safety guidance</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-primary">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-2 text-primary"
                    >
                      <option value="all">All categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-primary">
                      Publication
                    </label>
                    <select
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-2 text-primary"
                    >
                      <option value="all">All publications</option>
                      {filteredDocuments.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title || doc.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">
                  Answer mode
                </label>
                <select
                  value={answerMode}
                  onChange={(e) => setAnswerMode(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-2 text-primary"
                >
                  <option value="general">General question</option>
                  <option value="recipe">Find a recipe</option>
                  <option value="compare">Compare documents</option>
                  <option value="safety">Safety guidance</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-2 text-primary"
                >
                  <option value="all">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">
                  Publication
                </label>
                <select
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white p-2 text-primary"
                >
                  <option value="all">All publications</option>
                  {filteredDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title || doc.filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className="flex min-h-[650px] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white text-primary shadow-sm">
              <div className="border-b border-gray-300 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/chat-icon.png" alt="" className="h-8 w-8" />
                    <div>
                      <h2 className="text-xl font-bold text-primary">
                        Current chat
                      </h2>
                      <p className="text-sm text-secondary">
                        {conversationTurns.length > 0
                          ? "Ask a follow-up in the message box below."
                          : "Start with a question about a publication, process, recipe, or safety guidance."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startNewChat}
                    className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-gray-100"
                  >
                    ✨ New chat
                  </button>
                </div>
              </div>

              {conversationTurns.length === 0 && !loading && (
                <div className="border-b border-gray-300 bg-blue-50 p-4 md:hidden">
                  <h3 className="text-sm font-bold text-primary">
                    How to use this
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-secondary">
                    <li>• Ask a real food preservation question</li>
                    <li>• Review sources below the answer</li>
                    <li>• Tap “Open source” to verify</li>
                    <li>
                      • Use feedback or suggest a source if something is missing
                    </li>
                  </ul>
                </div>
              )}

              <form
                onSubmit={askQuestion}
                className="hidden space-y-3 border-b border-gray-300 bg-white p-4 md:block"
              >
                <div className="flex justify-end">
                  <Link
                    href="/help"
                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-gray-100"
                  >
                    ❓ Help
                  </Link>
                </div>

                {message && (
                  <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                    {message}
                  </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[82px] flex-1 rounded-2xl border border-gray-300 bg-white p-3 text-primary shadow-sm"
                    placeholder={
                      conversationTurns.length > 0
                        ? "Ask a follow-up question..."
                        : "Ask a question, such as “How do I safely dry herbs?”"
                    }
                    required
                  />

                  <button
                    type="submit"
                    className="min-h-12 rounded-2xl bg-black px-6 py-3 font-semibold !text-white shadow disabled:cursor-not-allowed disabled:bg-gray-700 disabled:!text-white"
                    disabled={loading}
                  >
                    {loading ? "Working..." : "Send"}
                  </button>
                </div>
              </form>

              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                {conversationTurns.length === 0 && !loading ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl">
                      💬
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-primary">
                      Ready for your question
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">
                      Include the food, preservation method, jar size,
                      elevation, or publication name when you know it.
                    </p>
                  </div>
                ) : conversationTurns.length > 0 ? (
                  conversationTurns.map((turn, index) => (
                    <article
                      key={`${turn.question}-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="rounded-2xl bg-blue-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
                          Question
                        </p>
                        <p className="mt-1 font-semibold leading-6 text-primary">
                          {turn.question}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted">
                            Answer
                          </p>

                          {turn.evidenceStrength && (
                            <span
                              className={`rounded-full border px-2 py-1 text-xs font-bold ${evidenceBadgeClass(
                                turn.evidenceStrength.label,
                              )}`}
                            >
                              {turn.evidenceStrength.label} evidence
                            </span>
                          )}
                        </div>

                        <div className="mt-2 rounded-2xl bg-white text-[15px] leading-7 text-primary">
                          <p className="whitespace-pre-wrap">{turn.answer}</p>
                        </div>
                      </div>

                      {turn.evidenceStrength && (
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                          <p className="font-bold text-primary">
                            Evidence: {turn.evidenceStrength.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-secondary">
                            {turn.evidenceStrength.description}
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-primary">
                            Sources
                          </p>
                          <p className="text-xs font-medium text-muted">
                            {turn.sources?.length ?? 0} found
                          </p>
                        </div>

                        {turn.sources && turn.sources.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {turn.sources.map((source, sourceIndex) => (
                              <div
                                key={`${source.filename}-${sourceIndex}`}
                                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-bold leading-tight text-primary">
                                      {source.title}
                                    </p>
                                    <p className="mt-1 break-words text-[11px] text-muted">
                                      {source.filename}
                                    </p>
                                  </div>

                                  {sourceIndex === 0 && (
                                    <span className="w-fit rounded-full border border-green-300 bg-green-50 px-2 py-1 text-xs font-bold text-green-800">
                                      Primary
                                    </span>
                                  )}
                                </div>

                                {source.pages && source.pages.length > 0 && (
                                  <p className="mt-2 text-xs font-semibold text-secondary">
                                    Pages: {source.pages.join(", ")}
                                  </p>
                                )}

                                <a
                                  href={`/api/view-source?file=${encodeURIComponent(
                                    source.filename,
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-gray-50"
                                >
                                  📄 Open source
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm leading-6 text-yellow-900">
                            No source was found for this answer. Try a broader
                            search or suggest a source for admin review.
                          </div>
                        )}
                      </div>

                      {answerNeedsSourceSuggestion(turn) && (
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <h4 className="text-sm font-bold text-blue-950">
                            Suggest a source
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-blue-950">
                            Know which publication or page should answer this?
                            Send a note so an admin can review it.
                          </p>

                          {!turn.sourceSuggestionOpen ? (
                            <button
                              type="button"
                              onClick={() => toggleSourceSuggestion(index)}
                              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                              📎 Suggest source
                            </button>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <textarea
                                value={turn.sourceSuggestionText ?? ""}
                                onChange={(e) =>
                                  updateSourceSuggestion(index, e.target.value)
                                }
                                className="min-h-24 w-full rounded-xl border border-blue-200 bg-white p-3 text-sm text-primary"
                                placeholder="Example: I think this should come from the tomatoes publication, page 12..."
                              />

                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() =>
                                    submitFeedback(
                                      index,
                                      "suggest_source",
                                      turn.sourceSuggestionText,
                                    )
                                  }
                                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                >
                                  Send suggestion
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleSourceSuggestion(index)}
                                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

<div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
  <button
    type="button"
    onClick={() => submitFeedback(index, 'helpful')}
    disabled={turn.feedbackSubmitted === 'helpful'}
    className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
      turn.feedbackSubmitted === 'helpful'
        ? 'border-green-300 bg-green-100 text-green-800'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-50'
    }`}
  >
    {turn.feedbackSubmitted === 'helpful' ? '✅ Helpful saved' : '👍 Helpful'}
  </button>

  <button
    type="button"
    onClick={() => submitFeedback(index, 'not_helpful')}
    disabled={turn.feedbackSubmitted === 'not_helpful'}
    className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
      turn.feedbackSubmitted === 'not_helpful'
        ? 'border-yellow-300 bg-yellow-100 text-yellow-900'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-50'
    }`}
  >
    {turn.feedbackSubmitted === 'not_helpful'
      ? '✅ Not helpful saved'
      : '👎 Not helpful'}
  </button>

  <button
    type="button"
    onClick={() => submitFeedback(index, 'missing_source')}
    disabled={turn.feedbackSubmitted === 'missing_source'}
    className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
      turn.feedbackSubmitted === 'missing_source'
        ? 'border-blue-300 bg-blue-100 text-blue-800'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-50'
    }`}
  >
    {turn.feedbackSubmitted === 'missing_source'
      ? '✅ Source issue saved'
      : '🔎 Source issue'}
  </button>

  <Link
    href={`/report-issue?question=${encodeURIComponent(turn.question)}`}
    className="inline-flex min-h-10 items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-50"
  >
    🚩 Report issue
  </Link>

  <button
    type="button"
    onClick={() => regenerateTurn(index)}
    disabled={loading}
    className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-50 disabled:opacity-60"
  >
    🔄 Regenerate
  </button>

  <button
    type="button"
    onClick={() => tryBroaderSearch(index)}
    disabled={loading}
    className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-50 disabled:opacity-60"
  >
    🌐 Broader search
  </button>

  <button
    type="button"
    onClick={() => saveTrustedFromChat(index)}
    disabled={loading || turn.trustedSaved}
    className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
      turn.trustedSaved
        ? 'border-green-300 bg-green-100 text-green-800'
        : 'border-gray-300 bg-white text-primary hover:bg-gray-50'
    } disabled:opacity-80`}
  >
    {turn.trustedSaved ? '✅ Trusted saved' : '⭐ Save trusted'}
  </button>
</div>

                      {(turn.feedbackSubmitted || turn.trustedSaved) && (
  <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
    {turn.feedbackSubmitted && (
      <p>✅ Feedback saved: {turn.feedbackSubmitted.replaceAll('_', ' ')}</p>
    )}

    {turn.trustedSaved && <p>✅ Trusted answer saved.</p>}
  </div>
)}

                      {turn.suggestedFollowUps &&
                        turn.suggestedFollowUps.length > 0 && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                              Follow-up ideas
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {turn.suggestedFollowUps.map((followUp) => (
                                <button
                                  key={followUp}
                                  type="button"
                                  onClick={() => setQuestion(followUp)}
                                  className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-gray-50"
                                >
                                  {followUp}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </article>
                  ))
                ) : null}

                {loading && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="space-y-3">
                      {searchStates
                        .filter((item) => item.key !== "idle")
                        .map((item) => {
                          const activeIndex = searchStates.findIndex(
                            (state) => state.key === searchState,
                          );
                          const itemIndex = searchStates.findIndex(
                            (state) => state.key === item.key,
                          );
                          const active = searchState === item.key;
                          const complete = activeIndex > itemIndex;

                          return (
                            <div
                              key={item.key}
                              className={`flex gap-3 rounded-2xl p-3 ${
                                active
                                  ? "bg-blue-50"
                                  : complete
                                    ? "bg-green-50"
                                    : "bg-gray-50"
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  active
                                    ? "bg-blue-900 text-white"
                                    : complete
                                      ? "bg-green-700 text-white"
                                      : "bg-gray-300 text-gray-700"
                                }`}
                              >
                                {complete ? "✓" : active ? "•" : ""}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary">
                                  {item.label}
                                </p>
                                <p className="text-sm text-secondary">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-gray-300 bg-white p-4 text-primary shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <img src="/feedback.png" alt="" className="h-6 w-6" />
                  <div>
                    <h2 className="text-lg font-bold text-primary">
                      Recent questions
                    </h2>
                    <p className="text-sm text-secondary">Latest 10</p>
                  </div>
                </div>

                {history.length === 0 ? (
                  <p className="text-sm text-secondary">
                    No recent questions yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-left text-primary hover:bg-gray-100"
                        onClick={() => loadHistoryItem(item)}
                      >
                        <p className="line-clamp-2 text-sm font-semibold text-primary">
                          {item.question}
                        </p>
                        <p className="mt-1 text-xs font-medium text-muted">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        {item.evidence_strength && (
                          <p className="mt-1 text-xs font-medium text-muted">
                            Evidence: {item.evidence_strength.label}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-300 bg-white p-4 text-primary shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <img src="/info.png" alt="" className="h-6 w-6" />
                  <h2 className="text-lg font-bold text-primary">Tips</h2>
                </div>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-secondary">
                  <li>Ask follow-ups in the same chat.</li>
                  <li>Use the publication filter to narrow answers.</li>
                  <li>Click sources to verify the answer.</li>
                  <li>Suggest a source when the agent cannot find support.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>

        <form
          onSubmit={askQuestion}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-300 bg-white p-3 text-primary shadow-lg md:hidden"
        >
          {message && (
            <div className="mb-2 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-medium text-red-800">
              {message}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[52px] flex-1 rounded-xl border border-gray-300 bg-white p-3 text-sm text-primary shadow-sm"
              placeholder={
                conversationTurns.length > 0
                  ? "Ask a follow-up..."
                  : "Ask a question..."
              }
              required
            />

            <button
              type="submit"
              className="min-h-[52px] rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
