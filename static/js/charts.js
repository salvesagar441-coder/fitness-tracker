let weeklyChartInstance = null;
let macroDonutInstance = null;
let weightTrendInstance = null;

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' }
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
});

function initCharts() {
    // 1. Weekly Calorie Chart
    const wcCtx = document.getElementById('weeklyCalorieChart');
    if (wcCtx) {
        weeklyChartInstance = new Chart(wcCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Calories Burned',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(6,182,212,0.75)',
                        borderRadius: 6
                    },
                    {
                        label: 'Calories Consumed',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(139,92,246,0.55)',
                        borderRadius: 6
                    }
                ]
            },
            options: chartOptions
        });
    }

    // 2. Macro Donut
    const mdCtx = document.getElementById('macroDonutChart');
    if (mdCtx) {
        macroDonutInstance = new Chart(mdCtx, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: [1, 1, 1], // placeholder
                    backgroundColor: ['#10b981', '#06b6d4', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // 3. Weight Trend
    const wtCtx = document.getElementById('weightTrendChart');
    if (wtCtx) {
        weightTrendInstance = new Chart(wtCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Weight (kg)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5
                }]
            },
            options: chartOptions
        });
    }
}

function updateWeeklyChart(labels, burnedData, intakeData) {
    if (!weeklyChartInstance) return;
    if (labels) weeklyChartInstance.data.labels = labels;
    if (burnedData) weeklyChartInstance.data.datasets[0].data = burnedData;
    if (intakeData) weeklyChartInstance.data.datasets[1].data = intakeData;
    weeklyChartInstance.update();
}

function updateMacroDonut(protein, carbs, fat) {
    if (!macroDonutInstance) return;
    if (protein === 0 && carbs === 0 && fat === 0) {
        macroDonutInstance.data.datasets[0].data = [1, 1, 1]; // avoid empty chart
    } else {
        macroDonutInstance.data.datasets[0].data = [protein, carbs, fat];
    }
    macroDonutInstance.update();
}

function updateWeightTrendChart(weightLogs) {
    if (!weightTrendInstance) return;
    
    let labels = [];
    let data = [];
    
    if (!weightLogs || weightLogs.length === 0) {
        labels = ['No Data'];
        data = [0];
    } else {
        // Sort chronologically just in case
        const sorted = [...weightLogs].sort((a,b) => new Date(a.logged_at) - new Date(b.logged_at));
        labels = sorted.map(log => log.logged_at.split('T')[0] || log.logged_at);
        data = sorted.map(log => log.weight_kg);
    }
    
    weightTrendInstance.data.labels = labels;
    weightTrendInstance.data.datasets[0].data = data;
    weightTrendInstance.update();
}
