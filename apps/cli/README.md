# @minimalcorp/meshi

摂取カロリーを記録し、目標に対する進捗を日次・週次・月次で可視化／グラフ化するローカルツール。
`npx` 一発で web UI + API server をローカル起動します。

## 使い方

```bash
npx @minimalcorp/meshi
```

- web UI: http://localhost:6250
- API server: http://localhost:6251
- データは `~/.meshi/state/meshi.db`（SQLite）に永続化されます。`MESHI_DATA_DIR` で変更可能。

グローバルインストールも可能です:

```bash
npm install -g @minimalcorp/meshi
meshi
```

## 環境変数

| 変数             | 既定値     | 説明                                   |
| ---------------- | ---------- | -------------------------------------- |
| `MESHI_DATA_DIR` | `~/.meshi` | DB / state の保存先                    |
| `PORT`           | `6250`     | web UI のポート                        |
| `MESHI_DEBUG`    | （未設定） | 設定すると web/server の標準出力も表示 |

> API server のポート (6251) は web ビルドに焼き込まれているため固定です。

## 対応 OS

- macOS
- Linux

## ライセンス

PolyForm Shield License 1.0.0 — 詳細は [LICENSE](./LICENSE) を参照。
