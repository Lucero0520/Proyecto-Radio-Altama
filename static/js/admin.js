class AdminManager {
    constructor() {
        this.initialized = false;
    }

    async initializeAdminPanel() {
        if (this.initialized) return;
        
        try {
            await this.loadUsageStats(); 
            this.setupCharts();
            this.initialized = true;
        } catch (error) {
            console.error('Error inicializando panel admin:', error);
            Utils.showToast('Error al cargar panel de administración', 'error');
        }
    }

    async setupCharts() {
        const canvas = document.getElementById('statsChart'); 
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const loadingContainer = canvas.parentNode; 
        
        Utils.showLoading(loadingContainer, 'Cargando métricas simuladas...');
        await Utils.sleep(1000);
        Utils.hideLoading(loadingContainer);

        const mockLabels = ['Juli', 'Agos', 'Sep', 'Oct', 'Nov'];
        const mockData = [1200, 1500, 1800, 1400, 2200];
        const metricName = 'Artículos Procesados (Simulación)';

        if (canvas.chart) {
            canvas.chart.destroy();
        }
        
        if (window.Chart) {
            canvas.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: mockLabels,
                    datasets: [{
                        label: metricName,
                        data: mockData,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: metricName }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        } else {
            loadingContainer.innerHTML = '<p class="text-gray-500 text-center">Gráfico no disponible. Asegúrese de que Chart.js esté cargado.</p>';
        }
    }
}

const adminManager = new AdminManager();
window.addAccount = async function() {
    const emailInput = document.getElementById('new-account-email');
    const email = emailInput?.value.trim();
    
    if (!email || !Utils.validateEmail(email)) {
        Utils.showToast('Por favor ingrese un email válido', 'error');
        return;
    }

    try {
       
        Utils.showToast(`Cuenta ${email} creada exitosamente`, 'success');
        emailInput.value = '';
        
        if (window.adminManager) {
            await adminManager.loadAccountsList();
        }
    } catch (error) {
        Utils.showToast('Error al crear la cuenta', 'error');
    }
}

