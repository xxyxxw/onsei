# 📘 議事録インタビューAIシステム（Gemini版）

スマホやPCから使えるインタビュー収録 → 質問誘導 → 音声認識 → 要約 → Word自動生成を行うWebアプリ。

## 🚀 セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
# .envファイルにGEMINI_API_KEYを設定
```

### 2. 依存関係のインストール

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
```

### 3. サーバー起動

```bash
python app.py
```

ブラウザで `http://localhost:8000` にアクセス

## 🏗️ アーキテクチャ

- **フロントエンド**: HTML/CSS/JavaScript（録音機能付き）
- **バックエンド**: FastAPI
- **AI**: Google Gemini API
  - 音声認識（STT）
  - 要約生成（Gemini Flash）
  - 音声合成（TTS）
- **文書生成**: python-docx

## 📁 ディレクトリ構造

```
interviewer-ai/
├─ app.py
├─ app/
│   ├─ config.py
│   ├─ domain/          # ビジネスロジック
│   ├─ services/        # 外部API連携
│   └─ ui/              # フロントエンド
├─ config.json          # 質問設定
└─ requirements.txt
```
