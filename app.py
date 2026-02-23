import os
import json
import re
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)

# Gemini API クライアント初期化
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_ID = "gemini-2.5-flash-lite"


def build_prompt(grade, subject, theme, notes, formats, difficulty, count):
    """ワークシート生成用のプロンプトを組み立てる"""
    format_str = "、".join(formats) if isinstance(formats, list) else formats

    prompt = f"""あなたは日本の学校教育に精通したベテラン教師です。
以下の条件で、ワークシート用の問題を生成してください。

対象学年：{grade}
教科：{subject}
テーマ・単元：{theme}
補足情報：{notes if notes else "なし"}
問題形式：{format_str}
難易度：{difficulty}
問題数：{count}

出力形式：以下のJSON形式のみで返してください。余分なテキストやマークダウン記法は一切含めないでください。
{{
  "title": "ワークシートのタイトル案",
  "problems": [
    {{
      "number": 1,
      "type": "問題形式（一問一答/穴埋め問題/選択問題/○×クイズ/記述式（短答）/記述式（長文）/並べ替え問題/マッチング）",
      "question": "問題文",
      "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "answer": "正解",
      "explanation": "解説（教師用）"
    }}
  ]
}}

注意点：
- 学年に適した語彙と表現を使うこと
- 問題文は明確で誤解のないようにすること
- 難易度に応じて思考の深さを調整すること
- 選択問題の場合、紛らわしい選択肢を含めること（選択肢は必ず4つ）
- ○×クイズの場合、choicesは["○", "×"]とすること
- 一問一答・記述式・穴埋めの場合は choices を空配列 [] とすること
- 並べ替え問題の場合、choicesに並べ替え対象の要素を入れ、answerに正しい順序を記述すること
- マッチング問題の場合、choicesに対応させるペアを入れること
- 日本の学習指導要領に沿った内容であること
- 必ず{count}問生成すること"""

    return prompt


def parse_ai_response(text):
    """AIレスポンスからJSONを抽出してパースする"""
    # マークダウンのコードブロックを除去
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # JSONブロックを探す
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


@app.route("/")
def index():
    """メインページ"""
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate_worksheet():
    """ワークシート全体を生成"""
    try:
        data = request.get_json()
        grade = data.get("grade", "")
        subject = data.get("subject", "")
        theme = data.get("theme", "")
        notes = data.get("notes", "")
        formats = data.get("formats", [])
        difficulty = data.get("difficulty", "")
        count = data.get("count", 5)

        prompt = build_prompt(grade, subject, theme, notes, formats, difficulty, count)

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
        )

        result = parse_ai_response(response.text)

        if result is None:
            return jsonify({"error": "AIの応答をパースできませんでした。もう一度お試しください。"}), 500

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"生成中にエラーが発生しました: {str(e)}"}), 500


@app.route("/api/regenerate-one", methods=["POST"])
def regenerate_one():
    """特定の問題1問だけ再生成"""
    try:
        data = request.get_json()
        grade = data.get("grade", "")
        subject = data.get("subject", "")
        theme = data.get("theme", "")
        notes = data.get("notes", "")
        formats = data.get("formats", [])
        difficulty = data.get("difficulty", "")
        problem_number = data.get("problemNumber", 1)
        current_question = data.get("currentQuestion", "")

        format_str = "、".join(formats) if isinstance(formats, list) else formats

        prompt = f"""あなたは日本の学校教育に精通したベテラン教師です。
以下の条件で、ワークシート用の問題を1問だけ新しく生成してください。

対象学年：{grade}
教科：{subject}
テーマ・単元：{theme}
補足情報：{notes if notes else "なし"}
問題形式：{format_str}
難易度：{difficulty}

現在の問題「{current_question}」とは異なる、新しい問題を作ってください。

出力形式：以下のJSON形式のみで返してください。余分なテキストやマークダウン記法は一切含めないでください。
{{
  "number": {problem_number},
  "type": "問題形式",
  "question": "問題文",
  "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "answer": "正解",
  "explanation": "解説（教師用）"
}}

注意点：
- 学年に適した語彙と表現を使うこと
- 問題文は明確で誤解のないようにすること
- 選択問題の場合、選択肢は4つで紛らわしい選択肢を含めること
- ○×クイズの場合、choicesは["○", "×"]とすること
- 一問一答・記述式・穴埋めの場合は choices を空配列 [] とすること
- 日本の学習指導要領に沿った内容であること"""

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
        )

        result = parse_ai_response(response.text)

        if result is None:
            return jsonify({"error": "AIの応答をパースできませんでした。"}), 500

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"再生成中にエラーが発生しました: {str(e)}"}), 500


@app.route("/api/suggest-title", methods=["POST"])
def suggest_title():
    """タイトル案をAIに提案させる"""
    try:
        data = request.get_json()
        grade = data.get("grade", "")
        subject = data.get("subject", "")
        theme = data.get("theme", "")

        prompt = f"""以下の条件で、小中学生向けのワークシートのタイトルを3つ提案してください。

対象学年：{grade}
教科：{subject}
テーマ・単元：{theme}

出力形式：以下のJSON形式のみで返してください。余分なテキストやマークダウン記法は一切含めないでください。
{{
  "titles": ["タイトル案1", "タイトル案2", "タイトル案3"]
}}

タイトルは子どもが親しみやすく、学習意欲が湧くような表現にしてください。"""

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
        )

        result = parse_ai_response(response.text)

        if result is None:
            return jsonify({"titles": [f"{theme} ワークシート"]}), 200

        return jsonify(result)

    except Exception as e:
        return jsonify({"titles": [f"{theme} ワークシート"]}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
