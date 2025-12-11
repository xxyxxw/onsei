# 📘 議事録インタビューAI - Smart Minutes

音声入力で簡単に議事録を作成できるWebアプリケーションです。

## 🎯 このアプリでできること

1. **音声で議事録を入力** - マイクに向かって話すだけで自動的に文字起こし
2. **キーボードでも編集可能** - 音声とキーボード入力を組み合わせて使える
3. **4つのモードから選択** - 電力用、保健用、一般用、質問なしモード
4. **AIが自動整形** - Google Gemini APIが議事録として整った文章に変換
5. **Word文書を自動生成** - ボタン1つで議事録のWord文書をダウンロード

## 💡 使い方

### ステップ1: トップページで用途を選ぶ
- ⚡ **電力用** - 電力関係の会議向け
- 🏥 **保健用** - 保健・医療関係の会議向け
- 💼 **一般用** - 一般的なビジネス会議向け
- ✍️ **質問なしモード** - 自由に内容を入力したい場合

### ステップ2: 質問に答える（質問ありモード）
1. 画面に質問が表示されます
2. 録音ボタンを**長押し**して話す
3. 離すと録音終了
4. テキストエリアで編集も可能
5. 「次へ」ボタンで次の質問へ

### ステップ3: Word文書を生成
1. すべての質問に答えたら「Word生成」ボタンをクリック
2. AIが議事録形式に整形
3. Word文書が自動ダウンロード

## 🚀 開発者向けセットアップ

### 必要なもの
- Python 3.8以上
- Google Gemini APIキー（無料で取得可能）
- Webブラウザ（Chrome、Edge、Safari推奨）

### 1. リポジトリをクローン

```bash
git clone https://github.com/hpartner-ai/minutes-automation.git
cd minutes-automation
```

### 2. 仮想環境を作成

**Windows (PowerShell)**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Mac/Linux**
```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. 依存パッケージをインストール

```bash
pip install -r requirements.txt
```

### 4. 環境変数を設定

`.env`ファイルを作成して、Gemini APIキーを設定：

```bash
GEMINI_API_KEY=your_api_key_here
```

**Gemini APIキーの取得方法:**
1. https://aistudio.google.com/app/apikey にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたキーをコピーして`.env`に貼り付け

### 5. サーバーを起動

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

または

```bash
python main.py
```

### 6. ブラウザでアクセス

```
http://localhost:8001
```

## 🏗️ システム構成

### フロントエンド（ブラウザ側）
- **HTML/CSS** - きれいなUI（Zen Maru Gothicフォント使用）
- **JavaScript** - Web Speech APIで音声認識
- **録音機能** - 長押しで録音、離すと停止

### バックエンド（サーバー側）
- **FastAPI** - Pythonの高速Webフレームワーク
- **Google Gemini API** - 議事録の整形・要約
- **python-docx** - Word文書の生成

### データの流れ
```
ユーザーの音声
  ↓
ブラウザで文字起こし（Web Speech API）
  ↓
サーバーに送信（FastAPI）
  ↓
AIで整形（Google Gemini API）
  ↓
Word文書生成（python-docx）
  ↓
ダウンロード
```

## 📁 プロジェクト構造

```
minutes-automation/
├── main.py                          # アプリケーションのエントリーポイント
├── requirements.txt                 # Pythonパッケージ一覧
├── .env                            # 環境変数（APIキー）
├── render.yaml                     # Renderデプロイ設定
│
├── app/                            # アプリケーション本体
│   ├── config.py                   # 設定読み込み
│   ├── domain/                     # ビジネスロジック
│   │   ├── interview.py           # インタビュー処理
│   │   └── summary.py             # 要約処理
│   ├── services/                   # 外部サービス連携
│   │   ├── gemini_service.py      # Gemini API連携
│   │   ├── stt_service.py         # 音声認識
│   │   └── tts_service.py         # 音声合成
│   └── ui/                         # フロントエンド
│       ├── templates/              # HTMLファイル
│       │   ├── top.html           # トップページ
│       │   ├── index.html         # 質問モードページ
│       │   └── bulk.html          # 自由入力ページ
│       └── static/                 # CSS/JavaScript
│           ├── style.css          # スタイルシート
│           ├── app.js             # 質問モード用JS
│           └── bulk.js            # 自由入力用JS
│
├── config/                         # 質問設定
│   ├── config_denryoku.json       # 電力用の質問
│   ├── config_hoken.json          # 保健用の質問
│   ├── config_ippan.json          # 一般用の質問
│   └── config_free.json           # 自由入力用設定
│
└── .gitignore                      # Gitで管理しないファイル
```

## ⚙️ 設定ファイルについて

### config_*.json の構造

各設定ファイルには以下の情報が含まれています：

```json
{
  "questions": [
    {
      "id": 1,
      "category": "基本情報",
      "text": "会社名を教えてください"
    }
  ],
  "summary_prompt": "議事録として整形するためのAIへの指示"
}
```

### 質問のカスタマイズ方法

1. `config/config_ippan.json`などを開く
2. `questions`配列に質問を追加・編集
3. サーバーを再起動

例：
```json
{
  "id": 11,
  "category": "追加項目",
  "text": "次回の予定はありますか？"
}
```
