// OffTrack Integration Module

class OffTrackIntegration {
    constructor() {
        this.baseUrl = 'http://localhost:5173'; // URL par défaut d'OffTrack en développement
        this.isConnected = false;
        this.connectionCheckInterval = null;
    }

    async checkConnection() {
        try {
            console.log('Tentative de connexion à OffTrack:', `${this.baseUrl}/api/focusflow`);
            const response = await fetch(`${this.baseUrl}/api/focusflow`);
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    async startConnectionCheck() {
        // Vérifier la connexion toutes les 30 secondes
        this.connectionCheckInterval = setInterval(() => this.checkConnection(), 30000);
        return this.checkConnection();
    }

    stopConnectionCheck() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    async syncTimerData(timerData) {
        if (!this.isConnected) return false;

        try {
            const response = await fetch(`${this.baseUrl}/api/focusflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'timer',
                    data: timerData
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error syncing timer data:', error);
            return false;
        }
    }

    async getOffTrackData() {
        if (!this.isConnected) return null;

        try {
            const response = await fetch(`${this.baseUrl}/api/focusflow`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching OffTrack data:', error);
            return null;
        }
    }
}

// Exporter l'instance unique
const offtrackIntegration = new OffTrackIntegration();
export default offtrackIntegration; 