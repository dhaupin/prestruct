# Highlighting issues (paste-ready, 2026-10-26)

Written with no GitHub write auth available in this workspace (probed:
`gh` installed, not logged in; server git credentials do not reach the
Issues API). Bodies below are paste-ready for the repo named in each
section. Receipts were taken from shallow clones of `dhaupin/flowforge`
and `dhaupin/freestruct` at HEAD, 2026-10-26.

Context: prestruct hit the same gap on its docs (the rig's rouge block
shipped with the adopt) and fixed it in
`dhaupin/prestruct@c915760` (`docs/_layouts/default.html`), verified
pixel-wise live with the eyestruct chain. The fix below is
palette-independent: it rides the theme tokens, so it needs no sheet
change from either repo.

---

## Issue 1 -> dhaupin/flowforge

Title: Code token coverage is partial in docs and web - bash-heavy pages render ~monochrome

New issue (title pre-filled): https://github.com/dhaupin/flowforge/issues/new?title=Code%20token%20coverage%20is%20partial%20in%20docs%20and%20web%20-%20bash-heavy%20pages%20render%20~monochrome

Body:

    The adopted rouge block covers six token classes; Rouge's emitted
    vocabulary is wider, so most real code on bash-heavy guide pages stays
    monochrome. The web landing's hand-painted block has the same hole on
    comments.

    Receipts (file/line, HEAD 2026-10-26):

    - `docs/_layouts/default.html:127-132`: only k/kd/kr/kc, s/s1/s2,
      no/mi/mf/mh, nt/ge, gp/gh, c/c1/cm/cd are painted. Rouge bash emits
      at least nb (builtins: cp, mkdir), nf, nv, sb, se - all unpainted,
      so e.g. `cp ssr.config.example.js ssr.config.js` renders one color
      end to end.
    - `web/src/styles.css:173`: `.code .k` is the only hand-painted span
      class, but `web/src/pages/Home.jsx:37` paints comments as
      `className="cm"` - and there is no `.code .cm` rule, so the shell
      comments in the hero render unpainted (default ink) while keywords
      get the accent.

    Proposed fix (proven on the prestruct docs, same rig): expand the
    vocabulary in both files, mapping onto the existing tokens. Our block
    (palette-independent, rides `--accent/--moss/--err/--accent-deep/
    --ink-soft` with no sheet change):

    ```css
    .highlight .k, .highlight .kd, .highlight .kn, .highlight .kp,
    .highlight .kr, .highlight .kc, .highlight .kv, .highlight .nc,
    .highlight .nd { color: var(--accent); }
    .highlight .nb, .highlight .nv { color: var(--accent); }
    .highlight .nf, .highlight .fm { color: var(--accent-deep); }
    .highlight .s, .highlight .s1, .highlight .s2, .highlight .sb,
    .highlight .se, .highlight .ss, .highlight .sd, .highlight .sx,
    .highlight .si { color: var(--moss); }
    .highlight .no, .highlight .mi, .highlight .mf, .highlight .mh { color: var(--accent-deep); }
    .highlight .gi { color: var(--moss); }
    .highlight .nt, .highlight .ge, .highlight .gd { color: var(--err); }
    .highlight .gp, .highlight .gh { color: var(--ink-soft); font-weight: 600; }
    .highlight .c, .highlight .c1, .highlight .cm, .highlight .cd,
    .highlight .cs, .highlight .ch { color: var(--ink-soft); font-style: italic; }
    ```

    Plus two web-side lines for the hand-painted block:

    ```css
    .code .cm, .code .c, .code .c1 { color: var(--ink-soft); font-style: italic; }
    .code .nb, .code .nf, .code .fm { color: var(--accent-deep); }
    ```

    Landing this in the rig `docs/_layouts/default.html` means every
    adopter inherits coverage instead of re-finding the gap like we did.
    Verified pixel-wise on the live prestruct docs after expanding:
    `docs.creadev.org/prestruct/guides/getting-started` now paints
    builtins (accent), strings (moss), comments (soft italic), flags
    (err) - a `look` receipt is in that repo's eyes ledger.

---

## Issue 2 -> dhaupin/freestruct

Title: Docs code fences render monochrome - rouge block covers 6 token classes and most fences carry no language tag

New issue (title pre-filled): https://github.com/dhaupin/freestruct/issues/new?title=Docs%20code%20fences%20render%20monochrome%20-%20rouge%20block%20covers%206%20token%20classes%20and%20most%20fences%20carry%20no%20language%20tag

Body:

    The docs adopt the same six-line rouge token block as the flowforge
    rig, and most fenced blocks in the docs carry no language tag, so
    rouge never emits token spans for them. Two stacked causes, so two
    fixes:

    Receipts (file/line, HEAD 2026-10-26):

    - `docs/_layouts/default.html:118-123`: same partial vocabulary as
      the rig (k/s/no/mi/mf/mh/nt/gp/gh/c families only). Rouge bash/js
      emit nb/nf/nv/sb/se strings too - unpainted everywhere they occur.
    - Fence-language census: in `docs/configuration.md` and
      `docs/contributing/style.md`, only 2 of 4 fences are tagged
      (`text`, `yaml`); the rest are bare ``` fences. Untagged fences
      emit zero token spans regardless of CSS. The whole docs tree has
      zero `language-bash` occurrences.
    - `docs/_config.yml:21` confirms `syntax_highlighter: rouge`, so the
      engine is already doing the work when fences are tagged.

    Proposed fix:

    1. Tag the fences (`bash`, `js`, `json`, `yaml`...) so rouge can run.
    2. Expand the token block to the full common vocabulary - the exact
       block we shipped and verified on prestruct's docs (prestruct
       commit c915760, receipts in that repo's eyes ledger):

    ```css
    .highlight .k, .highlight .kd, .highlight .kn, .highlight .kp,
    .highlight .kr, .highlight .kc, .highlight .kv, .highlight .nc,
    .highlight .nd { color: var(--accent); }
    .highlight .nb, .highlight .nv { color: var(--accent); }
    .highlight .nf, .highlight .fm { color: var(--accent-deep); }
    .highlight .s, .highlight .s1, .highlight .s2, .highlight .sb,
    .highlight .se, .highlight .ss, .highlight .sd, .highlight .sx,
    .highlight .si { color: var(--moss); }
    .highlight .no, .highlight .mi, .highlight .mf, .highlight .mh { color: var(--accent-deep); }
    .highlight .gi { color: var(--moss); }
    .highlight .nt, .highlight .ge, .highlight .gd { color: var(--err); }
    .highlight .gp, .highlight .gh { color: var(--ink-soft); font-weight: 600; }
    .highlight .c, .highlight .c1, .highlight .cm, .highlight .cd,
    .highlight .cs, .highlight .ch { color: var(--ink-soft); font-style: italic; }
    ```

    Palette-independent: rides your existing tokens, no sheet change
    needed; the light theme re-tunes every rule for free.

---

Both bodies follow CONTENT.md: receipts named to file/line, claims
verified pre-filing, no marketing language.
