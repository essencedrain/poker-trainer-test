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

// ============================================================
// 2. 앱 로직
// ============================================================
let strategies = {}; 
let currentQuiz = null;

// DOM 요소
const statusMsg = document.getElementById('statusMsg');
const loadingArea = document.getElementById('loadingArea');
const appArea = document.getElementById('appArea');
const stackSelect = document.getElementById('stackSelect');
const posSelect = document.getElementById('posSelect');
const handSelect = document.getElementById('handSelect'); // 새로 추가됨
const runBtn = document.getElementById('runBtn');
// randomBtn 삭제됨
const showAnswerBtn = document.getElementById('showAnswerBtn');
const answerBox = document.getElementById('answerBox');
const displayStack = document.getElementById('displayStack');
const displayPos = document.getElementById('displayPos');
const handText = document.getElementById('handText');
const strategyName = document.getElementById('strategyName');

// 169 핸드 생성 및 정렬
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const allHands = [];
for (let i = 0; i < ranks.length; i++) {
    for (let j = i; j < ranks.length; j++) {
        if (i === j) allHands.push(ranks[i] + ranks[j]);
        else {
            allHands.push(ranks[i] + ranks[j] + 's');
            allHands.push(ranks[i] + ranks[j] + 'o');
        }
    }
}

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
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
    // 1. 스택 초기화
    stackSelect.innerHTML = '<option value="random">Random (랜덤)</option>';
    const stacks = Object.keys(strategies).sort(); 
    stacks.forEach(stack => {
        const option = document.createElement('option');
        option.value = stack;
        option.textContent = stack.toUpperCase();
        stackSelect.appendChild(option);
    });

    // 2. 핸드 초기화 (전체 핸드 목록 추가)
    handSelect.innerHTML = '<option value="random">Random (랜덤)</option>';
    allHands.forEach(hand => {
        const option = document.createElement('option');
        option.value = hand;
        option.textContent = hand;
        handSelect.appendChild(option);
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

// 퀴즈 생성 (통합된 함수)
function generateQuiz() {
    if (!strategies) return;

    // 1. 스택 결정
    let stack = stackSelect.value;
    if (stack === 'random') {
        const stacks = Object.keys(strategies);
        stack = getRandomItem(stacks);
    }

    // 2. 포지션 결정
    let pos = posSelect.value;
    if (pos === 'random') {
        const validPositions = Object.keys(strategies[stack].positions);
        pos = getRandomItem(validPositions);
    }

    // 3. 핸드 결정 (선택값 or 랜덤)
    let hand = handSelect.value;
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

runBtn.addEventListener('click', generateQuiz);
showAnswerBtn.addEventListener('click', showAnswer);
