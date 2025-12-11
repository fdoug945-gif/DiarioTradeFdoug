/* ============================================
   DIÁRIO DE TRADE - SCRIPT.JS
   Funcionalidade completa do aplicativo
   ============================================ */

// ============================================
// CONFIGURAÇÃO E ESTADO GLOBAL
// ============================================

// Chave do LocalStorage
const STORAGE_KEY = 'tradeDiary_trades';

// Estado da aplicação
let trades = [];
let editingId = null;
let deleteId = null;
let selectedReasons = [];
let currentView = 'cards';

// Mapeamento de motivos para exibição
const reasonLabels = {
    'rejeicao': 'Rejeição do preço',
    'toque': 'Toque na região',
    'rompimento': 'Rompimento',
    'reversao': 'Reversão',
    'tendencia': 'Seguir tendência',
    'noticia': 'Notícia/Evento'
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Carregar trades do LocalStorage
    loadTrades();
    
    // Configurar data e hora padrão
    setDefaultDateTime();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Atualizar interface
    updateUI();
});

// ============================================
// PERSISTÊNCIA DE DADOS (LocalStorage)
// ============================================

/**
 * Carrega trades do LocalStorage
 */
function loadTrades() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        trades = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Erro ao carregar trades:', error);
        trades = [];
    }
}

/**
 * Salva trades no LocalStorage
 */
function saveTrades() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    } catch (error) {
        console.error('Erro ao salvar trades:', error);
        showToast('Erro ao salvar dados', 'error');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Navegação por tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Formulário
    document.getElementById('tradeForm').addEventListener('submit', handleFormSubmit);
    
    // Campo de ativo personalizado
    document.getElementById('asset').addEventListener('change', handleAssetChange);
    
    // Toggle buttons para motivos
    document.querySelectorAll('.toggle-btn[data-reason]').forEach(btn => {
        btn.addEventListener('click', () => toggleReason(btn.dataset.reason));
    });
    
    // Filtros do histórico
    document.getElementById('filterAsset').addEventListener('change', renderHistory);
    document.getElementById('filterResult').addEventListener('change', renderHistory);
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    // Modal de exclusão
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') closeDeleteModal();
    });
}

// ============================================
// NAVEGAÇÃO POR TABS
// ============================================

/**
 * Alterna entre as abas do aplicativo
 */
function switchTab(tabId) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    
    // Atualizar conteúdo específico da aba
    if (tabId === 'history') {
        renderHistory();
    } else if (tabId === 'analysis') {
        renderAnalysis();
    }
    
    // Re-inicializar ícones
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// ============================================
// FORMULÁRIO DE OPERAÇÕES
// ============================================

/**
 * Define data e hora padrão para agora
 */
function setDefaultDateTime() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    document.getElementById('tradeDate').value = dateStr;
    document.getElementById('tradeTime').value = timeStr;
}

/**
 * Manipula mudança no select de ativo
 */
function handleAssetChange(e) {
    const customGroup = document.getElementById('customAssetGroup');
    const customInput = document.getElementById('customAsset');
    
    if (e.target.value === 'outro') {
        customGroup.classList.remove('hidden');
        customInput.required = true;
    } else {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
}

/**
 * Alterna seleção de motivo
 */
function toggleReason(reason) {
    const btn = document.querySelector(`.toggle-btn[data-reason="${reason}"]`);
    const index = selectedReasons.indexOf(reason);
    
    if (index === -1) {
        selectedReasons.push(reason);
        btn.classList.add('active');
    } else {
        selectedReasons.splice(index, 1);
        btn.classList.remove('active');
    }
}

/**
 * Processa submissão do formulário
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Coletar dados do formulário
    const formData = {
        id: editingId || Date.now().toString(),
        operationType: document.getElementById('operationType').value,
        asset: document.getElementById('asset').value === 'outro' 
            ? document.getElementById('customAsset').value.toUpperCase()
            : document.getElementById('asset').value,
        lots: parseFloat(document.getElementById('lots').value),
        entryPrice: parseFloat(document.getElementById('entryPrice').value),
        stopLoss: parseFloat(document.getElementById('stopLoss').value),
        takeProfit: parseFloat(document.getElementById('takeProfit').value),
        result: parseFloat(document.getElementById('result').value),
        reasons: [...selectedReasons],
        description: document.getElementById('description').value.trim(),
        date: document.getElementById('tradeDate').value,
        time: document.getElementById('tradeTime').value,
        createdAt: editingId ? trades.find(t => t.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Validação adicional
    if (selectedReasons.length === 0) {
        showToast('Selecione pelo menos um motivo de entrada', 'error');
        return;
    }
    
    // Salvar ou atualizar
    if (editingId) {
        const index = trades.findIndex(t => t.id === editingId);
        if (index !== -1) {
            trades[index] = formData;
        }
        showToast('Operação atualizada com sucesso!', 'success');
    } else {
        trades.unshift(formData);
        showToast('Operação salva com sucesso!', 'success');
    }
    
    // Persistir e resetar
    saveTrades();
    resetForm();
    updateUI();
}

/**
 * Reseta o formulário para estado inicial
 */
function resetForm() {
    document.getElementById('tradeForm').reset();
    document.getElementById('customAssetGroup').classList.add('hidden');
    document.getElementById('editingId').value = '';
    
    // Resetar motivos
    selectedReasons = [];
    document.querySelectorAll('.toggle-btn[data-reason]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Resetar estado de edição
    editingId = null;
    document.getElementById('submitBtn').innerHTML = '<svg class="icon"><use href="#icon-save"/></svg> Salvar Operação';
    
    // Definir nova data/hora
    setDefaultDateTime();
}

// ============================================
// HISTÓRICO DE OPERAÇÕES
// ============================================

/**
 * Alterna entre visualização de cards e tabela
 */
function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    document.getElementById('tradesCards').classList.toggle('hidden', view !== 'cards');
    document.getElementById('tradesTable').classList.toggle('hidden', view !== 'table');
    
    renderHistory();
}

/**
 * Renderiza o histórico de operações
 */
function renderHistory() {
    const filterAsset = document.getElementById('filterAsset').value;
    const filterResult = document.getElementById('filterResult').value;
    
    // Filtrar trades
    let filteredTrades = [...trades];
    
    if (filterAsset !== 'all') {
        filteredTrades = filteredTrades.filter(t => t.asset === filterAsset);
    }
    
    if (filterResult === 'positive') {
        filteredTrades = filteredTrades.filter(t => t.result > 0);
    } else if (filterResult === 'negative') {
        filteredTrades = filteredTrades.filter(t => t.result < 0);
    }
    
    // Ordenar por data (mais recente primeiro)
    filteredTrades.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
    });
    
    // Mostrar/ocultar empty state
    const emptyState = document.getElementById('emptyHistory');
    const hasData = filteredTrades.length > 0;
    
    emptyState.classList.toggle('hidden', hasData);
    document.getElementById('tradesCards').classList.toggle('hidden', !hasData || currentView !== 'cards');
    document.getElementById('tradesTable').classList.toggle('hidden', !hasData || currentView !== 'table');
    
    if (!hasData) {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        return;
    }
    
    // Renderizar de acordo com a view
    if (currentView === 'cards') {
        renderTradeCards(filteredTrades);
    } else {
        renderTradeTable(filteredTrades);
    }
    
    // Atualizar filtro de ativos
    updateAssetFilter();
}

/**
 * Renderiza cards de trades
 */
function renderTradeCards(filteredTrades) {
    const container = document.getElementById('tradesCards');
    
    container.innerHTML = filteredTrades.map(trade => `
        <div class="trade-card ${trade.result >= 0 ? 'positive' : 'negative'}">
            <div class="trade-card-header">
                <div class="trade-asset">
                    <div class="trade-asset-icon">${getAssetIcon(trade.asset)}</div>
                    <div class="trade-asset-info">
                        <h4>${trade.asset}</h4>
                        <span>${trade.operationType === 'compra' ? '🟢 Compra' : '🔴 Venda'}</span>
                    </div>
                </div>
                <div class="trade-result ${trade.result >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(trade.result)}
                </div>
            </div>
            
            <div class="trade-card-body">
                <div class="trade-detail">
                    <span class="trade-detail-label">Lotes</span>
                    <span class="trade-detail-value">${trade.lots}</span>
                </div>
                <div class="trade-detail">
                    <span class="trade-detail-label">Entrada</span>
                    <span class="trade-detail-value">${trade.entryPrice}</span>
                </div>
                <div class="trade-detail">
                    <span class="trade-detail-label">Stop Loss</span>
                    <span class="trade-detail-value">${trade.stopLoss}</span>
                </div>
                <div class="trade-detail">
                    <span class="trade-detail-label">Take Profit</span>
                    <span class="trade-detail-value">${trade.takeProfit}</span>
                </div>
            </div>
            
            ${trade.reasons.length > 0 ? `
                <div class="trade-reasons">
                    ${trade.reasons.map(r => `
                        <span class="trade-reason-tag">${reasonLabels[r] || r}</span>
                    `).join('')}
                </div>
            ` : ''}
            
            ${trade.description ? `
                <p class="trade-description">${trade.description}</p>
            ` : ''}
            
            <div class="trade-card-footer">
                <div class="trade-date">
                    <i data-lucide="calendar"></i>
                    ${formatDate(trade.date)} às ${trade.time}
                </div>
                <div class="trade-actions">
                    <button class="action-btn" onclick="editTrade('${trade.id}')" title="Editar">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="action-btn delete" onclick="openDeleteModal('${trade.id}')" title="Excluir">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Renderiza tabela de trades
 */
function renderTradeTable(filteredTrades) {
    const tbody = document.getElementById('tradesTableBody');
    
    tbody.innerHTML = filteredTrades.map(trade => `
        <tr>
            <td>${formatDate(trade.date)}<br><small style="color: var(--text-muted)">${trade.time}</small></td>
            <td><strong>${trade.asset}</strong></td>
            <td><span class="type-badge ${trade.operationType}">${trade.operationType === 'compra' ? 'Compra' : 'Venda'}</span></td>
            <td>${trade.lots}</td>
            <td style="color: ${trade.result >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}; font-weight: 600;">
                ${formatCurrency(trade.result)}
            </td>
            <td>${trade.reasons.map(r => reasonLabels[r] || r).join(', ') || '-'}</td>
            <td>
                <div class="trade-actions">
                    <button class="action-btn" onclick="editTrade('${trade.id}')" title="Editar">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="action-btn delete" onclick="openDeleteModal('${trade.id}')" title="Excluir">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Atualiza o filtro de ativos com os ativos disponíveis
 */
function updateAssetFilter() {
    const select = document.getElementById('filterAsset');
    const currentValue = select.value;
    const assets = [...new Set(trades.map(t => t.asset))];
    
    select.innerHTML = '<option value="all">Todos os ativos</option>' +
        assets.map(a => `<option value="${a}">${a}</option>`).join('');
    
    // Restaurar seleção se ainda existir
    if (assets.includes(currentValue)) {
        select.value = currentValue;
    }
}

// ============================================
// EDIÇÃO E EXCLUSÃO
// ============================================

/**
 * Carrega trade para edição
 */
function editTrade(id) {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;
    
    // Preencher formulário
    document.getElementById('operationType').value = trade.operationType;
    
    // Verificar se é ativo padrão ou personalizado
    const standardAssets = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'BTCUSD'];
    if (standardAssets.includes(trade.asset)) {
        document.getElementById('asset').value = trade.asset;
        document.getElementById('customAssetGroup').classList.add('hidden');
    } else {
        document.getElementById('asset').value = 'outro';
        document.getElementById('customAsset').value = trade.asset;
        document.getElementById('customAssetGroup').classList.remove('hidden');
    }
    
    document.getElementById('lots').value = trade.lots;
    document.getElementById('entryPrice').value = trade.entryPrice;
    document.getElementById('stopLoss').value = trade.stopLoss;
    document.getElementById('takeProfit').value = trade.takeProfit;
    document.getElementById('result').value = trade.result;
    document.getElementById('description').value = trade.description || '';
    document.getElementById('tradeDate').value = trade.date;
    document.getElementById('tradeTime').value = trade.time;
    
    // Marcar motivos
    selectedReasons = [...trade.reasons];
    document.querySelectorAll('.toggle-btn[data-reason]').forEach(btn => {
        btn.classList.toggle('active', selectedReasons.includes(btn.dataset.reason));
    });
    
    // Configurar estado de edição
    editingId = id;
    document.getElementById('editingId').value = id;
    document.getElementById('submitBtn').innerHTML = '<i data-lucide="check"></i> Atualizar Operação';
    
    // Ir para aba de registro
    switchTab('register');
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Re-inicializar ícones
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Abre modal de confirmação de exclusão
 */
function openDeleteModal(id) {
    deleteId = id;
    document.getElementById('deleteModal').classList.add('show');
}

/**
 * Fecha modal de exclusão
 */
function closeDeleteModal() {
    deleteId = null;
    document.getElementById('deleteModal').classList.remove('show');
}

/**
 * Confirma exclusão do trade
 */
function confirmDelete() {
    if (!deleteId) return;
    
    trades = trades.filter(t => t.id !== deleteId);
    saveTrades();
    closeDeleteModal();
    updateUI();
    renderHistory();
    
    showToast('Operação excluída com sucesso!', 'success');
}

// ============================================
// ANÁLISE E ESTATÍSTICAS
// ============================================

/**
 * Renderiza a seção de análise
 */
function renderAnalysis() {
    const emptyState = document.getElementById('emptyAnalysis');
    
    if (trades.length < 1) {
        emptyState.classList.remove('hidden');
        document.querySelectorAll('.stats-grid, .analysis-section').forEach(el => {
            el.style.display = 'none';
        });
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        return;
    }
    
    emptyState.classList.add('hidden');
    document.querySelectorAll('.stats-grid, .analysis-section').forEach(el => {
        el.style.display = '';
    });
    
    // Calcular estatísticas
    const stats = calculateStats();
    
    // Atualizar cards de estatísticas
    renderStatsCards(stats);
    
    // Renderizar desempenho por ativo
    renderAssetsPerformance();
    
    // Renderizar análise por motivo
    renderReasonsAnalysis();
    
    // Renderizar análise por horário
    renderTimeAnalysis();
    
    // Gerar insights
    renderInsights(stats);
    
    // Re-inicializar ícones
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Calcula estatísticas gerais
 */
function calculateStats() {
    const wins = trades.filter(t => t.result > 0);
    const losses = trades.filter(t => t.result < 0);
    
    const totalWinAmount = wins.reduce((sum, t) => sum + t.result, 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.result, 0));
    
    return {
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
        avgWin: wins.length > 0 ? totalWinAmount / wins.length : 0,
        avgLoss: losses.length > 0 ? totalLossAmount / losses.length : 0,
        totalWinAmount,
        totalLossAmount,
        profitFactor: totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0,
        totalProfit: trades.reduce((sum, t) => sum + t.result, 0)
    };
}

/**
 * Renderiza cards de estatísticas
 */
function renderStatsCards(stats) {
    // Taxa de acerto
    document.getElementById('winRate').textContent = `${stats.winRate.toFixed(1)}%`;
    document.getElementById('winRateBar').style.width = `${stats.winRate}%`;
    
    // Média de ganho
    document.getElementById('avgWin').textContent = formatCurrency(stats.avgWin);
    document.getElementById('totalWins').textContent = `${stats.wins} trades positivos`;
    
    // Média de perda
    document.getElementById('avgLoss').textContent = formatCurrency(stats.avgLoss);
    document.getElementById('totalLosses').textContent = `${stats.losses} trades negativos`;
    
    // Fator de lucro
    const pfDisplay = stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2);
    document.getElementById('profitFactor').textContent = pfDisplay;
}

/**
 * Renderiza desempenho por ativo
 */
function renderAssetsPerformance() {
    const container = document.getElementById('assetsPerformance');
    
    // Agrupar por ativo
    const assetStats = {};
    trades.forEach(trade => {
        if (!assetStats[trade.asset]) {
            assetStats[trade.asset] = { total: 0, count: 0 };
        }
        assetStats[trade.asset].total += trade.result;
        assetStats[trade.asset].count++;
    });
    
    // Converter para array e ordenar
    const assetsArray = Object.entries(assetStats).map(([asset, data]) => ({
        asset,
        total: data.total,
        count: data.count
    })).sort((a, b) => b.total - a.total);
    
    // Encontrar valor máximo para escala
    const maxValue = Math.max(...assetsArray.map(a => Math.abs(a.total)), 1);
    
    container.innerHTML = assetsArray.map(item => {
        const percentage = (Math.abs(item.total) / maxValue) * 100;
        const isPositive = item.total >= 0;
        
        return `
            <div class="asset-row">
                <span class="asset-name">${item.asset}</span>
                <div class="asset-bar-container">
                    <div class="asset-bar ${isPositive ? 'positive' : 'negative'}" style="width: ${percentage}%">
                        <span class="asset-bar-label">${item.count} trades</span>
                    </div>
                </div>
                <span class="asset-value ${isPositive ? 'positive' : 'negative'}">
                    ${formatCurrency(item.total)}
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Renderiza análise por motivo de entrada
 */
function renderReasonsAnalysis() {
    const container = document.getElementById('reasonsAnalysis');
    
    // Agrupar por motivo
    const reasonStats = {};
    trades.forEach(trade => {
        trade.reasons.forEach(reason => {
            if (!reasonStats[reason]) {
                reasonStats[reason] = { wins: 0, losses: 0, total: 0 };
            }
            if (trade.result > 0) {
                reasonStats[reason].wins++;
            } else {
                reasonStats[reason].losses++;
            }
            reasonStats[reason].total += trade.result;
        });
    });
    
    // Converter para array
    const reasonsArray = Object.entries(reasonStats).map(([reason, data]) => {
        const total = data.wins + data.losses;
        return {
            reason,
            label: reasonLabels[reason] || reason,
            wins: data.wins,
            losses: data.losses,
            total: data.total,
            winRate: total > 0 ? (data.wins / total) * 100 : 0,
            count: total
        };
    }).sort((a, b) => b.winRate - a.winRate);
    
    container.innerHTML = reasonsArray.map(item => `
        <div class="reason-card">
            <div class="reason-header">
                <span class="reason-name">${item.label}</span>
                <span class="reason-count">${item.count} trades</span>
            </div>
            <div class="reason-stats">
                <div class="reason-stat">
                    <span class="reason-stat-label">Taxa de acerto</span>
                    <span class="reason-stat-value ${item.winRate >= 50 ? 'positive' : 'negative'}">
                        ${item.winRate.toFixed(1)}%
                    </span>
                </div>
                <div class="reason-stat">
                    <span class="reason-stat-label">Resultado</span>
                    <span class="reason-stat-value ${item.total >= 0 ? 'positive' : 'negative'}">
                        ${formatCurrency(item.total)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Renderiza análise por horário
 */
function renderTimeAnalysis() {
    const container = document.getElementById('timeAnalysis');
    
    // Definir períodos
    const periods = {
        'Madrugada': { start: 0, end: 6, wins: 0, losses: 0, total: 0 },
        'Manhã': { start: 6, end: 12, wins: 0, losses: 0, total: 0 },
        'Tarde': { start: 12, end: 18, wins: 0, losses: 0, total: 0 },
        'Noite': { start: 18, end: 24, wins: 0, losses: 0, total: 0 }
    };
    
    // Categorizar trades
    trades.forEach(trade => {
        const hour = parseInt(trade.time.split(':')[0]);
        
        for (const [period, data] of Object.entries(periods)) {
            if (hour >= data.start && hour < data.end) {
                if (trade.result > 0) {
                    data.wins++;
                } else {
                    data.losses++;
                }
                data.total += trade.result;
                break;
            }
        }
    });
    
    // Encontrar melhor período
    let bestPeriod = null;
    let bestWinRate = -1;
    
    for (const [period, data] of Object.entries(periods)) {
        const total = data.wins + data.losses;
        if (total > 0) {
            const winRate = data.wins / total;
            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestPeriod = period;
            }
        }
    }
    
    container.innerHTML = Object.entries(periods).map(([period, data]) => {
        const totalTrades = data.wins + data.losses;
        const winRate = totalTrades > 0 ? ((data.wins / totalTrades) * 100).toFixed(0) : 0;
        const isBest = period === bestPeriod && totalTrades > 0;
        
        return `
            <div class="time-block ${isBest ? 'best' : ''}">
                <div class="time-label">${period}</div>
                <div class="time-value">${winRate}%</div>
                <div class="time-detail">${totalTrades} trades</div>
            </div>
        `;
    }).join('');
}

/**
 * Gera e renderiza insights inteligentes
 */
function renderInsights(stats) {
    const container = document.getElementById('insightsContainer');
    const insights = [];
    
    // Insight: Melhor motivo de entrada
    const reasonStats = {};
    trades.forEach(trade => {
        trade.reasons.forEach(reason => {
            if (!reasonStats[reason]) {
                reasonStats[reason] = { wins: 0, total: 0 };
            }
            if (trade.result > 0) reasonStats[reason].wins++;
            reasonStats[reason].total++;
        });
    });
    
    let bestReason = null;
    let bestReasonWinRate = 0;
    for (const [reason, data] of Object.entries(reasonStats)) {
        if (data.total >= 2) {
            const winRate = data.wins / data.total;
            if (winRate > bestReasonWinRate) {
                bestReasonWinRate = winRate;
                bestReason = reason;
            }
        }
    }
    
    if (bestReason && bestReasonWinRate >= 0.5) {
        insights.push({
            icon: 'zap',
            type: 'positive',
            title: 'Padrão de Sucesso Identificado',
            text: `Quando você entra por "${reasonLabels[bestReason]}", sua taxa de acerto é de ${(bestReasonWinRate * 100).toFixed(0)}%. Continue utilizando esse critério!`
        });
    }
    
    // Insight: Melhor horário
    const periods = {
        'madrugada': { start: 0, end: 6, wins: 0, total: 0 },
        'manhã': { start: 6, end: 12, wins: 0, total: 0 },
        'tarde': { start: 12, end: 18, wins: 0, total: 0 },
        'noite': { start: 18, end: 24, wins: 0, total: 0 }
    };
    
    trades.forEach(trade => {
        const hour = parseInt(trade.time.split(':')[0]);
        for (const [period, data] of Object.entries(periods)) {
            if (hour >= data.start && hour < data.end) {
                if (trade.result > 0) data.wins++;
                data.total++;
                break;
            }
        }
    });
    
    let bestPeriod = null;
    let bestPeriodWinRate = 0;
    for (const [period, data] of Object.entries(periods)) {
        if (data.total >= 2) {
            const winRate = data.wins / data.total;
            if (winRate > bestPeriodWinRate) {
                bestPeriodWinRate = winRate;
                bestPeriod = period;
            }
        }
    }
    
    if (bestPeriod && bestPeriodWinRate >= 0.5) {
        insights.push({
            icon: 'clock',
            type: 'positive',
            title: 'Melhor Horário de Trading',
            text: `Suas operações no período da ${bestPeriod} têm taxa de acerto de ${(bestPeriodWinRate * 100).toFixed(0)}%. Considere focar nesse horário.`
        });
    }
    
    // Insight: Análise de stops
    if (trades.length >= 3) {
        const avgStopDistance = trades.reduce((sum, t) => {
            return sum + Math.abs(t.entryPrice - t.stopLoss);
        }, 0) / trades.length;
        
        const smallStopTrades = trades.filter(t => 
            Math.abs(t.entryPrice - t.stopLoss) < avgStopDistance
        );
        
        if (smallStopTrades.length >= 2) {
            const smallStopWins = smallStopTrades.filter(t => t.result > 0).length;
            const smallStopWinRate = smallStopWins / smallStopTrades.length;
            
            if (smallStopWinRate >= 0.55) {
                insights.push({
                    icon: 'shield',
                    type: 'positive',
                    title: 'Stops Curtos Funcionam',
                    text: `Operações com stop loss menor que a média têm ${(smallStopWinRate * 100).toFixed(0)}% de acerto. Stops mais apertados parecem funcionar melhor para você.`
                });
            } else if (smallStopWinRate < 0.4) {
                insights.push({
                    icon: 'alert-triangle',
                    type: 'warning',
                    title: 'Atenção aos Stops',
                    text: `Operações com stop muito curto têm apenas ${(smallStopWinRate * 100).toFixed(0)}% de acerto. Considere dar mais espaço para suas operações.`
                });
            }
        }
    }
    
    // Insight: Melhor ativo
    const assetStats = {};
    trades.forEach(trade => {
        if (!assetStats[trade.asset]) {
            assetStats[trade.asset] = { wins: 0, total: 0, profit: 0 };
        }
        if (trade.result > 0) assetStats[trade.asset].wins++;
        assetStats[trade.asset].total++;
        assetStats[trade.asset].profit += trade.result;
    });
    
    let bestAsset = null;
    let bestAssetProfit = -Infinity;
    for (const [asset, data] of Object.entries(assetStats)) {
        if (data.total >= 2 && data.profit > bestAssetProfit) {
            bestAssetProfit = data.profit;
            bestAsset = asset;
        }
    }
    
    if (bestAsset && bestAssetProfit > 0) {
        const assetData = assetStats[bestAsset];
        insights.push({
            icon: 'trophy',
            type: 'positive',
            title: 'Seu Melhor Ativo',
            text: `${bestAsset} é seu ativo mais lucrativo com ${formatCurrency(bestAssetProfit)} de lucro em ${assetData.total} operações.`
        });
    }
    
    // Insight: Consistência
    if (stats.winRate >= 55) {
        insights.push({
            icon: 'trending-up',
            type: 'positive',
            title: 'Ótima Consistência!',
            text: `Com ${stats.winRate.toFixed(1)}% de taxa de acerto, você está acima da média. Continue seguindo seu plano!`
        });
    } else if (stats.winRate < 40 && trades.length >= 5) {
        insights.push({
            icon: 'alert-circle',
            type: 'warning',
            title: 'Revise sua Estratégia',
            text: `Taxa de acerto de ${stats.winRate.toFixed(1)}% está abaixo do ideal. Considere revisar seus critérios de entrada.`
        });
    }
    
    // Insight: Fator de lucro
    if (stats.profitFactor >= 1.5 && trades.length >= 5) {
        insights.push({
            icon: 'star',
            type: 'positive',
            title: 'Excelente Gestão de Risco',
            text: `Fator de lucro de ${stats.profitFactor.toFixed(2)} indica que seus ganhos superam bem suas perdas. Ótimo trabalho!`
        });
    }
    
    // Renderizar insights ou mensagem padrão
    if (insights.length === 0) {
        container.innerHTML = `
            <div class="insight-card">
                <div class="insight-icon">
                    <i data-lucide="info"></i>
                </div>
                <div class="insight-content">
                    <h4>Coletando dados...</h4>
                    <p>Continue registrando suas operações para receber insights personalizados sobre seu trading.</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = insights.map(insight => `
            <div class="insight-card">
                <div class="insight-icon ${insight.type}">
                    <i data-lucide="${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.text}</p>
                </div>
            </div>
        `).join('');
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Formata valor como moeda brasileira
 */
function formatCurrency(value) {
    const formatted = Math.abs(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Formata data para exibição
 */
function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Retorna ícone baseado no ativo
 */
function getAssetIcon(asset) {
    if (asset.includes('BTC') || asset.includes('ETH')) return '₿';
    if (asset.includes('EUR')) return '€';
    if (asset.includes('GBP')) return '£';
    if (asset.includes('JPY')) return '¥';
    if (asset.includes('USD')) return '$';
    return asset.substring(0, 2);
}

/**
 * Exibe notificação toast
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Atualiza interface geral
 */
function updateUI() {
    // Atualizar estatísticas do header
    const totalProfit = trades.reduce((sum, t) => sum + t.result, 0);
    const profitElement = document.getElementById('totalProfit');
    const profitPill = profitElement.closest('.stat-pill');
    
    profitElement.textContent = formatCurrency(totalProfit).replace('+', '');
    profitPill.className = `stat-pill ${totalProfit >= 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('totalTrades').textContent = `${trades.length} trades`;
    
    // Re-inicializar ícones
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================
// EXPORTAR PARA ESCOPO GLOBAL
// ============================================
window.editTrade = editTrade;
window.openDeleteModal = openDeleteModal;