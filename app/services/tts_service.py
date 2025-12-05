"""
Google Gemini API - 音声合成（TTS）サービス
"""
from google import genai
from app.config import Config

class TTSService:
    """音声合成サービス（Gemini TTS）"""
    
    def __init__(self):
        """Gemini APIの初期化"""
        self.client = genai.Client(api_key=Config.GEMINI_API_KEY)
    
    async def synthesize(self, text: str) -> bytes:
        """
        テキストを音声データに変換
        
        Args:
            text: 読み上げるテキスト
            
        Returns:
            音声データ（バイト列）
        """
        try:
            # TODO: Gemini TTS API の正式な実装方法に合わせて調整
            # または Google Cloud TTS を使用
            
            # 一旦、空のバイト列を返す（ダミー）
            # 実装時にGemini APIの正式なTTSメソッドに置き換え
            audio_data = b""
            
            return audio_data
            
        except Exception as e:
            print(f"TTS Error: {e}")
            return b""
