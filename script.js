// ============================================================
// 1. 파일 목록 설정 (서버에 올린 파일명과 정확히 일치해야 합니다)
// ============================================================
const jsonFiles = [
    // 10-20BB Open Raising
    "OR 10-20BB BTN.json",
    "OR 10-20BB CO.json",
    "OR 10-20BB HJ.json",
    "OR 10-20BB MP.json",
    "OR 10-20BB UTG.json",
    "OR 10-20BB UTG1.json",
    "OR 10-20BB UTG2.json",
    "OR 10-20BB SB.json",

    // 20-40BB Response vs 3Bet
    "OR 20-40BB BTN.json",
    "OR 20-40BB CO.json",
    "OR 20-40BB HJ.json",
    "OR 20-40BB MP.json",
    "OR 20-40BB UTG.json",
    "OR 20-40BB UTG1.json",
    "OR 20-40BB UTG2.json",
    "OR 20-40BB SB.json", // 만약 파일명이 "SB Mixed"라면 수정 필요

    // 40-100BB Response vs 3Bet
    "OR 40-100BB BU.json", // 스크린샷에 BU라고 되어있음
    "OR 40-100BB CO.json",
    "OR 40-100BB HJ.json",
    "OR 40-100BB MP.json",
    "OR 40-100BB UTG.json",
    "OR 40-100BB UTG1.json",
    "OR 40-100BB UTG2.json"
];

// ============================================================
// 2. 앱 로직 시작
// ============================================================
let strategies = {}; 
let currentQuiz = null;

const statusMsg = document.getElementById('statusMsg');
const loadingArea = document.getElementById('loadingArea');
const appArea = document.getElementById('appArea');
const stackSelect = document.getElementById('stackSelect');
const posSelect = document.getElementById('posSelect');
const runBtn = document.getElementById('runBtn');
const randomBtn = document.getElementById('randomBtn');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const answerBox = document.getElementById('answerBox');
const displayStack = document.getElementById('displayStack');
const displayPos = document.getElementById('displayPos');
const handText = document.getElementById('handText');
const strategyName = document.getElementById('strategyName');
const actionType = document.getElementById('actionType');

// 169 핸드 생성
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

// 초기화: 페이지 로드 시 모든 JSON fetch
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const fetchPromises = jsonFiles.map(filename => 
            fetch(filename)
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP 에러: ${res.status}`);
                    return res.text(); // 일단 텍스트로 받음
                })
                .then(text => {
                    try {
                        return JSON.parse(text); // 여기서 파싱 시도
                    } catch (err) {
                        // ★ 여기가 핵심: 어떤 파일이 깨졌는지 알려줌
                        console.error(`❌ JSON 문법 오류 발생 파일: ${filename}`);
                        console.error(`내용 확인: ${err.message}`);
                        return null; // 오류 난 파일은 무시하고 진행
                    }
                })
                .catch(err => {
                    console.error(`❌ 파일 로드 실패: ${filename}`, err);
                    return null;
                })
        );

        const results = await Promise.all(fetchPromises);
        
        // 유효한 데이터만 필터링해서 병합
        let loadedCount = 0;
        results.forEach(data => {
            if (!data || !data.meta) return; // 데이터가 없으면 패스

            const stack = data.meta.stack_depth;
            const pos = data.meta.position;
            const action = data.meta.action_type;

            if (!strategies[stack]) {
                strategies[stack] = {
                    actionType: action,
                    positions: {}
                };
            }
            strategies[stack].positions[pos] = data.strategy;
            loadedCount++;
        });

        // 결과 표시
        if (loadedCount > 0) {
            loadingArea.style.display = 'none';
            appArea.classList.remove('hidden');
            initApp();
            console.log(`✅ 총 ${loadedCount}개의 파일이 정상적으로 로드되었습니다.`);
        } else {
            statusMsg.textContent = "모든 JSON 파일에 오류가 있습니다. 콘솔(F12)을 확인하세요.";
            statusMsg.style.color = "#f44336";
        }

    } catch (error) {
        console.error("치명적 오류:", error);
    }
});

function initApp() {
    // 스택 드롭다운
    stackSelect.innerHTML = '<option value="random">Random</option>';
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
    posSelect.innerHTML = '<option value="random">Random</option>';

    if (selectedStack !== 'random' && strategies[selectedStack]) {
        // 포지션 정렬 순서
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

function generateQuiz(isRandomMode) {
    if (!strategies) return;

    let stack = stackSelect.value;
    if (isRandomMode || stack === 'random') {
        const stacks = Object.keys(strategies);
        stack = getRandomItem(stacks);
    }

    let pos = posSelect.value;
    if (isRandomMode || pos === 'random') {
        const validPositions = Object.keys(strategies[stack].positions);
        pos = getRandomItem(validPositions);
    }

    const hand = getRandomItem(allHands);
    currentQuiz = { stack, pos, hand };

    displayStack.textContent = stack;
    displayPos.textContent = pos;
    handText.textContent = hand;
    
    // 핸드 색상
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
    const metaAction = strategies[stack]?.actionType;

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
    actionType.textContent = metaAction || "Action";

    answerBox.classList.remove('hidden');
    showAnswerBtn.disabled = true;
    showAnswerBtn.textContent = "확인 완료";
    showAnswerBtn.style.backgroundColor = "#444";
}

runBtn.addEventListener('click', () => generateQuiz(false));
randomBtn.addEventListener('click', () => generateQuiz(true));
showAnswerBtn.addEventListener('click', showAnswer);
