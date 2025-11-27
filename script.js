// ============================================================
// 1. 파일 목록 설정
// ============================================================
const jsonFiles = [
    "OR 10-20BB BTN.json", "OR 10-20BB CO.json", "OR 10-20BB HJ.json", "OR 10-20BB MP.json",
    "OR 10-20BB UTG.json", "OR 10-20BB UTG1.json", "OR 10-20BB UTG2.json", "OR 10-20BB SB.json",
    "OR 20-40BB BTN.json", "OR 20-40BB CO.json", "OR 20-40BB HJ.json", "OR 20-40BB MP.json",
    "OR 20-40BB UTG.json", "OR 20-40BB UTG1.json", "OR 20-40BB UTG2.json", "OR 20-40BB SB.json",
    "OR 40-100BB BU.json", "OR 40-100BB CO.json", "OR 40-100BB HJ.json", "OR 40-100BB MP.json",
    "OR 40-100BB UTG.json", "OR 40-100BB UTG1.json", "OR 40-100BB UTG2.json"
];

let strategies = {}; 
let currentQuiz = null;
let selectedHandValue = 'random'; 

// DOM Element references (defined globally but reassigned in DOMContentLoaded)
let stackSelect, posSelect, runBtn, resetBtn, showAnswerBtn, handSelectBtn;
let handModal, closeModalBtn, handGrid, selectRandomHandBtn;
let strategyName, handText, displayStack, displayPos, loadingArea, answerBox;

// 169 핸드 목록 생성
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const allHands = [];
for (let i = 0; i < ranks.length; i++) {
    for (let j = 0; j < ranks.length; j++) {
        let hand = '';
        if (i === j) hand = ranks[i] + ranks[j];
        else if (i < j) hand = ranks[i] + ranks[j] + 's';
        else hand = ranks[j] + ranks[i] + 'o';
        
        // Ensure allHands is only populated once during the first run of the loop (inside createHandGrid)
        if (allHands.length < 169) allHands.push(hand); 
    }
}

// 초기화: 페이지 로드 시 모든 JSON fetch 및 오류 진단
window.addEventListener('DOMContentLoaded', async () => {
    // === 1. DOM 요소 바인딩 (안전하게 DOMContentLoaded 안에서 실행) ===
    stackSelect = document.getElementById('stackSelect');
    posSelect = document.getElementById('posSelect');
    runBtn = document.getElementById('runBtn');
    resetBtn = document.getElementById('resetBtn');
    showAnswerBtn = document.getElementById('showAnswerBtn');
    
    // UI Elements
    loadingArea = document.getElementById('loadingArea');
    answerBox = document.getElementById('answerBox');
    displayStack = document.getElementById('displayStack');
    displayPos = document.getElementById('displayPos');
    handText = document.getElementById('handText');
    strategyName = document.getElementById('strategyName');
    
    // Modal Elements
    handSelectBtn = document.getElementById('handSelectBtn');
    handModal = document.getElementById('handModal');
    closeModalBtn = document.getElementById('closeModalBtn');
    handGrid = document.getElementById('handGrid');
    selectRandomHandBtn = document.getElementById('selectRandomHandBtn');

    // === 2. 이벤트 리스너 연결 ===
    if(runBtn) runBtn.addEventListener('click', generateQuiz);
    if(resetBtn) resetBtn.addEventListener('click', resetAll);
    if(showAnswerBtn) showAnswerBtn.addEventListener('click', showAnswer);
    if(handSelectBtn) handSelectBtn.addEventListener('click', openModal);
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(selectRandomHandBtn) selectRandomHandBtn.addEventListener('click', selectRandomHandOption);
    window.addEventListener('click', (e) => {
        if (e.target === handModal) closeModal();
    });

    // === 3. 데이터 로드 시작 ===
    createHandGrid(); // 핸드 그리드 생성
    loadData();
});

// --- 데이터 로드 함수 ---
async function loadData() {
    try {
        const fetchPromises = jsonFiles.map(filename => 
            fetch(filename)
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP 에러`);
                    return res.text();
                })
                .then(text => {
                    try { return JSON.parse(text); } 
                    catch (err) { console.error(`JSON 오류: ${filename}`); return null; }
                })
                .catch(err => { console.error(`로드 실패: ${filename}`); return null; })
        );

        const results = await Promise.all(fetchPromises);
        
        let loadedCount = 0;
        results.forEach(data => {
            if (!data || !data.meta) return;
            const stack = data.meta.stack_depth;
            const pos = data.meta.position;
            
            if (!strategies[stack]) strategies[stack] = { positions: {} };
            strategies[stack].positions[pos] = data.strategy;
            loadedCount++;
        });

        if (loadedCount > 0) {
            if(loadingArea) loadingArea.style.display = 'none';
            if(appArea) appArea.classList.remove('hidden');
            initApp();
        } else {
            if(statusMsg) {
                statusMsg.textContent = "데이터 로드 실패. 콘솔 확인.";
                statusMsg.style.color = "#f44336";
            }
        }

    } catch (error) {
        console.error("치명적 오류:", error);
    }
}

// --- 앱 초기화 및 UI 로직 ---

function initApp() {
    if (!stackSelect) return;
    stackSelect.innerHTML = '<option value="random">Random (랜덤)</option>'; // 에러 발생 지점
    
    const stacks = Object.keys(strategies).sort(); 
    stacks.forEach(stack => {
        const option = document.createElement('option');
        option.value = stack;
        option.textContent = stack.toUpperCase();
        stackSelect.appendChild(option);
    });

    if(stackSelect) stackSelect.addEventListener('change', updatePosSelect);
    updatePosSelect();
}

function updatePosSelect() {
    if (!posSelect || !stackSelect) return; // safety check
    const selectedStack = stackSelect.value;
    posSelect.innerHTML = '<option value="random">Random (랜덤)</option>';

    if (selectedStack !== 'random' && strategies[selectedStack]) {
        const order = ["UTG", "UTG1", "UTG2", "MP

