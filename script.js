/* ==========================================================================
   Find Their Next Great Read · The Linden Bookshop
   Vanilla JavaScript. No build step, no dependencies.

   Sections
   1. Content data (conversation, books, profile fields, covers)
   2. Learner state (saved to sessionStorage)
   3. Navigation and progress
   4. Screen 2: framework tabs
   5. Screen 3: branching conversation
   6. Reader profile component
   7. Screen 4: book selection
   8. Event wiring and start-up
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Content data ---------- */

  const SCREENS = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'framework', title: 'The art of recommending' },
    { id: 'conversation', title: 'Behind the counter' },
    { id: 'recommendation', title: 'Your recommendation' },
    { id: 'summary', title: 'Take it to the floor' },
  ];

  const TABS = ['ask', 'listen', 'match'];

  // The four preferences the learner must uncover. Category labels mirror
  // what the Listen step teaches learners to pay attention to.
  const PROFILE_FIELDS = [
    { key: 'genre', label: 'Genre', value: 'Mysteries', want: 'A mystery' },
    { key: 'experience', label: 'Reading experience', value: 'Atmospheric, character-driven stories', want: 'Atmospheric and character-driven' },
    { key: 'avoid', label: 'Deal-breaker', value: 'Graphic violence', want: 'No graphic violence' },
    { key: 'format', label: 'Format', value: 'A standalone novel', want: 'A standalone novel' },
  ];

  const OPENING_LINE = '“I’m looking for something to read this weekend, but I have no idea what I want.”';

  // Each decision has a goal: the preferences it is designed to uncover.
  // The learner keeps choosing (from the options not yet used) until the goal
  // is met, so the conversation always reveals all four preferences.
  // Quality: 'strong' | 'reasonable' | 'early' (recommending before listening).
  const DECISIONS = [
    {
      goal: ['genre'],
      options: [
        {
          id: 'recent',
          text: '“What’s a book you’ve really enjoyed recently?”',
          quality: 'strong',
          verdict: 'Strong opening question',
          reply: '“Oh, good question. I read a mystery last month that I couldn’t put down. I was up way too late finishing it.”',
          reveals: ['genre'],
          feedback: 'An open question about a book Alex loved invites a story, not a one-word answer. You already know Alex enjoys mysteries, and there’s more to learn from that book.',
        },
        {
          id: 'bestseller',
          text: '“You should try our bestseller. Everyone’s reading it.”',
          quality: 'early',
          verdict: 'Too soon to recommend',
          reply: '“Maybe? I think I saw it in the window. Isn’t it a big thriller? I’m not sure that’s really me.”',
          reveals: [],
          feedback: 'Popular isn’t the same as right for Alex. Recommending before you ask skips the most important step. Try learning about Alex as a reader first.',
        },
        {
          id: 'fiction',
          text: '“Are you in the mood for fiction or nonfiction?”',
          quality: 'reasonable',
          verdict: 'Reasonable, but narrow',
          reply: '“Fiction, I think. Something I can get lost in.”',
          reveals: [],
          feedback: 'A fair place to start, and it does narrow the shelves. But an either-or question tends to get a short answer. Asking about a book Alex enjoyed could reveal genre, mood, and more in a single question.',
        },
      ],
    },
    {
      goal: ['experience', 'avoid'],
      options: [
        {
          id: 'what-enjoyed',
          text: '“A mystery! What did you enjoy most about it?”',
          quality: 'strong',
          verdict: 'Strong follow-up',
          reply: '“The atmosphere, mostly. It was set in a foggy little harbor town, and the characters felt like real people. It wasn’t gory, either. I really don’t enjoy graphic violence.”',
          reveals: ['experience', 'avoid'],
          feedback: 'Asking what Alex enjoyed turns a genre into a reading experience. Now you know the kind of story Alex wants and a clear deal-breaker.',
        },
        {
          id: 'thrillers',
          text: '“Do you like thrillers too?”',
          quality: 'reasonable',
          verdict: 'Reasonable, but narrow',
          reply: '“Sometimes, I guess. It depends on the book.”',
          reveals: [],
          feedback: 'A yes-or-no question about a neighboring genre doesn’t tell you what made Alex’s last read special. Ask what Alex enjoyed about it.',
        },
        {
          id: 'front-table',
          text: '“Then you’ll love the new crime thriller on our front table.”',
          quality: 'early',
          verdict: 'Too soon to recommend',
          reply: '“Is that the one with the bloodstained cover? I’d rather skip anything graphic, honestly.”',
          reveals: ['avoid'],
          feedback: 'Alex volunteered a deal-breaker, which is useful. But this recommendation was a guess. You still don’t know what Alex enjoyed about that mystery, so keep listening before you match.',
        },
      ],
    },
    {
      goal: ['format'],
      options: [
        {
          id: 'standalone',
          text: '“Are you hoping for a standalone, or would you like to start a series?”',
          quality: 'strong',
          verdict: 'Strong clarifying question',
          reply: '“A standalone, please. I want a complete story I can finish this weekend.”',
          reveals: ['format'],
          feedback: 'Format is easy to overlook. Many mysteries belong to a series, so this question rules out books that wouldn’t give Alex a complete story.',
        },
        {
          id: 'avoid',
          text: '“Is there anything you’d rather avoid?”',
          quality: 'strong',
          verdict: 'Also a strong question',
          reply: '“Nothing too violent, like I said. And I don’t want to get pulled into a long series right now. I’d like a story that wraps up by the end.”',
          reveals: ['format'],
          feedback: 'An open question about deal-breakers gave Alex room to mention something you hadn’t asked about directly: Alex wants a story that’s complete in one book.',
        },
        {
          id: 'paperback',
          text: '“Would you prefer a hardcover or a paperback?”',
          quality: 'reasonable',
          verdict: 'Useful later',
          reply: '“Paperback is perfect. Easier to carry around.”',
          reveals: [],
          feedback: 'A practical question, and worth asking eventually. But it won’t help you choose the right story. Before you match, check for any remaining preferences.',
        },
      ],
    },
  ];

  // match: [status, what this book offers]. status: yes | no | partial | unknown
  const BOOKS = [
    {
      id: 'lantern',
      title: 'The Lantern House',
      author: 'Maren Ellery',
      description: 'An atmospheric standalone mystery about a retired librarian investigating a disappearance in a quiet coastal town. Character-driven, with minimal violence.',
      best: true,
      verdict: 'The strongest match',
      feedback: 'The Lantern House fits everything Alex told you. It’s a mystery, it’s atmospheric and character-driven, it keeps violence to a minimum, and it’s a complete story in one book.',
      match: {
        genre: ['yes', 'A mystery'],
        experience: ['yes', 'Atmospheric and character-driven'],
        avoid: ['yes', 'Minimal violence'],
        format: ['yes', 'A standalone novel'],
      },
    },
    {
      id: 'witness',
      title: 'The Last Witness',
      author: 'J. R. Kessler',
      description: 'A fast-paced crime thriller featuring graphic violence and a detective racing against time.',
      verdict: 'Not a good fit',
      feedback: 'It’s crime fiction, but it’s a fast-paced thriller rather than an atmospheric, character-driven story. It also features graphic violence, the one thing Alex asked to avoid.',
      match: {
        genre: ['partial', 'Crime, but a thriller'],
        experience: ['no', 'Fast-paced'],
        avoid: ['no', 'Graphic violence'],
        format: ['unknown', 'Not mentioned'],
      },
    },
    {
      id: 'crown',
      title: 'The Hollow Crown',
      author: 'Isolde Varga',
      description: 'A richly detailed fantasy adventure and the first installment in a five-book series.',
      verdict: 'Not a good fit',
      feedback: 'Alex is looking for a mystery, and this is a fantasy adventure. It’s also the first of five books, while Alex wants a story that’s complete in one.',
      match: {
        genre: ['no', 'Fantasy adventure'],
        experience: ['unknown', 'Richly detailed, but not described as atmospheric'],
        avoid: ['unknown', 'Not mentioned'],
        format: ['no', 'Book one of five'],
      },
    },
    {
      id: 'ashwood',
      title: 'Secrets of Ashwood',
      author: 'Clara Penhallow',
      description: 'An atmospheric, character-driven mystery with minimal violence. The first book in an ongoing series with an unresolved central mystery.',
      verdict: 'Close, but not quite',
      feedback: 'This one matches Alex’s taste: an atmospheric, character-driven mystery with minimal violence. But it’s the first book in an ongoing series with an unresolved central mystery, and Alex wants a complete story to finish this weekend.',
      match: {
        genre: ['yes', 'A mystery'],
        experience: ['yes', 'Atmospheric and character-driven'],
        avoid: ['yes', 'Minimal violence'],
        format: ['no', 'Ongoing series, mystery left unresolved'],
      },
    },
  ];

  const MATCH_LABELS = {
    yes: 'Matches',
    no: 'Does not match',
    partial: 'Partial match',
    unknown: 'Unclear',
  };

  const ICONS = {
    yes: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    no: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    partial: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor"/></svg>',
    unknown: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // Fictional book covers, drawn in SVG with the course palette.
  const COVER_ART = {
    lantern: `
      <rect width="200" height="300" fill="#29483D"/>
      <rect x="11" y="11" width="178" height="278" fill="none" stroke="#A6B19A" stroke-opacity=".5"/>
      <g fill="#F5F0E6"><circle cx="40" cy="120" r="1.1"/><circle cx="62" cy="104" r=".8"/><circle cx="150" cy="112" r="1.1"/><circle cx="168" cy="132" r=".8"/><circle cx="132" cy="96" r=".7"/></g>
      <circle cx="104" cy="186" r="46" fill="#F5F0E6" fill-opacity=".06"/>
      <circle cx="104" cy="186" r="28" fill="#F5F0E6" fill-opacity=".08"/>
      <path d="M11 214c26-8 52-10 80-9 30 1 56-6 98-4v88H11z" fill="#1F382F"/>
      <path d="M74 206v-30l26-20 26 20v30z" fill="#302B26"/>
      <rect x="112" y="160" width="7" height="13" fill="#302B26"/>
      <rect x="98" y="180" width="12" height="13" fill="#F5F0E6"/>
      <path d="M104 180v13M98 186.5h12" stroke="#302B26" stroke-width="1"/>
      <g fill="none" stroke="#A6B19A" stroke-opacity=".7" stroke-width="1.1">
        <path d="M22 238q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0"/>
        <path d="M34 250q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0"/>
      </g>
      <text x="100" y="52" text-anchor="middle" font-size="10" letter-spacing="4" fill="#A6B19A">THE</text>
      <text x="100" y="82" text-anchor="middle" font-size="27" font-style="italic" fill="#F5F0E6">Lantern House</text>
      <text x="100" y="272" text-anchor="middle" font-size="8.5" letter-spacing="2.6" fill="#A6B19A">MAREN ELLERY</text>`,
    witness: `
      <rect width="200" height="300" fill="#302B26"/>
      <path d="M0 196 200 130v26L0 222z" fill="#803F46"/>
      <text class="cover__sans" x="22" y="46" font-size="8" font-weight="700" letter-spacing="3" fill="#A6B19A">A THRILLER</text>
      <text class="cover__sans" x="20" y="88" font-size="31" font-weight="800" letter-spacing="-.5" fill="#F5F0E6">THE LAST</text>
      <text class="cover__sans" x="20" y="120" font-size="31" font-weight="800" letter-spacing="-.5" fill="#F5F0E6">WITNESS</text>
      <circle cx="148" cy="246" r="20" fill="none" stroke="#F5F0E6" stroke-opacity=".55" stroke-width="1.5"/>
      <path d="M148 246v-12M148 246l8 5" stroke="#F5F0E6" stroke-opacity=".8" stroke-width="1.5" stroke-linecap="round"/>
      <text class="cover__sans" x="22" y="272" font-size="8.5" font-weight="600" letter-spacing="2.4" fill="#A6B19A">J. R. KESSLER</text>`,
    crown: `
      <rect width="200" height="300" fill="#803F46"/>
      <rect x="11" y="11" width="178" height="278" fill="none" stroke="#F5F0E6" stroke-opacity=".45"/>
      <rect x="16" y="16" width="168" height="268" fill="none" stroke="#F5F0E6" stroke-opacity=".25"/>
      <path d="M66 176l-6-48 22 20 18-32 18 32 22-20-6 48z" fill="none" stroke="#F5F0E6" stroke-width="2" stroke-linejoin="round"/>
      <path d="M68 186h64" stroke="#F5F0E6" stroke-width="2"/>
      <g fill="#A6B19A"><circle cx="60" cy="124" r="3"/><circle cx="100" cy="112" r="3"/><circle cx="140" cy="124" r="3"/></g>
      <text x="100" y="62" text-anchor="middle" font-size="11" letter-spacing="4" fill="#F5F0E6">THE</text>
      <text x="100" y="90" text-anchor="middle" font-size="26" fill="#F5F0E6">Hollow Crown</text>
      <text x="100" y="226" text-anchor="middle" font-size="6.5" letter-spacing="1.4" fill="#F5F0E6" fill-opacity=".8">BOOK ONE OF THE EMBER CYCLE</text>
      <text x="100" y="266" text-anchor="middle" font-size="8.5" letter-spacing="2.6" fill="#F5F0E6">ISOLDE VARGA</text>`,
    ashwood: `
      <rect width="200" height="300" fill="#A6B19A"/>
      <text x="100" y="58" text-anchor="middle" font-size="15" font-style="italic" fill="#302B26">Secrets of</text>
      <text x="100" y="92" text-anchor="middle" font-size="34" fill="#302B26">Ashwood</text>
      <text x="100" y="112" text-anchor="middle" font-size="6.5" letter-spacing="2.4" fill="#302B26" fill-opacity=".8">AN ASHWOOD MYSTERY · BOOK ONE</text>
      <g fill="#803F46"><circle cx="100" cy="160" r="9"/><path d="M95 164h10l4 22H91z"/></g>
      <g fill="#29483D">
        <path d="M0 300V236l14-40 14 40v-12l16-46 16 46v8l12-34 12 34v-14l16-50 16 50v10l12-30 12 30v-6l16-44 16 44v-8l14-36 10 28V300z"/>
      </g>
      <text x="100" y="278" text-anchor="middle" font-size="8.5" letter-spacing="2.6" fill="#F5F0E6">CLARA PENHALLOW</text>`,
  };

  function coverSVG(id, label) {
    const a11y = label
      ? `role="img" aria-label="${escapeAttr(label)}"`
      : 'aria-hidden="true" focusable="false"';
    return `<svg class="cover" viewBox="0 0 200 300" ${a11y}>${COVER_ART[id]}</svg>`;
  }

  /* ---------- 2. Learner state ---------- */

  const STORAGE_KEY = 'linden-next-great-read:v1';

  function freshState() {
    return {
      screen: 0,
      activeTab: 'ask',
      tabsViewed: ['ask'],
      picks: [],          // option ids chosen in the conversation, in order
      inspected: null,    // book id currently open in the detail view
      recommended: null,  // book id the learner recommended
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== 'object') return freshState();
      const s = Object.assign(freshState(), saved);
      s.screen = Math.min(Math.max(Number(s.screen) || 0, 0), SCREENS.length - 1);
      if (!TABS.includes(s.activeTab)) s.activeTab = 'ask';
      if (!Array.isArray(s.tabsViewed)) s.tabsViewed = ['ask'];
      if (!Array.isArray(s.picks)) s.picks = [];
      return s;
    } catch (e) {
      return freshState();
    }
  }

  function saveState() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: state stays in memory */ }
  }

  let state = loadState();

  /* ---------- Helpers ---------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function setGate(name, open) {
    const btn = $(`[data-gate="${name}"]`);
    const hint = $(`[data-gate-hint="${name}"]`);
    if (!btn) return;
    if (open) {
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('aria-describedby');
    } else {
      btn.setAttribute('aria-disabled', 'true');
      if (hint) btn.setAttribute('aria-describedby', hint.id);
    }
    if (hint) hint.hidden = open;
  }

  /* ---------- 3. Navigation and progress ---------- */

  const screenEls = $$('[data-screen]');

  function buildProgressTrack() {
    $('[data-progress-total]').textContent = SCREENS.length;
    $('[data-progress-track]').innerHTML = SCREENS.map(() => '<li></li>').join('');
  }

  function renderProgress() {
    $('[data-progress-current]').textContent = state.screen + 1;
    $('[data-progress-title]').textContent = SCREENS[state.screen].title;
    $$('[data-progress-track] li').forEach((li, i) => {
      li.classList.toggle('is-complete', i < state.screen);
      li.classList.toggle('is-current', i === state.screen);
    });
  }

  function showScreen(index, { moveFocus = true } = {}) {
    state.screen = Math.min(Math.max(index, 0), SCREENS.length - 1);
    saveState();

    screenEls.forEach((el, i) => { el.hidden = i !== state.screen; });
    renderProgress();
    document.title = `${SCREENS[state.screen].title} · Find Their Next Great Read`;

    const id = SCREENS[state.screen].id;
    if (id === 'framework') renderFramework();
    if (id === 'conversation') renderConversation();
    if (id === 'recommendation') renderRecommendation();

    if (moveFocus) {
      window.scrollTo(0, 0);
      const target = $('[data-focus-target]', screenEls[state.screen]);
      if (target) target.focus({ preventScroll: true });
    }
  }

  function isGateOpen(name) {
    if (name === 'framework') return TABS.every((t) => state.tabsViewed.includes(t));
    if (name === 'conversation') return deriveConversation(state.picks).complete;
    if (name === 'recommendation') return state.recommended === 'lantern';
    return true;
  }

  function goNext(btn) {
    const gate = btn && btn.dataset.gate;
    if (gate && !isGateOpen(gate)) {
      const hint = $(`[data-gate-hint="${gate}"]`);
      if (hint) {
        hint.classList.remove('is-nudged');
        void hint.offsetWidth;
        hint.classList.add('is-nudged');
      }
      return;
    }
    showScreen(state.screen + 1);
  }

  function restartCourse() {
    state = freshState();
    saveState();
    showScreen(0);
  }

  /* ---------- 4. Screen 2: framework tabs ---------- */

  function renderFramework() {
    TABS.forEach((name) => {
      const tab = $(`#tab-${name}`);
      const panel = $(`#panel-${name}`);
      const selected = state.activeTab === name;
      const viewed = state.tabsViewed.includes(name);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
      $('[data-tab-status]', tab).innerHTML = viewed && !selected
        ? `${ICONS.check}<span class="visually-hidden">(viewed)</span>`
        : '';
    });
    setGate('framework', isGateOpen('framework'));
  }

  function selectTab(name, { focusTab = false } = {}) {
    state.activeTab = name;
    if (!state.tabsViewed.includes(name)) state.tabsViewed.push(name);
    saveState();
    renderFramework();
    if (focusTab) $(`#tab-${name}`).focus();
  }

  function onTabKeydown(event) {
    const current = TABS.indexOf(event.currentTarget.dataset.tab);
    let next = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': next = (current + 1) % TABS.length; break;
      case 'ArrowLeft':
      case 'ArrowUp': next = (current - 1 + TABS.length) % TABS.length; break;
      case 'Home': next = 0; break;
      case 'End': next = TABS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectTab(TABS[next], { focusTab: true });
  }

  /* ---------- 5. Screen 3: branching conversation ---------- */

  // Replays the learner's picks to work out where the conversation stands.
  // Deriving everything from the list of picks keeps the state simple and
  // makes "Back", page refresh, and restart behave predictably.
  function deriveConversation(picks) {
    const revealed = new Set();
    const used = DECISIONS.map(() => new Set());
    const entries = [];
    let step = 0;

    for (const id of picks) {
      const decision = DECISIONS[step];
      if (!decision) break;
      const option = decision.options.find((o) => o.id === id);
      if (!option || used[step].has(id)) break;
      used[step].add(id);
      const newly = option.reveals.filter((k) => !revealed.has(k));
      newly.forEach((k) => revealed.add(k));
      entries.push({ option, newly });
      if (decision.goal.every((k) => revealed.has(k))) step += 1;
    }

    return { revealed, used, entries, step, complete: step >= DECISIONS.length };
  }

  function lineHTML(speaker, text) {
    const name = speaker === 'alex' ? 'Alex' : 'You';
    return `<div class="line line--${speaker}"><span class="line__speaker">${name}</span><p class="line__text">${text}</p></div>`;
  }

  function noteHTML(entry) {
    const { option, newly } = entry;
    const added = newly.length
      ? `<p class="note__added">Added to Alex’s profile: ${newly
          .map((k) => `<span class="tag">${PROFILE_FIELDS.find((f) => f.key === k).value}</span>`)
          .join(' ')}</p>`
      : '';
    return `
      <div class="note note--${option.quality}">
        <p class="note__verdict"><span class="visually-hidden">Feedback: </span>${option.verdict}</p>
        <p>${option.feedback}</p>
        ${added}
      </div>`;
  }

  function renderConversation({ newestIndex = -1 } = {}) {
    const convo = deriveConversation(state.picks);
    const transcript = $('[data-transcript]');

    let html = `<p class="stage">Alex approaches the counter.</p>${lineHTML('alex', OPENING_LINE)}`;
    convo.entries.forEach((entry, i) => {
      const isNew = i === newestIndex;
      html += `<div class="exchange${isNew ? ' is-entering' : ''}"${isNew ? ' tabindex="-1" data-newest' : ''}>
        ${lineHTML('you', entry.option.text)}
        ${lineHTML('alex', entry.option.reply)}
        ${noteHTML(entry)}
      </div>`;
    });
    if (convo.complete) {
      html += `<p class="stage${newestIndex >= 0 ? ' is-entering' : ''}">You now have a clear picture of what Alex is looking for.</p>`;
    }
    transcript.innerHTML = html;

    const choices = $('[data-choices]');
    if (convo.complete) {
      choices.hidden = true;
    } else {
      choices.hidden = false;
      const decision = DECISIONS[convo.step];
      const remaining = decision.options.filter((o) => !convo.used[convo.step].has(o.id));
      $('[data-choices-list]').innerHTML = remaining
        .map((o, i) => `<button type="button" class="choice" data-action="pick" data-option="${o.id}">
            <span class="choice__key" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
            <span>${o.text}</span>
          </button>`)
        .join('');
      $('.choices__legend').textContent = convo.entries.length ? 'What do you say next?' : 'How do you respond?';
    }

    const newest = newestIndex >= 0 ? convo.entries[newestIndex] : null;
    renderProfiles(convo.revealed, newest ? newest.newly : []);
    setGate('conversation', convo.complete);
  }

  function pickOption(id) {
    state.picks.push(id);
    saveState();
    renderConversation({ newestIndex: deriveConversation(state.picks).entries.length - 1 });
    const newest = $('[data-newest]');
    if (newest) {
      newest.focus({ preventScroll: true });
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      newest.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function restartConversation() {
    state.picks = [];
    state.recommended = null;
    state.inspected = null;
    saveState();
    renderConversation();
    const first = $('[data-choices-list] .choice');
    if (first) first.focus();
  }

  /* ---------- 6. Reader profile component ---------- */

  function renderProfiles(revealed, highlight = []) {
    const found = PROFILE_FIELDS.filter((f) => revealed.has(f.key)).length;
    $$('[data-profile]').forEach((host) => {
      host.innerHTML = `
        <div class="profile">
          <p class="profile__kicker">Reader profile</p>
          <h3 class="profile__name">Alex</h3>
          <p class="profile__count">${found} of ${PROFILE_FIELDS.length} preferences discovered</p>
          <dl class="profile__list">
            ${PROFILE_FIELDS.map((f) => {
              const has = revealed.has(f.key);
              const isNew = highlight.includes(f.key);
              return `<div class="profile__row${isNew ? ' is-new' : ''}">
                <dt>${f.label}</dt>
                <dd${has ? '' : ' class="is-empty"'}>${has ? f.value : 'Not yet discovered'}</dd>
              </div>`;
            }).join('')}
          </dl>
        </div>`;
    });
    if (highlight.length) {
      window.setTimeout(() => $$('.profile__row.is-new').forEach((r) => r.classList.remove('is-new')), 2200);
    }
  }

  /* ---------- 7. Screen 4: book selection ---------- */

  function renderRecommendation() {
    renderProfiles(deriveConversation(state.picks).revealed);

    $('[data-shelf]').innerHTML = BOOKS.map((b) => {
      const isPick = state.recommended === b.id;
      return `<li>
        <button type="button" class="book" data-action="inspect" data-book="${b.id}" aria-pressed="${state.inspected === b.id}">
          ${isPick ? '<span class="book__badge">Your pick</span>' : ''}
          <span class="book__cover">${coverSVG(b.id)}</span>
          <span class="book__title">${b.title}${isPick ? '<span class="visually-hidden"> (your recommendation)</span>' : ''}</span>
        </button>
      </li>`;
    }).join('');

    renderDetail();
    setGate('recommendation', isGateOpen('recommendation'));
  }

  function renderDetail() {
    const host = $('[data-detail]');
    const book = BOOKS.find((b) => b.id === state.inspected);
    if (!book) {
      host.innerHTML = '<p class="detail__empty">Select a book from the shelf to read its description.</p>';
      return;
    }

    const isPick = state.recommended === book.id;
    let action;
    if (isPick) {
      action = '';
    } else {
      const label = state.recommended ? 'Recommend this one instead' : 'Recommend to Alex';
      action = `<button type="button" class="btn btn--primary" data-action="recommend" data-book="${book.id}">${label}</button>`;
    }

    host.innerHTML = `
      <article class="detail__card" aria-labelledby="detail-title">
        <div class="detail__cover">${coverSVG(book.id)}</div>
        <div>
          <h3 class="detail__title" id="detail-title">${book.title}</h3>
          <p class="detail__author">${book.author}</p>
          <p class="detail__desc">${book.description}</p>
          ${action ? `<div class="detail__actions">${action}</div>` : ''}
        </div>
      </article>
      ${isPick ? verdictHTML(book) : ''}`;
  }

  function verdictHTML(book) {
    const rows = PROFILE_FIELDS.map((f) => {
      const [status, text] = book.match[f.key];
      return `<tr>
        <td>${f.want}</td>
        <td><span class="match match--${status}">${ICONS[status]}<span><span class="visually-hidden">${MATCH_LABELS[status]}: </span>${text}</span></span></td>
      </tr>`;
    }).join('');

    const next = book.best
      ? '<p class="verdict__next">Continue when you’re ready.</p>'
      : `<p class="verdict__next">Take another look at the shelf and choose a different book.</p>
         <div class="detail__actions"><button type="button" class="link-btn" data-action="back-to-shelf">Back to the shelf</button></div>`;

    return `
      <section class="verdict${book.best ? ' verdict--strong' : ''}" tabindex="-1" data-verdict aria-labelledby="verdict-title">
        <p class="verdict__kicker">Your recommendation</p>
        <h4 class="verdict__title" id="verdict-title">${book.verdict}</h4>
        <p class="verdict__body">${book.feedback}</p>
        <table class="match-table">
          <caption class="visually-hidden">How ${book.title} compares with Alex’s preferences</caption>
          <thead><tr><th scope="col">Alex wants</th><th scope="col">This book</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${next}
      </section>`;
  }

  function inspectBook(id) {
    state.inspected = id;
    saveState();
    renderRecommendation();
    $(`[data-book="${id}"].book`).focus();
  }

  function recommendBook(id) {
    state.recommended = id;
    state.inspected = id;
    saveState();
    renderRecommendation();
    const verdict = $('[data-verdict]');
    if (verdict) {
      verdict.focus({ preventScroll: true });
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      verdict.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  /* ---------- 8. Event wiring and start-up ---------- */

  function onClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    switch (action) {
      case 'next': goNext(el); break;
      case 'back': showScreen(state.screen - 1); break;
      case 'restart': restartCourse(); break;
      case 'tab-next': selectTab(el.dataset.target, { focusTab: true }); break;
      case 'pick': pickOption(el.dataset.option); break;
      case 'restart-conversation': restartConversation(); break;
      case 'inspect': inspectBook(el.dataset.book); break;
      case 'recommend': recommendBook(el.dataset.book); break;
      case 'back-to-shelf': {
        const first = $('.book');
        if (first) first.focus();
        break;
      }
      default: break;
    }
  }

  function init() {
    // Place decorative covers (welcome shelf, summary)
    $$('[data-cover]').forEach((el) => { el.innerHTML = coverSVG(el.dataset.cover); });

    buildProgressTrack();
    $$('[role="tab"]').forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab.dataset.tab));
      tab.addEventListener('keydown', onTabKeydown);
    });
    document.addEventListener('click', onClick);

    // Guard against a saved screen whose prerequisites are no longer met
    if (state.screen >= 3 && !isGateOpen('conversation')) state.screen = 2;
    if (state.screen >= 4 && !isGateOpen('recommendation')) state.screen = 3;

    showScreen(state.screen, { moveFocus: false });
  }

  init();
})();
