// utils/parametros-excel.js

// Módulos necessários para esta funcionalidade
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Criamos uma função que será chamada pelo main.js para ativar este módulo.
function setupExcelHandler() {
    ipcMain.handle('get-button-names', async () => {
        // O caminho agora precisa "subir" um nível ('..') para encontrar a pasta 'dados'
        const filePath = path.join(__dirname, '..', 'dados', 'parametros-test.ods');

        try {
            if (!fs.existsSync(filePath)) {
                console.error('Arquivo de parâmetros não encontrado:', filePath);
                return [];
            }

            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            const buttonNames = data
                .slice(1)
                .map(row => row[0])
                .filter(name => name);

            return buttonNames;

        } catch (error) {
            console.error('Erro ao ler o arquivo da planilha:', error);
            return [];
        }
    });
}

// Exportamos a função para que o main.js possa importá-la e usá-la.
module.exports = {
    setupExcelHandler
};