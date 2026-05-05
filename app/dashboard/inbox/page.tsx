"use client";

import { useState, useEffect } from "react";
import { Inbox, Mail, RefreshCw, AlertCircle, Calendar, Building2, User, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

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

  const fetchInbox = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const res = await fetch("/api/inbox");
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch inbox");
      }
      
      setReplies(data.replies || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Inbox className="w-6 h-6 text-accent-primary" />
            Campaign Inbox
          </h1>
          <p className="text-text-secondary mt-1">
            View replies from companies you've reached out to.
          </p>
        </div>
        <button
          onClick={fetchInbox}
          disabled={isRefreshing || loading}
          className="px-4 py-2 rounded-xl bg-bg-elevated hover:bg-bg-subtle text-text-primary text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Inbox
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="bg-accent-dim/50 border border-accent-primary/20 rounded-xl p-4 flex gap-3 flex-shrink-0">
        <ShieldCheck className="w-5 h-5 text-accent-primary flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-accent-primary mb-0.5">Zero-Knowledge Inbox Scanning</p>
          <p className="text-text-secondary">
            For your privacy, Pitchr strictly searches your Gmail for exact `In-Reply-To` headers tied to your Campaign emails. It <strong className="text-text-primary">never</strong> fetches, reads, or stores your unrelated personal emails.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-bg-surface border border-border-default rounded-2xl overflow-hidden flex shadow-sm">
        {/* Left sidebar: Thread list */}
        <div className="w-1/3 border-r border-border-default flex flex-col min-h-0 bg-bg-surface">
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
        <div className="flex-1 flex flex-col min-h-0 bg-bg-base relative">
          {selectedReply ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-6 border-b border-border-default bg-bg-surface flex-shrink-0">
                <h2 className="text-lg font-bold text-text-primary mb-4">{selectedReply.subject}</h2>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-lg">
                      {selectedReply.companyName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary flex items-center gap-1.5">
                        {selectedReply.companyName}
                        <span className="text-text-muted font-normal">&lt;{selectedReply.recipientEmail}&gt;</span>
                      </div>
                      <div className="text-xs text-text-secondary">To: You</div>
                    </div>
                  </div>
                  <div className="text-text-muted text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedReply.date).toLocaleString(undefined, { 
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111]">
                {selectedReply.bodyHtml ? (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedReply.bodyHtml }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
                    {selectedReply.bodyText}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted bg-bg-surface">
              <div className="text-center">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Select a thread to view the reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
