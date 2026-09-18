export type ConversationAngle = {
  id: string;
  title: string;
  dmLead: string;
  summary: string;
  whyItWorks: string;
  sourceCount: number;
};

type AngleDefinition = Omit<ConversationAngle, 'sourceCount'> & {
  pattern: RegExp;
};

const definitions: AngleDefinition[] = [
  {
    id: 'beauty-process',
    title: 'Their beauty process',
    dmLead: 'the thoughtful, step-by-step way you break down beauty looks',
    summary:
      'Acknowledge how clearly they turn a beauty look into something followers can actually recreate.',
    whyItWorks:
      'Shows attention to their teaching style without copying a caption or naming a random detail.',
    pattern:
      /makeup|beauty|skincare|concealer|foundation|mascara|blush|brow|lip|spf|routine/i,
  },
  {
    id: 'personal-style',
    title: 'Their personal style',
    dmLead: 'how you make everyday outfits feel personal and actually wearable',
    summary:
      'Connect through their consistent styling point of view rather than complimenting one isolated outfit.',
    whyItWorks:
      'Feels creator-specific while leaving room to introduce a product naturally.',
    pattern:
      /outfit|fashion|style|fit check|wear|jacket|dress|wardrobe|colorway/i,
  },
  {
    id: 'real-life-problem',
    title: 'A real-life problem they share',
    dmLead:
      'how honestly you share the little problems behind everyday content',
    summary:
      'Start from a recurring frustration or practical need they discuss, then bridge to a useful solution.',
    whyItWorks:
      'Creates relevance without repeating their exact wording back to them.',
    pattern:
      /problem|struggle|hard to|trying to find|does this exist|destroyed|frustrat|annoy|need|wish/i,
  },
  {
    id: 'weather-routine',
    title: 'How they adapt to the weather',
    dmLead:
      'the way you keep your style and routines going even when the weather does not cooperate',
    summary:
      'Recognize the creator’s practical approach to weather, comfort, and everyday plans.',
    whyItWorks:
      'Turns a repeated lifestyle context into a natural product conversation.',
    pattern:
      /rain|weather|winter|summer|cold|hot|waterproof|wind|seattle|season/i,
  },
  {
    id: 'honest-recommendations',
    title: 'Their honest product opinions',
    dmLead:
      'the straightforward way you test products and explain what is actually worth using',
    summary:
      'Recognize their credibility and useful product judgment instead of giving a generic compliment.',
    whyItWorks:
      'Frames the outreach around audience trust and creative independence.',
    pattern:
      /review|recommend|favorite|tested|trying|worth|product|haul|unboxing|first impression/i,
  },
  {
    id: 'everyday-routine',
    title: 'Their everyday routine',
    dmLead: 'how naturally you bring followers into your everyday routines',
    summary:
      'Talk about the familiar, repeatable moments that make their content feel relatable.',
    whyItWorks:
      'Keeps the opening warm and personal without pretending to know them privately.',
    pattern:
      /routine|every day|daily|morning|night|coffee|home|week|pov|day in/i,
  },
  {
    id: 'teaching-style',
    title: 'How clearly they teach',
    dmLead:
      'how clearly you turn your process into something people can follow',
    summary:
      'Appreciate their ability to explain a process, technique, or transformation clearly.',
    whyItWorks:
      'Compliments a real creator strength rather than using exaggerated praise.',
    pattern:
      /tutorial|step \d|how to|guide|tips|process|before|after|finished look/i,
  },
  {
    id: 'community-energy',
    title: 'Their relationship with followers',
    dmLead:
      'how you invite your audience into the conversation instead of just posting at them',
    summary:
      'Recognize the creator’s conversational tone and the way they involve followers in what comes next.',
    whyItWorks:
      'Makes the DM feel like a continuation of their community style.',
    pattern:
      /let me know|what do you think|comment|follow|you guys|audience|community|more like this/i,
  },
];

export function buildConversationAngles(
  transcripts: string[],
  bio = '',
): ConversationAngle[] {
  const scripts = transcripts.map((item) => item.trim()).filter(Boolean);
  const ranked = definitions
    .map((definition) => ({
      ...definition,
      sourceCount: scripts.filter((script) => definition.pattern.test(script))
        .length,
      bioHit: definition.pattern.test(bio) ? 1 : 0,
    }))
    .filter((angle) => angle.sourceCount > 0 || angle.bioHit > 0)
    .sort(
      (left, right) =>
        right.sourceCount + right.bioHit - (left.sourceCount + left.bioHit),
    )
    .slice(0, 4)
    .map(({ pattern: _pattern, bioHit: _bioHit, ...angle }) => angle);

  if (ranked.length) return ranked;

  return [
    {
      id: 'creator-perspective',
      title: 'Their creator perspective',
      dmLead: 'the personal, practical perspective you bring to your content',
      summary:
        'Start with the creator’s overall point of view and how approachable their content feels.',
      whyItWorks:
        'Provides a safe, natural opener without quoting or inventing a specific moment.',
      sourceCount: scripts.length,
    },
  ];
}
