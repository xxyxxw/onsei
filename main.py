"""
FastAPI メインアプリケーション（Render対応）
"""
import os
from fastapi import FastAPI, File, UploadFile, Form, Body
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

# プロキシ設定を削除（Gemini APIへの直接接続を確保）
if 'HTTP_PROXY' in os.environ:
    del os.environ['HTTP_PROXY']
if 'HTTPS_PROXY' in os.environ:
    del os.environ['HTTPS_PROXY']
if 'http_proxy' in os.environ:
    del os.environ['http_proxy']
if 'https_proxy' in os.environ:
    del os.environ['https_proxy']

from app.config import Config
from app.domain.question_flow import QuestionFlow
from app.domain.summary import InterviewSummary, Summary
from app.services.stt_service import STTService
from app.services.gemini_service import GeminiService
from app.services.tts_service import TTSService
from app.services.docx_service import DocxService

# FastAPIアプリケーション初期化
app = FastAPI(title="議事録インタビューAI")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイルの配信（app/ui/staticを使用）
static_dir = Path(__file__).parent / "app" / "ui" / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# サービス初期化
questions = Config.load_questions()
question_flow = QuestionFlow(questions)
interview_summary = InterviewSummary()
stt_service = STTService()
gemini_service = GeminiService()
tts_service = TTSService()
docx_service = DocxService()


@app.get("/")
async def root():
    """ルートエンドポイント - カテゴリー選択画面"""
    # Vercel用 - publicディレクトリを優先
    public_path = Path(__file__).parent / "public" / "top.html"
    template_path = Path(__file__).parent / "app" / "ui" / "templates" / "top.html"
    
    file_path = public_path if public_path.exists() else template_path
    
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return Response(content=content, media_type="text/html")
    return {"message": "議事録インタビューAI API"}


@app.get("/interview/{interview_type}")
async def interview_page(interview_type: str):
    """インタビューページ"""
    # Vercel用 - publicディレクトリを優先
    public_path = Path(__file__).parent / "public" / "index.html"
    template_path = Path(__file__).parent / "app" / "ui" / "templates" / "index.html"
    
    file_path = public_path if public_path.exists() else template_path
    
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return Response(content=content, media_type="text/html")
    return JSONResponse(
        status_code=404,
        content={"error": "Interview page not found"}
    )


@app.get("/api/{interview_type}/question/{question_id}")
async def get_question(interview_type: str, question_id: int):
    """
    質問を取得
    
    Args:
        interview_type: インタビュータイプ (denryoku, hoken, ippan, other, free)
        question_id: 質問ID
        
    Returns:
        質問データ
    """
    # タイプ別の設定ファイルを読み込む
    import json
    config_path = Path(__file__).parent / f"config_{interview_type}.json"
    
    if not config_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Interview type not found"}
        )
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    questions = config.get('questions', [])
    
    # 質問を検索
    question = next((q for q in questions if q['id'] == question_id), None)
    
    if not question:
        return JSONResponse(
            status_code=404,
            content={"error": "Question not found"}
        )
    
    return {
        "id": question['id'],
        "text": question['text'],
        "category": question['category'],
        "is_last": question_id >= len(questions)
    }


@app.post("/api/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    question_id: int = Form(...)
):
    """
    音声認識エンドポイント
    
    Args:
        file: 音声ファイル
        question_id: 質問ID
        
    Returns:
        文字起こし結果と要約、次の質問
    """
    try:
        # 質問取得
        question = question_flow.get_question(question_id)
        if not question:
            return JSONResponse(
                status_code=404,
                content={"error": "Question not found"}
            )
        
        # 音声データ読み込み
        audio_data = await file.read()
        
        # STT（音声認識）
        transcript = await stt_service.transcribe(audio_data)
        
        # 要約生成
        summary_text = await gemini_service.summarize(question.text, transcript)
        
        # 要約を保存
        summary = Summary(
            question_id=question.id,
            question_text=question.text,
            summary_text=summary_text,
            category=question.category
        )
        interview_summary.add_summary(summary)
        
        # 次の質問を取得
        next_question = question_flow.get_next_question(question_id)
        
        response = {
            "transcript": transcript,
            "summary": summary_text,
            "next_question_id": next_question.id if next_question else None,
            "next_question_text": next_question.text if next_question else None,
            "is_last": question_flow.is_last_question(question_id)
        }
        
        return response
        
    except Exception as e:
        print(f"Error in STT endpoint: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/tts/{question_id}")
async def text_to_speech(question_id: int):
    """
    音声合成エンドポイント
    
    Args:
        question_id: 質問ID
        
    Returns:
        音声ファイル
    """
    try:
        # 質問取得
        question = question_flow.get_question(question_id)
        if not question:
            return JSONResponse(
                status_code=404,
                content={"error": "Question not found"}
            )
        
        # TTS（音声合成）
        audio_data = await tts_service.synthesize(question.text)
        
        # 一時ファイルに保存
        temp_file = Config.OUTPUTS_DIR / f"tts_{question_id}.mp3"
        with open(temp_file, "wb") as f:
            f.write(audio_data)
        
        return FileResponse(
            temp_file,
            media_type="audio/mpeg",
            filename=f"question_{question_id}.mp3"
        )
        
    except Exception as e:
        print(f"Error in TTS endpoint: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/api/docx")
async def generate_docx(request: dict = Body(...)):
    """
    Word文書生成エンドポイント
    全質問の回答をまとめてGemini APIで要約・整形してから文書化
    
    Args:
        request: {"answers": {question_id: {"transcript": "..."}, ...}}
        
    Returns:
        生成されたWordファイル
    """
    try:
        # フロントエンドから全回答とインタビュータイプを受け取る
        answers = request.get("answers", {})
        interview_type = request.get("interview_type", "ippan")
        
        if not answers:
            return JSONResponse(
                status_code=400,
                content={"error": "No answers available"}
            )
        
        # インタビュータイプの設定ファイルを読み込む
        import json
        config_path = Path(__file__).parent / f"config_{interview_type}.json"
        
        if not config_path.exists():
            return JSONResponse(
                status_code=404,
                content={"error": "Interview type configuration not found"}
            )
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        custom_prompt = config.get('summary_prompt', '')
        questions = config.get('questions', [])
        
        # 全質問と回答をまとめたテキストを作成
        all_qa_text = ""
        
        for question_id_str, answer_data in answers.items():
            question_id = int(question_id_str)
            question = next((q for q in questions if q['id'] == question_id), None)
            if question and answer_data.get("transcript"):
                all_qa_text += f"【{question['category']}】{question['text']}\n"
                all_qa_text += f"回答: {answer_data['transcript']}\n\n"
        
        # Gemini APIで全体を要約・整形（1回だけAPI呼び出し）
        print(f"Gemini APIで全回答を要約・整形中... (タイプ: {interview_type})")
        
        # カスタムプロンプトを使用
        summary_prompt = f"""{custom_prompt}

---

{all_qa_text}

[あれば記載]
"""
        
        formatted_content = await gemini_service.summarize("議事録作成", summary_prompt)
        
        # 整形された内容からSummaryオブジェクトを作成
        summaries = []
        for question_id_str, answer_data in answers.items():
            question_id = int(question_id_str)
            question = question_flow.get_question(question_id)
            if question:
                summary = Summary(
                    question_id=question.id,
                    question_text=question.text,
                    summary_text=answer_data.get("transcript", ""),
                    category=question.category
                )
                summaries.append(summary)
        
        # Word文書生成（整形済みの内容を含める）
        output_path = docx_service.generate_document(summaries, formatted_content)
        
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"議事録_{summaries[0].question_id if summaries else 'output'}.docx"
        )
        
    except Exception as e:
        print(f"Error in DOCX endpoint: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


# ローカル開発用
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=Config.HOST,
        port=Config.PORT
    )
