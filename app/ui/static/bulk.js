// 自由入力モード - JavaScriptコード

let interviewType = '';
let recognition = null;
let isRecording = false;

// URLからインタビュータイプを取得
function getInterviewType() {
    const path = window.location.pathname;
    const match = path.match(/\/bulk\/(\w+)/);
    return match ? match[1] : 'ippan';
}

// DOM要素
const freeText = document.getElementById('free-text');
const recordBtn = document.getElementById('record-btn');
const recordingStatus = document.getElementById('recording-status');
const submitBtn = document.getElementById('submit-btn');
const status = document.getElementById('status');

// ステータス表示
function showStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `status-toast ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
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

// Web Speech API（音声認識）の初期化
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        let currentTranscript = '';
        
        recognition.onstart = () => {
            console.log('🎤 音声認識が開始されました');
            updateRecordingStatus(true);
        };
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // リアルタイムで表示
            freeText.value = currentTranscript + finalTranscript + interimTranscript;
            
            // 確定した文字起こしを保存
            if (finalTranscript) {
                currentTranscript += finalTranscript;
            }
        };
        
        recognition.onerror = (event) => {
            console.error('❌ Speech recognition error:', event.error);
            
            if (event.error === 'no-speech') {
                console.log('⏸️ 音声が検出されませんでした');
                return;
            }
            
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                showStatus('マイクの権限が拒否されました', 'error');
                isRecording = false;
                recordBtn.classList.remove('recording');
                updateRecordingStatus(false);
            }
        };
        
        recognition.onend = () => {
            console.log('⏹️ Recognition ended');
            if (isRecording) {
                try {
                    recognition.start();
                } catch (e) {
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
        showStatus('お使いのブラウザは音声認識に対応していません', 'error');
        recordBtn.disabled = true;
    }
}

// 録音開始
const startRecording = () => {
    if (!recognition) {
        showStatus('音声認識が利用できません', 'error');
        return;
    }
    
    if (!isRecording) {
        isRecording = true;
        recordBtn.classList.add('recording');
        try {
            recognition.start();
            showStatus('録音中...', 'success');
        } catch (e) {
            console.error('開始エラー:', e);
            if (!e.message || !e.message.includes('already started')) {
                isRecording = false;
                recordBtn.classList.remove('recording');
                updateRecordingStatus(false);
                showStatus('録音の開始に失敗しました', 'error');
            }
        }
    }
};

// 録音停止
const stopRecording = () => {
    if (recognition && isRecording) {
        isRecording = false;
        recognition.stop();
        recordBtn.classList.remove('recording');
        showStatus('録音を停止しました', 'info');
    }
};

// 録音ボタンイベント
recordBtn.addEventListener('mousedown', startRecording);
recordBtn.addEventListener('mouseup', stopRecording);
recordBtn.addEventListener('mouseleave', stopRecording);
recordBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
});
recordBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
});

// テキストエリアの入力保存
freeText.addEventListener('input', () => {
    console.log('✏️ テキスト入力:', freeText.value.length, '文字');
});

// Word生成
async function generateWord() {
    try {
        const content = freeText.value.trim();
        
        if (!content) {
            showStatus('内容を入力してください', 'error');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        
        showStatus('Wordファイルを生成しています...', 'info');
        
        const response = await fetch('/api/docx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answers: {
                    1: {
                        question: '自由入力内容',
                        answer: content
                    }
                },
                interview_type: 'free'
            }),
        });
        
        if (!response.ok) throw new Error('Word生成に失敗しました');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `議事録_${new Date().toLocaleDateString('ja-JP')}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showStatus('Wordファイルをダウンロードしました！', 'success');
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-file-word"></i> Word生成';
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('Word生成に失敗しました', 'error');
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-file-word"></i> Word生成';
    }
}

// トップに戻るボタン
const backToTopLink = document.getElementById('back-to-top-link');
if (backToTopLink) {
    backToTopLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const hasInput = freeText.value.trim();
        
        if (hasInput) {
            const confirmed = confirm('トップに戻ると、入力データが消えます。\n本当によろしいですか？');
            if (confirmed) {
                window.location.href = '/';
            }
        } else {
            window.location.href = '/';
        }
    });
}

// 送信ボタン
submitBtn.addEventListener('click', generateWord);

// 初期化
async function init() {
    interviewType = getInterviewType();
    console.log('📋 インタビュータイプ:', interviewType);
    initSpeechRecognition();
}

init();
