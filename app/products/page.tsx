'use client';

import { useEffect, useState } from 'react';
import { Check, PackageOpen, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type Product = { id: string; name: string; description: string; features: string[]; commission: string; freeSample: boolean };
const defaults: Product[] = [
  { id: 'cloudlayer', name: 'CloudLayer Jacket', description: 'Lightweight everyday rain protection without the stiff shell look.', features: ['Waterproof', 'Lightweight', 'Oversized fit', 'Pink colorway'], commission: '15%', freeSample: true },
  { id: 'softcloud', name: 'SoftCloud Hoodie', description: 'Brushed cotton oversized hoodie for cozy daily styling.', features: ['Soft-touch', 'Oversized', '6 colors'], commission: '12%', freeSample: true },
  { id: 'daylight', name: 'Daylight Tote', description: 'A structured carryall for commute, coffee and content days.', features: ['Water-resistant', 'Laptop sleeve', 'Vegan leather'], commission: '18%', freeSample: false },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(defaults);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [features, setFeatures] = useState(''); const [commission, setCommission] = useState('15%'); const [freeSample, setFreeSample] = useState(true);
  useEffect(() => { const saved = window.localStorage.getItem('creator-outreach-products'); if (saved) setProducts(JSON.parse(saved)); }, []);
  const persist = (next: Product[]) => { setProducts(next); window.localStorage.setItem('creator-outreach-products', JSON.stringify(next)); };
  const add = () => { if (!name.trim()) return; persist([{ id: crypto.randomUUID(), name, description, features: features.split(',').map((item) => item.trim()).filter(Boolean), commission, freeSample }, ...products]); setName(''); setDescription(''); setFeatures(''); };
  const useProduct = (item: Product) => { window.localStorage.setItem('creator-outreach-selected-product', JSON.stringify(item)); window.location.href = '/#generator'; };
  return <main className="min-h-screen bg-background text-foreground">
    <nav className="border-b border-white/10"><div className="mx-auto flex h-[70px] max-w-[1280px] items-center justify-between px-5 lg:px-10"><a href="/" className="flex items-center gap-3 font-bold"><span className="grid size-9 place-items-center rounded-full bg-[#ff5400] text-black"><Sparkles className="size-4" /></span>Creator Outreach</a><div className="flex items-center gap-1 rounded-full bg-white/6 p-1"><a href="/" className="rounded-full px-4 py-2 text-sm text-white/55 hover:text-white">Generator</a><a href="/history" className="rounded-full px-4 py-2 text-sm text-white/55 hover:text-white">History</a><a href="/products" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Products</a></div></div></nav>
    <section className="mx-auto max-w-[1280px] px-5 py-14 lg:px-10"><div><p className="eyebrow">CATALOG</p><h1 className="section-title">Products</h1><p className="mt-3 text-sm text-white/40">Save your core offer once, then reuse it in the generator.</p></div>
      <div className="mt-10 grid gap-5 xl:grid-cols-[360px_1fr]"><aside className="h-fit rounded-[24px] bg-[#1a1a1a] p-5"><div className="mb-5 flex items-center gap-2 font-bold"><Plus className="size-4 text-[#ff5400]" /> Add product</div><div className="space-y-4"><label className="block text-xs text-white/45">Product name<Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-10 border-white/12 bg-white/6 text-white" /></label><label className="block text-xs text-white/45">Description<Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 min-h-20 border-white/12 bg-white/6 text-white" /></label><label className="block text-xs text-white/45">Selling points · comma separated<Input value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Waterproof, Lightweight" className="mt-2 h-10 border-white/12 bg-white/6 text-white" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs text-white/45">Commission<Input value={commission} onChange={(e) => setCommission(e.target.value)} className="mt-2 h-10 border-white/12 bg-white/6 text-white" /></label><label className="flex items-end justify-between rounded-[12px] bg-white/6 p-3 text-xs text-white/55"><span>Free sample</span><Switch checked={freeSample} onCheckedChange={setFreeSample} className="data-checked:bg-[#ff5400]" /></label></div><Button onClick={add} disabled={!name.trim()} className="h-11 w-full rounded-full bg-[#ff5400] font-bold text-black hover:bg-[#ff6a1a]"><Plus /> Save product</Button></div></aside>
        <div className="grid gap-4 md:grid-cols-2">{products.map((item, index) => <article key={item.id} className={`rounded-[24px] p-6 text-black ${index === 0 ? 'bg-[#ff5400]' : 'bg-[#fbfaf7]'}`}><div className="flex items-start justify-between"><span className={`grid size-11 place-items-center rounded-full ${index === 0 ? 'bg-black text-white' : 'bg-[#eceae5]'}`}><PackageOpen className="size-5" /></span><button onClick={() => persist(products.filter((product) => product.id !== item.id))} aria-label={`Delete ${item.name}`} className="rounded-full p-2 text-black/35 hover:bg-black/10 hover:text-black"><Trash2 className="size-4" /></button></div><h2 className="mt-6 text-2xl font-black tracking-[-.04em]">{item.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-black/55">{item.description}</p><div className="mt-5 flex flex-wrap gap-2">{item.features.map((feature) => <Badge key={feature} className={`rounded-full ${index === 0 ? 'bg-black text-white' : 'bg-[#eceae5] text-black'}`}>{feature}</Badge>)}</div><div className="mt-6 flex items-center justify-between border-t border-black/10 pt-5"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-black/40">Offer</p><p className="mt-1 font-black">{item.commission} · {item.freeSample ? 'Free sample' : 'No sample'}</p></div><Button onClick={() => useProduct(item)} className={`rounded-full font-bold ${index === 0 ? 'bg-black text-white hover:bg-black/80' : 'bg-[#ff5400] text-black hover:bg-[#ff6a1a]'}`}><Check /> Use</Button></div></article>)}</div>
      </div>
    </section>
  </main>;
}
