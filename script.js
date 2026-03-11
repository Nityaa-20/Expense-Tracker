// Global variables
let selectedCurrency = userCurrency || "$";
let allExpenses = [];
let chartInstances = {};
let monthlyBudget = localStorage.getItem("monthlyBudget_" + username) || 0;



// Currency conversion rates (base = USD)
const currencyRates = {
    "$": 1,
    "₹": 83,
    "€": 0.92,
    "£": 0.78
};


function formatMoney(amount) {
    const rate = currencyRates[selectedCurrency] || 1;
    const converted = amount * rate;
    return selectedCurrency + converted.toFixed(2);
}



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

const smartAlternatives = {
    "Food": {
        suggestion: "Cook at home instead of ordering outside.",
        savePercent: 0.6
    },
    "Shopping": {
        suggestion: "Wait 24 hours before buying this item.",
        savePercent: 0.5
    },
    "Entertainment": {
        suggestion: "Use free streaming platforms instead.",
        savePercent: 0.7
    },
    "Transport": {
        suggestion: "Try public transport or carpooling.",
        savePercent: 0.4
    },
    "Bills": {
        suggestion: "Check for cheaper subscription plans.",
        savePercent: 0.3
    },
    "Other": {
        suggestion: "Consider skipping this purchase.",
        savePercent: 0.5
    }
};



// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    await loadExpenses();
    setupNav();
    setDefaultDate();
    loadBudget();

    // ✅ CURRENCY DROPDOWN LISTENER
    const currencyDropdown = document.getElementById("currencySelect");

    if (currencyDropdown) {
        currencyDropdown.addEventListener("change", function () {
            selectedCurrency = this.value;

            document.getElementById("amountLabel").textContent =
                `Amount (${selectedCurrency}) *`;

            updateDashboard();
            renderExpensesTable();
            renderUnnecessaryExpenses();
            renderCategories();
            renderRecentTransactions();
            updateBudgetDisplay();

        });
    }

    const periodTabs = document.querySelectorAll(".tab-btn");

    periodTabs.forEach(tab => {
        tab.addEventListener("click", function(){

            periodTabs.forEach(t => t.classList.remove("active"));
            this.classList.add("active");

            const period = this.getAttribute("data-period");
            updateDashboardByPeriod(period);

        });
    });
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

    const welcome = document.getElementById("welcomeMessage");

    if(page === "dashboard"){
        welcome.style.display = "block";
    }else{
        welcome.style.display = "none";
    }
    
    // Load page-specific data
    if (page === 'expenses') {
        renderExpensesTable();
    } else if (page === 'unnecessary') {
        renderUnnecessaryExpenses();
    } else if (page === 'alternatives') {
        renderAlternatives();
    } else if (page === 'analytics') {
        renderAnalytics();
    
    }else if (page === 'ai') {
        renderInsights();
    }else if (page === 'categories') {
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
    
    if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}
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

        const response = await fetch('/api/expenses', {
            credentials: 'include'
        });

        const data = await response.json();

        console.log("Expenses API response:", data);

        if (data.success && data.expenses) {
            allExpenses = data.expenses;
        } else {
            allExpenses = [];
        }

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

    // ✅ FIRST create formData
    const formData = new FormData(e.target);

    const expenseId = formData.get('expense_id');


    // ✅ THEN use it
    const enteredAmount = parseFloat(formData.get('amount'));

    // Convert entered currency back to USD before saving
    const usdAmount = enteredAmount / (currencyRates[selectedCurrency] || 1);

    const expenseData = {
        description: formData.get('description'),
        amount: usdAmount,   // Save in USD
        category: formData.get('category'),
        date: formData.get('date'),
        is_necessary: true,
        notes: formData.get('notes')
    };

    try {

        let response;

        if (expenseId) {
        
            response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'PUT',
                credentials: "include",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            });

        } else {
        
            response = await fetch('/api/expenses', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            });
        }

        if (response.ok) {
            document.getElementById('expenseModal').classList.remove('active');
            e.target.reset();
            document.getElementById('expenseId').value = '';
            await loadExpenses();

            alert(expenseId ? 'Expense updated successfully!' : 'Expense added successfully!');
        } else {
            alert('Error saving expense');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error saving expense');
    }
}


// Delete expense
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            credentials: 'include'
            
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
    document.getElementById('altOriginalExpense').value =
        `${expense.description} - ${formatMoney(expense.amount)}`;
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
            credentials: "include",
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
    document.getElementById('totalExpenses').textContent = formatMoney(stats.total);
    document.getElementById('necessaryExpenses').textContent = formatMoney(stats.necessary);
    document.getElementById('unnecessaryExpenses').textContent = formatMoney(stats.unnecessary);
    document.getElementById('potentialSavings').textContent = formatMoney(stats.potentialSavings);
    updateBudgetProgress(stats.total);


    // Update charts
    updateExpenseChart();
    updateCategoryChart();
    
    // Update recent transactions
    renderRecentTransactions();
    updateBudgetDisplay();
}

function detectUnnecessaryExpense(expense) {

    const keywords = [
        "swiggy",
        "zomato",
        "netflix",
        "amazon",
        "shopping",
        "movie",
        "uber",
        "ola",
        "coffee",
        "snacks"
    ];

    const text = expense.description.toLowerCase();

    for (let word of keywords) {
        if (text.includes(word)) {
            return true;
        }
    }

    if (expense.category === "Shopping" || expense.category === "Entertainment") {
        return true;
    }

    return false;
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

    const potentialSavings = unnecessary * 0.5;
    
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
    const amounts = sortedDates.map(date => expensesByDate[date] || 0);
    
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
                            return formatMoney(value);

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
                    -${formatMoney(expense.amount)}

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

function updateDashboardByPeriod(period){

    const now = new Date();

    let filtered = allExpenses;

    if(period === "daily"){
        const today = now.toISOString().split("T")[0];
        filtered = allExpenses.filter(e => e.date === today);
    }

    if(period === "weekly"){
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);

        filtered = allExpenses.filter(e => new Date(e.date) >= weekAgo);
    }

    if(period === "monthly"){
        const month = now.toISOString().slice(0,7);
        filtered = allExpenses.filter(e => e.date.startsWith(month));
    }

    if(period === "yearly"){
        const year = now.getFullYear().toString();
        filtered = allExpenses.filter(e => e.date.startsWith(year));
    }

    const original = allExpenses;
    allExpenses = filtered;

    updateDashboard();

    allExpenses = original;
}

// Render expenses table
function renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    
    if (allExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No expenses found</td></tr>';
        return;
    }
    
    tbody.innerHTML = allExpenses.map(expense => `
        <tr>
            <td>${expense.date}</td>
            <td>${expense.description}</td>
            <td>${expense.category}</td>
            <td>${formatMoney(expense.amount)}</td>

            
            <td>
                <div class="action-btns">

                    <button class="btn-icon btn-edit" onclick='editExpense(${JSON.stringify(expense)})' title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>

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
    
    const unnecessary = allExpenses.filter(
        e => !e.is_necessary || detectUnnecessaryExpense(e)
    );
    const totalSavings = unnecessary.reduce((sum, e) => sum + e.amount, 0);
    
    savingsEl.textContent = formatMoney(totalSavings);
    if (totalSavings > 0) {
        console.log("You can save", totalSavings);
    }

    
    if (unnecessary.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No unnecessary expenses found. Great job!</p>';
        return;
    }
    
    container.innerHTML = unnecessary.map(expense => {


        return `
        <div class="unnecessary-card">
            <div class="unnecessary-card-header">
                <div>
                    <h4>${expense.description}</h4>
                    <p class="category">${expense.category}</p>
                </div>

                <div class="unnecessary-amount">
                    ${formatMoney(expense.amount)}
                </div>
                <p class="ai-warning-badge">
                ⚠ AI detected this as potentially unnecessary
                </p>
            </div>

            

            <p style="color:#6b7280;">
            This expense may not be essential.
            </p>

            <div class="unnecessary-actions">
                <button onclick="deleteExpense(${expense.id})" class="btn-delete">
                    Remove Expense
                </button>
            </div>
        </div>
        `;
    }).join('');
}


// Render alternatives
async function renderAlternatives() {
    const container = document.getElementById('alternativesGrid');
    if (!container) return;
    
    try {
        const response = await fetch('/api/alternatives', {
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.success) {
            console.error(data.error);
            return;
        }
        const alternatives = data.alternatives || [];
        
        if (alternatives.length === 0) {

            const unnecessary = allExpenses.filter(e => !e.is_necessary);

            container.innerHTML = unnecessary.map(exp => {

                const alt = smartAlternatives[exp.category] || smartAlternatives["Other"];

                return `
                <div class="alternative-card">

                    <div class="ai-badge">AI Recommendation</div>

                    <h3>${exp.description}</h3>

                    <p><strong>Better Choice:</strong></p>
                    <p>${alt.suggestion}</p>

                    <div class="savings-highlight">
                    Potential Saving: ${formatMoney(exp.amount * alt.savePercent)}
                    </div>

                    <p class="ai-reason">
                    This suggestion is based on reducing unnecessary spending in the ${exp.category} category.
                    </p>

                </div>
                `;

            }).join('');

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
                        <div class="savings-amount">${formatMoney(alt.savings)}</div>
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
    calculateSpendingTrend();
    calculateSpendingPrediction();
}

function calculateSpendingTrend() {

    const trendText = document.getElementById("spendingTrendText");
    if (!trendText) return;

    const monthlyTotals = {};

    allExpenses.forEach(exp => {
        const month = exp.date.substring(0,7);
        monthlyTotals[month] = (monthlyTotals[month] || 0) + exp.amount;
    });

    const months = Object.keys(monthlyTotals).sort();

    if (months.length < 2) {
        trendText.textContent = "Not enough data to calculate trend.";
        return;
    }

    const lastMonth = monthlyTotals[months[months.length - 1]];
    const prevMonth = monthlyTotals[months[months.length - 2]];

    const change = ((lastMonth - prevMonth) / prevMonth) * 100;

    if (change > 0) {
        trendText.textContent =
        `📈 Your spending increased by ${change.toFixed(1)}% compared to last month.`;
    } else {
        trendText.textContent =
        `📉 Your spending decreased by ${Math.abs(change).toFixed(1)}% compared to last month.`;
    }
}

function calculateSpendingPrediction() {

    const predictionText = document.getElementById("spendingPredictionText");
    if (!predictionText) return;

    const monthlyTotals = {};

    allExpenses.forEach(exp => {
        const month = exp.date.substring(0,7);
        monthlyTotals[month] = (monthlyTotals[month] || 0) + exp.amount;
    });

    const months = Object.keys(monthlyTotals).sort();

    if (months.length < 2) {
        predictionText.textContent = "Not enough data to predict next month.";
        return;
    }

    const lastMonth = monthlyTotals[months[months.length - 1]];
    const prevMonth = monthlyTotals[months[months.length - 2]];

    const growth = lastMonth - prevMonth;

    const predicted = lastMonth + growth;

    let message =
        `🔮 Based on your spending trend, next month spending could be ${formatMoney(predicted)}.`;

    if (monthlyBudget && predicted > monthlyBudget) {

        const diff = predicted - monthlyBudget;

        message += ` ⚠ You may exceed your budget by ${formatMoney(diff)}.`;
    }

    predictionText.textContent = message;
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
                            return formatMoney(value);

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
                            return formatMoney(value);

                        }
                    }
                }
            }
        }
    });
}

// Render AI insights
function renderInsights() {
    const container = document.getElementById('aiInsightsGrid');
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
            description: `${percentage}% of your expenses (${formatMoney(stats.unnecessary)}) are unnecessary. Consider reducing these to save more.`
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
            description: `By following suggested alternatives, you could save up to ${formatMoney(stats.potentialSavings)} per month!`
        });
    }
    
    // Average daily spending
    if (allExpenses.length > 0) {
        const avgDaily = stats.total / 30;
        insights.push({
            title: 'Daily Average',
            description: `Your average daily spending is ${formatMoney(avgDaily)}. Setting a daily budget can help you stay on track.`
        });
    }

    // Financial Health Score
    if (stats.total > 0) {

        let score = 100;

        const unnecessaryRatio = stats.unnecessary / stats.total;

        if (unnecessaryRatio > 0.4) {
            score -= 30;
        } else if (unnecessaryRatio > 0.2) {
            score -= 15;
        }

        if (monthlyBudget && stats.total > monthlyBudget) {
            score -= 25;
        }

        insights.push({
            title: "Financial Health Score",
            description: `Your financial health score is ${score}/100. ${
                score > 80 ? "Excellent spending habits!" :
                score > 60 ? "Your finances are fairly balanced." :
                "Try reducing unnecessary expenses to improve your score."
            }`
        });
    }

    // Smart Spending Advice
    if (stats.unnecessary > stats.necessary) {

        insights.push({
            title: "Spending Advice",
            description:
            "You are spending more on unnecessary items than essential ones. Consider reducing impulse purchases to improve savings."
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
                <div class="amount">${formatMoney(total)}</div>
                <p class="count">${count} transaction${count !== 1 ? 's' : ''}</p>
            </div>
        `;
    }).join('');
}

function editExpense(expense) {
    const modal = document.getElementById('expenseModal');

    // Fill form fields
    document.getElementById('expenseId').value = expense.id;
    document.querySelector('[name="description"]').value = expense.description;
    document.querySelector('[name="amount"]').value =
        (expense.amount * (currencyRates[selectedCurrency] || 1)).toFixed(2);
    document.querySelector('[name="category"]').value = expense.category;
    document.querySelector('[name="date"]').value = expense.date;
    document.querySelector(`[name="is_necessary"][value="${expense.is_necessary}"]`).checked = true;
    document.querySelector('[name="notes"]').value = expense.notes;

    modal.classList.add('active');
}

function updateBudgetProgress(totalSpent){

    const used = document.getElementById("budgetUsed");
    const total = document.getElementById("budgetTotal");
    const progress = document.getElementById("budgetProgress");
    const message = document.getElementById("budgetMessage");

    if(!used) return;

    used.textContent = formatMoney(totalSpent);
    total.textContent = formatMoney(monthlyBudget);

    const percent = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

    progress.style.width = percent + "%";

    if(percent > 100){
        progress.style.background = "#ef4444";
        message.textContent = "⚠ Budget exceeded!";
    }
    else if(percent > 80){
        progress.style.background = "#f59e0b";
        message.textContent = "⚠ You are close to your budget.";
    }
    else{
        progress.style.background = "#10b981";
        message.textContent = "✅ Spending is under control.";
    }
}

window.saveBudget = function () {

    const enteredBudget = parseFloat(document.getElementById("budgetInput").value);

    if(!enteredBudget){
        alert("Please enter a valid budget");
        return;
    }

    const usdBudget = enteredBudget / (currencyRates[selectedCurrency] || 1);

    monthlyBudget = usdBudget;

    localStorage.setItem("monthlyBudget_" + username, usdBudget);

    updateBudgetDisplay();

    alert("Budget updated successfully!");
}

function loadBudget() {

    const savedBudget = localStorage.getItem("monthlyBudget_" + username);

    if(savedBudget){
        monthlyBudget = parseFloat(savedBudget);

        const convertedBudget = monthlyBudget * (currencyRates[selectedCurrency] || 1);

        document.getElementById("budgetInput").value = convertedBudget.toFixed(2);
    }

    updateBudgetDisplay();
}



// ✅ UPDATE CURRENCY EVERYWHERE
function refreshCurrency() {
  document.querySelectorAll(".stat-value").forEach(el => {
    let number = parseFloat(el.textContent.replace(/[^0-9.-]+/g,""));
    if (!isNaN(number)) {
      el.textContent = selectedCurrency + number.toFixed(2);
    }
  });

  const unnecessary = document.getElementById("unnecessarySavings");
  if (unnecessary) {
    let num = parseFloat(unnecessary.textContent.replace(/[^0-9.-]+/g,""));
    if (!isNaN(num)) {
      unnecessary.textContent = selectedCurrency + num.toFixed(2);
    }
  }
}

function downloadMonthlyReport() {

    const now = new Date();
    const currentMonth = now.toISOString().slice(0,7);

    const monthlyExpenses = allExpenses.filter(exp =>
        exp.date.startsWith(currentMonth)
    );

    if (monthlyExpenses.length === 0) {
        alert("No expenses for this month.");
        return;
    }

    let csv = "Date,Description,Category,Amount,Type\n";

    monthlyExpenses.forEach(exp => {
        csv += `${exp.date},${exp.description},${exp.category},${exp.amount},${exp.is_necessary ? "Necessary" : "Unnecessary"}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "monthly_expense_report.csv";
    a.click();

    window.URL.revokeObjectURL(url);
}


function updateBudgetDisplay() {

    const budget = monthlyBudget || 0;

    const stats = calculateStats();
    const spent = stats.total;

    const usedEl = document.getElementById("budgetUsed");
    const totalEl = document.getElementById("budgetTotal");
    const progressEl = document.getElementById("budgetProgress");
    const messageEl = document.getElementById("budgetMessage");

    if (!usedEl || !totalEl) return;

    usedEl.textContent = formatMoney(spent);
    totalEl.textContent = formatMoney(budget);

    const percent = budget > 0 ? (spent / budget) * 100 : 0;

    progressEl.style.width = percent + "%";

    if (percent > 100) {
        progressEl.style.background = "#ef4444";
        messageEl.textContent = "⚠ You exceeded your budget!";
    } 
    else if (percent > 80) {
        progressEl.style.background = "#f59e0b";
        messageEl.textContent = "⚠ You are close to your budget.";
    } 
    else {
        progressEl.style.background = "#10b981";
        messageEl.textContent = "✔ Spending is under control.";
    }
}



