// utils/comunicador-arduino.js

const { ipcMain } = require('electron');
const { SerialPort, ReadlineParser } = require('serialport');

// --- Variáveis do Módulo ---
let port;
let isArduinoConnected = false;
const ARDUINO_VENDOR_IDS = ['2341', '1A86'];

// --- Variáveis para o Watchdog/Timeout ---
const COMMUNICATION_TIMEOUT_MS = 5000; // 5 segundos. Ajuste este valor conforme necessário.
let lastMessageTimestamp = 0;
let watchdogInterval = null; // Guardará a referência do nosso "vigia" (setInterval)


function connectToArduino(path, mainWindow) {
    port = new SerialPort({ path, baudRate: 9600 });
    const parser = new ReadlineParser({ delimiter: '\n' });
    port.pipe(parser);

    port.on('open', () => {
        isArduinoConnected = true;
        console.log('Conexão com Arduino estabelecida.');
        if (mainWindow) {
            mainWindow.webContents.send('arduino-status', true);
        }

        // Inicia o watchdog quando a porta abre
        lastMessageTimestamp = Date.now(); // Reseta o timer
        if (watchdogInterval) clearInterval(watchdogInterval); // Limpa qualquer vigia antigo

        watchdogInterval = setInterval(() => {
            if (Date.now() - lastMessageTimestamp > COMMUNICATION_TIMEOUT_MS) {
                console.error(`Timeout de comunicação! Nenhum dado recebido em ${COMMUNICATION_TIMEOUT_MS / 1000}s. Reiniciando a conexão...`);
                if (port && port.isOpen) {
                    port.close();
                }
                clearInterval(watchdogInterval); // Para o vigia atual
            }
        }, 2000); // O vigia verifica a cada 2 segundos
    });

    parser.on('data', (data) => {
        // "Acaricia o cão de guarda" toda vez que um dado chega, evitando o timeout
        lastMessageTimestamp = Date.now();

        const message = data.trim();
        let reading = {};

        // A ordem dos 'if's é importante. Os mais específicos vêm primeiro.

        // Checa por [1R], [2R], [3R], ou [4R] para Pressão Equipo
        if ((message.startsWith('[1R') || message.startsWith('[2R') || message.startsWith('[3R') || message.startsWith('[4R')) && message.endsWith(']')) {
            reading.type = 'EquipoPressure'; // Novo tipo descritivo
            reading.value = message.substring(3, message.length - 1);
        }
        // Checa por [5R] para Pressão Membrana
        else if (message.startsWith('[5R') && message.endsWith(']')) {
            reading.type = 'MembranaPressure'; // Novo tipo descritivo
            reading.value = message.substring(3, message.length - 1);
        }
        else if (message.startsWith('[M') && message.endsWith(']')) {
            reading.type = 'M';
            reading.value = message.substring(2, message.length - 1);
        }
        else if (message === '[B1]') {
            reading.type = 'B1';
        }
        else if (message === '[B0]') {
            reading.type = 'B0';
        }
        else if (message === '[EVO_1]') {
            reading.type = 'EVO_1';
        }
        else if (message === '[EVO_X]') {
            reading.type = 'EVO_X';
        }
        else if (message.startsWith('[S') && message.endsWith(']')) {
            reading.type = 'S_response';
            reading.value = message.substring(1, message.length - 1);
        }
        else if (message.startsWith('[N') && message.endsWith(']')) {
            reading.type = 'N_response';
            reading.value = message.substring(1, message.length - 1);
        }
        else if (message.startsWith('[') && message.endsWith(']')) {
            reading.type = 'message';
            reading.value = message.substring(1, message.length - 1);
        }

        // Envia os dados para a interface se um tipo foi reconhecido
        if (reading.type && mainWindow) {
            mainWindow.webContents.send('arduino-data', reading);
        } else {
            console.log(`Arduino (dado não processado ou janela fechada): ${message}`);
        }
    });

    port.on('close', () => {
        isArduinoConnected = false;
        port = null;
        console.log('Conexão com Arduino perdida.');

        if (watchdogInterval) {
            clearInterval(watchdogInterval);
            watchdogInterval = null;
        }

        if (mainWindow) {
            mainWindow.webContents.send('arduino-status', false);
        }
    });

    port.on('error', (err) => {
        console.error('Erro na porta serial:', err.message);
        if (port && port.isOpen) {
            port.close();
        }
    });
}

async function findArduinoPort(mainWindow) {
    if (isArduinoConnected) return;
    try {
        const ports = await SerialPort.list();
const arduinoPortInfo = ports.find(p => ARDUINO_VENDOR_IDS.includes(p.vendorId.toUpperCase()));        if (arduinoPortInfo) {
            console.log(`Arduino encontrado na porta: ${arduinoPortInfo.path}`);
            connectToArduino(arduinoPortInfo.path, mainWindow);
        }
    } catch (error) {
        console.error('Erro ao listar portas seriais:', error);
    }
}

function start(mainWindow) {
    setInterval(() => findArduinoPort(mainWindow), 3000);

    ipcMain.on('send-to-arduino', (event, command) => {
        if (port && isArduinoConnected) {
            let finalCommand = String(command).trim();
            if (!finalCommand.startsWith('[')) {
                finalCommand = '[' + finalCommand;
            }
            if (!finalCommand.endsWith(']')) {
                finalCommand = finalCommand + ']';
            }
            port.write(finalCommand, (err) => {
                if (err) return console.log('Erro ao enviar dados:', err.message);
                console.log(`Comando enviado: ${finalCommand}`);
            });
        } else {
            console.log('Arduino não conectado. Não foi possível enviar o comando.');
        }
    });
}

module.exports = {
    start
};