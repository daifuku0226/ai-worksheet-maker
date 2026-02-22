# AI教材ワークシート生成メーカー 📝

AIが教科・学年・テーマに合わせたワークシートを自動生成するWebアプリです。

## 🚀 セットアップ手順

### 1. 必要なもの

- Python 3.8 以上
- Gemini API キー（[Google AI Studio](https://aistudio.google.com/apikey) で取得）

### 2. 依存パッケージのインストール

```bash
cd ai-worksheet-maker
pip install -r requirements.txt
```

### 3. APIキーの設定

`.env` ファイルを開き、取得したAPIキーを設定します：

```
GEMINI_API_KEY=あなたのAPIキーをここに貼り付け
```

### 4. アプリの起動

```bash
python app.py
```

ブラウザで http://localhost:5000 を開いてください。

## 📖 使い方

1. **STEP 1**：学校名・先生の名前・対象学年を入力
2. **STEP 2**：教科を選び、テーマ・単元を入力
3. **STEP 3**：問題形式・難易度・問題数を選び、生成ボタンを押す
4. **STEP 4**：プレビューで問題を確認・編集・再生成
5. **STEP 5**：印刷またはPDF保存

## 🛠️ 技術構成

| 項目 | 技術 |
|------|------|
| フロントエンド | HTML + CSS + JavaScript |
| バックエンド | Python Flask |
| AI | Gemini API (gemini-2.0-flash) |
| テンプレート | Jinja2 |
