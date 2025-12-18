"""
Google Gemini API - 要約生成サービス
"""
import os
from google import genai
from app.config import Config

class GeminiService:
    """Gemini要約生成サービス"""
    
    def __init__(self):
        """Gemini APIの初期化"""
        # 環境変数を設定
        os.environ['GOOGLE_API_KEY'] = Config.GEMINI_API_KEY
        
        # プロキシ設定
        if Config.HTTP_PROXY:
            os.environ['HTTP_PROXY'] = Config.HTTP_PROXY
        if Config.HTTPS_PROXY:
            os.environ['HTTPS_PROXY'] = Config.HTTPS_PROXY
            
        self.client = genai.Client()
    
    async def summarize(self, question: str, answer: str) -> str:
        """
        回答を要約
        
        Args:
            question: 質問文
            answer: 回答文
            
        Returns:
            要約文
        """
        try:
            prompt = f"""
以下はインタビューの回答です。
議事録用に簡潔に要約してください。
箇条書きまたは1〜2文程度でまとめてください。

質問: {question}
回答: {answer}

要約:
"""
            
            response = self.client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt
            )
            summary = response.text.strip()
            
            return summary
            
        except Exception as e:
            print(f"Summarization Error: {e}")
            return "（要約生成に失敗しました）"
