/* oxlint-disable next/no-html-link-for-pages -- Full document navigation is required for reliable Vinext multi-route hosting. */
import Image from 'next/image';
import { ArrowRight, Check, LayoutGrid, Mail, MousePointerClick, MoveRight, PackageSearch, ScanSearch, Send, Sparkles, Type } from 'lucide-react';
import { BrandNav } from '@/components/brand-nav';

const creatorImage = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=720&h=960&fit=crop&auto=format';
const senderImage = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=360&h=360&fit=crop&auto=format';
const productImage = 'https://images.unsplash.com/photo-1576188973526-0e5d7047b0cf?w=800&h=700&fit=crop&auto=format';

const colors = [
  { name: 'Mint canvas', hex: '#EAF4E8', usage: 'Primary background · calm workspace', className: 'token-mint' },
  { name: 'Coral action', hex: '#FF7768', usage: 'CTA · progress · success moments', className: 'token-coral' },
  { name: 'Lilac context', hex: '#DDD0FF', usage: 'Supporting data · secondary screens', className: 'token-lilac' },
  { name: 'Ink anchor', hex: '#27322D', usage: 'Type · controls · contrast', className: 'token-ink' },
  { name: 'Paper surface', hex: '#FFFEFA', usage: 'Cards · forms · email canvas', className: 'token-paper' },
] as const;

export default function UiGuidePage() {
  return (
    <main className="app-shell min-h-screen text-foreground">
      <BrandNav active="tour" />

      <section className="ds-cover">
        <div className="ds-cover-word" aria-hidden="true">OUTREACH</div>
        <div className="ds-cover-meta"><span>CREATOR OUTREACH</span><span>UI SYSTEM · 2026</span></div>
        <div className="ds-cover-copy"><p>01 · DESIGN LANGUAGE</p><h1>Friendly signals.<br />Serious workflow.</h1><span>A visual system for creator BD that turns research, matching and email into one readable story.</span></div>
        <div className="ds-cover-phones" aria-label="Three core interface previews">
          <div className="ds-phone ds-phone-left"><div className="ds-phone-notch" /><small>CREATOR SIGNALS</small><Image unoptimized src={creatorImage} alt="Creator content screen" width={720} height={960} /><div className="ds-phone-caption"><b>@rainydayrachel</b><span>3 scripts ready</span></div><div className="ds-mini-progress"><i style={{ width: '32%' }} /></div></div>
          <div className="ds-phone ds-phone-center"><div className="ds-phone-notch" /><small>PRODUCT MATCH</small><div className="ds-match-orb">94<span>%</span></div><h3>CloudLayer</h3><p>Best fit across your catalog</p><div className="ds-mini-chips"><span>Waterproof</span><span>Seattle</span></div><div className="ds-mini-progress"><i style={{ width: '66%' }} /></div></div>
          <div className="ds-phone ds-phone-right"><div className="ds-phone-notch" /><small>OUTREACH READY</small><div className="ds-email-mini"><div><Image unoptimized src={senderImage} alt="Email sender" width={360} height={360} /><span><b>Mia</b><small>to Rachel</small></span></div><strong>Rainy-day style ☔</strong><p>Your recent video gave us a specific collaboration idea…</p><button type="button">Review email <ArrowRight /></button></div><div className="ds-mini-progress"><i style={{ width: '100%' }} /></div></div>
        </div>
        <span className="ds-cover-spark spark-a" aria-hidden="true">✦</span><span className="ds-cover-spark spark-b" aria-hidden="true">✦</span>
      </section>

      <section className="ds-summary ds-page-width">
        <div className="ds-section-index"><span>01</span><p>DESIGN DNA</p></div>
        <div className="ds-summary-main"><p className="eyebrow">THE CURRENT SYSTEM, IN ONE SENTENCE</p><h2>Warm enough to invite.<br />Clear enough to act.</h2><p>Creator Outreach pairs approachable pastel surfaces with high-contrast working controls. Mint holds the workflow, coral marks action and progress, lilac separates supporting context, and ink keeps every decision readable.</p></div>
        <div className="ds-principles">
          <article><span>01</span><strong>Evidence first</strong><p>Creator quotes and match reasons stay close to every recommendation.</p></article>
          <article><span>02</span><strong>One bright action</strong><p>Coral identifies the next important move—not every clickable element.</p></article>
          <article><span>03</span><strong>Celebrate progress</strong><p>Motion and emoji feedback confirm completion without blocking work.</p></article>
        </div>
      </section>

      <section className="ds-palette-section">
        <div className="ds-page-width">
          <div className="ds-section-heading"><div><p className="eyebrow">02 · COLOR SYSTEM</p><h2>Five colors.<br />One clear hierarchy.</h2></div><p>Pastels create continuity between discovery and sending. Dark ink is used as an anchor, never as a competing full-page theme.</p></div>
          <div className="ds-color-grid">{colors.map((color, index) => <article key={color.hex} className={color.className}><span className="ds-color-number">0{index + 1}</span><div><strong>{color.name}</strong><code>{color.hex}</code><p>{color.usage}</p></div></article>)}</div>
        </div>
      </section>

      <section className="ds-type-section ds-page-width">
        <div className="ds-type-card"><div className="ds-icon-label"><Type /><span>03 · TYPOGRAPHY</span></div><div className="ds-type-sample"><span>Aa</span><div><h2>Geist</h2><p>One family across headlines, working copy and controls. Weight creates personality; a second novelty font is not needed.</p></div></div><div className="ds-type-scale"><div><span>DISPLAY · 72/68</span><strong>Find the fit.</strong></div><div><span>SECTION · 48/48</span><strong>Personalized outreach</strong></div><div><span>BODY · 16/26</span><p>Readable explanations connect each creator signal to a product decision.</p></div><div><span>NOTE · 12/18</span><small>SECONDARY DETAILS · SOURCE VERIFIED</small></div></div></div>
        <div className="ds-token-card"><div className="ds-icon-label"><LayoutGrid /><span>04 · SHAPE & SPACE</span></div><h2>Soft edges.<br />Strict rhythm.</h2><div className="ds-radius-row"><span className="radius-14">14</span><span className="radius-18">18</span><span className="radius-24">24</span><span className="radius-30">30</span><span className="radius-42">42</span></div><p className="ds-token-note">RADIUS SCALE · 14 / 18 / 24 / 30 / 42 PX</p><div className="ds-space-ruler"><i /><i /><i /><i /><i /></div><p className="ds-token-note">SPACING RHYTHM · 8 / 16 / 24 / 40 / 64 PX</p></div>
      </section>

      <section className="ds-screens-section">
        <div className="ds-page-width">
          <div className="ds-section-heading"><div><p className="eyebrow">05 · CORE SCREENS</p><h2>The full BD story,<br />shown as a screen set.</h2></div><p>Like a product case study, the key views are composed together so their shared hierarchy, progress language and component behavior are easy to compare.</p></div>
          <div className="ds-screen-stage">
            <div className="ds-annotation annotation-one"><span>01</span><p><b>Creator intake</b><br />Image and transcript stay in one card.</p><i /></div>
            <div className="ds-annotation annotation-two"><span>02</span><p><b>Product decision</b><br />Score appears before message copy.</p><i /></div>
            <div className="ds-annotation annotation-three"><span>03</span><p><b>Human review</b><br />Subject, image, CTA and HTML remain editable.</p><i /></div>

            <article className="ds-screen ds-screen-creator"><div className="ds-screen-top"><span>9:41</span><b>● ●</b></div><div className="ds-screen-progress"><i style={{ width: '34%' }} /></div><small>01 / CREATOR CONTENT</small><h3>Understand the creator</h3><div className="ds-profile-row"><Image unoptimized src={creatorImage} alt="Creator profile" width={720} height={960} /><span><b>@rainydayrachel</b><small>Seattle · daily fits</small></span><em>READY</em></div><div className="ds-video-grid"><Image unoptimized src={creatorImage} alt="Creator video" width={720} height={960} /><Image unoptimized src={creatorImage} alt="Creator video" width={720} height={960} /><Image unoptimized src={creatorImage} alt="Creator video" width={720} height={960} /></div><div className="ds-transcript"><small>VIDEO 01 · TRANSCRIPT</small><p>“I need a jacket that is actually waterproof and cute…”</p></div></article>

            <article className="ds-screen ds-screen-match"><div className="ds-screen-top"><span>9:41</span><b>● ●</b></div><div className="ds-screen-progress"><i style={{ width: '68%' }} /></div><small>02 / PRODUCT MATCH</small><h3>Find the strongest fit</h3><div className="ds-product-visual"><Image unoptimized src={productImage} alt="Matched product" width={800} height={700} /><div><b>CloudLayer Jacket</b><span>Waterproof · lightweight</span></div><em>94%</em></div><div className="ds-reason-card"><PackageSearch /><p><b>Why it fits</b><span>Matches rainy weather, outfit styling and daily commute signals.</span></p></div><button type="button">Product selected <Check /></button></article>

            <article className="ds-screen ds-screen-mail"><div className="ds-screen-top"><span>9:41</span><b>● ●</b></div><div className="ds-screen-progress"><i style={{ width: '100%' }} /></div><small>03 / OUTREACH</small><h3>Personalized outreach</h3><div className="ds-mail-card"><div className="ds-mail-from"><Image unoptimized src={senderImage} alt="Mia" width={360} height={360} /><span><b>Mia at Northstar</b><small>To @rainydayrachel</small></span><Mail /></div><span className="ds-mail-label">SUBJECT</span><strong>Rainy-day style, made lighter ☔</strong><p>Your Seattle rain moment felt like the perfect fit for CloudLayer…</p><span className="ds-mail-cta">View creator offer</span></div><button type="button">Send HTML email <Send /></button></article>
          </div>
        </div>
      </section>

      <section className="ds-components ds-page-width">
        <div className="ds-section-heading"><div><p className="eyebrow">06 · COMPONENT LANGUAGE</p><h2>Consistent parts.<br />Flexible messages.</h2></div><p>Controls use the same shape, contrast and feedback grammar across Generator, Products, History and the email builder.</p></div>
        <div className="ds-component-grid">
          <article><div className="ds-icon-label"><MousePointerClick /><span>ACTIONS</span></div><button type="button" className="component-primary">Match products <ArrowRight /></button><button type="button" className="component-secondary">Preview HTML</button><small>48 PX HEIGHT · PILL RADIUS · ONE PRIMARY</small></article>
          <article><div className="ds-icon-label"><ScanSearch /><span>PROGRESS</span></div><div className="component-progress"><i /><i /><i /></div><div className="component-status"><span>🎯</span><p><b>Best match found</b><small>Review ranked products below.</small></p></div><small>CORAL = ACTIVE · MINT = COMPLETE</small></article>
          <article><div className="ds-icon-label"><Sparkles /><span>FEEDBACK</span></div><div className="component-reactions"><span>✨</span><span>🫶</span><span>💌</span></div><p>Celebration appears after meaningful progress, never as permanent decoration.</p><small>1.8 S FEEDBACK · NON-BLOCKING</small></article>
        </div>
      </section>

      <section className="ds-motion-section"><div className="ds-page-width ds-motion-grid"><div><p className="eyebrow">07 · MOTION PRINCIPLES</p><h2>Show the handoff.</h2><p>Animation explains where context is moving: creator signal → product reasoning → human-reviewed email.</p></div><div className="ds-motion-demo"><div className="motion-node">👀<small>SIGNAL</small></div><MoveRight /><div className="motion-node">🎯<small>MATCH</small></div><MoveRight /><div className="motion-node">💌<small>SEND</small></div><span className="motion-tracer" /></div><div className="ds-motion-spec"><p><b>2.4 s</b><span>Story phase</span></p><p><b>500 ms</b><span>Card transition</span></p><p><b>1.8 s</b><span>Celebration</span></p></div></div></section>

      <footer className="ds-guide-footer ds-page-width"><div><Sparkles /><span><b>Creator Outreach UI System</b><small>Mint · coral · lilac · ink · paper</small></span></div><a href="/">Open Generator <ArrowRight /></a></footer>
    </main>
  );
}
