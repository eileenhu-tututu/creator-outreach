export type EmailTemplateValues = {
  subject: string;
  creatorName: string;
  creatorHandle: string;
  emailBody: string;
  productName: string;
  productDescription: string;
  productFeatures: string[];
  commission: string;
  imageSource: string;
  imageAlt: string;
  ctaText: string;
  ctaUrl: string;
  includeOffer: boolean;
};

export const emailPlaceholders = [
  '{{CREATOR_NAME}}',
  '{{CREATOR_HANDLE}}',
  '{{SUBJECT}}',
  '{{EMAIL_BODY}}',
  '{{PRODUCT_NAME}}',
  '{{PRODUCT_DESCRIPTION}}',
  '{{PRODUCT_FEATURES}}',
  '{{PRODUCT_FEATURES_LIST}}',
  '{{COMMISSION}}',
  '{{PRODUCT_IMAGE}}',
  '{{OFFER_BLOCK}}',
  '{{CTA_TEXT}}',
  '{{CTA_URL}}',
  '{{CTA_BUTTON}}',
] as const;

export const starterEmailHtml = `<table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <table role="presentation" class="email-card" width="620" cellpadding="0" cellspacing="0">
        <tr>
          <td class="email-content">
            <div class="brand">Creator Outreach <span>●</span></div>
            {{PRODUCT_IMAGE}}
            <div class="eyebrow">Creator collaboration</div>
            <h1>Hi {{CREATOR_NAME}}</h1>
            <div class="message">{{EMAIL_BODY}}</div>
            {{OFFER_BLOCK}}
            {{CTA_BUTTON}}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

export const starterEmailCss = `body { margin: 0; background: #f4f2ed; font-family: Arial, sans-serif; }
.email-shell { width: 100%; background: #f4f2ed; padding: 32px 16px; }
.email-card { width: 100%; max-width: 620px; background: #ffffff; border-radius: 24px; }
.email-content { padding: 36px; color: #202020; }
.brand { margin-bottom: 28px; font-size: 20px; font-weight: 800; }
.brand span, .eyebrow { color: #ff5400; }
.eyebrow { margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0 0 20px; font-size: 30px; line-height: 1.15; }
.message p { margin: 0 0 18px; color: #202020; font-size: 16px; line-height: 1.65; }
.product-image { display: block; width: 100%; height: auto; margin: 0 0 26px; border: 0; border-radius: 16px; }
.offer { margin-top: 26px; padding: 18px 20px; background: #ff5400; border-radius: 14px; color: #111111; font-weight: 700; }
.feature { display: inline-block; margin: 8px 6px 0 0; padding: 6px 10px; background: rgba(0,0,0,.1); border-radius: 999px; font-size: 12px; }
.cta { display: inline-block; margin-top: 24px; padding: 13px 20px; background: #111111; border-radius: 999px; color: #ffffff !important; font-weight: 700; text-decoration: none; }`;

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function sanitizeEmailCss(value: string) {
  return value
    .replace(/@import[\s\S]*?;/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\s*\(\s*(['"]?)\s*javascript:[\s\S]*?\1\s*\)/gi, 'none')
    .replace(/<\/?style[^>]*>/gi, '');
}

export function sanitizeEmailHtml(value: string) {
  return value
    .replace(/<\/?(?:script|iframe|object|embed|form|input|textarea|select|button|base|meta|link)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript|data:text\/html)[\s\S]*?\2/gi, ' $1="#"')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => `<style>${sanitizeEmailCss(css)}</style>`)
    .replace(/\s+style\s*=\s*"([^"]*)"/gi, (_match, css: string) => ` style="${sanitizeEmailCss(css).replace(/"/g, '&quot;')}"`);
}

export function renderEmailTemplate(template: string, css: string, values: EmailTemplateValues) {
  const paragraphs = values.emailBody.split('\n\n').map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  const image = values.imageSource ? `<img class="product-image" src="${values.imageSource}" alt="${escapeHtml(values.imageAlt)}" width="548">` : '';
  const features = values.productFeatures.map((feature) => `<span class="feature">${escapeHtml(feature)}</span>`).join('');
  const offer = values.includeOffer ? `<div class="offer"><div>${escapeHtml(values.productName)} · ${escapeHtml(values.commission || 'Creator collaboration')}</div>${features}</div>` : '';
  const buttonLabel = escapeHtml(values.ctaText.trim());
  const button = buttonLabel ? values.ctaUrl ? `<a class="cta" href="${values.ctaUrl}" target="_blank">${buttonLabel}</a>` : `<span class="cta">${buttonLabel}</span>` : '';
  const replacements: Record<string, string> = {
    CREATOR_NAME: escapeHtml(values.creatorName),
    CREATOR_HANDLE: escapeHtml(values.creatorHandle),
    SUBJECT: escapeHtml(values.subject),
    EMAIL_BODY: paragraphs,
    PRODUCT_NAME: escapeHtml(values.productName),
    PRODUCT_DESCRIPTION: escapeHtml(values.productDescription),
    PRODUCT_FEATURES: escapeHtml(values.productFeatures.join(', ')),
    PRODUCT_FEATURES_LIST: features,
    COMMISSION: escapeHtml(values.commission),
    PRODUCT_IMAGE: image,
    OFFER_BLOCK: offer,
    CTA_TEXT: buttonLabel,
    CTA_URL: values.ctaUrl,
    CTA_BUTTON: button,
  };
  const body = sanitizeEmailHtml(template).replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) => key in replacements ? replacements[key] : match);
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><style>${sanitizeEmailCss(css)}</style></head><body>${body}</body></html>`;
}
