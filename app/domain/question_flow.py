"""
質問フローの管理
"""
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Question:
    """質問データクラス"""
    id: int
    text: str
    category: str

class QuestionFlow:
    """質問フローの管理クラス"""
    
    def __init__(self, questions: List[dict]):
        """
        Args:
            questions: 質問リスト
        """
        self.questions = [
            Question(
                id=q["id"],
                text=q["text"],
                category=q["category"]
            )
            for q in questions
        ]
    
    def get_question(self, question_id: int) -> Optional[Question]:
        """
        指定IDの質問を取得
        
        Args:
            question_id: 質問ID
            
        Returns:
            質問オブジェクト
        """
        for q in self.questions:
            if q.id == question_id:
                return q
        return None
    
    def get_next_question(self, current_id: int) -> Optional[Question]:
        """
        次の質問を取得
        
        Args:
            current_id: 現在の質問ID
            
        Returns:
            次の質問オブジェクト（最後の場合はNone）
        """
        for i, q in enumerate(self.questions):
            if q.id == current_id and i < len(self.questions) - 1:
                return self.questions[i + 1]
        return None
    
    def is_last_question(self, question_id: int) -> bool:
        """
        最後の質問かどうか判定
        
        Args:
            question_id: 質問ID
            
        Returns:
            最後の質問ならTrue
        """
        if not self.questions:
            return True
        return question_id == self.questions[-1].id
