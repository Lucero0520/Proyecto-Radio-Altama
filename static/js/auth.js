class AuthManager {
    constructor() {
        this.registeredAccounts = JSON.parse(localStorage.getItem('registeredAccounts')) || [
            { email: 'admin@radioaltamar.com', password: 'admin123' },
            { email: 'usuario@radioaltamar.com', password: 'radio123' }
        ];
        this.currentUser = localStorage.getItem('currentUser');
        this.isAdmin = this.currentUser === 'admin@radioaltamar.com';
    }

    // Iniciar sesión
    login(email, password) {
        const user = this.registeredAccounts.find(acc => 
            acc.email === email && acc.password === password
        );
        
        if (user) {
            this.currentUser = email;
            this.isAdmin = (email === 'admin@radioaltamar.com');
            localStorage.setItem('currentUser', email);
            Utils.showToast(`Bienvenido ${email}`, 'success');
            return true;
        }
        
        Utils.showToast('Credenciales incorrectas', 'error');
        return false;
    }

    
    logout() {
        this.currentUser = null;
        this.isAdmin = false;
        localStorage.removeItem('currentUser');
        Utils.showToast('Sesión cerrada correctamente', 'info');
    }


    isAuthenticated() {
        return this.currentUser !== null;
    }


    requireAuth() {
        if (!this.isAuthenticated()) {
            Utils.showToast('Debe iniciar sesión para acceder a esta función', 'warning');
            return false;
        }
        return true;
    }

    
    requireAdmin() {
        if (!this.isAuthenticated()) {
            Utils.showToast('Debe iniciar sesión', 'warning');
            return false;
        }
        if (!this.isAdmin) {
            Utils.showToast('Se requieren permisos de administrador', 'error');
            return false;
        }
        return true;
    }

    addAccount(email, password = 'radio123') {
        if (!this.requireAdmin()) return false;

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Email inválido', 'error');
            return false;
        }

        if (this.registeredAccounts.find(acc => acc.email === email)) {
            Utils.showToast('La cuenta ya existe', 'error');
            return false;
        }

        this.registeredAccounts.push({ email, password });
        this.saveAccounts();
        Utils.showToast(`Cuenta ${email} creada`, 'success');
        return true;
    }

    removeAccount(email) {
        if (!this.requireAdmin()) return false;

 
        if (email === 'admin@radioaltamar.com') {
            Utils.showToast('No se puede eliminar la cuenta de administrador principal', 'error');
            return false;
        }

        const initialLength = this.registeredAccounts.length;
        this.registeredAccounts = this.registeredAccounts.filter(acc => acc.email !== email);
        
        if (this.registeredAccounts.length < initialLength) {
            this.saveAccounts();
            Utils.showToast('Cuenta eliminada', 'success');
            return true;
        }
        
        Utils.showToast('No se pudo eliminar la cuenta', 'error');
        return false;
    }

  
    saveAccounts() {
        localStorage.setItem('registeredAccounts', JSON.stringify(this.registeredAccounts));
    }

    
    getCurrentUserInfo() {
        if (!this.currentUser) return null;
        
        return {
            email: this.currentUser,
            isAdmin: this.isAdmin,
            displayName: this.currentUser.split('@')[0]
        };
    }

  
    changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) return false;

        const user = this.registeredAccounts.find(acc => acc.email === this.currentUser);
        if (!user || user.password !== currentPassword) {
            Utils.showToast('Contraseña actual incorrecta', 'error');
            return false;
        }

        user.password = newPassword;
        this.saveAccounts();
        Utils.showToast('Contraseña actualizada correctamente', 'success');
        return true;
    }
}


const authManager = new AuthManager();