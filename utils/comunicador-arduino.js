// utils/comunicador-arduino.js

const { ipcMain } = require('electron');
const { SerialPort, ReadlineParser } = require('serialport');

// --- Configurações e Variáveis de Estado ---
const ARDUINO_VENDOR_IDS = ['2341', '1A86'];
const COMMUNICATION_TIMEOUT_MS = 5000; // Tempo máximo sem receber NADA do Arduino
const ACK_TIMEOUT_MS = 2000;           // Tempo para esperar por uma confirmação (ACK)
const MAX_RETRIES = 3;                 // Máximo de tentativas de reenvio de um comando

let port;
let isArduinoConnected = false;
let watchdogInterval = null;
let lastMessageTimestamp = 0;

// Variáveis para o sistema de ACK
let messageCounter = 0;
let unackedMessages = new Map(); // Fila de mensagens esperando confirmação (ID -> {message, timerId, retries})

// --- Funções do Módulo ---

/**
 * Tenta reenviar uma mensagem que não recebeu confirmação (ACK).
 * @param {number} msgId - O ID da mensagem a ser reenviada.
 */
function retransmit(msgId) {
    if (!unackedMessages.has(msgId)) return; // A mensagem já foi confirmada

    const msgInfo = unackedMessages.get(msgId);

    if (msgInfo.retries >= MAX_RETRIES) {
        console.error(`FALHA CRÍTICA: Mensagem ${msgId} (${msgInfo.message}) não foi confirmada após ${MAX_RETRIES} tentativas.`);
        unackedMessages.delete(msgId); // Desiste da mensagem
    } else {
        msgInfo.retries++;
        console.warn(`Timeout para mensagem ${msgId}. Reenviando (tentativa ${msgInfo.retries})...`);
        if (port && port.isOpen) {
            port.write(msgInfo.message);
        }
        // Agenda a próxima verificação/tentativa
        msgInfo.timerId = setTimeout(() => retransmit(msgId), ACK_TIMEOUT_MS);
        unackedMessages.set(msgId, msgInfo);
    }
}

/**
 * Formata e envia uma mensagem para o Arduino, esperando uma confirmação (ACK).
 * @param {string} command - O comando a ser enviado (ex: "P5000").
 * @param {BrowserWindow} mainWindow - A janela principal para enviar dados de volta.
 */
function sendMessageWithAck(command, mainWindow) {
    if (!port || !isArduinoConnected) {
        console.log('Arduino não conectado. Não foi possível enviar o comando.');
        return;
    }

    messageCounter++;
    const msgId = messageCounter;
    const messageWithId = `[${msgId}:${command}]`; // Novo formato: [ID:Comando]

    // Define um timer para o caso de não recebermos um ACK
    const timerId = setTimeout(() => retransmit(msgId), ACK_TIMEOUT_MS);

    // Adiciona a mensagem à fila de não confirmadas
    unackedMessages.set(msgId, { message: messageWithId, timerId, retries: 0 });

    port.write(messageWithId, (err) => {
        if (err) {
            console.log('Erro ao enviar dados:', err.message);
            // Limpa da fila se houver erro de escrita
            clearTimeout(timerId);
            unackedMessages.delete(msgId);
            return;
        }
        console.log(`Comando enviado (ID: ${msgId}): ${command}`);
    });
}

function connectToArduino(path, mainWindow) {
    port = new SerialPort({ path, baudRate: 9600 });
    const parser = new ReadlineParser({ delimiter: '\n' });
    port.pipe(parser);

    port.on('open', () => {
        isArduinoConnected = true;
        console.log('Conexão com Arduino estabelecida.');
        if (mainWindow) mainWindow.webContents.send('arduino-status', true);

        lastMessageTimestamp = Date.now();
        if (watchdogInterval) clearInterval(watchdogInterval);
        watchdogInterval = setInterval(() => {
            if (Date.now() - lastMessageTimestamp > COMMUNICATION_TIMEOUT_MS) {
                console.error(`Timeout de comunicação! Nenhum dado recebido em ${COMMUNICATION_TIMEOUT_MS / 1000}s. Reiniciando a conexão...`);
                if (port && port.isOpen) port.close();
                clearInterval(watchdogInterval);
            }
        }, 2000);
    });

    parser.on('data', (data) => {
        lastMessageTimestamp = Date.now();
        const message = data.trim();

        // 1. Verifica se é uma confirmação (ACK) do Arduino
        if (message.startsWith('[ACK:')) {
            const ackId = parseInt(message.substring(5, message.length - 1));
            if (unackedMessages.has(ackId)) {
                console.log(`ACK recebido para a mensagem ${ackId}.`);
                clearTimeout(unackedMessages.get(ackId).timerId); // Cancela o timer de retransmissão
                unackedMessages.delete(ackId); // Remove da fila de não confirmadas
            }
        }
        // 2. Se não for um ACK, processa como um dado normal
        else {
            let reading = {};
            if ((message.startsWith('[1R') || message.startsWith('[2R') || message.startsWith('[3R') || message.startsWith('[4R')) && message.endsWith(']')) {
                reading.type = 'EquipoPressure'; reading.value = message.substring(3, message.length - 1);
            } else if (message.startsWith('[5R') && message.endsWith(']')) {
                reading.type = 'MembranaPressure'; reading.value = message.substring(3, message.length - 1);
            } else if (message.startsWith('[M') && message.endsWith(']')) {
                reading.type = 'M'; reading.value = message.substring(2, message.length - 1);
            } else if (message === '[B1]') {
                reading.type = 'B1';
            } else if (message === '[B0]') {
                reading.type = 'B0';
            } else if (message === '[EVO_1]') {
                reading.type = 'EVO_1';
            } else if (message === '[EVO_X]') {
                reading.type = 'EVO_X';
            } else if (message.startsWith('[S') && message.endsWith(']')) {
                reading.type = 'S_response'; reading.value = message.substring(1, message.length - 1);
            } else if (message.startsWith('[N') && message.endsWith(']')) {
                reading.type = 'N_response'; reading.value = message.substring(1, message.length - 1);
            } else if (message.startsWith('[') && message.endsWith(']')) {
                reading.type = 'message'; reading.value = message.substring(1, message.length - 1);
            }

            if (reading.type && mainWindow) {
                mainWindow.webContents.send('arduino-data', reading);
                // Envia o eco de confirmação de volta para o Arduino (para dados de pressão)
                if (message.includes("R")) {
                    port.write(message);
                }
            } else {
                console.log(`Arduino: ${message}`);
            }
        }
    });

    port.on('close', () => {
        isArduinoConnected = false;
        port = null;
        unackedMessages.clear(); // Limpa a fila de mensagens pendentes
        console.log('Conexão com Arduino perdida.');
        if (watchdogInterval) {
            clearInterval(watchdogInterval);
            watchdogInterval = null;
        }
        if (mainWindow) mainWindow.webContents.send('arduino-status', false);
    });

    port.on('error', (err) => {
        console.error('Erro na porta serial:', err.message);
        if (port && port.isOpen) port.close();
    });
}

async function findArduinoPort(mainWindow) {
    if (isArduinoConnected) return;
    try {
        const ports = await SerialPort.list();
        const arduinoPortInfo = ports.find(p => ARDUINO_VENDOR_IDS.includes(p.vendorId.toUpperCase()));
        if (arduinoPortInfo) {
            console.log(`Arduino encontrado na porta: ${arduinoPortInfo.path}`);
            connectToArduino(arduinoPortInfo.path, mainWindow);
        }
    } catch (error) {
        console.error('Erro ao listar portas seriais:', error);
    }
}

function start(mainWindow) {
    setInterval(() => findArduinoPort(mainWindow), 3000);

    // Agora, o evento da interface chama a nova função com lógica de ACK
    ipcMain.on('send-to-arduino', (event, command) => {
        sendMessageWithAck(command, mainWindow);
    });
}

module.exports = {
    start
};