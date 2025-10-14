// Monaco Editor instances
let monacoEditor = null;
let monacoPreviewEditor = null;

// Inicialização do Monaco Editor
function initMonacoEditor() {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
    
    require(['vs/editor/editor.main'], function () {
        const container = document.getElementById('monacoContainer');
        
        // Configurar tema baseado no tema atual
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const theme = isDark ? 'vs-dark' : 'vs';
        
        monacoEditor = monaco.editor.create(container, {
            value: '-- Digite sua query SQL aqui\n-- Use [variavel] para criar variáveis dinâmicas\n-- Exemplo: SELECT * FROM usuarios WHERE id = [user_id] AND status = \'[status]\'',
            language: 'sql',
            theme: theme,
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 1.5,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            selectionHighlight: false,
            occurrencesHighlight: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            lineNumbers: 'on',
            glyphMargin: false,
            showFoldingControls: 'mouseover'
        });
        
        // Listener para mudanças no conteúdo
        monacoEditor.onDidChangeModelContent(() => {
            if (queryManager) {
                queryManager.handleQueryInput();
            }
        });
        
        // Criar editor de preview (somente leitura)
        const previewContainer = document.getElementById('monacoPreviewContainer');
        monacoPreviewEditor = monaco.editor.create(previewContainer, {
            value: '-- A query processada aparecerá aqui...',
            language: 'sql',
            theme: theme,
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 1.5,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            selectionHighlight: false,
            occurrencesHighlight: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            folding: true,
            lineNumbers: 'on',
            glyphMargin: false,
            showFoldingControls: 'mouseover',
            readOnly: true,
            contextmenu: false,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: false,
            parameterHints: { enabled: false },
            hover: { enabled: false }
        });
        
        // Redimensionar quando a janela muda de tamanho
        window.addEventListener('resize', () => {
            if (monacoEditor) {
                monacoEditor.layout();
            }
            if (monacoPreviewEditor) {
                monacoPreviewEditor.layout();
            }
        });
        
        // Aplicar tema quando mudado
        window.addEventListener('themeChanged', (e) => {
            if (monacoEditor || monacoPreviewEditor) {
                const newTheme = e.detail.theme === 'dark' ? 'vs-dark' : 'vs';
                monaco.editor.setTheme(newTheme);
            }
        });
        
        // Carregar primeira query se existir após Monaco estar pronto
        if (queryManager && queryManager.queries.length > 0) {
            queryManager.selectQuery(0);
        }
    });
}

// Alternância de abas customizadas do editor central
function showEditorTab(tab) {
    const btnSql = document.getElementById('tab-sql');
    const btnPreview = document.getElementById('tab-preview');
    const panelSql = document.getElementById('tabPanel-sql');
    const panelPreview = document.getElementById('tabPanel-preview');
    if (tab === 'sql') {
        btnSql.classList.add('active');
        btnPreview.classList.remove('active');
        panelSql.classList.add('show');
        panelPreview.classList.remove('show');
        panelSql.style.display = 'flex';
        panelPreview.style.display = 'none';
    } else {
        btnSql.classList.remove('active');
        btnPreview.classList.add('active');
        panelSql.classList.remove('show');
        panelPreview.classList.add('show');
        panelSql.style.display = 'none';
        panelPreview.style.display = 'flex';
    }
}

// Inicialização: sempre mostrar SQL ao carregar
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Monaco Editor
    initMonacoEditor();
    
    // Aguarda um pouco para garantir que todos os elementos estejam carregados
    setTimeout(() => {
        showEditorTab('sql');
    }, 100);
});
class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'sqlQueryManager_theme';
        this.theme = this.loadTheme();
        this.init();
    }

    init() {
        // Set initial theme
        this.applyTheme(this.theme);

        // Add event listeners to theme buttons
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });

            // Keyboard accessibility
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const theme = e.currentTarget.dataset.theme;
                    this.setTheme(theme);
                }
            });
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                if (this.theme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }

    loadTheme() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored || 'auto';
        } catch (e) {
            console.error('Error loading theme:', e);
            return 'auto';
        }
    }

    saveTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (e) {
            console.error('Error saving theme:', e);
        }
    }

    setTheme(theme) {
        this.theme = theme;
        this.saveTheme(theme);
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        const htmlElement = document.documentElement;
        
        // Update active button
        document.querySelectorAll('.theme-option').forEach(button => {
            if (button.dataset.theme === theme) {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            }
        });

        // Apply theme
        let effectiveTheme = 'light';
        if (theme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                htmlElement.setAttribute('data-theme', 'dark');
                effectiveTheme = 'dark';
            } else {
                htmlElement.removeAttribute('data-theme');
                effectiveTheme = 'light';
            }
        } else if (theme === 'dark') {
            htmlElement.setAttribute('data-theme', 'dark');
            effectiveTheme = 'dark';
        } else {
            htmlElement.removeAttribute('data-theme');
            effectiveTheme = 'light';
        }
        
        // Disparar evento para componentes que precisam reagir à mudança de tema
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: effectiveTheme } }));
    }

    getCurrentTheme() {
        return this.theme;
    }

    getEffectiveTheme() {
        if (this.theme === 'auto') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        }
        return this.theme;
    }
}

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
                // Migrar queries existentes para incluir o atributo order
                this.queries.forEach((query, index) => {
                    if (query.order === undefined) {
                        query.order = index;
                    }
                });
                // Ordenar queries por order
                this.queries.sort((a, b) => a.order - b.order);
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
                },
                order: 0
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
            variables: {},
            order: this.queries.length
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
        
        // Atualizar Monaco Editor
        if (monacoEditor) {
            monacoEditor.setValue(query.sql || '');
        }
        
        this.updateVariablesPanel();
        this.updatePreview();
    }

    updateCurrentQuery() {
        if (this.currentQueryIndex < 0) return;
        
        const query = this.queries[this.currentQueryIndex];
        query.name = document.getElementById('queryName').value;
        
        // Obter conteúdo do Monaco Editor
        if (monacoEditor) {
            query.sql = monacoEditor.getValue();
        }
        
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
        if (this.currentQueryIndex < 0) {
            if (monacoPreviewEditor) {
                monacoPreviewEditor.setValue('-- A query processada aparecerá aqui...');
            }
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

        // Atualizar Monaco Editor de preview
        if (monacoPreviewEditor) {
            monacoPreviewEditor.setValue(processedSQL || '-- Query vazia...');
        }
    }

    handleQueryInput() {
        this.updateCurrentQuery();
        this.updatePreview();
    }

    highlightSQL(sql) {
        // Palavras-chave SQL
        const keywords = ['USE','SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'];
        
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
            const currentMaxOrder = this.queries.length > 0 ? Math.max(...this.queries.map(q => q.order || 0)) : -1;
            
            processedQueries = importedQueries.map((query, index) => ({
                ...query,
                id: maxId + index + 1,
                name: this.getUniqueName(query.name),
                order: currentMaxOrder + index + 1
            }));
            
            // Adicionar às queries existentes
            this.queries = [...this.queries, ...processedQueries];
            
            this.showToast(`${importedQueries.length} queries adicionadas com sucesso! Total: ${this.queries.length}`, 'success');
        } else {
            // Substituir todas - garantir que todas têm order
            processedQueries = importedQueries.map((query, index) => ({
                ...query,
                order: query.order !== undefined ? query.order : index
            }));
            this.queries = processedQueries;
            // Ordenar queries por order
            this.queries.sort((a, b) => a.order - b.order);
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
        
        // Garantir que temos o conteúdo mais atual do Monaco Editor
        this.updateCurrentQuery();
        
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
        
        // Reset textarea height
        const textarea = document.getElementById('queryEditor');
        textarea.style.height = '150px';
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
                    <div class="query-list-item p-3 ${isActive ? 'active' : ''}" 
                         draggable="true"
                         data-index="${index}"
                         onclick="queryManager.selectQuery(${index})">
                        <div class="d-flex align-items-start">
                            <div class="drag-handle me-2">
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bold">${query.name}</div>
                                <div class="text-muted small">
                                    ${Object.keys(query.variables).length} variável(is)
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            queryList.innerHTML = html;
            
            // Adicionar event listeners de drag and drop
            this.attachDragListeners();
        }

        // Atualizar botões
        const hasQuery = this.currentQueryIndex >= 0;
        document.getElementById('saveBtn').disabled = !hasQuery;
        document.getElementById('copyBtn').disabled = !hasQuery;
        document.getElementById('deleteBtn').disabled = !hasQuery;
    }

    attachDragListeners() {
        const items = document.querySelectorAll('.query-list-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }

    handleDragStart(e) {
        const item = e.currentTarget;
        this.draggedIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.innerHTML);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        const item = e.currentTarget;
        if (item.classList.contains('query-list-item')) {
            item.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const item = e.currentTarget;
        item.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const item = e.currentTarget;
        const dropIndex = parseInt(item.dataset.index);
        
        if (this.draggedIndex !== dropIndex) {
            this.reorderQueries(this.draggedIndex, dropIndex);
        }
        
        item.classList.remove('drag-over');
        return false;
    }

    handleDragEnd(e) {
        const items = document.querySelectorAll('.query-list-item');
        items.forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
    }

    reorderQueries(fromIndex, toIndex) {
        // Salvar o ID da query atualmente selecionada
        const selectedQueryId = this.currentQueryIndex >= 0 ? this.queries[this.currentQueryIndex].id : null;
        
        // Mover o elemento no array
        const movedQuery = this.queries.splice(fromIndex, 1)[0];
        this.queries.splice(toIndex, 0, movedQuery);
        
        // Atualizar os atributos order
        this.queries.forEach((query, index) => {
            query.order = index;
        });
        
        // Restaurar a seleção da query atual
        if (selectedQueryId !== null) {
            this.currentQueryIndex = this.queries.findIndex(q => q.id === selectedQueryId);
        }
        
        // Salvar e atualizar UI
        this.saveQueries();
        this.updateUI();
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
const themeManager = new ThemeManager();
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

// Carregar primeira query será feito após Monaco Editor estar pronto

// Função global para o input
function handleQueryInput() {
    queryManager.handleQueryInput();
}

// O redimensionamento do Monaco Editor é feito automaticamente com automaticLayout: true

// Função para alternar o painel de variáveis
function toggleVariablesPanel() {
    const panel = document.querySelector('.variables-panel');
    const editorColumn = document.getElementById('queryEditorColumn');
    
    panel.classList.toggle('collapsed');
    
    if (panel.classList.contains('collapsed')) {
        // Painel colapsado - editor ocupa mais espaço
        editorColumn.style.flex = '1';
        editorColumn.style.maxWidth = 'calc(80% - 50px)';
    } else {
        // Painel expandido - editor volta ao tamanho original
        editorColumn.style.flex = '';
        editorColumn.style.maxWidth = '';
    }
    
    // Redimensionar Monaco Editor após mudança de layout
    setTimeout(() => {
        if (monacoEditor) {
            monacoEditor.layout();
        }
        if (monacoPreviewEditor) {
            monacoPreviewEditor.layout();
        }
    }, 300);
}
