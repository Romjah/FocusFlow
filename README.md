# FocusFlow

FocusFlow is a Chrome extension designed to boost productivity with a Pomodoro timer, task management, and website blocking features.

## Features

- **Pomodoro Timer**: Customizable focus and break durations
- **Task Management**: Simple to-do list with completion tracking
- **Website Blocking**: Temporarily block distracting websites during focus sessions
- **Statistics**: Track your productivity with daily and weekly stats
- **Notifications**: Get notified when sessions end or breaks are over

## Installation

### Installation en mode développeur
1. Clonez ce dépôt sur votre ordinateur ou téléchargez-le sous forme de ZIP
   ```bash
   git clone https://github.com/your-username/FocusFlow.git
   ```
   
2. Ouvrez Chrome et accédez à la page des extensions
   - Tapez `chrome://extensions/` dans la barre d'adresse ou
   - Menu → Plus d'outils → Extensions

3. Activez le "Mode développeur" en basculant l'interrupteur en haut à droite

4. Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier FocusFlow

5. L'extension FocusFlow apparaîtra dans votre liste d'extensions et sera prête à être utilisée

6. Cliquez sur l'icône de l'extension dans la barre d'outils pour commencer à l'utiliser

### Comment utiliser l'extension
1. Cliquez sur l'icône FocusFlow dans la barre d'outils de Chrome pour ouvrir l'interface
2. Cliquez sur "Start" pour démarrer une session de concentration (25 minutes par défaut)
3. Ajoutez des tâches à votre liste en cliquant sur le bouton "+" dans la section Tâches
4. Les sites distractifs configurés seront bloqués pendant les sessions de concentration
5. Une notification apparaîtra lorsqu'il sera temps de faire une pause
6. Consultez vos statistiques de productivité en cliquant sur l'icône 📊

### Désinstallation
Pour désinstaller l'extension :
1. Accédez à `chrome://extensions/`
2. Trouvez FocusFlow dans la liste et cliquez sur "Supprimer"

## Configuration

- **Timer Settings**: Customize focus duration, short break duration, long break duration, and sessions before a long break
- **Blocked Websites**: Enter domains to block during focus sessions (one per line)
- **Notifications**: Enable or disable notifications

## Development

The extension is built using vanilla JavaScript, HTML, and CSS with Chrome Extension APIs.

Files structure:
- `manifest.json`: Extension configuration
- `popup.html`: Main user interface
- `popup.js`: Interface logic and functionality
- `background.js`: Background processes and website blocking
- `styles.css`: Styling for the extension
- `block.html`: Page shown for blocked websites
- `images/`: Icons and images

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue if you find any bugs or have feature suggestions.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 