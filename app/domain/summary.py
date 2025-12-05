"""
要約データの管理
"""
from dataclasses import dataclass
from typing import Dict

@dataclass
class Summary:
    """要約データクラス"""
    question_id: int
    question_text: str
    summary_text: str
    category: str

class InterviewSummary:
    """インタビュー全体の要約管理"""
    
    def __init__(self):
        self.summaries: Dict[int, Summary] = {}
    
    def add_summary(self, summary: Summary):
        """要約を追加"""
        self.summaries[summary.question_id] = summary
    
    def get_summary(self, question_id: int) -> Summary:
        """指定IDの要約を取得"""
        return self.summaries.get(question_id)
    
    def get_all_summaries(self) -> list:
        """すべての要約を取得（ID順）"""
        return sorted(self.summaries.values(), key=lambda s: s.question_id)
    
    def get_by_category(self, category: str) -> list:
        """カテゴリ別に要約を取得"""
        return [s for s in self.summaries.values() if s.category == category]
