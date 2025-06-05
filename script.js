class SQLQueryManager {
    constructor() {
        this.queries = [];
        this.currentQueryIndex = -1;
        this.loadQueries();
        this.updateUI();
    }

    loadQueries() {
        const stored = localStorage.getItem('sqlQueryManager');
        
        if (stored) {
            try {
                this.queries = JSON.parse(stored);
            } catch (e) {
                console.error('Erro ao carregar queries do localStorage:', e);
                this.loadDefaultQueries();
            }
        } else {
            this.loadDefaultQueries();
        }
    }

    loadDefaultQueries() {
        this.queries = [
            {
                id: 1,
                name: "Exemplo - Consulta Usuários",
                sql: "SELECT u.id, u.nome, u.email, u.data_cadastro\nFROM usuarios u\nWHERE u.ativo = [ativo]\nAND u.data_cadastro >= '[data_inicio]'\nORDER BY u.nome",
                variables: {
                    "ativo": "1",
                    "data_inicio": "2024-01-01"
                }
            }
        ];
        this.saveQueries();
    }

    saveQueries() {
        try {
            localStorage.setItem('sqlQueryManager', JSON.stringify(this.queries));
            console.log('Queries salvas no localStorage');
        } catch (e) {
            console.error('Erro ao salvar queries no localStorage:', e);
            this.showToast('Erro ao salvar queries no navegador', 'error');
        }
    }

    extractVariables(sql) {
        const matches = sql.match(/\[([^\]]+)\]/g);
        return matches ? matches.map(match => match.slice(1, -1)) : [];
    }

    createNewQuery() {
        const newQuery = {
            id: Date.now(),
            name: `Nova Query ${this.queries.length + 1}`,
            sql: "",
            variables: {}
        };
        
        this.queries.push(newQuery);
        this.currentQueryIndex = this.queries.length - 1;
        this.updateUI();
        this.loadQueryInEditor();
        document.getElementById('queryName').focus();
    }

    selectQuery(index) {
        this.currentQueryIndex = index;
        this.loadQueryInEditor();
        this.updateUI();
    }

    loadQueryInEditor() {
        if (this.currentQueryIndex < 0) return;
        
        const query = this.queries[this.currentQueryIndex];
        document.getElementById('queryName').value = query.name;
        document.getElementById('queryEditor').value = query.sql;
        this.updateVariablesPanel();
        this.updatePreview();
    }

    updateCurrentQuery() {
        if (this.currentQueryIndex < 0) return;
        
        const query = this.queries[this.currentQueryIndex];
        query.name = document.getElementById('queryName').value;
        query.sql = document.getElementById('queryEditor').value;
        
        // Atualizar variáveis baseado na query
        const variables = this.extractVariables(query.sql);
        const newVariables = {};
        
        variables.forEach(variable => {
            newVariables[variable] = query.variables[variable] || '';
        });
        
        query.variables = newVariables;
        this.updateVariablesPanel();
        this.updateUI();
    }

    updateVariablesPanel() {
        const panel = document.getElementById('variablesPanel');
        
        if (this.currentQueryIndex < 0) {
            panel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>Nenhuma variável detectada</p>
                    <small>Use [nome_variavel] na query</small>
                </div>
            `;
            return;
        }

        const query = this.queries[this.currentQueryIndex];
        const variables = Object.keys(query.variables);

        if (variables.length === 0) {
            panel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>Nenhuma variável detectada</p>
                    <small>Use [nome_variavel] na query</small>
                </div>
            `;
            return;
        }

        let html = '';
        variables.forEach(variable => {
            html += `
                <div class="mb-3">
                    <label class="form-label">
                        <span class="variable-tag">[${variable}]</span>
                    </label>
                    <input type="text" class="form-control variable-input" 
                           value="${query.variables[variable]}" 
                           onchange="queryManager.updateVariable('${variable}', this.value)"
                           placeholder="Valor da variável...">
                </div>
            `;
        });

        panel.innerHTML = html;
    }

    updateVariable(variable, value) {
        if (this.currentQueryIndex < 0) return;
        
        this.queries[this.currentQueryIndex].variables[variable] = value;
        this.updatePreview();
    }

    updatePreview() {
        const preview = document.getElementById('queryPreview');
        
        if (this.currentQueryIndex < 0) {
            preview.innerHTML = '<span class="text-muted">A query processada aparecerá aqui...</span>';
            return;
        }

        const query = this.queries[this.currentQueryIndex];
        let processedSQL = query.sql;

        // Substituir variáveis
        Object.keys(query.variables).forEach(variable => {
            const value = query.variables[variable];
            const regex = new RegExp(`\\[${variable}\\]`, 'g');
            processedSQL = processedSQL.replace(regex, value);
        });

        // Highlight básico de SQL
        processedSQL = this.highlightSQL(processedSQL);
        preview.innerHTML = processedSQL || '<span class="text-muted">Query vazia...</span>';
    }

    highlightSQL(sql) {
        // Palavras-chave SQL
        const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'];
        
        let highlighted = sql;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex, `<span class="sql-keyword">${keyword.toUpperCase()}</span>`);
        });

        // Strings
        highlighted = highlighted.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>');
        
        // Comentários
        highlighted = highlighted.replace(/--(.*)$/gm, '<span class="sql-comment">--$1</span>');

        return highlighted;
    }

    saveQuery() {
        if (this.currentQueryIndex < 0) return;
        
        this.updateCurrentQuery();
        this.saveQueries();
        this.showToast('Query salva com sucesso!', 'success');
    }

    exportQueries() {
        if (this.queries.length === 0) {
            this.showToast('Nenhuma query para exportar', 'warning');
            return;
        }

        const dataToExport = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            queries: this.queries
        };

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `sql-queries-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        this.showToast('Queries exportadas com sucesso!', 'success');
    }

    importQueries() {
        document.getElementById('fileInput').click();
    }

    handleFileImport(file) {
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validar estrutura do arquivo
                if (!importedData.queries || !Array.isArray(importedData.queries)) {
                    throw new Error('Formato de arquivo inválido');
                }
    
                // Validar estrutura das queries
                importedData.queries.forEach((query, index) => {
                    if (!query.id || !query.name || typeof query.sql !== 'string' || !query.variables) {
                        throw new Error(`Query ${index + 1} tem formato inválido`);
                    }
                });
    
                // Armazenar dados para importação posterior
                this.pendingImportData = importedData;
    
                if (this.queries.length > 0) {
                    // Mostrar modal de opções
                    document.getElementById('currentQueriesCount').textContent = this.queries.length;
                    document.getElementById('importQueriesCount').textContent = importedData.queries.length;
                    const modal = new bootstrap.Modal(document.getElementById('importModal'));
                    modal.show();
                } else {
                    // Importar diretamente se não há queries existentes
                    this.performImport('add');
                }
                
            } catch (error) {
                console.error('Erro ao importar queries:', error);
                this.showToast(`Erro ao importar arquivo: ${error.message}`, 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    performImport(mode = 'replace') {
        if (!this.pendingImportData) return;
    
        const importedQueries = this.pendingImportData.queries;
        let processedQueries = [...importedQueries];
        
        if (mode === 'add') {
            // Adicionar às existentes - ajustar IDs para evitar conflitos
            const maxId = this.queries.length > 0 ? Math.max(...this.queries.map(q => q.id)) : 0;
            
            processedQueries = importedQueries.map((query, index) => ({
                ...query,
                id: maxId + index + 1,
                name: this.getUniqueName(query.name)
            }));
            
            // Adicionar às queries existentes
            this.queries = [...this.queries, ...processedQueries];
            
            this.showToast(`${importedQueries.length} queries adicionadas com sucesso! Total: ${this.queries.length}`, 'success');
        } else {
            // Substituir todas
            this.queries = processedQueries;
            this.showToast(`${importedQueries.length} queries importadas com sucesso!`, 'success');
        }
    
        this.currentQueryIndex = this.queries.length > 0 ? 0 : -1;
        this.saveQueries();
        this.updateUI();
        
        if (this.currentQueryIndex >= 0) {
            this.loadQueryInEditor();
        }
    
        this.pendingImportData = null;
    }
    
    getUniqueName(baseName) {
        const existingNames = this.queries.map(q => q.name);
        let uniqueName = baseName;
        let counter = 1;
        
        while (existingNames.includes(uniqueName)) {
            uniqueName = `${baseName} (${counter})`;
            counter++;
        }
        
        return uniqueName;
    }

    copyQuery() {
        if (this.currentQueryIndex < 0) return;
        
        const query = this.queries[this.currentQueryIndex];
        let processedSQL = query.sql;

        // Substituir variáveis
        Object.keys(query.variables).forEach(variable => {
            const value = query.variables[variable];
            const regex = new RegExp(`\\[${variable}\\]`, 'g');
            processedSQL = processedSQL.replace(regex, value);
        });

        navigator.clipboard.writeText(processedSQL).then(() => {
            this.showToast('Query copiada para a área de transferência!', 'info');
        }).catch(() => {
            this.showToast('Erro ao copiar query', 'error');
        });
    }

    deleteQuery() {
        if (this.currentQueryIndex < 0) return;
        
        if (confirm('Tem certeza que deseja deletar esta query?')) {
            this.queries.splice(this.currentQueryIndex, 1);
            this.currentQueryIndex = this.queries.length > 0 ? 0 : -1;
            this.updateUI();
            if (this.currentQueryIndex >= 0) {
                this.loadQueryInEditor();
            } else {
                this.clearEditor();
            }
            this.saveQueries();
            this.showToast('Query deletada!', 'warning');
        }
    }

    clearEditor() {
        document.getElementById('queryName').value = '';
        document.getElementById('queryEditor').value = '';
        document.getElementById('queryPreview').innerHTML = '<span class="text-muted">A query processada aparecerá aqui...</span>';
        document.getElementById('variablesPanel').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <p>Nenhuma variável detectada</p>
                <small>Use [nome_variavel] na query</small>
            </div>
        `;
    }

    updateUI() {
        // Atualizar lista de queries
        const queryList = document.getElementById('queryList');
        
        if (this.queries.length === 0) {
            queryList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>Nenhuma query salva</p>
                    <small>Clique em "Nova" para começar</small>
                </div>
            `;
        } else {
            let html = '';
            this.queries.forEach((query, index) => {
                const isActive = index === this.currentQueryIndex;
                html += `
                    <div class="query-list-item p-3 ${isActive ? 'active' : ''}" onclick="queryManager.selectQuery(${index})">
                        <div class="fw-bold">${query.name}</div>
                        <div class="text-muted small">
                            ${Object.keys(query.variables).length} variável(is)
                        </div>
                    </div>
                `;
            });
            queryList.innerHTML = html;
        }

        // Atualizar botões
        const hasQuery = this.currentQueryIndex >= 0;
        document.getElementById('saveBtn').disabled = !hasQuery;
        document.getElementById('copyBtn').disabled = !hasQuery;
        document.getElementById('deleteBtn').disabled = !hasQuery;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        
        const bgColor = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const toast = document.createElement('div');
        toast.className = `toast ${bgColor} text-white`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-body">
                ${message}
            </div>
        `;

        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Inicializar aplicação
const queryManager = new SQLQueryManager();

// Funções globais para os botões
function createNewQuery() {
    queryManager.createNewQuery();
}

function saveQuery() {
    queryManager.saveQuery();
}

function copyQuery() {
    queryManager.copyQuery();
}

function deleteQuery() {
    queryManager.deleteQuery();
}

function updateCurrentQuery() {
    queryManager.updateCurrentQuery();
}

function updatePreview() {
    queryManager.updatePreview();
}

function exportQueries() {
    queryManager.exportQueries();
}

function importQueries() {
    queryManager.importQueries();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (file) {
        queryManager.handleFileImport(file);
    }
    // Resetar o input para permitir importar o mesmo arquivo novamente
    event.target.value = '';
}

function confirmImport(mode) {
    queryManager.performImport(mode);
}

// Carregar primeira query se existir
if (queryManager.queries.length > 0) {
    queryManager.selectQuery(0);
}