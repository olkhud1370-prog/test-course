/* ==========================================================================
   Find Their Next Great Read · The Linden Bookshop
   Vanilla JavaScript. No build step, no dependencies.

   1. Content data (screens, conversation, books, profile)
   2. Icons and images
   3. Learner state (sessionStorage)
   4. Navigation, progress, and the course nav bar
   5. Screen 2: framework tabs
   6. Screen 3: branching conversation
   7. Reader profile (bookseller's notes)
   8. Screen 4: the book display
   9. Event wiring and start-up
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Content data ---------- */

  // nav: label and gate for the Continue button in the course nav bar.
  const SCREENS = [
    { id: 'welcome', title: 'Welcome', nav: null },
    { id: 'framework', title: 'The art of recommending', nav: { label: 'Continue', gate: 'framework', hint: 'Explore all three steps to continue.' } },
    { id: 'conversation', title: 'Behind the counter', nav: { label: 'Find a book for Alex', gate: 'conversation', hint: 'Discover all four of Alex’s preferences to continue.' } },
    { id: 'recommendation', title: 'Your recommendation', nav: { label: 'Continue', gate: 'recommendation', hint: 'Recommend the strongest match for Alex to continue.' } },
    { id: 'summary', title: 'Take it to the floor', nav: { label: 'Start again', action: 'restart', icon: 'restart' } },
  ];

  const TABS = ['ask', 'listen', 'match'];

  // The four preferences the learner must uncover.
  // value: how it reads in the reader profile; want: how it reads in the comparison table.
  const PROFILE_FIELDS = [
    { key: 'genre', value: 'Enjoys mysteries', want: 'A mystery' },
    { key: 'experience', value: 'Prefers atmospheric, character-driven stories', want: 'Atmospheric and character-driven' },
    { key: 'avoid', value: 'Does not enjoy graphic violence', want: 'No graphic violence' },
    { key: 'format', value: 'Wants a standalone novel', want: 'A standalone novel' },
  ];

  const OPENING_LINE = '“I’m looking for something to read this weekend, but I have no idea what I want.”';

  // Each decision has a goal: the preferences it is designed to uncover.
  // The learner keeps choosing (from options not yet used) until the goal is
  // met, so every path reveals all four preferences.
  // quality: 'strong' | 'reasonable' | 'early' (recommending before listening)
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

  const COACH_ICON = { strong: 'check-circle', reasonable: 'info', early: 'alert' };

  // fit: strong | close | poor. match: [status, what this book offers]
  const BOOKS = [
    {
      id: 'lantern',
      title: 'The Lantern House',
      author: 'Maren Ellery',
      cover: 'assets/lantern-house.jpg',
      size: [222, 301],
      description: 'An atmospheric standalone mystery about a retired librarian investigating a disappearance in a quiet coastal town. Character-driven, with minimal violence.',
      fit: 'strong',
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
      cover: 'assets/last-witness.jpg',
      size: [210, 301],
      description: 'A fast-paced crime thriller featuring graphic violence and a detective racing against time.',
      fit: 'poor',
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
      cover: 'assets/hollow-crown.jpg',
      size: [213, 301],
      description: 'A richly detailed fantasy adventure and the first installment in a five-book series.',
      fit: 'poor',
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
      cover: 'assets/secrets-ashwood.jpg',
      size: [212, 301],
      description: 'An atmospheric, character-driven mystery with minimal violence. The first book in an ongoing series with an unresolved central mystery.',
      fit: 'close',
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

  const FIT_ICON = { strong: 'check-circle', close: 'info', poor: 'alert' };
  const MATCH_ICON = { yes: 'check', no: 'x', partial: 'half', unknown: 'minus' };
  const MATCH_LABEL = { yes: 'Matches', no: 'Does not match', partial: 'Partial match', unknown: 'Unclear' };

  /* ---------- 2. Icons and images ---------- */

  // One outline icon family: 24px grid, 1.8 stroke, rounded caps and joins.
  const ICON_PATHS = {
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M20.5 11.5a8 8 0 0 1-11.8 7l-4.2 1.3 1.3-3.9a8 8 0 1 1 14.7-4.4z"/><path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" stroke-width="2.4"/>',
    ear: '<path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 5.5-5.5 5.7-5.5 9.5a3.5 3.5 0 0 1-7 .5"/><path d="M15.5 9a3 3 0 1 0-6 0c0 1.6 1.5 2.2 1.5 3.5"/>',
    book: '<path d="M3 5.5c3-1 6-1 9 1.5v13c-3-2.5-6-2.5-9-1.5z"/><path d="M21 5.5c-3-1-6-1-9 1.5v13c3-2.5 6-2.5 9-1.5z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.5-4.5"/>',
    quote: '<path d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5V12h5V7zM10 12c0 3-1.5 4.5-4 5.5M19 7h-3.5A1.5 1.5 0 0 0 14 8.5V12h5V7zM19 12c0 3-1.5 4.5-4 5.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01" stroke-width="2.2"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.2M12 16.2h.01" stroke-width="2.2"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    minus: '<path d="M6 12h12"/>',
    half: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 4v4.5h4.5"/>',
    bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[name] || ''}</svg>`;
  }
  const iconSpan = (name) => `<span class="icon">${icon(name)}</span>`;

  function fillIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  }

  const AVATAR = '<img class="avatar" src="assets/alex-portrait.jpg" alt="" width="119" height="120">';

  function coverImg(book) {
    return `<img src="${book.cover}" alt="" width="${book.size[0]}" height="${book.size[1]}">`;
  }

  /* ---------- 3. Learner state ---------- */

  const STORAGE_KEY = 'linden-next-great-read:v1';

  function freshState() {
    return {
      screen: 0,
      activeTab: 'ask',
      tabsViewed: ['ask'],
      picks: [],          // option ids chosen in the conversation, in order
      inspected: null,    // book id currently selected on the display
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
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollToEl(el, block = 'start') {
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
  }

  /* ---------- 4. Navigation, progress, and the course nav bar ---------- */

  const screenEls = $$('[data-screen]');
  const nav = $('[data-course-nav]');
  const navNext = $('[data-nav-next]');
  const navHint = $('[data-nav-hint]');

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

  function isGateOpen(name) {
    if (name === 'framework') return TABS.every((t) => state.tabsViewed.includes(t));
    if (name === 'conversation') return deriveConversation(state.picks).complete;
    if (name === 'recommendation') return state.recommended === 'lantern';
    return true;
  }

  // Configures the shared Back / Continue bar for the current screen.
  function renderNav() {
    const config = SCREENS[state.screen].nav;
    nav.hidden = !config;
    if (!config) return;

    $('[data-nav-next-label]').textContent = config.label;
    const iconEl = $('[data-nav-next-icon]');
    iconEl.dataset.icon = config.icon || 'arrow-right';
    iconEl.innerHTML = icon(iconEl.dataset.icon);
    navNext.dataset.action = config.action || 'next';

    if (config.gate) navNext.dataset.gate = config.gate;
    else delete navNext.dataset.gate;
    updateGate();
  }

  function updateGate() {
    const config = SCREENS[state.screen].nav;
    const open = !config || !config.gate || isGateOpen(config.gate);
    navHint.classList.remove('is-nudged');
    if (open) {
      navNext.removeAttribute('aria-disabled');
      navNext.removeAttribute('aria-describedby');
      navHint.textContent = '';
    } else {
      navNext.setAttribute('aria-disabled', 'true');
      navNext.setAttribute('aria-describedby', navHint.id);
      navHint.textContent = config.hint;
    }
  }

  function showScreen(index, { moveFocus = true } = {}) {
    state.screen = Math.min(Math.max(index, 0), SCREENS.length - 1);
    saveState();

    const id = SCREENS[state.screen].id;
    screenEls.forEach((el, i) => { el.hidden = i !== state.screen; });
    document.body.dataset.screenId = id;
    document.title = `${SCREENS[state.screen].title} · Find Their Next Great Read`;
    renderProgress();

    if (id === 'framework') renderFramework();
    if (id === 'conversation') renderConversation();
    if (id === 'recommendation') renderRecommendation();
    renderNav();

    if (moveFocus) {
      window.scrollTo(0, 0);
      const target = $('[data-focus-target]', screenEls[state.screen]);
      if (target) target.focus({ preventScroll: true });
    }
  }

  function goNext(btn) {
    const gate = btn && btn.dataset.gate;
    if (gate && !isGateOpen(gate)) {
      navHint.classList.remove('is-nudged');
      void navHint.offsetWidth; // restart the nudge styling
      navHint.classList.add('is-nudged');
      return;
    }
    showScreen(state.screen + 1);
  }

  function restartCourse() {
    state = freshState();
    saveState();
    showScreen(0);
  }

  /* ---------- 5. Screen 2: framework tabs ---------- */

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
        ? `${iconSpan('check')}<span class="visually-hidden">(viewed)</span>`
        : '';
    });
    updateGate();
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

  /* ---------- 6. Screen 3: branching conversation ---------- */

  // Replays the learner's picks to work out where the conversation stands.
  // Deriving everything from the list of picks keeps Back, refresh, and
  // restart predictable.
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

  function msgHTML(speaker, text) {
    const isAlex = speaker === 'alex';
    return `<div class="msg msg--${speaker}">
        ${isAlex ? AVATAR : ''}
        <div class="msg__body">
          <p class="msg__name">${isAlex ? 'Alex' : 'You'}</p>
          <p class="msg__bubble">${text}</p>
        </div>
      </div>`;
  }

  function coachHTML(entry) {
    const { option, newly } = entry;
    const added = newly.length
      ? `<p class="coach__added">Added to Alex’s profile: ${newly
          .map((k) => `<span class="tag">${PROFILE_FIELDS.find((f) => f.key === k).value}</span>`)
          .join(' ')}</p>`
      : '';
    return `<div class="coach coach--${option.quality}">
        ${iconSpan(COACH_ICON[option.quality])}
        <div>
          <p class="coach__verdict"><span class="visually-hidden">Feedback: </span>${option.verdict}</p>
          <p>${option.feedback}</p>
          ${added}
        </div>
      </div>`;
  }

  function renderConversation({ newestIndex = -1 } = {}) {
    const convo = deriveConversation(state.picks);

    let html = msgHTML('alex', OPENING_LINE);
    convo.entries.forEach((entry, i) => {
      const isNew = i === newestIndex;
      html += `<div class="exchange${isNew ? ' is-entering' : ''}"${isNew ? ' tabindex="-1" data-newest' : ''}>
        ${msgHTML('you', entry.option.text)}
        ${msgHTML('alex', entry.option.reply)}
        ${coachHTML(entry)}
      </div>`;
    });
    if (convo.complete) {
      html += `<p class="dialogue__close${newestIndex >= 0 ? ' is-entering' : ''}">${iconSpan('check-circle')}You now have a clear picture of what Alex is looking for.</p>`;
    }
    $('[data-transcript]').innerHTML = html;

    const choices = $('[data-choices]');
    choices.hidden = convo.complete;
    if (!convo.complete) {
      const decision = DECISIONS[convo.step];
      const remaining = decision.options.filter((o) => !convo.used[convo.step].has(o.id));
      $('[data-choices-list]').innerHTML = remaining
        .map((o, i) => `<button type="button" class="choice" data-action="pick" data-option="${o.id}">
            <span class="choice__key" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
            <span>${o.text}</span>
            <span class="choice__go">${icon('arrow-right')}</span>
          </button>`)
        .join('');
      $('[data-choices-legend]').textContent = convo.entries.length ? 'What do you say next?' : 'How do you respond?';
    }

    const newest = newestIndex >= 0 ? convo.entries[newestIndex] : null;
    renderProfiles(convo.revealed, newest ? newest.newly : []);
    updateGate();
  }

  function pickOption(id) {
    state.picks.push(id);
    saveState();
    renderConversation({ newestIndex: deriveConversation(state.picks).entries.length - 1 });
    const newest = $('[data-newest]');
    if (newest) {
      newest.focus({ preventScroll: true });
      scrollToEl(newest);
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

  /* ---------- 7. Reader profile (bookseller's notes) ---------- */

  // Shows only what Alex has actually shared.
  function renderProfiles(revealed, highlight = []) {
    const found = PROFILE_FIELDS.filter((f) => revealed.has(f.key));
    const dots = PROFILE_FIELDS.map((_, i) => `<span${i < found.length ? ' class="is-on"' : ''}></span>`).join('');
    const items = found.length
      ? found.map((f) => `<li class="notes__item${highlight.includes(f.key) ? ' is-new' : ''}">${iconSpan('check')}<span>${f.value}</span></li>`).join('')
      : '<li class="notes__empty">Nothing noted yet. Alex’s preferences will appear here as you discover them.</li>';

    $$('[data-profile]').forEach((host, n) => {
      host.innerHTML = `
        <section class="notes" aria-labelledby="notes-title-${n}">
          <div class="notes__head">
            <img class="avatar avatar--lg" src="assets/alex-portrait.jpg" alt="" width="119" height="120">
            <div>
              <p class="notes__kicker">Bookseller’s notes</p>
              <h3 class="notes__title" id="notes-title-${n}">Reader profile: Alex</h3>
            </div>
          </div>
          <p class="notes__meter"><span class="notes__dots" aria-hidden="true">${dots}</span>${found.length} of ${PROFILE_FIELDS.length} preferences noted</p>
          <ul class="notes__list">${items}</ul>
        </section>`;
    });

    if (highlight.length) {
      window.setTimeout(() => $$('.notes__item.is-new').forEach((r) => r.classList.remove('is-new')), 2400);
    }
  }

  /* ---------- 8. Screen 4: the book display ---------- */

  function labelHTML(book, isPick) {
    return `<span class="talker__title">${book.title}</span>
      <span class="talker__author">${book.author}</span>
      ${isPick ? `<span class="talker__status">${iconSpan('bookmark')}Recommended</span>` : ''}`;
  }

  function renderRecommendation() {
    renderProfiles(deriveConversation(state.picks).revealed);

    $('[data-shelf]').innerHTML = BOOKS.map((b) => {
      const isPick = state.recommended === b.id;
      return `<li>
        <button type="button" class="book" data-action="inspect" data-book="${b.id}" aria-pressed="${state.inspected === b.id}">
          <span class="book__flag" aria-hidden="true">${iconSpan('check')}Selected</span>
          <span class="book__frame">${coverImg(b)}</span>
          ${isPick ? '<svg class="book__ribbon" viewBox="0 0 24 32" aria-hidden="true" focusable="false"><path d="M0 0h24v32l-12-8-12 8z" fill="currentColor"/></svg>' : ''}
          <span class="book__label visually-hidden">${labelHTML(b, isPick)}</span>
        </button>
      </li>`;
    }).join('');

    $('[data-talkers]').innerHTML = BOOKS.map((b) => `<li class="talker">${labelHTML(b, state.recommended === b.id)}</li>`).join('');

    renderDetail();
    updateGate();
  }

  function renderDetail() {
    const host = $('[data-detail]');
    const book = BOOKS.find((b) => b.id === state.inspected);
    if (!book) {
      host.innerHTML = `<p class="detail__empty">${iconSpan('search')}Select a book from the display to read its description.</p>`;
      return;
    }

    const isPick = state.recommended === book.id;
    let action = '';
    if (!isPick) {
      const label = state.recommended ? 'Recommend this one instead' : 'Recommend to Alex';
      action = `<button type="button" class="btn btn--primary" data-action="recommend" data-book="${book.id}">${label}${iconSpan('arrow-right')}</button>`;
    }

    host.innerHTML = `
      <article class="detail__card" aria-labelledby="detail-title">
        <div>
          <p class="detail__kicker">${isPick ? 'Your recommendation' : 'Selected'}</p>
          <h3 class="detail__title" id="detail-title">${book.title}</h3>
          <p class="detail__author">${book.author}</p>
          <p class="detail__desc">${book.description}</p>
        </div>
        ${action ? `<div class="detail__actions">${action}</div>` : ''}
      </article>
      ${isPick ? verdictHTML(book) : ''}`;
  }

  function verdictHTML(book) {
    const rows = PROFILE_FIELDS.map((f) => {
      const [status, text] = book.match[f.key];
      return `<tr>
        <td>${f.want}</td>
        <td><span class="match match--${status}">${iconSpan(MATCH_ICON[status])}<span><span class="visually-hidden">${MATCH_LABEL[status]}: </span>${text}</span></span></td>
      </tr>`;
    }).join('');

    const next = book.fit === 'strong'
      ? '<p class="verdict__next">Continue when you’re ready.</p>'
      : `<p class="verdict__next">Take another look at the display and choose a different book.</p>
         <p><button type="button" class="link-btn" data-action="back-to-shelf">Back to the display${iconSpan('arrow-right')}</button></p>`;

    return `
      <section class="verdict verdict--${book.fit}" tabindex="-1" data-verdict aria-labelledby="verdict-title">
        <div class="verdict__head">
          ${iconSpan(FIT_ICON[book.fit])}
          <div>
            <p class="verdict__kicker">Feedback</p>
            <h4 class="verdict__title" id="verdict-title">${book.verdict}</h4>
          </div>
        </div>
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
    $(`.book[data-book="${id}"]`).focus({ preventScroll: true });
    scrollToEl($('[data-detail]'), 'nearest');
  }

  function recommendBook(id) {
    state.recommended = id;
    state.inspected = id;
    saveState();
    renderRecommendation();
    const verdict = $('[data-verdict]');
    if (verdict) {
      verdict.focus({ preventScroll: true });
      scrollToEl(verdict, 'nearest');
    }
  }

  /* ---------- 9. Event wiring and start-up ---------- */

  function onClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el) return;

    switch (el.dataset.action) {
      case 'next': goNext(el); break;
      case 'back': showScreen(state.screen - 1); break;
      case 'restart': restartCourse(); break;
      case 'tab-next': selectTab(el.dataset.target, { focusTab: true }); break;
      case 'pick': pickOption(el.dataset.option); break;
      case 'restart-conversation': restartConversation(); break;
      case 'inspect': inspectBook(el.dataset.book); break;
      case 'recommend': recommendBook(el.dataset.book); break;
      case 'back-to-shelf': {
        const target = $('.book[aria-pressed="true"]') || $('.book');
        if (target) { target.focus({ preventScroll: true }); scrollToEl($('.display'), 'start'); }
        break;
      }
      default: break;
    }
  }

  function init() {
    fillIcons();
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
