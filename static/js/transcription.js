
class TranscriptionManager {
    constructor() {
        this.currentTranscription = '';
        this.currentSummary = '';
        this.currentFile = null;
    }


    async processUrl(url) {
        if (!authManager.requireAuth()) return false;

        try {
            Utils.showToast('Procesando URL...', 'info');
            
            const data = await apiService.transcribeUrlWithRetry(url);

            if (data.error) {
                Utils.showToast(`Error: ${data.error}`, 'error');
                return this.getFallbackTranscription(url);
            }

            this.currentTranscription = data.transcription;
            this.currentSummary = data.summary;
            
            Utils.showToast('Transcripción completada exitosamente', 'success');
            return {
                success: true,
                transcription: data.transcription,
                summary: data.summary,
                dbSaved: data.db_saved || false
            };

        } catch (error) {
            console.error('Error en transcripción URL:', error);
            Utils.showToast('Error al procesar la URL. Usando datos de ejemplo.', 'warning');
            return this.getFallbackTranscription(url);
        }
    }

    // Procesa archivo
    async processFile(file, type) {
        if (!authManager.requireAuth()) return false;

        try {
            Utils.showToast(`Procesando ${type}...`, 'info');
            
            const data = await apiService.transcribeFile(file, type);
            
            if (data.error) {
                Utils.showToast(`Error: ${data.error}`, 'error');
                return false;
            }

            this.currentTranscription = data.transcription;
            this.currentSummary = data.summary;
            this.currentFile = file;
            
            Utils.showToast('Archivo procesado exitosamente', 'success');
            return {
                success: true,
                transcription: data.transcription,
                summary: data.summary,
                dbSaved: data.db_saved || false,
                fileName: file.name
            };

        } catch (error) {
            console.error('Error en procesamiento de archivo:', error);
            Utils.showToast('Error al procesar el archivo', 'error');
            return false;
        }
    }

    // Redactar texto con IA
    async rewriteText(text) {
        if (!authManager.requireAuth()) return null;

        try {
            Utils.showToast('Redactando con IA...', 'info');
            
            const data = await apiService.rewriteTextWithRetry(text);

            if (data.success) {
                Utils.showToast('Texto redactado exitosamente', 'success');
                return {
                    success: true,
                    article: data.article,
                    dbSaved: data.db_saved || false
                };
            } else {
                Utils.showToast(`Error: ${data.error}`, 'error');
                return {
                    success: false,
                    error: data.error
                };
            }

        } catch (error) {
            console.error('Error en redacción:', error);
            Utils.showToast('Error al redactar el texto', 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }


    getFallbackTranscription(url) {
        let transcription = MOCK_DATA.TRANSCRIPTION;
        
        // CORRECCIÓN: Eliminar la condición de YouTube
        if (url.includes('facebook.com')) {
            transcription = MOCK_DATA.FACEBOOK_TRANSCRIPTION;
        }

        this.currentTranscription = transcription;
        this.currentSummary = MOCK_DATA.SUMMARY;
        return {
            success: true,
            transcription: transcription,
            summary: MOCK_DATA.SUMMARY,
            isFallback: true
        };
    }

    // Limpiar los datos 
    clearCurrent() {
        this.currentTranscription = '';
        this.currentSummary = '';
        this.currentFile = null;
    }
    getCurrentData() {
        return {
            transcription: this.currentTranscription,
            summary: this.currentSummary,
            hasData: !!this.currentTranscription
        };
    }

    validateFile(file, allowedTypes) {
        if (!file) {
            return { valid: false, error: 'No se seleccionó ningún archivo' };
        }

        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return { valid: false, error: 'El archivo es demasiado grande (máximo 100MB)' };
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            return { valid: false, error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}` };
        }

        return { valid: true };
    }

    static getFileTypeConfig(type) {
        const configs = {
            video: {
                allowedExtensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
                maxSize: 100 * 1024 * 1024,
                accept: 'video/*'
            },
            image: {
                allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
                maxSize: 20 * 1024 * 1024,
                accept: 'image/*'
            },
            audio: {
                allowedExtensions: ['mp3', 'wav', 'ogg', 'm4a'],
                maxSize: 50 * 1024 * 1024,
                accept: 'audio/*'
            }
        };

        return configs[type] || configs.video;
    }
}

const transcriptionManager = new TranscriptionManager();