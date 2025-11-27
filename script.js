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
let selectedHandValue = 'random'; // 현재 선택된 핸드 ('random' 또는 'AA' 등)

// DOM 요소
const statusMsg = document.getElementById('statusMsg');
const loadingArea = document.getElementById('loadingArea');
const appArea = document.getElementById('appArea');
const stackSelect = document.getElementById('stackSelect');
const posSelect = document.getElementById('posSelect');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn'); // 초기화 버튼
const showAnswerBtn = document.getElementById('showAnswerBtn');
const answerBox = document.getElementById('answerBox');
const displayStack = document.getElementById('displayStack');
const displayPos = document.getElementById('displayPos');
const handText = document.getElementById('handText');
const strategyName = document.getElementById('strategyName');

// 모달 관련 DOM
const handSelectBtn = document.getElementById('handSelectBtn');
const handModal = document.getElementById('handModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const handGrid = document.getElementById('handGrid');
const selectRandomHandBtn = document.getElementById('selectRandomHandBtn');

// 169 핸드 생성 및 그리드 그리기
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const allHands = [];

// 그리드 생성 함수
function createHandGrid() {
    handGrid.innerHTML = '';
    for (let i = 0; i < ranks.length; i++) {
        for (let j = 0; j < ranks.length; j++) {
            let hand = '';
            let type = '';
            
            if (i === j) {
                hand = ranks[i] + ranks[j];
                type = 'cell-pair';
                allHands.push(hand);
            } else if (i < j) {
                hand = ranks[i] + ranks[j] + 's';
                type = 'cell-suited';
                allHands.push(hand);
            } else {
                hand = ranks[j] + ranks[i] + 'o';
                type = 'cell-offsuit';
                allHands.push(hand);
            }

            const cell = document.createElement('div');
            cell.className = `grid-cell ${type}`;
            cell.textContent = hand;
            cell.onclick = () => selectHand(hand);
            handGrid.appendChild(cell);
        }
    }
}

// 초기화: 페이지 로드
window.addEventListener('DOMContentLoaded', async () => {
    createHandGrid(); // 그리드 생성

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
        
        results.forEach(data => {
            if (!data || !data.meta) return;
            const stack = data.meta.stack_depth;
            const pos = data.meta.position;
            
            if (!strategies[stack]) strategies[stack] = { positions: {} };
            strategies[stack].positions[pos] = data.strategy;
        });

        loadingArea.style.display = 'none';
        appArea.classList.remove('hidden');
        initApp();

    } catch (error) {
        console.error(error);
        statusMsg.textContent = "데이터 로드 실패";
        statusMsg.style.color = "#f44336";
    }
});

function initApp() {
    stackSelect.innerHTML = '<option value="random">Random (랜덤)</option>';
    const stacks = Object.keys(strategies).sort(); 
    stacks.forEach(stack => {
        const option = document.createElement('option');
        option.value = stack;
        option.textContent = stack.toUpperCase();
        stackSelect.appendChild(option);
    });

    stackSelect.addEventListener('change', updatePosSelect);
    updatePosSelect();
}

function updatePosSelect() {
    const selectedStack = stackSelect.value;
    posSelect.innerHTML = '<option value="random">Random (랜덤)</option>';

    if (selectedStack !== 'random' && strategies[selectedStack]) {
        const order = ["UTG", "UTG1", "UTG2", "MP", "HJ", "CO", "BTN", "BU", "SB", "BB"];
        const positions = Object.keys(strategies[selectedStack].positions).sort((a, b) => {
            return order.indexOf(a) - order.indexOf(b);
        });

        positions.forEach(pos => {
            const option = document.createElement('option');
            option.value = pos;
            option.textContent = pos;
            posSelect.appendChild(option);
        });
    }
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- 핸드 선택 로직 ---
function openModal() { handModal.classList.remove('hidden'); }
function closeModal() { handModal.classList.add('hidden'); }

function selectHand(hand) {
    selectedHandValue = hand;
    handSelectBtn.textContent = hand;
    closeModal();
}

function selectRandomHandOption() {
    selectedHandValue = 'random';
    handSelectBtn.textContent = 'Random (랜덤)';
    closeModal();
}

// --- 초기화 로직 ---
function resetAll() {
    stackSelect.value = 'random';
    updatePosSelect(); // 포지션도 random으로 리셋됨
    selectRandomHandOption();
    
    // UI 초기화
    answerBox.classList.add('hidden');
    showAnswerBtn.disabled = true;
    showAnswerBtn.textContent = "정답 보기";
    showAnswerBtn.style.backgroundColor = "var(--accent)";
    handText.textContent = "?";
    handText.style.color = "var(--text)";
    displayStack.textContent = "Stack: --";
    displayPos.textContent = "Pos: --";
}

// --- 퀴즈 생성 ---
function generateQuiz() {
    if (!strategies) return;

    // 1. 스택
    let stack = stackSelect.value;
    if (stack === 'random') {
        const stacks = Object.keys(strategies);
        stack = getRandomItem(stacks);
    }

    // 2. 포지션
    let pos = posSelect.value;
    if (pos === 'random') {
        const validPositions = Object.keys(strategies[stack].positions);
        pos = getRandomItem(validPositions);
    }

    // 3. 핸드 (선택값 or 랜덤)
    let hand = selectedHandValue;
    if (hand === 'random') {
        hand = getRandomItem(allHands);
    }

    currentQuiz = { stack, pos, hand };

    // UI 업데이트
    displayStack.textContent = stack;
    displayPos.textContent = pos;
    handText.textContent = hand;
    
    if (hand.includes('s')) handText.style.color = '#1e88e5'; 
    else if (hand.includes('o')) handText.style.color = '#757575'; 
    else handText.style.color = '#e53935'; 

    answerBox.classList.add('hidden');
    showAnswerBtn.disabled = false;
    showAnswerBtn.textContent = "정답 보기";
    showAnswerBtn.style.backgroundColor = "var(--accent)";
}

function showAnswer() {
    if (!currentQuiz) return;
    const { stack, pos, hand } = currentQuiz;
    const posData = strategies[stack]?.positions[pos];

    let resultStrategy = "FOLD (Not in range)";
    let resultColor = "#888"; 

    if (posData) {
        for (const [stratName, handList] of Object.entries(posData)) {
            if (handList.includes(hand)) {
                resultStrategy = stratName;
                const lower = stratName.toLowerCase();
                if (lower.includes('raise') || lower.includes('4b') || lower.includes('jam')) {
                    resultColor = '#e53935'; 
                } else if (lower.includes('call')) {
                    resultColor = '#fdd835'; 
                } else if (lower.includes('fold')) {
                    resultColor = '#1e88e5'; 
                } else {
                    resultColor = '#4caf50'; 
                }
                break;
            }
        }
    }

    strategyName.textContent = resultStrategy;
    strategyName.style.color = resultColor;

    answerBox.classList.remove('hidden');
    showAnswerBtn.disabled = true;
    showAnswerBtn.textContent = "확인 완료";
    showAnswerBtn.style.backgroundColor = "#444";
}

// 이벤트 리스너
runBtn.addEventListener('click', generateQuiz);
resetBtn.addEventListener('click', resetAll);
showAnswerBtn.addEventListener('click', showAnswer);

// 모달 관련 이벤트
handSelectBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
selectRandomHandOptionBtn = document.getElementById('selectRandomHandBtn');
selectRandomHandOptionBtn.addEventListener('click', selectRandomHandOption);

// 모달 바깥 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target === handModal) closeModal();
});
