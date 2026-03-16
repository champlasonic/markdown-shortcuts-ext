// EasyMD - Outliner v2.0
(function () {

let nodes = [];
let focusId = null;
const STORE_KEY = 'outlinerNodes';

// Per-level bullet symbols (cycling after level 3)
const BULLETS = ['●', '○', '■', '□', '◆', '◇'];
function bulletFor(level, hasChildren, collapsed) {
  if (hasChildren) return collapsed ? '▶' : '▼';
  return BULLETS[level % BULLETS.length];
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function loadNodes(cb) {
  chrome.storage.local.get({ [STORE_KEY]: null }, data => {
    const raw = data[STORE_KEY];
    nodes = (raw && raw.length) ? raw : [{ id: genId(), text: '', level: 0, collapsed: false }];
    cb && cb();
  });
}
function saveNodes() { chrome.storage.local.set({ [STORE_KEY]: nodes }); }

// ─── Render ───────────────────────────────────────────────
const tree = document.getElementById('olTree');

function buildHiddenSet() {
  const hidden = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (hidden.has(n.id)) continue;
    if (n.collapsed) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].level > n.level) hidden.add(nodes[j].id);
        else break;
      }
    }
  }
  return hidden;
}

function render() {
  const scrollTop = tree.scrollTop;
  tree.innerHTML = '';
  const hidden = buildHiddenSet();

  nodes.forEach((n, idx) => {
    if (hidden.has(n.id)) return;
    const hasChildren = idx + 1 < nodes.length && nodes[idx + 1].level > n.level;

    const row = document.createElement('div');
    row.className = 'ol-row';
    row.dataset.id = n.id;
    row.style.paddingLeft = (n.level * 18 + 4) + 'px';

    const bullet = document.createElement('span');
    bullet.className = 'ol-bullet ol-bullet-l' + (n.level % BULLETS.length);
    if (hasChildren) bullet.classList.add('ol-bullet-toggle');
    bullet.textContent = bulletFor(n.level, hasChildren, n.collapsed);
    if (hasChildren) {
      bullet.addEventListener('click', () => {
        n.collapsed = !n.collapsed;
        saveNodes(); render();
      });
    }

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'ol-input';
    inp.value = n.text;
    inp.dataset.id = n.id;
    if (n.id === focusId) inp.dataset.focus = '1';

    // Track IME state on each input element
    inp.addEventListener('compositionstart', () => { inp._composing = true; });
    inp.addEventListener('compositionend',   () => { inp._composing = false; });

    inp.addEventListener('input', () => {
      n.text = inp.value;
      saveNodes();
      const curIdx = nodes.findIndex(x => x.id === n.id);
      const nowHas = curIdx + 1 < nodes.length && nodes[curIdx + 1].level > n.level;
      if (nowHas !== hasChildren) render();
    });

    inp.addEventListener('keydown', e => handleNodeKey(e, n, idx, inp));

    row.appendChild(bullet);
    row.appendChild(inp);
    tree.appendChild(row);
  });

  if (focusId) {
    const target = tree.querySelector('[data-focus="1"]');
    if (target) {
      target.focus();
      const len = target.value.length;
      try { target.setSelectionRange(len, len); } catch(_) {}
    }
  }
  tree.scrollTop = scrollTop;
}

// ─── Key handler ─────────────────────────────────────────
function handleNodeKey(e, n, idx, inp) {
  // Enter — skip during IME composition
  if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    if (inp._composing || e.isComposing) return; // let IME confirm
    e.preventDefault();
    const pos = inp.selectionStart;
    n.text = inp.value.slice(0, pos);
    const newNode = { id: genId(), text: inp.value.slice(pos), level: n.level, collapsed: false };
    nodes.splice(idx + 1, 0, newNode);
    focusId = newNode.id;
    saveNodes(); render();
    return;
  }

  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (idx === 0) return;
    const max = nodes[idx - 1].level + 1;
    if (n.level < max) { n.level++; focusId = n.id; saveNodes(); render(); }
    return;
  }

  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    if (n.level > 0) { n.level--; focusId = n.id; saveNodes(); render(); }
    return;
  }

  if (e.key === 'Backspace' && inp.value === '') {
    e.preventDefault();
    if (nodes.length === 1) return;
    const prevId = idx > 0 ? nodes[idx - 1].id : nodes[1]?.id;
    nodes.splice(idx, 1);
    focusId = prevId;
    saveNodes(); render();
    setTimeout(() => {
      const t = tree.querySelector(`[data-id="${prevId}"] .ol-input`);
      if (t) { t.focus(); const l = t.value.length; try { t.setSelectionRange(l, l); } catch(_) {} }
    }, 0);
    return;
  }

  if (e.altKey && e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx === 0) return;
    const sub = getSubtree(idx);
    const block = nodes.splice(idx, sub + 1);
    const prevSub = getSubtreeAt(idx - 1);
    nodes.splice(idx - prevSub - 1, 0, ...block);
    focusId = n.id; saveNodes(); render();
    return;
  }

  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    const sub = getSubtree(idx);
    const nextIdx = idx + sub + 1;
    if (nextIdx >= nodes.length) return;
    const block = nodes.splice(idx, sub + 1);
    const nextSub = getSubtree(idx);
    nodes.splice(idx + nextSub + 1, 0, ...block);
    focusId = n.id; saveNodes(); render();
    return;
  }

  if (e.key === 'ArrowUp' && !e.altKey) {
    e.preventDefault();
    const vis = visibleNodes();
    const vi = vis.findIndex(x => x.id === n.id);
    if (vi > 0) { focusId = vis[vi - 1].id; render(); }
    return;
  }

  if (e.key === 'ArrowDown' && !e.altKey) {
    e.preventDefault();
    const vis = visibleNodes();
    const vi = vis.findIndex(x => x.id === n.id);
    if (vi < vis.length - 1) { focusId = vis[vi + 1].id; render(); }
    return;
  }
}

function getSubtree(idx) {
  const level = nodes[idx].level;
  let count = 0;
  for (let i = idx + 1; i < nodes.length; i++) {
    if (nodes[i].level > level) count++; else break;
  }
  return count;
}

function getSubtreeAt(idx) {
  // Count how many nodes directly follow idx that are its children
  return getSubtree(idx);
}

function visibleNodes() {
  const hidden = buildHiddenSet();
  return nodes.filter(n => !hidden.has(n.id));
}

// ─── Export as Markdown ───────────────────────────────────
function exportMarkdown() {
  return nodes.map(n => '  '.repeat(n.level) + '- ' + (n.text || '')).join('\n');
}

// ─── Save to History ─────────────────────────────────────
function saveToHistory(md) {
  const entry = {
    id: Date.now(),
    content: md,
    type: 'ol',
    preview: nodes.filter(n => n.text).slice(0, 3).map(n => n.text).join(' / '),
    date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  chrome.storage.local.get({ history: [] }, data => {
    chrome.storage.local.set({ history: [entry, ...data.history].slice(0, 50) });
  });
}

// ─── Toolbar ─────────────────────────────────────────────
document.getElementById('olAddBtn').addEventListener('click', () => {
  const newNode = { id: genId(), text: '', level: 0, collapsed: false };
  nodes.push(newNode);
  focusId = newNode.id;
  saveNodes(); render();
});

document.getElementById('olCollapseAllBtn').addEventListener('click', () => {
  nodes.forEach(n => { if (n.level === 0) n.collapsed = true; });
  saveNodes(); render();
});

document.getElementById('olExpandAllBtn').addEventListener('click', () => {
  nodes.forEach(n => { n.collapsed = false; });
  saveNodes(); render();
});

// Copy button: bullet-list markdown → clipboard + History
document.getElementById('olCopyBtn').addEventListener('click', () => {
  const md = exportMarkdown();
  navigator.clipboard.writeText(md).then(() => {
    saveToHistory(md);
    showToast('Outline copied & saved to History');
  });
});

// MD Export button: convert to H1/H2/H3/bullet → load into MD Edit tab
document.getElementById('olExportBtn').addEventListener('click', () => {
  const lines = [];
  nodes.forEach(n => {
    const text = n.text || '';
    if (n.level === 0)      lines.push('# ' + text);
    else if (n.level === 1) lines.push('## ' + text);
    else if (n.level === 2) lines.push('### ' + text);
    else                    lines.push('  '.repeat(n.level - 3) + '- ' + text);
  });
  const md = lines.join('\n');

  // Load into editor
  const editorEl = document.getElementById('editor');
  editorEl.value = md;
  editorEl.dispatchEvent(new Event('input'));

  // Save to storage + history, clear active history id
  chrome.storage.local.get({ history: [] }, data => {
    const entry = {
      id: Date.now(), content: md, type: 'md',
      preview: md.slice(0, 80).replace(/\n/g, ' '),
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    chrome.storage.local.set({
      editorContent: md,
      activeHistoryId: entry.id,
      history: [entry, ...data.history].slice(0, 50)
    });
  });

  // Switch to MD Edit tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="editor"]').classList.add('active');
  document.getElementById('tab-editor').classList.add('active');

  showToast('Exported to MD Edit');
});

// ─── Tab init ────────────────────────────────────────────
document.querySelector('[data-tab="outliner"]').addEventListener('click', () => {
  if (!nodes.length) loadNodes(() => render()); else render();
});

loadNodes();

})();
