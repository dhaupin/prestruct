/**
 * CodeBlock.jsx
 * Shared syntax-highlighted code block. Used by ViewSource, About, Deploy.
 * Renders React elements -- no dangerouslySetInnerHTML, no regex fighting.
 *
 * Props:
 *   children  string  the raw code string
 *   lang      string  'html' | 'js' | 'sh' (default 'js')
 *   label     string  optional bar label (e.g. 'ssr.config.js')
 */

// Token types and their CSS class
const T = {
  TAG:      'tok-tag',    // HTML tag names: title, meta, link, script
  ATTR:     'tok-attr',   // Attribute names: name, content, property
  VAL:      'tok-val',    // Quoted values
  KW:       'tok-kw',     // JS keywords: import, export, const, return, if, else
  FN:       'tok-fn',     // JS function names / known identifiers
  STR:      'tok-str',    // JS string literals
  CMT:      'tok-cmt',    // Comments: // ... or <!-- ... -->
  NUM:      'tok-num',    // Numbers
  PUNCT:    'tok-punct',  // Punctuation: { } ( ) [ ] ; ,
  PLAIN:    'tok-plain',  // Default text
}

// Tokenize an HTML string into an array of {type, text} tokens
function tokenizeHtml(code) {
  const tokens = []
  let i = 0

  while (i < code.length) {
    // HTML comment
    if (code.startsWith('<!--', i)) {
      const end = code.indexOf('-->', i)
      const raw = end === -1 ? code.slice(i) : code.slice(i, end + 3)
      tokens.push({ type: T.CMT, text: raw })
      i += raw.length
      continue
    }

    // Tag
    if (code[i] === '<') {
      const end = code.indexOf('>', i)
      if (end === -1) { tokens.push({ type: T.PLAIN, text: code.slice(i) }); break }
      const tag = code.slice(i, end + 1)
      // Tokenise inside the tag: name, attrs, values
      tokenizeTag(tag, tokens)
      i = end + 1
      continue
    }

    // Text between tags
    const next = code.indexOf('<', i)
    const raw = next === -1 ? code.slice(i) : code.slice(i, next)
    if (raw) tokens.push({ type: T.PLAIN, text: raw })
    i += raw.length
    if (next === -1) break
  }

  return tokens
}

function tokenizeTag(tag, tokens) {
  // tag looks like: <meta property="og:title" content="..." />
  // or: <title>, </title>, <script type="...">
  const inner = tag.slice(1, tag.endsWith('/>') ? -2 : (tag.endsWith('>') ? -1 : tag.length))
  const parts = inner.trim().split(/(\s+)/)
  let first = true

  tokens.push({ type: T.PLAIN, text: '<' })

  for (const part of parts) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      tokens.push({ type: T.PLAIN, text: part })
      continue
    }
    if (first) {
      // closing slash or tag name
      const name = part.replace(/^\//, '')
      if (part.startsWith('/')) tokens.push({ type: T.PLAIN, text: '/' })
      tokens.push({ type: T.TAG, text: name })
      first = false
      continue
    }
    // attr=value pairs
    const eq = part.indexOf('=')
    if (eq === -1) {
      tokens.push({ type: T.ATTR, text: part })
    } else {
      tokens.push({ type: T.ATTR, text: part.slice(0, eq) })
      tokens.push({ type: T.PLAIN, text: '=' })
      tokens.push({ type: T.VAL, text: part.slice(eq + 1) })
    }
  }

  tokens.push({ type: T.PLAIN, text: tag.endsWith('/>') ? ' />' : '>' })
}

// Tokenize a JS/JSX string
const JS_KW = new Set(['import','export','default','from','const','let','var','function','return','if','else','typeof','null','undefined','true','false','new','class','extends','async','await'])

function tokenizeJs(code) {
  const tokens = []
  let i = 0

  while (i < code.length) {
    const ch = code[i]

    // Line comment
    if (code.startsWith('//', i)) {
      const end = code.indexOf('\n', i)
      const raw = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ type: T.CMT, text: raw })
      i += raw.length
      continue
    }

    // String (single or double or backtick)
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue }
        if (code[j] === ch) { j++; break }
        j++
      }
      tokens.push({ type: T.STR, text: code.slice(i, j) })
      i = j
      continue
    }

    // Number
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < code.length && /[\d._]/.test(code[j])) j++
      tokens.push({ type: T.NUM, text: code.slice(i, j) })
      i = j
      continue
    }

    // Punctuation
    if ('{}()[];,'.includes(ch)) {
      tokens.push({ type: T.PUNCT, text: ch })
      i++
      continue
    }

    // Word (keyword, identifier, function name)
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i
      while (j < code.length && /[\w$]/.test(code[j])) j++
      const word = code.slice(i, j)
      const type = JS_KW.has(word) ? T.KW
        : (code[j] === '(') ? T.FN
        : T.PLAIN
      tokens.push({ type, text: word })
      i = j
      continue
    }

    tokens.push({ type: T.PLAIN, text: ch })
    i++
  }

  return tokens
}

// Shell tokenizer: comments (#), command keywords, flags
function tokenizeSh(code) {
  return code.split('\n').flatMap((line, li, arr) => {
    const tokens = []
    if (line.startsWith('#')) {
      tokens.push({ type: T.CMT, text: line })
    } else {
      // First word is a command
      const words = line.split(/(\s+)/)
      let first = true
      for (const w of words) {
        if (/^\s+$/.test(w)) { tokens.push({ type: T.PLAIN, text: w }); continue }
        if (first) { tokens.push({ type: T.FN, text: w }); first = false; continue }
        if (w.startsWith('-')) { tokens.push({ type: T.ATTR, text: w }); continue }
        if (w.startsWith("'") || w.startsWith('"')) { tokens.push({ type: T.STR, text: w }); continue }
        tokens.push({ type: T.PLAIN, text: w })
      }
    }
    if (li < arr.length - 1) tokens.push({ type: T.PLAIN, text: '\n' })
    return tokens
  })
}

function tokenize(code, lang) {
  if (lang === 'html') return tokenizeHtml(code)
  if (lang === 'sh')   return tokenizeSh(code)
  return tokenizeJs(code)
}

export default function CodeBlock({ children = '', lang = 'js', label }) {
  const tokens = tokenize(String(children), lang)

  return (
    <div className="cb">
      {label && <div className="cb-bar"><span className="cb-label">{label}</span></div>}
      <pre className="cb-pre">
        <code className="cb-code">
          {tokens.map((tok, i) => (
            tok.type === T.PLAIN
              ? tok.text
              : <span key={i} className={tok.type}>{tok.text}</span>
          ))}
        </code>
      </pre>
    </div>
  )
}
