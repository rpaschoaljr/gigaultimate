// utils/comunicador-arduino.js

const { ipcMain } = require('electron');
const { SerialPort, ReadlineParser } = require('serialport');

let port;
let isArduinoConnected = false;

const ARDUINO_VENDOR_IDS = ['2341', '1A86'];

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
    });

    // --- LÓGICA DE PARSING ATUALIZADA ---
    parser.on('data', (data) => {
        const message = data.trim();
        let reading = {};

        // A ORDEM DOS 'IF'S É IMPORTANTE. OS MAIS ESPECÍFICOS VÊM PRIMEIRO.

        if (message.startsWith('[1P') && message.endsWith(']')) {
            reading.type = '1P';
            reading.value = message.substring(3, message.length - 1);
        }
        else if (message.startsWith('[2P') && message.endsWith(']')) {
            reading.type = '2P';
            reading.value = message.substring(3, message.length - 1);
        }
        else if (message.startsWith('[M') && message.endsWith(']')) {
            reading.type = 'M';
            reading.value = message.substring(2, message.length - 1);
        }
        else if (message === '[B1]') {
            reading.type = 'B1';
        }
        else if (message === '[EVO_1]') {
            reading.type = 'EVO_1';
        }
        else if (message === '[EVO_X]') {
            reading.type = 'EVO_X';
        }
        // NOVOS PARSERS para as respostas S e N
        else if (message.startsWith('[S') && message.endsWith(']')) {
            reading.type = 'S_response';
            reading.value = message.substring(1, message.length - 1);
        }
        else if (message.startsWith('[N') && message.endsWith(']')) {
            reading.type = 'N_response';
            reading.value = message.substring(1, message.length - 1);
        }
        // Parser para as respostas de teste P, C, E, T
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
        if (mainWindow) {
            mainWindow.webContents.send('arduino-status', false);
        }
    });

    port.on('error', (err) => {
        console.error('Erro na porta serial:', err.message);
    });
}

async function findArduinoPort(mainWindow) {
    if (isArduinoConnected) return;
    try {
        const ports = await SerialPort.list();
        const arduinoPortInfo = ports.find(p => ARDUINO_VENDOR_IDS.includes(p.vendorId));
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