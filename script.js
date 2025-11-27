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

// 169 핸드 목록 생성 (그리드 생성 함수에서 채워짐)
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const allHands = []; // 그리드 생성 시 169개 핸드가 채워집니다.

// DOM 요소 참조 (DOMContentLoaded 안에서 바인딩됨)
let stackSelect, posSelect, runBtn, resetBtn, showAnswerBtn, handSelectBtn;
let handModal, closeModalBtn, handGrid, selectRandomHandBtn;
let strategyName, handText, displayStack, displayPos;

// --- 핸드 그리드 생성 함수 ---
function createHandGrid() {
    if (!handGrid) return;
    handGrid.innerHTML = '';
    
    // allHands 배열 초기화 및 채우기
    if (allHands.length === 0) {
        for (let i = 0; i < ranks.length; i++) {
            for (let j = 0; j < ranks.length; j++) {
                let hand = '';
                if (i === j) hand = ranks[i] + ranks[j];
                else if (i < j) hand = ranks[i] + ranks[j] + 's';
                else hand = ranks[j] + ranks[i] + 'o';
                allHands.push(hand);
            }
        }
    }
    
    // 그리드 셀 생성
    let handIndex = 0;
    for (let i = 0; i < ranks.length; i++) {
        for (let j = 0; j < ranks.length; j++) {
            let hand = allHands[handIndex++];
            let type = '';
            
            if (i === j) type = 'cell-pair';
            else if (i < j) type = 'cell-suited';
            else type = 'cell-offsuit';

            const cell = document.createElement('div');
            cell.className = `grid-cell ${type}`;
            cell.textContent = hand;
            cell.onclick = () => selectHand(hand);
            handGrid.appendChild(cell);
        }
    }
}


// --- 페이지 로드 및 데이터 로직 ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. DOM 요소 바인딩
    stackSelect = document.getElementById('stackSelect');
    posSelect = document.getElementById('posSelect');
    runBtn = document.getElementById('runBtn');
    resetBtn = document.getElementById('resetBtn');
    showAnswerBtn = document.getElementById('showAnswerBtn');
    strategyName = document.getElementById('strategyName');
    handText = document.getElementById('handText');
    displayStack = document.getElementById('displayStack');
    displayPos = document.getElementById('displayPos');
    
    // 모달 요소
    handSelectBtn = document.getElementById('handSelectBtn');
    handModal = document.getElementById('handModal');
    closeModalBtn = document.getElementById('closeModalBtn');
    handGrid = document.getElementById('handGrid');
    selectRandomHandBtn = document.getElementById('selectRandomHandBtn');
    
    // 2. 이벤트 리스너 연결
    if(runBtn) runBtn.addEventListener('click', generateQuiz);
    if(resetBtn) resetBtn.addEventListener('click', resetAll);
    if(showAnswerBtn) showAnswerBtn.addEventListener('click', showAnswer);
    if(handSelectBtn) handSelectBtn.addEventListener('click', openModal);
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(selectRandomHandBtn) selectRandomHandBtn.addEventListener('click', selectRandomHandOption);
    
    window.addEventListener('click', (e) => {
        if (e.target === handModal) closeModal();
    });

    // 3. 핸드 그리드 생성
    createHandGrid(); 
    
    // 4. 데이터 로드
    loadData();
});


async function loadData() {
    // ... (이하 loadData 함수는 이전과 동일) ...
    // (안전을 위해 loadData 함수 내용을 생략하고, 원본 파일의 loadData 함수가 정상이라고 가정합니다.)
    
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
            // 로딩 성공 후 앱 초기화
            const loadingArea = document.getElementById('loadingArea');
            const appArea = document.getElementById('appArea');
            if(loadingArea) loadingArea.style.display = 'none';
            if(appArea) appArea.classList.remove('hidden');
            initApp();
            console.log(`✅ 총 ${loadedCount}개의 파일 로드 완료`);
        } else {
            console.error("데이터 로드 실패. 콘솔 확인.");
        }

    } catch (error) {
        console.error("치명적 오류:", error);
    }
}


function initApp() {
    if (!stackSelect) return;
    stackSelect.innerHTML = '<option value="random">Random (랜덤)</option>';
    
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

// ... (나머지 함수들은 이전과 동일하게 유지)

function updatePosSelect() {
    if (!posSelect) return;
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

// --- 핸드 그리드/모달 로직 ---
function openModal() { if(handModal) handModal.classList.remove('hidden'); }
function closeModal() { if(handModal) handModal.classList.add('hidden'); }

function selectHand(hand) {
    selectedHandValue = hand;
    if(handSelectBtn) handSelectBtn.textContent = hand;
    closeModal();
}

function selectRandomHandOption() {
    selectedHandValue = 'random';
    if(handSelectBtn) handSelectBtn.textContent = 'Random (랜덤)';
    closeModal();
}

// --- 초기화 로직 ---
function resetAll() {
    if(stackSelect) stackSelect.value = 'random';
    updatePosSelect();
    selectRandomHandOption();
    
    if(answerBox) answerBox.classList.add('hidden');
    if(showAnswerBtn) {
        showAnswerBtn.disabled = true;
        showAnswerBtn.textContent = "정답 보기";
        showAnswerBtn.style.backgroundColor = "var(--accent)";
    }
    if(handText) {
        handText.textContent = "?";
        handText.style.color = "var(--text)";
    }
    if(displayStack) displayStack.textContent = "Stack: --";
    if(displayPos) displayPos.textContent = "Pos: --";
    
    currentQuiz = null;
}

// --- 퀴즈 생성 및 실행 ---
function generateQuiz() {
    if (!strategies) return;

    let stack = stackSelect.value;
    if (stack === 'random') {
        const stacks = Object.keys(strategies);
        stack = getRandomItem(stacks);
    }

    let pos = posSelect.value;
    if (pos === 'random') {
        const validPositions = Object.keys(strategies[stack].positions);
        pos = getRandomItem(validPositions);
    }

    let hand = selectedHandValue;
    if (hand === 'random') {
        hand = getRandomItem(allHands);
    }

    currentQuiz = { stack, pos, hand };

    if(displayStack) displayStack.textContent = stack;
    if(displayPos) displayPos.textContent = pos;
    if(handText) {
        handText.textContent = hand;
        if (hand.includes('s')) handText.style.color = '#1e88e5'; 
        else if (hand.includes('o')) handText.style.color = '#757575'; 
        else handText.style.color = '#e53935'; 
    }

    if(answerBox) answerBox.classList.add('hidden');
    if(showAnswerBtn) {
        showAnswerBtn.disabled = false;
        showAnswerBtn.textContent = "정답 보기";
        showAnswerBtn.style.backgroundColor = "var(--accent)";
    }
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

    if(strategyName) {
        strategyName.textContent = resultStrategy;
        strategyName.style.color = resultColor;
    }

    if(answerBox) answerBox.classList.remove('hidden');
    if(showAnswerBtn) {
        showAnswerBtn.disabled = true;
        showAnswerBtn.textContent = "확인 완료";
        showAnswerBtn.style.backgroundColor = "#444";
    }
}

// 이벤트 리스너
runBtn.addEventListener('click', generateQuiz);
if (resetBtn) resetBtn.addEventListener('click', resetAll);
showAnswerBtn.addEventListener('click', showAnswer);
