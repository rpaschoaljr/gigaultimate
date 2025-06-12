// utils/comunicador-arduino.js

const { ipcMain } = require('electron');
const { SerialPort, ReadlineParser } = require('serialport');

// Variáveis de estado do módulo. Elas não são mais globais no main.js.
let port;
let isArduinoConnected = false;

const ARDUINO_VENDOR_IDS = ['2341', '1A86'];

// A lógica de conexão agora recebe 'mainWindow' como um parâmetro
// para poder enviar o status da conexão para a interface.
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

    parser.on('data', (data) => {
        console.log(`Dados do Arduino: ${data}`);
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

// Função principal do módulo, que inicia a busca e configura os ouvintes.
function start(mainWindow) {
    // Inicia a busca periódica pelo Arduino, passando a janela principal.
    setInterval(() => findArduinoPort(mainWindow), 3000);

    // O ouvinte para enviar comandos também fica aqui.
    ipcMain.on('send-to-arduino', (event, command) => {
        if (port && isArduinoConnected) {
            let finalCommand = command.trim();
            if (!finalCommand.startsWith('[')) finalCommand = '[' + finalCommand;
            if (!finalCommand.endsWith(']')) finalCommand = finalCommand + ']';

            port.write(finalCommand, (err) => {
                if (err) return console.log('Erro ao enviar dados:', err.message);
                console.log(`Comando enviado: ${finalCommand}`);
            });
        } else {
            console.log('Arduino não conectado. Não foi possível enviar o comando.');
        }
    });
}

// Exporta a função 'start' para ser usada no main.js
module.exports = {
    start
};