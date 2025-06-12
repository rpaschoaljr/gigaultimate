// --- Variáveis de Estado Globais ---
let currentModelObject = null;
let isWaitingForStart = false;
let isWaitingForEvo = false;
let isTestRunning = false;
let currentTestColumnIndex = 0;
const INITIAL_COMMAND_COLUMN_INDEX = 4;
const START_TEST_COLUMN_INDEX = 5;
let aprovadosCount = 0;
let reprovadosCount = 0;

// --- Elementos da UI ---
let noticeBoard, pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator, aprovadosCountSpan, reprovadosCountSpan,
    sectraInput, loteInput, sectraReceivedValue, loteReceivedValue;


// --- Funções Auxiliares ---

function updateCountDisplay() {
    if (aprovadosCountSpan) aprovadosCountSpan.textContent = aprovadosCount;
    if (reprovadosCountSpan) reprovadosCountSpan.textContent = reprovadosCount;
}

function selectModel(model) {
    if (!model || !model.allData) return;
    currentModelObject = model;
    isWaitingForStart = true;
    isWaitingForEvo = false;
    isTestRunning = false;
    document.getElementById('modelo-display').textContent = model.name;
    document.getElementById('notice-board').value = 'Aguardando o botão de início...';
    [pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator].forEach(ind => {
        if (ind) ind.className = 'status-indicator';
    });
    if (sectraInput) sectraInput.classList.remove('match', 'mismatch');
    if (loteInput) loteInput.classList.remove('match', 'mismatch');
    if (sectraReceivedValue) sectraReceivedValue.textContent = '---';
    if (loteReceivedValue) loteReceivedValue.textContent = '---';
    window.api.sendToArduino(currentModelObject.allData[INITIAL_COMMAND_COLUMN_INDEX]);
    document.getElementById('tag-section').classList.toggle('hidden', !model.showTag);
    document.getElementById('membrana-section').classList.toggle('hidden', !model.showMembrana);
}

function processNextTestStep() {
    if (!isTestRunning || !currentModelObject) return;
    const command = currentModelObject.allData[currentTestColumnIndex];
    if (!command || String(command).toUpperCase() === 'OK') {
        noticeBoard.value = "Sucesso! Pressione o botão para iniciar novamente.";
        isTestRunning = false;
        isWaitingForStart = true;
        aprovadosCount++;
        updateCountDisplay();
        [pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator].forEach(ind => {
            if (ind && !ind.parentElement.parentElement.classList.contains('hidden')) {
                if (!ind.classList.contains('fail')) ind.className = 'status-indicator ok';
            }
        });
        window.api.sendToArduino(currentModelObject.allData[INITIAL_COMMAND_COLUMN_INDEX]);
        return;
    }
    const firstChar = String(command).charAt(0).toUpperCase();
    if (firstChar === 'S') {
        noticeBoard.value = `Configurando: ${command}`;
        [pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator].forEach(ind => {
            if (ind) ind.className = 'status-indicator';
        });
        window.api.sendToArduino(command);
        currentTestColumnIndex++;
        setTimeout(processNextTestStep, 100);
        return;
    }
    noticeBoard.value = `Testando: ${command}...`;
    window.api.sendToArduino(command);
}

/**
 * NOVO: Função centralizada para iniciar a sequência de testes.
 */
function startTestSequence() {
    isTestRunning = true;
    isWaitingForStart = false;
    isWaitingForEvo = false;
    currentTestColumnIndex = START_TEST_COLUMN_INDEX;

    // Reseta os indicadores de teste para o estado "testando"
    [pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator].forEach(ind => {
        if (ind && !ind.parentElement.parentElement.classList.contains('hidden')) {
            ind.className = 'status-indicator testing';
        }
    });

    // Reseta os campos de validação de Sectra e Lote
    if (sectraReceivedValue) sectraReceivedValue.textContent = '---';
    if (sectraInput) sectraInput.classList.remove('match', 'mismatch');
    if (loteReceivedValue) loteReceivedValue.textContent = '---';
    if (loteInput) loteInput.classList.remove('match', 'mismatch');

    // Inicia o primeiro passo da sequência
    processNextTestStep();
}


let pendingModel = null;
function showModal(modelToConfirm) {
    pendingModel = modelToConfirm;
    document.getElementById('confirmation-modal').classList.remove('hidden');
}
function hideModal() {
    pendingModel = null;
    document.getElementById('confirmation-modal').classList.add('hidden');
}
function updateScrollButtonsVisibility(scrollElement, upButton, downButton) {
    if (!scrollElement || !upButton || !downButton) return;
    const tolerance = 1;
    const showUp = scrollElement.scrollTop > tolerance;
    upButton.classList.toggle('hidden', !showUp);
    const showDown = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight > tolerance;
    downButton.classList.toggle('hidden', !showDown);
}


// --- LÓGICA PRINCIPAL DA PÁGINA ---
window.addEventListener('DOMContentLoaded', async () => {

    noticeBoard = document.getElementById('notice-board');
    pressurizacaoIndicator = document.querySelector('#pressurizacao-section .status-indicator');
    conformidadeIndicator = document.querySelector('#conformidade-section .status-indicator');
    estanqueidadeIndicator = document.querySelector('#estanqueidade-section .status-indicator');
    tagIndicator = document.querySelector('#tag-section .status-indicator');
    aprovadosCountSpan = document.getElementById('aprovados-count');
    reprovadosCountSpan = document.getElementById('reprovados-count');
    sectraInput = document.getElementById('codigo-sectra-input');
    loteInput = document.getElementById('lote-input');
    sectraReceivedValue = document.getElementById('sectra-received-value');
    loteReceivedValue = document.getElementById('lote-received-value');
    const sidebar = document.getElementById('sidebar');
    const closeButton = document.getElementById('closeButton');
    const scrollUpBtn = document.getElementById('scroll-up-btn');
    const scrollDownBtn = document.getElementById('scroll-down-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmChangeBtn = document.getElementById('confirm-change-btn');
    const cancelChangeBtn = document.getElementById('cancel-change-btn');
    const equipoValueSpan = document.getElementById('equipo-value');
    const membranaValueSpan = document.getElementById('membrana-value');
    const tempoValueSpan = document.getElementById('tempo-value');

    window.api.onArduinoData((data) => {
        if (data.type === 'EVO_X' && currentModelObject && currentModelObject.isEvo) {
            isTestRunning = false;
            isWaitingForStart = false;
            isWaitingForEvo = false;
            noticeBoard.value = 'Botão EVO desabilitado. Teste interrompido.';
            [pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator].forEach(ind => {
                if (ind && !ind.parentElement.parentElement.classList.contains('hidden')) {
                    ind.className = 'status-indicator fail';
                }
            });
            return;
        }

        switch (data.type) {
            case '1P':
                if (equipoValueSpan) equipoValueSpan.textContent = `${data.value} mmHg`;
                break;
            case '2P':
                if (membranaValueSpan) membranaValueSpan.textContent = `${data.value} mmHg`;
                break;
            case 'M':
                if (tempoValueSpan) {
                    const seconds = (parseInt(data.value, 10) / 1000).toFixed(3);
                    tempoValueSpan.textContent = `${seconds}s`;
                }
                break;
            case 'B0':
                if (isTestRunning || isWaitingForEvo) {
                    isTestRunning = false;
                    isWaitingForStart = true;
                    isWaitingForEvo = false;
                    noticeBoard.value = 'Teste cancelado. Pressione o botão para iniciar.';
                    [pressurizacaoIndicator, conformidadeIndicator, estanqueidadeIndicator, tagIndicator].forEach(ind => {
                        if (ind) ind.className = 'status-indicator';
                    });
                    if (currentModelObject) {
                        window.api.sendToArduino(currentModelObject.allData[INITIAL_COMMAND_COLUMN_INDEX]);
                    }
                }
                break;
            case 'B1':
                if (isWaitingForStart && currentModelObject) {
                    if (currentModelObject.isEvo) {
                        isWaitingForStart = false;
                        isWaitingForEvo = true;
                        noticeBoard.value = 'Aguardando botão EVO...';
                    } else {
                        startTestSequence();
                    }
                }
                break;
            case 'EVO_1':
                if (isWaitingForEvo) {
                    startTestSequence();
                }
                break;
            case 'S_response':
                if (isTestRunning && data.value.startsWith('S') && data.value.length >= 7) {
                    const receivedSectra = data.value.substring(1);
                    sectraReceivedValue.textContent = receivedSectra;
                    const userSectra = sectraInput.value;
                    sectraInput.classList.remove('match', 'mismatch');
                    sectraInput.classList.add(userSectra === receivedSectra ? 'match' : 'mismatch');
                    currentTestColumnIndex++;
                    processNextTestStep();
                }
                break;
            case 'N_response':
                if (isTestRunning && data.value.startsWith('N') && data.value.length >= 6) {
                    const receivedLote = data.value.substring(1);
                    loteReceivedValue.textContent = receivedLote;
                    const userLote = loteInput.value;
                    loteInput.classList.remove('match', 'mismatch');
                    loteInput.classList.add(userLote === receivedLote ? 'match' : 'mismatch');
                    currentTestColumnIndex++;
                    processNextTestStep();
                }
                break;
            case 'message':
                if (isTestRunning) {
                    const response = data.value.trim().toUpperCase();
                    console.log(`Resposta de teste recebida do Arduino: ${response}`);
                    if (response.length === 2) {
                        const testType = response.charAt(0);
                        const testResult = response.charAt(1);
                        let targetIndicator;
                        switch (testType) {
                            case 'P': targetIndicator = pressurizacaoIndicator; break;
                            case 'C': targetIndicator = conformidadeIndicator; break;
                            case 'E': targetIndicator = estanqueidadeIndicator; break;
                            case 'T': targetIndicator = tagIndicator; break;
                        }
                        if (targetIndicator) {
                            if (testResult === '1') {
                                targetIndicator.className = 'status-indicator ok';
                                currentTestColumnIndex++;
                                processNextTestStep();
                            } else if (testResult === '0') {
                                targetIndicator.className = 'status-indicator fail';
                                const failedCommand = currentModelObject.allData[currentTestColumnIndex];
                                noticeBoard.value = `Falha no teste: ${failedCommand}. Pressione o botão para iniciar novamente.`;
                                isTestRunning = false;
                                isWaitingForStart = true;
                                reprovadosCount++;
                                updateCountDisplay();
                                window.api.sendToArduino(currentModelObject.allData[INITIAL_COMMAND_COLUMN_INDEX]);
                            }
                        }
                    }
                }
                break;
        }
    });

    sidebar.addEventListener('scroll', () => updateScrollButtonsVisibility(sidebar, scrollUpBtn, scrollDownBtn));
    const scrollAmount = 120 + 10;
    scrollUpBtn.addEventListener('click', () => sidebar.scrollBy({ top: -scrollAmount, behavior: 'smooth' }));
    scrollDownBtn.addEventListener('click', () => sidebar.scrollBy({ top: scrollAmount, behavior: 'smooth' }));
    closeButton.addEventListener('click', () => window.api.closeApp());
    cancelChangeBtn.addEventListener('click', hideModal);

    confirmChangeBtn.addEventListener('click', () => {
        window.api.sendToArduino('[B0]');
        aprovadosCount = 0;
        reprovadosCount = 0;
        updateCountDisplay();
        selectModel(pendingModel);
        hideModal();
    });

    try {
        const modelData = await window.api.getButtonNames();
        if (modelData && modelData.length > 0) {
            modelData.forEach(model => {
                const button = document.createElement('button');
                button.textContent = model.name;
                button.className = 'sidebar-btn';
                button.addEventListener('click', () => {
                    if (isTestRunning || (currentModelObject && currentModelObject.name !== model.name)) {
                        showModal(model);
                    } else {
                        selectModel(model);
                    }
                });
                sidebar.appendChild(button);
            });
        }
    } catch (error) {
        console.error('Erro ao buscar nomes dos botões:', error);
    }

    updateCountDisplay();
    setTimeout(() => updateScrollButtonsVisibility(sidebar, scrollUpBtn, scrollDownBtn), 100);
});