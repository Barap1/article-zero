# Article Zero interface contract

Article Zero is a calm, editorial policy workspace for people who need to see the difference between human policy, an agent proposal, and an enforced result. The existing constitutional visual language stays intact: warm paper, ink-black structure, one muted teal accent, and deliberate serif display type used for policy language.

## Tokens

- **Color:** paper `#f2eee4`, elevated surface `#fffdf7`, ink `#171813`, muted ink `#66675e`, line `#c9c1b1`, strong line `#8f8a7e`, accent `#1e665d`, danger `#a43a2e`, warning `#915919`.
- **Type:** body uses the declared system sans stack `ui-sans-serif, system-ui, sans-serif`; display and policy prose use `Georgia, "Times New Roman", serif`; identifiers use `ui-monospace, monospace`. No undeclared web font is referenced.
- **Scale:** body `1rem`, readable supporting copy `0.875rem`, compact metadata `0.75rem`, display headings use responsive `clamp()` values. Labels may be uppercase through styling, but source copy remains sentence case.
- **Rhythm:** base spacing is `0.25rem`; surfaces use `1rem` to `1.5rem` padding; grid children always allow shrinking with `min-width: 0`.
- **Controls:** controls are at least `2.75rem` high, square-cornered with a small radius, and share visible teal focus rings. Primary actions use ink with a restrained teal lift; secondary actions use paper surfaces and strong lines.
- **Status:** status is carried by plain-language labels plus restrained color; source labels explicitly distinguish Live Groq, limited sample fallback, and frozen replay.

## Layout and interaction

- The header is a stable home/control band. Version and provider setup context belongs in the home or workspace body, not in the global header.
- Policy review is summary-first. Basics stay visible; permissions, conditions, advanced controls, natural-language revision, raw JSON, and the graph are collapsible.
- Graph nodes remain keyboard-operable. The graph gets a concise screen-reader-only description; no large visible text alternative is rendered.
- Incident, amendment, testing, replay, and completion screens keep one obvious primary action. Secondary evidence is progressively disclosed with native `details` elements.
- Motion communicates a state transition only, uses transform/opacity, and honors `prefers-reduced-motion`.

## Responsive states

- At desktop width, header controls stay on one line and the workspace uses a two-column rail/content layout.
- At tablet width, header controls become compact icon buttons with accessible names and policy grids reduce columns.
- At mobile width, the rail becomes a horizontal stage strip, all content becomes one column, and long labels wrap safely without horizontal page overflow.
