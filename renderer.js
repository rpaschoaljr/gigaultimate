// renderer.js - VERSÃO ATUALIZADA COM LÓGICA DE SCROLL

/**
 * Controla a visibilidade dos botões de scroll com base
 * na posição da rolagem do elemento.
 * @param {HTMLElement} scrollElement - O elemento que rola (nossa #sidebar).
 * @param {HTMLElement} upButton - O botão de rolar para cima.
 * @param {HTMLElement} downButton - O botão de rolar para baixo.
 */
function updateScrollButtonsVisibility(scrollElement, upButton, downButton) {
    if (!scrollElement || !upButton || !downButton) return;

    const tolerance = 1;

    // Esconde/mostra o botão de CIMA se não estiver no topo
    const showUp = scrollElement.scrollTop > tolerance;
    upButton.classList.toggle('hidden', !showUp);

    // Esconde/mostra o botão de BAIXO se não estiver no final
    const showDown = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight > tolerance;
    downButton.classList.toggle('hidden', !showDown);
}


window.addEventListener('DOMContentLoaded', async () => {

    // Elementos da página
    const sidebar = document.getElementById('sidebar');
    const statusSpan = document.getElementById('status');
    const closeButton = document.getElementById('closeButton');
    const scrollUpBtn = document.getElementById('scroll-up-btn');
    const scrollDownBtn = document.getElementById('scroll-down-btn');

    // Constantes para o scroll
    const buttonHeight = 120; // Altura de um botão
    const buttonMargin = 10;  // Margem inferior
    const scrollAmount = buttonHeight + buttonMargin; // Total a rolar

    // --- LÓGICA DOS BOTÕES DE SCROLL ---

    // Clique no botão de rolar para CIMA
    scrollUpBtn.addEventListener('click', () => {
        sidebar.scrollBy({
            top: -scrollAmount, // Rola para cima
            behavior: 'smooth'  // Efeito de rolagem suave
        });
    });

    // Clique no botão de rolar para BAIXO
    scrollDownBtn.addEventListener('click', () => {
        sidebar.scrollBy({
            top: scrollAmount,  // Rola para baixo
            behavior: 'smooth'
        });
    });

    // Toda vez que a sidebar rolar (pelo mouse ou botão), atualiza a visibilidade
    sidebar.addEventListener('scroll', () => {
        updateScrollButtonsVisibility(sidebar, scrollUpBtn, scrollDownBtn);
    });


    // --- LÓGICA ANTIGA QUE CONTINUA FUNCIONANDO ---

    closeButton.addEventListener('click', () => {
        window.api.closeApp();
    });

    window.api.onArduinoStatus((connected) => {
        if (connected) { statusSpan.textContent = 'Conectado'; statusSpan.className = 'conectado'; }
        else { statusSpan.textContent = 'Desconectado'; statusSpan.className = 'desconectado'; }
    });

    try {
        const buttonNames = await window.api.getButtonNames();
        if (buttonNames && buttonNames.length > 0) {
            buttonNames.forEach(name => {
                const button = document.createElement('button');
                button.textContent = name;
                button.className = 'sidebar-btn';
                button.addEventListener('click', () => {
                    console.log(`Botão '${name}' clicado!`);
                    window.api.sendToArduino(name);
                    document.getElementById('modelo-display').textContent = name;
                });
                sidebar.appendChild(button);
            });
        }
    } catch (error) {
        console.error('Erro ao buscar nomes dos botões:', error);
    }

    // Chama a função uma vez no início para definir o estado inicial dos botões de scroll
    setTimeout(() => {
        updateScrollButtonsVisibility(sidebar, scrollUpBtn, scrollDownBtn);
    }, 100);
});