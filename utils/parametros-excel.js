// utils/parametros-excel.js - VERSÃO CORRIGIDA E FINAL

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

function setupExcelHandler() {
    ipcMain.handle('get-button-names', async () => {
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

            const modelData = data
                .slice(1)
                .map(row => ({
                    name: row[0],             // Coluna A (índice 0)
                    showTag: row[1] == 1,     // Coluna B (índice 1)
                    showMembrana: row[2] == 1,// Coluna C (índice 2)
                    isEvo: row[3] == 1,       // Coluna D (índice 3)
                    command: row[4] || '',      // Coluna E (índice 4)
                    startCommand: row[5] || '', // Coluna F (índice 5)
                    allData: row              // Linha inteira para a sequência de testes
                }))
                .filter(model => model.name);

            return modelData;

        } catch (error) {
            console.error('Erro ao ler o arquivo da planilha:', error);
            return [];
        }
    });
}

module.exports = {
    setupExcelHandler
};