// renderer.js - VERSÃO ATUALIZADA COM LÓGICA DE MODAL

// --- Variáveis de Estado ---
let currentModel = null; // Armazena o nome do modelo atualmente selecionado
let pendingModel = null; // Armazena o nome do modelo que aguarda confirmação

// --- Funções Auxiliares ---

/**
 * Define um modelo como ativo, atualizando a UI e enviando para o Arduino.
 * @param {string} modelName - O nome do modelo a ser selecionado.
 */
function selectModel(modelName) {
    if (!modelName) return;

    currentModel = modelName;
    document.getElementById('modelo-display').textContent = modelName;
    console.log(`Modelo selecionado: ${modelName}`);
    window.api.sendToArduino(modelName);
}

/**
 * Mostra o modal de confirmação.
 * @param {string} modelToConfirm - O nome do modelo que o usuário tentou selecionar.
 */
function showModal(modelToConfirm) {
    pendingModel = modelToConfirm; // Guarda o modelo pendente
    document.getElementById('confirmation-modal').classList.remove('hidden');
}

/**
 * Esconde o modal de confirmação.
 */
function hideModal() {
    pendingModel = null; // Limpa o modelo pendente
    document.getElementById('confirmation-modal').classList.add('hidden');
}


/**
 * Controla a visibilidade dos botões de scroll.
 * (Esta função continua a mesma de antes)
 */
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

    // Elementos da página
    const sidebar = document.getElementById('sidebar');
    const closeButton = document.getElementById('closeButton');
    const scrollUpBtn = document.getElementById('scroll-up-btn');
    const scrollDownBtn = document.getElementById('scroll-down-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmChangeBtn = document.getElementById('confirm-change-btn');
    const cancelChangeBtn = document.getElementById('cancel-change-btn');

    // --- Configuração dos Eventos ---

    // Botões de Scroll
    sidebar.addEventListener('scroll', () => updateScrollButtonsVisibility(sidebar, scrollUpBtn, scrollDownBtn));
    const scrollAmount = 120 + 10;
    scrollUpBtn.addEventListener('click', () => sidebar.scrollBy({ top: -scrollAmount, behavior: 'smooth' }));
    scrollDownBtn.addEventListener('click', () => sidebar.scrollBy({ top: scrollAmount, behavior: 'smooth' }));

    // Botão de Fechar App
    closeButton.addEventListener('click', () => window.api.closeApp());

    // Botões do Modal
    cancelChangeBtn.addEventListener('click', hideModal);
    confirmChangeBtn.addEventListener('click', () => {
        selectModel(pendingModel); // Seleciona o modelo que estava pendente
        hideModal(); // Esconde o modal
    });

    // Carregamento dos Botões Dinâmicos da Sidebar
    try {
        const buttonNames = await window.api.getButtonNames();
        if (buttonNames && buttonNames.length > 0) {
            buttonNames.forEach(name => {
                const button = document.createElement('button');
                button.textContent = name;
                button.className = 'sidebar-btn';

                // LÓGICA DE CLIQUE ATUALIZADA
                button.addEventListener('click', () => {
                    // Se um modelo já foi escolhido E o novo é diferente
                    if (currentModel && currentModel !== name) {
                        showModal(name); // Mostra o modal para confirmar
                    } else {
                        selectModel(name); // Senão, apenas seleciona o modelo
                    }
                });

                sidebar.appendChild(button);
            });
        }
    } catch (error) {
        console.error('Erro ao buscar nomes dos botões:', error);
    }

    // Estado inicial dos botões de scroll
    setTimeout(() => updateScrollButtonsVisibility(sidebar, scrollUpBtn, scrollDownBtn), 100);
});