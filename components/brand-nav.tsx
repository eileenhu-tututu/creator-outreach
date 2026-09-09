'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { MouseEvent } from 'react';

type BrandNavProps = { active: 'generator' | 'history' | 'products' | 'tour' };

const links = [
  { id: 'generator', href: '/', label: 'Generator' },
  { id: 'history', href: '/history', label: 'History' },
  { id: 'products', href: '/products', label: 'Products' },
  { id: 'tour', href: '/ui-tour', label: 'UI Tour' },
] as const;

const openRoute = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.location.assign(href);
};

export function BrandNav({ active }: BrandNavProps) {
  return <nav className="brand-nav"><div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-5 lg:px-10"><Link href="/" prefetch={false} onClick={(event) => openRoute(event, '/')} className="hidden min-w-0 items-center gap-3 font-extrabold tracking-[-.02em] sm:flex"><span className="brand-mark"><Sparkles className="size-4" strokeWidth={2.6} /><span aria-hidden="true">💌</span></span><span className="hidden md:inline">Creator Outreach</span><span className="micro-chip hidden xl:inline-flex">BD COPILOT</span></Link><div className="nav-links flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border p-1">{links.map((link) => <Link key={link.id} href={link.href} prefetch={false} onClick={(event) => openRoute(event, link.href)} aria-current={active === link.id ? 'page' : undefined} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${active === link.id ? 'is-active shadow-sm' : ''}`}>{link.label}</Link>)}</div><div className="hidden items-center gap-2 text-xs xl:flex"><ShieldCheck className="size-4 text-[#ff7768]" /><span>Local-first workspace</span></div></div></nav>;
}
