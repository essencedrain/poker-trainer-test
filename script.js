/**
 * Project: RYE Range Trainer Script
 * Version: v1.3
 */

// ============================================================
// 1. 파일 목록 설정
// ============================================================
const jsonFiles = [
    // 10-20BB Open Raising
    "OR 10-20BB BTN.json", "OR 10-20BB CO.json", "OR 10-20BB HJ.json", "OR 10-20BB LJ.json",
    "OR 10-20BB UTG.json", "OR 10-20BB UTG1.json", "OR 10-20BB MP.json", "OR 10-20BB SB.json",

    // 20-40BB Response vs 3Bet
    "OR 20-40BB BTN.json", "OR 20-40BB CO.json", "OR 20-40BB HJ.json", "OR 20-40BB LJ.json",
    "OR 20-40BB UTG.json", "OR 20-40BB UTG1.json", "OR 20-40BB MP.json", "OR 20-40BB SB.json",

    // 40-100BB Response vs 3Bet
    "OR 40-100BB BU.json", "OR 40-100BB CO.json", "OR 40-100BB HJ.json", "OR 40-100BB LJ.json",
    "OR 40-100BB UTG.json", "OR 40-100BB UTG1.json", "OR 40-100BB MP.json",

    // Pushing Ranges
    "Pushing Ranges 10BB.json"
];

let strategies = {}; 
let currentQuiz = null;
let selectedHandValue = 'random'; 
let currentTab = 'OR';

// 169 핸드 목록
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const allHands = [];

// DOM 요소 참조
let stackSelect, posSelect, runBtn, resetBtn, showAnswerBtn, handSelectBtn;
let handModal, closeModalBtn, handGrid, selectRandomHandBtn;
let strategyName, handText, displayStack, displayPos, loadingArea, answerBox;
let tabOR, tabPoF, stackControlGroup;

// --- 핸드 그리드 생성 함수 ---
function createHandGrid() {
    if (!handGrid) return;
    handGrid.innerHTML = '';
    
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

// --- 메인 실행 ---
window.addEventListener('DOMContentLoaded', async () => {
    stackSelect = document.getElementById('stackSelect');
    posSelect = document.getElementById('posSelect');
    runBtn = document.getElementById('runBtn');
    resetBtn = document.getElementById('resetBtn');
    showAnswerBtn = document.getElementById('showAnswerBtn');
    strategyName = document.getElementById('strategyName');
    handText = document.getElementById('handText');
    displayStack = document.getElementById('displayStack');
    displayPos = document.getElementById('displayPos');
    
    handSelectBtn = document.getElementById('handSelectBtn');
    handModal = document.getElementById('handModal');
    closeModalBtn = document.getElementById('closeModalBtn');
    handGrid = document.getElementById('handGrid');
    selectRandomHandBtn = document.getElementById('selectRandomHandBtn');
    loadingArea = document.getElementById('loadingArea');
    answerBox = document.getElementById('answerBox');

    tabOR = document.getElementById('tabOR');
    tabPoF = document.getElementById('tabPoF');
    stackControlGroup = document.getElementById('stackControlGroup');

    if(runBtn) runBtn.addEventListener('click', generateQuiz);
    if(resetBtn) resetBtn.addEventListener('click', resetAll);
    if(showAnswerBtn) showAnswerBtn.addEventListener('click', showAnswer);
    if(handSelectBtn) handSelectBtn.addEventListener('click', openModal);
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(selectRandomHandBtn) selectRandomHandBtn.addEventListener('click', selectRandomHandOption);
    
    if(tabOR) tabOR.addEventListener('click', () => switchTab('OR'));
    if(tabPoF) tabPoF.addEventListener('click', () => switchTab('PoF'));

    window.addEventListener('click', (e) => {
        if (e.target === handModal) closeModal();
    });

    createHandGrid(); 
    loadData();
});

async function loadData() {
    try {
        const fetchPromises = jsonFiles.map(filename => 
            // 캐시 방지를 위해 타임스탬프 추가
            fetch(`${filename}?t=${new Date().getTime()}`)
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
            if (!data) return;
            
            if (data.meta) {
                const stack = data.meta.stack_depth;
                const pos = data.meta.position;
                if (!strategies[stack]) strategies[stack] = { positions: {} };
                strategies[stack].positions[pos] = data.strategy;
            } 
            else if (data["10BB"]) {
                if (!strategies["10BB"]) strategies["10BB"] = data["10BB"];
                else {
                    Object.assign(strategies["10BB"].positions, data["10BB"].positions);
                }
            }
        });

        if (loadingArea) loadingArea.style.display = 'none';
        const appArea = document.getElementById('appArea');
        if (appArea) appArea.classList.remove('hidden');
        
        switchTab('OR'); 

    } catch (error) {
        console.error("치명적 오류:", error);
    }
}

function switchTab(tabName) {
    currentTab = tabName;
    
    if (currentTab === 'OR') {
        tabOR.classList.add('active');
        tabPoF.classList.remove('active');
        stackControlGroup.classList.remove('hidden-control'); 
        displayStack.classList.remove('hidden-control'); 
    } else {
        tabPoF.classList.add('active');
        tabOR.classList.remove('active');
        stackControlGroup.classList.add('hidden-control'); 
        displayStack.classList.add('hidden-control'); 
    }

    resetAll();
}

function initApp() {
    if (!stackSelect) return;
    
    // [수정] 텍스트를 Random으로 변경
    stackSelect.innerHTML = '<option value="random">Random</option>';
    
    const allStacks = Object.keys(strategies).sort(); 
    
    allStacks.forEach(stack => {
        if (currentTab === 'PoF') {
            if (stack === '10BB') {
                const option = document.createElement('option');
                option.value = stack;
                option.textContent = stack;
                stackSelect.appendChild(option);
            }
        } else { // OR
            if (stack !== '10BB') {
                const option = document.createElement('option');
                option.value = stack;
                option.textContent = stack.toUpperCase();
                stackSelect.appendChild(option);
            }
        }
    });

    if (currentTab === 'PoF') stackSelect.value = '10BB';
    else stackSelect.value = 'random';

    stackSelect.onchange = updatePosSelect;
    updatePosSelect();
}

function updatePosSelect() {
    if (!posSelect) return;
    
    let targetStack = stackSelect.value;
    
    if (targetStack === 'random') {
        const availableStacks = Object.keys(strategies).filter(s => currentTab === 'PoF' ? s === '10BB' : s !== '10BB');
        if (availableStacks.length > 0) targetStack = availableStacks[0];
    }

    // [수정] 텍스트를 Random으로 변경
    posSelect.innerHTML = '<option value="random">Random</option>';

    if (strategies[targetStack]) {
        const order = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "BU", "SB", "BB"];
        const positions = Object.keys(strategies[targetStack].positions).sort((a, b) => {
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

function openModal() { if(handModal) handModal.classList.remove('hidden'); }
function closeModal() { if(handModal) handModal.classList.add('hidden'); }

function selectHand(hand) {
    selectedHandValue = hand;
    if(handSelectBtn) handSelectBtn.textContent = hand;
    closeModal();
}

function selectRandomHandOption() {
    selectedHandValue = 'random';
    // [수정] 텍스트를 Random으로 변경
    if(handSelectBtn) handSelectBtn.textContent = 'Random';
    closeModal();
}

function resetAll() {
    initApp(); 
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
    
    if(displayStack) {
        if (currentTab === 'PoF') displayStack.textContent = "Stack: 10BB";
        else displayStack.textContent = "Stack: --";
    }
    if(displayPos) displayPos.textContent = "Pos: --";
    
    currentQuiz = null;
}

function generateQuiz() {
    if (!strategies) return;

    let stack = stackSelect.value;
    if (stack === 'random') {
        const allStacks = Object.keys(strategies);
        const validStacks = allStacks.filter(s => currentTab === 'PoF' ? s === '10BB' : s !== '10BB');
        stack = getRandomItem(validStacks);
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

    if(displayStack) displayStack.textContent = `Stack: ${stack}`;
    if(displayPos) displayPos.textContent = `Pos: ${pos}`;
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
        if (currentTab === 'PoF') {
             if (posData["Push"] && posData["Push"].includes(hand)) {
                 resultStrategy = "PUSH";
                 resultColor = "#4caf50"; 
             } else {
                 resultStrategy = "FOLD";
                 resultColor = "#1e88e5"; 
             }
        } 
        else {
            for (const [stratName, handList] of Object.entries(posData)) {
                if (handList.includes(hand)) {
                    resultStrategy = stratName;
                    const lower = stratName.toLowerCase();
                    if (lower.includes('raise') || lower.includes('4b') || lower.includes('jam') || lower.includes('push')) {
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
