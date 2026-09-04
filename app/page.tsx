'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Clipboard, Code2, Copy, FileText, Image as ImageIcon, Link2, Mail, MessageCircle, RefreshCw, Send, ShieldCheck, Sparkles, Upload, Video, WandSparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const creatorImages = [
  'https://images.unsplash.com/photo-1620396748669-46bd3128ccce?w=720&h=1280&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1645848810652-44c3f68606e3?w=720&h=1280&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1645848810560-1c6acf9ba847?w=720&h=1280&fit=crop&auto=format',
];
const productImage = 'https://images.unsplash.com/photo-1576188973526-0e5d7047b0cf?w=900&h=700&fit=crop&auto=format';
const initialTranscripts = [
  'Okay so I walked outside and literally cried because the rain just destroyed my outfit. Like I spent 45 minutes putting this together. Seattle you win again.',
  "POV: you're me trying to find a jacket that's actually waterproof AND cute at the same time. Does this exist? Six months of searching.",
  "Coffee shop fit check. Fourteen days of rain and I'm still going outside every day. This is character development.",
];

type Result = { score: number; hook: string; source: string; reason: string; dm: string; subject: string; email: string; persona: string[] };
const cleanHandle = (value: string) => value.trim().replace(/^@/, '') || 'creator';
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const safeHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? escapeHtml(url.toString()) : '';
  } catch { return ''; }
};

export default function Home() {
  const [username, setUsername] = useState('rainydayrachel');
  const [bio, setBio] = useState('Seattle girl · daily fits · chaotic energy');
  const [transcripts, setTranscripts] = useState(initialTranscripts);
  const [activeVideo, setActiveVideo] = useState(0);
  const [product, setProduct] = useState('CloudLayer Jacket');
  const [description, setDescription] = useState('A lightweight everyday rain jacket designed to stay cute in bad weather.');
  const [features, setFeatures] = useState(['Waterproof', 'Lightweight', 'Oversized fit', 'Pink colorway']);
  const [commission, setCommission] = useState('15%');
  const [freeSample, setFreeSample] = useState(true);
  const [newFeature, setNewFeature] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [showHtml, setShowHtml] = useState(false);
  const [emailImageUrl, setEmailImageUrl] = useState('');
  const [emailImageAlt, setEmailImageAlt] = useState('Product image');
  const [emailImagePosition, setEmailImagePosition] = useState<'top' | 'after-intro' | 'bottom'>('after-intro');
  const [emailImageWidth, setEmailImageWidth] = useState<'full' | 'medium'>('full');
  const [ctaText, setCtaText] = useState('View collaboration details');
  const [ctaUrl, setCtaUrl] = useState('');
  const [includeOffer, setIncludeOffer] = useState(true);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, configured: false });
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const filledVideos = useMemo(() => transcripts.filter((item) => item.trim()).length, [transcripts]);
  const emailHtml = useMemo(() => {
    if (!result) return '';
    const paragraphs = result.email.split('\n\n').map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65;color:#202020">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`);
    const safeProduct = escapeHtml(product);
    const safeOffer = escapeHtml(commission || 'Creator collaboration');
    const imageUrl = safeHttpUrl(emailImageUrl);
    const buttonUrl = safeHttpUrl(ctaUrl);
    const imageBlock = imageUrl ? `<div style="margin:8px 0 24px;text-align:center"><img src="${imageUrl}" alt="${escapeHtml(emailImageAlt)}" width="${emailImageWidth === 'full' ? '548' : '420'}" style="display:inline-block;width:${emailImageWidth === 'full' ? '100%' : '76%'};max-width:${emailImageWidth === 'full' ? '548px' : '420px'};height:auto;border:0;border-radius:16px;object-fit:cover" /></div>` : '';
    const offerBlock = includeOffer ? `<div style="margin-top:26px;padding:18px 20px;background:#ff5400;border-radius:14px;font-weight:700;color:#111111">${safeProduct} · ${safeOffer}</div>` : '';
    const ctaBlock = buttonUrl && ctaText.trim() ? `<div style="margin-top:24px"><a href="${buttonUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700">${escapeHtml(ctaText.trim())}</a></div>` : '';
    const body = emailImagePosition === 'after-intro' && imageBlock
      ? [paragraphs[0], imageBlock, ...paragraphs.slice(1)].join('')
      : paragraphs.join('');
    return `<div style="background:#f4f2ed;padding:32px;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;background:#ffffff;border-radius:24px;padding:36px"><div style="font-weight:800;font-size:20px;margin-bottom:28px">Creator Outreach <span style="color:#ff5400">●</span></div>${emailImagePosition === 'top' ? imageBlock : ''}${body}${emailImagePosition === 'bottom' ? imageBlock : ''}${offerBlock}${ctaBlock}</div></div>`;
  }, [result, product, commission, emailImageUrl, emailImageAlt, emailImagePosition, emailImageWidth, ctaText, ctaUrl, includeOffer]);

  useEffect(() => {
    const selected = window.localStorage.getItem('creator-outreach-selected-product');
    if (selected) {
      try {
        const item = JSON.parse(selected) as { name?: string; description?: string; features?: string[]; commission?: string; freeSample?: boolean };
        if (item.name) setProduct(item.name);
        if (item.description) setDescription(item.description);
        if (item.features?.length) setFeatures(item.features);
        if (item.commission) setCommission(item.commission);
        if (typeof item.freeSample === 'boolean') setFreeSample(item.freeSample);
        window.localStorage.removeItem('creator-outreach-selected-product');
      } catch { /* Ignore invalid local data. */ }
    }
    const refreshGmailStatus = () => fetch('/api/gmail/status').then((response) => response.json()).then(setGmailStatus).catch(() => undefined);
    const handleOauthMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === 'gmail-connected') {
        refreshGmailStatus();
        setSendMessage('Gmail connected. Your work stayed right here.');
      }
    };
    refreshGmailStatus();
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  const buildResult = (tone: 'default' | 'shorter' | 'casual' | 'soft' = 'default'): Result => {
    const handle = cleanHandle(username);
    const name = handle.replace(/[^a-zA-Z]/g, '').replace(/^(.)/, (letter) => letter.toUpperCase()) || 'there';
    const isRain = /rain|seattle|waterproof/.test(transcripts.join(' ').toLowerCase());
    const feature = features.find((item) => isRain ? /water|rain|wind/i.test(item) : /light|fit|color/i.test(item)) || features[0] || 'everyday design';
    const sample = freeSample ? 'We’d love to send you one—no strings attached.' : 'We’d love to explore a collaboration.';
    const affiliate = commission ? ` It also comes with ${commission} affiliate commission.` : '';
    let dm = `Your Seattle rain rant was way too relatable 😭 We make the ${product}, and the ${feature.toLowerCase()} detail immediately felt like something that could survive your coffee runs and still look good. ${sample}${affiliate}`;
    let email = `Hi ${name},\n\nYour rain rant had me laughing—the part about spending 45 minutes on a look only for Seattle to win felt painfully real.\n\nWe built ${product} for exactly that kind of day: ${features.slice(0, 3).join(', ').toLowerCase()}, without the stiff rain-shell look. ${sample}${affiliate}\n\nWould you be open to taking a look? Full creative control, always.\n\n— CloudLayer team`;
    if (tone === 'shorter') {
      dm = `Your Seattle rain rant was too real 😭 Our ${product} is ${feature.toLowerCase()} without the rain-shell look. Can we send you one?`;
      email = `Hi ${name},\n\nYour Seattle rain rant was too real. Our ${product} is ${features.slice(0, 2).join(' and ').toLowerCase()}—made for staying dry without sacrificing the fit. ${sample}\n\nOpen to taking a look?\n\n— CloudLayer team`;
    } else if (tone === 'casual') {
      dm = `Okay, your Seattle rain rant got us 😭 We make a ${product.toLowerCase()} that’s actually ${feature.toLowerCase()} *and* cute. Feels very coffee-run approved. Want us to send one your way?`;
    } else if (tone === 'soft') {
      dm = `Your Seattle rain story made us think of our ${product}. The ${feature.toLowerCase()} design might be a natural fit for your rainy-day looks. Happy to send one over if it feels relevant—no pressure at all.`;
      email = email.replace('Would you be open to taking a look?', 'If it feels like a fit, we’d be happy to share more—no pressure at all.');
    }
    return {
      score: isRain ? 9 : 7,
      hook: isRain ? 'That Seattle rain vs. outfit saga' : 'Your latest everyday fit check',
      source: 'Video 1',
      reason: isRain ? `She described Seattle rain ruining a carefully planned outfit. ${feature} is a timely, natural product bridge.` : `Her recent outfit content gives the product a relevant, low-pressure entry point.`,
      dm,
      subject: `A rainy-day collab idea — ${product} × @${handle}`,
      email,
      persona: ['Fashion', 'Casual', 'Humor-forward'],
    };
  };

  const generate = (tone: 'default' | 'shorter' | 'casual' | 'soft' = 'default') => {
    setGenerating(true);
    window.setTimeout(() => {
      const nextResult = buildResult(tone);
      setResult(nextResult); setGenerating(false);
      const stored = JSON.parse(window.localStorage.getItem('creator-outreach-history') || '[]') as unknown[];
      window.localStorage.setItem('creator-outreach-history', JSON.stringify([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), username: cleanHandle(username), product, ...nextResult }, ...stored].slice(0, 50)));
      window.setTimeout(() => document.querySelector('#results')?.scrollIntoView({ behavior: 'smooth' }), 40);
    }, 650);
  };
  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(null), 1400);
  };
  const addFeature = () => {
    if (!newFeature.trim()) return; setFeatures([...features, newFeature.trim()]); setNewFeature('');
  };

  const collectYouTube = async () => {
    if (!channelName.trim()) return;
    setCollecting(true); setCollectionMessage('Finding videos from the last 7 days…');
    try {
      const response = await fetch('/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: channelName, maxVideos: 3 }) });
      const data = await response.json() as { error?: string; message?: string; channel?: { title?: string }; videos?: Array<{ transcript?: string; status?: string }> };
      if (!response.ok) throw new Error(data.message || data.error || 'Collection failed.');
      const ready = (data.videos || []).filter((video) => video.status === 'ready' && video.transcript).map((video) => video.transcript as string);
      if (!ready.length) throw new Error('Recent videos were found, but their transcripts are still processing or unavailable.');
      setTranscripts([ready[0] || '', ready[1] || '', ready[2] || '']);
      setUsername(data.channel?.title || channelName);
      setCollectionMessage(`${ready.length} transcripts collected. The newest 3 are loaded below.`);
    } catch (error) { setCollectionMessage(error instanceof Error ? error.message : 'Collection failed.'); }
    finally { setCollecting(false); }
  };

  const sendEmail = async () => {
    if (!result || !emailRecipient.trim()) return;
    setSending(true); setSendMessage('');
    try {
      const response = await fetch('/api/gmail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: emailRecipient, subject: result.subject, html: emailHtml, text: result.email }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Send failed.');
      setSendMessage('Email sent successfully.');
    } catch (error) { setSendMessage(error instanceof Error ? error.message : 'Send failed.'); }
    finally { setSending(false); }
  };

  const connectGmail = () => {
    setSendMessage('');
    const popup = window.open('/api/gmail/connect', 'gmail-oauth', 'popup=yes,width=540,height=720');
    if (!popup) setSendMessage('Pop-up blocked. Allow pop-ups for this site and try again.');
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#ff5400] text-black"><Sparkles className="size-4" strokeWidth={2.6} /></span><span className="text-[15px] font-bold tracking-[-0.02em]">Creator Outreach</span><Badge className="hidden rounded-full border-white/10 bg-white/8 text-white/55 sm:inline-flex">LOCAL</Badge></div>
          <div className="hidden items-center gap-1 rounded-full bg-white/6 p-1 md:flex"><a href="/" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Generator</a><a href="/history" className="rounded-full px-4 py-2 text-sm font-medium text-white/55 hover:bg-white/8 hover:text-white">History</a><a href="/products" className="rounded-full px-4 py-2 text-sm font-medium text-white/55 hover:bg-white/8 hover:text-white">Products</a></div>
          <div className="flex items-center gap-2 text-xs text-white/55"><ShieldCheck className="size-4 text-[#ff5400]" /><span className="hidden sm:inline">100% local processing</span></div>
        </div>
      </nav>

      <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-14 lg:px-10 lg:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_520px]">
          <div className="max-w-[760px]"><Badge className="mb-6 rounded-full bg-white/9 px-3 py-1 text-white/70">AI-POWERED · FOR TIKTOK SHOP BD</Badge><h1 className="text-[clamp(48px,6.5vw,92px)] font-black leading-[0.96] tracking-[-0.065em]">Turn creator content into outreach that feels <em className="font-serif font-normal text-[#ff5400]">personal.</em></h1><p className="mt-7 max-w-[590px] text-[17px] leading-7 text-white/55">Paste three recent video transcripts. Get a specific, source-backed outreach message in one second—without uploading creator data.</p></div>
          <div className="relative hidden h-[360px] lg:block" aria-hidden="true">{creatorImages.map((image, index) => <div key={image} className={`absolute bottom-0 w-[190px] overflow-hidden rounded-[24px] border-[5px] border-[#0f0f0f] bg-[#222] ${index === 0 ? 'left-8 -rotate-6' : index === 1 ? 'left-[168px] z-10 rotate-2' : 'right-1 rotate-6'}`}><img src={image} alt="" className="h-[330px] w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-black/60 p-4 text-xs font-semibold text-white">@{['coffeeshopfits','rainydayrachel','seattlestyle'][index]}</div></div>)}</div>
        </div>
        <div className="mt-12 flex items-center gap-3"><Button onClick={() => document.querySelector('#generator')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 rounded-full bg-[#ff5400] px-6 font-bold text-black hover:bg-[#ff6a1a]">Create outreach <ArrowDown className="ml-1 size-4" /></Button><span className="text-xs text-white/35">No API key · No account</span></div>
      </section>

      <section id="generator" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-10 lg:px-10">
        <div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">01 / INPUT</p><h2 className="section-title">Creator + Product</h2></div><div className="hidden items-center gap-2 text-xs text-white/40 sm:flex"><FileText className="size-4" /> {filledVideos}/3 transcripts ready</div></div>
        <div className="grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
          <article className="light-card p-5 sm:p-7">
            <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><img src="https://images.unsplash.com/photo-1740855597684-719a84c8f2d3?w=200&h=200&fit=crop&auto=format" alt="Creator avatar" className="size-12 rounded-full object-cover" /><div><p className="field-label">Creator</p><p className="font-bold">@{cleanHandle(username)}</p></div></div><Badge className="rounded-full bg-[#e9f7eb] text-[#25733a]">Ready</Badge></div>
            <div className="grid gap-4 sm:grid-cols-[.8fr_1.2fr]"><label className="field-label">Username<Input value={username} onChange={(e) => setUsername(e.target.value)} className="light-input mt-2" /></label><label className="field-label">Short bio<Input value={bio} onChange={(e) => setBio(e.target.value)} className="light-input mt-2" /></label></div>
            <div className="mt-6 rounded-[18px] bg-black p-4 text-white"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><Video className="size-4 text-[#ff5400]" /> Auto-collect from YouTube</div><div className="flex flex-col gap-2 sm:flex-row"><Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Channel name or @handle" className="h-10 flex-1 border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:border-[#ff5400] focus-visible:ring-0" /><Button onClick={collectYouTube} disabled={collecting || !channelName.trim()} className="h-10 rounded-full bg-[#ff5400] px-5 font-bold text-black hover:bg-[#ff6a1a]">{collecting ? <RefreshCw className="animate-spin" /> : <Video />} Last 7 days</Button></div>{collectionMessage && <p className="mt-3 text-xs leading-5 text-white/55">{collectionMessage}</p>}</div>
            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-4">{creatorImages.map((image, index) => <button key={image} onClick={() => setActiveVideo(index)} className={`group relative aspect-[9/11] overflow-hidden rounded-[18px] text-left transition ${activeVideo === index ? 'ring-3 ring-[#ff5400]' : 'ring-1 ring-black/8 hover:-translate-y-1'}`}><img src={image} alt={`Video ${index + 1}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white sm:left-3 sm:top-3">VIDEO {index + 1}</span><span className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2.5 text-[11px] font-semibold text-white">Transcript</span></button>)}</div>
            <div className="mt-4 rounded-[18px] bg-[#f1f0ed] p-4"><div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[.1em] text-black/40"><span>Video {activeVideo + 1} transcript</span><span>{transcripts[activeVideo].length} chars</span></div><Textarea aria-label={`Video ${activeVideo + 1} transcript`} value={transcripts[activeVideo]} onChange={(e) => setTranscripts(transcripts.map((item, index) => index === activeVideo ? e.target.value : item))} className="min-h-[108px] resize-none border-0 bg-transparent p-0 text-[15px] leading-6 text-black shadow-none focus-visible:ring-0" /><div className="mt-3 flex items-center gap-2 border-t border-black/8 pt-3 text-[11px] text-black/40"><Upload className="size-3.5" /> Paste transcript or drop a .txt file</div></div>
          </article>

          <article className="light-card overflow-hidden"><div className="relative h-[255px] overflow-hidden"><img src={productImage} alt="CloudLayer Jacket product" className="h-full w-full object-cover" /><span className="absolute left-5 top-5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">PRODUCT</span></div><div className="p-5 sm:p-7">
            <label className="field-label">Product name<Input value={product} onChange={(e) => setProduct(e.target.value)} className="light-input mt-2 text-lg font-bold" /></label><label className="field-label mt-4 block">Description<Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="light-input mt-2 min-h-[72px] resize-none" /></label>
            <div className="mt-5"><p className="field-label">Selling points</p><div className="mt-2 flex flex-wrap gap-2">{features.map((feature) => <Badge key={feature} className="h-8 gap-1 rounded-full bg-[#eceae5] px-3 text-black">{feature}<button aria-label={`Remove ${feature}`} onClick={() => setFeatures(features.filter((item) => item !== feature))}><X className="size-3" /></button></Badge>)}<form onSubmit={(e) => { e.preventDefault(); addFeature(); }}><Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="+ feature" className="h-8 w-24 rounded-full border-black/12 bg-transparent px-3 text-xs text-black placeholder:text-black/40 focus-visible:border-[#ff5400] focus-visible:ring-0" /></form></div></div>
            <div className="mt-6 grid grid-cols-2 gap-3"><label className="rounded-[16px] bg-[#f1f0ed] p-4 text-xs font-semibold text-black/45">Commission<Input value={commission} onChange={(e) => setCommission(e.target.value)} className="mt-1 h-7 border-0 bg-transparent p-0 text-lg font-black text-black focus-visible:ring-0" /></label><label className="flex items-center justify-between rounded-[16px] bg-[#f1f0ed] p-4"><span><span className="block text-xs font-semibold text-black/45">Free sample</span><span className="mt-1 block text-sm font-bold text-black">{freeSample ? 'Included' : 'Not included'}</span></span><Switch checked={freeSample} onCheckedChange={setFreeSample} className="data-checked:bg-[#ff5400]" /></label></div>
          </div></article>
        </div>
        <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-[24px] bg-[#1a1a1a] p-5 sm:flex-row sm:px-7"><div className="flex items-center gap-3 text-sm text-white/55"><span className="grid size-10 place-items-center rounded-full bg-white/8"><ShieldCheck className="size-4 text-[#ff5400]" /></span><span><strong className="block text-white">Specific, not creepy.</strong>Every claim stays traceable to a transcript.</span></div><Button onClick={() => generate()} disabled={generating || !username.trim() || filledVideos === 0 || !product.trim()} className="h-14 w-full rounded-full bg-[#ff5400] px-8 text-base font-black text-black hover:bg-[#ff6a1a] sm:w-auto">{generating ? <><RefreshCw className="size-4 animate-spin" /> Analyzing context…</> : <><WandSparkles className="size-5" /> Generate outreach</>}</Button></div>
      </section>

      <section id="results" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 pt-12 lg:px-10">
        <div className="mb-5"><p className="eyebrow">02 / OUTPUT</p><h2 className="section-title">Match + Outreach</h2></div>
        {!result ? <div className="grid min-h-[330px] place-items-center rounded-[28px] border border-dashed border-white/15 bg-white/[.025] text-center"><div className="max-w-sm px-6"><span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-white/7"><Sparkles className="size-5 text-[#ff5400]" /></span><h3 className="text-xl font-bold">Your personalized outreach will land here.</h3><p className="mt-2 text-sm leading-6 text-white/40">We’ll show the exact source, product connection, risk level, DM and email.</p></div></div> : <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <article className="mb-5 grid overflow-hidden rounded-[28px] bg-white text-black lg:grid-cols-[1fr_80px_1fr_170px]"><div className="flex gap-4 p-5 sm:p-7"><img src={creatorImages[0]} alt="Creator context" className="h-28 w-24 rounded-[16px] object-cover" /><div><p className="field-label">Creator context · {result.source}</p><p className="mt-3 text-[17px] font-bold leading-6">“{transcripts[0].split('.')[0]}.”</p></div></div><div className="grid place-items-center bg-[#f2f0eb]"><ArrowRight className="size-5 rotate-90 text-black/35 lg:rotate-0" /></div><div className="flex gap-4 p-5 sm:p-7"><img src={productImage} alt="Product" className="h-28 w-24 rounded-[16px] object-cover" /><div><p className="field-label">Product angle</p><p className="mt-3 font-black">{product}</p><Badge className="mt-3 rounded-full bg-[#eceae5] text-black">{features[0] || 'Product fit'}</Badge><p className="mt-3 text-xs leading-5 text-black/45">{result.reason}</p></div></div><div className="grid place-items-center bg-[#ff5400] p-6 text-center"><div><div className="text-5xl font-black tracking-[-.06em]">{result.score}<span className="text-2xl">/10</span></div><p className="mt-2 text-xs font-bold uppercase tracking-[.14em]">Strong match</p></div></div></article>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <article className="light-card p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><MessageCircle className="size-4" /><h3 className="font-black">TikTok / IG DM</h3></div><Button onClick={() => copyText('dm', result.dm)} variant="outline" className="h-9 rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white">{copied === 'dm' ? <Check /> : <Copy />} {copied === 'dm' ? 'Copied' : 'Copy'}</Button></div><Textarea value={result.dm} onChange={(e) => setResult({ ...result, dm: e.target.value })} className="min-h-[180px] resize-none rounded-[18px] border-0 bg-[#f1f0ed] p-5 text-base leading-7 text-black focus-visible:ring-2 focus-visible:ring-[#ff5400]" /><div className="mt-4 flex flex-wrap gap-2">{[['Shorter','shorter'],['More casual','casual'],['Less salesy','soft']].map(([label,tone]) => <Button key={tone} onClick={() => generate(tone as 'shorter' | 'casual' | 'soft')} variant="outline" className="rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white">{label}</Button>)}<Button onClick={() => generate()} variant="ghost" className="ml-auto rounded-full text-black/50 hover:bg-black/5 hover:text-black"><RefreshCw /> Regenerate</Button></div></article>
            <article className="rounded-[28px] bg-[#ff5400] p-5 text-black sm:p-7"><div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="size-4" /><h3 className="font-black">Best hook</h3></div><Badge className="rounded-full bg-black text-white">LOW RISK</Badge></div><p className="text-[clamp(30px,4vw,48px)] font-black leading-[1.02] tracking-[-.05em]">“{result.hook}”</p><div className="mt-8 flex items-center justify-between border-t border-black/15 pt-4 text-xs font-bold"><span>Source verified</span><span className="flex items-center gap-1"><Clipboard className="size-3.5" /> {result.source}</span></div></article>
            <article className="light-card p-5 sm:p-7 xl:col-span-2"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><Mail className="size-4" /><h3 className="font-black">Email</h3></div><Button onClick={() => copyText('email', `${result.subject}\n\n${result.email}`)} variant="outline" className="h-9 rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white">{copied === 'email' ? <Check /> : <Copy />} {copied === 'email' ? 'Copied' : 'Copy all'}</Button></div><div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr]"><div className="rounded-[18px] bg-[#f1f0ed] p-5"><p className="field-label">Subject</p><Input value={result.subject} onChange={(e) => setResult({ ...result, subject: e.target.value })} className="mt-3 h-auto border-0 bg-transparent p-0 text-base font-bold text-black focus-visible:ring-0" /><div className="mt-8 border-t border-black/8 pt-5"><p className="field-label">Creator tone</p><div className="mt-3 flex flex-wrap gap-2">{result.persona.map((item) => <Badge key={item} className="rounded-full bg-white text-black">{item}</Badge>)}</div></div></div><Textarea value={result.email} onChange={(e) => setResult({ ...result, email: e.target.value })} className="min-h-[260px] resize-none rounded-[18px] border-0 bg-[#f1f0ed] p-5 text-[15px] leading-7 text-black focus-visible:ring-2 focus-visible:ring-[#ff5400]" /></div>
              <div className="mt-5 rounded-[18px] bg-black p-5 text-white"><div className="grid gap-5 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><Send className="size-4 text-[#ff5400]" /><p className="font-bold">HTML email delivery</p><Badge className={`rounded-full ${gmailStatus.connected ? 'bg-[#dff6e4] text-[#216c34]' : 'bg-white/10 text-white/55'}`}>{gmailStatus.connected ? 'GMAIL CONNECTED' : gmailStatus.configured ? 'READY TO CONNECT' : 'SETUP REQUIRED'}</Badge></div><Input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="creator@email.com" className="mt-4 h-10 max-w-md border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:border-[#ff5400] focus-visible:ring-0" />{sendMessage && <p className="mt-2 text-xs text-white/55">{sendMessage}</p>}</div><div className="flex flex-wrap items-end gap-2"><Button onClick={() => setShowHtml(!showHtml)} variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black"><Code2 /> {showHtml ? 'Hide preview' : 'Preview HTML'}</Button>{!gmailStatus.connected ? <Button onClick={connectGmail} className="rounded-full bg-white px-4 font-bold text-black hover:bg-white/85">Connect Gmail</Button> : <Button onClick={sendEmail} disabled={sending || !emailRecipient.trim()} className="rounded-full bg-[#ff5400] px-5 font-bold text-black hover:bg-[#ff6a1a]">{sending ? <RefreshCw className="animate-spin" /> : <Send />} Send HTML</Button>}</div></div>
                <div className="mt-5 border-t border-white/10 pt-5"><div className="mb-4 flex items-center gap-2"><ImageIcon className="size-4 text-[#ff5400]" /><p className="text-xs font-bold uppercase tracking-[.12em] text-white/45">Email content blocks</p></div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold text-white/55">Image URL<Input value={emailImageUrl} onChange={(e) => setEmailImageUrl(e.target.value)} placeholder="https://…/product.jpg" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label><label className="text-xs font-semibold text-white/55">Image description<Input value={emailImageAlt} onChange={(e) => setEmailImageAlt(e.target.value)} placeholder="Product image" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label><label className="text-xs font-semibold text-white/55">Image position<Select value={emailImagePosition} onValueChange={(value) => value && setEmailImagePosition(value as 'top' | 'after-intro' | 'bottom')}><SelectTrigger className="mt-2 h-10 w-full border-white/15 bg-white/8 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="top">Top of email</SelectItem><SelectItem value="after-intro">After opening paragraph</SelectItem><SelectItem value="bottom">After message</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-white/55">Image width<Select value={emailImageWidth} onValueChange={(value) => value && setEmailImageWidth(value as 'full' | 'medium')}><SelectTrigger className="mt-2 h-10 w-full border-white/15 bg-white/8 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Full width</SelectItem><SelectItem value="medium">Medium, centered</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-white/55"><span className="flex items-center gap-1.5"><Link2 className="size-3.5" /> Button text</span><Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="View collaboration details" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label><label className="text-xs font-semibold text-white/55">Button link<Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label></div><label className="mt-4 flex items-center justify-between rounded-[14px] bg-white/7 px-4 py-3 text-sm font-semibold"><span>Include product + commission block</span><Switch checked={includeOffer} onCheckedChange={setIncludeOffer} className="data-checked:bg-[#ff5400]" /></label><p className="mt-3 text-xs leading-5 text-white/35">Use a public HTTPS image URL. The preview and sent email update automatically.</p></div>
              </div>
              {showHtml && <iframe title="HTML email preview" srcDoc={emailHtml} className="mt-4 h-[440px] w-full rounded-[18px] border border-black/10 bg-white" />}
            </article>
          </div>
        </div>}
      </section>
      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/30">Creator Outreach · Local-first MVP · Built for US TikTok Shop BD</footer>
    </main>
  );
}
