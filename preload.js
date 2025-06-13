// preload.js
console.log('--- SCRIPT PRELOAD CARREGADO COM SUCESSO ---');
const { contextBridge, ipcRenderer } = require('electron');

// A função exposeInMainWorld cria o objeto 'api' no 'window' da página.
contextBridge.exposeInMainWorld('api', {
    // Funções que já tínhamos
    sendToArduino: (command) => ipcRenderer.send('send-to-arduino', command),
    onArduinoStatus: (callback) => ipcRenderer.on('arduino-status', (event, status) => callback(status)),
    onArduinoData: (callback) => ipcRenderer.on('arduino-data', (event, data) => callback(data)),
    closeApp: () => ipcRenderer.send('close-app'),

    // A função que está causando o erro
    getButtonNames: () => ipcRenderer.invoke('get-button-names'),
});
