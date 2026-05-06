"use client";

import { useState, useEffect } from "react";
import { Inbox, Mail, RefreshCw, AlertCircle, Calendar, Building2, User, Search, ShieldCheck, ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";

interface Reply {
  id: string;
  messageId: string;
  companyName: string;
  recipientEmail: string;
  subject: string;
  date: string;
  snippet: string;
  bodyHtml?: string;
  bodyText?: string;
}

export default function InboxPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draftReply, setDraftReply] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [attachExistingResume, setAttachExistingResume] = useState(false);
  const [customResumeFile, setCustomResumeFile] = useState<File | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  // Clear composer when selecting a new reply
  useEffect(() => {
    setShowComposer(false);
    setDraftReply("");
    setAttachExistingResume(false);
    setCustomResumeFile(null);
  }, [selectedReply]);

  const fetchInbox = async () => {
    try {
      setError(null);
      const res = await fetch("/api/inbox");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch inbox");
      setReplies(data.replies || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncInbox = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      // Step 1: Tell backend to sync from IMAP to DB
      const syncRes = await fetch("/api/inbox/sync", { method: "POST" });
      const syncData = await syncRes.json();

      if (!syncRes.ok) throw new Error(syncData.error || "Failed to sync with Gmail");

      // Step 2: Fetch the newly updated DB records
      await fetchInbox();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleDraftReply = async () => {
    if (!selectedReply) return;
    setIsDrafting(true);
    setShowComposer(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText: selectedReply.bodyText || selectedReply.snippet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate reply");
      setDraftReply(data.reply);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedReply || !draftReply.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      let customResumeBase64: string | undefined;
      let customResumeName: string | undefined;

      if (customResumeFile) {
        customResumeName = customResumeFile.name;
        customResumeBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(customResumeFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }

      const res = await fetch("/api/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedReply.recipientEmail,
          subject: selectedReply.subject,
          text: draftReply,
          messageId: selectedReply.messageId,
          attachExistingResume,
          customResumeBase64,
          customResumeName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");

      // Clear composer on success
      setShowComposer(false);
      setDraftReply("");
      setAttachExistingResume(false);
      setCustomResumeFile(null);
      toast.success("Reply sent successfully!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCustomResumeFile(e.target.files[0]);
      setAttachExistingResume(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="min-w-0 w-full">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Inbox className="w-6 h-6 text-accent-primary flex-shrink-0" />
            <span>Campaign Inbox</span>
          </h1>
          <p className="text-text-secondary mt-1 text-sm sm:text-base leading-relaxed">
            View replies from companies you've reached out to.
          </p>
        </div>
        <button
          onClick={syncInbox}
          disabled={isRefreshing || loading}
          className="px-4 py-2 w-full sm:w-auto rounded-xl bg-bg-elevated hover:bg-bg-subtle text-text-primary text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Inbox
        </button>
      </div>

      {/* Privacy Notice */}
      {showPrivacyNotice && (
        <div className="bg-accent-dim/50 border border-accent-primary/20 rounded-xl p-4 flex gap-3 flex-shrink-0 relative">
          <ShieldCheck className="w-5 h-5 text-accent-primary flex-shrink-0" />
          <div className="text-sm pr-6">
            <p className="font-semibold text-accent-primary mb-0.5">Zero-Knowledge Inbox Scanning</p>
            <p className="text-text-secondary">
              For your privacy, Pitchr strictly searches your Gmail for exact `In-Reply-To` headers tied to your Campaign emails. It <strong className="text-text-primary">never</strong> fetches, reads, or stores your unrelated personal emails.
            </p>
          </div>
          <button 
            onClick={() => setShowPrivacyNotice(false)}
            className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-bg-surface border border-border-default rounded-2xl overflow-hidden flex shadow-sm">
        {/* Left sidebar: Thread list */}
        <div className={`border-r border-border-default flex-col min-h-0 bg-bg-surface ${selectedReply ? 'hidden' : 'flex flex-1 md:flex-none md:w-full'}`}>
          <div className="p-4 border-b border-border-default flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search replies..."
                className="w-full bg-bg-elevated border-none rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent-primary outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-text-muted flex flex-col items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-accent-primary" />
                <p className="text-sm font-medium">Securely scanning your inbox for campaign replies...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm text-error font-medium mb-1">Failed to sync</p>
                <p className="text-xs text-text-secondary">{error}</p>
                <p className="text-xs text-text-muted mt-4">Make sure you have installed imapflow and mailparser</p>
              </div>
            ) : replies.length === 0 ? (
              <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mb-3">
                  <Mail className="w-6 h-6 text-text-muted" />
                </div>
                <p className="text-sm font-medium text-text-primary">No replies yet</p>
                <p className="text-xs text-text-secondary mt-1">When companies reply to your campaigns, they will show up here securely.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-default">
                {replies.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => setSelectedReply(reply)}
                    className={`w-full text-left p-4 transition-colors ${selectedReply?.id === reply.id ? 'bg-accent-dim/30 border-l-2 border-accent-primary' : 'hover:bg-bg-elevated/50 border-l-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-text-primary truncate pr-2">{reply.companyName}</span>
                      <span className="text-[10px] font-medium text-text-muted whitespace-nowrap">
                        {new Date(reply.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary font-medium truncate mb-1.5">{reply.subject}</div>
                    <div className="text-xs text-text-muted line-clamp-2 leading-relaxed">{reply.snippet}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Thread view */}
        <div className={`flex-1 flex-col min-h-0 min-w-0 bg-bg-base relative ${!selectedReply ? 'hidden' : 'flex'}`}>
          {selectedReply && (
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {/* Top Header with Back Button */}
              <div className="p-4 md:p-6 border-b border-border-default bg-bg-surface flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setSelectedReply(null)} 
                    className="p-1 -ml-1 flex-shrink-0 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-medium hidden md:inline">Back</span>
                  </button>
                  <h2 className="text-lg font-bold text-text-primary truncate">{selectedReply.subject}</h2>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm mt-4 ml-0 md:ml-8 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-lg">
                      {selectedReply.companyName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-text-primary flex flex-wrap items-center gap-1.5 truncate">
                        <span className="truncate">{selectedReply.companyName}</span>
                        <span className="text-text-muted font-normal truncate">&lt;{selectedReply.recipientEmail}&gt;</span>
                      </div>
                      <div className="text-xs text-text-secondary">To: You</div>
                    </div>
                  </div>
                  <div className="text-text-muted text-xs flex items-center gap-1.5 flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedReply.date).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Content Split */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0">
                
                {/* Left Column: Email Body */}
                <div className="flex-1 md:w-1/2 overflow-y-auto p-4 md:p-6 bg-white text-black md:border-r border-border-default min-w-0">
                  {selectedReply.bodyHtml ? (
                    <div 
                      className="prose prose-sm md:prose-base max-w-none prose-p:text-black prose-headings:text-black prose-a:text-blue-600 break-words w-full"
                      dangerouslySetInnerHTML={{ __html: selectedReply.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm md:text-base font-sans leading-relaxed text-black break-words w-full">
                      {selectedReply.bodyText}
                    </div>
                  )}
                </div>

                {/* Right Column: Reply Composer */}
                <div className="flex-1 md:w-1/2 flex flex-col bg-bg-surface overflow-y-auto">
                  <div className="p-4 md:p-6 flex-1 flex flex-col">
                    {!showComposer ? (
                      <div className="flex-1 flex items-center justify-center">
                        <button
                          onClick={() => setShowComposer(true)}
                          className="w-full max-w-md py-6 px-4 rounded-xl border-2 border-dashed border-border-default text-text-muted font-medium hover:border-accent-primary hover:text-accent-primary hover:bg-accent-dim/10 transition-colors flex flex-col items-center justify-center gap-3"
                        >
                          <Mail className="w-8 h-8" />
                          <span className="text-base">Click here to Reply</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col space-y-4 animate-fade-in h-full">
                        <textarea
                          value={draftReply}
                          onChange={(e) => setDraftReply(e.target.value)}
                          placeholder={isDrafting ? "Pitchr AI is drafting your reply based on your resume..." : "Type your reply here..."}
                          className="flex-1 min-h-[300px] w-full p-4 rounded-xl bg-bg-base border border-border-default text-sm text-text-primary focus:ring-1 focus:ring-accent-primary outline-none resize-none"
                          disabled={isDrafting || isSending}
                        />

                        {/* Resume Attachment Options */}
                        <div className="flex flex-col gap-3 py-3 border-t border-border-default">
                          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-accent-primary transition-colors">
                            <input 
                              type="checkbox" 
                              checked={attachExistingResume}
                              onChange={(e) => {
                                setAttachExistingResume(e.target.checked);
                                if (e.target.checked) setCustomResumeFile(null);
                              }}
                              className="w-4 h-4 rounded text-accent-primary bg-bg-base border-border-default focus:ring-accent-primary"
                            />
                            Attach my existing Resume
                          </label>
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted text-xs uppercase font-semibold">OR</span>
                            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-accent-primary transition-colors">
                              <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${customResumeFile ? 'border-accent-primary bg-accent-dim/20' : 'border-border-default bg-bg-elevated'}`}>
                                <input 
                                  type="file" 
                                  accept=".pdf" 
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                                <Building2 className="w-4 h-4" />
                                {customResumeFile ? customResumeFile.name : "Upload a different PDF"}
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                          <button
                            onClick={handleDraftReply}
                            disabled={isDrafting || isSending}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-accent-primary text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${isDrafting ? 'animate-spin' : ''}`} />
                            {isDrafting ? 'Drafting...' : 'Draft with AI'}
                          </button>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setShowComposer(false)}
                              disabled={isDrafting || isSending}
                              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-text-secondary hover:text-text-primary text-sm font-medium transition-colors disabled:opacity-50 border border-transparent hover:border-border-default"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSendReply}
                              disabled={isDrafting || isSending || !draftReply.trim()}
                              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isSending ? 'Sending...' : 'Send Reply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
