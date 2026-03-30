# EasyMD

Chrome extension for Markdown editing with keyboard shortcuts, live preview, templates, history, and an outliner — all from the browser toolbar.

ブラウザのツールバーから使える Markdown エディタ拡張機能。キーボードショートカット、ライブプレビュー、テンプレート、履歴、アウトライナーを搭載しています。

## Features / 機能

- **Keyboard Shortcuts / キーボードショートカット** — `Cmd/Ctrl + Key` で任意の `<textarea>` に Markdown 書式（`**太字**`、`_斜体_`、`` `コード` ``、見出し、リンク、テーブルなど）を適用。キー割り当てはカスタマイズ可能
- **MD Edit / MD エディタ** — ライブプレビュー付きの組み込み Markdown エディタ（[marked](https://github.com/markedjs/marked) を使用）
- **History / 履歴** — コピーした内容を自動保存（最大 50 件）。すぐに再利用可能
- **Templates / テンプレート** — 履歴エントリをテンプレートとして保存し、繰り返し利用
- **Outliner / アウトライナー** — ツリー形式のアウトライナー。インデント・折りたたみ・並べ替え対応。Markdown の見出しや箇条書きとしてエクスポート可能
- **Smart Lists / スマートリスト** — Enter で箇条書き・番号付きリストを自動継続。Tab / Shift+Tab でインデント操作
- **Global Toggle / 有効・無効の切り替え** — ポップアップのヘッダーからショートカットの ON/OFF を切り替え

## Default Shortcuts / デフォルトショートカット

| 操作 / Action   | ショートカット |
| --------------- | ---------- |
| 太字 / Bold            | `Cmd+B`    |
| 斜体 / Italic          | `Cmd+I`    |
| 取り消し線 / Strikethrough | `Cmd+D`    |
| インラインコード / Inline code | `Cmd+J`    |
| 見出し 1/2/3 / Heading  | `Cmd+1/2/3`|
| リンク / Link           | `Cmd+K`    |
| コードブロック / Code block | `Cmd+M`    |
| 引用 / Blockquote       | `Cmd+Q`    |
| 箇条書き / Bullet list   | `Cmd+U`    |
| 番号付きリスト / Numbered list | `Cmd+O`    |
| 水平線 / Horizontal rule | `Cmd+H`    |
| テーブル / Table         | `Cmd+T`    |

すべてのショートカットはポップアップの **⌘** タブから変更できます。

## Installation / インストール

1. このリポジトリをクローンまたはダウンロード
2. Chrome で `chrome://extensions` を開く
3. **デベロッパーモード** を有効にする
4. **パッケージ化されていない拡張機能を読み込む** をクリックし、`markdown-shortcuts-ext` フォルダを選択
5. ツールバーに EasyMD アイコンをピン留め

ポップアップは `Ctrl+Shift+M`（Mac: `Cmd+Shift+M`）で開けます。

## Project Structure / プロジェクト構成

```
manifest.json    — 拡張機能マニフェスト (Manifest V3)
content.js       — 全ページに挿入されるコンテンツスクリプト（ショートカット・リスト補助）
popup.html       — ポップアップ UI レイアウト
popup.js         — エディタ・履歴・テンプレート・ショートカット設定
popup.css        — ポップアップのスタイル
outliner.js      — アウトライナータブのロジック
marked.min.js    — Markdown パーサー（marked ライブラリ）
icons/           — 拡張機能アイコン (16/48/128px)
```

## Permissions / 権限

| 権限 | 用途 |
| ----------- | ----------------------------------------------- |
| `storage`   | エディタ内容・履歴・テンプレート・ショートカット設定の保存 |
| `activeTab` | 現在のタブとの連携 |
| `tabs`      | プレビュー内のリンクを新しいタブで開く |

## License

MIT
