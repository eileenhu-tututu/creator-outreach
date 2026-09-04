'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Copy, History, Search, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type HistoryItem = { id: string; createdAt: string; username: string; product: string; score: number; hook: string; dm: string; subject: string; email: string };

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState('');
  useEffect(() => { setItems(JSON.parse(window.localStorage.getItem('creator-outreach-history') || '[]')); }, []);
  const filtered = useMemo(() => items.filter((item) => `${item.username} ${item.product}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const remove = (id: string) => { const next = items.filter((item) => item.id !== id); setItems(next); window.localStorage.setItem('creator-outreach-history', JSON.stringify(next)); };
  return <main className="min-h-screen bg-background text-foreground">
    <nav className="border-b border-white/10"><div className="mx-auto flex h-[70px] max-w-[1280px] items-center justify-between px-5 lg:px-10"><a href="/" className="flex items-center gap-3 font-bold"><span className="grid size-9 place-items-center rounded-full bg-[#ff5400] text-black"><Sparkles className="size-4" /></span>Creator Outreach</a><div className="flex items-center gap-1 rounded-full bg-white/6 p-1"><a href="/" className="rounded-full px-4 py-2 text-sm text-white/55 hover:text-white">Generator</a><a href="/history" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">History</a><a href="/products" className="rounded-full px-4 py-2 text-sm text-white/55 hover:text-white">Products</a></div></div></nav>
    <section className="mx-auto max-w-[1280px] px-5 py-14 lg:px-10"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">LIBRARY</p><h1 className="section-title">Outreach history</h1><p className="mt-3 text-sm text-white/40">Every generation is saved locally on this device.</p></div><label className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creator or product" className="h-11 w-full rounded-full border-white/12 bg-white/6 pl-11 text-white sm:w-72" /></label></div>
      <div className="mt-10 grid gap-4">{filtered.length ? filtered.map((item) => <article key={item.id} className="grid gap-5 rounded-[24px] bg-[#fbfaf7] p-5 text-black sm:p-6 lg:grid-cols-[180px_1fr_160px]"><div><div className="mb-3 flex items-center gap-2"><span className="grid size-10 place-items-center rounded-full bg-black text-sm font-black text-white">@</span><div><p className="font-black">@{item.username}</p><p className="text-xs text-black/40">{item.product}</p></div></div><p className="flex items-center gap-1 text-[11px] text-black/40"><Clock3 className="size-3" /> {new Date(item.createdAt).toLocaleString()}</p></div><div className="border-black/8 lg:border-l lg:pl-6"><p className="field-label">Best hook</p><p className="mt-2 text-lg font-black">“{item.hook}”</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-black/50">{item.dm}</p></div><div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end"><Badge className="rounded-full bg-[#ff5400] px-3 text-black">{item.score}/10 MATCH</Badge><div className="flex gap-2"><Button onClick={() => navigator.clipboard.writeText(item.email)} variant="outline" size="icon" className="rounded-full border-black/10 text-black"><Copy /></Button><Button onClick={() => remove(item.id)} variant="outline" size="icon" className="rounded-full border-black/10 text-black hover:bg-red-50 hover:text-red-600"><Trash2 /></Button></div></div></article>) : <div className="grid min-h-[360px] place-items-center rounded-[28px] border border-dashed border-white/15 text-center"><div><History className="mx-auto mb-4 size-8 text-[#ff5400]" /><h2 className="text-xl font-bold">No outreach saved yet.</h2><p className="mt-2 text-sm text-white/40">Generate your first message and it will appear here.</p><a href="/" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff5400] px-5 py-3 text-sm font-bold text-black">Open generator <ArrowUpRight className="size-4" /></a></div></div>}</div>
    </section>
  </main>;
}
