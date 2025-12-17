
class Utils {
   
static showToast(message, type = 'info') {
    let toast = document.getElementById('notification-toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'notification-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

   
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}


    static createToastElement() {
        const toast = document.createElement('div');
        toast.id = 'notification-toast';
        document.body.appendChild(toast);
    }

    static formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString || 'Fecha no disponible';
        }
    }


    static copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                 
                    Utils.showToast('Texto copiado al portapapeles', 'success');
                    resolve(true);
                }).catch(reject);
            } else {
              
                try {
                    document.execCommand('copy');
                  
                    Utils.showToast('Texto copiado al portapapeles', 'success');
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
                document.body.removeChild(textArea);
            }
        });
    }

    static downloadText(filename, text) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        Utils.showToast(`Archivo "${filename}" descargado`, 'success');
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static showLoading(element, text = 'Cargando...') {
        if (element) {
            element.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8">
                    <div class="loader"></div>
                    <p class="mt-2 text-gray-600">${text}</p>
                </div>
            `;
            element.classList.add('loading');
        }
    }

    static hideLoading(element) {
        if (element) {
            element.classList.remove('loading');
        }
    }
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    static truncateText(text, maxLength = 150) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Formatear número con separadores
    static formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }
}

window.MOCK_DATA = {
    TRANSCRIPTION: "El día de hoy, el jefe de gobierno, Jorge Altamirano, dio a conocer los avances en el proyecto de mejora de la infraestructura vial de la ciudad. Durante una rueda de prensa, se destacó la inversión en tecnología de punta para monitorear el tráfico en tiempo real y optimizar los flujos de circulación.",
    SUMMARY: "El jefe de gobierno, Jorge Altamirano, anunció avances en el proyecto de infraestructura vial, con la implementación de tecnología para monitorear el tráfico y semáforos inteligentes.",
    FACEBOOK_TRANSCRIPTION: "TRANSCRIPCIÓN FACEBOOK: El Ministro de Economía habló sobre la reactivación económica post-pandemia y la creación de 500 nuevos puestos de trabajo temporales en obras públicas.",
    INSTAGRAM_TRANSCRIPTION: " TRANSCRIPCIÓN INSTAGRAM: Reel informativo sobre el nuevo programa de apoyo a pequeños empresarios con fondos municipales para emprendedores locales."
};