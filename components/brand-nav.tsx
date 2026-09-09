import { ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

type BrandNavProps = { active: 'generator' | 'history' | 'products' };

const links = [
  { id: 'generator', href: '/', label: 'Generator' },
  { id: 'history', href: '/history', label: 'History' },
  { id: 'products', href: '/products', label: 'Products' },
] as const;

export function BrandNav({ active }: BrandNavProps) {
  return <nav className="brand-nav"><div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-10"><Link href="/" className="flex min-w-0 items-center gap-3 font-extrabold tracking-[-.02em]"><span className="brand-mark"><Sparkles className="size-4" strokeWidth={2.6} /><span aria-hidden="true">💌</span></span><span className="hidden sm:inline">Creator Outreach</span><span className="micro-chip hidden lg:inline-flex">BD COPILOT</span></Link><div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/6 p-1">{links.map((link) => <Link key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined} className={`rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${active === link.id ? 'bg-[#eef5eb] text-[#27322d] shadow-sm' : 'text-white/55 hover:bg-white/8 hover:text-white'}`}>{link.label}</Link>)}</div><div className="hidden items-center gap-2 text-xs text-white/45 xl:flex"><ShieldCheck className="size-4 text-[#ff7768]" /><span>Local-first workspace</span></div></div></nav>;
}
