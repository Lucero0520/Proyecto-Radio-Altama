let loggedInAsAdmin = false;
let registeredAccounts = []; 
let latestAITranscription = '';
let latestAISummary = '';
let currentUserEmail = null;

let showToast;
let sleep;
let copyText;
let downloadText;
let saveAccounts;
let MOCK_DATA; 

const appContainer = document.getElementById('app-container');



function setupGlobalVariables() {
    
    if (typeof Utils === 'undefined' || typeof window.MOCK_DATA === 'undefined') {
        console.error("CRÍTICO: utils.js o MOCK_DATA no cargados.");
        return;
    }
    

    showToast = Utils.showToast;
    sleep = Utils.sleep;
    copyText = Utils.copyToClipboard;
    downloadText = Utils.downloadText;
    saveAccounts = () => localStorage.setItem('registeredAccounts', JSON.stringify(registeredAccounts));
    MOCK_DATA = window.MOCK_DATA; 

    
    registeredAccounts = JSON.parse(localStorage.getItem('registeredAccounts')) || [
        { email: 'admin@radioaltamar.com', password: 'admin123' }, 
        { email: 'usuario@radioaltamar.com', password: 'radio123' }
    ];
    
    latestAITranscription = MOCK_DATA.TRANSCRIPTION;
    latestAISummary = MOCK_DATA.SUMMARY;
    
    currentUserEmail = localStorage.getItem('currentUser');
    if (currentUserEmail) {
        loggedInAsAdmin = currentUserEmail === registeredAccounts[0].email;
    }

    Utils.createToastElement(); 
}

const logout = () => {
    loggedInAsAdmin = false;
    currentUserEmail = null;
    localStorage.removeItem('currentUser');
    showToast("Sesión cerrada con éxito.", 'info');
    showGeneralLogin();
};


function getSimulatedTranscription(url) {
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return MOCK_DATA.FACEBOOK_TRANSCRIPTION;
    } else if (url.includes('instagram.com')) {
        return MOCK_DATA.INSTAGRAM_TRANSCRIPTION;
    } else {
       
        showToast("URL no compatible. Usando transcripción simulada genérica.", 'warning');
        return MOCK_DATA.TRANSCRIPTION;
    }
}

const processUrlHandler = async () => { 
    const urlInput = document.getElementById('videoUrl');
    const url = urlInput.value.trim();
    
    
    if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('instagram.com')) {
        showToast("❌ Solo se permiten URLs de Facebook e Instagram.", 'error');
        return;
    }

    processButton.disabled = true;
    processButton.textContent = 'Procesando archivo con el servidor Flask...';
    loadingIndicator.classList.remove('hidden');
    let success = false;
    let data = { transcription: latestAITranscription, summary: latestAISummary };

    try {
        const response = await fetch('/api/transcribe-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });

        data = await response.json();

        if (response.ok && !data.error) {
            latestAITranscription = data.transcription;
            latestAISummary = data.summary;
            showToast("Transcripción REAL exitosa. Lista para redactar.", 'success');
            success = true;
            
        } else {
            console.error("Error en Transcripción por URL:", data.error);
            showToast(`Error al transcribir: ${data.error}. Usando simulación como fallback.`, 'warning');
            await sleep(2000); 

            const simulatedText = getSimulatedTranscription(url);
            latestAITranscription = simulatedText;
            latestAISummary = MOCK_DATA.SUMMARY; 
            success = true; 
        }

    } catch (error) {
        console.error("Fallo de conexión al endpoint de transcripción:", error);
        showToast("Error de red: Falló la conexión al servidor Flask. Usando transcripción simulada como fallback.", 'error');
        await sleep(2000); 

        const simulatedText = getSimulatedTranscription(url);
        latestAITranscription = simulatedText;
        latestAISummary = MOCK_DATA.SUMMARY; 
        success = true; 
    } finally {
        if (success) {
            showResultScreen(latestAITranscription, latestAISummary);
        } else {
            processButton.textContent = 'TRANSCRIBIR Y ENVIAR AL REDACTOR';
            processButton.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    }
};

const startRewritingFromUrl = () => {
    if (latestAITranscription) {
        localStorage.setItem('tempTranscription', latestAITranscription);
        showAIPrompt();
    } else {
        showToast("Primero debe procesar un enlace exitosamente.", 'error');
    }
};



const deleteHistoryItemHandler = async (docId) => {
    // FIX: Se usa la lógica de Soft Delete (mover a papelera)
    if (!confirm('¿Estás seguro de que quieres mover este elemento a la papelera?')) {
        return;
    }
    
    
    hideHistoryModal(); 
   
    showLoading("Moviendo a papelera..."); 

    try {
        // La API llama a la función de Soft Delete
        const result = await apiService.deleteHistoryItem(docId);
        
        if (result.status === 'Success') {
            showToast('Elemento movido a Papelera correctamente.', 'success');
        } else {
            showToast(`Error: ${result.error || 'Error desconocido.'}`, 'error');
        }
    } catch (error) {
        console.error('Error al mover a papelera:', error);
        showToast(`Error de conexión al servidor: ${error.message}`, 'error');
    } finally {
       
        showHome(); 
        
        // Vuelve a abrir el historial principal para ver el cambio
        showHistoryModal();
    }
};

const restoreHistoryItemHandler = async (docId) => {
    if (!confirm('¿Estás seguro de que quieres restaurar este elemento?')) {
        return;
    }
    
    hideHistoryModal(); 
   
    showLoading("Restaurando elemento..."); 

    try {
        const result = await apiService.restoreHistoryItem(docId);
        
        if (result.status === 'Success') {
            showToast('Elemento restaurado correctamente al historial principal.', 'success');
        } else {
            showToast(`Error al restaurar: ${result.error || 'Error desconocido.'}`, 'error');
        }
    } catch (error) {
        console.error('Error al restaurar:', error);
        showToast(`Error de conexión: ${error.message}`, 'error');
    } finally {
       
        showHome(); 
        
        // Vuelve a abrir la papelera
        showTrashModal();
    }
};
const showGeneralLogin = () => {
  
     appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Altamar" class="rounded-full">
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
        </div>
        
        <div class="content flex flex-col items-center justify-center text-center is-fullscreen-center text-center is-home"">
        
            <div class="bg-gray-100 p-8 rounded-xl shadow-lg w-full max-w-sm">
                <h2 class="text-2xl font-bold mb-6 text-blue-700">Inicio de Sesión</h2>
                <p class="text-sm text-gray-500 mb-4">Ingrese sus credenciales para acceder a las herramientas.</p>
                <form id="general-login-form">
                    <div class="mb-4">
                        <input type="email" id="user-email" class="w-full p-3 rounded-lg border-2 border-gray-300" placeholder="Correo" required>
                    </div>
                    <div class="mb-6">
                        <input type="password" id="user-password" class="w-full p-3 rounded-lg border-2 border-gray-300" placeholder="Contraseña" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition">Ingresar</button>
                </form>
            </div>
            <div class="mt-4 text-gray-600 text-sm">
            </div>
        </div>
    `;

    document.getElementById('general-login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('user-email').value;
        const pass = document.getElementById('user-password').value;
        
        const userAccount = registeredAccounts.find(acc => acc.email === email && acc.password === pass);
        
        if (userAccount) {
            currentUserEmail = email;
            loggedInAsAdmin = userAccount.email === registeredAccounts[0].email;
            
            localStorage.setItem('currentUser', currentUserEmail); 
            
            showToast(loggedInAsAdmin ? 'Administrador logueado con éxito.' : 'Usuario logueado con éxito.', 'success');
            showHome();
        } else {
            showToast('Correo o contraseña incorrectos. Intente de nuevo.', 'error');
        }
    });
};

const showHome = () => {
    const menuAction = loggedInAsAdmin ? 'showAdmin()' : 'showGeneralLogin()';
    const menuIcon = loggedInAsAdmin ? 
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.82 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35-.426.426-.681 1.01-.681 1.629v.228a1.724 1.724 0 001.065 2.572c.94 1.543-.82 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.82-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35.426-.426.681-1.01.681-1.629v-.228a1.724 1.724 0 00-1.065-2.572c-.94-1.543.82-3.31 2.37-2.37.96.58 2.08-.22 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1m0-10V4a3 3 0 013-3h5a3 3 0 013 3v1"/>';

    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHistoryModal()" class="text-white bg-red-500 hover:bg-red-600 transition py-2 px-4 rounded-lg text-sm font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 17h.01" />
                    </svg>
                    Ver Historial
                </button>

                <button onclick="${menuAction}" class="text-white bg-yellow-500 hover:bg-yellow-600 transition py-2 px-4 rounded-lg text-sm font-semibold flex items-center gap-2">
                    Control
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        <div class="content flex flex-col items-center justify-start p-6">
                <h1 class="text-4xl font-bold mb-8">Bienvenido al Panel de Herramientas</h1>
                <p class="text-lg mb-6">Selecciona una herramienta para comenzar el procesamiento de medios y texto.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-lg">
                    <button onclick="showVideoTranscription()" class="bg-blue-500 text-white py-6 px-6 rounded-xl shadow-lg hover:bg-red-600 font-bold transform hover:scale-[1.03] transition">TRANSCRIBIR VIDEO</button>
                    <button onclick="showImageTranscription()" class="bg-blue-500 text-white py-6 px-6 rounded-xl shadow-lg hover:bg-yellow-500 font-bold transform hover:scale-[1.03] transition">TRANSCRIBIR IMAGEN</button>
                    <button onclick="showAIPrompt()" class="bg-blue-500 text-white py-6 px-6 rounded-xl shadow-lg hover:bg-red-600 font-bold transform hover:scale-[1.03] transition">REDACTAR CON IA</button>
                </div>
                <button onclick="showUrlTranscription()" class="mt-12 w-full max-w-lg bg-blue-500 text-white py-6 px-6 rounded-xl shadow-lg hover:bg-yellow-500 font-bold">TRANSCRIBIR POR URL</button> 
                
                <button onclick="fetchAndShowNews()" class="mt-12 w-full max-w-lg bg-blue-500 text-white py-6 px-6 rounded-xl shadow-lg hover:bg-red-600 font-bold">NOTICIAS A TIEMPO REAL</button>
            </div>
    `;
    if (window.location.search) {
        window.history.replaceState(null, null, window.location.pathname);
    }

    initializeHistoryModal();
};


const showUrlTranscription = () => {
     if (!currentUserEmail) {
        showToast("Debe iniciar sesión primero para usar las herramientas.", 'warning');
        showGeneralLogin();
        return;
    }

    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>

        <div class="content flex flex-col items-center justify-start p-6">
            <h2 class="text-3xl font-bold text-blue-700 mb-6">Transcripción por Enlace (URL)</h2>
            
            <p class="text-gray-600 mb-4 text-center">Pega un enlace de video (Facebook, YouTube, etc.) para transcribir y enviarla al redactor de IA.</p>
            
            <input type="url" id="videoUrl" 
                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition max-w-xl" 
                placeholder="Ej: https://www.facebook.com/watch/..." required>
            
            <button onclick="processUrlHandler()" id="processButton"
                    class="mt-4 w-full max-w-xl bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-600 transition disabled:bg-gray-400">
                TRANSCRIBIR Y ENVIAR AL REDACTOR
            </button>
            
            <div id="loadingIndicator" class="hidden mt-6 text-center">
                <div class="loader"></div>
                <p class="mt-2 text-blue-600 font-medium">Procesando con Gemini...</p>
            </div>
        </div>
    `;
};



const showResultScreen = (transcription, summary) => {
  
    const downloadTranscription = `downloadText('Transcripcion_URL.txt', latestAITranscription)`;
    const downloadSummary = `downloadText('Resumen_URL.txt', latestAISummary)`;
    const copyTranscription = `copyText('transcriptionContent')`;
    const copySummary = `copyText('summaryContent')`; 
    
    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        
        <div class="content p-8 pt-4">
            <h2 class="text-3xl font-bold mb-8 text-center text-blue-700">Resultados del Procesamiento</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="flex flex-col">
                    <h3 class="text-2xl font-bold mb-4 text-gray-800">Transcripción Completa</h3>
                    <div id="transcriptionContent" class="p-4 bg-white border border-gray-300 rounded-lg shadow-md flex-grow whitespace-pre-wrap text-gray-700 h-96 overflow-y-auto">
                        ${transcription || 'No se pudo obtener la transcripción.'}
                    </div>
                    <div class="mt-4 flex space-x-4">
                        <button onclick="${copyTranscription}" class="flex-1 bg-gray-400 text-white py-2 rounded-xl font-bold hover:bg-gray-500 transition">Copiar</button>
                        <button onclick="${downloadTranscription}" class="flex-1 bg-blue-500 text-white py-2 rounded-xl font-bold hover:bg-blue-600 transition">Descargar (.txt)</button>
                    </div>
                </div>

                <div class="flex flex-col">
                    <h3 class="text-2xl font-bold mb-4 text-gray-800">Resumen de IA</h3>
                    <div id="summaryContent" class="p-4 bg-white border border-gray-300 rounded-lg shadow-md flex-grow whitespace-pre-wrap text-gray-700 h-96 overflow-y-auto">
                        ${summary || 'No se pudo generar el resumen.'}
                    </div>
                    <div class="mt-4 flex space-x-4">
                        <button onclick="${copySummary}" class="flex-1 bg-gray-400 text-white py-2 rounded-xl font-bold hover:bg-gray-500 transition">Copiar</button>
                        <button onclick="${downloadSummary}" class="flex-1 bg-blue-500 text-white py-2 rounded-xl font-bold hover:bg-blue-600 transition">Descargar (.txt)</button>
                    </div>
                </div>
            </div>

            <div class="mt-10 text-center">
                <button onclick="startRewritingFromUrl()" class="bg-purple-500 text-white py-3 px-8 rounded-xl font-bold shadow-lg hover:bg-purple-600 transition">
                    IR AL REDACTOR DE IA CON ESTE TEXTO
                </button>
                <button onclick="showHome()" class="mt-4 bg-green-500 text-white py-3 px-8 rounded-xl font-bold shadow-lg hover:bg-green-600 transition">
                    Volver al Inicio
                </button>
            </div>
        </div>
    `;
};

const showAIPrompt = () => {
    
    if (!currentUserEmail) {
        showToast("Debe iniciar sesión primero para usar las herramientas.", 'warning');
        showGeneralLogin();
        return;
    }

    const tempText = localStorage.getItem('tempTranscription');
    let initialText = '';
    
    if (tempText) {
        initialText = tempText;
        localStorage.removeItem('tempTranscription');
        showToast("Transcripción cargada. Lista para la redacción.", 'info');
    }

    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        <div id="app" class="w-full bg-white p-6 sm:p-10">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-blue-800 mb-2 text-center">
                🗞️ Redactor de Contenido Noticioso (IA)
            </h1>
            <p class="text-center text-gray-600 mb-8">
                Pega el texto de origen (transcripción) y la IA lo reescribirá en un artículo profesional.
            </p>
            <div class="mb-6">
                <label for="sourceText" class="block text-lg font-semibold text-gray-700 mb-2">1. Texto de Origen (Noticia a Redactar)</label>
                <textarea id="sourceText" rows="10"
                    class="w-full p-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                    placeholder="Pega aquí el contenido que copiaste o transcribiste.">${initialText}</textarea>
            </div>
            <div class="mb-8 flex justify-center">
                <button id="rewriteButton"
                    class="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-full text-lg transition duration-300 ease-in-out transform hover:bg-blue-700 hover:scale-[1.02] active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-blue-300 disabled:transform-none">
                    Redactar Noticia con Gemini (IA)
                </button>
            </div>
            <div id="loadingIndicator" class="hidden text-center text-blue-600 mb-6">
                <div class="loader mx-auto"></div>
                <p class="mt-2 text-blue-600 font-medium">Procesando y redactando...</p>
            </div>
            <div id="resultContainer" class="hidden">
                <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">2. Artículo Redactado por la IA</h2>
                <div id="rewrittenArticle" class="p-6 bg-blue-50 border border-blue-200 rounded-lg text-gray-800 whitespace-pre-wrap leading-relaxed">
                    </div>
            </div>
            <div id="messageContainer" class="mt-6"></div>
        </div>
    `;

    const rewriteButton = document.getElementById('rewriteButton');
    const sourceTextarea = document.getElementById('sourceText');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultContainer = document.getElementById('resultContainer');
    const rewrittenArticle = document.getElementById('rewrittenArticle');
    const messageContainer = document.getElementById('messageContainer');

    function displayMessage(message, type) {
        const color = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
        messageContainer.innerHTML = `
            <div class="border px-4 py-3 rounded relative ${color}" role="alert">
                <strong class="font-bold">${type === 'error' ? 'Error: ' : 'Éxito: '}</strong>
                <span class="block sm:inline">${message}</span>
            </div>
        `;
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }

    async function rewriteNews() {
        const sourceText = sourceTextarea.value.trim();
        
        // ❌ CÓDIGO ELIMINADO/MODIFICADO: Se elimina la restricción de 50 caracteres.
        if (sourceText.length === 0) {
            displayMessage('Por favor, ingrese un texto de origen para redactar.', 'error');
            return;
        }
        
        // Mantener las comprobaciones de estado y carga
        rewriteButton.disabled = true;
        loadingIndicator.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        rewrittenArticle.textContent = '';
        messageContainer.innerHTML = '';
        
        try {
            const response = await fetch('/api/gemini-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_text: sourceText })
            });

            const data = await response.json();

            if (response.ok) {
                rewrittenArticle.textContent = data.article;
                resultContainer.classList.remove('hidden');
                displayMessage('¡La noticia ha sido redactada exitosamente! Guardado en BD: ' + data.db_saved, 'success');
            } else {
                if (data.error && data.error.includes("Cliente Gemini no inicializado")) {
                     rewrittenArticle.textContent = "Simulación por fallo de IA: " + MOCK_DATA.SUMMARY + "\n\n" + MOCK_DATA.TRANSCRIPTION;
                     resultContainer.classList.remove('hidden');
                     displayMessage('Error de conexión IA. Usando datos de simulación.', 'warning');
                } else {
                    displayMessage(`Error al redactar: ${data.error || 'Respuesta desconocida del servidor.'}`, 'error');
                }
            }

        } catch (error) {
            console.error("Error en la llamada al backend:", error);
            displayMessage(`Error al conectar con el servidor Flask: ${error.message}. Usando datos de simulación.`, 'error');
            
            rewrittenArticle.textContent = "Simulación por fallo de red: " + MOCK_DATA.SUMMARY + "\n\n" + MOCK_DATA.TRANSCRIPTION;
            resultContainer.classList.remove('hidden');

        } finally {
            rewriteButton.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    }

    rewriteButton.addEventListener('click', rewriteNews);
};


const fetchAndShowNews = () => {
   
    if (!currentUserEmail) {
        showToast("Debe iniciar sesión primero para usar las herramientas.", 'warning');
        showGeneralLogin();
        return;
    }

    showLoading("Buscando noticias de terceros con Google Search Grounding...");
    
    fetch('/api/grounded-news')
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(({ status, body }) => {
        if (status === 200 && Array.isArray(body)) {
            showRealTimeNews(body);
        } else {
            showToast(`Error de Noticias: ${body.error || 'Formato de respuesta inválido.'}`, 'error');
            showRealTimeNews([{
                time: "Error",
                message: body.error || "No se pudieron obtener noticias. Revise la conexión con Gemini o el formato JSON.", 
                link: "#",
                title: "Error de Formato (AI)"
            }]);
        }
    })
    .catch(error => {
        console.error('Error al obtener noticias:', error);
        showToast('Error de conexión con el servidor para obtener noticias.', 'error');
        showHome();
    });
};

const showLoading = (message = "Cargando...") => {
   
     appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="menu-btn cursor-pointer p-2 rounded-full hover:bg-blue-600" onclick="showHome()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
            </div>
        </div>
        <div class="content flex flex-col items-center justify-center text-center">
            <div class="flex flex-col items-center">
                <div class="loader"></div>
                <h2 class="text-xl font-bold mb-2 mt-4">${message}</h2>
                <p class="text-gray-500">Esto puede tardar unos segundos.</p>
            </div>
        </div>
    `;
};


const showRealTimeNews = (news) => {

    let newsHtml = news.map(item => `
        <div class="p-6 bg-white rounded-xl shadow-xl transition hover:shadow-2xl hover:scale-[1.02] transform">
            <h4 class="font-bold text-lg mb-2 text-blue-600">${item.title || 'Sin Título'}</h4>
            <p class="text-sm text-gray-700 mb-3">${item.message || 'Contenido no disponible'}</p>
            <a href="${item.link}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm font-semibold">Ver publicación original</a>
        </div>
    `).join('');

    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        <div class="content p-8">
            <h2 class="text-3xl font-bold mb-8 text-center text-blue-700">NOTICIAS A TIEMPO REAL</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${newsHtml}
            </div>
            <div class="mt-8 text-center">
                <button onclick="showHome()" class="bg-green-500 text-white py-3 px-8 rounded-xl font-bold shadow-lg hover:bg-green-600 transition">Volver al Inicio</button>
            </div>
        </div>
    `;
};

const showVideoTranscription = () => {
    
    if (!currentUserEmail) {
        showToast("Debe iniciar sesión primero para usar las herramientas.", 'warning');
        showGeneralLogin();
        return;
    }

    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        <div class="content flex flex-col items-center justify-center text-center">
            <h2 class="text-4xl font-bold mb-8 text-blue-700">Transcribir Video</h2>
            <label for="video-upload" class="bg-blue-500 text-white py-3 px-6 rounded-xl font-bold cursor-pointer hover:bg-blue-600 transform hover:scale-[1.03] transition shadow-lg">SUBE UN ARCHIVO (.mp4, .mov, etc.)</label>
            <input type="file" id="video-upload" class="hidden" accept="video/*" onchange="processFile('video')">
        </div>
    `;
};


const showImageTranscription = () => {
    
    if (!currentUserEmail) {
        showToast("Debe iniciar sesión primero para usar las herramientas.", 'warning');
        showGeneralLogin();
        return;
    }

    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        <div class="content flex flex-col items-center justify-center text-center">
            <h2 class="text-4xl font-bold mb-8 text-blue-700">Transcribir Imagen</h2>
            <label for="image-upload" class="bg-blue-500 text-white py-3 px-6 rounded-xl font-bold cursor-pointer hover:bg-blue-600 transform hover:scale-[1.03] transition shadow-lg">SUBE UN ARCHIVO (.jpg, .png)</label>
            <input type="file" id="image-upload" class="hidden" accept="image/*" onchange="processFile('image')">
        </div>
    `;
};


const showResult = () => {
   
    showResultScreen(latestAITranscription, latestAISummary);
};


const processFile = (type) => {
    
    const fileInput = document.getElementById(`${type}-upload`);
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type); 

        showLoading(`Subiendo y transcribiendo archivo (${file.name})...`);
        
        fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
            if (status === 200) {
                latestAITranscription = body.transcription; 
                latestAISummary = body.summary; 
                showToast("Archivo recibido en el servidor y transcripción completada.", 'success');
                showResultScreen(latestAITranscription, latestAISummary); 
            } else {
                showToast(`Error del servidor al transcribir: ${body.error}`, 'error');
                showHome();
            }
        })
        .catch(error => {
            console.error("Error al enviar archivo:", error);
            showToast("Error de conexión con el servidor para la transcripción.", 'error');
            showHome();
        });

    } else {
        showToast("Por favor, suba un archivo.", 'warning');
    }
};




const renderStatsChart = () => {

    const ctx = document.getElementById('statsChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), { 
        type: 'line',
        data: {
            labels: ['Jun', 'Juli', 'Ago', 'Set', 'Nov'],
            datasets: [{
                label: 'Seguidores',
                data: [1200, 1500, 1800, 1400, 2200],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

const renderAccountList = () => {
    
    const accountList = document.getElementById('account-list');
    if (!accountList) return;
    
    accountList.innerHTML = registeredAccounts.map(account => {
        const isDefaultAdmin = account.email === registeredAccounts[0].email;
        const deleteButton = isDefaultAdmin 
            ? `<span class="text-gray-400">Admin</span>`
            : `<button onclick="removeAccount('${account.email}')" class="text-red-500 hover:text-red-700 font-bold transition">eliminar</button>`;

        return `
            <li class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
                <span class="font-medium">${account.email}</span>
                ${deleteButton}
            </li>
        `;
    }).join('');
};

const addAccount = () => {
    
    if (!loggedInAsAdmin) {
        showToast("Error: No tienes permisos de administrador para agregar cuentas.", 'error');
        return;
    }

    const newEmailInput = document.getElementById('new-account-email');
    const newPasswordInput = document.getElementById('new-account-password'); // Obtener el nuevo campo
    
    const newEmail = newEmailInput ? newEmailInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : ''; // Obtener la nueva contraseña
    
    if (newEmail && newEmail.includes('@') && newPassword.length >= 6 && !registeredAccounts.find(acc => acc.email === newEmail)) {
        registeredAccounts.push({ email: newEmail, password: newPassword }); // Usar la nueva contraseña
        saveAccounts();
        renderAccountList();
        newEmailInput.value = '';
        newPasswordInput.value = ''; // Limpiar también el campo de contraseña
        showToast(`Cuenta '${newEmail}' creada con la contraseña proporcionada.`, 'success');
    } else {
        if (newPassword.length < 6) {
             showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
        } else {
             showToast('Por favor, ingrese un correo válido que no exista.', 'error');
        }
    }
};

const removeAccount = (email) => {
 
    if (!loggedInAsAdmin) {
        showToast("Error: No tienes permisos de administrador para eliminar cuentas.", 'error');
        return;
    }

    const initialLength = registeredAccounts.length;
    if (email === registeredAccounts[0].email) {
        showToast("Error: No se puede eliminar la cuenta de administrador principal.", 'error');
        return;
    }

    registeredAccounts = registeredAccounts.filter(acc => acc.email !== email);

    if (registeredAccounts.length < initialLength) {
        saveAccounts();
        renderAccountList();
        showToast('Cuenta eliminada.', 'success');
    } else {
         showToast('La cuenta no pudo ser eliminada.', 'error');
    }
};

async function loadFacebookStats() {
   
    const endpoint = '/api/facebook-stats';
    const followersElement = document.getElementById('facebook-followers-count');

    if (!followersElement) return;

    followersElement.textContent = '...';
    followersElement.style.color = '#3b82f6'; 

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.status === 'Success' && data.fan_count !== undefined) {
            const formattedCount = Utils.formatNumber(data.fan_count);
            
            followersElement.textContent = formattedCount;
            followersElement.style.color = '#1877F2';

        } else {
            followersElement.textContent = 'Error: Token';
            followersElement.style.color = 'red';
            showToast("Error en estadísticas: Revise el token de Facebook.", 'error');
        }

    } catch (error) {
        followersElement.textContent = 'Error de Red';
        followersElement.style.color = 'red';
        showToast("Error de red: Falló la conexión al servidor de estadísticas.", 'error');
    }
}


const showAdmin = () => {
    // ... (El resto del código HTML de showAdmin) ...
    if (!loggedInAsAdmin) {
        showGeneralLogin();
        return;
    }

    const accountsSection = `
        <div class="w-full md:w-1/3">
            <h3 class="text-2xl font-bold mb-4">Cuentas (Solo Admin)</h3>
            <ul id="account-list" class="space-y-4"></ul>
            <div class="mt-6 flex flex-col space-y-4"> 
                <input type="email" id="new-account-email" class="w-full p-3 rounded-lg border-2 border-gray-300" placeholder="Correo del nuevo usuario" required>
                <input type="password" id="new-account-password" class="w-full p-3 rounded-lg border-2 border-gray-300" placeholder="Contraseña (mínimo 6 caracteres)" required minlength="6">
                <button onclick="addAccount()" class="bg-green-500 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-600 transition">Crear nuevo</button>
            </div>
        </div>
    `;
    appContainer.innerHTML = `
        <div class="header">
            <div class="logo">
                <img src="LOGO.png" alt="Logo Radio Altamar"> 
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H8v-2h3v2zm3 0h-2v-2h2v2zm3-3H7V7h10v8z"/>
                </svg>
                <div class="logo-text">
                    <span>Radio Altamar Transcripciones</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="showHome()" class="text-white hover:text-gray-200 transition p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l-2 2m2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>
                <button onclick="logout()" class="text-white bg-red-500 hover:bg-red-600 transition py-1 px-3 rounded-lg text-sm font-semibold">
                    Salir
                </button>
            </div>
        </div>
        <div class="content p-8">
            <h2 class="text-3xl font-bold mb-8 text-center text-blue-700">Panel de Administración</h2>
            <div class="flex flex-col md:flex-row md:space-x-8 space-y-8 md:space-y-0">
                
                <div class="w-full md:w-2/3">
                    <h3 class="text-2xl font-bold mb-4">Estadísticas y Métricas</h3>
                    
                    <div class="bg-gray-50 p-6 rounded-xl shadow-lg mb-6 flex justify-between items-center border-l-4 border-blue-500">
                        <h4 class="text-xl font-semibold text-gray-700">👥 Seguidores de Facebook</h4>
                        <p id="facebook-followers-count" class="text-3xl font-extrabold text-blue-500">Cargando...</p>
                    </div>
                    
                    <div class="bg-gray-100 p-6 rounded-xl shadow-lg">
                        <canvas id="statsChart"></canvas>
                    </div>
                </div>

                ${accountsSection} 
            </div>
        </div>
    `;
    renderStatsChart();
    renderAccountList();
    loadFacebookStats();
};



const initializeHistoryModal = () => {
    if (document.getElementById('history-modal-overlay')) return;

    const modalHTML = `
        <div id="history-modal-overlay" class="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 hidden transition-opacity flex items-start justify-center">
            <div id="history-modal" class="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all max-w-4xl w-full mx-4 my-10">
                
                <div class="flex flex-col p-5 bg-blue-700 text-white">
                    <div class="flex justify-between items-center w-full mb-3">
                        <h2 id="modal-title" class="text-2xl font-bold">📋 Historial de Transcripciones</h2>
                        <button onclick="hideHistoryModal()" class="text-white hover:text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div class="flex justify-start w-full">
                        <button onclick="showTrashModal()" 
                                class="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Ver Papelera
                        </button>
                    </div>
                    
                </div>
                <div id="modal-content-area" class="p-6 max-h-[80vh] overflow-y-auto">
                    </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// Función para mostrar el modal y cargar la lista
const showHistoryModal = () => {
    const overlay = document.getElementById('history-modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        loadHistoryList();
    }
};

// Función para ocultar el modal
const hideHistoryModal = () => {
    const overlay = document.getElementById('history-modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
};

// Función para cargar la lista de historial (Implementación corregida)
const loadHistoryList = async () => {
    const contentArea = document.getElementById('modal-content-area');
    const modalTitle = document.getElementById('modal-title');
    if (!contentArea || !modalTitle) return;

    modalTitle.textContent = '📋 Historial de Transcripciones';
    contentArea.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div><p class="mt-4 text-gray-600">Cargando historial...</p></div>`;

    try {
        const historyData = await apiService.getHistory();
        
        if (historyData.status === 'Error') {
            contentArea.innerHTML = `<p class="text-red-500">Error al cargar: ${historyData.error}</p>`;
            showToast('Error al cargar historial', 'error');
            return;
        }

        const items = historyData.data;

        if (items.length === 0) {
            contentArea.innerHTML = `<p class="text-gray-500">No hay elementos en el historial.</p>`;
            return;
        }

        const listHTML = items.map(item => {
            const date = Utils.formatDate(item.timestamp); 
            // CRÍTICO: SE VUELVE A AÑADIR EL BOTÓN DE ELIMINAR AQUÍ
            return `
                <div class="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer mb-3 border-l-4 border-blue-500 relative">
                    <button onclick="deleteHistoryItemHandler('${item.id}'); event.stopPropagation();" 
                            class="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full bg-red-100/50 hover:bg-red-200 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    <div onclick="showHistoryDetailModal('${item.id}')" class="pr-8">
                        <h4 class="font-semibold text-base text-blue-700">${item.title}</h4>
                        <p class="text-xs text-gray-500">${date}</p>
                        <p class="text-sm mt-1 text-gray-700 italic truncate">${item.summary_preview}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        contentArea.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-gray-800">Selecciona un elemento:</h3>` + listHTML;

    } catch (error) {
        console.error('Error fetching history:', error);
        contentArea.innerHTML = `<p class="text-red-500">Error de conexión al servidor.</p>`;
        showToast('Error de conexión para cargar historial', 'error');
    }
};


const showHistoryDetailModal = async (docId) => {
    const contentArea = document.getElementById('modal-content-area');
    const modalTitle = document.getElementById('modal-title');
    
    if (!contentArea || !modalTitle) return;

    contentArea.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div><p class="mt-4 text-gray-600">Cargando detalle...</p></div>`;
    modalTitle.textContent = 'Cargando Detalle...';
    
    try {
        // CRÍTICO: Llama a la nueva función API para obtener el detalle
        const detailData = await apiService.getHistoryDetail(docId);

        if (detailData.status === 'Error' || !detailData.data) {
             contentArea.innerHTML = `<p class="text-red-500">Error: ${detailData.error || 'No se pudo obtener el detalle.'}</p>
                                     <button onclick="loadHistoryList()" class="mt-4 bg-gray-300 py-2 px-4 rounded">Volver a la Lista</button>`;
             modalTitle.textContent = 'Error de Detalle';
             return;
        }

        const item = detailData.data;
        
        modalTitle.textContent = 'Detalle de Transcripción';

        // Renderizar la vista de detalle
        contentArea.innerHTML = `
            <button onclick="loadHistoryList()" class="text-indigo-600 hover:text-indigo-800 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a la Lista
            </button>

            <h1 class="text-3xl font-extrabold text-blue-900 mb-2">${item.title}</h1>
            <p class="text-sm text-gray-500 mb-8">Origen: ${item.type} | Fecha: ${Utils.formatDate(item.timestamp)}</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 class="text-xl font-semibold mb-3 text-indigo-700">Resumen Periodístico</h2>
                    <div class="bg-indigo-50 p-4 rounded-lg shadow-inner max-h-96 overflow-y-auto">
                        <p class="whitespace-pre-wrap text-gray-800">${item.summary}</p>
                    </div>
                </div>

                <div>
                    <h2 class="text-xl font-semibold mb-3 text-red-700">Transcripción/Contenido Original</h2>
                    <div class="bg-red-50 p-4 rounded-lg shadow-inner max-h-96 overflow-y-auto">
                        <p class="whitespace-pre-wrap text-gray-800">${item.full_text}</p>
                    </div>
                </div>
            </div>

            <div class="mt-8 text-center">
                <button onclick="localStorage.setItem('tempTranscription', \`${item.full_text.replace(/`/g, '\\`')}\`); showHome(); showAIPrompt(); hideHistoryModal();" class="bg-purple-600 text-white py-3 px-6 rounded-xl shadow-lg hover:bg-purple-700 font-bold">
                    REDACTAR ESTE CONTENIDO CON IA
                </button>
            </div>
        `;
        Utils.showToast('Detalle cargado correctamente', 'success');

    } catch (error) {
        console.error('Error in showHistoryDetailModal:', error);
        contentArea.innerHTML = `<p class="text-red-500">Error fatal al obtener el detalle: ${error.message}</p>
                                 <button onclick="loadHistoryList()" class="mt-4 bg-gray-300 py-2 px-4 rounded">Volver a la Lista</button>`;
        modalTitle.textContent = 'Error de Conexión';
    }
};

// NUEVA FUNCIÓN: Muestra la lista de la Papelera
const showTrashModal = () => {
     const overlay = document.getElementById('history-modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        loadTrashList();
    }
};

// NUEVA FUNCIÓN: Carga la lista de la Papelera
const loadTrashList = async () => {
    const contentArea = document.getElementById('modal-content-area');
    const modalTitle = document.getElementById('modal-title');
    if (!contentArea || !modalTitle) return;

    modalTitle.textContent = '🗑️ Papelera de Reciclaje';
    contentArea.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div><p class="mt-4 text-gray-600">Cargando papelera...</p></div>`;

    try {
        const trashData = await apiService.getTrashHistory();
        
        if (trashData.status === 'Error') {
            contentArea.innerHTML = `<p class="text-red-500">Error al cargar: ${trashData.error}</p>`;
            showToast('Error al cargar papelera', 'error');
            return;
        }

        const items = trashData.data;

        if (items.length === 0) {
            contentArea.innerHTML = `
                <p class="text-gray-500">La papelera está vacía.</p>
                <button onclick="loadHistoryList()" class="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold transition">
                    Volver al Historial Principal
                </button>
            `;
            return;
        }

        const listHTML = items.map(item => {
            const date = Utils.formatDate(item.timestamp); 
            // Botón de restauración
            return `
                <div class="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer mb-3 border-l-4 border-red-500 relative">
                    
                    <div class="absolute top-2 right-2 flex space-x-2">
                        <button onclick="restoreHistoryItemHandler('${item.id}'); event.stopPropagation();" 
                                class="text-green-500 hover:text-green-700 p-1 rounded-full bg-green-100/50 hover:bg-green-200 transition"
                                title="Restaurar">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m5.356 2H9.5m-5.356 2H4V9m4.444-4.444A8.001 8.001 0 0015.356 9h.582m0 0H20v-5m-5.356 2H15.5" />
                            </svg>
                        </button>
                    </div>

                    <div onclick="showHistoryDetailModal('${item.id}')" class="pr-8">
                        <h4 class="font-semibold text-base text-red-700">${item.title} (Eliminado)</h4>
                        <p class="text-xs text-gray-500">${date}</p>
                        <p class="text-sm mt-1 text-gray-700 italic truncate">${item.summary_preview}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        contentArea.innerHTML = `
            <button onclick="loadHistoryList()" class="text-indigo-600 hover:text-indigo-800 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al Historial Principal
            </button>
            <h3 class="text-xl font-semibold mb-4 text-gray-800">Elementos en Papelera:</h3>
        ` + listHTML;

    } catch (error) {
        console.error('Error fetching trash history:', error);
        contentArea.innerHTML = `<p class="text-red-500">Error de conexión al servidor.</p>`;
        showToast('Error de conexión para cargar papelera', 'error');
    }
};


// Inicialización (se ejecuta al cargar el script)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Utils !== 'undefined') {
        setupGlobalVariables(); // Inicializa MOCK_DATA y variables
        Utils.createToastElement(); 
        
        if (currentUserEmail) {
            showHome();
        } else {
            showGeneralLogin();
        }
    } else {
        console.error("Error: utils.js no se cargó correctamente antes que app.js.");
    }
});

// Exponer funciones necesarias globalmente para los botones de onclick
window.showHome = showHome;
window.showAdmin = showAdmin;
window.showUrlTranscription = showUrlTranscription;
window.showAIPrompt = showAIPrompt;
window.showVideoTranscription = showVideoTranscription;
window.showImageTranscription = showImageTranscription;
window.fetchAndShowNews = fetchAndShowNews;
window.logout = logout;
window.processFile = processFile;
window.processUrlHandler = processUrlHandler;
window.startRewritingFromUrl = startRewritingFromUrl;
window.showResult = showResult;
window.showResultScreen = showResultScreen;
window.addAccount = addAccount;
window.removeAccount = removeAccount;

// CRITICAL FIX: Expose showLogin as an alias without redeclaring 'const'
window.showLogin = showGeneralLogin;

// Nuevas funciones del Modal (Asegurando que estén expuestas)
window.initializeHistoryModal = initializeHistoryModal;
window.loadHistoryList = loadHistoryList; 
window.showHistoryModal = showHistoryModal;
window.hideHistoryModal = hideHistoryModal;
window.showHistoryDetailModal = showHistoryDetailModal;
// CRÍTICO: Exponer la función deleteHistoryItemHandler
window.deleteHistoryItemHandler = deleteHistoryItemHandler;

window.showTrashModal = showTrashModal;
window.loadTrashList = loadTrashList;
window.restoreHistoryItemHandler = restoreHistoryItemHandler;