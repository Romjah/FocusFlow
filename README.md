# FocusFlow

FocusFlow is a Chrome extension designed to boost productivity with a Pomodoro timer, task management, and website blocking features.

## Features

- **Pomodoro Timer**: Customizable focus and break durations
- **Task Management**: Simple to-do list with completion tracking
- **Website Blocking**: Temporarily block distracting websites during focus sessions
- **Statistics**: Track your productivity with daily and weekly stats
- **Notifications**: Get notified when sessions end or breaks are over

## Installation

### Developer Mode Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The FocusFlow extension will appear in your extensions list

### From Chrome Web Store
*Coming soon*

## Usage

1. Click on the FocusFlow icon in your browser toolbar to open the popup
2. Set up your tasks by clicking the "+" button in the Tasks section
3. Start a focus session by clicking the "Start" button
4. The timer will count down, and a notification will appear when it's time for a break
5. Configure your settings by clicking the gear icon

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