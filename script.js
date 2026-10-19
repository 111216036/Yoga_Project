
// ==========================================
// 🌟 1. 引入 Firebase SDK
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, addDoc, collection, query, orderBy, limit, getDocs, increment, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 🌟 2. Firebase 配置
// （apiKey 放前端是正常的，真正的保護是 Firestore 安全規則，請搭配 firestore.rules 使用）
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCstuIQhwz_Oxc6Q7T_9rbve8AcR6y276w",
    authDomain: "ourgoodgoodproject.firebaseapp.com",
    projectId: "ourgoodgoodproject",
    storageBucket: "ourgoodgoodproject.firebasestorage.app",
    messagingSenderId: "174602665216",
    appId: "1:174602665216:web:335339073c8d5a00efc7e5",
    measurementId: "G-2Y3VQZJRCC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ==========================================
// 3. 取得 DOM 元素
// ==========================================
const landingPage = document.getElementById('landing-page');
const homeView = document.getElementById('home-view');
const workoutView = document.getElementById('workout-view');
const actionsGrid = document.getElementById('actions-grid');
const btnBackHome = document.getElementById('btn-back-home');

// 左側控制區元素
const quickSwitchSelect = document.getElementById('quick-switch-select');
const btnTutorial = document.getElementById('btn-tutorial');
const tutorialVideoContainer = document.getElementById('tutorial-video-container');
const tutorialVideo = document.getElementById('tutorial-video');
const currentWorkoutTitle = document.getElementById('current-workout-title');

const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement?.getContext('2d');
const loadingDiv = document.getElementById('loading');

const statusDisplay = document.getElementById('status-display');
const poseTitle = document.getElementById('pose-title');
const treeInfo = document.getElementById('tree-info');
const squatInfo = document.getElementById('squat-info');
const genericInfo = document.getElementById('generic-info');
const armStatusDiv = document.getElementById('arm-status');
const legStatusDiv = document.getElementById('leg-status');
const squatStatusDiv = document.getElementById('squat-status');
const poseResultsDiv = document.getElementById('pose-results');
const saveStatusDiv = document.getElementById('save-status');

const loginBtn = document.getElementById('login-btn');
const startBtn = document.getElementById('start-btn');
const logoutBtn = document.getElementById('logout-btn');
const userWelcome = document.getElementById('user-welcome');
const userDisplay = document.getElementById('user-display');

// 彈窗相關元素
const introModal = document.getElementById('intro-modal');
const introTitle = document.getElementById('intro-title');
const introVideo = document.getElementById('intro-video');
const introImage = document.getElementById('intro-image');
const introDesc = document.getElementById('intro-desc');
const introTips = document.getElementById('intro-tips');
const introStartBtn = document.getElementById('intro-start-btn');

// 上方抽屜面板元素
const btnProfile = document.getElementById('btn-profile');
const profileContainer = document.getElementById('profile-container');
const toggleFavoritesBtn = document.getElementById('toggle-favorites-btn');
const favoritesContainer = document.getElementById('favorites-container');
const toggleLeaderboardBtn = document.getElementById('toggle-leaderboard-btn');
const leaderboardContainer = document.getElementById('leaderboard-container');

let favoritesChart = null;

// ==========================================
// 🌟 4. 設定與動作資料庫
// ==========================================
const HOLD_MS = 5000;                 // 維持完美姿勢幾毫秒才算完成
const SPEECH_MIN_GAP = 2500;          // 兩句語音之間最短間隔 (ms)
const SPEECH_REPEAT_GAP = 6000;       // 同一句話重複播報的最短間隔 (ms)
const COLOR_OK = "var(--success-text, #17a35a)";
const COLOR_ERR = "var(--error-text, #e8435a)";
const AVATAR_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='#dfe4ea'/>"
    + "<text x='50%' y='60%' font-size='40' text-anchor='middle'>👤</text></svg>"
);

// 平舉判斷門檻
const RAISE = {
    bothTooLow: 60,   // 兩臂都低於此角度 → 請抬起雙臂
    tooHigh: 115,     // 任一臂高於此角度 → 抬太高
    minRaise: 65,     // 單臂低於此角度 → 再抬高
    elbowMin: 140     // 手肘角度低於此值 → 請打直
};

// ⚠️ id 必須和 HTML 下拉選單的 option value 完全一致（含大小寫）：tree / squat / Raise
// ⚠️ videoUrl 請填入你的教學影片網址（mp4 連結），留空則按下教學時會提示尚未設定
const POSE_DATABASE = [
    {
        id: 'tree',
        title: "大樹式",
        subtitle: "Tree Pose",
        img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
        videoUrl: "",
        desc: "大樹式能訓練下肢肌力、單腳平衡感與專注度。",
        tips: [
            "單腳伸直站穩，另一腳曲膝抬起貼於大腿或小腿內側",
            "切勿將腳掌直接壓在支撐腳膝蓋關節上",
            "雙手向上高舉打直伸展，或於胸前合十"
        ]
    },
    {
        id: 'squat',
        title: "深蹲",
        subtitle: "Squat",
        img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80",
        videoUrl: "",
        desc: "深蹲能強化臀大肌、股四頭肌與核心穩定度。",
        tips: [
            "雙腳與肩同寬，腳尖微外展 15-30 度",
            "臀部向後坐，下蹲時膝蓋不超過腳尖過多",
            "背部自然打直，胸口向前挺起"
        ]
    },
    {
        id: 'Raise',
        title: "平舉",
        subtitle: "Raise",
        img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80",
        videoUrl: "",
        desc: "平舉能增強肩膀三角肌與上肢控制力。",
        tips: [
            "雙臂向兩側抬起與地面平行",
            "手臂全程伸直勿微彎",
            "放鬆頸部勿過度聳肩"
        ]
    }
];

// 之前有些紀錄被存成「側平舉」，統一歸回「平舉」
function normalizePoseName(name) {
    return name === '側平舉' ? '平舉' : name;
}

// 沿用既有紀錄，只累計三個動作成功完成的次數。
function countPerfectPoses(querySnapshot) {
    const poseCounts = POSE_DATABASE.map(({ title }) => ({ title, count: 0 }));
    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status !== 'Perfect') return;
        const pose = poseCounts.find(item => item.title === normalizePoseName(data.lastPose));
        if (pose) pose.count++;
    });
    return poseCounts;
}

// 防止 XSS：把使用者可控的文字轉義後再放進 innerHTML
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// ==========================================
// 5. 全域狀態變數
// ==========================================
let currentPoseMode = 'tree';   // 目前「正在偵測」的動作（倒數結束後才會更新）
let selectedPoseId = 'tree';    // 使用者「剛選擇」的動作（教學按鈕用這個）
let currentUser = null;
let canSave = true;
let perfectStartTime = 0;
let hasSavedThisRep = false;
let isIntroActive = false;
let pendingPose = null;
let cameraActive = false;
let countdownTimer = null;
let checkInDates = new Set();
let checkInCalendarMonth = getCheckInDateKey().slice(0, 7);
let checkInLoadState = 'idle';
let checkInSaveFailed = false;
let checkInLoadVersion = 0;
const checkInWrites = new Map();

// ==========================================
// 🌟 6. Firebase 身份驗證邏輯
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userChanged = currentUser?.uid !== user.uid;
        currentUser = user;
        if (userChanged) {
            closeAllPanels();
            resetCheckInCalendar();
        }
        void recordDailyCheckIn(user);
        if (loginBtn) loginBtn.style.display = 'none';
        if (startBtn) startBtn.style.display = 'block';
        if (userWelcome) userWelcome.innerText = `準備好了嗎，${user.displayName || '瑜珈夥伴'}？`;
        if (userDisplay) userDisplay.innerText = `使用者：${user.displayName || '已登入'}`;
    } else {
        currentUser = null;
        closeAllPanels();
        resetCheckInCalendar();
        if (loginBtn) loginBtn.style.display = 'block';
        if (startBtn) startBtn.style.display = 'none';
        if (userWelcome) userWelcome.innerText = "請先登入以記錄你的練習成果";
        if (landingPage) landingPage.style.display = 'flex';
        if (homeView) homeView.style.display = 'none';
        if (workoutView) workoutView.style.display = 'none';
        leaveWorkoutCleanup();
    }
});

loginBtn?.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        console.error("登入失敗", err);
        alert("登入失敗：" + (err.message || "請檢查網路連線"));
    });
});

startBtn?.addEventListener('click', () => {
    if (landingPage) landingPage.style.display = 'none';
    if (homeView) homeView.style.display = 'flex';
    renderActionGrid();
});

logoutBtn?.addEventListener('click', () => {
    signOut(auth);
});

// ==========================================
// 7. 首頁動態渲染動作卡片 & 進入練習室
// ==========================================
function renderActionGrid() {
    if (!actionsGrid) return;
    actionsGrid.innerHTML = '';
    POSE_DATABASE.forEach(pose => {
        const card = document.createElement('div');
        card.className = 'action-card';
        card.innerHTML = `
            <div class="card-media">
                <img src="${pose.img}" alt="${pose.title}" loading="lazy">
            </div>
            <div class="card-body">
                <div>
                    <h4 class="card-title">${pose.title}</h4>
                    <span style="font-size: 0.9rem; color: #a4b0be;">${pose.subtitle}</span>
                </div>
                <span class="card-tag">● 開始練習</span>
            </div>
        `;
        card.addEventListener('click', () => enterWorkout(pose.id));
        actionsGrid.appendChild(card);
    });
}

function enterWorkout(poseId) {
    closeAllPanels();
    if (homeView) homeView.style.display = 'none';
    if (workoutView) workoutView.style.display = 'flex';

    selectedPoseId = poseId;
    const poseItem = POSE_DATABASE.find(p => p.id === poseId);
    if (currentWorkoutTitle && poseItem) {
        currentWorkoutTitle.innerText = `${poseItem.title} 練習室`;
    }
    if (quickSwitchSelect) quickSwitchSelect.value = poseId;

    showPoseUI(poseId);
    startCamera();
    openPoseIntro(poseId);
}

btnBackHome?.addEventListener('click', () => {
    if (workoutView) workoutView.style.display = 'none';
    if (homeView) homeView.style.display = 'flex';
    leaveWorkoutCleanup();
});

// 離開練習室（或登出）時統一清理：相機、影片、倒數、彈窗、語音、計時
function leaveWorkoutCleanup() {
    stopCamera();
    closeTutorial();
    cancelCountdown();
    if (introModal) introModal.style.display = 'none';
    isIntroActive = false;
    pendingPose = null;
    stopSpeaking();
    resetHold();
}

// ==========================================
// 🌟 8. 鏡頭控制（含權限被拒的處理）
// ==========================================
async function startCamera() {
    if (cameraActive) return;
    try {
        await camera.start();
        cameraActive = true;
    } catch (err) {
        console.error("無法開啟鏡頭", err);
        cameraActive = false;
        showCameraError(err);
    }
}

function stopCamera() {
    if (!cameraActive) return;
    camera.stop();
    cameraActive = false;
}

function showCameraError(err) {
    let msg = "無法開啟鏡頭，請檢查裝置與瀏覽器設定。";
    if (err && err.name === 'NotAllowedError') {
        msg = "鏡頭權限被拒絕，請點網址列左邊的鎖頭圖示允許使用鏡頭，然後重新整理頁面。";
    } else if (err && err.name === 'NotFoundError') {
        msg = "找不到鏡頭裝置，請確認鏡頭已連接。";
    } else if (err && err.name === 'NotReadableError') {
        msg = "鏡頭可能正被其他程式使用，請關閉後再試一次。";
    }
    if (loadingDiv) {
        loadingDiv.innerText = msg;
        loadingDiv.style.display = '';
    } else {
        alert(msg);
    }
}

// ==========================================
// 9. 左側控制面板：下拉快速切換 & 教學影片
// ==========================================
function closeTutorial() {
    if (tutorialVideoContainer) tutorialVideoContainer.classList.add('hidden-container');
    if (tutorialVideo) tutorialVideo.pause();
}

quickSwitchSelect?.addEventListener('change', (e) => {
    const poseId = e.target.value;
    selectedPoseId = poseId;

    const poseItem = POSE_DATABASE.find(p => p.id === poseId);
    if (currentWorkoutTitle && poseItem) {
        currentWorkoutTitle.innerText = `${poseItem.title} 練習室`;
    }

    closeTutorial();
    showPoseUI(poseId);
    openPoseIntro(poseId);
});

btnTutorial?.addEventListener('click', () => {
    if (!tutorialVideoContainer || !tutorialVideo) return;

    const isHidden = tutorialVideoContainer.classList.contains('hidden-container');
    if (!isHidden) {
        closeTutorial();
        return;
    }

    // 用「剛選擇的動作」找影片，不會因為倒數還沒結束而拿到上一個動作
    const poseItem = POSE_DATABASE.find(p => p.id === selectedPoseId);
    if (!poseItem || !poseItem.videoUrl) {
        alert("這個動作尚未設定教學影片");
        return;
    }
    if (tutorialVideo.getAttribute('src') !== poseItem.videoUrl) {
        tutorialVideo.src = poseItem.videoUrl;
    }
    tutorialVideoContainer.classList.remove('hidden-container');
    tutorialVideo.play().catch(err => console.warn("教學影片無法自動播放", err));
});

// ==========================================
// 10. 彈窗與 3 秒倒數計時
// ==========================================
function openPoseIntro(poseKey) {
    stopSpeaking();      // 選擇動作時立即停止舊提示，並清空待播語音
    cancelCountdown();   // 避免連續切換時多個倒數同時跑

    const guide = POSE_DATABASE.find(p => p.id === poseKey);
    if (!guide || !introModal) {
        startCountdownForPose(poseKey);
        return;
    }

    pendingPose = poseKey;
    isIntroActive = true;
    resetHold();

    if (introTitle) introTitle.innerText = `${guide.title} (${guide.subtitle})`;
    if (introDesc) introDesc.innerText = guide.desc;
    if (introTips) introTips.innerHTML = guide.tips.map(tip => `<li>${tip}</li>`).join('');

    if (introVideo) introVideo.style.display = 'none';
    if (introImage) {
        introImage.src = guide.img;
        introImage.style.display = 'block';
    }

    introModal.style.display = 'flex';
}

introStartBtn?.addEventListener('click', () => {
    if (introModal) introModal.style.display = 'none';
    isIntroActive = false;
    if (pendingPose) startCountdownForPose(pendingPose);
});

function cancelCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) overlay.style.display = 'none';
}

function startCountdownForPose(poseKey) {
    const overlay = document.getElementById('countdown-overlay');
    const numberDiv = document.getElementById('countdown-number');
    const guide = POSE_DATABASE.find(p => p.id === poseKey);

    if (!overlay || !numberDiv) {
        switchPose(poseKey);
        return;
    }

    cancelCountdown();
    overlay.style.display = 'flex';
    let count = 3;
    numberDiv.innerText = count;
    speakHint("準備開始", { priority: true });

    countdownTimer = setInterval(() => {
        count--;
        if (count > 0) {
            numberDiv.innerText = count;
        } else {
            cancelCountdown();
            switchPose(poseKey);
            speakHint(`開始${guide ? guide.title : poseKey}，請就定位`, { priority: true });
        }
    }, 1000);
}

function switchPose(poseName) {
    currentPoseMode = poseName;
    selectedPoseId = currentPoseMode;
    canSave = true;
    resetHold();

    if (saveStatusDiv) saveStatusDiv.innerText = '';
    showPoseUI(currentPoseMode);
}

// 顯示該動作的提示面板與預設文字。
// 進入練習室、切換動作時會「立刻」呼叫，不必等介紹彈窗和 3 秒倒數結束，
// 這樣一進去就能看到對應的提示區，不會是空白或上一個動作的面板。
function showPoseUI(poseId) {
    setStatus('neutral');

    if (treeInfo) treeInfo.style.display = poseId === 'tree' ? 'block' : 'none';
    if (squatInfo) squatInfo.style.display = poseId === 'squat' ? 'block' : 'none';
    if (genericInfo) genericInfo.style.display = poseId === 'Raise' ? 'block' : 'none';

    const poseItem = POSE_DATABASE.find(p => p.id === poseId);
    if (poseTitle) poseTitle.innerText = `${poseItem ? poseItem.title : poseId} 偵測`;

    // 預設文字（偵測開始後會被即時回饋取代），同時清掉上一個動作留下的紅/綠色
    if (poseId === 'tree') {
        setText(armStatusDiv, "手部請舉過頭頂，或於胸前合十", "");
        setText(legStatusDiv, "請單腳站穩，另一腳曲膝抬高貼於腿側", "");
    } else if (poseId === 'squat') {
        setText(squatStatusDiv, "請開始深蹲", "");
    } else if (poseId === 'Raise') {
        setText(poseResultsDiv, "請將雙臂向兩側抬起至肩膀高度", "");
    }
}

// ==========================================
// 🌟 11. 幾何運算
// ==========================================
// ✅ 修正：MediaPipe 座標是 0~1 的正規化值，x、y 的實際比例不同（800x450），
//    必須先換成像素座標再算角度，否則角度會失真。
function calculateAngle(a, b, c) {
    const W = canvasElement?.width || 800;
    const H = canvasElement?.height || 450;
    const ax = a.x * W, ay = a.y * H;
    const bx = b.x * W, by = b.y * H;
    const cx = c.x * W, cy = c.y * H;

    const radians = Math.atan2(cy - by, cx - bx) - Math.atan2(ay - by, ax - bx);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// ==========================================
// 🌟 12. 語音提示系統
// ==========================================
// 設計重點：
// 1. 每一幀先把「這一幀的所有錯誤」收集起來 (queueHint)，幀結束時才挑一句念 (flushHints)
// 2. 挑「最久沒念過」的那句，所以手臂和腿部的錯誤會輪流提醒，不會只念到第一個
// 3. 同一句話有重複間隔，不會一直唸同樣的話
// 4. 等目前整句唸完才播下一句；只有切換動作或離開練習室會取消語音
let lastSpeakTime = 0;
const lastSpokenAt = new Map();
let frameHints = [];
let activeUtterance = null;
let speechQueue = [];

function stopSpeaking() {
    // 先清空狀態，避免 cancel 觸發的舊回呼重新播放待播提示。
    activeUtterance = null;
    speechQueue = [];
    frameHints = [];
    lastSpeakTime = 0;
    lastSpokenAt.clear();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function speakNow(text) {
    if (!('speechSynthesis' in window) || activeUtterance) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = 1.1;
    // 在 speak 前鎖定，包含瀏覽器尚未發出 onstart 的等待時間。
    activeUtterance = utterance;
    const finishSpeaking = () => {
        // 已取消的舊語音可能延後回報結束，不得影響新動作的語音。
        if (activeUtterance !== utterance) return;
        activeUtterance = null;
        if (speechQueue.length > 0) speakNow(speechQueue.shift());
    };
    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    const now = Date.now();
    lastSpeakTime = now;
    lastSpokenAt.set(text, now);
    window.speechSynthesis.speak(utterance);
}

// 一次性語音依序播報；重要提示略過冷卻，但仍等目前這句唸完。
function speakHint(text, { priority = false } = {}) {
    if (!('speechSynthesis' in window)) return;
    if (activeUtterance?.text === text || speechQueue.includes(text)) return;
    if (!priority) {
        const now = Date.now();
        if (now - lastSpeakTime < SPEECH_MIN_GAP) return;
        if (now - (lastSpokenAt.get(text) || 0) < SPEECH_REPEAT_GAP) return;
    }
    if (activeUtterance) {
        speechQueue.push(text);
        return;
    }
    speakNow(text);
}

// 把這一幀偵測到的錯誤提示收集起來
function queueHint(text) {
    if (!frameHints.includes(text)) frameHints.push(text);
}

// 幀結束時呼叫：從收集到的提示中挑一句最久沒念的來念
function flushHints() {
    const hints = frameHints;
    frameHints = [];
    // 不累積逐幀提示；唸完後再根據最新姿勢選下一句。
    if (hints.length === 0 || activeUtterance) return;

    const now = Date.now();
    if (now - lastSpeakTime < SPEECH_MIN_GAP) return;

    const candidates = hints
        .filter(t => now - (lastSpokenAt.get(t) || 0) >= SPEECH_REPEAT_GAP)
        .sort((a, b) => (lastSpokenAt.get(a) || 0) - (lastSpokenAt.get(b) || 0));

    if (candidates.length > 0) speakNow(candidates[0]);
}

// ==========================================
// 13. 狀態顯示與「維持 5 秒」共用邏輯
// ==========================================
function setStatus(state) {   // 'perfect' | 'error' | 'neutral'
    statusDisplay?.classList.toggle('error', state === 'error');
    statusDisplay?.classList.toggle('perfect', state === 'perfect');
}

function setText(el, text, color) {
    if (!el) return;
    el.innerText = text;
    if (color !== undefined) el.style.color = color;
}

function resetHold() {
    perfectStartTime = 0;
    hasSavedThisRep = false;
}

// 回傳：null = 目前不是完美姿勢；0 = 已達標；正整數 = 還需維持的秒數
function updateHold(isPerfect, poseNameChinese) {
    if (!isPerfect) {
        resetHold();   // ✅ 三個動作都統一重置（原本深蹲漏了 hasSavedThisRep）
        return null;
    }

    if (perfectStartTime === 0) {
        perfectStartTime = Date.now();
        speakHint("很好，請保持");   // 進入完美姿勢時只鼓勵一次
    }

    const held = Date.now() - perfectStartTime;
    if (held >= HOLD_MS) {
        if (!hasSavedThisRep) handlePoseSuccess(poseNameChinese);
        return 0;
    }
    return Math.ceil((HOLD_MS - held) / 1000);
}

// ==========================================
// 🌟 14. 三個動作的判斷邏輯
// ==========================================
function analyzeTree(lm) {
    const shoulderL = lm[11], elbowL = lm[13], wristL = lm[15];
    const shoulderR = lm[12], elbowR = lm[14], wristR = lm[16];
    const hipL = lm[23], kneeL = lm[25], ankleL = lm[27];
    const hipR = lm[24], kneeR = lm[26], ankleR = lm[28];

    let isArmError = false;
    let isLegError = false;

    // ---- 腿部 ----
    const leftKneeAngle = calculateAngle(hipL, kneeL, ankleL);
    const rightKneeAngle = calculateAngle(hipR, kneeR, ankleR);
    const isRightLegLifted = (ankleR.y < ankleL.y - 0.05) && (rightKneeAngle < 145);
    const isLeftLegLifted = (ankleL.y < ankleR.y - 0.05) && (leftKneeAngle < 145);

    if (isRightLegLifted || isLeftLegLifted) {
        const supportName = isRightLegLifted ? '左' : '右';
        const liftName = isRightLegLifted ? '右' : '左';
        const supportAngle = isRightLegLifted ? leftKneeAngle : rightKneeAngle;

        if (supportAngle < 150) {
            setText(legStatusDiv, `錯誤：支撐腳（${supportName}腳）請伸直！`, COLOR_ERR);
            isLegError = true;
            queueHint("支撐腳請伸直");
        } else {
            setText(legStatusDiv, `腿部 PERFECT！(${supportName}腳站穩，${liftName}腳抬起)`, COLOR_OK);
        }
    } else {
        setText(legStatusDiv, "請單腳站穩，另一腳曲膝抬高貼於腿側", COLOR_ERR);
        isLegError = true;
        queueHint("請單腳站立，另一腳曲膝貼於腿側");
    }

    // ---- 手臂 ----
    const leftElbowAngle = calculateAngle(shoulderL, elbowL, wristL);
    const rightElbowAngle = calculateAngle(shoulderR, elbowR, wristR);
    const isOverhead = (wristL.y < shoulderL.y) && (wristR.y < shoulderR.y);
    const isPraying = (Math.abs(wristL.x - wristR.x) < 0.15) &&
                      (Math.abs(wristL.y - wristR.y) < 0.15) &&
                      (wristL.y < hipL.y) && (wristL.y > shoulderL.y - 0.05);

    if (isOverhead) {
        if (leftElbowAngle < 125 || rightElbowAngle < 125) {
            setText(armStatusDiv, "錯誤：雙手高舉時請伸直手肘！", COLOR_ERR);
            isArmError = true;
            queueHint("雙手高舉時手肘請打直");
        } else {
            setText(armStatusDiv, "手臂 PERFECT！(高舉伸展)", COLOR_OK);
        }
    } else if (isPraying) {
        setText(armStatusDiv, "手臂 PERFECT！(胸前合十)", COLOR_OK);
    } else {
        setText(armStatusDiv, "手部請舉過頭頂，或於胸前合十", COLOR_ERR);
        isArmError = true;
        queueHint("手部請舉過頭頂，或於胸前合十");
    }

    // ---- 結算 ----
    const isPerfect = !isArmError && !isLegError;
    setStatus(isPerfect ? 'perfect' : 'error');

    const secondsLeft = updateHold(isPerfect, '大樹式');
    if (secondsLeft > 0) {
        setText(armStatusDiv, `PERFECT! 請維持平衡 ${secondsLeft} 秒...`, COLOR_OK);
    }
}

// 深蹲：自動選「比較看得清楚」的那一側來判斷（原本固定用右側）
function pickBodySide(lm) {
    const vis = (idxs) => idxs.reduce((sum, i) => sum + (lm[i]?.visibility ?? 0), 0);
    return vis([12, 24, 26, 28]) >= vis([11, 23, 25, 27]) ? 'R' : 'L';
}

function analyzeSquat(lm) {
    const side = pickBodySide(lm);
    const idx = side === 'R' ? [12, 24, 26, 28] : [11, 23, 25, 27];

    const [shoulder, hip, knee, ankle] = idx.map(i => lm[i]);
    const hipAngle = calculateAngle(shoulder, hip, knee);
    const kneeAngle = calculateAngle(hip, knee, ankle);

    let message = "請開始深蹲";
    let color = "";   // 空字串 = 使用面板預設的深色文字
    let state = 'neutral';
    let isPerfect = false;

    if (kneeAngle < 140) {
        if (kneeAngle > 110) {
            message = "再蹲低一點！";
            color = "var(--warn-text, #c27803)";
            queueHint("再蹲低一點");
        } else if (hipAngle > 120) {
            message = "錯誤：屁股要翹高，身體不要太直！";
            color = COLOR_ERR;
            state = 'error';
            queueHint("屁股要翹高，身體不要太直");
        } else {
            message = "標準深蹲！繼續保持！";
            color = COLOR_OK;
            state = 'perfect';
            isPerfect = true;
        }
    }

    setText(squatStatusDiv, message, color);
    setStatus(state);

    const secondsLeft = updateHold(isPerfect, '深蹲');
    if (secondsLeft > 0) {
        setText(squatStatusDiv, `HOLD 住了！維持 ${secondsLeft} 秒...`, COLOR_OK);
    }
}

function analyzeRaise(lm) {
    const shoulderL = lm[11], elbowL = lm[13], wristL = lm[15];
    const shoulderR = lm[12], elbowR = lm[14], wristR = lm[16];
    const hipL = lm[23], hipR = lm[24];

    // 手肘伸直角度
    const leftElbowAngle = calculateAngle(shoulderL, elbowL, wristL);
    const rightElbowAngle = calculateAngle(shoulderR, elbowR, wristR);
    // 手臂與軀幹夾角（抬起程度）
    const leftArmRaise = calculateAngle(hipL, shoulderL, elbowL);
    const rightArmRaise = calculateAngle(hipR, shoulderR, elbowR);

    const messages = [];

    if (leftArmRaise < RAISE.bothTooLow && rightArmRaise < RAISE.bothTooLow) {
        messages.push("請將雙臂向兩側抬起至肩膀高度");
    } else if (leftArmRaise > RAISE.tooHigh || rightArmRaise > RAISE.tooHigh) {
        messages.push("手臂抬太高囉，與肩膀平行即可");
    } else {
        if (leftArmRaise < RAISE.minRaise) messages.push("左手請再抬高一些");
        if (rightArmRaise < RAISE.minRaise) messages.push("右手請再抬高一些");
    }

    if (messages.length === 0) {
        if (leftElbowAngle < RAISE.elbowMin) messages.push("左手手肘請盡量打直");
        if (rightElbowAngle < RAISE.elbowMin) messages.push("右手手肘請盡量打直");
    }

    const isPerfect = messages.length === 0;

    if (!isPerfect) {
        if (poseResultsDiv) {
            // pose-results 是 <span>，裡面不放 <div>，改用 <span> + <br> 換行
            poseResultsDiv.innerHTML = messages
                .map(msg => `<span style="color: var(--error-text, #e8435a);">${msg}</span>`)
                .join('<br>');
        }
        messages.forEach(queueHint);   // 全部收集，由 flushHints 輪流挑著念
    }

    setStatus(isPerfect ? 'perfect' : 'error');

    const secondsLeft = updateHold(isPerfect, '平舉');
    if (isPerfect && poseResultsDiv) {
        poseResultsDiv.innerHTML = secondsLeft > 0
            ? `<span style="color: var(--success-text, #17a35a); font-weight: bold;">PERFECT! 手臂維持平舉 ${secondsLeft} 秒...</span>`
            : `<span style="color: var(--success-text, #17a35a); font-weight: bold;">PERFECT! 完成！</span>`;
    }
}

// ==========================================
// 15. AI 偵測主迴圈
// ==========================================
function onResults(results) {
    if (loadingDiv && loadingDiv.style.display !== 'none') {
        loadingDiv.style.display = 'none';
    }
    if (!canvasCtx || !canvasElement) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    const countdownOverlay = document.getElementById('countdown-overlay');
    const isCountdownActive = countdownOverlay && countdownOverlay.style.display === 'flex';

    // 介紹彈窗 / 倒數期間：只畫灰色骨架，不做判斷
    if (isIntroActive || isCountdownActive) {
        frameHints = [];
        if (results.poseLandmarks) {
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#7f8c8d', lineWidth: 2 });
            drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#bdc3c7', lineWidth: 1 });
        }
        canvasCtx.restore();
        return;
    }

    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

        try {
            const lm = results.poseLandmarks;
            switch (currentPoseMode) {
                case 'tree':  analyzeTree(lm);  break;
                case 'squat': analyzeSquat(lm); break;
                case 'Raise': analyzeRaise(lm); break;
            }
        } catch (e) {
            console.warn("Pose processing error:", e);
        }
    } else {
        // 畫面中沒有偵測到人：不顯示提示文字，只把計時歸零
        resetHold();
        setStatus('neutral');
    }

    flushHints();   // 這一幀的所有提示收集完畢，挑一句來念
    canvasCtx.restore();
}

function handlePoseSuccess(poseNameChinese) {
    saveDailyRecord(poseNameChinese, 'Perfect');
    hasSavedThisRep = true;
    if (saveStatusDiv) {
        saveStatusDiv.innerText = `🌟 完美${poseNameChinese}！已記錄！`;
        saveStatusDiv.style.color = COLOR_OK;
    }
    speakHint(`太棒了！${poseNameChinese}完成！`, { priority: true });
}

// ==========================================
// 16. 初始化 MediaPipe
// ==========================================
const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}` });
pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => { await pose.send({ image: videoElement }); },
    width: 800, height: 450
});

// ==========================================
// 17. 資料庫儲存與查詢核心
// ==========================================
async function saveDailyRecord(poseType, status) {
    if (!currentUser || !canSave) return;
    canSave = false;
    const today = new Date().toLocaleDateString('zh-TW').replace(/\//g, '-');
    const historyCol = collection(db, "users", currentUser.uid, "history");
    try {
        await addDoc(historyCol, { date: today, lastPose: poseType, status: status, timestamp: new Date() });
        uploadScore(10);
        setTimeout(() => { canSave = true; }, 5000);
    } catch (e) {
        console.error("儲存紀錄失敗", e);
        canSave = true;   // ✅ 失敗時要解鎖，否則之後永遠存不了
    }
}

async function uploadScore(points) {
    if (!currentUser) return;
    const userLeaderboardRef = doc(db, "leaderboard", currentUser.uid);
    try {
        await setDoc(userLeaderboardRef, {
            name: currentUser.displayName,
            score: increment(points),
            lastUpdate: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("更新排行榜分數失敗", e);
    }
}

// 關閉所有抽屜面板
function closeAllPanels() {
    if (profileContainer) profileContainer.style.display = 'none';
    if (favoritesContainer) favoritesContainer.style.display = 'none';
    if (leaderboardContainer) leaderboardContainer.style.display = 'none';
}

// ==========================================
// 18. 個人中心資料讀取
// ==========================================
async function loadProfileData() {
    if (!currentUser) return;
    const profileUser = currentUser;
    // 簽到獨立載入，不必等待積分或練習紀錄查詢完成。
    void loadCheckInCalendar();

    const nameEl = document.getElementById('profile-name');
    const avatarEl = document.getElementById('profile-avatar');
    const rankEl = document.getElementById('profile-rank');
    const totalScoreEl = document.getElementById('profile-total-score');
    const daysCountEl = document.getElementById('profile-days-count');
    const perfectCountEl = document.getElementById('profile-perfect-count');

    if (nameEl) nameEl.innerText = profileUser.displayName || '瑜珈夥伴';
    if (avatarEl) {
        avatarEl.onerror = () => { avatarEl.onerror = null; avatarEl.src = AVATAR_FALLBACK; };
        avatarEl.src = profileUser.photoURL || AVATAR_FALLBACK;
    }

    // 1. 總積分與段位
    try {
        const userLeaderboardRef = doc(db, "leaderboard", profileUser.uid);
        const docSnap = await getDoc(userLeaderboardRef);
        if (currentUser?.uid !== profileUser.uid) return;
        let currentScore = 0;
        if (docSnap.exists()) currentScore = docSnap.data().score || 0;
        if (totalScoreEl) totalScoreEl.innerText = currentScore;

        if (rankEl) {
            if (currentScore < 50) {
                rankEl.innerText = "🌱 瑜珈新手";
                rankEl.style.background = "#bdc3c7";
                rankEl.style.color = "#2f3542";
            } else if (currentScore < 200) {
                rankEl.innerText = "🧘‍♂️ 瑜珈學徒";
                rankEl.style.background = "#3498db";
                rankEl.style.color = "white";
            } else if (currentScore < 500) {
                rankEl.innerText = "🔥 瑜珈達人";
                rankEl.style.background = "#e67e22";
                rankEl.style.color = "white";
            } else {
                rankEl.innerText = "👑 瑜珈大師";
                rankEl.style.background = "#f1c40f";
                rankEl.style.color = "#c0392b";
            }
        }
    } catch (e) {
        if (currentUser?.uid !== profileUser.uid) return;
        console.error("讀取個人積分失敗", e);
        if (rankEl) rankEl.innerText = "🌱 瑜珈新手";
    }

    // 2. 練習天數與 Perfect 次數；動作分布已移至「我的最愛」。
    try {
        const historyRef = collection(db, "users", profileUser.uid, "history");
        const querySnapshot = await getDocs(historyRef);
        if (currentUser?.uid !== profileUser.uid) return;
        const uniqueDates = new Set();
        const poseCounts = countPerfectPoses(querySnapshot);

        if (perfectCountEl) perfectCountEl.innerText = poseCounts.reduce((total, pose) => total + pose.count, 0);

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'Perfect' && data.date) uniqueDates.add(data.date);
        });

        if (daysCountEl) daysCountEl.innerText = uniqueDates.size;
    } catch (e) {
        console.error("讀取歷史分析失敗", e);
    }
}

// 每日登入簽到獨立儲存，不從 Perfect 紀錄推測過去的登入日期。
function getCheckInDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
}

function isValidCheckInDateKey(dateKey) {
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function resetCheckInCalendar() {
    checkInDates = new Set();
    checkInCalendarMonth = getCheckInDateKey().slice(0, 7);
    checkInLoadState = 'idle';
    checkInSaveFailed = false;
    checkInLoadVersion++;
    renderCheckInCalendar();
}

function recordDailyCheckIn(user = currentUser) {
    if (!user) return Promise.resolve(false);
    const userId = user.uid;
    const dateKey = getCheckInDateKey();
    const writeKey = `${userId}/${dateKey}`;
    if (checkInWrites.has(writeKey)) return checkInWrites.get(writeKey);
    if (currentUser?.uid === userId && checkInDates.has(dateKey)) return Promise.resolve(true);

    const saveTask = Promise.resolve().then(async () => {
        try {
            // 日期作為文件 ID，同一天重複登入或多個分頁也只會有一筆簽到。
            await setDoc(doc(db, 'users', userId, 'checkins', dateKey), {
                date: dateKey,
                timeZone: 'Asia/Taipei'
            }, { merge: true });
            if (currentUser?.uid === userId) {
                checkInDates.add(dateKey);
                checkInSaveFailed = false;
                renderCheckInCalendar();
            }
            return true;
        } catch (error) {
            console.error('儲存登入簽到失敗', error);
            if (currentUser?.uid === userId) {
                checkInSaveFailed = true;
                renderCheckInCalendar();
            }
            return false;
        } finally {
            checkInWrites.delete(writeKey);
        }
    });
    checkInWrites.set(writeKey, saveTask);
    return saveTask;
}

async function loadCheckInCalendar() {
    if (!currentUser) return;
    const user = currentUser;
    const loadVersion = ++checkInLoadVersion;
    const isCurrentRequest = () => currentUser?.uid === user.uid && loadVersion === checkInLoadVersion;
    checkInLoadState = 'loading';
    renderCheckInCalendar();
    await recordDailyCheckIn(user);
    if (!isCurrentRequest()) return;

    try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'checkins'));
        if (!isCurrentRequest()) return;
        const dates = new Set();
        snapshot.forEach(docSnap => {
            const dateKey = docSnap.data().date;
            if (isValidCheckInDateKey(dateKey)) dates.add(dateKey);
        });
        // 保留本次已確認寫入的今日簽到，即使讀取的是較早的快取。
        const today = getCheckInDateKey();
        if (checkInDates.has(today)) dates.add(today);
        checkInDates = dates;
        checkInLoadState = 'ready';
    } catch (error) {
        if (!isCurrentRequest()) return;
        console.error('讀取簽到紀錄失敗', error);
        checkInLoadState = 'error';
    }
    renderCheckInCalendar();
}

function changeCheckInMonth(offset) {
    const [year, month] = checkInCalendarMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    checkInCalendarMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    renderCheckInCalendar();
}

function renderCheckInCalendar() {
    const grid = document.getElementById('checkin-calendar-grid');
    const monthLabel = document.getElementById('checkin-month-label');
    const monthCount = document.getElementById('checkin-month-count');
    const status = document.getElementById('checkin-status');
    if (!grid) return;
    const [year, month] = checkInCalendarMonth.split('-').map(Number);
    const today = getCheckInDateKey();
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    if (monthLabel) monthLabel.textContent = `${year} 年 ${month} 月`;

    const cells = Array.from({ length: firstWeekday }, () => '<div class="checkin-day-empty" aria-hidden="true"></div>');
    let signedDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${checkInCalendarMonth}-${String(day).padStart(2, '0')}`;
        const checkedIn = checkInDates.has(dateKey);
        const isToday = dateKey === today;
        if (checkedIn) signedDays++;
        const classes = ['checkin-day', checkedIn ? 'is-checked-in' : '', isToday ? 'is-today' : ''].filter(Boolean).join(' ');
        const label = `${year}年${month}月${day}日${isToday ? '，今天' : ''}，${checkedIn ? '已簽到' : '未簽到'}`;
        cells.push(`<div class="${classes}" data-date="${dateKey}" role="listitem" aria-label="${label}"${isToday ? ' aria-current="date"' : ''}>
            <span>${day}</span>${checkedIn ? '<span class="checkin-dot" aria-hidden="true">●</span>' : ''}
        </div>`);
    }
    grid.innerHTML = cells.join('');
    if (monthCount) monthCount.textContent = checkInLoadState === 'ready' ? signedDays : '—';
    if (status) {
        if (checkInLoadState === 'loading') status.textContent = '正在載入簽到紀錄…';
        else if (checkInLoadState === 'error') status.textContent = '無法載入簽到紀錄，請按「重新整理」重試。';
        else if (checkInSaveFailed) status.textContent = '今日簽到尚未儲存，請按「重新整理」重試。';
        else if (checkInDates.has(today)) status.textContent = '今天已自動簽到！';
        else status.textContent = '登入後自動簽到。';
    }
}

document.getElementById('checkin-prev-month')?.addEventListener('click', () => changeCheckInMonth(-1));
document.getElementById('checkin-next-month')?.addEventListener('click', () => changeCheckInMonth(1));
document.getElementById('checkin-current-month')?.addEventListener('click', () => {
    checkInCalendarMonth = getCheckInDateKey().slice(0, 7);
    renderCheckInCalendar();
});
document.getElementById('checkin-refresh-btn')?.addEventListener('click', () => { void loadCheckInCalendar(); });

// ==========================================
// 19. 我的最愛與排行榜資料讀取
// ==========================================
async function loadFavoritesData() {
    if (!currentUser) return;
    const userId = currentUser.uid;
    const historyRef = collection(db, "users", userId, "history");
    const summary = document.getElementById('favorites-summary');
    const listContainer = document.getElementById('favorites-list');
    if (summary) summary.textContent = '正在統計你的 Perfect 紀錄…';
    if (listContainer) listContainer.innerHTML = '';
    if (favoritesChart) {
        favoritesChart.destroy();
        favoritesChart = null;
    }

    try {
        // 統計所有紀錄，不受最近 7 次或 timestamp 欄位是否存在影響。
        const querySnapshot = await getDocs(historyRef);
        if (currentUser?.uid !== userId) return;
        const poseCounts = countPerfectPoses(querySnapshot).sort((a, b) => b.count - a.count);
        const highestCount = poseCounts[0].count;
        const favorites = poseCounts.filter(pose => pose.count === highestCount);

        if (summary) {
            if (highestCount === 0) {
                summary.textContent = '尚無 Perfect 紀錄，完成任一動作並維持 5 秒後，就會開始累計。';
            } else if (favorites.length === 1) {
                summary.textContent = `最常完成：${favorites[0].title}（${highestCount} 次 Perfect）`;
            } else {
                summary.textContent = `並列最愛：${favorites.map(pose => pose.title).join('、')}（各 ${highestCount} 次 Perfect）`;
            }
        }

        renderFavoritesChart(poseCounts);
        if (listContainer) {
            listContainer.innerHTML = poseCounts.map((pose, index) => `<li>
                <span>${index + 1}. ${escapeHtml(pose.title)}</span>
                <strong>${pose.count} 次 Perfect</strong>
            </li>`).join('');
        }
    } catch (e) {
        console.error("讀取我的最愛失敗", e);
        if (currentUser?.uid !== userId) return;
        if (summary) summary.textContent = '暫時無法載入我的最愛，請稍後重新開啟重試。';
    }
}

function renderFavoritesChart(poseCounts) {
    const chartElem = document.getElementById('favoritesChart');
    if (!chartElem) return;
    const ctx = chartElem.getContext('2d');
    if (favoritesChart) favoritesChart.destroy();
    const colors = { '大樹式': '#a29bfe', '深蹲': '#74b9ff', '平舉': '#81ecec' };
    favoritesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: poseCounts.map(pose => pose.title),
            datasets: [{
                label: 'Perfect 次數',
                data: poseCounts.map(pose => pose.count),
                backgroundColor: poseCounts.map(pose => colors[pose.title]),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: context => `${context.parsed.y} 次 Perfect` } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 1,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'Perfect 次數' }
                }
            }
        }
    });
}

async function loadLeaderboardData() {
    const leaderboardCol = collection(db, "leaderboard");
    const q = query(leaderboardCol, orderBy("score", "desc"), limit(10));

    try {
        const querySnapshot = await getDocs(q);
        const listElement = document.getElementById("leaderboard-list");
        if (!listElement) return;

        listElement.innerHTML = "";
        let rank = 1;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `🏅 ${rank}.`;

            // ✅ 用 textContent 組裝，不把其他使用者的名字當成 HTML 塞進頁面（防 XSS）
            const li = document.createElement("li");
            const medalEl = document.createElement("strong");
            medalEl.textContent = medal;
            const nameNode = document.createTextNode(` ${data.name || '瑜珈同好'} `);
            const scoreEl = document.createElement("span");
            scoreEl.style.cssText = "float:right; color:#ff9800; font-weight:bold;";
            scoreEl.textContent = `${Number(data.score) || 0} 分`;

            li.append(medalEl, nameNode, scoreEl);
            listElement.appendChild(li);
            rank++;
        });

        if (rank === 1) {
            listElement.innerHTML = '<li style="text-align: center; color: gray;">尚無排行榜資料</li>';
        }
    } catch (e) {
        console.error("讀取排行榜失敗", e);
    }
}

// ==========================================
// 20. 抽屜按鈕切換事件綁定
// ==========================================
btnProfile?.addEventListener('click', () => {
    const isVisible = profileContainer?.style.display === 'block';
    closeAllPanels();
    if (!isVisible && profileContainer) {
        profileContainer.style.display = 'block';
        loadProfileData();
    }
});

toggleFavoritesBtn?.addEventListener('click', () => {
    const isVisible = favoritesContainer?.style.display === 'block';
    closeAllPanels();
    if (!isVisible && favoritesContainer) {
        favoritesContainer.style.display = 'block';
        loadFavoritesData();
    }
});

toggleLeaderboardBtn?.addEventListener('click', () => {
    const isVisible = leaderboardContainer?.style.display === 'block';
    closeAllPanels();
    if (!isVisible && leaderboardContainer) {
        leaderboardContainer.style.display = 'block';
        loadLeaderboardData();
    }
});
