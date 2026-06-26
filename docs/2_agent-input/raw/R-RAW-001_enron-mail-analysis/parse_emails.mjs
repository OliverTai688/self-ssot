import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAILDIR = join(__dirname, 'maildir');
const OUTPUT = join(__dirname, 'email_data.json');

// Report §9 RQ5: RICE keyword sets — derived from Enron Code of Ethics (2000) original text
// R — "treat others as we would like...do not tolerate abusive or disrespectful...ruthlessness, callousness, arrogance"
// I — "openly, honestly, and sincerely...when we say we will do something, we will do it"
// C — "obligation to communicate...take time to talk...listen...information is meant to move"
// E — "satisfied with nothing less than the very best...raise the bar...discover just how good we can really be"
const RICE_KEYWORDS = {
  R: ['respect', 'disrespect', 'abusive', 'ruthless', 'arrogant', 'arrogance', 'callous', 'toleran', 'intoleran', 'treat others'],
  I: ['integrity', 'honest', 'honestly', 'sincerely', 'sincere', 'openly', 'truthful', 'commitment', 'promise'],
  C: ['communicat', 'listen', 'information', 'obligation', 'discuss', 'dialogue', 'dialog', 'talk', 'open door'],
  E: ['excellen', 'raise the bar', 'world-class', 'very best', 'satisfy', 'satisfied', 'exceed', 'outstanding'],
};

// Report §9 RQ1: defense/crisis vocabulary
const DEFENSE_KEYWORDS = ['strong', 'robust', 'fundamental', 'misunderstood', 'confident', 'solid', 'healthy'];

// Report §5: three organizational phases
function getPhase(month) {
  if (month < '1997-01') return 1;
  if (month < '2001-08') return 2;
  return 3;
}

function parseEmailHeaders(text) {
  const headers = {};
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') break;
    if ((line.startsWith(' ') || line.startsWith('\t')) && i > 0) {
      const lastKey = Object.keys(headers).at(-1);
      if (lastKey) headers[lastKey] += ' ' + line.trim();
      i++; continue;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      headers[key] = val;
    }
    i++;
  }
  return headers;
}

function parseAddressList(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch { return null; }
}

function extractEmail(str) {
  if (!str) return null;
  const m = str.match(/<([^>]+)>/) || str.match(/([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/i);
  return m ? m[1].toLowerCase() : (str.includes('@') ? str.toLowerCase() : null);
}

function countKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k)) ? 1 : 0;
}

async function getAllFiles(dir) {
  const files = [];
  async function recurse(current) {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await recurse(full);
      else files.push(full);
    }
  }
  await recurse(dir);
  return files;
}

async function main() {
  console.log('Scanning maildir...');
  const allFiles = await getAllFiles(MAILDIR);
  console.log(`Found ${allFiles.length} email files`);

  // Aggregation structures
  const monthData = {};   // month → { total, internal, external, rice_R, rice_I, rice_C, rice_E, defense }
  const senderCounts = {};
  const senderByPhase = { 1: {}, 2: {}, 3: {} };
  const links = {};
  const seenIds = new Set();

  let processed = 0;
  let uniqueCount = 0;
  let firstDate = null, lastDate = null;

  // Sample emails for display
  const sampleBucket = [];

  for (const filePath of allFiles) {
    try {
      const text = await readFile(filePath, 'utf8');
      const headers = parseEmailHeaders(text);

      const msgId = headers['message-id'] || '';
      if (msgId && seenIds.has(msgId)) { processed++; continue; }
      if (msgId) seenIds.add(msgId);

      const date = parseDate(headers['date']);
      if (!date) { processed++; continue; }

      const month = date.slice(0, 7);
      // only focus on 1998-2002 for meaningful analysis
      if (month < '1998-01' || month > '2002-12') { processed++; continue; }

      const from = (headers['from'] || '').trim().toLowerCase();
      const fromEmail = extractEmail(from);
      const to = parseAddressList(headers['to']);
      const cc = parseAddressList(headers['cc']);
      const subject = (headers['subject'] || '').trim();

      // Determine internal/external
      const allTo = [...to, ...cc].map(extractEmail).filter(Boolean);
      const isInternal = allTo.some(e => e.endsWith('@enron.com'));
      const isExternal = allTo.some(e => e && !e.endsWith('@enron.com'));

      // RICE keywords in subject
      const rice_R = countKeywords(subject, RICE_KEYWORDS.R);
      const rice_I = countKeywords(subject, RICE_KEYWORDS.I);
      const rice_C = countKeywords(subject, RICE_KEYWORDS.C);
      const rice_E = countKeywords(subject, RICE_KEYWORDS.E);
      const defense = countKeywords(subject, DEFENSE_KEYWORDS);

      // Month aggregation
      if (!monthData[month]) {
        monthData[month] = { total: 0, internal: 0, external: 0, both: 0, rice_R: 0, rice_I: 0, rice_C: 0, rice_E: 0, defense: 0 };
      }
      monthData[month].total++;
      if (isInternal) monthData[month].internal++;
      if (isExternal) monthData[month].external++;
      if (isInternal && isExternal) monthData[month].both++;
      monthData[month].rice_R += rice_R;
      monthData[month].rice_I += rice_I;
      monthData[month].rice_C += rice_C;
      monthData[month].rice_E += rice_E;
      monthData[month].defense += defense;

      // Sender counts + by phase
      const phase = getPhase(month);
      if (fromEmail) {
        senderCounts[fromEmail] = (senderCounts[fromEmail] || 0) + 1;
        senderByPhase[phase][fromEmail] = (senderByPhase[phase][fromEmail] || 0) + 1;
      }

      // Links (from → to, internal only to reduce noise)
      if (fromEmail && isInternal) {
        for (const t of allTo) {
          const toEmail = extractEmail(t);
          if (toEmail && toEmail !== fromEmail && toEmail.endsWith('@enron.com')) {
            const key = `${fromEmail}→${toEmail}`;
            links[key] = (links[key] || 0) + 1;
          }
        }
      }

      // Sample emails: keep ~3000 spread across all months
      if (Math.random() < 0.006) {
        sampleBucket.push({
          date,
          from: fromEmail || from.slice(0, 40),
          to: allTo.slice(0, 5),
          subject: subject.slice(0, 120),
          internal: isInternal,
        });
      }

      if (!firstDate || date < firstDate) firstDate = date;
      if (!lastDate || date > lastDate) lastDate = date;

      uniqueCount++;
      processed++;
      if (processed % 50000 === 0) console.log(`  Processed ${processed}/${allFiles.length}...`);
    } catch (e) {
      processed++;
    }
  }

  console.log(`\nUnique emails in 1998-2002: ${uniqueCount}`);

  // Build timeline (sorted)
  const timeline = Object.entries(monthData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, d]) => ({
      month,
      phase: getPhase(month),
      total: d.total,
      internal: d.internal,
      external: d.external,
      rice_R: d.rice_R,
      rice_I: d.rice_I,
      rice_C: d.rice_C,
      rice_E: d.rice_E,
      defense: d.defense,
    }));

  // Top senders overall
  const topSenders = Object.entries(senderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  // Top senders per phase
  const topSendersPhase = {};
  for (const p of [1, 2, 3]) {
    topSendersPhase[p] = Object.entries(senderByPhase[p])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }

  // Top links
  const topLinks = Object.entries(links)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 600)
    .map(([key, count]) => {
      const [source, target] = key.split('→');
      return { source, target, count };
    });

  // Sample emails sorted
  sampleBucket.sort((a, b) => a.date.localeCompare(b.date));

  // Phase stats summary
  const phaseStats = {};
  for (const p of [1, 2, 3]) {
    const months = timeline.filter(t => t.phase === p);
    phaseStats[p] = {
      total: months.reduce((s, m) => s + m.total, 0),
      months: months.length,
      avgPerMonth: Math.round(months.reduce((s, m) => s + m.total, 0) / Math.max(months.length, 1)),
      rice: {
        R: months.reduce((s, m) => s + m.rice_R, 0),
        I: months.reduce((s, m) => s + m.rice_I, 0),
        C: months.reduce((s, m) => s + m.rice_C, 0),
        E: months.reduce((s, m) => s + m.rice_E, 0),
      },
      defense: months.reduce((s, m) => s + m.defense, 0),
    };
  }

  // Pre/post crisis comparison (§9 RQ1)
  // Trigger 1: 2001-03 (McLean article)
  // Trigger 2: 2001-08 (Skilling resignation)
  const rq1 = {
    pre1: timeline.filter(t => t.month >= '2001-01' && t.month < '2001-03'),
    post1: timeline.filter(t => t.month >= '2001-03' && t.month < '2001-08'),
    post2: timeline.filter(t => t.month >= '2001-08' && t.month <= '2002-01'),
  };

  const output = {
    meta: {
      total: uniqueCount,
      dateRange: { start: firstDate, end: lastDate },
      generatedAt: new Date().toISOString(),
    },
    timeline,
    phaseStats,
    topSenders,
    topSendersPhase,
    topLinks,
    sampleEmails: sampleBucket,
    rq1,
  };

  await writeFile(OUTPUT, JSON.stringify(output));
  console.log(`Output written to: ${OUTPUT}`);
  console.log(`File size: ${Math.round((await (await import('fs')).promises.stat(OUTPUT)).size / 1024)}KB`);

  // Print a quick summary
  console.log('\nPhase stats:');
  for (const p of [1, 2, 3]) {
    const s = phaseStats[p];
    console.log(`  Phase ${p}: ${s.total.toLocaleString()} emails, avg ${s.avgPerMonth}/mo, defense: ${s.defense}`);
  }
}

main().catch(console.error);
