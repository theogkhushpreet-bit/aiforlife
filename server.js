const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const resourcesDir = path.join(__dirname, 'resources');

app.use(express.json({ limit: '1mb' }));
app.use('/resources', express.static(resourcesDir));
app.use(express.static(publicDir));

const OFFICIAL_MYSCHEME = 'https://www.myscheme.gov.in/';

function num(v) { return Number(v) || 0; }
function lower(v) { return String(v || '').toLowerCase(); }
function annualIncome(profile) { return num(profile.monthlyIncome) * 12; }
function hasStudent(profile, predicate) {
  return Array.isArray(profile.students) && profile.students.some(predicate);
}
function isFarmer(profile) {
  return /farmer|agri|cultivat/i.test(`${profile.occupation || ''} ${profile.employmentStatus || ''}`);
}
function missing(profile, fields) {
  return fields.filter(k => profile[k] === undefined || profile[k] === null || profile[k] === '' || profile[k] === 'Not recorded');
}

// Demonstration eligibility rules. These are deliberately conservative: a match is
// a discovery signal, not an official government eligibility decision.
function privilegeMatches(profile = {}) {
  const matches = [];
  const annual = annualIncome(profile);

  // PM Kisan Maandhan: current official page says small/marginal farmers,
  // cultivable land up to 2 hectares, age 18-40 at entry, plus other conditions.
  if (isFarmer(profile) && num(profile.land) <= 4.94 && num(profile.age) >= 18 && num(profile.age) <= 40) {
    const missingFields = missing(profile, ['dbtBankReady']);
    matches.push({
      name: 'Pradhan Mantri Kisan Maandhan Yojana',
      status: missingFields.length ? 'Potential match — verify missing information' : 'Potential match',
      benefit: 'Minimum assured pension of ₹3,000/month after age 60, subject to the scheme rules.',
      why: ['Farmer profile recorded', 'Landholding is within the 2-hectare threshold', 'Age is within the 18–40 entry range'],
      missing: missingFields.length ? ['Bank/DBT readiness and other official conditions'] : [],
      url: 'https://www.myscheme.gov.in/schemes/pmkmdy'
    });
  }

  // PM-USP Central Sector Scholarship: only surface when profile has a plausible
  // higher-education student signal and household income is at/below ₹4.5 lakh.
  if (annual <= 450000 && hasStudent(profile, s => num(s.className) >= 12)) {
    matches.push({
      name: 'PM-USP Central Sector Scheme of Scholarship for College and University Students',
      status: 'Potential match — student-level conditions need verification',
      benefit: 'Scholarship support for eligible higher-education students; current scheme page lists ₹12,000/year at graduation level and higher rates for specified later years.',
      why: ['A student at/above Class 12 is recorded', `Estimated household income is ₹${annual.toLocaleString('en-IN')} per year`],
      missing: ['Board percentile, regular-degree admission, attendance/marks and other scheme conditions'],
      url: 'https://www.myscheme.gov.in/schemes/csss-cus'
    });
  }

  // OBC post-matric discovery signal. Category and student course details are
  // intentionally required before calling this a strong match.
  if (profile.socialCategory === 'OBC' && annual <= 150000 && hasStudent(profile, s => num(s.className) >= 11)) {
    matches.push({
      name: 'Centrally Sponsored Post-Matric Scholarship for OBC Students',
      status: 'Potential match — verify course and income conditions',
      benefit: 'Maintenance allowance and eligible fee support under the scheme rules.',
      why: ['OBC category is recorded', `Estimated annual household income is ₹${annual.toLocaleString('en-IN')}`, 'A post-matric student signal is recorded'],
      missing: ['Recognized post-matric course, permanent-settlement and other official conditions'],
      url: 'https://www.myscheme.gov.in/schemes/csspostmsossi'
    });
  }

  // PM-YASASVI pre-matric discovery signal.
  if (['OBC', 'EBC'].includes(profile.socialCategory) && annual <= 250000 && hasStudent(profile, s => ['9', '10'].includes(String(s.className)))) {
    matches.push({
      name: 'PM-YASASVI Pre-Matric Scholarship for OBC/EBC/DNT Students',
      status: 'Potential match — verify school and category requirements',
      benefit: 'Current myScheme entry lists a consolidated academic allowance of ₹4,000/year.',
      why: ['Eligible social-category signal recorded', `Estimated annual household income is ₹${annual.toLocaleString('en-IN')}`, 'Class IX/X student signal recorded'],
      missing: ['Valid category certificate, government-school condition and other official requirements'],
      url: 'https://www.myscheme.gov.in/hi/schemes/pmyasasvipmsobcebcdnts'
    });
  }

  // General discovery signal: not a scheme claim, but a useful action whenever
  // the profile is incomplete.
  const missingProfile = missing(profile, ['socialCategory', 'dbtBankReady', 'rationCardStatus']);
  if (missingProfile.length) {
    matches.push({
      name: 'Complete your citizen-service profile',
      status: 'Action recommended',
      benefit: 'More complete profile data can improve scheme discovery and reduce false matches.',
      why: ['Some eligibility-related profile fields are not recorded'],
      missing: missingProfile.map(k => k === 'socialCategory' ? 'Social category' : k === 'dbtBankReady' ? 'DBT/bank readiness' : 'Ration/food-security status'),
      url: OFFICIAL_MYSCHEME
    });
  }

  return matches;
}

function localPrivileges(profile = {}) {
  const matches = privilegeMatches(profile);
  if (!matches.length) {
    return `Bharat Jeevan AI privilege scan\n\nNo strong prototype matches were found from the information currently stored. Add missing profile details and verify current schemes on the official myScheme portal.\n\nThis scan is a discovery aid, not an official eligibility decision.`;
  }
  return `Bharat Jeevan AI privilege scan\n\n${matches.map((m, i) => `${i + 1}. ${m.name}\nStatus: ${m.status}\nBenefit: ${m.benefit}\nWhy: ${m.why.join('; ')}${m.missing?.length ? `\nStill to verify: ${m.missing.join('; ')}` : ''}`).join('\n\n')}\n\nAlways verify the live scheme page before applying.`;
}

function localAnswer(question, profile = {}) {
  const q = String(question || '').toLowerCase();
  if (/privilege|benefit|scheme|government|support|entitlement|getting from the government/.test(q)) {
    return localPrivileges(profile);
  }
  const income = num(profile.monthlyIncome);
  const expense = num(profile.monthlyExpense);
  const balance = income - expense;
  const actions = [];
  if (num(profile.missingDocuments) > 0) actions.push(`Review ${profile.missingDocuments} missing document item(s).`);
  if (num(profile.pendingApplications) > 0) actions.push(`Follow up on ${profile.pendingApplications} pending application(s).`);
  if (Array.isArray(profile.students) && profile.students.length) actions.push(`Review education and scholarship options for ${profile.students.length} student(s).`);
  if (balance < 0) actions.push('Review recurring household expenses because recorded monthly expenses exceed income.');
  if (q.includes('finance') || q.includes('money') || q.includes('financial')) {
    return `Financial intelligence\n\nRecorded monthly income: ₹${income.toLocaleString('en-IN')}\nRecorded monthly expense: ₹${expense.toLocaleString('en-IN')}\nEstimated monthly balance: ₹${balance.toLocaleString('en-IN')}\n\nPriority: review the highest recurring expenses and pending payments first.`;
  }
  if (q.includes('education') || q.includes('student') || q.includes('skill')) {
    return `Education & skills intelligence\n\n${Array.isArray(profile.students) ? profile.students.length : 0} student record(s) are stored. Review each student's career goal, score and recorded skill gap, then verify current scholarship/training opportunities through official portals.`;
  }
  return `Bharat Jeevan AI local analysis\n\nThe profile was analyzed across finance, education, livelihood, documents and citizen-service signals.\n\nTop actions:\n${(actions.length ? actions : ['Keep the family profile updated as circumstances change.']).map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\nThis is the offline fallback. Add a Gemini API key to enable the optional AI explanation layer.`;
}

async function geminiAnswer(question, profile, matches) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt = `You are Bharat Jeevan AI, a citizen-service intelligence assistant for an Indian student innovation project.\n\nUser request: ${question || 'Show my privileges'}\n\nCitizen profile:\n${JSON.stringify(profile || {}, null, 2)}\n\nRule-engine discovery results:\n${JSON.stringify(matches || [], null, 2)}\n\nWrite a concise, easy-to-understand answer. Explain the potentially relevant government benefits from the rule-engine results. Never invent a scheme, benefit, eligibility condition, application status, or approval. Do not say a person is officially eligible; use wording such as “potential match” or “may be relevant” unless the source data explicitly establishes otherwise. Tell the user what information is still missing and that they should verify the current official scheme page before applying. Do not request passwords, OTPs, PINs, or full bank-account numbers. Use Indian rupee formatting where useful. If there are no matches, explain what profile information would make discovery better.`;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature: 0.2, maxOutputTokens: 900 }
  });
  return response.text || localPrivileges(profile);
}

app.get('/api/health', (req, res) => res.json({
  ok: true,
  service: 'Bharat Jeevan AI',
  aiProvider: process.env.GEMINI_API_KEY ? 'Gemini' : 'offline-fallback'
}));

app.post('/api/privileges', async (req, res) => {
  const { profile = {}, question = 'Let me see my privileges' } = req.body || {};
  const matches = privilegeMatches(profile);
  let answer = localPrivileges(profile);
  let aiUsed = false;
  if (process.env.GEMINI_API_KEY) {
    try {
      answer = await geminiAnswer(question, profile, matches);
      aiUsed = true;
    } catch (error) {
      console.error('Gemini privilege explanation failed:', error.message);
    }
  }
  res.json({ answer, matches, aiUsed, provider: aiUsed ? 'Gemini' : 'Local rules', sources: matches.map(m => ({ title: m.name, url: m.url })) });
});

app.post('/api/ai', async (req, res) => {
  try {
    const { question, profile } = req.body || {};
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ answer: localAnswer(question, profile), sources: [] });
    }
    try {
      const matches = privilegeMatches(profile || {});
      const answer = await geminiAnswer(question, profile || {}, matches);
      return res.json({ answer, sources: matches.map(m => ({ title: m.name, url: m.url })) });
    } catch (aiError) {
      console.error('Gemini provider failed:', aiError.message);
      return res.json({ answer: localAnswer(question, profile), sources: [] });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(200).json({ answer: 'Bharat Jeevan AI is running in offline fallback mode. Please try again.', sources: [] });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

if (require.main === module) app.listen(PORT, () => console.log(`Bharat Jeevan AI running on port ${PORT}`));
module.exports = app;
