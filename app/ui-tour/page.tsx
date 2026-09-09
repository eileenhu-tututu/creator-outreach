'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Mail, PackageCheck, Play, ScanSearch, Sparkles, WandSparkles } from 'lucide-react';
import { BrandNav } from '@/components/brand-nav';

const creatorImage = 'https://images.unsplash.com/photo-1645848810652-44c3f68606e3?w=720&h=900&fit=crop&auto=format';
const senderImage = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=320&h=320&fit=crop&auto=format';
const productImage = 'https://images.unsplash.com/photo-1576188973526-0e5d7047b0cf?w=800&h=600&fit=crop&auto=format';

const steps = [
  {
    eyebrow: '01 · CREATOR',
    title: 'Meet the creator',
    body: 'Enter a channel once. The app gathers the creator’s public videos from the last seven days.',
    note: '7-day window · lower test usage',
  },
  {
    eyebrow: '02 · SIGNALS',
    title: 'Read what they say',
    body: 'Transcripts become traceable interests, content patterns and phrases worth referencing.',
    note: 'Source-backed · no generic flattery',
  },
  {
    eyebrow: '03 · PRODUCT',
    title: 'Find the fit',
    body: 'Every product is scored against the creator’s recent content before a message is written.',
    note: '94% fit · 3 matched signals',
  },
  {
    eyebrow: '04 · OUTREACH',
    title: 'Send it human',
    body: 'Review the subject, copy, images, CTA and custom HTML, then send through your connected Gmail.',
    note: 'Editable preview · human approval',
  },
] as const;

export default function UiTourPage() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const timer = window.setInterval(() => setActiveStep((current) => (current + 1) % steps.length), 2800);
    return () => window.clearInterval(timer);
  }, []);

  const selectStep = (index: number) => setActiveStep(index);
  const openGenerator = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign('/#generator');
  };

  return (
    <main className="app-shell min-h-screen text-foreground">
      <BrandNav active="tour" />
      <section className="tour-hero mx-auto max-w-[1440px] px-4 pb-8 pt-7 sm:px-5 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="tour-intro">
          <div>
            <p className="eyebrow">INTERACTIVE UI TOUR</p>
            <h1 className="tour-title">Creator to send.</h1>
          </div>
          <div className="tour-intro-copy">
            <p>Four connected moments turn recent creator content into outreach that actually sounds personal.</p>
            <Link href="/#generator" prefetch={false} onClick={openGenerator} className="tour-cta">Try the workflow <ArrowRight className="size-4" /></Link>
          </div>
        </div>

        <div className="tour-stage" aria-label="Interactive creator outreach workflow">
          <div className="tour-connector" aria-hidden="true"><span style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }} /></div>

          <button type="button" onClick={() => selectStep(0)} className={`tour-node tour-node-creator ${activeStep === 0 ? 'is-active' : ''}`} aria-pressed={activeStep === 0}>
            <span className="tour-index">01</span>
            <span className="creator-portrait"><Image unoptimized src={creatorImage} alt="Fashion creator recording a short video" width={720} height={900} /><span className="portrait-play"><Play className="size-4 fill-current" /></span></span>
            <span className="tour-node-copy"><strong>@rainydayrachel</strong><small>3 recent videos found</small></span>
            <span className="reaction reaction-one" aria-hidden="true">👋</span>
          </button>

          <button type="button" onClick={() => selectStep(1)} className={`tour-node tour-node-signal ${activeStep === 1 ? 'is-active' : ''}`} aria-pressed={activeStep === 1}>
            <span className="tour-index">02</span>
            <span className="signal-icon"><ScanSearch className="size-5" /></span>
            <span className="tour-node-copy"><strong>“Seattle rain…”</strong><small>style · commute · weather</small></span>
            <span className="signal-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </button>

          <button type="button" onClick={() => selectStep(2)} className={`tour-node tour-node-product ${activeStep === 2 ? 'is-active' : ''}`} aria-pressed={activeStep === 2}>
            <span className="tour-index">03</span>
            <span className="product-thumb"><Image unoptimized src={productImage} alt="Matched waterproof product" width={800} height={600} /></span>
            <span className="tour-node-copy"><strong>CloudStep Rain Boot</strong><small>waterproof · lightweight</small></span>
            <span className="match-bubble">94%</span>
          </button>

          <button type="button" onClick={() => selectStep(3)} className={`tour-node tour-node-email ${activeStep === 3 ? 'is-active' : ''}`} aria-pressed={activeStep === 3}>
            <span className="tour-index">04</span>
            <span className="mail-preview">
              <span className="mail-head"><Image unoptimized src={senderImage} alt="Outreach sender" width={320} height={320} /><span><b>Mia at Northstar</b><small>to Rachel</small></span><Mail className="ml-auto size-4" /></span>
              <span className="mail-subject">Rainy-day style, made lighter ☔</span>
              <span className="mail-lines"><i /><i /><i /></span>
              <span className="mail-button">See your creator offer</span>
            </span>
            <span className="reaction reaction-two" aria-hidden="true">💌</span>
          </button>
        </div>

        <div className="tour-detail" aria-live="polite">
          <div className="tour-detail-step"><span>{String(activeStep + 1).padStart(2, '0')}</span><i /></div>
          <div><p className="eyebrow">{steps[activeStep].eyebrow}</p><h2>{steps[activeStep].title}</h2></div>
          <p>{steps[activeStep].body}</p>
          <span className="tour-detail-note"><Check className="size-4" /> {steps[activeStep].note}</span>
        </div>
      </section>

      <section className="tour-story mx-auto max-w-[1360px] px-4 pb-20 sm:px-5 lg:px-10">
        <div className="tour-story-heading"><p className="eyebrow">BUILT FOR THE REAL BD LOOP</p><h2 className="section-title">The context stays connected.</h2><p>Nothing important disappears between research, matching and sending.</p></div>
        <div className="tour-story-grid">
          <article className="story-card story-mint"><span><ScanSearch /></span><p className="story-number">01 / SIGNAL</p><h3>Know why you are reaching out.</h3><p>Recent videos, transcript excerpts and creator themes remain visible while you write.</p><small>“Rain-proof outfits for busy commutes”</small></article>
          <article className="story-card story-coral"><span><PackageCheck /></span><p className="story-number">02 / MATCH</p><h3>Choose product before copy.</h3><p>The best-fit item rises to the top with a score and an explainable reason.</p><div className="story-score"><b>94</b><span>% match</span></div></article>
          <article className="story-card story-lilac"><span><WandSparkles /></span><p className="story-number">03 / MESSAGE</p><h3>Make every send your own.</h3><p>Edit the subject, text, image placement, CTA, HTML and CSS before Gmail sends.</p><div className="story-reactions"><i>✨</i><i>👍</i><i>💬</i></div></article>
        </div>
        <div className="tour-closing"><div><Sparkles className="size-5" /><strong>Ready when the context is.</strong><span>Collect → match → personalize → review → send.</span></div><Link href="/#generator" prefetch={false} onClick={openGenerator}>Open Generator <ArrowRight className="size-4" /></Link></div>
      </section>
    </main>
  );
}
