"""
Google Gemini API - 音声認識（STT）サービス
"""
import os
from google import genai
from google.genai import types
from app.config import Config

class STTService:
    """音声認識サービス（Gemini Audio Understanding）"""
    
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
    
    async def transcribe(self, audio_data: bytes) -> str:
        """
        音声データを文字起こし
        
        Args:
            audio_data: 音声データ（バイト列）
            
        Returns:
            文字起こしテキスト
        """
        try:
            # Gemini 2.5 Flash で音声認識
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    '音声の内容を日本語で文字起こししてください。',
                    types.Part.from_bytes(
                        data=audio_data,
                        mime_type='audio/webm',
                    )
                ]
            )
            
            transcript = response.text.strip()
            return transcript
            
        except Exception as e:
            print(f"STT Error: {e}")
            return "音声認識に失敗しました"
