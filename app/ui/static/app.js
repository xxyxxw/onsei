// 議事録インタビューAI - JavaScriptコード

let currentQuestionId = 1;
let totalQuestions = 1; // APIから取得して更新
let recognition = null; // Web Speech API
let isRecording = false;
let interviewType = ''; // インタビュータイプ (denryoku, hoken, ippan, other)

// 各質問の回答を保存（文字起こしのみ、要約は最後にまとめて実施）
const answersData = {};

// URLからインタビュータイプを取得
function getInterviewType() {
    const path = window.location.pathname;
    const match = path.match(/\/interview\/(\w+)/);
    return match ? match[1] : 'ippan'; // デフォルトは一般用
}

// DOM要素
const questionTitle = document.getElementById('question-title');
const questionCategory = document.getElementById('question-category');
const questionIdDisplay = document.getElementById('question-id-display'); // 追加
const transcriptText = document.getElementById('transcript-text');
const summaryText = document.getElementById('summary-text');
const recordBtn = document.getElementById('record-btn');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const status = document.getElementById('status');
const recordingStatus = document.getElementById('recording-status'); // 追加
const progressBar = document.getElementById('progress-bar'); // 追加

// エフェクト: ボタンクリック時の波紋
function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];

    if (ripple) {
        ripple.remove();
    }

    button.appendChild(circle);
}

// ボタンに波紋エフェクトを追加
const buttons = document.getElementsByTagName("button");
for (const button of buttons) {
    button.addEventListener("click", createRipple);
}

// 初期化
async function init() {
    // インタビュータイプを取得
    interviewType = getInterviewType();
    console.log('📋 インタビュータイプ:', interviewType);
    
    // 質問一覧を初期化
    await initQuestionSidebar();
    
    // サイドバーのイベントリスナーを設定
    setupSidebarListeners();
    
    // Web Speech API（音声認識）の初期化
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
            console.log('🎤 音声認識が開始されました');
            updateRecordingStatus(true);
        };
        
        recognition.onresult = (event) => {
            console.log('✅ 音声を検出しました！', event);
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                console.log(`結果[${i}]: "${transcript}" (確定: ${event.results[i].isFinal})`);
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // リアルタイムで表示
            const displayText = (answersData[currentQuestionId]?.transcript || '') + finalTranscript + interimTranscript;
            console.log('📝 表示テキスト:', displayText);
            transcriptText.value = displayText;
            
            // 確定した文字起こしを保存
            if (finalTranscript) {
                if (!answersData[currentQuestionId]) {
                    answersData[currentQuestionId] = { transcript: '' };
                }
                answersData[currentQuestionId].transcript = (answersData[currentQuestionId].transcript || '') + finalTranscript;
                console.log('💾 保存:', answersData[currentQuestionId].transcript);
            }
        };
        
        recognition.onerror = (event) => {
            console.error('❌ Speech recognition error:', event.error);
            
            // no-speechエラーは無視（音声が聞こえない場合は正常）
            if (event.error === 'no-speech') {
                console.log('⏸️ 音声が検出されませんでした。話し続けてください。');
                return; // エラー扱いしない
            }
            
            // その他のエラーは表示
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                showStatus('マイクの権限が拒否されました。ブラウザの設定でマイクを許可してください。', 'error');
                isRecording = false;
                recordBtn.classList.remove('recording');
                updateRecordingStatus(false);
            } else if (event.error === 'network') {
                showStatus('ネットワークエラーが発生しました。', 'error');
            } else if (event.error === 'service-not-allowed') {
                showStatus('このブラウザでは音声認識がサポートされていません。Chromeまたはsafariをお試しください。', 'error');
            } else if (event.error !== 'aborted') {
                // abortedはユーザーが停止した場合なので無視
                console.warn('⚠️ その他のエラー:', event.error);
                showStatus('音声認識でエラーが発生しました。もう一度お試しください。', 'error');
            }
        };
        
        recognition.onend = () => {
            console.log('⏹️ Recognition ended. isRecording:', isRecording);
            // 録音中の場合は再開（継続的な録音のため）
            if (isRecording) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('再開エラー:', e);
                    // already startedエラーの場合は無視
                    if (!e.message.includes('already started')) {
                        isRecording = false;
                        recordBtn.classList.remove('recording');
                        updateRecordingStatus(false);
                    }
                }
            } else {
                recordBtn.classList.remove('recording');
                updateRecordingStatus(false);
            }
        };
    } else {
        showStatus('お使いのブラウザは音声認識に対応していません。Chrome/Safari/Edgeをご利用ください。', 'error');
        recordBtn.disabled = true;
        recordBtn.style.opacity = '0.5';
        recordBtn.style.cursor = 'not-allowed';
    }

    // 最初の質問をロード
    await loadQuestion(currentQuestionId);
}

// 録音ステータスの更新
function updateRecordingStatus(recording) {
    if (recordingStatus) {
        if (recording) {
            recordingStatus.classList.add('recording');
            recordingStatus.innerHTML = '<span class="status-dot"></span> 録音中...';
        } else {
            recordingStatus.classList.remove('recording');
            recordingStatus.innerHTML = '<span class="status-dot"></span> 待機中';
        }
    }
}

// 質問をロード
async function loadQuestion(questionId) {
    try {
        // フェードアウトエフェクト
        document.querySelector('.question-card').style.opacity = '0.5';
        document.querySelector('.answer-card').style.opacity = '0.5';
        
        const response = await fetch(`/api/${interviewType}/question/${questionId}`);
        if (!response.ok) {
            throw new Error('質問の取得に失敗しました');
        }
        
        const data = await response.json();
        
        // フェードインエフェクト
        setTimeout(() => {
            document.querySelector('.question-card').style.opacity = '1';
            document.querySelector('.answer-card').style.opacity = '1';
            
            questionTitle.textContent = data.text;
            questionCategory.textContent = data.category;
            if (questionIdDisplay) questionIdDisplay.textContent = questionId;
            
            // APIから総質問数を取得
            if (data.total_questions) {
                totalQuestions = data.total_questions;
            }
            
            // プログレスバーの更新（現在の質問の進捗度を表示）
            const progress = (questionId / totalQuestions) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;

            // サイドバーのアクティブ状態を更新
            updateSidebarActive(questionId);

            // 保存された回答があれば表示
            if (answersData[questionId]?.transcript) {
                transcriptText.value = answersData[questionId].transcript;
            } else {
                transcriptText.value = '';
            }
            
            // 要約エリアをリセット
            summaryText.style.display = 'none';
            
            // ボタンの状態更新
            backBtn.disabled = questionId === 1;
            
            // is_lastフラグで最後の質問かどうか判定
            if (data.is_last) {
                nextBtn.style.display = 'none';
                finishBtn.style.display = 'flex';
            } else {
                nextBtn.style.display = 'flex';
                finishBtn.style.display = 'none';
            }
        }, 300);

    } catch (error) {
        console.error('Error:', error);
        showStatus('質問の読み込みに失敗しました', 'error');
    }
}

// テキストエリアの入力を保存
transcriptText.addEventListener('input', () => {
    const currentText = transcriptText.value;
    if (!answersData[currentQuestionId]) {
        answersData[currentQuestionId] = {};
    }
    answersData[currentQuestionId].transcript = currentText;
    console.log('✏️ キーボード入力を保存:', currentText);
});

// イベントリスナー
// 録音ボタン（長押し対応）
// PC: mousedown/mouseup, スマホ: touchstart/touchend

const startRecording = () => {
    if (!recognition) {
        showStatus('音声認識が利用できません。Chrome/Safari/Edgeをお使いください。', 'error');
        return;
    }
    
    if (!isRecording) {
        // 音声認識開始前に現在のテキストエリアの内容を保存
        const currentText = transcriptText.value;
        if (!answersData[currentQuestionId]) {
            answersData[currentQuestionId] = {};
        }
        answersData[currentQuestionId].transcript = currentText;
        console.log('🎤 録音開始前の既存テキスト:', currentText);
        
        isRecording = true;
        recordBtn.classList.add('recording');
        try {
            recognition.start();
            showStatus('録音中...', 'success');
        } catch (e) {
            console.error('開始エラー:', e);
            // "already started"エラーは無視（既に開始されている場合）
            if (e.message && e.message.includes('already started')) {
                console.log('Recognition already started, continuing...');
            } else {
                isRecording = false;
                recordBtn.classList.remove('recording');
                updateRecordingStatus(false);
                showStatus('録音の開始に失敗しました。もう一度お試しください。', 'error');
            }
        }
    }
};

const stopRecording = () => {
    if (isRecording && recognition) {
        isRecording = false;
        recordBtn.classList.remove('recording');
        try {
            recognition.stop();
            showStatus('録音を停止しました', 'success');
        } catch (e) {
            console.error('停止エラー:', e);
            // エラーが出ても状態はリセット
            updateRecordingStatus(false);
        }
    }
};

// マウスイベント
recordBtn.addEventListener('mousedown', startRecording);
recordBtn.addEventListener('mouseup', stopRecording);
recordBtn.addEventListener('mouseleave', stopRecording);

// タッチイベント（スマホ用）
recordBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // スクロール防止
    e.stopPropagation(); // イベント伝播を停止
    startRecording();
}, { passive: false });

recordBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopRecording();
}, { passive: false });

// タッチキャンセル時も停止
recordBtn.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    stopRecording();
}, { passive: false });

// やり直しボタン
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        // 録音中の場合は停止
        if (isRecording) {
            stopRecording();
        }
        
        // 現在の質問の回答をクリア
        if (answersData[currentQuestionId]) {
            delete answersData[currentQuestionId];
        }
        transcriptText.value = '';
        showStatus('この質問の回答をクリアしました。もう一度録音してください。', 'success');
    });
}

// ナビゲーション
backBtn.addEventListener('click', () => {
    if (currentQuestionId > 1) {
        currentQuestionId--;
        loadQuestion(currentQuestionId);
    }
});

nextBtn.addEventListener('click', () => {
    currentQuestionId++;
    loadQuestion(currentQuestionId);
});

finishBtn.addEventListener('click', async () => {
    try {
        finishBtn.disabled = true;
        finishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        showStatus('議事録を生成しています。しばらくお待ちください...', 'success');
        
        // サーバーに回答データを送信してWord生成
        const response = await fetch('/api/docx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                interview_type: interviewType,
                answers: answersData
            }),
        });
        
        if (!response.ok) throw new Error('生成に失敗しました');
        
        // ダウンロード処理
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `議事録_${new Date().toISOString().slice(0,10)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        finishBtn.disabled = false;
        finishBtn.innerHTML = '<i class="fas fa-file-word"></i> Word生成';
        showStatus('ダウンロードが完了しました！', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('生成に失敗しました', 'error');
        finishBtn.disabled = false;
        finishBtn.innerHTML = '<i class="fas fa-file-word"></i> Word生成';
    }
});

// ステータス表示
function showStatus(message, type = 'info') {
    status.textContent = message;
    status.className = 'status-toast show ' + type;
    
    setTimeout(() => {
        status.className = 'status-toast'; // hide
    }, 3000);
}

// トップに戻るボタンの警告
const backToTopLink = document.getElementById('back-to-top-link');
if (backToTopLink) {
    backToTopLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 回答データがある場合は警告を表示
        const hasAnswers = Object.keys(answersData).length > 0;
        if (hasAnswers) {
            const confirmed = confirm('トップに戻ると、すべての録音データが消えます。\n本当によろしいですか？');
            if (confirmed) {
                window.location.href = '/';
            }
        } else {
            window.location.href = '/';
        }
    });
}
// ==========================================
// 質問一覧サイドバー機能
// ==========================================

// 質問一覧の初期化
async function initQuestionSidebar() {
    try {
        // すべての質問を取得（1から順番に）
        const questions = [];
        let questionId = 1;
        let hasMore = true;
        
        while (hasMore) {
            try {
                const response = await fetch(`/api/${interviewType}/question/${questionId}`);
                if (response.ok) {
                    const data = await response.json();
                    questions.push(data);
                    questionId++;
                    
                    // is_lastフラグで終了判定
                    if (data.is_last) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } catch (error) {
                hasMore = false;
            }
        }
        
        // カテゴリーごとにグループ化
        const groupedQuestions = {};
        questions.forEach(q => {
            if (!groupedQuestions[q.category]) {
                groupedQuestions[q.category] = [];
            }
            groupedQuestions[q.category].push(q);
        });
        
        // HTMLを生成
        const questionList = document.getElementById('question-list');
        questionList.innerHTML = '';
        
        Object.keys(groupedQuestions).forEach(category => {
            const section = document.createElement('div');
            section.className = 'question-section';
            
            const title = document.createElement('div');
            title.className = 'section-title';
            title.innerHTML = `<i class="fas fa-folder"></i> ${category}`;
            section.appendChild(title);
            
            const questionsContainer = document.createElement('div');
            questionsContainer.className = 'section-questions';
            
            groupedQuestions[category].forEach(q => {
                const item = document.createElement('div');
                item.className = 'question-item';
                item.dataset.questionId = q.id;
                
                if (q.id === currentQuestionId) {
                    item.classList.add('active');
                }
                
                item.innerHTML = `
                    <span class="question-number">Q${q.id}</span>
                    <span class="question-text">${q.text}</span>
                `;
                
                item.addEventListener('click', () => {
                    jumpToQuestion(q.id);
                });
                
                questionsContainer.appendChild(item);
            });
            
            section.appendChild(questionsContainer);
            questionList.appendChild(section);
        });
        
    } catch (error) {
        console.error('質問一覧の初期化エラー:', error);
    }
}

// 質問へジャンプ
async function jumpToQuestion(questionId) {
    currentQuestionId = questionId;
    await loadQuestion(questionId);
    
    // アクティブ状態を更新
    document.querySelectorAll('.question-item').forEach(item => {
        if (parseInt(item.dataset.questionId) === questionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // スマホの場合はサイドバーを閉じる
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// サイドバーのイベントリスナー設定
function setupSidebarListeners() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.add('active');
    }
    if (overlay) {
        overlay.classList.add('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.remove('active');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// サイドバーのアクティブ状態を更新
function updateSidebarActive(questionId) {
    document.querySelectorAll('.question-item').forEach(item => {
        if (parseInt(item.dataset.questionId) === questionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 開始
init();
