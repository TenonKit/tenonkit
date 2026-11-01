import type { Lang } from '../../shared/project'

export type ComponentDef = {
  type: string
  name: string
  group: 'Sections' | 'React' | 'Elements' | 'My components'
  lang?: Lang
  code: string
  css: string
}

const img = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

const TOKENS = `:root {
  --ink: #16181d;
  --paper: #ffffff;
  --soft: #f2f3ef;
  --muted: #565a61;
  --brand: #1b6c80;
  --brand-ink: #ffffff;
  --radius: 10px;
  --max: 1120px;
  --font: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
}`

const ELEMENTS = `body {
  margin: 0;
  font-family: var(--font);
  color: var(--ink);
  background: var(--paper);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
h1, h2, h3 { font-weight: 700; line-height: 1.08; letter-spacing: -0.02em; margin: 0; }`

const CLASSES = `.wrap { max-width: var(--max); margin: 0 auto; padding: 0 24px; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 46px; padding: 0 22px; border: 0; border-radius: 999px;
  background: var(--ink); color: var(--paper);
  font: 600 15px/1 var(--font); text-decoration: none; cursor: pointer;
}
.btn.alt { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px currentColor; }`

const indent = (css: string): string => css.replace(/^/gm, '  ')

/** The page CSS a new project starts with: design tokens, base styles and .wrap/.btn. */
export function pageCss(tailwind: boolean): string {
  if (!tailwind)
    return `${TOKENS}

* { box-sizing: border-box; }
${ELEMENTS}

${CLASSES}
`
  return `@import "tailwindcss";

${TOKENS}

/* Tailwind classes can use the tokens: bg-brand, text-ink, bg-soft, font-sans… */
@theme inline {
  --color-ink: var(--ink);
  --color-paper: var(--paper);
  --color-soft: var(--soft);
  --color-muted: var(--muted);
  --color-brand: var(--brand);
  --color-brand-ink: var(--brand-ink);
  --font-sans: var(--font);
}

@layer base {
${indent(ELEMENTS)}
}

@layer components {
${indent(CLASSES)}
}
`
}

export const REACT_STARTER: ComponentDef = {
  type: 'react-custom',
  name: 'Custom React',
  group: 'React',
  lang: 'jsx',
  code: `export default function MyComponent() {
  const steps = ['Design', 'Build', 'Launch']

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-bold tracking-tight text-ink">A React component</h2>
      <p className="mt-3 max-w-xl text-lg text-muted">
        Write JSX and style it with Tailwind classes. The page updates as you type.
      </p>
      <ul className="mt-8 flex flex-wrap gap-3">
        {steps.map((step) => (
          <li key={step} className="rounded-full bg-soft px-4 py-2 text-sm font-medium">
            {step}
          </li>
        ))}
      </ul>
    </section>
  )
}
`,
  css: ''
}

const REACT: ComponentDef[] = [
  {
    type: 'react-features',
    name: 'Features',
    group: 'React',
    lang: 'jsx',
    code: `const features = [
  { title: 'Identity', text: 'A name check, a logo you can stamp on a box, and the colours and type to go with it.' },
  { title: 'Websites', text: 'Fast, hand-built sites you can edit yourself, with hosting set up for you.' },
  { title: 'Print', text: 'Menus, labels, signage and packaging, checked on proof before they ship.' }
]

export default function Features() {
  return (
    <section className="mx-auto max-w-280 px-6 py-16 md:py-24">
      <h2 className="text-3xl font-bold tracking-tight md:text-5xl">What we do</h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="border-t-2 border-ink pt-5">
            <h3 className="text-xl font-bold">{f.title}</h3>
            <p className="mt-2 text-muted">{f.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
`,
    css: ''
  },
  {
    type: 'react-pricing',
    name: 'Pricing',
    group: 'React',
    lang: 'jsx',
    code: `const plans = [
  { name: 'Starter', price: '$2,400', items: ['Logo and colours', 'One-page website', 'Two rounds of changes'] },
  { name: 'Studio', price: '$6,800', items: ['Full identity', 'Website up to 8 pages', 'Print templates'], main: true },
  { name: 'Ongoing', price: '$900', per: '/month', items: ['Updates and new pages', 'Seasonal campaigns', 'Cancel any time'] }
]

export default function Pricing() {
  return (
    <section className="mx-auto max-w-280 px-6 py-16 md:py-24">
      <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Pricing</h2>
      <div className="mt-10 grid items-start gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={\`rounded-xl p-8 \${plan.main ? 'bg-ink text-paper' : 'bg-soft'}\`}
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-3 mb-5 text-4xl font-bold tracking-tight">
              {plan.price}
              {plan.per && <span className="text-base font-normal opacity-70">{plan.per}</span>}
            </p>
            <ul className="space-y-2">
              {plan.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {plan.main && (
              <a href="#contact" className="btn mt-7 w-full bg-paper text-ink">
                Book a call
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
`,
    css: ''
  },
  REACT_STARTER
]

export const LIBRARY: ComponentDef[] = [
  {
    type: 'nav',
    name: 'Navigation',
    group: 'Sections',
    code: `<header class="wrap nav">
  <a class="logo" href="#">Fieldnote</a>
  <nav>
    <a href="#work">Work</a>
    <a href="#services">Services</a>
    <a href="#about">About</a>
  </nav>
  <a class="btn" href="#contact">Get in touch</a>
</header>`,
    css: `.nav { display: flex; align-items: center; gap: 32px; padding-block: 20px; }
.logo { font-weight: 700; font-size: 19px; color: var(--ink); text-decoration: none; }
nav { display: flex; gap: 28px; margin-left: auto; }
nav a { color: var(--muted); text-decoration: none; font-size: 15px; }
nav a:hover { color: var(--ink); }
@media (max-width: 640px) {
  nav { display: none; }
  .btn { margin-left: auto; }
}`
  },
  {
    type: 'hero',
    name: 'Hero',
    group: 'Sections',
    code: `<section class="wrap hero">
  <h1>Brand and web design for small, stubborn companies.</h1>
  <p>We help independent shops, studios and makers look as good online as they are in person. Two designers, one project at a time.</p>
  <div class="actions">
    <a class="btn" href="#contact">Start a project</a>
    <a class="btn alt" href="#work">See our work</a>
  </div>
</section>`,
    css: `.hero { padding-block: clamp(56px, 8vw, 96px) clamp(64px, 10vw, 120px); }
h1 { font-size: clamp(40px, 7vw, 88px); max-width: 16ch; }
p { font-size: 20px; color: var(--muted); max-width: 52ch; margin: 28px 0 36px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }`
  },
  {
    type: 'hero-image',
    name: 'Hero with image',
    group: 'Sections',
    code: `<section class="wrap split">
  <div>
    <h1>Bread baked before the city wakes up.</h1>
    <p>Sourdough, rye and seasonal pastries from our oven on Harbour Street. Open Tuesday to Sunday from 7am.</p>
    <a class="btn" href="#visit">Plan a visit</a>
  </div>
  <img src="${img('bakery', 1100, 1300)}" alt="Loaves of bread cooling on a rack">
</section>`,
    css: `.split { display: grid; grid-template-columns: 1.1fr 1fr; gap: 64px; align-items: center; padding-block: 72px; }
h1 { font-size: clamp(38px, 5.4vw, 72px); }
p { font-size: 19px; color: var(--muted); margin: 24px 0 32px; max-width: 46ch; }
img { width: 100%; aspect-ratio: 5 / 6; object-fit: cover; border-radius: var(--radius); }
@media (max-width: 800px) { .split { grid-template-columns: 1fr; gap: 40px; } }`
  },
  {
    type: 'features',
    name: 'Feature list',
    group: 'Sections',
    code: `<section class="wrap features" id="services">
  <h2>What we do</h2>
  <div class="grid">
    <article>
      <h3>Identity</h3>
      <p>A name check, a logo you can stamp on a box, and the colours and type to go with it.</p>
    </article>
    <article>
      <h3>Websites</h3>
      <p>Fast, hand-built sites that you can edit yourself, with hosting set up for you.</p>
    </article>
    <article>
      <h3>Print</h3>
      <p>Menus, labels, signage and packaging, sent to a printer we trust and checked on proof.</p>
    </article>
  </div>
</section>`,
    css: `.features { padding-block: clamp(56px, 8vw, 96px); }
h2 { font-size: clamp(30px, 4vw, 48px); margin-bottom: 48px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
article { padding-top: 20px; border-top: 2px solid var(--ink); }
h3 { font-size: 22px; margin-bottom: 10px; }
article p { color: var(--muted); margin: 0; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }`
  },
  {
    type: 'about',
    name: 'Image and text',
    group: 'Sections',
    code: `<section class="about" id="about">
  <div class="wrap inner">
    <img src="${img('studio', 1200, 900)}" alt="A desk with sketches and colour swatches">
    <div>
      <h2>A small studio on purpose</h2>
      <p>Every project is designed by the two people you meet on the first call. No account managers, no hand-offs, and you always know who to ring.</p>
      <p>We take on eight clients a year so each one gets our full attention.</p>
    </div>
  </div>
</section>`,
    css: `.about { background: var(--soft); padding-block: clamp(56px, 8vw, 96px); }
.inner { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius); }
h2 { font-size: clamp(28px, 3.6vw, 44px); margin-bottom: 20px; }
p { font-size: 18px; color: var(--muted); max-width: 48ch; margin: 0; }
p + p { margin-top: 16px; }
@media (max-width: 800px) { .inner { grid-template-columns: 1fr; gap: 32px; } }`
  },
  {
    type: 'gallery',
    name: 'Gallery',
    group: 'Sections',
    code: `<section class="wrap gallery" id="work">
  <h2>Recent work</h2>
  <div class="grid">
    <figure><img src="${img('work-a', 900, 1100)}" alt=""><figcaption>Harbour Bakery, identity</figcaption></figure>
    <figure><img src="${img('work-b', 900, 1100)}" alt=""><figcaption>Moss &amp; Stone, website</figcaption></figure>
    <figure><img src="${img('work-c', 900, 1100)}" alt=""><figcaption>Kiln Coffee, packaging</figcaption></figure>
  </div>
</section>`,
    css: `.gallery { padding-block: clamp(56px, 8vw, 96px); }
h2 { font-size: clamp(30px, 4vw, 48px); margin-bottom: 40px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
figure { margin: 0; }
img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--radius); }
figcaption { margin-top: 12px; font-size: 15px; color: var(--muted); }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }`
  },
  {
    type: 'pricing',
    name: 'Pricing',
    group: 'Sections',
    code: `<section class="wrap pricing">
  <h2>Pricing</h2>
  <div class="plans">
    <div class="plan">
      <h3>Starter</h3>
      <p class="price">$2,400</p>
      <ul><li>Logo and colours</li><li>One-page website</li><li>Two rounds of changes</li></ul>
    </div>
    <div class="plan main">
      <h3>Studio</h3>
      <p class="price">$6,800</p>
      <ul><li>Full identity</li><li>Website up to 8 pages</li><li>Print templates</li></ul>
      <a class="btn" href="#contact">Book a call</a>
    </div>
    <div class="plan">
      <h3>Ongoing</h3>
      <p class="price">$900<span>/month</span></p>
      <ul><li>Updates and new pages</li><li>Seasonal campaigns</li><li>Cancel any time</li></ul>
    </div>
  </div>
</section>`,
    css: `.pricing { padding-block: clamp(56px, 8vw, 96px); }
h2 { font-size: clamp(30px, 4vw, 48px); margin-bottom: 40px; }
.plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
.plan { background: var(--soft); border-radius: var(--radius); padding: 32px; }
.plan.main { background: var(--ink); color: var(--paper); }
h3 { font-size: 18px; }
.price { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; margin: 12px 0 20px; }
.price span { font-size: 16px; font-weight: 400; opacity: 0.7; }
ul { list-style: none; padding: 0; margin: 0 0 28px; display: grid; gap: 8px; }
.main .btn { background: var(--paper); color: var(--ink); width: 100%; }
@media (max-width: 860px) { .plans { grid-template-columns: 1fr; } }`
  },
  {
    type: 'quote',
    name: 'Quote',
    group: 'Sections',
    code: `<section class="wrap quote">
  <blockquote>
    <p>“They redesigned our menu, our sign and our site in six weeks, and people finally find us.”</p>
    <footer>Ana Ruiz, owner of Kiln Coffee</footer>
  </blockquote>
</section>`,
    css: `.quote { padding-block: clamp(56px, 8vw, 96px); }
blockquote { margin: 0; max-width: 30ch; }
p { font-size: clamp(26px, 3.4vw, 40px); line-height: 1.25; letter-spacing: -0.01em; margin: 0 0 24px; }
footer { color: var(--muted); font-size: 16px; }`
  },
  {
    type: 'faq',
    name: 'Questions',
    group: 'Sections',
    code: `<section class="wrap faq">
  <h2>Questions</h2>
  <div class="list">
    <details open>
      <summary>How long does a project take?</summary>
      <p>Most identity and website projects take six to ten weeks from the first call to launch.</p>
    </details>
    <details>
      <summary>Can I edit the website myself?</summary>
      <p>Yes. We set up an editor and walk you through it, and you keep full ownership of the site.</p>
    </details>
    <details>
      <summary>Do you work with clients abroad?</summary>
      <p>We do. Calls happen over video and printed work ships from our local printer.</p>
    </details>
  </div>
</section>`,
    css: `.faq { padding-block: clamp(56px, 8vw, 96px); display: grid; grid-template-columns: 1fr 2fr; gap: 48px; }
h2 { font-size: clamp(30px, 4vw, 48px); }
details { border-bottom: 1px solid #dcdcd6; padding: 20px 0; }
summary { font-size: 19px; font-weight: 600; cursor: pointer; list-style: none; }
summary::after { content: "+"; float: right; font-weight: 400; }
details[open] summary::after { content: "–"; }
details p { color: var(--muted); margin: 12px 0 0; max-width: 56ch; }
@media (max-width: 760px) { .faq { grid-template-columns: 1fr; } }`
  },
  {
    type: 'cta',
    name: 'Call to action',
    group: 'Sections',
    code: `<section class="cta" id="contact">
  <div class="wrap inner">
    <h2>Have a project in mind?</h2>
    <a class="btn" href="mailto:hello@example.com">Email us</a>
  </div>
</section>`,
    css: `.cta { background: var(--brand); color: var(--brand-ink); padding-block: 88px; }
.inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; }
h2 { font-size: clamp(32px, 5vw, 60px); max-width: 16ch; }
.btn { background: var(--brand-ink); color: var(--brand); }`
  },
  {
    type: 'contact',
    name: 'Contact form',
    group: 'Sections',
    code: `<section class="wrap contact">
  <h2>Tell us about your project</h2>
  <form>
    <label>Name<input name="name" autocomplete="name"></label>
    <label>Email<input name="email" type="email" autocomplete="email"></label>
    <label class="full">What do you need?<textarea name="message" rows="5"></textarea></label>
    <button class="btn" type="submit">Send message</button>
  </form>
</section>`,
    css: `.contact { padding-block: clamp(56px, 8vw, 96px); max-width: 760px; }
h2 { font-size: clamp(30px, 4vw, 44px); margin-bottom: 32px; }
form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
label { display: grid; gap: 8px; font-size: 15px; font-weight: 600; }
.full { grid-column: 1 / -1; }
input, textarea {
  font: 400 16px/1.4 var(--font); padding: 12px 14px;
  border: 1.5px solid #c9cbc4; border-radius: 8px; background: var(--paper); color: var(--ink);
}
input:focus, textarea:focus { outline: 2px solid var(--brand); outline-offset: 1px; }
.btn { justify-self: start; }
@media (max-width: 600px) { form { grid-template-columns: 1fr; } }`
  },
  {
    type: 'footer',
    name: 'Footer',
    group: 'Sections',
    code: `<footer class="footer">
  <div class="wrap inner">
    <p class="name">Fieldnote</p>
    <p>12 Harbour Street, Portsmouth<br><a href="mailto:hello@example.com">hello@example.com</a></p>
    <p>© 2026 Fieldnote Studio</p>
  </div>
</footer>`,
    css: `.footer { background: var(--ink); color: #c9ccd1; padding-block: 72px 48px; }
.inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 32px; align-items: end; }
.name { font-size: clamp(40px, 8vw, 96px); font-weight: 700; letter-spacing: -0.03em; color: var(--paper); margin: 0; line-height: 1; }
p { margin: 0; font-size: 15px; }
a { color: inherit; }
@media (max-width: 760px) { .inner { grid-template-columns: 1fr; } }`
  },
  {
    type: 'heading',
    name: 'Heading',
    group: 'Elements',
    code: `<h2 class="wrap">A new section heading</h2>`,
    css: `h2 { font-size: clamp(30px, 4vw, 48px); padding-block: 48px 16px; }`
  },
  {
    type: 'text',
    name: 'Text',
    group: 'Elements',
    code: `<div class="wrap"><p>Write a paragraph here. Keep lines short enough to read comfortably, around sixty to seventy characters.</p></div>`,
    css: `p { font-size: 18px; max-width: 62ch; margin: 0; padding-block: 16px; color: var(--muted); }`
  },
  {
    type: 'button',
    name: 'Button',
    group: 'Elements',
    code: `<div class="wrap"><a class="btn" href="#">Button label</a></div>`,
    css: `.wrap { padding-block: 16px; }`
  },
  {
    type: 'image',
    name: 'Image',
    group: 'Elements',
    code: `<div class="wrap"><img src="${img('landscape', 1600, 900)}" alt="Describe the image"></div>`,
    css: `.wrap { padding-block: 24px; }
img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radius); }`
  },
  {
    type: 'spacer',
    name: 'Spacer',
    group: 'Elements',
    code: `<div class="spacer"></div>`,
    css: `.spacer { height: 80px; }`
  },
  {
    type: 'custom',
    name: 'Custom HTML',
    group: 'Elements',
    code: `<div class="wrap custom">
  <!-- Write any HTML here -->
  <p>Custom block</p>
</div>`,
    css: `.custom { padding-block: 32px; }`
  }
]

LIBRARY.splice(
  LIBRARY.findIndex((d) => d.group === 'Elements'),
  0,
  ...REACT
)

export const STARTER_TYPES = ['nav', 'hero', 'features', 'about', 'cta', 'footer']
