"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type Comment = {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  author_display?: string;
};

export type BinderCommentsProps = {
  binderId: string;
  canPost?: boolean;
};

export function BinderComments({ binderId, canPost = true }: BinderCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/comments`, {
      cache: "no-store",
    });
    const raw = await res.json().catch(() => ({}));
    const payload = extractApiPayload(raw);
    if (!res.ok) {
      setError(extractApiErrorMessage(payload) ?? "Could not load comments");
      return;
    }
    setComments((payload as { comments?: Comment[] }).comments ?? []);
  }, [binderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not post comment");
        return;
      }
      setText("");
      await load();
    } finally {
      setBusy(false);
    }
  }, [binderId, load, text]);

  return (
    <Panel className="space-y-mca-md">
      <h3 className="text-sm font-semibold text-mca-ink-body">Comments</h3>
      <ul className="space-y-mca-sm max-h-64 overflow-y-auto">
        {comments.map((c) => (
          <li key={c.id} className="rounded-mca-control bg-mca-chrome/30 px-mca-sm py-mca-tight">
            <p className="text-xs font-medium text-mca-ink-muted">{c.author_display ?? "Collector"}</p>
            <p className="text-sm text-mca-ink-body">{c.text}</p>
          </li>
        ))}
      </ul>
      {canPost ? (
        <div className="space-y-mca-sm">
          <Field id="binder-comment" label="Add a comment">
            <textarea
              id="binder-comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
            />
          </Field>
          {error ? <p className="text-sm text-mca-error-text">{error}</p> : null}
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void submit()}>
            Post comment
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
