# Warcamp Simulator - Modular Refactor

## Project Structure

After refactoring from a monolithic single-file structure, the game is now organized into modular ES modules:

### Directory Layout

```
Warcamps  Gemini 2.0/
├── Warcamps.html                    # Main HTML file
├── assets/
│   ├── css/
│   │   └── main.css                # Custom styles (non-Tailwind)
│   └── js/
│       ├── main.js                 # Entry point - initializes game instance
│       ├── core/
│       │   ├── constants.js         # Game data: NPCs, units, buildings, fabrials
│       │   ├── game-state.js        # State management & save/load
│       │   └── utils.js             # Utilities: logging, notifications, effects
│       ├── military/
│       │   └── military.js          # Recruitment, army stats, troop management
│       ├── buildings/
│       │   └── buildings.js         # Building construction, fabrials
│       ├── arena/
│       │   └── arena.js             # Arena combat, duels, tournaments
│       ├── espionage/
│       │   └── espionage.js         # Spy operations, espionage actions
│       ├── events/
│       │   ├── plateau-runs.js      # Plateau run event system
│       │   └── deployments.js       # Army deployments and missions
│       └── ui/
│           └── ui-manager.js        # UI updates and rendering
```

## Module Breakdown

### Core Modules
- **constants.js**: All game data (NPCs, unit stats, buildings, fabrials)
- **game-state.js**: State creation, loading, and saving
- **utils.js**: Common functions (logging, notifications, audio, UI effects)

### System Modules
- **military.js**: Recruitment, available troops, army stats, spy power, casualties
- **buildings.js**: Building costs, construction, gemheart purchases, fabrials
- **arena.js**: Duel mechanics, tournament entry, champion leveling
- **espionage.js**: Spy actions, intelligence gathering, theft operations

### Event Modules
- **plateau-runs.js**: Chasmfiend spawning, coalition formation, run resolution
- **deployments.js**: Modal management, army deployment, mission resolution

### UI Module
- **ui-manager.js**: All UI updates (time, resources, military, buildings, arena, deployments)

## Running the Game

The game requires a **local HTTP server** to serve the files (due to ES module loading restrictions).

### Using Node.js (Recommended)
```bash
npm install -g http-server
cd "path/to/Warcamps  Gemini 2.0"
http-server -p 8000
```

Then open: `http://localhost:8000/Warcamps.html`

### Using Python
```bash
cd "path/to/Warcamps  Gemini 2.0"
python3 -m http.server 8000
```

Then open: `http://localhost:8000/Warcamps.html`

## Dev Mode (Fast Testing)

Dev mode allows you to test game systems quickly by accelerating time and providing starting resources.

### How to Enable Dev Mode

1. Open `assets/js/core/constants.js`
2. Change line 2 from `export const DEV_MODE = false;` to `export const DEV_MODE = true;`
3. Refresh the game in your browser

### Dev Mode Features

When enabled, you'll get:
- ⚡ **10-second days** instead of 1 hour (test 24 days in 4 minutes!)
- 💰 **25,000 Spheres** starting resources (vs 15,000)
- 💎 **10 Gemhearts** starting resources (vs 0)
- ⚠️ **Yellow console message** confirming dev mode is active

### What to Test

With these settings, you can quickly verify:
- **Plateau Runs**: Spawn in ~30 seconds, resolve quickly
- **Arena Duels**: Fight multiple times and level up your champion
- **Building Construction**: Buy expensive buildings instantly
- **Fabrial Engineering**: Craft all fabrials without grinding
- **Daily Events**: See the full event cycle in minutes

### Disable Dev Mode

Change `DEV_MODE = true` back to `false` in `assets/js/core/constants.js` for normal gameplay.

## Key Changes

### From Original
- ✅ **Removed**: ~1600 lines of inline JavaScript
- ✅ **Removed**: Inline `<style>` tag with all custom CSS
- ✅ **Added**: Modular ES6 modules for each system
- ✅ **Preserved**: All game logic, systems, styles, and mechanics
- ✅ **Improved**: Code readability, maintainability, and scalability

### Import Pattern
All modules use ES6 imports/exports:
```javascript
import { CONSTANTS, NPC_PRINCES } from '../core/constants.js';
import { log } from '../core/utils.js';
```

### Global Game Instance
The game instance is exposed globally for onclick handlers:
```javascript
window.game = gameInstance;        // Used in onclick handlers
window.gameInstance = gameInstance; // Alias
```

All HTML onclick attributes (`onclick="game.login()"`) continue to work unchanged.

## Development

To add new features:
1. Create a new module in the appropriate folder (e.g., `assets/js/systems/new-system.js`)
2. Import required functions from core and other modules
3. Export your public functions
4. Wire up in `main.js` if it's a major system

## Testing

The game has been refactored to maintain full feature parity with the original:
- ✅ Login system
- ✅ Resource management
- ✅ Military recruitment and deployment
- ✅ Building construction
- ✅ Fabrial engineering
- ✅ Arena combat and tournaments
- ✅ Espionage operations
- ✅ Plateau run events
- ✅ Save/load system
- ✅ Notifications and audio
