'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Clipboard, Code2, Copy, FileText, Image as ImageIcon, Link2, Mail, MessageCircle, PackageSearch, RefreshCw, Send, ShieldCheck, Sparkles, Upload, Video, WandSparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { defaultProducts, rankProducts, type Product, type ProductMatch } from '@/lib/products';
import { emailPlaceholders, renderEmailTemplate, starterEmailCss, starterEmailHtml } from '@/lib/email-template';
import { BrandNav } from '@/components/brand-nav';

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

type Result = { score: number; hook: string; source: string; evidence: string; reason: string; dm: string; subject: string; email: string; persona: string[] };
type InlineEmailImage = { dataUrl: string; data: string; mimeType: string; filename: string; cid: string };
const cleanHandle = (value: string) => value.trim().replace(/^@/, '') || 'creator';
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const safeHttpUrl = (value: string) => {
  try {
    const input = value.trim();
    if (!input) return '';
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
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
  const [productLibrary, setProductLibrary] = useState<Product[]>(defaultProducts);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [matchingProducts, setMatchingProducts] = useState(false);
  const [matchSignature, setMatchSignature] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [showHtml, setShowHtml] = useState(true);
  const [emailImageUrl, setEmailImageUrl] = useState('');
  const [emailImageFile, setEmailImageFile] = useState<InlineEmailImage | null>(null);
  const [emailImageError, setEmailImageError] = useState('');
  const [emailImageAlt, setEmailImageAlt] = useState('Product image');
  const [emailImagePosition, setEmailImagePosition] = useState<'top' | 'after-intro' | 'bottom'>('after-intro');
  const [emailImageWidth, setEmailImageWidth] = useState<'full' | 'medium'>('full');
  const [ctaText, setCtaText] = useState('View collaboration details');
  const [ctaUrl, setCtaUrl] = useState('');
  const [includeOffer, setIncludeOffer] = useState(true);
  const [emailEditorMode, setEmailEditorMode] = useState<'visual' | 'code'>('visual');
  const [customEmailHtml, setCustomEmailHtml] = useState(starterEmailHtml);
  const [customEmailCss, setCustomEmailCss] = useState(starterEmailCss);
  const [templateMessage, setTemplateMessage] = useState('');
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [celebration, setCelebration] = useState<'match' | 'message' | null>(null);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, configured: false });
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const filledVideos = useMemo(() => transcripts.filter((item) => item.trim()).length, [transcripts]);
  const creatorSignature = useMemo(() => JSON.stringify([username, bio, transcripts, productLibrary]), [username, bio, transcripts, productLibrary]);
  const matchesFresh = productMatches.length > 0 && matchSignature === creatorSignature;
  const selectedMatch = productMatches.find((item) => item.product.id === selectedProductId) || null;
  const emailHtml = useMemo(() => {
    if (!result) return { preview: '', send: '' };
    const handle = cleanHandle(username);
    const creatorName = handle.replace(/[^a-zA-Z]/g, '').replace(/^(.)/, (letter) => letter.toUpperCase()) || 'there';
    const buttonUrl = safeHttpUrl(ctaUrl);
    const templateValues = (imageSource: string) => ({ subject: result.subject, creatorName, creatorHandle: `@${handle}`, emailBody: result.email, productName: product, productDescription: description, productFeatures: features, commission, imageSource, imageAlt: emailImageAlt, ctaText, ctaUrl: buttonUrl, includeOffer });
    const remoteImage = safeHttpUrl(emailImageUrl);
    if (emailEditorMode === 'code') {
      return {
        preview: renderEmailTemplate(customEmailHtml, customEmailCss, templateValues(emailImageFile?.dataUrl || remoteImage)),
        send: renderEmailTemplate(customEmailHtml, customEmailCss, templateValues(emailImageFile ? `cid:${emailImageFile.cid}` : remoteImage)),
      };
    }
    const paragraphs = result.email.split('\n\n').map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65;color:#202020">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`);
    const safeProduct = escapeHtml(product);
    const safeOffer = escapeHtml(commission || 'Creator collaboration');
    const offerBlock = includeOffer ? `<div style="margin-top:26px;padding:18px 20px;background:#ff5400;border-radius:14px;font-weight:700;color:#111111">${safeProduct} · ${safeOffer}</div>` : '';
    const buttonLabel = escapeHtml(ctaText.trim());
    const buttonStyle = 'display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700';
    const ctaBlock = buttonLabel ? `<div style="margin-top:24px">${buttonUrl ? `<a href="${buttonUrl}" target="_blank" style="${buttonStyle}">${buttonLabel}</a>` : `<span style="${buttonStyle}">${buttonLabel}</span>`}</div>` : '';
    const build = (imageSource: string) => {
      const imageBlock = imageSource ? `<div style="margin:8px 0 24px;text-align:center"><img src="${imageSource}" alt="${escapeHtml(emailImageAlt)}" width="${emailImageWidth === 'full' ? '548' : '420'}" style="display:inline-block;width:${emailImageWidth === 'full' ? '100%' : '76%'};max-width:${emailImageWidth === 'full' ? '548px' : '420px'};height:auto;border:0;border-radius:16px;object-fit:cover" /></div>` : '';
      const body = emailImagePosition === 'after-intro' && imageBlock ? [paragraphs[0], imageBlock, ...paragraphs.slice(1)].join('') : paragraphs.join('');
      return `<div style="background:#f4f2ed;padding:32px;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;background:#ffffff;border-radius:24px;padding:36px"><div style="font-weight:800;font-size:20px;margin-bottom:28px">Creator Outreach <span style="color:#ff5400">●</span></div>${emailImagePosition === 'top' ? imageBlock : ''}${body}${emailImagePosition === 'bottom' ? imageBlock : ''}${offerBlock}${ctaBlock}</div></div>`;
    };
    return {
      preview: build(emailImageFile?.dataUrl || remoteImage),
      send: build(emailImageFile ? `cid:${emailImageFile.cid}` : remoteImage),
    };
  }, [result, username, product, description, features, commission, emailImageUrl, emailImageFile, emailImageAlt, emailImagePosition, emailImageWidth, ctaText, ctaUrl, includeOffer, emailEditorMode, customEmailHtml, customEmailCss]);

  useEffect(() => {
    let nextProducts = defaultProducts;
    const savedProducts = window.localStorage.getItem('creator-outreach-products');
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts) as Product[];
        if (Array.isArray(parsed) && parsed.length) nextProducts = parsed;
      } catch { /* Ignore invalid local data. */ }
    }
    const selected = window.localStorage.getItem('creator-outreach-selected-product');
    if (selected) {
      try {
        const item = JSON.parse(selected) as Product;
        if (item.id && !nextProducts.some((productItem) => productItem.id === item.id)) nextProducts = [item, ...nextProducts];
        window.localStorage.removeItem('creator-outreach-selected-product');
      } catch { /* Ignore invalid local data. */ }
    }
    setProductLibrary(nextProducts);
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

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActiveShowcase((current) => (current + 1) % 3), 3800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedTemplate = window.localStorage.getItem('creator-outreach-email-template');
    if (!savedTemplate) return;
    try {
      const parsed = JSON.parse(savedTemplate) as { html?: string; css?: string };
      if (parsed.html) setCustomEmailHtml(parsed.html);
      if (parsed.css) setCustomEmailCss(parsed.css);
    } catch { /* Ignore invalid local template data. */ }
  }, []);

  const saveCustomTemplate = () => {
    window.localStorage.setItem('creator-outreach-email-template', JSON.stringify({ html: customEmailHtml, css: customEmailCss }));
    setTemplateMessage('Template saved on this device.');
    window.setTimeout(() => setTemplateMessage(''), 1800);
  };

  const resetCustomTemplate = () => {
    setCustomEmailHtml(starterEmailHtml);
    setCustomEmailCss(starterEmailCss);
    setTemplateMessage('Starter template restored.');
  };

  const buildResult = (tone: 'default' | 'shorter' | 'casual' | 'soft' = 'default'): Result => {
    const handle = cleanHandle(username);
    const name = handle.replace(/[^a-zA-Z]/g, '').replace(/^(.)/, (letter) => letter.toUpperCase()) || 'there';
    const match = selectedMatch || productMatches[0];
    const feature = match?.matchedFeatures[0] || features[0] || 'everyday design';
    const evidence = match?.evidence || transcripts.find((item) => item.trim())?.split(/(?<=[.!?])\s+/)[0] || bio;
    const evidenceLine = evidence.replace(/[“”"]/g, '').slice(0, 135);
    const sample = freeSample ? 'We’d love to send you one—no strings attached.' : 'We’d love to explore a collaboration.';
    const affiliate = commission ? ` It also comes with ${commission} affiliate commission.` : '';
    let dm = `Your “${evidenceLine}” moment really stood out. We thought of ${product}—the ${feature.toLowerCase()} angle feels genuinely aligned with your content. ${sample}${affiliate}`;
    let email = `Hi ${name},\n\nI loved your recent video—the “${evidenceLine}” moment felt especially true to your voice.\n\nAfter looking across our product lineup, ${product} came out as the strongest match. Its ${features.slice(0, 3).join(', ').toLowerCase()} features connect naturally with what your audience already sees from you. ${sample}${affiliate}\n\nWould you be open to taking a look? Full creative control, always.\n\n— Partnerships team`;
    if (tone === 'shorter') {
      dm = `Your “${evidenceLine}” moment caught our eye. ${product} feels like a strong fit—especially the ${feature.toLowerCase()} angle. Can we send you one?`;
      email = `Hi ${name},\n\nYour “${evidenceLine}” moment caught our eye. ${product} ranked as our strongest fit for your content, especially its ${features.slice(0, 2).join(' and ').toLowerCase()} features. ${sample}\n\nOpen to taking a look?\n\n— Partnerships team`;
    } else if (tone === 'casual') {
      dm = `Okay, your “${evidenceLine}” moment got us 😭 ${product} was the clear match from our lineup—the ${feature.toLowerCase()} detail feels very you. Want us to send one your way?`;
    } else if (tone === 'soft') {
      dm = `Your recent content made us think of ${product}. The ${feature.toLowerCase()} detail might be a natural fit for your audience. Happy to share more if it feels relevant—no pressure at all.`;
      email = email.replace('Would you be open to taking a look?', 'If it feels like a fit, we’d be happy to share more—no pressure at all.');
    }
    return {
      score: Math.max(1, Math.round((match?.score || 70) / 10)),
      hook: evidenceLine || 'Your latest creator moment',
      source: match?.source || 'Video 1',
      evidence,
      reason: match?.reason || `${feature} creates a natural product bridge from the creator’s recent content.`,
      dm,
      subject: `A creator-first collab idea — ${product} × @${handle}`,
      email,
      persona: /fashion|outfit|fit|style|wear/i.test(`${bio} ${transcripts.join(' ')}`) ? ['Fashion', 'Casual', 'Creator-led'] : ['Lifestyle', 'Authentic', 'Creator-led'],
    };
  };

  const chooseProduct = (match: ProductMatch) => {
    setSelectedProductId(match.product.id);
    setProduct(match.product.name);
    setDescription(match.product.description);
    setFeatures(match.product.features);
    setCommission(match.product.commission);
    setFreeSample(match.product.freeSample);
    setResult(null);
  };

  const matchProducts = () => {
    if (!filledVideos || !productLibrary.length) return;
    setMatchingProducts(true);
    window.setTimeout(() => {
      const ranked = rankProducts(productLibrary, transcripts, bio);
      setProductMatches(ranked);
      setMatchSignature(creatorSignature);
      if (ranked[0]) chooseProduct(ranked[0]);
      setMatchingProducts(false);
      setCelebration('match');
      window.setTimeout(() => setCelebration(null), 1800);
    }, 550);
  };

  const generate = (tone: 'default' | 'shorter' | 'casual' | 'soft' = 'default') => {
    setGenerating(true);
    window.setTimeout(() => {
      const nextResult = buildResult(tone);
      setResult(nextResult); setGenerating(false);
      setCelebration('message');
      window.setTimeout(() => setCelebration(null), 1800);
      const stored = JSON.parse(window.localStorage.getItem('creator-outreach-history') || '[]') as unknown[];
      window.localStorage.setItem('creator-outreach-history', JSON.stringify([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), username: cleanHandle(username), product, ...nextResult }, ...stored].slice(0, 50)));
      window.setTimeout(() => document.querySelector('#results')?.scrollIntoView({ behavior: 'smooth' }), 40);
    }, 650);
  };
  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(null), 1400);
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

  const uploadEmailImage = (file?: File) => {
    if (!file) return;
    setEmailImageError('');
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      setEmailImageError('Use a PNG, JPG, GIF or WebP image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setEmailImageError('Image must be smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const data = dataUrl.split(',')[1] || '';
      if (!data) {
        setEmailImageError('Could not read this image.');
        return;
      }
      setEmailImageFile({ dataUrl, data, mimeType: file.type, filename: file.name.replace(/[\r\n"]/g, '_'), cid: 'outreach-product-image' });
      setEmailImageUrl('');
      setEmailImageAlt(file.name.replace(/\.[^.]+$/, '') || 'Product image');
      setShowHtml(true);
    };
    reader.onerror = () => setEmailImageError('Could not read this image.');
    reader.readAsDataURL(file);
  };

  const sendEmail = async () => {
    if (!result || !emailRecipient.trim()) return;
    setSending(true); setSendMessage('');
    try {
      const response = await fetch('/api/gmail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: emailRecipient.trim(), subject: result.subject.trim(), html: emailHtml.send, text: result.email, inlineImage: emailImageFile ? { data: emailImageFile.data, mimeType: emailImageFile.mimeType, filename: emailImageFile.filename, cid: emailImageFile.cid } : undefined }) });
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
    <main className="app-shell min-h-screen bg-background text-foreground">
      <BrandNav active="generator" />
      {celebration && <output className="celebration-toast" aria-live="polite"><span aria-hidden="true">{celebration === 'match' ? '🎯' : '💌'}</span><div><strong>{celebration === 'match' ? 'Best match found!' : 'Personalized message ready!'}</strong><small>{celebration === 'match' ? 'Review the ranked products below.' : 'Edit, preview, or send when it feels right.'}</small></div><span aria-hidden="true">✨</span></output>}

      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-6 sm:px-5 lg:px-10 lg:pt-10">
        <div className="hero-studio">
          <div className="relative z-10 max-w-[670px]"><div className="mb-6 flex flex-wrap items-center gap-2"><Badge className="rounded-full bg-[#27322d] px-3 py-1.5 text-[#eef5eb]">TIKTOK SHOP · CREATOR BD</Badge><span className="micro-note">01 SIGNALS · 02 MATCH · 03 OUTREACH</span></div><h1 className="hero-title">Find the fit.<br /><span>Write the pitch.</span></h1><p className="mt-6 max-w-[590px] text-[17px] leading-7 text-[#27322d]/65">Collect recent scripts, match the right product, and build a send-ready email—with every creator detail traceable.</p><div className="mt-8 flex flex-wrap items-center gap-3"><Button onClick={() => document.querySelector('#generator')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 rounded-full bg-[#27322d] px-6 font-bold text-white hover:bg-[#39463f]">Start creator scan <ArrowDown className="ml-1 size-4" /></Button><span className="micro-note">Private by default · editable at every step</span></div></div>
          <div className="showcase-wrap" aria-label="Product workflow preview"><span className="float-emoji emoji-one" aria-hidden="true">✨</span><span className="float-emoji emoji-two" aria-hidden="true">🫶</span><span className="float-emoji emoji-three" aria-hidden="true">💌</span><div className="showcase-stage">
            <article className={`showcase-phone phone-sage ${activeShowcase === 0 ? 'is-active' : ''}`}><div className="phone-bar"><span>9:41</span><span>● ●</span></div><div className="phone-progress"><i style={{ width: '33%' }} /></div><p className="screen-kicker">CREATOR SCAN · 01</p><div className="flex items-center gap-3"><img src={creatorImages[1]} alt="Creator profile" className="size-14 rounded-[18px] object-cover" /><div><h3>@rainydayrachel</h3><p className="screen-note">3 scripts ready · lifestyle</p></div></div><div className="mt-5 rounded-[18px] bg-white/75 p-4"><p className="screen-note">STRONGEST SIGNAL</p><p className="mt-2 text-sm font-bold leading-5">“Waterproof and cute at the same time?”</p></div><div className="screen-feedback">🥳 Context found!</div></article>
            <article className={`showcase-phone phone-coral ${activeShowcase === 1 ? 'is-active' : ''}`}><div className="phone-bar"><span>9:41</span><span>● ●</span></div><div className="phone-progress"><i style={{ width: '66%' }} /></div><p className="screen-kicker">PRODUCT MATCH · 02</p><div className="score-orb">94<span>%</span></div><h3 className="text-center">CloudLayer Jacket</h3><p className="mt-1 text-center text-xs text-[#27322d]/55">Best fit across your catalog</p><div className="mt-5 flex flex-wrap justify-center gap-1.5"><span className="screen-chip">Waterproof</span><span className="screen-chip">Cute fit</span><span className="screen-chip">Seattle</span></div><div className="screen-feedback">🎯 Match locked!</div></article>
            <article className={`showcase-phone phone-lilac ${activeShowcase === 2 ? 'is-active' : ''}`}><div className="phone-bar"><span>9:41</span><span>● ●</span></div><div className="phone-progress"><i style={{ width: '100%' }} /></div><p className="screen-kicker">OUTREACH · 03</p><div className="message-bubble"><p className="screen-note">SUBJECT</p><p className="mt-1 font-bold">A rainy-day collab idea ☔</p></div><div className="mt-3 rounded-[18px] bg-white p-4 text-xs leading-5 text-[#27322d]/70">Your Seattle rain moment got us. This jacket feels genuinely aligned with your audience…</div><button type="button" onClick={() => document.querySelector('#results')?.scrollIntoView({ behavior: 'smooth' })} className="mini-send">Review message <Send className="size-3.5" /></button><div className="screen-feedback">💬 Ready to send!</div></article>
          </div><div className="showcase-dots">{['Creator scan','Product match','Outreach ready'].map((label, index) => <button type="button" key={label} onClick={() => setActiveShowcase(index)} aria-label={`Show ${label}`} aria-pressed={activeShowcase === index} className={activeShowcase === index ? 'is-active' : ''}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}</div></div>
        </div>
        <div className="process-rail"><a href="#generator"><span>01</span><strong>Understand</strong><small>Recent creator signals</small></a><i>→</i><a href="#product-match"><span>02</span><strong>Match</strong><small>Best product first</small></a><i>→</i><a href="#results"><span>03</span><strong>Write + send</strong><small>Editable HTML email</small></a></div>
      </section>

      <section id="generator" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-10 lg:px-10">
        <div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">01 / CREATOR CONTENT</p><h2 className="section-title">Understand the creator</h2></div><div className="hidden items-center gap-2 text-xs text-white/40 sm:flex"><FileText className="size-4" /> {filledVideos}/3 transcripts ready</div></div>
        <div>
          <article className="light-card p-5 sm:p-7">
            <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><img src="https://images.unsplash.com/photo-1740855597684-719a84c8f2d3?w=200&h=200&fit=crop&auto=format" alt="Creator avatar" className="size-12 rounded-full object-cover" /><div><p className="field-label">Creator</p><p className="font-bold">@{cleanHandle(username)}</p></div></div><Badge className="rounded-full bg-[#e9f7eb] text-[#25733a]">Ready</Badge></div>
            <div className="grid gap-4 sm:grid-cols-[.8fr_1.2fr]"><label className="field-label">Username<Input value={username} onChange={(e) => setUsername(e.target.value)} className="light-input mt-2" /></label><label className="field-label">Short bio<Input value={bio} onChange={(e) => setBio(e.target.value)} className="light-input mt-2" /></label></div>
            <div className="mt-6 rounded-[18px] bg-black p-4 text-white"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><Video className="size-4 text-[#ff5400]" /> Auto-collect from YouTube</div><div className="flex flex-col gap-2 sm:flex-row"><Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Channel name or @handle" className="h-10 flex-1 border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:border-[#ff5400] focus-visible:ring-0" /><Button onClick={collectYouTube} disabled={collecting || !channelName.trim()} className="h-10 rounded-full bg-[#ff5400] px-5 font-bold text-black hover:bg-[#ff6a1a]">{collecting ? <RefreshCw className="animate-spin" /> : <Video />} Last 7 days</Button></div>{collectionMessage && <p className="mt-3 text-xs leading-5 text-white/55">{collectionMessage}</p>}</div>
            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-4">{creatorImages.map((image, index) => <button key={image} onClick={() => setActiveVideo(index)} className={`group relative aspect-[9/11] overflow-hidden rounded-[18px] text-left transition ${activeVideo === index ? 'ring-3 ring-[#ff5400]' : 'ring-1 ring-black/8 hover:-translate-y-1'}`}><img src={image} alt={`Video ${index + 1}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white sm:left-3 sm:top-3">VIDEO {index + 1}</span><span className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2.5 text-[11px] font-semibold text-white">Transcript</span></button>)}</div>
            <div className="mt-4 rounded-[18px] bg-[#f1f0ed] p-4"><div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[.1em] text-black/40"><span>Video {activeVideo + 1} transcript</span><span>{transcripts[activeVideo].length} chars</span></div><Textarea aria-label={`Video ${activeVideo + 1} transcript`} value={transcripts[activeVideo]} onChange={(e) => setTranscripts(transcripts.map((item, index) => index === activeVideo ? e.target.value : item))} className="min-h-[108px] resize-none border-0 bg-transparent p-0 text-[15px] leading-6 text-black shadow-none focus-visible:ring-0" /><div className="mt-3 flex items-center gap-2 border-t border-black/8 pt-3 text-[11px] text-black/40"><Upload className="size-3.5" /> Paste transcript or drop a .txt file</div></div>
          </article>
        </div>

        <div id="product-match" className="mt-12 scroll-mt-24">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">02 / PRODUCT MATCH</p><h2 className="section-title">Find the strongest fit</h2></div><div className="flex items-center gap-3"><span className="text-xs text-white/40">{productLibrary.length} products in library</span><a href="/products" className="text-sm font-bold text-[#ff5400] hover:text-[#ff6a1a]">Manage products →</a></div></div>
          <article className="rounded-[28px] bg-[#1a1a1a] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#ff5400] text-black"><PackageSearch className="size-5" /></span><div><h3 className="text-xl font-black">Match creator signals to your catalog</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">Recent scripts and bio are compared with every product’s description and selling points. The strongest match is selected automatically, and you can switch to another candidate before writing.</p></div></div><Button onClick={matchProducts} disabled={matchingProducts || filledVideos === 0 || productLibrary.length === 0} className="h-12 shrink-0 rounded-full bg-white px-6 font-black text-black hover:bg-white/85">{matchingProducts ? <><RefreshCw className="animate-spin" /> Matching catalog…</> : <><PackageSearch /> {productMatches.length ? 'Re-match products' : 'Match products'}</>}</Button></div>
            {!productLibrary.length ? <div className="mt-6 rounded-[18px] border border-dashed border-white/15 p-6 text-center text-sm text-white/45">Your product library is empty. <a href="/products" className="font-bold text-[#ff5400]">Add products first</a>.</div> : !productMatches.length ? <div className="mt-6 grid min-h-[150px] place-items-center rounded-[18px] border border-dashed border-white/12 text-center"><div><p className="font-bold">No match has been run yet.</p><p className="mt-1 text-sm text-white/40">Add the creator’s scripts, then compare all {productLibrary.length} products.</p></div></div> : <div className="mt-7"><div className="grid gap-4 lg:grid-cols-3">{productMatches.slice(0, 3).map((match, index) => { const selected = selectedProductId === match.product.id; return <button key={match.product.id} onClick={() => chooseProduct(match)} className={`relative rounded-[22px] p-5 text-left transition ${selected ? 'bg-[#ff5400] text-black ring-2 ring-[#ff5400]' : 'bg-white/[.06] text-white ring-1 ring-white/10 hover:bg-white/10'}`}><div className="flex items-start justify-between gap-3"><div>{index === 0 && <Badge className="mb-3 rounded-full bg-black text-white">BEST MATCH</Badge>}<h4 className="text-xl font-black tracking-[-.03em]">{match.product.name}</h4></div><span className={`grid size-14 shrink-0 place-items-center rounded-full text-lg font-black ${selected ? 'bg-black text-white' : 'bg-white text-black'}`}>{match.score}%</span></div><p className={`mt-3 text-sm leading-6 ${selected ? 'text-black/65' : 'text-white/50'}`}>{match.reason}</p><div className="mt-4 flex flex-wrap gap-2">{match.matchedFeatures.map((feature) => <Badge key={feature} className={`rounded-full ${selected ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>{feature}</Badge>)}</div><div className={`mt-5 flex items-center justify-between border-t pt-4 text-xs font-bold ${selected ? 'border-black/15' : 'border-white/10 text-white/45'}`}><span>{match.product.commission} · {match.product.freeSample ? 'Free sample' : 'No sample'}</span><span>{selected ? 'SELECTED ✓' : 'SELECT'}</span></div></button>; })}</div>{!matchesFresh && <p className="mt-4 text-sm font-semibold text-[#ffb18c]">Creator content or product library changed. Re-run matching before generating outreach.</p>}</div>}
          </article>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-[24px] bg-[#1a1a1a] p-5 sm:flex-row sm:px-7"><div className="flex items-center gap-3 text-sm text-white/55"><span className="grid size-10 place-items-center rounded-full bg-white/8"><ShieldCheck className="size-4 text-[#ff5400]" /></span><span><strong className="block text-white">{selectedMatch && matchesFresh ? `${product} selected at ${selectedMatch.score}% match.` : 'Match a product before writing.'}</strong>{selectedMatch && matchesFresh ? selectedMatch.reason : 'The outreach will use only the selected product and traceable creator evidence.'}</span></div><Button onClick={() => generate()} disabled={generating || !username.trim() || !matchesFresh || !selectedMatch} className="h-14 w-full rounded-full bg-[#ff5400] px-8 text-base font-black text-black hover:bg-[#ff6a1a] sm:w-auto">{generating ? <><RefreshCw className="size-4 animate-spin" /> Writing outreach…</> : <><WandSparkles className="size-5" /> Generate with {selectedMatch && matchesFresh ? product : 'matched product'}</>}</Button></div>
      </section>

      <section id="results" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 pt-12 lg:px-10">
        <div className="mb-5"><p className="eyebrow">03 / OUTREACH</p><h2 className="section-title">Personalized outreach</h2></div>
        {!result ? <div className="grid min-h-[330px] place-items-center rounded-[28px] border border-dashed border-white/15 bg-white/[.025] text-center"><div className="max-w-sm px-6"><span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-white/7"><Sparkles className="size-5 text-[#ff5400]" /></span><h3 className="text-xl font-bold">Match a product, then write.</h3><p className="mt-2 text-sm leading-6 text-white/40">The selected product, evidence-backed angle, DM and email will appear here.</p></div></div> : <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <article className="mb-5 grid overflow-hidden rounded-[28px] bg-white text-black lg:grid-cols-[1fr_80px_1fr_170px]"><div className="flex gap-4 p-5 sm:p-7"><img src={creatorImages[0]} alt="Creator context" className="h-28 w-24 rounded-[16px] object-cover" /><div><p className="field-label">Creator evidence · {result.source}</p><p className="mt-3 text-[17px] font-bold leading-6">“{result.evidence}”</p></div></div><div className="grid place-items-center bg-[#f2f0eb]"><ArrowRight className="size-5 rotate-90 text-black/35 lg:rotate-0" /></div><div className="flex gap-4 p-5 sm:p-7"><img src={productImage} alt="Product" className="h-28 w-24 rounded-[16px] object-cover" /><div><p className="field-label">Selected product</p><p className="mt-3 font-black">{product}</p><div className="mt-3 flex flex-wrap gap-1.5">{features.slice(0, 3).map((feature) => <Badge key={feature} className="rounded-full bg-[#eceae5] text-black">{feature}</Badge>)}</div><p className="mt-3 text-xs leading-5 text-black/45">{result.reason}</p></div></div><div className="grid place-items-center bg-[#ff5400] p-6 text-center"><div><div className="text-5xl font-black tracking-[-.06em]">{selectedMatch?.score || result.score * 10}<span className="text-2xl">%</span></div><p className="mt-2 text-xs font-bold uppercase tracking-[.14em]">Product match</p></div></div></article>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <article className="light-card p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><MessageCircle className="size-4" /><h3 className="font-black">TikTok / IG DM</h3></div><Button onClick={() => copyText('dm', result.dm)} variant="outline" className="h-9 rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white">{copied === 'dm' ? <Check /> : <Copy />} {copied === 'dm' ? 'Copied' : 'Copy'}</Button></div><Textarea value={result.dm} onChange={(e) => setResult({ ...result, dm: e.target.value })} className="min-h-[180px] resize-none rounded-[18px] border-0 bg-[#f1f0ed] p-5 text-base leading-7 text-black focus-visible:ring-2 focus-visible:ring-[#ff5400]" /><div className="mt-4 flex flex-wrap gap-2">{[['Shorter','shorter'],['More casual','casual'],['Less salesy','soft']].map(([label,tone]) => <Button key={tone} onClick={() => generate(tone as 'shorter' | 'casual' | 'soft')} variant="outline" className="rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white">{label}</Button>)}<Button onClick={() => generate()} variant="ghost" className="ml-auto rounded-full text-black/50 hover:bg-black/5 hover:text-black"><RefreshCw /> Regenerate</Button></div></article>
            <article className="rounded-[28px] bg-[#ff5400] p-5 text-black sm:p-7"><div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="size-4" /><h3 className="font-black">Best hook</h3></div><Badge className="rounded-full bg-black text-white">LOW RISK</Badge></div><p className="text-[clamp(30px,4vw,48px)] font-black leading-[1.02] tracking-[-.05em]">“{result.hook}”</p><div className="mt-8 flex items-center justify-between border-t border-black/15 pt-4 text-xs font-bold"><span>Source verified</span><span className="flex items-center gap-1"><Clipboard className="size-3.5" /> {result.source}</span></div></article>
            <article className="light-card p-5 sm:p-7 xl:col-span-2"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><Mail className="size-4" /><h3 className="font-black">Email</h3></div><Button onClick={() => copyText('email', `${result.subject}\n\n${result.email}`)} variant="outline" className="h-9 rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white">{copied === 'email' ? <Check /> : <Copy />} {copied === 'email' ? 'Copied' : 'Copy all'}</Button></div><label className="mb-4 block rounded-[18px] bg-[#f1f0ed] p-5"><span className="field-label">Email subject · editable</span><Input value={result.subject} maxLength={200} onChange={(e) => setResult({ ...result, subject: e.target.value })} placeholder="Write a custom email subject" className="mt-3 h-11 border-black/10 bg-white px-3 text-base font-bold text-black shadow-none focus-visible:border-[#ff5400] focus-visible:ring-2 focus-visible:ring-[#ff5400]/20" /><span className="mt-2 block text-xs text-black/40">This exact subject will be UTF-8 encoded before Gmail sends it.</span></label><div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr]"><div className="rounded-[18px] bg-[#f1f0ed] p-5"><p className="field-label">Creator tone</p><div className="mt-3 flex flex-wrap gap-2">{result.persona.map((item) => <Badge key={item} className="rounded-full bg-white text-black">{item}</Badge>)}</div></div><Textarea value={result.email} onChange={(e) => setResult({ ...result, email: e.target.value })} className="min-h-[260px] resize-none rounded-[18px] border-0 bg-[#f1f0ed] p-5 text-[15px] leading-7 text-black focus-visible:ring-2 focus-visible:ring-[#ff5400]" /></div>
              <div className="mt-5 rounded-[18px] bg-black p-5 text-white"><div className="grid gap-5 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><Send className="size-4 text-[#ff5400]" /><p className="font-bold">HTML email delivery</p><Badge className={`rounded-full ${gmailStatus.connected ? 'bg-[#dff6e4] text-[#216c34]' : 'bg-white/10 text-white/55'}`}>{gmailStatus.connected ? 'GMAIL CONNECTED' : gmailStatus.configured ? 'READY TO CONNECT' : 'SETUP REQUIRED'}</Badge></div><Input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="creator@email.com" className="mt-4 h-10 max-w-md border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:border-[#ff5400] focus-visible:ring-0" />{sendMessage && <p className="mt-2 text-xs text-white/55">{sendMessage}</p>}</div><div className="flex flex-wrap items-end gap-2"><Button onClick={() => setShowHtml(!showHtml)} variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black"><Code2 /> {showHtml ? 'Hide preview' : 'Preview HTML'}</Button>{!gmailStatus.connected ? <Button onClick={connectGmail} className="rounded-full bg-white px-4 font-bold text-black hover:bg-white/85">Connect Gmail</Button> : <Button onClick={sendEmail} disabled={sending || !emailRecipient.trim() || !result.subject.trim()} className="rounded-full bg-[#ff5400] px-5 font-bold text-black hover:bg-[#ff6a1a]">{sending ? <RefreshCw className="animate-spin" /> : <Send />} Send HTML</Button>}</div></div>
                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="mb-4 flex items-center gap-2"><ImageIcon className="size-4 text-[#ff5400]" /><p className="text-xs font-bold uppercase tracking-[.12em] text-white/45">Email content blocks</p></div>
                  <div className="mb-4 flex w-fit rounded-full bg-white/8 p-1" role="group" aria-label="Email template mode"><button type="button" onClick={() => setEmailEditorMode('visual')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${emailEditorMode === 'visual' ? 'bg-white text-black' : 'text-white/55 hover:text-white'}`}>Visual builder</button><button type="button" onClick={() => { setEmailEditorMode('code'); setShowHtml(true); }} className={`rounded-full px-4 py-2 text-sm font-bold transition ${emailEditorMode === 'code' ? 'bg-[#ff5400] text-black' : 'text-white/55 hover:text-white'}`}><Code2 className="mr-1.5 inline size-4" />Code editor</button></div>
                  <div className="mb-4 grid gap-3 rounded-[16px] bg-white/7 p-4 md:grid-cols-[1fr_auto] md:items-center"><div className="flex items-center gap-3">{emailImageFile ? <img src={emailImageFile.dataUrl} alt={emailImageAlt} className="size-16 rounded-[12px] object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-[12px] border border-dashed border-white/20 text-white/35"><ImageIcon className="size-5" /></span>}<div><p className="text-sm font-bold">{emailImageFile ? emailImageFile.filename : 'Upload an inline email image'}</p><p className="mt-1 text-xs leading-5 text-white/40">PNG, JPG, GIF or WebP · max 3 MB. The image is attached inside the email, not linked externally.</p></div></div><div className="flex gap-2"><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-black hover:bg-white/85"><Upload className="size-4" /> {emailImageFile ? 'Replace' : 'Upload'}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={(event) => { uploadEmailImage(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>{emailImageFile && <Button type="button" onClick={() => setEmailImageFile(null)} variant="outline" className="h-9 rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black">Remove</Button>}</div></div>
                  {emailImageError && <p className="mb-4 text-xs font-semibold text-[#ffb18c]">{emailImageError}</p>}
                  <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold text-white/55">Or use a public image URL<Input value={emailImageUrl} onChange={(e) => { setEmailImageUrl(e.target.value); if (e.target.value) { setEmailImageFile(null); setShowHtml(true); } }} placeholder="https://…/product.jpg" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label><label className="text-xs font-semibold text-white/55">Image description<Input value={emailImageAlt} onChange={(e) => setEmailImageAlt(e.target.value)} placeholder="Product image" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label>{emailEditorMode === 'visual' && <><label className="text-xs font-semibold text-white/55">Image position<Select value={emailImagePosition} onValueChange={(value) => value && setEmailImagePosition(value as 'top' | 'after-intro' | 'bottom')}><SelectTrigger className="mt-2 h-10 w-full border-white/15 bg-white/8 text-white"><SelectValue /></SelectTrigger><SelectContent className="border border-white/15 bg-[#171717] text-white shadow-2xl"><SelectItem className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black" value="top">Top of email</SelectItem><SelectItem className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black" value="after-intro">After opening paragraph</SelectItem><SelectItem className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black" value="bottom">After message</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-white/55">Image width<Select value={emailImageWidth} onValueChange={(value) => value && setEmailImageWidth(value as 'full' | 'medium')}><SelectTrigger className="mt-2 h-10 w-full border-white/15 bg-white/8 text-white"><SelectValue /></SelectTrigger><SelectContent className="border border-white/15 bg-[#171717] text-white shadow-2xl"><SelectItem className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black" value="full">Full width</SelectItem><SelectItem className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black" value="medium">Medium, centered</SelectItem></SelectContent></Select></label></>}<label className="text-xs font-semibold text-white/55"><span className="flex items-center gap-1.5"><Link2 className="size-3.5" /> Button text</span><Input value={ctaText} onChange={(e) => { setCtaText(e.target.value); setShowHtml(true); }} placeholder="View collaboration details" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /></label><label className="text-xs font-semibold text-white/55">Button link<Input value={ctaUrl} onChange={(e) => { setCtaUrl(e.target.value); setShowHtml(true); }} placeholder="brand.com/collab" className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0" /><span className="mt-1.5 block text-[11px] leading-4 text-white/35">Links without https:// are completed automatically. With no link, the button is still shown as a visual CTA.</span></label></div>
                  {emailEditorMode === 'code' && <div className="mt-5 rounded-[18px] border border-white/12 bg-[#101010] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="font-bold">Custom HTML + CSS</p><p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">Move placeholders anywhere in the HTML. Inline styles and the CSS panel are supported; unsafe scripts, forms and event handlers are removed before preview and sending.</p></div><div className="flex shrink-0 gap-2"><Button type="button" onClick={resetCustomTemplate} variant="outline" className="h-9 rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black">Restore starter</Button><Button type="button" onClick={saveCustomTemplate} className="h-9 rounded-full bg-white px-4 font-bold text-black hover:bg-white/85">Save locally</Button></div></div>{templateMessage && <p className="mt-3 text-xs font-semibold text-[#ff9a68]">{templateMessage}</p>}<div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-white/40">Insert placeholder</p><div className="flex flex-wrap gap-2">{emailPlaceholders.map((placeholder) => <button type="button" key={placeholder} onClick={() => setCustomEmailHtml((value) => `${value}\n${placeholder}`)} className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1.5 font-mono text-[11px] text-white/65 transition hover:border-[#ff5400] hover:text-white">{placeholder}</button>)}</div></div><div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><label className="text-xs font-semibold text-white/55">HTML body<Textarea spellCheck={false} value={customEmailHtml} onChange={(event) => { setCustomEmailHtml(event.target.value); setShowHtml(true); }} className="mt-2 min-h-[360px] resize-y border-white/15 bg-[#080808] p-4 font-mono text-[12px] leading-5 text-[#f7f4ef] focus-visible:border-[#ff5400] focus-visible:ring-0" /></label><label className="text-xs font-semibold text-white/55">CSS styles<Textarea spellCheck={false} value={customEmailCss} onChange={(event) => { setCustomEmailCss(event.target.value); setShowHtml(true); }} className="mt-2 min-h-[360px] resize-y border-white/15 bg-[#080808] p-4 font-mono text-[12px] leading-5 text-[#ffb28c] focus-visible:border-[#ff5400] focus-visible:ring-0" /></label></div><p className="mt-3 text-xs leading-5 text-white/35">For the broadest Gmail and Outlook compatibility, use tables for layout and inline style attributes for critical formatting. JavaScript is not supported in email.</p></div>}
                  <label className="mt-4 flex items-center justify-between rounded-[14px] bg-white/7 px-4 py-3 text-sm font-semibold"><span>Include matched product + commission block</span><Switch checked={includeOffer} onCheckedChange={setIncludeOffer} className="data-checked:bg-[#ff5400]" /></label><p className="mt-3 text-xs leading-5 text-white/35">The preview below and the delivered HTML are generated from the same content. Uploaded images are embedded as inline attachments for reliable Gmail display.</p>
                </div>
              </div>
              {showHtml && <div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-black/40">Final HTML preview</p><p className="text-xs text-black/40">{emailEditorMode === 'code' ? 'Custom code · sanitized' : 'Visual builder'} · matches the sent email</p></div><div className="mb-3 rounded-[14px] border border-black/10 bg-[#f1f0ed] px-4 py-3 text-sm text-black"><span className="mr-2 text-xs font-bold uppercase tracking-[.1em] text-black/40">Subject</span><span className="font-semibold">{result.subject || 'Add a subject before sending'}</span></div><iframe title="HTML email preview" sandbox="" srcDoc={emailHtml.preview} className="h-[620px] w-full rounded-[18px] border border-black/10 bg-white" /></div>}
            </article>
          </div>
        </div>}
      </section>
      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/30">Creator Outreach · Local-first MVP · Built for US TikTok Shop BD</footer>
    </main>
  );
}
