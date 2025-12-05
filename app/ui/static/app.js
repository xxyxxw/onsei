// 議事録インタビューAI - JavaScriptコード

let currentQuestionId = 1;
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
const transcriptText = document.getElementById('transcript-text');
const summaryText = document.getElementById('summary-text');
const recordBtn = document.getElementById('record-btn');
const playAudioBtn = document.getElementById('play-audio-btn');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const status = document.getElementById('status');

// 初期化
async function init() {
    // インタビュータイプを取得
    interviewType = getInterviewType();
    console.log('📋 インタビュータイプ:', interviewType);
    
    // Web Speech API（音声認識）の初期化
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onstart = () => {
            console.log('🎤 音声認識が開始されました');
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
            transcriptText.textContent = displayText;
            
            // 確定した文字起こしを保存
            if (finalTranscript) {
                answersData[currentQuestionId] = {
                    transcript: (answersData[currentQuestionId]?.transcript || '') + finalTranscript
                };
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
            if (event.error === 'not-allowed') {
                showStatus('マイクの権限が拒否されました。ブラウザの設定でマイクを許可してください。', 'error');
                isRecording = false;
                recordBtn.classList.remove('recording');
            } else if (event.error === 'network') {
                showStatus('ネットワークエラーが発生しました。', 'error');
            } else if (event.error !== 'aborted') {
                // abortedはユーザーが停止した場合なので無視
                console.warn('⚠️ その他のエラー:', event.error);
            }
        };
        
        recognition.onend = () => {
            console.log('⏹️ Recognition ended. isRecording:', isRecording);
            // 自動再起動はしない（no-speechエラーのループを防ぐ）
        };
    } else {
        showStatus('お使いのブラウザは音声認識に対応していません。Chrome/Edgeをご利用ください。', 'error');
    }
    
    await loadQuestion(currentQuestionId);
}

// 質問をロード
async function loadQuestion(questionId) {
    try {
        showStatus('質問を読み込み中...', 'info');
        
        const response = await fetch(`/api/${interviewType}/question/${questionId}`);
        const data = await response.json();
        
        if (response.ok) {
            questionTitle.textContent = data.text;
            questionCategory.textContent = data.category;
            currentQuestionId = questionId;
            
            // 保存された回答があれば復元、なければクリア
            if (answersData[questionId]?.transcript) {
                transcriptText.textContent = answersData[questionId].transcript;
            } else {
                transcriptText.textContent = '（録音ボタンを長押しして話してください）';
            }
            
            // 要約は最後にまとめて生成するため非表示
            summaryText.style.display = 'none';
            
            // ナビゲーションボタンの状態
            backBtn.disabled = questionId === 1;
            
            if (data.is_last) {
                nextBtn.style.display = 'none';
                finishBtn.style.display = 'block';
            } else {
                nextBtn.style.display = 'inline-block';
                finishBtn.style.display = 'none';
            }
            
            hideStatus();
        } else {
            showStatus('質問の読み込みに失敗しました', 'error');
        }
    } catch (error) {
        console.error('Error loading question:', error);
        showStatus('エラーが発生しました', 'error');
    }
}

// 音声認識機能（Web Speech API）
recordBtn.addEventListener('mousedown', startRecognition);
recordBtn.addEventListener('mouseup', stopRecognition);
recordBtn.addEventListener('touchstart', startRecognition);
recordBtn.addEventListener('touchend', stopRecognition);

function startRecognition(event) {
    event.preventDefault(); // デフォルト動作を防ぐ
    
    if (!recognition) {
        showStatus('音声認識が利用できません。Google Chromeをお使いください。', 'error');
        return;
    }
    
    if (isRecording) {
        return; // 既に録音中の場合は何もしない
    }
    
    try {
        console.log('Starting recognition...');
        recognition.start();
        isRecording = true;
        recordBtn.classList.add('recording');
        showStatus('🎤 音声認識中... 話してください（ボタンを押したまま）', 'info');
    } catch (error) {
        console.error('Recognition start error:', error);
        if (error.message.includes('already started')) {
            console.log('Recognition already running');
        } else {
            showStatus('音声認識の開始に失敗: ' + error.message, 'error');
        }
    }
}

function stopRecognition(event) {
    event.preventDefault(); // デフォルト動作を防ぐ
    
    if (recognition && isRecording) {
        console.log('Stopping recognition...');
        recognition.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        
        const savedText = answersData[currentQuestionId]?.transcript || '';
        if (savedText.trim()) {
            showStatus('✅ 音声認識を停止しました。「' + savedText.slice(0, 20) + '...」が保存されました。', 'success');
        } else {
            showStatus('⚠️ 音声が認識されませんでした。もう一度お試しください。', 'error');
        }
    }
}

// sendAudio関数は不要（Web Speech APIがリアルタイムで処理）

// 音声再生
playAudioBtn.addEventListener('click', async () => {
    try {
        showStatus('音声を読み込み中...', 'info');
        
        const response = await fetch(`/api/tts/${currentQuestionId}`);
        
        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.play();
            showStatus('音声を再生中...', 'info');
            
            audio.onended = () => {
                hideStatus();
            };
        } else {
            showStatus('音声の再生に失敗しました', 'error');
        }
    } catch (error) {
        console.error('Error playing audio:', error);
        showStatus('エラーが発生しました', 'error');
    }
});

// ナビゲーション
backBtn.addEventListener('click', () => {
    if (currentQuestionId > 1) {
        loadQuestion(currentQuestionId - 1);
    }
});

nextBtn.addEventListener('click', () => {
    loadQuestion(currentQuestionId + 1);
});

// Word生成（全質問の回答をまとめてGemini APIで要約・整形）
finishBtn.addEventListener('click', async () => {
    try {
        // 回答が入力されているか確認
        const hasAnswers = Object.keys(answersData).length > 0;
        if (!hasAnswers) {
            showStatus('回答が入力されていません', 'error');
            return;
        }
        
        showStatus('全回答をAIで要約・整形中...', 'info');
        
        // 全質問の回答とインタビュータイプをサーバーに送信
        const response = await fetch('/api/docx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: answersData,
                interview_type: interviewType
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '議事録_' + new Date().toISOString().slice(0, 10) + '.docx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            showStatus('Word文書をダウンロードしました！', 'success');
        } else {
            const errorData = await response.json();
            showStatus('Word文書の生成に失敗: ' + (errorData.detail || '不明なエラー'), 'error');
        }
    } catch (error) {
        console.error('Error generating docx:', error);
        showStatus('エラーが発生しました: ' + error.message, 'error');
    }
});

// ステータス表示
function showStatus(message, type) {
    status.textContent = message;
    status.className = `status show ${type}`;
}

function hideStatus() {
    status.className = 'status';
}

// ページ読み込み時に初期化
window.addEventListener('DOMContentLoaded', init);
