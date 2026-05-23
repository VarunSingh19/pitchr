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
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col animate-fade-in font-mono text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2.5 h-2.5 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              // OUTBOUND INBOX
            </span>
          </div>
          <h1 className="font-pixel text-3xl tracking-tight text-foreground uppercase">
            CAMPAIGN INBOX
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            Track IMAP synchronization and incoming partner responses
          </p>
        </div>
        <button
          onClick={syncInbox}
          disabled={isRefreshing || loading}
          className="px-5 py-3 w-full sm:w-auto border-2 border-border bg-card hover:bg-foreground/5 hover:border-foreground/20 text-foreground text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0 cursor-pointer rounded-none"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync Inbox
        </button>
      </div>

      {/* Privacy Notice */}
      {showPrivacyNotice && (
        <div className="border-2 border-[#ea580c]/30 bg-[#ea580c]/5 p-4 flex gap-3 flex-shrink-0 relative rounded-none">
          <ShieldCheck className="w-5 h-5 text-[#ea580c] flex-shrink-0 mt-0.5" />
          <div className="pr-6">
            <p className="font-bold text-[#ea580c] uppercase tracking-wider mb-0.5">Zero-Knowledge Inbox Scanning</p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              For your privacy, Pitchr strictly searches your Gmail for exact `In-Reply-To` headers tied to your Campaign emails. It <strong className="text-foreground">never</strong> fetches, reads, or stores your unrelated personal emails.
            </p>
          </div>
          <button 
            onClick={() => setShowPrivacyNotice(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-card border-2 border-border rounded-none overflow-hidden flex">
        {/* Left sidebar: Thread list */}
        <div className={`border-r-2 border-border flex flex-col min-h-0 bg-card ${selectedReply ? 'hidden md:flex md:w-[320px]' : 'flex flex-1 md:flex-none md:w-[320px]'} flex-shrink-0`}>
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search replies..."
                className="w-full bg-foreground/[0.02] border-2 border-border pl-9 pr-4 py-2.5 text-xs text-foreground focus:border-[#ea580c] focus:outline-none rounded-none font-mono"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[#ea580c]" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Scanning Gmail outbox replies...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center h-full flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-red-500 bg-red-500/5 text-red-400 flex items-center justify-center mb-3">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Failed to sync</p>
                <p className="text-[10px] text-muted-foreground">{error}</p>
              </div>
            ) : replies.length === 0 ? (
              <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-border bg-foreground/5 flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">No replies yet</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed max-w-[200px] mx-auto">
                  When prospects respond to your active outreach campaigns, they will be listed here.
                </p>
              </div>
            ) : (
              replies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => setSelectedReply(reply)}
                  className={`w-full text-left p-4 transition-colors font-mono cursor-pointer ${selectedReply?.id === reply.id ? 'bg-[#ea580c]/5 border-l-4 border-l-[#ea580c]' : 'hover:bg-foreground/[0.02] border-l-4 border-l-transparent'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-foreground truncate pr-2 uppercase tracking-wider">{reply.companyName}</span>
                    <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap uppercase">
                      {new Date(reply.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-semibold truncate mb-1">{reply.subject}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{reply.snippet}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right side: Thread view */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 bg-background relative ${!selectedReply ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {selectedReply ? (
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {/* Top Header with Back Button */}
              <div className="p-4 md:p-6 border-b-2 border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setSelectedReply(null)} 
                    className="p-1.5 border-2 border-border hover:border-[#ea580c] hover:text-[#ea580c] flex-shrink-0 text-muted-foreground rounded-none transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Back</span>
                  </button>
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">{selectedReply.subject}</h2>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mt-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 flex-shrink-0 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] flex items-center justify-center font-bold text-sm">
                      {selectedReply.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground flex flex-wrap items-center gap-1.5 truncate uppercase">
                        <span className="truncate">{selectedReply.companyName}</span>
                        <span className="text-muted-foreground font-normal truncate select-all lowercase font-mono">&lt;{selectedReply.recipientEmail}&gt;</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">To: You</div>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-[10px] flex items-center gap-1.5 flex-shrink-0 font-bold uppercase">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedReply.date).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Content Split */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0">
                {/* Left Column: Email Body */}
                <div className="flex-1 md:w-1/2 overflow-y-auto p-4 md:p-6 bg-white text-black md:border-r-2 border-border min-w-0">
                  {selectedReply.bodyHtml ? (
                    <div 
                      className="prose prose-sm max-w-none prose-p:text-black prose-headings:text-black prose-a:text-blue-600 break-words w-full"
                      dangerouslySetInnerHTML={{ __html: selectedReply.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-xs md:text-sm font-sans leading-relaxed text-black break-words w-full">
                      {selectedReply.bodyText}
                    </div>
                  )}
                </div>

                {/* Right Column: Reply Composer */}
                <div className="flex-1 md:w-1/2 flex flex-col bg-card overflow-y-auto">
                  <div className="p-4 md:p-6 flex-1 flex flex-col">
                    {!showComposer ? (
                      <div className="flex-1 flex items-center justify-center">
                        <button
                          onClick={() => setShowComposer(true)}
                          className="w-full max-w-md py-8 px-4 border-2 border-dashed border-border text-muted-foreground font-bold hover:border-[#ea580c] hover:text-[#ea580c] hover:bg-[#ea580c]/5 transition-colors flex flex-col items-center justify-center gap-3 rounded-none cursor-pointer"
                        >
                          <Mail className="w-6 h-6" />
                          <span className="text-xs uppercase tracking-widest">Click to compose reply</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col space-y-4 animate-fade-in h-full">
                        <textarea
                          value={draftReply}
                          onChange={(e) => setDraftReply(e.target.value)}
                          placeholder={isDrafting ? "Pitchr AI is drafting your reply..." : "Type your reply message..."}
                          className="flex-1 min-h-[250px] w-full p-4 border-2 border-border bg-foreground/[0.01] text-xs text-foreground focus:border-[#ea580c] focus:outline-none resize-none font-mono rounded-none"
                          disabled={isDrafting || isSending}
                        />

                        {/* Resume Attachment Options */}
                        <div className="flex flex-col gap-3 py-3 border-t border-border">
                          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-[#ea580c] transition-colors font-bold uppercase tracking-wider">
                            <input 
                              type="checkbox" 
                              checked={attachExistingResume}
                              onChange={(e) => {
                                  setAttachExistingResume(e.target.checked);
                                  if (e.target.checked) setCustomResumeFile(null);
                              }}
                              className="w-4 h-4 border-2 border-border bg-card text-[#ea580c] focus:ring-0 focus:outline-none"
                            />
                            Attach persistent Resume PDF
                          </label>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-[9px] uppercase font-bold tracking-widest">OR</span>
                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-[#ea580c] transition-colors font-bold uppercase tracking-wider">
                              <div className={`px-3 py-2 border-2 flex items-center gap-2 rounded-none transition-colors ${customResumeFile ? 'border-[#ea580c] bg-[#ea580c]/5 text-[#ea580c]' : 'border-border bg-card'}`}>
                                <input 
                                  type="file" 
                                  accept=".pdf" 
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                                <Building2 className="w-4 h-4" />
                                {customResumeFile ? customResumeFile.name : "Upload alternate PDF"}
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                          <button
                            onClick={handleDraftReply}
                            disabled={isDrafting || isSending}
                            className="w-full sm:w-auto px-4 py-3 border-2 border-border bg-card hover:bg-foreground/5 hover:border-foreground/20 text-[#ea580c] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer rounded-none"
                          >
                            <RefreshCw className={`w-4 h-4 ${isDrafting ? 'animate-spin' : ''}`} />
                            {isDrafting ? 'Drafting...' : 'AI Draft'}
                          </button>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setShowComposer(false)}
                              disabled={isDrafting || isSending}
                              className="flex-1 sm:flex-none px-4 py-3 border-2 border-border text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 bg-card cursor-pointer rounded-none"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSendReply}
                              disabled={isDrafting || isSending || !draftReply.trim()}
                              className="flex-1 sm:flex-none px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer rounded-none"
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
          ) : (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full font-mono">
              <Mail className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs uppercase tracking-wider font-bold">No message selected</p>
              <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Select an entry from the sidebar to inspect logs and compose replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
