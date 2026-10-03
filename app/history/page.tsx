'use client';
/* oxlint-disable next/no-html-link-for-pages -- Full document navigation is required for reliable Vinext multi-route hosting. */

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  Clock3,
  Copy,
  History,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandNav } from '@/components/brand-nav';
import { creatorIdHash, trackEvent } from '@/lib/analytics';
import {
  noReplyAvailability,
  readOutreachHistory,
  replyStatusLabels,
  writeOutreachHistory,
  type OutreachHistoryItem,
  type ReplyStatus,
} from '@/lib/outreach-history';

const statusTone: Record<ReplyStatus, string> = {
  pending: 'bg-[#ddd0ff] text-[#27322d]',
  no_reply: 'bg-[#eceae5] text-[#27322d]',
  positive: 'bg-[#aee8c5] text-[#174b2a]',
  neutral: 'bg-[#ffe7a8] text-[#5d4300]',
  negative: 'bg-[#ffd2cd] text-[#7c2319]',
  collaboration_started: 'bg-[#ff7768] text-[#27322d]',
};

const replyTypes: ReplyStatus[] = [
  'positive',
  'neutral',
  'negative',
  'collaboration_started',
];

const daysSince = (value?: string) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Number((Math.max(0, Date.now() - timestamp) / 86_400_000).toFixed(1));
};

export default function HistoryPage() {
  const [items, setItems] = useState<OutreachHistoryItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setItems(readOutreachHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.username} ${item.product}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const persist = (next: OutreachHistoryItem[]) => {
    setItems(next);
    writeOutreachHistory(next);
  };

  const update = (id: string, patch: Partial<OutreachHistoryItem>) =>
    persist(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const markSent = (item: OutreachHistoryItem) => {
    update(item.id, {
      sentAt: new Date().toISOString(),
      sentChannel: item.sentChannel || 'Other',
      replyStatus: 'pending',
      replyRecordedAt: undefined,
    });
    trackEvent('outreach_sent', {
      run_id: item.runId,
      message_id: item.id,
      creator_id_hash: creatorIdHash(item.username),
      product_id: item.productId,
      channel: (item.sentChannel || 'Other').toLowerCase().replaceAll(' ', '_'),
      send_method: 'manual_mark',
    });
  };

  const copyDm = async (item: OutreachHistoryItem) => {
    await navigator.clipboard.writeText(item.dm);
    trackEvent('message_copied', {
      run_id: item.runId,
      message_id: item.id,
      creator_id_hash: creatorIdHash(item.username),
      message_type: 'dm',
    });
  };

  const updateReplyStatus = (
    item: OutreachHistoryItem,
    status: ReplyStatus,
  ) => {
    if (status === 'no_reply' && !noReplyAvailability(item.sentAt).eligible)
      return;
    if ((item.replyStatus || 'pending') === status) return;
    const previousWasReply = replyTypes.includes(item.replyStatus || 'pending');
    const nextIsReply = replyTypes.includes(status);
    if (nextIsReply && !previousWasReply) {
      trackEvent('reply_recorded', {
        run_id: item.runId,
        message_id: item.id,
        reply_type: status === 'collaboration_started' ? 'positive' : status,
        days_to_reply: daysSince(item.sentAt),
      });
    }
    if (status === 'collaboration_started') {
      trackEvent('collaboration_started', {
        run_id: item.runId,
        message_id: item.id,
        product_id: item.productId,
      });
    }
    update(item.id, {
      replyStatus: status,
      replyRecordedAt:
        status === 'pending' ? undefined : new Date().toISOString(),
    });
  };

  const remove = (id: string) =>
    persist(items.filter((item) => item.id !== id));

  return (
    <main className="app-shell min-h-screen bg-background text-foreground">
      <BrandNav active="history" />
      <section className="mx-auto max-w-[1280px] px-5 py-14 lg:px-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">OUTREACH TRACKER</p>
            <h1 className="section-title">History</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
              Mark messages as sent, then record the reply outcome. “No reply”
              unlocks seven days after sending.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <Input
              value={query}
              aria-label="Search creator or product"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creator or product"
              className="h-11 w-full rounded-full border-white/12 bg-white/6 pl-11 text-white sm:w-72"
            />
          </div>
        </div>

        <div className="mt-10 grid gap-4">
          {filtered.length ? (
            filtered.map((item) => {
              const currentStatus = item.replyStatus || 'pending';
              const noReply = noReplyAvailability(item.sentAt);
              return (
                <article
                  key={item.id}
                  className="rounded-[24px] bg-[#fbfaf7] p-5 text-[#27322d] sm:p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[190px_1fr_300px]">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-[#27322d] text-sm font-black text-white">
                          @
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black">
                            @{item.username}
                          </p>
                          <p className="truncate text-xs text-[#27322d]/45">
                            {item.product}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 flex items-center gap-1.5 text-xs text-[#27322d]/45">
                        <Clock3 className="size-3.5" />
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      <Badge className="mt-4 rounded-full bg-[#ff7768] px-3 text-[#27322d]">
                        {item.score}/10 MATCH
                      </Badge>
                    </div>

                    <div className="border-[#27322d]/10 lg:border-l lg:pl-6">
                      <p className="field-label">Best hook</p>
                      <p className="mt-2 text-lg font-black leading-6">
                        “{item.hook}”
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#27322d]/55">
                        {item.dm}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={`/?restore=${encodeURIComponent(item.id)}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#27322d] px-3 text-xs font-bold text-white transition hover:bg-[#39463f]"
                        >
                          <ArrowUpRight className="size-3.5" />{' '}
                          {item.workspaceId
                            ? 'Restore full research'
                            : 'Restore saved message'}
                        </a>
                        <Button
                          onClick={() => void copyDm(item)}
                          variant="outline"
                          size="sm"
                          className="rounded-full border-[#27322d]/15 bg-white text-[#27322d]"
                        >
                          <Copy /> Copy DM
                        </Button>
                        <Button
                          onClick={() => remove(item.id)}
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Delete ${item.username}`}
                          className="rounded-full border-[#27322d]/15 bg-white text-[#27322d]/45 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#27322d]/45">
                        {item.workspaceId
                          ? 'Includes collected videos, scripts, talking points, product ranking, and this message.'
                          : 'Legacy record: the original videos and product ranking were not stored when this was created.'}
                      </p>
                    </div>

                    <div className="rounded-[18px] bg-[#eaf4e8] p-4">
                      {!item.sentAt ? (
                        <div>
                          <p className="text-xs font-black uppercase tracking-[.12em] text-[#27322d]/45">
                            Not sent yet
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#27322d]/60">
                            Mark this after sending through TikTok, Instagram,
                            WhatsApp, email, or another channel.
                          </p>
                          <Button
                            onClick={() => markSent(item)}
                            className="mt-4 h-10 w-full rounded-full bg-[#27322d] font-bold text-white hover:bg-[#39463f]"
                          >
                            <Send /> Mark as sent
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-xs font-bold text-[#27322d]/55">
                              <CalendarClock className="size-3.5" /> Sent{' '}
                              {new Date(item.sentAt).toLocaleDateString()} ·{' '}
                              {item.sentChannel || 'Other'}
                            </p>
                            <Badge
                              className={`rounded-full ${statusTone[currentStatus]}`}
                            >
                              {replyStatusLabels[currentStatus]}
                            </Badge>
                          </div>
                          <div className="mt-4 block text-xs font-bold text-[#27322d]/55">
                            <span>Reply status</span>
                            <Select
                              value={currentStatus}
                              onValueChange={(value) =>
                                updateReplyStatus(item, value as ReplyStatus)
                              }
                            >
                              <SelectTrigger className="mt-2 h-11 w-full rounded-[12px] border-[#27322d]/15 bg-white px-3 text-[#27322d]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white text-[#27322d]">
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem
                                  value="no_reply"
                                  disabled={!noReply.eligible}
                                >
                                  No reply
                                </SelectItem>
                                <SelectItem value="positive">
                                  Replied — Positive
                                </SelectItem>
                                <SelectItem value="neutral">
                                  Replied — Neutral
                                </SelectItem>
                                <SelectItem value="negative">
                                  Replied — Negative
                                </SelectItem>
                                <SelectItem value="collaboration_started">
                                  Collaboration started
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {!noReply.eligible ? (
                            <p className="mt-2 text-xs leading-5 text-[#27322d]/50">
                              “No reply” unlocks in {noReply.daysRemaining} day
                              {noReply.daysRemaining === 1 ? '' : 's'}.
                            </p>
                          ) : (
                            <p className="mt-2 text-xs leading-5 text-[#27322d]/50">
                              The seven-day observation window is complete.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-[28px] border border-dashed border-white/15 text-center">
              <div>
                <History className="mx-auto mb-4 size-8 text-[#ff7768]" />
                <h2 className="text-xl font-bold">No outreach saved yet.</h2>
                <p className="mt-2 text-sm text-white/40">
                  Generate your first message and it will appear here.
                </p>
                <a
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff7768] px-5 py-3 text-sm font-bold text-[#27322d]"
                >
                  Open generator <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
