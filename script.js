/**
 * Project: 9T's Holdem Tool Script
 * Version: v1.9 (Chart View Added)
 */

// ============================================================
// 1. 파일 목록 설정
// ============================================================
const jsonFiles = [
    // 10-20BB
    "OR 10-20BB BTN.json", "OR 10-20BB CO.json", "OR 10-20BB HJ.json", "OR 10-20BB LJ.json",
    "OR 10-20BB UTG.json", "OR 10-20BB UTG1.json", "OR 10-20BB MP.json", "OR 10-20BB SB.json",
    // 20-40BB
    "OR 20-40BB BTN.json", "OR 20-40BB CO.json", "OR 20-40BB HJ.json", "OR 20-40BB LJ.json",
    "OR 20-40BB UTG.json", "OR 20-40BB UTG1.json", "OR 20-40BB MP.json", "OR 20-40BB SB.json",
    // 40BB+
    "OR 40BB+ BU.json", "OR 40BB+ CO.json", "OR 40BB+ HJ.json", "OR 40BB+ LJ.json",
    "OR 40BB+ UTG.json", "OR 40BB+ UTG1.json", "OR 40BB+ MP.json",
    // PoF
    "Pushing Ranges 10BB.json"
];

let strategies = {}; 
let currentQuiz = null;
let selectedHandValue = 'random'; 
let currentTab = 'OR';
let isAnswerRevealed = false; // 정답 공개 여부 상태 관리

// 169 핸드 목록
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const allHands = [];

// DOM 요소
let stackSelect, posSelect, runBtn, resetBtn, showAnswerBtn, handSelectBtn;
let handModal, closeModalBtn, handGrid, selectRandomHandBtn;
let strategyName, handText, displayStack, displayPos, loadingArea, answerBox;
let tabOR, tabPoF, stackControlGroup;
let modalTitle; // 모달 제목 변경용

// --- 🛠️ 핸드 그리드 생성 함수 (업그레이드됨) ---
// mode: 'select' (핸드 선택용) | 'view' (차트 보기용)
// data: 'view' 모드일 때 사용할 전략 데이터
function renderHandGrid(mode = 'select', data = null) {
    if (!handGrid) return;
    handGrid.innerHTML = ''; // 기존 그리드 초기화
    
    // allHands 채우기 (최초 1회)
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
            let className = 'grid-cell';
            
            // 모드에 따른 스타일링 분기
            if (mode === 'select') {
                // 기존 방식: 페어/수딧/오프수딧 색상
                if (i === j) className += ' cell-pair';
                else if (i < j) className += ' cell-suited';
                else className += ' cell-offsuit';
            } else if (mode === 'view' && data) {
                // 차트 보기 방식: 전략에 따른 색상
                let stratFound = false;
                
                // PoF 모드 데이터 구조 처리 ({ Push: [...] })
                if (currentTab === 'PoF') {
                    if (data["Push"] && data["Push"].includes(hand)) {
                        className += ' strat-push'; // 초록/빨강 등 정의된 색
                        stratFound = true;
                    }
                } 
                // OR 모드 데이터 처리
                else {
                    for (const [stratName, handList] of Object.entries(data)) {
                        if (handList.includes(hand)) {
                            const lower = stratName.toLowerCase();
                            if (lower.includes('raise') || lower.includes('4b') || lower.includes('jam') || lower.includes('push')) {
                                className += ' strat-raise';
                            } else if (lower.includes('call')) {
                                className += ' strat-call';
                            } else if (lower.includes('fold')) {
                                className += ' strat-fold';
                            } else if (lower.includes('limp')) {
                                className += ' strat-limp';
                            } else {
                                className += ' strat-other';
                            }
                            stratFound = true;
                            break;
                        }
                    }
                }
                
                // 전략에 없으면 기본 폴드(또는 빈 공간) 처리
                if (!stratFound) {
                    // PoF 모드에서는 명시되지 않으면 Fold(Blue)로 처리
                    if(currentTab === 'PoF') className += ' strat-fold';
                    else className += ' strat-fold'; // OR 모드에서도 없으면 Fold로 처리
                }
            }

            const cell = document.createElement('div');
            cell.className = className;
            cell.textContent = hand;
            
            // 클릭 이벤트: 선택 모드일 때만 동작
            if (mode === 'select') {
                cell.onclick = () => selectHand(hand);
            }
            
            handGrid.appendChild(cell);
        }
    }
}

// --- 메인 실행 ---
window.addEventListener('DOMContentLoaded', async () => {
    // DOM 바인딩
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
    modalTitle = document.querySelector('.modal-header h3'); // 모달 제목

    tabOR = document.getElementById('tabOR');
    tabPoF = document.getElementById('tabPoF');
    stackControlGroup = document.getElementById('stackControlGroup');

    // 이벤트 리스너
    if(runBtn) runBtn.addEventListener('click', generateQuiz);
    if(resetBtn) resetBtn.addEventListener('click', resetAll);
    
    // 정답 보기 버튼 로직 분기
    if(showAnswerBtn) showAnswerBtn.addEventListener('click', handleAnswerBtnClick);
    
    // 핸드 선택 버튼 (선택 모드로 열기)
    if(handSelectBtn) handSelectBtn.addEventListener('click', () => openModal('select'));
    
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(selectRandomHandBtn) selectRandomHandBtn.addEventListener('click', selectRandomHandOption);
    
    if(tabOR) tabOR.addEventListener('click', () => switchTab('OR'));
    if(tabPoF) tabPoF.addEventListener('click', () => switchTab('PoF'));

    window.addEventListener('click', (e) => {
        if (e.target === handModal) closeModal();
    });

    renderHandGrid('select'); // 초기에는 선택용 그리드 생성
    loadData();
});

async function loadData() {
    try {
        const fetchPromises = jsonFiles.map(filename => 
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
                let stack = data.meta.stack_depth;
                if (stack === '40-100bb') stack = '40BB+';
                const pos = data.meta.position;
                if (!strategies[stack]) strategies[stack] = { positions: {} };
                strategies[stack].positions[pos] = data.strategy;
            } 
            else if (data["10BB"]) {
                if (!strategies["10BB"]) strategies["10BB"] = data["10BB"];
                else Object.assign(strategies["10BB"].positions, data["10BB"].positions);
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
        } else { 
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

// --- 모달 로직 (선택 모드 vs 뷰 모드) ---
function openModal(mode) { 
    if(handModal) {
        handModal.classList.remove('hidden');
        
        if (mode === 'select') {
            modalTitle.textContent = "핸드 선택";
            selectRandomHandBtn.classList.remove('hidden-control'); // 랜덤 버튼 보이기
            renderHandGrid('select'); // 선택용 기본 그리드
        } else if (mode === 'view') {
            if (!currentQuiz) return;
            const { stack, pos } = currentQuiz;
            const posData = strategies[stack]?.positions[pos];
            
            modalTitle.textContent = `${stack} - ${pos} 차트`;
            selectRandomHandBtn.classList.add('hidden-control'); // 랜덤 버튼 숨기기
            renderHandGrid('view', posData); // 전략용 컬러 그리드
        }
    }
}

function closeModal() { if(handModal) handModal.classList.add('hidden'); }

function selectHand(hand) {
    selectedHandValue = hand;
    if(handSelectBtn) handSelectBtn.textContent = hand;
    closeModal();
}

function selectRandomHandOption() {
    selectedHandValue = 'random';
    if(handSelectBtn) handSelectBtn.textContent = 'Random';
    closeModal();
}

function resetAll() {
    initApp(); 
    selectRandomHandOption();
    
    isAnswerRevealed = false;
    if(answerBox) answerBox.classList.add('hidden');
    if(showAnswerBtn) {
        showAnswerBtn.disabled = true;
        showAnswerBtn.textContent = "정답 보기";
        showAnswerBtn.classList.remove('btn-secondary'); // 스타일 원복
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
    
    // UI 리셋
    isAnswerRevealed = false;
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

// --- 정답 버튼 핸들러 (상태에 따라 동작 변경) ---
function handleAnswerBtnClick() {
    if (!isAnswerRevealed) {
        // 1단계: 정답 텍스트 공개
        showAnswerText();
        isAnswerRevealed = true;
        
        // 버튼 상태 변경
        showAnswerBtn.textContent = "차트로 레인지 보기";
        showAnswerBtn.style.backgroundColor = "var(--primary)"; // 초록색 등으로 변경
    } else {
        // 2단계: 차트 모달 열기
        openModal('view');
    }
}

function showAnswerText() {
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
}
