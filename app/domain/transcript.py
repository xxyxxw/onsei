"""
文字起こしデータの管理
"""
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Transcript:
    """文字起こしデータクラス"""
    question_id: int
    question_text: str
    raw_text: str
    timestamp: datetime
    
    def __init__(self, question_id: int, question_text: str, raw_text: str):
        self.question_id = question_id
        self.question_text = question_text
        self.raw_text = raw_text
        self.timestamp = datetime.now()
