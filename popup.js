// Markdown Shortcuts - popup.js v1.8

const DEFAULT_SHORTCUTS = [
  { id: 'bold',      key: 'B', shift: false, label: 'Bold',           syntax: '**text**',      wrap: '**',       sample: 'text' },
  { id: 'italic',    key: 'I', shift: false, label: 'Italic',         syntax: '_text_',        wrap: '_',        sample: 'text' },
  { id: 'strike',    key: 'D', shift: false, label: 'Strikethrough',  syntax: '~~text~~',      wrap: '~~',       sample: 'text' },
  { id: 'code',      key: 'J', shift: false, label: 'Inline code',    syntax: '`code`',        wrap: '`',        sample: 'code' },
  { id: 'h1',        key: '1', shift: false, label: 'Heading 1',      syntax: '# heading',     prefix: '# ' },
  { id: 'h2',        key: '2', shift: false, label: 'Heading 2',      syntax: '## heading',    prefix: '## ' },
  { id: 'h3',        key: '3', shift: false, label: 'Heading 3',      syntax: '### heading',   prefix: '### ' },
  { id: 'link',      key: 'K', shift: false, label: 'Link',           syntax: '[text](url)',   template: '[text](url)' },
  { id: 'codeblock', key: 'M', shift: false, label: 'Code block',     syntax: '```...```',     blockWrap: '```', sample: 'code' },
  { id: 'quote',     key: 'Q', shift: false, label: 'Blockquote',     syntax: '> quote',       prefix: '> ' },
  { id: 'ul',        key: 'U', shift: false, label: 'Bullet list',    syntax: '- item',        prefix: '- ',     isList: true },
  { id: 'ol',        key: 'O', shift: false, label: 'Numbered list',  syntax: '1. item',       prefix: '1. ',    isList: true },
  { id: 'hr',        key: 'H', shift: false, label: 'Horizontal rule',syntax: '---',           insert: '\n---\n' },
  { id: 'table',     key: 'T', shift: false, label: 'Table',          syntax: '| col | col |', insert: '| Col1 | Col2 |\n|------|------|\n| cell | cell |\n' },
];

const KEY_CANDIDATES = [...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), ...Array.from('0123456789')];
let SHORTCUTS = DEFAULT_SHORTCUTS.map(s => ({ ...s }));

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const badge   = document.getElementById('activeHistoryBadge');
const INDENT  = '  ';
let activeHistoryId = null;
let isComposing     = false;

// ─── Storage helpers ──────────────────────────────────────
function loadKeyBindings(cb) {
  chrome.storage.sync.get({ customKeys: {} }, ({ customKeys }) => {
    SHORTCUTS = DEFAULT_SHORTCUTS.map(s => {
      const c = customKeys[s.id];
      return c ? { ...s, key: c.key, shift: c.shift } : { ...s };
    });
    cb && cb();
  });
}
function saveKeyBinding(id, key, shift) {
  chrome.storage.sync.get({ customKeys: {} }, ({ customKeys }) => {
    const def = DEFAULT_SHORTCUTS.find(s => s.id === id);
    if (def && def.key === key && def.shift === shift) delete customKeys[id];
    else customKeys[id] = { key, shift };
    chrome.storage.sync.set({ customKeys }, () => loadKeyBindings(() => renderShortcutList()));
  });
}
function resetAllKeyBindings() {
  chrome.storage.sync.set({ customKeys: {} }, () => loadKeyBindings(() => renderShortcutList()));
}
function comboVal(key, shift) { return (shift ? '1' : '0') + key; }
function parseComboVal(v)     { return { shift: v[0] === '1', key: v.slice(1) }; }

// ─── Shortcut list ────────────────────────────────────────
function renderShortcutList() {
  const container = document.getElementById('shortcutList');
  container.innerHTML = '';
  const usedCombos = {};
  SHORTCUTS.forEach(s => { usedCombos[comboVal(s.key, s.shift)] = s.id; });

  SHORTCUTS.forEach(s => {
    const isCustom = (() => {
      const def = DEFAULT_SHORTCUTS.find(d => d.id === s.id);
      return def && (def.key !== s.key || def.shift !== s.shift);
    })();
    const defCombo = (() => {
      const def = DEFAULT_SHORTCUTS.find(d => d.id === s.id);
      return def ? comboVal(def.key, def.shift) : null;
    })();
    const row = document.createElement('div');
    row.className = 'sc-row';
    const groups = [{ label: '⌘ + key', shift: false }, { label: '⌘⇧ + key', shift: true }];
    let optHTML = '';
    groups.forEach(g => {
      optHTML += `<optgroup label="${g.label}">`;
      KEY_CANDIDATES.forEach(k => {
        const cv = comboVal(k, g.shift), cur = comboVal(s.key, s.shift);
        const takenBy = usedCombos[cv];
        if (takenBy && takenBy !== s.id) return;
        optHTML += `<option value="${cv}"${cv === cur ? ' selected' : ''}>⌘${g.shift ? '⇧' : ''}${k}</option>`;
      });
      optHTML += '</optgroup>';
    });
    row.innerHTML = `
      <span class="sc-label${isCustom ? ' sc-label-custom' : ''}">${escHtml(s.label)}</span>
      <div class="sc-right">
        <span class="sc-syntax">${escHtml(s.syntax)}</span>
        <select class="sc-select${isCustom ? ' sc-select-custom' : ''}" data-id="${s.id}" data-default="${defCombo}">${optHTML}</select>
        ${isCustom
          ? `<button class="sc-reset-btn" data-id="${s.id}" data-default="${defCombo}" title="Reset to default">↺</button>`
          : `<span class="sc-reset-placeholder"></span>`}
      </div>`;
    container.appendChild(row);
  });
  container.querySelectorAll('.sc-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const { key, shift } = parseComboVal(sel.value);
      saveKeyBinding(sel.dataset.id, key, shift);
      showToast(`Changed to ⌘${shift ? '⇧' : ''}${key}`);
    });
  });
  container.querySelectorAll('.sc-reset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { key, shift } = parseComboVal(btn.dataset.default);
      saveKeyBinding(btn.dataset.id, key, shift);
      showToast('Reset to default');
    });
  });
}
document.getElementById('resetAllBtn').addEventListener('click', () => {
  resetAllKeyBindings(); showToast('All shortcuts reset');
});

// ─── Tabs ─────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'history')   renderHistory();
    if (tab.dataset.tab === 'templates') renderTemplates();
  });
});

// ─── Toggle ──────────────────────────────────────────────
const toggle = document.getElementById('enableToggle');
chrome.storage.sync.get({ enabled: true }, d => { toggle.checked = d.enabled; });
toggle.addEventListener('change', () => chrome.storage.sync.set({ enabled: toggle.checked }));

// ─── Editor persistence ───────────────────────────────────
chrome.storage.local.get({ editorContent: '', activeHistoryId: null }, data => {
  editor.value = data.editorContent;
  activeHistoryId = data.activeHistoryId || null;
  updateBadge(); updatePreview();
});
editor.addEventListener('input', () => { updatePreview(); chrome.storage.local.set({ editorContent: editor.value }); });
editor.addEventListener('compositionstart', () => { isComposing = true; });
editor.addEventListener('compositionend',   () => { isComposing = false; });

// ─── Editor keydown ───────────────────────────────────────
editor.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !isComposing && !e.isComposing) {
    if (handleListEnter()) { e.preventDefault(); return; }
  }
  if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    if (handleListBackspace()) { e.preventDefault(); return; }
  }
  if (e.key === 'Tab') { e.preventDefault(); handleIndent(e.shiftKey); return; }
  const meta = e.metaKey || e.ctrlKey;
  if (!meta) return;
  const s = SHORTCUTS.find(s => s.key === e.key.toUpperCase() && s.shift === e.shiftKey);
  if (s) { e.preventDefault(); applyShortcut(s); }
});

// ─── List helpers ─────────────────────────────────────────
function parseListLine(line) {
  const m = line.match(/^(\s*)([-*+]|(\d+)\.)( +)(.*)/s);
  if (!m) return null;
  return { indent: m[1], bullet: m[2], space: m[4], content: m[5],
           isOrdered: m[3] !== undefined, num: m[3] !== undefined ? Number(m[3]) : null };
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

// ─── Enter: continue list ─────────────────────────────────
function handleListEnter() {
  const text = editor.value, pos = editor.selectionStart;
  if (editor.selectionStart !== editor.selectionEnd) return false;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd   = text.indexOf('\n', pos);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const p = parseListLine(line);
  if (!p) return false;
  if (p.content.trim() === '') {
    editor.value = text.slice(0, lineStart) + '\n' + text.slice(lineEnd === -1 ? text.length : lineEnd);
    editor.setSelectionRange(lineStart + 1, lineStart + 1);
    saveEditorState(); return true;
  }
  const nextBullet = p.isOrdered ? (p.num + 1) + '.' : p.bullet;
  const insert = '\n' + p.indent + nextBullet + p.space;
  editor.value = text.slice(0, pos) + insert + text.slice(pos);
  editor.setSelectionRange(pos + insert.length, pos + insert.length);
  saveEditorState(); return true;
}

// ─── Backspace: remove empty list prefix ─────────────────
function handleListBackspace() {
  const text = editor.value, pos = editor.selectionStart;
  if (editor.selectionStart !== editor.selectionEnd) return false;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd   = text.indexOf('\n', pos);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const p = parseListLine(line);
  if (!p || p.content.trim() !== '') return false;
  const prefixLen = p.indent.length + p.bullet.length + p.space.length;
  editor.value = text.slice(0, lineStart) + text.slice(lineStart + prefixLen);
  editor.setSelectionRange(lineStart, lineStart);
  saveEditorState(); return true;
}

// ─── Tab/Shift+Tab indent — bullet lists only ─────────────
function handleIndent(unindent) {
  const text  = editor.value;
  const start = editor.selectionStart;
  const end   = editor.selectionEnd;
  const lineStart  = text.lastIndexOf('\n', start - 1) + 1;
  const lineEndRaw = text.indexOf('\n', end);
  const lineEnd    = lineEndRaw === -1 ? text.length : lineEndRaw;
  const lines = text.slice(lineStart, lineEnd).split('\n');

  // Separate bullet-list lines from ordered-list lines
  const hasBullet  = lines.some(l => { const p = parseListLine(l); return p && !p.isOrdered; });
  const hasOrdered = lines.some(l => { const p = parseListLine(l); return p && p.isOrdered; });

  // Ordered list lines: Tab/Shift+Tab does nothing
  if (hasOrdered && !hasBullet) return;

  // No list at all: plain space insert/remove
  if (!hasBullet) {
    if (!unindent) {
      editor.value = text.slice(0, start) + INDENT + text.slice(end);
      editor.setSelectionRange(start + INDENT.length, start + INDENT.length);
      saveEditorState();
    }
    return;
  }

  // Bullet list indent/unindent
  const newLines = lines.map(line => {
    const p = parseListLine(line);
    if (!p) return line;
    if (p.isOrdered) return line; // skip ordered lines mixed in
    if (!unindent) return INDENT + line;
    return line.slice(0, INDENT.length) === INDENT ? line.slice(INDENT.length) : line;
  });

  const delta = unindent ? -INDENT.length : INDENT.length;
  editor.value = text.slice(0, lineStart) + newLines.join('\n') + text.slice(lineEnd);
  editor.setSelectionRange(Math.max(lineStart, start + delta), Math.max(lineStart, start + delta));
  saveEditorState();
}

// ─── Apply shortcut ───────────────────────────────────────
function applyShortcut(s) {
  const start = editor.selectionStart, end = editor.selectionEnd;
  const sel = editor.value.slice(start, end), text = editor.value;
  if (s.wrap) {
    const c = sel || s.sample, r = s.wrap + c + s.wrap;
    editor.value = text.slice(0, start) + r + text.slice(end);
    if (!sel) editor.setSelectionRange(start + s.wrap.length, start + s.wrap.length + c.length);
    else editor.setSelectionRange(start + r.length, start + r.length);
  } else if (s.blockWrap) {
    const c = sel || s.sample, r = s.blockWrap + '\n' + c + '\n' + s.blockWrap;
    editor.value = text.slice(0, start) + r + text.slice(end);
    editor.setSelectionRange(start + s.blockWrap.length + 1, start + s.blockWrap.length + 1 + c.length);
  } else if (s.prefix) {
    const ls = text.lastIndexOf('\n', start - 1) + 1;
    const existingLine = text.slice(ls, end);
    if (existingLine.startsWith(s.prefix)) {
      editor.setSelectionRange(ls + s.prefix.length, ls + s.prefix.length);
    } else {
      const r = s.prefix + existingLine;
      editor.value = text.slice(0, ls) + r + text.slice(end);
      editor.setSelectionRange(ls + r.length, ls + r.length);
    }
  } else if (s.template) {
    editor.value = text.slice(0, start) + s.template + text.slice(end);
    editor.setSelectionRange(start + 1, start + 5);
  } else if (s.insert) {
    editor.value = text.slice(0, start) + s.insert + text.slice(end);
    editor.setSelectionRange(start + s.insert.length, start + s.insert.length);
  }
  editor.focus(); saveEditorState();
}

function saveEditorState() { updatePreview(); chrome.storage.local.set({ editorContent: editor.value }); }
function updatePreview() {
  if (typeof marked !== 'undefined') {
    preview.innerHTML = marked.parse(editor.value || '');
    // Open links in new browser tab
    preview.querySelectorAll('a[href]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const url = a.href;
        if (url && (url.startsWith('http') || url.startsWith('https'))) {
          chrome.tabs.create({ url });
        }
      });
    });
  }
}
function updateBadge() {
  if (activeHistoryId) { badge.textContent = 'Editing history entry'; badge.style.display = 'inline-block'; }
  else { badge.textContent = ''; badge.style.display = 'none'; }
}

// ─── Copy + Save ──────────────────────────────────────────
document.getElementById('copyBtn').addEventListener('click', () => {
  const content = editor.value.trim();
  if (!content) { showToast('Nothing to copy'); return; }
  navigator.clipboard.writeText(content).then(() => {
    if (activeHistoryId) overwriteHistory(activeHistoryId, content);
    else appendHistory(content);
  });
});

// ─── History helpers ──────────────────────────────────────
function appendHistory(content) {
  chrome.storage.local.get({ history: [] }, data => {
    const entry = makeHistoryEntry(content);
    activeHistoryId = entry.id;
    chrome.storage.local.set({ history: [entry, ...data.history].slice(0, 50), activeHistoryId });
    updateBadge(); showToast('Copied & saved to history');
  });
}
function overwriteHistory(id, content) {
  chrome.storage.local.get({ history: [] }, data => {
    const idx = data.history.findIndex(h => h.id === id);
    if (idx === -1) { appendHistory(content); return; }
    const e = makeHistoryEntry(content); e.id = id;
    data.history[idx] = e;
    chrome.storage.local.set({ history: data.history });
    showToast('History entry updated');
  });
}
function makeHistoryEntry(content, type) {
  return { id: Date.now(), content, type: type || 'md',
    preview: content.slice(0, 80).replace(/\n/g, ' '),
    date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
}

// ─── History render ───────────────────────────────────────
function renderHistory() {
  const container = document.getElementById('historyList');
  chrome.storage.local.get({ history: [], activeHistoryId: null }, data => {
    const curId = data.activeHistoryId;
    if (!data.history.length) {
      container.innerHTML = '<div class="empty-state">No history yet.<br>Copy &amp; Save to add entries.</div>'; return;
    }
    container.innerHTML = '';
    data.history.forEach(entry => {
      const isActive = entry.id === curId;
      const item = document.createElement('div');
      item.className = 'history-item' + (isActive ? ' history-item-active' : '');
      item.innerHTML = `
        <div class="history-item-meta">
          <span class="history-date">${entry.date}<span class="htype-badge htype-${entry.type || 'md'}">${(entry.type||'md').toUpperCase()}</span>${isActive ? ' <span class="editing-tag">editing</span>' : ''}</span>
          <div class="history-actions">
            <button class="hbtn hbtn-load"  data-id="${entry.id}">Load</button>
            <button class="hbtn hbtn-temp"  data-id="${entry.id}">+Temp</button>
            <button class="hbtn hbtn-copy"  data-id="${entry.id}">Copy</button>
            <button class="hbtn hbtn-del"   data-id="${entry.id}">Delete</button>
          </div>
        </div>
        <div class="history-preview">${escHtml(entry.preview)}${entry.content.length > 80 ? '…' : ''}</div>`;
      container.appendChild(item);
    });

    container.querySelectorAll('.hbtn-load').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      chrome.storage.local.get({ history: [] }, d => {
        const e = d.history.find(h => h.id === id); if (!e) return;
        editor.value = e.content; activeHistoryId = id;
        chrome.storage.local.set({ editorContent: e.content, activeHistoryId: id });
        updateBadge(); updatePreview();
        switchTab('editor');
        showToast('Loaded into editor');
      });
    }));

    container.querySelectorAll('.hbtn-temp').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      chrome.storage.local.get({ history: [], templates: [] }, d => {
        const e = d.history.find(h => h.id === id); if (!e) return;
        const tmpl = makeTemplateEntry(e.content, '');
        chrome.storage.local.set({ templates: [tmpl, ...d.templates].slice(0, 100) }, () => {
          showToast('Saved to Templates');
        });
      });
    }));

    container.querySelectorAll('.hbtn-copy').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      chrome.storage.local.get({ history: [] }, d => {
        const e = d.history.find(h => h.id === id);
        if (e) navigator.clipboard.writeText(e.content).then(() => showToast('Copied'));
      });
    }));

    container.querySelectorAll('.hbtn-del').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      chrome.storage.local.get({ history: [] }, d => {
        const nh = d.history.filter(h => h.id !== id);
        if (activeHistoryId === id) {
          activeHistoryId = null;
          chrome.storage.local.set({ history: nh, activeHistoryId: null }, () => { updateBadge(); renderHistory(); });
        } else {
          chrome.storage.local.set({ history: nh }, () => renderHistory());
        }
      });
    }));
  });
}

document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  activeHistoryId = null;
  chrome.storage.local.set({ history: [], activeHistoryId: null }, () => { updateBadge(); renderHistory(); });
});

// ─── Templates ───────────────────────────────────────────
function makeTemplateEntry(content, name) {
  return { id: Date.now(), content, name: name || '',
    preview: content.slice(0, 80).replace(/\n/g, ' '),
    date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
}

function renderTemplates() {
  const container = document.getElementById('templateList');
  chrome.storage.local.get({ templates: [] }, data => {
    if (!data.templates.length) {
      container.innerHTML = '<div class="empty-state">No templates yet.<br>Use "+Temp" in History to save one.</div>'; return;
    }
    container.innerHTML = '';
    data.templates.forEach(tmpl => {
      const item = document.createElement('div');
      item.className = 'history-item tmpl-item';
      item.dataset.id = tmpl.id;
      item.innerHTML = `
        <div class="history-item-meta">
          <div class="tmpl-name-wrap">
            <input class="tmpl-name-input" type="text" placeholder="Untitled template"
              value="${escAttr(tmpl.name)}" data-id="${tmpl.id}" maxlength="60">
          </div>
          <div class="history-actions">
            <button class="hbtn hbtn-load" data-id="${tmpl.id}">Load</button>
            <button class="hbtn hbtn-del"  data-id="${tmpl.id}">Delete</button>
          </div>
        </div>
        <div class="history-preview">${escHtml(tmpl.preview)}${tmpl.content.length > 80 ? '…' : ''}</div>`;
      container.appendChild(item);
    });

    // Name edit — save on blur or Enter
    container.querySelectorAll('.tmpl-name-input').forEach(inp => {
      const save = () => {
        const id = Number(inp.dataset.id);
        chrome.storage.local.get({ templates: [] }, d => {
          const idx = d.templates.findIndex(t => t.id === id);
          if (idx !== -1) {
            d.templates[idx].name = inp.value.trim();
            chrome.storage.local.set({ templates: d.templates });
          }
        });
      };
      inp.addEventListener('blur', save);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    });

    // Load: copy content to editor AND append to history
    container.querySelectorAll('.hbtn-load').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      chrome.storage.local.get({ templates: [], history: [] }, d => {
        const tmpl = d.templates.find(t => t.id === id); if (!tmpl) return;
        // Load into editor
        editor.value = tmpl.content;
        updatePreview();
        // Append to history (new entry, not overwrite)
        const entry = makeHistoryEntry(tmpl.content);
        activeHistoryId = entry.id;
        chrome.storage.local.set({
          editorContent: tmpl.content,
          activeHistoryId: entry.id,
          history: [entry, ...d.history].slice(0, 50)
        });
        updateBadge();
        switchTab('editor');
        showToast('Template loaded');
      });
    }));

    container.querySelectorAll('.hbtn-del').forEach(btn => btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      chrome.storage.local.get({ templates: [] }, d => {
        chrome.storage.local.set({ templates: d.templates.filter(t => t.id !== id) }, () => renderTemplates());
      });
    }));
  });
}

document.getElementById('clearTemplatesBtn').addEventListener('click', () => {
  chrome.storage.local.set({ templates: [] }, () => renderTemplates());
});

// ─── Clear editor ─────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', () => {
  editor.value = ''; preview.innerHTML = ''; activeHistoryId = null;
  chrome.storage.local.set({ editorContent: '', activeHistoryId: null }); updateBadge(); editor.focus();
});

// ─── Utils ────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(str) { return String(str).replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

loadKeyBindings(() => renderShortcutList());
