/* ================= portfolio data (from naji.codes) ================= */
const ME = {
  name: 'Naji Ullah', role: 'Full-stack software engineer', tagline: 'Ships by day, studies by night.',
  location: 'Lahore, PK', since: 'Feb 2025', email: 'najiu1836@gmail.com',
  github: 'https://github.com/Naji-Ullah', linkedin: 'https://www.linkedin.com/in/naji-ullah-53222624b/', site: 'https://naji.codes/'
};

const EXPERIENCE = [
  {
    company: 'struMLines', role: 'Software Engineer', dates: 'Nov 2025 – Jul 2026',
    summary: 'Built mobile apps, web apps and automations across platforms.', bullets: [],
    body: [
      "Software engineer at struMLines, where the job title said 'software' and declined to be more specific. I built mobile apps, web apps, and automations, whichever one was on fire that week. 'Cross-platform' is a lovely word. People say it the way sailors describe weather they haven't met yet.",
      "The automations were my favourite kind of work: software whose entire ambition is that nobody ever has to think about it again. Some of it is still running somewhere in the dark, unthanked. That's the good ending."
    ]
  },
  {
    company: 'Devflovv', role: 'Software Engineer', dates: 'Feb 2025 – Jun 2026',
    summary: 'Responsive front ends in React and Next.js, back ends in Django and DRF.',
    bullets: ['Firebase: Firestore, Auth, Cloud Functions', 'Redux Toolkit and Saga', 'Performance optimization', 'API integrations: AI, Stripe, email'],
    body: [
      'I was a software engineer at Devflovv. In practice that meant building responsive front ends in React and Next.js, writing the Django and DRF that sat behind them, and integrating whatever third-party API the work needed - AI services, Stripe, email - usually after reading the docs so nobody else had to.',
      'I worked across Firebase, Firestore, Auth, Cloud Functions - set up routing and state with Redux Toolkit and Saga, and spent a fair amount of time chasing performance problems, which are almost always a redundant API call wearing a disguise. The rest is the unglamorous part: reviews, planning, and showing up.'
    ]
  }
];

const PROJECTS = [
  {
    id: 'lamppost-io', name: 'Lamppost.io', cat: 'Fintech', role: 'Front-end Engineer', stack: ['React', 'Redux Saga'],
    blurb: 'Software for schools. I built features across it, from the org chart to Lantern AI, then made the API stop repeating itself.',
    features: [['Org chart', 'Who answers to whom, across a whole school. Built from nothing.'], ['Lantern AI', 'Lesson plans, unit plans and brainstorming for schools.']],
    key: ['Feature work across the platform, not just fixes.', 'Async flow on Redux Saga, kept legible.', 'Trimmed redundant API calls; Lighthouse calmed down.', 'Split big components into small honest ones.', 'Sat close to backend and product so things lined up.'],
    story: 'Most of this was feature work. I owned the school org-chart, a clear way to show who answers to whom, and worked on Lantern AI, which helps with lesson plans, unit plans and brainstorming. Along the way I went hunting for everywhere the app double-asked the server. It was asking a lot.',
    fix: ['Optimized API performance across the platform.', 'Built the features. Then stopped the API repeating itself.']
  },
  {
    id: 'blendgenai', name: 'BlendGenAI', cat: 'AI', role: 'Full-stack Engineer', stack: ['React', 'Three.js', 'OpenAI', 'Meshy AI'],
    blurb: 'Type a sentence, get a 3D model you can spin around.',
    key: ['Entire React front end.', 'Three.js model viewer on the dashboard.', 'Meshy AI for generate, enhance and texture.', 'OpenAI prompt clean-up before generation.', 'Smooth on phones, not just my laptop.'],
    story: "I built the whole front end and the viewer you inspect models in. The quietly clever part was running people's vague prompts through OpenAI first, so the generator had a fighting chance before it tried to sculpt 'cool dragon thing'."
  },
  {
    id: 'scimedics', name: 'SciMedics', cat: 'Health', role: 'Backend Engineer', stack: ['Next.js', 'Django', 'DRF', 'PostgreSQL'],
    blurb: 'A medical SaaS where the rules are strict and the data is not allowed to be wrong.',
    key: ['Survey workflows and report generation in Django.', 'APIs on DRF over PostgreSQL.', 'Access kept deliberately tight.', 'Several internal tools onto one clean path.'],
    story: "I lived on the backend - survey workflows, the report generation, and APIs that had to be fast and appropriately paranoid. Health software is a good teacher. It does not forgive 'probably fine'.",
    fix: ['Implemented secure healthcare data workflows.', 'Made the database refuse to be wrong.']
  },
  {
    id: 'marketsmart', name: 'MarketSmart · Pursuit Data', cat: 'Data', role: 'Full-stack Engineer', stack: ['Next.js', 'Firebase', 'Stripe', 'Algolia', 'SendGrid'],
    blurb: 'Pulled business leads off five different sites and kept them searchable the moment they landed.',
    key: ['Next.js + Firebase, scraping five sources.', 'Firebase Extensions: Stripe, Algolia, SendGrid.', 'Role-based auth via custom claims.', 'Code reviews and sprint planning, properly.'],
    story: 'Scrapers feeding Firestore, billing on Stripe, search on Algolia, and auth that made sure people only ever saw their own pile. Five sources is four more than anyone hopes for. It mostly held.'
  },
  {
    id: 'fence-and-deck', name: 'Fence & Deck Connection', cat: 'Operations', role: 'Full-stack Engineer', stack: ['React', 'Firebase', 'Salesforce', 'Square', 'Node.js', 'Puppeteer'],
    blurb: 'Quoting and workflow, glued to Salesforce, paid through Square.',
    key: ['Quoting workflows in React + Firebase.', 'Quote and opportunity data synced with Salesforce.', 'Puppeteer-generated reports.', 'Cloud Functions keeping modules in sync.', 'Square ACH and card payments via Node.'],
    story: 'I kept quotes and opportunities in step with the CRM, automated the reports nobody wanted to make by hand, and wired up real money. Then I talked to the people actually using it, which changed more than the code did.'
  },
  {
    id: 'ryan-homes', name: 'Ryan Homes Integrations', cat: 'Operations', role: 'Full-stack Engineer', stack: ['React', 'Firebase', 'Node.js', 'Salesforce'],
    blurb: 'A quote system wired into the Ryan Homes API, with dashboards that finally agreed on the numbers.',
    key: ['Quote-management workflows in React + Firebase.', 'Node logic creating opportunities via the Ryan Homes API.', 'Dashboards reconciled and trusted.', 'Steady shipping with the team.', 'Hands-on with Salesforce and CRM models.'],
    story: 'Most of this was getting two systems to tell the same story. I wrote the Node logic that creates opportunities through their API, then spent a good while making the dashboards stop contradicting each other.'
  },
  {
    id: 'angi-leads', name: 'Angi Lead Integrations', cat: 'Automation', role: 'Automation Engineer', stack: ['Zapier', 'Salesforce', 'Webhooks'],
    blurb: 'A bridge from Angi into Salesforce that took webhooks live and turned away anything malformed.',
    key: ['Multi-path lead pipeline, Angi → Salesforce, on Zapier.', 'Real-time webhook ingestion.', 'Lookup-table normalisation for strict picklists.', 'Custom header auth on the endpoints.'],
    story: "No interface, just plumbing - multi-path lead routing on Zapier, normalised with lookup tables so it survived Salesforce's strict picklists, and locked down so the junk stayed out. Unglamorous, and very satisfying when it just runs.",
    fix: ['Developed integration middleware solutions.', 'Plumbing. Proud of it.']
  }
];
PROJECTS.forEach((p, i) => { p.no = String(i + 1).padStart(2, '0'); p.file = `${p.no}-${p.id}.md`; });

const SKILLS = [
  { group: 'Frontend', note: 'What the user actually touches.', main: [['React', ['React']], ['Next.js', ['Next.js']], ['Redux Toolkit / Saga', ['Redux Saga']]], also: ['JavaScript', 'TypeScript', 'HTML & CSS', 'Tailwind', 'Material UI'] },
  { group: 'Backend', note: 'Where the rules and the data live.', main: [['Django', ['Django']], ['Django REST Framework', ['DRF']], ['Firebase', ['Firebase']], ['PostgreSQL', ['PostgreSQL']]], also: ['REST APIs', 'Serverless'] },
  { group: 'On the bench', note: 'Everything that helps the other two ship.', main: [['Salesforce', ['Salesforce']], ['Zapier', ['Zapier']]], also: ['Git & GitHub', 'Docker', 'AWS EC2', 'Firebase Hosting', 'Postman'] }
];
const usedIn = tokens => PROJECTS.filter(p => p.stack.some(s => tokens.includes(s)));

/* processes shown in System Monitor: [process, skill label, group, stack tokens] */
const PROCS = [
  ['react', 'React', 'Frontend', ['React']], ['next-server', 'Next.js', 'Frontend', ['Next.js']], ['redux-saga', 'Redux Toolkit / Saga', 'Frontend', ['Redux Saga']],
  ['three.js', 'Three.js', 'Frontend', ['Three.js']], ['django', 'Django', 'Backend', ['Django']], ['drf', 'Django REST Framework', 'Backend', ['DRF']],
  ['firebase', 'Firebase (Firestore, Auth, Functions)', 'Backend', ['Firebase']], ['postgres', 'PostgreSQL', 'Backend', ['PostgreSQL']],
  ['node', 'Node.js', 'Backend', ['Node.js']], ['sf-sync', 'Salesforce', 'On the bench', ['Salesforce']], ['zapier', 'Zapier', 'On the bench', ['Zapier']],
  ['webhookd', 'Webhooks', 'On the bench', ['Webhooks']], ['puppeteer', 'Puppeteer', 'On the bench', ['Puppeteer']],
  ['openai', 'OpenAI API', 'Integrations', ['OpenAI']], ['meshy-ai', 'Meshy AI', 'Integrations', ['Meshy AI']], ['stripe', 'Stripe', 'Integrations', ['Stripe']],
  ['square', 'Square payments', 'Integrations', ['Square']], ['algolia', 'Algolia search', 'Integrations', ['Algolia']], ['sendgrid', 'SendGrid email', 'Integrations', ['SendGrid']],
  ['typescript', 'TypeScript', 'Frontend', []], ['javascript', 'JavaScript', 'Frontend', []], ['html-css', 'HTML & CSS', 'Frontend', []], ['tailwind', 'Tailwind', 'Frontend', []],
  ['material-ui', 'Material UI', 'Frontend', []], ['rest-api', 'REST APIs', 'Backend', []], ['serverless', 'Serverless', 'Backend', []], ['git', 'Git & GitHub', 'On the bench', []],
  ['dockerd', 'Docker', 'On the bench', []], ['aws-ec2', 'AWS EC2', 'On the bench', []], ['fb-hosting', 'Firebase Hosting', 'On the bench', []], ['postman', 'Postman', 'On the bench', []]
];

const FORTUNES = [
  'Performance problems are almost always a redundant API call wearing a disguise.',
  "'Cross-platform' is a lovely word. People say it the way sailors describe weather they haven't met yet.",
  "Health software is a good teacher. It does not forgive 'probably fine'.",
  'Five sources is four more than anyone hopes for. It mostly held.',
  'The best automation is software whose entire ambition is that nobody ever has to think about it again.',
  'Split big components into small honest ones.',
  'Plumbing. Proud of it.',
  'Studying it by night, applying it by deadline.',
  'Then I talked to the people actually using it, which changed more than the code did.',
  'Ships by day, studies by night.'
];

/* ================= document contents ================= */
function projectMd(p) {
  let s = `# ${p.name}\n\n*Core ${p.no} of ${String(PROJECTS.length).padStart(2, '0')} · ${p.cat}*\n\n${p.blurb}\n\n`;
  s += `- **Role:** ${p.role}\n- **Stack:** ${p.stack.join(', ')}\n\n`;
  if (p.features) s += `## Features built\n\n${p.features.map(f => `- **${f[0]}.** ${f[1]}`).join('\n')}\n\n`;
  s += `## Key work\n\n${p.key.map(k => `- ${k}`).join('\n')}\n\n## From the field\n\n${p.story}\n`;
  if (p.fix) s += `\n> **Field correction**\n>\n> ~~${p.fix[0]}~~\n>\n> ==${p.fix[1]}==\n`;
  return s;
}
const README = `# Naji Ullah

Full-stack software engineer in Lahore, Pakistan. **Ships by day, studies by night.**

I build responsive front ends in React and Next.js, the Django and DRF behind them, and the Firebase, Salesforce and Zapier plumbing that keeps it all in step. Seven shipped projects so far, across fintech, health, AI, data and operations.

> **Available for interesting work.** Email najiu1836@gmail.com, or open [Contact Naji](lithos://contact) on the desktop.

## Experience

${EXPERIENCE.map(e => `### ${e.role} · ${e.company}\n\n*${e.dates}*\n\n${e.summary}${e.bullets.length ? '\n\n' + e.bullets.map(b => `- ${b}`).join('\n') : ''}`).join('\n\n')}

Longer notes live in [experience.md](~/Documents/experience.md).

## Projects

Seven core samples sit in [~/Projects](~/Projects), most recent first:

${PROJECTS.map(p => `1. [${p.name}](~/Projects/${p.file}) · ${p.cat}. ${p.blurb}`).join('\n')}

## Skills

- **Frontend:** React, Next.js, Redux Toolkit / Saga, JavaScript, TypeScript, HTML & CSS, Tailwind, Material UI
- **Backend:** Django, Django REST Framework, Firebase (Firestore, Auth, Functions), PostgreSQL, REST APIs, Serverless
- **On the bench:** Salesforce, Zapier, Git & GitHub, Docker, AWS EC2, Firebase Hosting, Postman

Open [System Monitor](lithos://monitor) to see which ones are running hottest.

## Education

**BS Software Engineering** · COMSATS University, Lahore · 2024 – present

Studying it by night, applying it by deadline.

## Elsewhere

- Website: [naji.codes](https://naji.codes/)
- GitHub: [github.com/Naji-Ullah](https://github.com/Naji-Ullah)
- LinkedIn: [linkedin.com/in/naji-ullah-53222624b](https://www.linkedin.com/in/naji-ullah-53222624b/)
`;
const EXPERIENCE_MD = `# Experience\n\n*Overburden: recent work near the surface.*\n\n` + EXPERIENCE.map(e => `## ${e.role} · ${e.company}\n\n*${e.dates}*\n\n${e.body.join('\n\n')}${e.bullets.length ? '\n\n' + e.bullets.map(b => `- ${b}`).join('\n') : ''}`).join('\n\n') + '\n';
const EDUCATION_MD = `# Education\n\n*Bedrock: the foundation, still forming.*\n\n## BS Software Engineering\n\n**COMSATS University, Lahore** · 2024 – present\n\nStudying it by night, applying it by deadline.\n`;
const CONTACT_TXT = `Naji Ullah
Full-stack software engineer · Lahore, PK

Email     ${ME.email}
GitHub    ${ME.github}
LinkedIn  ${ME.linkedin}
Website   ${ME.site}

Status    Available for interesting work.
`;
const TODO_TXT = `[x] ship by day
[x] study by night
[ ] find the next interesting problem
`;
const BASHRC = `# ~/.bashrc: executed by bash(1) for non-login shells.

export EDITOR=editor
export PS1='\\u@\\h:\\w\\$ '

alias ll='ls -la'
alias la='ls -a'
alias cls='clear'
alias ship='git push'    # by day
alias study='open ~/Documents/education.md'    # by night
`;
const OS_RELEASE = `PRETTY_NAME="LithOS 26.09 (Overburden)"
NAME="LithOS"
VERSION_ID="26.09"
VERSION="26.09 (Overburden)"
VERSION_CODENAME=overburden
ID=lithos
ID_LIKE=debian
HOME_URL="https://naji.codes/"
`;
const MOTD = `Welcome to LithOS 26.09 (GNU/Linux 6.18.4-nj x86_64)

 * Portfolio:  https://naji.codes/
 * Help:       type 'help' for commands, or try 'neofetch'
`;

/* boot log lines, reused by /var/log/syslog */
const SYSTEMD_UNITS = [
  ['ok', 'Created slice system-getty.slice.'], ['ok', 'Started Journal Service.'], ['ok', 'Mounted /boot/efi.'],
  ['ok', 'Mounted /home/naji.'], ['ok', 'Mounted /home/naji/Projects (7 cores).'], ['ok', 'Started Network Manager.'],
  ['ok', 'Reached target Network (Lahore, PK).'], ['ok', 'Started React Development Server.'], ['ok', 'Started Django Application Server (DRF).'],
  ['ok', 'Started PostgreSQL 16 database server.'], ['ok', 'Started Firebase Emulator Suite.'], ['ok', 'Started Salesforce Sync Daemon.'],
  ['ok', 'Started Zapier Webhook Listener.'], ['ok', 'Started Night Shift Study Timer (COMSATS BSE).'],
  ['fail', 'Failed to start sleep.target - Sleep.'], ['info', "See 'systemctl status sleep.target' for details."],
  ['ok', 'Started Strata Display Manager.'], ['ok', 'Reached target Graphical Interface.']
];

/* ================= virtual filesystem ================= */
const D = (children, meta) => Object.assign({ type: 'dir', children: children || {} }, meta || {});
const F = (content, meta) => Object.assign({ type: 'file', content: content == null ? '' : content }, meta || {});
const A = (app, meta) => Object.assign({ type: 'app', app }, meta || {});

const FS = {
  trash: [],
  root: D({
    bin: D(), boot: D({ 'vmlinuz-6.18.4-nj': F('', { bin: true, size: 14680064 }), 'initrd.img-6.18.4-nj': F('', { bin: true, size: 71303168 }) }),
    dev: D(), etc: D({ hostname: F('nj-01\n'), 'os-release': F(OS_RELEASE), motd: F(MOTD), timezone: F('Asia/Karachi\n') }),
    home: D({
      naji: D({
        Desktop: D({
          'Home.desktop': A('files', { label: 'Home', icon: 'folder-home', args: { path: HOME } }),
          'README.md': F(README),
          'Projects.desktop': A('files', { label: 'Projects', icon: 'folder-projects', args: { path: HOME + '/Projects' } }),
          'Resume.pdf': F('', { kind: 'resume', size: 86311 }),
          'Terminal.desktop': A('terminal', { label: 'Terminal' }),
          'Web.desktop': A('web', { label: 'Web Browser' }),
          'Skills.desktop': A('monitor', { label: 'Skills', args: { tab: 'processes' } }),
          'Contact.desktop': A('contact', { label: 'Contact Naji' }),
          'Games.desktop': A('files', { label: 'Games', icon: 'folder-games', args: { path: HOME + '/Games' } }),
          'DOOM.desktop': A('doom', { label: 'DOOM' }),
          'Canal Run.desktop': A('racer', { label: 'Canal Run' }),
          'Trash.desktop': A('trash', { label: 'Trash' })
        }),
        Documents: D({ 'experience.md': F(EXPERIENCE_MD), 'education.md': F(EDUCATION_MD), 'contact.txt': F(CONTACT_TXT), 'todo.txt': F(TODO_TXT) }),
        Downloads: D(), Music: D(), Videos: D(),
        Games: D({ 'DOOM.desktop': A('doom', { label: 'DOOM' }), 'Canal Run.desktop': A('racer', { label: 'Canal Run' }), 'Solitaire.desktop': A('solitaire', { label: 'Solitaire' }), 'Chess.desktop': A('chess', { label: 'Chess' }), '2048.desktop': A('2048', { label: '2048' }), 'Brickfall.desktop': A('brickfall', { label: 'Brickfall' }), 'Mines.desktop': A('mines', { label: 'Mines' }), 'Snake.desktop': A('snake', { label: 'Snake' }) }),
        Pictures: D({ Wallpapers: D({
          'strata-night.png': F('', { kind: 'img', wall: 'strata', size: 2411094 }),
          'strata-day.png': F('', { kind: 'img', wall: 'strata-day', size: 2380551 }),
          'survey.png': F('', { kind: 'img', wall: 'survey', size: 1893370 }),
          'core-tray.png': F('', { kind: 'img', wall: 'coretray', size: 3120442 })
        }) }),
        Projects: D(Object.fromEntries(PROJECTS.map(p => [p.file, F(projectMd(p))]))),
        '.bashrc': F(BASHRC), '.config': D({ strata: D({ 'panel.conf': F('[panel]\nposition=bottom\nheight=48\nfloating=false\n') }) }),
        '.profile': F('# ~/.profile\nif [ -f ~/.bashrc ]; then . ~/.bashrc; fi\n')
      })
    }),
    tmp: D(), usr: D({ bin: D(), share: D({ games: D({ doom: D({ 'doom1.wad': F('', { bin: true, size: 4196020 }) }) }) }) }),
    var: D({ log: D({ syslog: F('') }) })
  }),
  init() {
    let seed = 3;
    const base = new Date('2026-07-18T09:12:00').getTime();
    const walk = (node, parent, name) => {
      node.parent = parent; node.name = name;
      node.mtime = node.mtime || base - Math.floor(((seed = (seed * 9301 + 49297) % 233280) / 233280) * 40 * 86400000);
      if (node.type === 'dir') for (const k of Object.keys(node.children)) walk(node.children[k], node, k);
    };
    walk(this.root, null, '');
    const now = Date.now();
    ['/home/naji/Desktop/README.md', '/home/naji/Desktop/Resume.pdf'].forEach(p => { const n = this.get(p); if (n) n.mtime = new Date('2026-09-26T22:41:00').getTime(); });
    this.get('/var/log/syslog').content = SYSTEMD_UNITS.map((u, i) => `${fmtStamp(now)}:${String(i * 2 % 60).padStart(2, '0')} nj-01 systemd[1]: ${u[1]}`).join('\n') + '\n';
    const trashed = [
      ['optimized-api-performance.txt', PROJECTS[0].fix], ['secure-healthcare-data-workflows.txt', PROJECTS[2].fix], ['integration-middleware-solutions.txt', PROJECTS[6].fix]
    ];
    trashed.forEach(([name, fix]) => {
      const node = F(`${fix[0]}\n\nField correction: ${fix[1]}\n`); node.name = name; node.mtime = base - 86400000 * 3;
      this.trash.push({ name, node, from: HOME + '/Documents', at: base - 86400000 * 2 });
    });
  },
  norm(p, cwd) {
    p = String(p || '');
    if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
    if (!p.startsWith('/')) p = (cwd || HOME) + '/' + p;
    const out = [];
    for (const seg of p.split('/')) { if (!seg || seg === '.') continue; if (seg === '..') out.pop(); else out.push(seg); }
    return '/' + out.join('/');
  },
  get(p) {
    if (p === '/') return this.root;
    let n = this.root;
    for (const seg of p.split('/').filter(Boolean)) { if (!n || n.type !== 'dir') return null; n = n.children[seg]; }
    return n || null;
  },
  path(node) { const parts = []; while (node && node.parent) { parts.unshift(node.name); node = node.parent; } return '/' + parts.join('/'); },
  base(p) { return p.split('/').filter(Boolean).pop() || '/'; },
  dir(p) { const i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); },
  short(p) { return p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p; },
  list(node, hidden) {
    return Object.values(node.children).filter(n => hidden || !n.name.startsWith('.'))
      .sort((a, b) => (a.type === 'dir') === (b.type === 'dir') ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : a.type === 'dir' ? -1 : 1);
  },
  size(n) { if (n.type === 'dir') return Object.keys(n.children).length; if (n.size) return n.size; if (n.type === 'app') return 180 + (n.label || '').length; return new Blob([n.content || '']).size; },
  unique(dir, name) {
    if (!dir.children[name]) return name;
    const dot = name.lastIndexOf('.'), stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 2; ; i++) { const c = `${stem} (${i})${ext}`; if (!dir.children[c]) return c; }
  },
  add(dir, name, node) {
    node.name = name; node.parent = dir; node.mtime = Date.now();
    if (node.type === 'dir') for (const k of Object.keys(node.children)) { node.children[k].parent = node; node.children[k].name = k; }
    dir.children[name] = node; dir.mtime = Date.now();
    Bus.emit('fs', this.path(dir));
    return node;
  },
  write(path, content) {
    const n = this.get(path);
    if (n) { n.content = content; n.mtime = Date.now(); delete n.size; Bus.emit('fs', this.dir(path)); return n; }
    const dir = this.get(this.dir(path));
    if (!dir || dir.type !== 'dir') return null;
    return this.add(dir, this.base(path), F(content));
  },
  remove(node) {
    const dir = node.parent; if (!dir) return;
    delete dir.children[node.name]; dir.mtime = Date.now();
    Bus.emit('fs', this.path(dir));
  },
  rename(node, name) {
    const dir = node.parent; const old = this.path(node);
    delete dir.children[node.name]; node.name = name; dir.children[name] = node; node.mtime = Date.now();
    Bus.emit('fs', this.path(dir)); Bus.emit('renamed', old, this.path(node));
  },
  move(node, destDir, name) {
    const from = this.path(node.parent);
    delete node.parent.children[node.name];
    node.name = name || node.name; node.parent = destDir; destDir.children[node.name] = node;
    Bus.emit('fs', from); Bus.emit('fs', this.path(destDir));
  },
  toTrash(node) {
    const from = this.path(node.parent);
    delete node.parent.children[node.name];
    this.trash.push({ name: node.name, node, from, at: Date.now() });
    Bus.emit('fs', from); Bus.emit('fs', 'trash://');
  },
  restore(i) {
    const t = this.trash[i]; if (!t) return;
    let dir = this.get(t.from); if (!dir || dir.type !== 'dir') dir = this.get(HOME);
    this.trash.splice(i, 1);
    this.add(dir, this.unique(dir, t.name), t.node);
    Bus.emit('fs', 'trash://');
  },
  isAncestor(a, b) { let n = b; while (n) { if (n === a) return true; n = n.parent; } return false; }
};

function nodeIcon(node, path) {
  if (!node) return 'file';
  if (node.type === 'app') {
    if (node.app === 'trash') return FS.trash.length ? 'trash-full' : 'trash';
    return node.icon || (Apps.reg[node.app] && Apps.reg[node.app].icon) || 'file';
  }
  if (node.type === 'dir') {
    const special = { [HOME]: 'folder-home', [HOME + '/Projects']: 'folder-projects', [HOME + '/Documents']: 'folder-docs', [HOME + '/Pictures']: 'folder-pics', [HOME + '/Downloads']: 'folder-down', [HOME + '/Music']: 'folder-music', [HOME + '/Videos']: 'folder-video', [HOME + '/Desktop']: 'folder-desktop', [HOME + '/Games']: 'folder-games', '/': 'folder-root' };
    return special[path || FS.path(node)] || 'folder';
  }
  const ext = extOf(node.name);
  return { md: 'file-md', pdf: 'file-pdf', txt: 'file-txt', png: 'file-png', jpg: 'file-png', sh: 'file-sh', html: 'file-html' }[ext] || (node.bin ? 'file-bin' : 'file');
}
function nodeLabel(node) { return node.type === 'app' ? (node.label || node.name.replace(/\.desktop$/, '')) : node.name; }
function nodeType(node) {
  if (node.type === 'dir') return 'Folder';
  if (node.type === 'app') return 'Application launcher';
  return { md: 'Markdown document', pdf: 'PDF document', txt: 'Plain text document', png: 'PNG image', html: 'HTML document' }[extOf(node.name)] || (node.bin ? 'Binary file' : 'Text document');
}

/* ================= tiny markdown renderer ================= */
function mdInline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
      const raw = u.replace(/&amp;/g, '&');
      if (/^https?:/.test(raw)) return `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
      return `<a href="#" data-open="${u}">${t}</a>`;
    });
}
function renderMd(src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = []; let para = [], list = null, quote = null, code = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${mdInline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${mdInline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
  const flushQuote = () => { if (quote) { out.push(`<blockquote>${renderMd(quote.join('\n'))}</blockquote>`); quote = null; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  for (const line of lines) {
    if (code) { if (/^```/.test(line)) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; } else code.push(line); continue; }
    if (/^```/.test(line)) { flushAll(); code = []; continue; }
    if (/^>\s?/.test(line)) { flushPara(); flushList(); (quote = quote || []).push(line.replace(/^>\s?/, '')); continue; }
    flushQuote();
    let m;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) { flushAll(); out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`); continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { flushAll(); out.push('<hr>'); continue; }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.t !== 'ul') { flushList(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\s*\d+\.\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.t !== 'ol') { flushList(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if (!line.trim()) { flushAll(); continue; }
    flushList(); para.push(line.trim());
  }
  if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flushAll();
  return out.join('\n');
}
/* in-OS links inside rendered markdown */
function wireLinks(root) {
  root.addEventListener('click', e => {
    const a = e.target.closest('a[data-open]'); if (!a) return;
    e.preventDefault();
    const u = a.getAttribute('data-open');
    if (u.startsWith('lithos://')) { const app = u.slice(9); Apps.launch(app, app === 'monitor' ? { tab: 'processes' } : {}); }
    else openPath(FS.norm(u));
  });
}
