class ApiService {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl || ''; 
        this.retryDelay = 1000;
    }

    
    async request(endpoint, options = {}) {
        
        const url = `${this.baseUrl}${endpoint}`;
        
        console.log(`🌐 Haciendo petición a: ${url}`);
        
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options,
                
            };

           
            if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(url, config);
            const responseText = await response.text(); // FIX 1: Lee el stream una vez como texto
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = JSON.parse(responseText); // FIX 2: Intenta parsear el texto
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Si falla el parseo, usa el texto crudo (error 500)
                    errorMessage = responseText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // Si OK, parsear el texto del cuerpo como JSON
            try {
                return JSON.parse(responseText);
            } catch (e) {
                throw new Error("Received non-JSON response from API endpoint.");
            }
            
        } catch (error) {
            console.error(` API Error (${endpoint}):`, error);
            
            // Si hay un fallo de red (que incluye el error "Failed to fetch"), retorna mock data.
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.log('🔄 Usando datos de ejemplo por fallo de conexión');
                return this.getMockData(endpoint);
            }
            
            throw error;
        }
    }

  
    getMockData(endpoint) {
    
        const mockData = {
            '/api/history': {
                data: [
                    {
                        id: '1',
                        title: 'Transcripción simulada (Video)',
                        file_name: 'simulacion_1.mp4',
                        file_type: 'video',
                        summary_preview: 'El jefe de gobierno anunció avances en el proyecto vial con tecnología inteligente...',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: '2', 
                        title: 'Artículo reescrito (IA)',
                        file_name: 'Texto manual',
                        file_type: 'text',
                        summary_preview: 'La IA reescribió la nota sobre la reactivación económica y la creación de empleos...',
                        timestamp: new Date(Date.now() - 86400000).toISOString()
                    }
                ],
                status: 'Success'
            },
           
            // FIX: Mock data para la papelera
            '/api/history/trash': {
                data: [
                    {
                        id: '99',
                        title: 'Elemento eliminado (Mock)',
                        file_name: 'papelera_1.txt',
                        file_type: 'text',
                        summary_preview: 'Este elemento fue eliminado para la prueba de la papelera.',
                        timestamp: new Date(Date.now() - 3600000).toISOString()
                    }
                ],
                status: 'Success'
            },
            '/api/facebook-monthly-insights': {
                labels: ['Ago', 'Set', 'Oct', 'Nov', 'Dic'],
                data: [1200, 1500, 1800, 1400, 2200],
                metric_name: 'Artículos Procesados',
                status: 'Success'
            },
            '/api/facebook-stats': {
                page_id: '100311605515158',
                fan_count: 1542,
                status: 'Success'
            },
            '/api/grounded-news': [
                {
                    time: new Date().toISOString(),
                    message: 'Sistema funcionando en modo local. Conecta a internet para noticias en tiempo real.',
                    link: '#',
                    title: 'Modo Local Activado'
                }
            ],
        
            '/api/usage-stats': {
                totalTranscriptions: 42,
                facebookFollowers: 1542,
                status: 'Success'
            }
        };

        return mockData[endpoint] || {data: [], status: 'Success'};
    }

    async transcribeUrl(url) {
        return this.request('/api/transcribe-url', {
            method: 'POST',
            body: { url }
        });
    }
    
    async transcribeFile(file, type) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const response = await fetch(`${this.baseUrl}/api/transcribe`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error subiendo archivo:', error);
           
            return {
                transcription: MOCK_DATA.TRANSCRIPTION, 
                summary: MOCK_DATA.SUMMARY,
                file_type: type,
                file_name: file.name,
                db_saved: false
            };
        }
    }
    
    async rewriteText(text) {
        return this.request('/api/gemini-call', {
            method: 'POST',
            body: { original_text: text }
        });
    }

    async getHistoryDetail(docId) {
        return this.request(`/api/history/${docId}`);
    }
    

    async deleteHistoryItem(docId) {
        
        return this.request(`/api/history/${docId}`, {
            method: 'DELETE'
        });
    }
   
    async getHistory() {
        return this.request('/api/history');
    }
    async getTrashHistory() {
        return this.request('/api/history/trash');
    }

    
    async restoreHistoryItem(docId) {
        return this.request(`/api/history/restore/${docId}`, {
            method: 'POST'
        });
    }
    

    async getFacebookStats() {
        return this.request('/api/facebook-stats');
    }
    
   
    async getNews() {
        return this.request('/api/grounded-news');
    }
    
  
    async getUsageStats() {
        return this.request('/api/usage-stats'); 
    }

    async callWithRetry(apiCall, maxRetries = this.maxRetries) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                const isRetryable = this.isRetryableError(error);
                
                if (attempt === maxRetries || !isRetryable) {
                
                    console.log('🔄 Usando datos de ejemplo después de reintentos fallidos');
                    return this.getMockDataForCall(apiCall);
                }
                
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                console.log(`Reintento ${attempt}/${maxRetries} en ${delay}ms...`);
                await Utils.sleep(delay);
            }
        }
    }

    getMockDataForCall(apiCall) {
        
        if (apiCall.name.includes('History')) {
            return this.getMockData('/api/history');
        } else if (apiCall.name.includes('FacebookStats')) {
            return this.getMockData('/api/facebook-stats');
        } else if (apiCall.name.includes('News') || apiCall.name.includes('UsageStats')) {
           
            if (apiCall.name.includes('UsageStats')) {
                return this.getMockData('/api/usage-stats');
            }
            return this.getMockData('/api/grounded-news');
        }
        return {data: [], status: 'Success'};
    }

    isRetryableError(error) {
        const retryableMessages = [
            '503',
            'overload',
            'unavailable',
            'timeout',
            'network',
            'gateway'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return retryableMessages.some(msg => errorMessage.includes(msg));
    }

    async transcribeUrlWithRetry(url) {
        return this.callWithRetry(() => this.transcribeUrl(url));
    }

    async rewriteTextWithRetry(text) {
        return this.callWithRetry(() => this.rewriteText(text));
    }

    async healthCheck() {
        try {
            await this.request('/api/history');
            return true;
        } catch (error) {
            console.log('❌ Health check falló, usando modo offline');
            return false;
        }
    }
}

const apiService = new ApiService();