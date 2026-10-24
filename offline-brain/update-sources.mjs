/**
 * PUBLIC, exact-URL allowlist; source titles only, never secret/client data.
 * Unreviewed discoveries DO NOT become trusted factual memories.
 * Some provider feeds may reject automation or change paths; report failures.
 */
export const PUBLIC_FEEDS=Object.freeze([
 {id:"nist-strategy",publisher:"NIST",url:"https://www.nist.gov/news-events/performance%20excellence/rss.xml",publisherDomain:"nist.gov",departments:["Strategy & Reasoning","Operations & Coordination"],maxItems:12},
 {id:"nist-security",publisher:"NIST",url:"https://www.nist.gov/news-events/cybersecurity/rss.xml",publisherDomain:"nist.gov",departments:["Security & Defense","Engineering & Systems"],maxItems:15},
 {id:"arxiv-research",publisher:"arXiv",url:"https://rss.arxiv.org/rss/cs",publisherDomain:"arxiv.org",departments:["Research & Intelligence"],maxItems:12},
 {id:"sec-business",publisher:"SEC",url:"https://www.sec.gov/news/pressreleases.rss",publisherDomain:"sec.gov",departments:["Commerce & Finance","Policy & Diplomacy"],maxItems:12},
 {id:"nist-mission",publisher:"NIST",url:"https://www.nist.gov/news-events/resilience/rss.xml",publisherDomain:"nist.gov",departments:["Command & Missions","Strategy & Reasoning"],maxItems:12},
 {id:"arxiv-language",publisher:"arXiv",url:"https://rss.arxiv.org/rss/cs.CL",publisherDomain:"arxiv.org",departments:["Communications & Languages"],maxItems:12},
 {id:"arxiv-engineering",publisher:"arXiv",url:"https://rss.arxiv.org/rss/cs.SE",publisherDomain:"arxiv.org",departments:["Engineering & Systems"],maxItems:15},
 {id:"nasa-science",publisher:"NASA",url:"https://science.nasa.gov/feed/",publisherDomain:"nasa.gov",departments:["Science & Environment"],maxItems:15},
 {id:"nist-policy",publisher:"NIST",url:"https://www.nist.gov/news-events/standards/rss.xml",publisherDomain:"nist.gov",departments:["Policy & Diplomacy"],maxItems:12},
 {id:"nist-health",publisher:"NIST",url:"https://www.nist.gov/news-events/health/rss.xml",publisherDomain:"nist.gov",departments:["Health & Human Support"],maxItems:12},
 {id:"arxiv-health",publisher:"arXiv",url:"https://rss.arxiv.org/rss/q-bio",publisherDomain:"arxiv.org",departments:["Health & Human Support","Science & Environment"],maxItems:12},
 {id:"nasa-creative",publisher:"NASA",url:"https://www.nasa.gov/news-release/feed/",publisherDomain:"nasa.gov",departments:["Creative & Knowledge"],maxItems:12},
 {id:"nist-operations",publisher:"NIST",url:"https://www.nist.gov/news-events/manufacturing/rss.xml",publisherDomain:"nist.gov",departments:["Operations & Coordination"],maxItems:12},
 {id:"arxiv-hci",publisher:"arXiv",url:"https://rss.arxiv.org/rss/cs.HC",publisherDomain:"arxiv.org",departments:["Creative & Knowledge"],maxItems:12}
]);
export const PUBLIC_FEED_UPDATE_POLICY=Object.freeze({
 trust:"PUBLIC_DISCOVERY_ONLY",
 outputs:"headlines, source URL and dates, not full article text or verified facts",
 review:"Owner review or a separate approved verification pipeline is needed before making source claims",
 dataBoundary:"no personal, project, client or production records read or submitted",
 providers:"no GroqCloud, xAI Grok, OpenAI, LLM or embedding provider",
 refreshInterval:"Designed for once-daily independent refresh, not currently live",
 usage:"Respect publisher feeds, terms, traffic limits, re-use licenses and attribution; do not mirror article bodies."
});
