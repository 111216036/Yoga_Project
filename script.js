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
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historyContainer = document.getElementById('history-container');
const toggleLeaderboardBtn = document.getElementById('toggle-leaderboard-btn');
const leaderboardContainer = document.getElementById('leaderboard-container');

let myChart = null;
let preferenceChart = null;

// ==========================================
// 🌟 4. 設定與動作資料庫
// ==========================================
const HOLD_MS = 5000;                 // 維持完美姿勢幾毫秒才算完成
const VISIBILITY_THRESHOLD = 0.5;     // 關節可見度低於這個值就視為「看不到」
const SPEECH_MIN_GAP = 2500;          // 兩句語音之間最短間隔 (ms)
const SPEECH_REPEAT_GAP = 6000;       // 同一句話重複播報的最短間隔 (ms)
const COLOR_OK = "var(--success-text, #17a35a)";
const COLOR_ERR = "var(--error-text, #e8435a)";
const AVATAR_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='#dfe4ea'/>"
    + "<text x='50%' y='60%' font-size='40' text-anchor='middle'>👤</text></svg>"
);

// 各動作必須「看得到」的關節編號 (MediaPipe Pose)
// 深蹲會依左右側可見度動態決定，所以不在這裡
const POSE_REQUIRED_JOINTS = {
    tree: [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    Raise: [11, 12, 13, 14, 15, 16, 23, 24]
};

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
        subtitle: "Lateral Raise",
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

// ==========================================
// 🌟 6. Firebase 身份驗證邏輯
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (loginBtn) loginBtn.style.display = 'none';
        if (startBtn) startBtn.style.display = 'block';
        if (userWelcome) userWelcome.innerText = `準備好了嗎，${user.displayName || '瑜珈夥伴'}？`;
        if (userDisplay) userDisplay.innerText = `使用者：${user.displayName || '已登入'}`;
    } else {
        currentUser = null;
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
    speakHint("準備開始", { interrupt: true });

    countdownTimer = setInterval(() => {
        count--;
        if (count > 0) {
            numberDiv.innerText = count;
        } else {
            cancelCountdown();
            switchPose(poseKey);
            speakHint(`開始${guide ? guide.title : poseKey}，請就定位`, { interrupt: true });
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

// ✅ 檢查關節是否真的被相機看到（MediaPipe 看不到時也會給座標，只是用猜的）
function allVisible(lm, indices) {
    return indices.every(i => lm[i] && (lm[i].visibility ?? 1) >= VISIBILITY_THRESHOLD);
}

// ==========================================
// 🌟 12. 語音提示系統
// ==========================================
// 設計重點：
// 1. 每一幀先把「這一幀的所有錯誤」收集起來 (queueHint)，幀結束時才挑一句念 (flushHints)
// 2. 挑「最久沒念過」的那句，所以手臂和腿部的錯誤會輪流提醒，不會只念到第一個
// 3. 同一句話有重複間隔，不會一直唸同樣的話
let lastSpeakTime = 0;
const lastSpokenAt = new Map();
let frameHints = [];

function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function speakNow(text) {
    if (!('speechSynthesis' in window)) return;

    // 保留：先 cancel 可以解除瀏覽器語音佇列卡死的狀態
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = 1.1;

    const now = Date.now();
    lastSpeakTime = now;
    lastSpokenAt.set(text, now);
    window.speechSynthesis.speak(utterance);
}

// 單句直接播報（倒數、完成、鼓勵等「一次性」語音）
function speakHint(text, { interrupt = false } = {}) {
    if (!interrupt) {
        const now = Date.now();
        if (now - lastSpeakTime < SPEECH_MIN_GAP) return;
        if (now - (lastSpokenAt.get(text) || 0) < SPEECH_REPEAT_GAP) return;
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
    if (hints.length === 0) return;

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

// 關節看不到 / 沒偵測到人時的提示
function showBodyNotVisible(mode) {
    const msg = mode === 'Raise'
        ? "請讓上半身（雙肩到雙手）完整入鏡"
        : "請站到鏡頭前，讓全身入鏡";

    if (mode === 'tree') {
        setText(armStatusDiv, msg, COLOR_ERR);
        setText(legStatusDiv, "", COLOR_ERR);
    } else if (mode === 'squat') {
        setText(squatStatusDiv, msg, COLOR_ERR);
    } else if (mode === 'Raise') {
        setText(poseResultsDiv, msg, COLOR_ERR);
    }

    setStatus('error');
    resetHold();
    queueHint(msg);
}

// ==========================================
// 🌟 14. 三個動作的判斷邏輯
// ==========================================
function analyzeTree(lm) {
    if (!allVisible(lm, POSE_REQUIRED_JOINTS.tree)) return showBodyNotVisible('tree');

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
    if (!allVisible(lm, idx)) return showBodyNotVisible('squat');

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
    if (!allVisible(lm, POSE_REQUIRED_JOINTS.Raise)) return showBodyNotVisible('Raise');

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
        // 畫面中沒有偵測到人
        showBodyNotVisible(currentPoseMode);
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
    speakHint(`太棒了！${poseNameChinese}完成！`, { interrupt: true });
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
    if (historyContainer) historyContainer.style.display = 'none';
    if (leaderboardContainer) leaderboardContainer.style.display = 'none';
}

// ==========================================
// 18. 個人中心資料讀取
// ==========================================
async function loadProfileData() {
    if (!currentUser) return;

    const nameEl = document.getElementById('profile-name');
    const avatarEl = document.getElementById('profile-avatar');
    const rankEl = document.getElementById('profile-rank');
    const totalScoreEl = document.getElementById('profile-total-score');
    const daysCountEl = document.getElementById('profile-days-count');
    const perfectCountEl = document.getElementById('profile-perfect-count');

    if (nameEl) nameEl.innerText = currentUser.displayName || '瑜珈夥伴';
    if (avatarEl) {
        avatarEl.onerror = () => { avatarEl.onerror = null; avatarEl.src = AVATAR_FALLBACK; };
        avatarEl.src = currentUser.photoURL || AVATAR_FALLBACK;
    }

    // 1. 總積分與段位
    try {
        const userLeaderboardRef = doc(db, "leaderboard", currentUser.uid);
        const docSnap = await getDoc(userLeaderboardRef);
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
        console.error("讀取個人積分失敗", e);
        if (rankEl) rankEl.innerText = "🌱 瑜珈新手";
    }

    // 2. 練習天數、Perfect 次數、動作偏好圓餅圖
    try {
        const historyRef = collection(db, "users", currentUser.uid, "history");
        const querySnapshot = await getDocs(historyRef);
        const uniqueDates = new Set();
        const poseCounts = { '大樹式': 0, '深蹲': 0, '平舉': 0 };

        if (perfectCountEl) perfectCountEl.innerText = querySnapshot.size;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.date) uniqueDates.add(data.date);
            const p = normalizePoseName(data.lastPose);   // 舊資料的「側平舉」會自動歸到「平舉」
            if (poseCounts[p] !== undefined) poseCounts[p]++;
        });

        if (daysCountEl) daysCountEl.innerText = uniqueDates.size;
        drawPreferenceChart([poseCounts['大樹式'], poseCounts['深蹲'], poseCounts['平舉']]);
    } catch (e) {
        console.error("讀取歷史分析失敗", e);
    }
}

function drawPreferenceChart(dataPoints) {
    const chartElem = document.getElementById('posePreferenceChart');
    if (!chartElem) return;
    const ctx = chartElem.getContext('2d');
    if (preferenceChart) preferenceChart.destroy();

    const isDataEmpty = dataPoints.every(val => val === 0);
    const renderData = isDataEmpty ? [1, 1, 1] : dataPoints;
    const bgColors = isDataEmpty
        ? ['#e2e8f0', '#e2e8f0', '#e2e8f0']
        : ['#a29bfe', '#74b9ff', '#81ecec'];

    preferenceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['大樹式', '深蹲', '平舉'],
            datasets: [{
                data: renderData,
                backgroundColor: bgColors,
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                tooltip: { enabled: !isDataEmpty }
            },
            cutout: '60%'
        }
    });
}

// ==========================================
// 19. 歷史紀錄與排行榜資料讀取
// ==========================================
async function loadHistoryData() {
    if (!currentUser) return;
    const historyRef = collection(db, "users", currentUser.uid, "history");
    const q = query(historyRef, orderBy("timestamp", "desc"), limit(7));

    try {
        const querySnapshot = await getDocs(q);
        const dates = [];
        const scores = [];
        const listItems = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            dates.push(data.date);
            scores.push(data.status === 'Perfect' ? 100 : 50);

            let timeString = "";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                timeString = dateObj.toLocaleTimeString('zh-TW', { hour12: false });
            }

            listItems.push(`<li>
                📅 ${escapeHtml(data.date)}
                <span style="color: #747d8c; font-size: 0.85em; margin: 0 5px;">[${escapeHtml(timeString)}]</span>
                - ${escapeHtml(normalizePoseName(data.lastPose))}: <strong style="color: var(--success-text, #17a35a);">${escapeHtml(data.status)}</strong>
            </li>`);
        });

        renderHistoryChart(dates.reverse(), scores.reverse());
        const listContainer = document.getElementById('history-list');
        if (listContainer) {
            listContainer.innerHTML = listItems.length > 0 ? listItems.join('') : '<li style="color: #999;">尚無練習紀錄</li>';
        }
    } catch (e) {
        console.error("讀取紀錄失敗", e);
    }
}

function renderHistoryChart(labels, dataPoints) {
    const chartElem = document.getElementById('historyChart');
    if (!chartElem) return;
    const ctx = chartElem.getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '練習品質 (100=完美)',
                data: dataPoints,
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: { scales: { y: { min: 0, max: 100 } } }
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

toggleHistoryBtn?.addEventListener('click', () => {
    const isVisible = historyContainer?.style.display === 'block';
    closeAllPanels();
    if (!isVisible && historyContainer) {
        historyContainer.style.display = 'block';
        loadHistoryData();
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
