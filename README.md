# Find Their Next Great Read

A 3 to 5 minute HTML5 microlearning experience for new booksellers at **The Linden Bookshop**, a fictional independent bookstore.

**Learning objective:** Given a customer seeking a book recommendation, use open-ended questions and customer preferences to identify and recommend a suitable book.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and all five screens |
| `styles.css` | Design tokens (palette, type, spacing), layout, and components |
| `script.js` | Navigation, learner state, conversation branching, reader profile, book selection, and the SVG book covers |
| `CLAUDE.md` | Project and development standards |
| `assets/` | Approved brand assets: logo, brand lockup, bookshop photo, Alex portrait, and the four book covers |
| `design/design-system.md` | Visual design system (tokens, type, layout, screen direction) |
| `design/brand-board.png` | Brand board, the visual reference for the design system (not used in the course itself) |
| `design/CLAUDE-RESTYLE-PROMPT.txt` | Brief for the upcoming restyle |

There is no build step and no external dependency. The fonts are system fonts, and the book covers are inline SVG, so the course works offline.

### Screens

1. **Welcome**: an editorial title screen with an illustrated bookshelf.
2. **The art of recommending**: the Ask, Listen, Match framework, presented as keyboard-accessible tabs. Learners view all three steps before continuing.
3. **Behind the counter**: a branching conversation with Alex. Each choice gets contextual feedback, and a reader profile fills in as preferences are uncovered. Learners continue once all four preferences are discovered.
4. **Your recommendation**: four books with distinctive covers. Learners inspect each book, make a recommendation, and see how it compares with Alex's preferences. They can reconsider until they choose the strongest match.
5. **Take it to the floor**: a framework summary, a model recommendation, and a restart option.

## Preview locally

**Option 1: open the file.** Double-click `index.html`. Everything works directly from the file system.

**Option 2: run a local server** (closer to how it behaves when hosted):

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish

### GitHub Pages

1. Push the files to your repository's default branch (or merge this branch into it).
2. In the repository on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch, and set the folder to `/ (root)`.
4. Save. The site appears at `https://<username>.github.io/<repository>/` within a minute or two.

### Netlify

- **Drag and drop:** sign in at app.netlify.com, open **Sites**, and drop the project folder onto the deploy area.
- **From Git:** choose **Add new site → Import an existing project**, connect the repository, leave the build command empty, and set the publish directory to `/`.

All paths are relative, so the course works from any subfolder or domain.

## Accessibility and behavior notes

- Full keyboard support, with a skip link, visible focus states, and arrow-key navigation between tabs.
- Focus moves to each new screen heading, to each new conversation exchange, and to recommendation feedback, so screen reader users hear new content.
- Animations are turned off when the learner's system requests reduced motion.
- Responsive from phone to desktop. On narrower screens the reader profile moves above the activity so it stays in view.
- Learner progress is saved in `sessionStorage`, so a page refresh keeps the learner's place. Closing the tab, or selecting **Start again**, clears it.

## Not included

- There is no SCORM or xAPI tracking. The course is a standalone static site. Completion tracking for an LMS would need a wrapper, which could be added later.
