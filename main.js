// main.js - VERSÃO REATORADA

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 1. Importa os novos módulos que criamos.
const arduinoCommunicator = require('./utils/comunicador-arduino.js');
const excelReader = require('./utils/parametros-excel.js');

// Apenas a variável da janela principal permanece aqui.
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- Gerenciamento do Ciclo de Vida da Aplicação ---

app.whenReady().then(() => {
    createWindow();

    // 2. Inicia os módulos, delegando as responsabilidades.
    // Passamos 'mainWindow' para o comunicador do Arduino para que ele possa enviar status.
    arduinoCommunicator.start(mainWindow);
    excelReader.setupExcelHandler();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// O ouvinte para fechar o app pode continuar aqui, pois é uma ação da aplicação.
ipcMain.on('close-app', () => {
    app.quit();
});