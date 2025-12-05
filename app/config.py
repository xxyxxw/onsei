"""
アプリケーション設定
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv

# .envファイルの読み込み
load_dotenv()

class Config:
    """アプリケーション設定"""
    
    # Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # プロキシ設定
    HTTP_PROXY = os.getenv("HTTP_PROXY")
    HTTPS_PROXY = os.getenv("HTTPS_PROXY")
    
    # サーバー設定
    DEBUG = os.getenv("DEBUG", "False") == "True"
    HOST = "0.0.0.0"
    PORT = 8001
    
    # ファイルパス
    BASE_DIR = Path(__file__).parent.parent
    OUTPUTS_DIR = BASE_DIR / "outputs"
    CONFIG_JSON = BASE_DIR / "config.json"
    
    # 出力ディレクトリの作成
    OUTPUTS_DIR.mkdir(exist_ok=True)
    
    @classmethod
    def load_questions(cls):
        """質問設定の読み込み"""
        with open(cls.CONFIG_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("questions", [])
