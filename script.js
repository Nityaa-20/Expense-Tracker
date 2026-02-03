// Global variables
let allExpenses = [];
let chartInstances = {};

// Category colors
const categoryColors = {
    'Food': '#ec4899',
    'Transport': '#8b5cf6',
    'Shopping': '#3b82f6',
    'Bills': '#06b6d4',
    'Entertainment': '#f59e0b',
    'Health': '#10b981',
    'Other': '#6b7280'
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadExpenses();
    setupNav();
    setDefaultDate();
});

// Setup navigation
function setupNav() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            switchPage(page);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Switch between pages
function switchPage(page) {
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.style.display = 'none');
    
    const activePage = document.getElementById(`${page}-page`);
    if (activePage) {
        activePage.style.display = 'block';
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'expenses': 'All Expenses',
        'unnecessary': 'Unnecessary Expenses',
        'alternatives': 'Alternative Options',
        'analytics': 'Analytics',
        'categories': 'Categories'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    
    // Load page-specific data
    if (page === 'expenses') {
        renderExpensesTable();
    } else if (page === 'unnecessary') {
        renderUnnecessaryExpenses();
    } else if (page === 'alternatives') {
        renderAlternatives();
    } else if (page === 'analytics') {
        renderAnalytics();
    } else if (page === 'categories') {
        renderCategories();
    } else if (page === 'dashboard') {
        updateDashboard();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal controls
    const addBtns = document.querySelectorAll('#addExpenseBtn, #addExpenseBtn2');
    const expenseModal = document.getElementById('expenseModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const expenseForm = document.getElementById('expenseForm');
    
    addBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            expenseModal.classList.add('active');
        });
    });
    
    closeModal.addEventListener('click', () => {
        expenseModal.classList.remove('active');
        expenseForm.reset();
    });
    
    cancelBtn.addEventListener('click', () => {
        expenseModal.classList.remove('active');
        expenseForm.reset();
    });
    
    expenseForm.addEventListener('submit', handleExpenseSubmit);
    
    // Alternative modal
    const altModal = document.getElementById('alternativeModal');
    const closeAltModal = document.getElementById('closeAltModal');
    const cancelAltBtn = document.getElementById('cancelAltBtn');
    const altForm = document.getElementById('alternativeForm');
    
    closeAltModal.addEventListener('click', () => {
        altModal.classList.remove('active');
        altForm.reset();
    });
    
    cancelAltBtn.addEventListener('click', () => {
        altModal.classList.remove('active');
        altForm.reset();
    });
    
    altForm.addEventListener('submit', handleAlternativeSubmit);
    
    // Quick action buttons
    document.getElementById('viewExpensesBtn').addEventListener('click', () => {
        switchPage('expenses');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-page="expenses"]').classList.add('active');
    });
    
    document.getElementById('viewUnnecessaryBtn').addEventListener('click', () => {
        switchPage('unnecessary');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-page="unnecessary"]').classList.add('active');
    });
    
    document.getElementById('viewAlternativesBtn').addEventListener('click', () => {
        switchPage('alternatives');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-page="alternatives"]').classList.add('active');
    });
    
    // Filters
    const categoryFilter = document.getElementById('categoryFilter');
    const typeFilter = document.getElementById('typeFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Set default date to today
function setDefaultDate() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
        if (input.name === 'date') {
            input.value = today;
        }
    });
}

// Load expenses from API
async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();
        allExpenses = data.expenses || [];
        updateDashboard();
    } catch (error) {
        console.error('Error loading expenses:', error);
        allExpenses = [];
        updateDashboard();
    }
}

// Handle expense form submission
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const expenseData = {
        description: formData.get('description'),
        amount: parseFloat(formData.get('amount')),
        category: formData.get('category'),
        date: formData.get('date'),
        is_necessary: formData.get('is_necessary') === 'true',
        notes: formData.get('notes')
    };
    
    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            document.getElementById('expenseModal').classList.remove('active');
            e.target.reset();
            await loadExpenses();
            alert('Expense added successfully!');
        } else {
            alert('Error adding expense');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding expense');
    }
}

// Delete expense
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadExpenses();
            alert('Expense deleted successfully!');
        } else {
            alert('Error deleting expense');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting expense');
    }
}

// Show alternative modal
function showAlternativeModal(expense) {
    const modal = document.getElementById('alternativeModal');
    document.getElementById('altExpenseId').value = expense.id;
    document.getElementById('altOriginalExpense').value = `${expense.description} - $${expense.amount}`;
    modal.classList.add('active');
}

// Handle alternative submission
async function handleAlternativeSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const altData = {
        expense_id: parseInt(formData.get('expense_id')),
        suggestion: formData.get('suggestion'),
        savings: parseFloat(formData.get('savings')),
        benefits: formData.get('benefits')
    };
    
    try {
        const response = await fetch('/api/alternatives', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(altData)
        });
        
        if (response.ok) {
            document.getElementById('alternativeModal').classList.remove('active');
            e.target.reset();
            await loadExpenses();
            alert('Alternative added successfully!');
            switchPage('alternatives');
        } else {
            alert('Error adding alternative');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding alternative');
    }
}

// Update dashboard
function updateDashboard() {
    const stats = calculateStats();
    
    // Update stat cards
    document.getElementById('totalExpenses').textContent = `$${stats.total.toFixed(2)}`;
    document.getElementById('necessaryExpenses').textContent = `$${stats.necessary.toFixed(2)}`;
    document.getElementById('unnecessaryExpenses').textContent = `$${stats.unnecessary.toFixed(2)}`;
    document.getElementById('potentialSavings').textContent = `$${stats.potentialSavings.toFixed(2)}`;
    
    // Update charts
    updateExpenseChart();
    updateCategoryChart();
    
    // Update recent transactions
    renderRecentTransactions();
}

// Calculate statistics
function calculateStats() {
    const necessary = allExpenses
        .filter(e => e.is_necessary)
        .reduce((sum, e) => sum + e.amount, 0);
    
    const unnecessary = allExpenses
        .filter(e => !e.is_necessary)
        .reduce((sum, e) => sum + e.amount, 0);
    
    const total = necessary + unnecessary;
    
    const potentialSavings = allExpenses
        .filter(e => e.alternative)
        .reduce((sum, e) => sum + (e.alternative.savings || 0), 0);
    
    return { total, necessary, unnecessary, potentialSavings };
}

// Update expense trend chart
function updateExpenseChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (chartInstances.expenseChart) {
        chartInstances.expenseChart.destroy();
    }
    
    // Prepare data - group by date
    const expensesByDate = {};
    allExpenses.forEach(expense => {
        const date = expense.date;
        if (!expensesByDate[date]) {
            expensesByDate[date] = 0;
        }
        expensesByDate[date] += expense.amount;
    });
    
    const sortedDates = Object.keys(expensesByDate).sort();
    const amounts = sortedDates.map(date => expensesByDate[date]);
    
    chartInstances.expenseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.slice(-30), // Last 30 days
            datasets: [{
                label: 'Daily Expenses',
                data: amounts.slice(-30),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Update category distribution chart
function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (chartInstances.categoryChart) {
        chartInstances.categoryChart.destroy();
    }
    
    // Calculate category totals
    const categoryTotals = {};
    allExpenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
    });
    
    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);
    const colors = categories.map(cat => categoryColors[cat] || '#6b7280');
    
    chartInstances.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Update category stats
    const total = amounts.reduce((sum, amt) => sum + amt, 0);
    const statsHTML = categories.map((cat, i) => {
        const percentage = total > 0 ? ((amounts[i] / total) * 100).toFixed(0) : 0;
        return `
            <div class="traffic-item">
                <span class="traffic-dot" style="background: ${colors[i]};"></span>
                <span>${cat}</span>
                <strong>${percentage}%</strong>
            </div>
        `;
    }).join('');
    
    document.getElementById('categoryStats').innerHTML = statsHTML;
}

// Render recent transactions
function renderRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    const recent = allExpenses.slice(-5).reverse();
    
    if (recent.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = recent.map(expense => {
        const iconColor = categoryColors[expense.category] || '#6b7280';
        const icon = getCategoryIcon(expense.category);
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon" style="background: ${iconColor};">
                        <i class="${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${expense.description}</h4>
                        <p>${expense.category} • ${expense.date}</p>
                    </div>
                </div>
                <div class="transaction-amount amount-negative">
                    -$${expense.amount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        'Food': 'fas fa-utensils',
        'Transport': 'fas fa-car',
        'Shopping': 'fas fa-shopping-bag',
        'Bills': 'fas fa-file-invoice-dollar',
        'Entertainment': 'fas fa-film',
        'Health': 'fas fa-heartbeat',
        'Other': 'fas fa-ellipsis-h'
    };
    return icons[category] || 'fas fa-dollar-sign';
}

// Render expenses table
function renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    
    if (allExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No expenses found</td></tr>';
        return;
    }
    
    tbody.innerHTML = allExpenses.map(expense => `
        <tr>
            <td>${expense.date}</td>
            <td>${expense.description}</td>
            <td>${expense.category}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>
                <span class="type-badge ${expense.is_necessary ? 'type-necessary' : 'type-unnecessary'}">
                    ${expense.is_necessary ? 'Necessary' : 'Unnecessary'}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-alt" onclick='showAlternativeModal(${JSON.stringify(expense)})' title="Add Alternative">
                        <i class="fas fa-lightbulb"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteExpense(${expense.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Apply filters
function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const type = document.getElementById('typeFilter').value;
    const date = document.getElementById('dateFilter').value;
    
    let filtered = allExpenses;
    
    if (category) {
        filtered = filtered.filter(e => e.category === category);
    }
    
    if (type) {
        const isNecessary = type === 'necessary';
        filtered = filtered.filter(e => e.is_necessary === isNecessary);
    }
    
    if (date) {
        filtered = filtered.filter(e => e.date === date);
    }
    
    // Temporarily replace allExpenses
    const original = allExpenses;
    allExpenses = filtered;
    renderExpensesTable();
    allExpenses = original;
}

// Render unnecessary expenses
function renderUnnecessaryExpenses() {
    const container = document.getElementById('unnecessaryGrid');
    const savingsEl = document.getElementById('unnecessarySavings');
    if (!container) return;
    
    const unnecessary = allExpenses.filter(e => !e.is_necessary);
    const totalSavings = unnecessary.reduce((sum, e) => sum + e.amount, 0);
    
    savingsEl.textContent = `$${totalSavings.toFixed(2)}`;
    
    if (unnecessary.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No unnecessary expenses found. Great job!</p>';
        return;
    }
    
    container.innerHTML = unnecessary.map(expense => `
        <div class="unnecessary-card">
            <div class="unnecessary-card-header">
                <div>
                    <h4>${expense.description}</h4>
                    <p class="category">${expense.category}</p>
                </div>
                <div class="unnecessary-amount">$${expense.amount.toFixed(2)}</div>
            </div>
            <p>${expense.notes || 'This expense could be reduced or eliminated to save money.'}</p>
            <span class="impact-badge">High Impact</span>
        </div>
    `).join('');
}

// Render alternatives
async function renderAlternatives() {
    const container = document.getElementById('alternativesGrid');
    if (!container) return;
    
    try {
        const response = await fetch('/api/alternatives');
        const data = await response.json();
        const alternatives = data.alternatives || [];
        
        if (alternatives.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280;">No alternatives suggested yet. Add some from the expenses page!</p>';
            return;
        }
        
        container.innerHTML = alternatives.map(alt => {
            const expense = allExpenses.find(e => e.id === alt.expense_id);
            return `
                <div class="alternative-card">
                    <div class="alternative-header">
                        <h4>Instead of:</h4>
                        <h3>${expense ? expense.description : 'Expense'}</h3>
                    </div>
                    <div class="savings-highlight">
                        <p>Potential Savings</p>
                        <div class="savings-amount">$${alt.savings.toFixed(2)}</div>
                    </div>
                    <p><strong>Try this:</strong> ${alt.suggestion}</p>
                    <p class="benefits">${alt.benefits || ''}</p>
                    <button class="try-btn">Try This Alternative</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading alternatives:', error);
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">Error loading alternatives</p>';
    }
}

// Render analytics
function renderAnalytics() {
    renderMonthlyChart();
    renderCategoryBarChart();
    renderInsights();
}

// Render monthly comparison chart
function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    if (chartInstances.monthlyChart) {
        chartInstances.monthlyChart.destroy();
    }
    
    // Group by month
    const monthlyData = {};
    allExpenses.forEach(expense => {
        const month = expense.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }
        monthlyData[month] += expense.amount;
    });
    
    const months = Object.keys(monthlyData).sort();
    const amounts = months.map(m => monthlyData[m]);
    
    chartInstances.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Expenses',
                data: amounts,
                backgroundColor: '#8b5cf6',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Render category bar chart
function renderCategoryBarChart() {
    const ctx = document.getElementById('categoryBarChart');
    if (!ctx) return;
    
    if (chartInstances.categoryBarChart) {
        chartInstances.categoryBarChart.destroy();
    }
    
    const categoryTotals = {};
    allExpenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
    });
    
    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);
    const colors = categories.map(cat => categoryColors[cat] || '#6b7280');
    
    chartInstances.categoryBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Category Total',
                data: amounts,
                backgroundColor: colors,
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Render AI insights
function renderInsights() {
    const container = document.getElementById('insightsGrid');
    if (!container) return;
    
    const insights = generateInsights();
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-card">
            <h4>${insight.title}</h4>
            <p>${insight.description}</p>
        </div>
    `).join('');
}

// Generate insights
function generateInsights() {
    const insights = [];
    const stats = calculateStats();
    
    // Unnecessary spending insight
    if (stats.unnecessary > 0) {
        const percentage = ((stats.unnecessary / stats.total) * 100).toFixed(1);
        insights.push({
            title: 'Unnecessary Spending',
            description: `${percentage}% of your expenses ($${stats.unnecessary.toFixed(2)}) are unnecessary. Consider reducing these to save more.`
        });
    }
    
    // Top category insight
    const categoryTotals = {};
    allExpenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    
    if (Object.keys(categoryTotals).length > 0) {
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const percentage = ((topCategory[1] / stats.total) * 100).toFixed(1);
        insights.push({
            title: 'Top Spending Category',
            description: `You spend the most on ${topCategory[0]} (${percentage}% of total). Consider if this aligns with your priorities.`
        });
    }
    
    // Savings opportunity
    if (stats.potentialSavings > 0) {
        insights.push({
            title: 'Savings Opportunity',
            description: `By following suggested alternatives, you could save up to $${stats.potentialSavings.toFixed(2)} per month!`
        });
    }
    
    // Average daily spending
    if (allExpenses.length > 0) {
        const avgDaily = stats.total / 30;
        insights.push({
            title: 'Daily Average',
            description: `Your average daily spending is $${avgDaily.toFixed(2)}. Setting a daily budget can help you stay on track.`
        });
    }
    
    return insights;
}

// Render categories
function renderCategories() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
    const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
    
    container.innerHTML = categories.map(category => {
        const categoryExpenses = allExpenses.filter(e => e.category === category);
        const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
        const count = categoryExpenses.length;
        const icon = getCategoryIcon(category);
        const color = categoryColors[category];
        
        return `
            <div class="category-card">
                <div class="category-icon" style="background: ${color};">
                    <i class="${icon}"></i>
                </div>
                <h4>${category}</h4>
                <div class="amount">$${total.toFixed(2)}</div>
                <p class="count">${count} transaction${count !== 1 ? 's' : ''}</p>
            </div>
        `;
    }).join('');
}
