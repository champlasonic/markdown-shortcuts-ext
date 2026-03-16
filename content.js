// Markdown Shortcuts - Content Script v1.7

const DEFAULT_SHORTCUTS = [
  { id: 'bold',      key: 'B', shift: false, wrap: '**',       sample: 'text' },
  { id: 'italic',    key: 'I', shift: false, wrap: '_',        sample: 'text' },
  { id: 'strike',    key: 'D', shift: false, wrap: '~~',       sample: 'text' },
  { id: 'code',      key: 'J', shift: false, wrap: '`',        sample: 'code' },
  { id: 'h1',        key: '1', shift: false, prefix: '# ' },
  { id: 'h2',        key: '2', shift: false, prefix: '## ' },
  { id: 'h3',        key: '3', shift: false, prefix: '### ' },
  { id: 'link',      key: 'K', shift: false, template: '[text](url)' },
  { id: 'codeblock', key: 'M', shift: false, blockWrap: '```', sample: 'code' },
  { id: 'quote',     key: 'Q', shift: false, prefix: '> ' },
  { id: 'ul',        key: 'U', shift: false, prefix: '- ',     isList: true },
  { id: 'ol',        key: 'O', shift: false, prefix: '1. ',    isList: true },
  { id: 'hr',        key: 'H', shift: false, insert: '\n---\n' },
  { id: 'table',     key: 'T', shift: false, insert: '| Col1 | Col2 |\n|------|------|\n| cell | cell |\n' },
];

let SHORTCUTS = DEFAULT_SHORTCUTS.map(s => ({ ...s }));
const INDENT = '  ';

function loadBindings(cb) {
  chrome.storage.sync.get({ customKeys: {} }, ({ customKeys }) => {
    SHORTCUTS = DEFAULT_SHORTCUTS.map(s => {
      const c = customKeys[s.id]; return c ? { ...s, key: c.key, shift: c.shift } : { ...s };
    });
    cb && cb();
  });
}
loadBindings();
chrome.storage.onChanged.addListener(changes => {
  if (changes.customKeys) loadBindings();
  if (changes.enabled) enabled = changes.enabled.newValue;
});

const composingEls = new WeakSet();
document.addEventListener('compositionstart', e => { if (e.target.tagName === 'TEXTAREA') composingEls.add(e.target); }, true);
document.addEventListener('compositionend',   e => { if (e.target.tagName === 'TEXTAREA') composingEls.delete(e.target); }, true);

// ─── List helpers ─────────────────────────────────────────
function parseListLine(line) {
  const m = line.match(/^(\s*)([-*+]|(\d+)\.)( +)(.*)/s);
  if (!m) return null;
  return { indent: m[1], bullet: m[2], space: m[4], content: m[5], isOrdered: m[3] !== undefined, num: m[3] !== undefined ? Number(m[3]) : null };
}
function lastNumberAt(allText, beforeOffset, targetIndent) {
  const lines = allText.slice(0, beforeOffset).split('\n').reverse();
  for (const l of lines) {
    const p = parseListLine(l);
    if (!p || !p.isOrdered) continue;
    if (p.indent === targetIndent) return p.num;
    if (p.indent.length < targetIndent.length) break;
  }
  return 0;
}

// ─── List Enter ───────────────────────────────────────────
function handleListEnter(el) {
  const text = el.value, pos = el.selectionStart;
  if (el.selectionStart !== el.selectionEnd) return false;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd   = text.indexOf('\n', pos);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const p = parseListLine(line);
  if (!p) return false;
  if (p.content.trim() === '') {
    setVal(el, text.slice(0, lineStart) + '\n' + text.slice(lineEnd === -1 ? text.length : lineEnd));
    el.setSelectionRange(lineStart + 1, lineStart + 1); return true;
  }
  let nextBullet = p.bullet;
  if (p.isOrdered) nextBullet = (p.num + 1) + '.';
  const insert = '\n' + p.indent + nextBullet + p.space;
  insertAt(el, pos, pos, insert);
  el.setSelectionRange(pos + insert.length, pos + insert.length); return true;
}

// ─── Backspace: remove empty prefix ──────────────────────
function handleListBackspace(el) {
  const text = el.value, pos = el.selectionStart;
  if (el.selectionStart !== el.selectionEnd) return false;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd   = text.indexOf('\n', pos);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const p = parseListLine(line);
  if (!p || p.content.trim() !== '') return false;
  const prefixLen = p.indent.length + p.bullet.length + p.space.length;
  setVal(el, text.slice(0, lineStart) + text.slice(lineStart + prefixLen));
  el.setSelectionRange(lineStart, lineStart); return true;
}

// ─── Tab / Shift+Tab indent — bullet lists only ─────────
function handleIndent(el, unindent) {
  const text = el.value, start = el.selectionStart, end = el.selectionEnd;
  const lineStart  = text.lastIndexOf('\n', start - 1) + 1;
  const lineEndRaw = text.indexOf('\n', end);
  const lineEnd    = lineEndRaw === -1 ? text.length : lineEndRaw;
  const lines = text.slice(lineStart, lineEnd).split('\n');

  const hasBullet  = lines.some(l => { const p = parseListLine(l); return p && !p.isOrdered; });
  const hasOrdered = lines.some(l => { const p = parseListLine(l); return p && p.isOrdered; });

  // Ordered-only: Tab does nothing
  if (hasOrdered && !hasBullet) return;

  if (!hasBullet) {
    if (!unindent) { setVal(el, text.slice(0, start) + INDENT + text.slice(end)); el.setSelectionRange(start + INDENT.length, start + INDENT.length); }
    return;
  }

  const newLines = lines.map(line => {
    const p = parseListLine(line);
    if (!p) return line;
    if (p.isOrdered) return line;
    if (!unindent) return INDENT + line;
    return line.slice(0, INDENT.length) === INDENT ? line.slice(INDENT.length) : line;
  });

  const delta = unindent ? -INDENT.length : INDENT.length;
  setVal(el, text.slice(0, lineStart) + newLines.join('\n') + text.slice(lineEnd));
  el.setSelectionRange(Math.max(lineStart, start + delta), Math.max(lineStart, start + delta));
}

// ─── Apply shortcut ───────────────────────────────────────
function applyShortcut(el, s) {
  const start = el.selectionStart, end = el.selectionEnd;
  const sel = el.value.slice(start, end), text = el.value;
  if (s.wrap) {
    const c = sel || s.sample, r = s.wrap + c + s.wrap;
    insertAt(el, start, end, r);
    if (!sel) el.setSelectionRange(start + s.wrap.length, start + s.wrap.length + c.length);
    else el.setSelectionRange(start + r.length, start + r.length);
  } else if (s.blockWrap) {
    const c = sel || s.sample, r = s.blockWrap + '\n' + c + '\n' + s.blockWrap;
    insertAt(el, start, end, r);
    el.setSelectionRange(start + s.blockWrap.length + 1, start + s.blockWrap.length + 1 + c.length);
  } else if (s.prefix) {
    const ls = text.lastIndexOf('\n', start - 1) + 1;
    const existing = text.slice(ls, end);
    if (existing.startsWith(s.prefix)) el.setSelectionRange(ls + s.prefix.length, ls + s.prefix.length);
    else { const r = s.prefix + existing; setVal(el, text.slice(0, ls) + r + text.slice(end)); el.setSelectionRange(ls + r.length, ls + r.length); }
  } else if (s.template) {
    insertAt(el, start, end, s.template); el.setSelectionRange(start + 1, start + 5);
  } else if (s.insert) {
    insertAt(el, start, end, s.insert); el.setSelectionRange(start + s.insert.length, start + s.insert.length);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertAt(el, start, end, txt) {
  if (document.execCommand) { el.focus(); el.setSelectionRange(start, end); document.execCommand('insertText', false, txt); }
  else setVal(el, el.value.slice(0, start) + txt + el.value.slice(end));
}
function setVal(el, val) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, val); else el.value = val;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

let toastEl = null;
function showToast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#1a1a1a;color:#fff;font-size:12px;padding:6px 14px;border-radius:20px;font-family:sans-serif;pointer-events:none;opacity:0;transition:opacity 0.15s;'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 1400);
}

let enabled = true;
chrome.storage.sync.get({ enabled: true }, d => { enabled = d.enabled; });

document.addEventListener('keydown', e => {
  if (!enabled) return;
  const el = e.target;
  if (el.tagName !== 'TEXTAREA') return;

  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.isComposing && !composingEls.has(el)) {
    if (handleListEnter(el)) { e.preventDefault(); return; }
  }
  if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    if (handleListBackspace(el)) { e.preventDefault(); return; }
  }
  if (e.key === 'Tab') { e.preventDefault(); handleIndent(el, e.shiftKey); showToast(e.shiftKey ? '← unindent' : '→ indent'); return; }

  const meta = e.metaKey || e.ctrlKey;
  if (!meta) return;
  const rawKey = e.key.toUpperCase(), shift = e.shiftKey;
  const s = SHORTCUTS.find(s => s.key === rawKey && s.shift === shift);
  if (!s) return;
  e.preventDefault();
  applyShortcut(el, s);
  showToast('⌘' + (shift ? '⇧' : '') + rawKey);
}, true);
