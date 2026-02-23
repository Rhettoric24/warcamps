// Main entry point for Warcamp Simulator
import { CONSTANTS, NPC_PRINCES, DEV_MODE } from './core/constants.js';
import { createGameState, loadGameState, saveGameState } from './core/game-state.js';

// Log DEV_MODE status immediately on load
console.log('%c🎮 WARCAMP SIMULATOR LOADED', 'background: #1e3a8a; color: #00f2ff; font-weight: bold; padding: 8px; font-size: 14px;');
console.log(`DEV_MODE: ${DEV_MODE}`);
if (DEV_MODE) {
    console.log('%c⚡ DEV MODE IS ACTIVE', 'background: #fbbf24; color: black; font-weight: bold; padding: 4px 8px;');
    console.log('DAY_MS (milliseconds per game day):', CONSTANTS.DAY_MS);
} else {
    console.log('Dev mode is OFF. Change DEV_MODE to true in assets/js/core/constants.js');
}
import { log, requestNotificationPermission, updateNotificationButton, triggerNotification, flashScreen } from './core/utils.js';
import { updateUI, setTab, updateEspionageUI, addReport, updateReportsList, sendSpanreedMessage, updateMessagesList, toggleReportDetails } from './ui/ui-manager.js';
import { openModal, closeModal, updateModalStats, updateSpyNetwork, toggleTournamentCard, toggleBlackMarket, closeRecapModal, closeMissionModal, openSpanreedModal, closeSpanreedModal, setSpanreedTab } from './ui/modal-manager.js';
import { recruit, getArmyStats } from './military/military.js';
import { build, buyGemheart, constructFabrial } from './buildings/buildings.js';
import { startDuel, commitThrill, enterTournament } from './arena/arena.js';
import { spyAction, processSuspicionDecay } from './espionage/espionage.js';
import { openDeployModal, closeDeployModal, confirmDeploy, checkDeployments, updateMissionInfo } from './events/deployments.js';
import { spawnEvent, simulateNPCJoin, resolveRun } from './events/plateau-runs.js';

// Create global game instance
const gameInstance = {
    ...createGameState(),

    // Core methods
    login() {
        const input = document.getElementById('username-input');
        const name = input.value.trim();
        if (!name) return;

        this.username = name;
        document.getElementById('player-name-display').innerText = name;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');

        loadGameState(name, this);
        this.processOfflineTime();
        updateUI(this);
        setInterval(() => this.loop(), CONSTANTS.UI_UPDATE_RATE);
        
        log(`Welcome, Highprince ${name}. Warcamp Command online.`, "text-cyan-400 font-bold");
        if (DEV_MODE) {
            log(`⚡ DEV MODE ACTIVE: 10-second days, 25k spheres, 10 gemhearts`, "text-yellow-400 font-bold");
            console.log('%c⚡ DEV MODE ENABLED', 'background: #fbbf24; color: black; font-weight: bold; padding: 4px 8px;');
            console.log('Day duration: 10 seconds');
            console.log('Starting spheres: 25,000');
            console.log('Starting gemhearts: 10');
        }
        updateNotificationButton();
    },

    init() {
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        
        // Update espionage display when target selection changes
        const targetSelects = [document.getElementById('spy-target-modal'), document.getElementById('spy-target')];
        targetSelects.forEach(select => {
            if (select) {
                select.addEventListener('change', () => {
                    updateEspionageUI(gameInstance);
                });
            }
        });
    },

    processOfflineTime() {
        const now = Date.now();
        const elapsed = now - this.state.lastTickTime;
        
        if (elapsed >= CONSTANTS.DAY_MS) {
            const daysPassed = Math.floor(elapsed / CONSTANTS.DAY_MS);
            this.processDailyTicks(daysPassed, true);
            this.state.lastTickTime = now;
            saveGameState(this.username, this);
            log(`Offline for ${daysPassed} days. Resources updated.`, "text-cyan-400");
        }
    },

    loop() {
        const now = Date.now();
        if (now - this.state.lastTickTime >= CONSTANTS.DAY_MS) {
            this.processDailyTicks(1);
            this.state.lastTickTime = now;
            saveGameState(this.username, this);
        }

        this.checkPlateau();
        checkDeployments(this);
        updateUI(this);
    },

    checkPlateau() {
        if (!this.state.activeRun) return;

        const now = Date.now();
        const run = this.state.activeRun;

        if (run.phase === 'WARNING') {
            const timeLeft = (run.warnEndTime - now) / 1000;
            document.getElementById('plateau-timer').innerText = `WARNING: ${timeLeft.toFixed(1)}s`;
            if (now >= run.warnEndTime) {
                run.phase = 'OPEN';
                run.openEndTime = now + CONSTANTS.DAY_MS;
                document.getElementById('plateau-label').innerText = "MUSTER PHASE";
                document.getElementById('plateau-label').className = "absolute top-0 right-0 bg-green-600 text-[10px] font-bold px-2 py-1";
                document.getElementById('plateau-actions').classList.remove('hidden');
                document.getElementById('muster-leaderboard').classList.remove('hidden');
            }
        } else if (run.phase === 'OPEN') {
            const timeLeft = (run.openEndTime - now) / 1000;
            const hrs = Math.floor(timeLeft / 3600);
            const mins = Math.floor((timeLeft % 3600) / 60);
            const secs = Math.floor(timeLeft % 60);

            let timeStr = `${secs}s`;
            if (hrs > 0) timeStr = `${hrs}h ${mins}m`;
            else if (mins > 0) timeStr = `${mins}m ${secs}s`;

            document.getElementById('plateau-timer').innerText = `Departing: ${timeStr}`;

            if (Math.random() < 0.05) simulateNPCJoin(this);
            if (now >= run.openEndTime) {
                resolveRun(this);
            }
        }
    },

    processDailyTicks(count, isOffline = false) {
        for (let i = 0; i < count; i++) {
            const spheresFromGems = this.state.gemhearts * 75;
            this.state.spheres += spheresFromGems;

            let income = this.state.buildings.market * 100;
            if (this.state.fabrials.ledger > 0) income *= (1 + (0.5 * this.state.fabrials.ledger));
            this.state.spheres += income;

            this.state.arena.dailyDuels = 0;
            // Reset champion HP to full every day
            this.state.arena.hp = this.state.arena.maxHp;
            if (!isOffline) {
                log("A new day! Your champion has recovered.", "text-green-400");
            }
            
            // Track day progression for per-day systems
            this.state.dayCount = (this.state.dayCount ?? 0) + 1;
            
            // Process suspicion decay for all rivals
            processSuspicionDecay(this);

            if (!isOffline) {
                // Add daily growth report
                const totalIncome = spheresFromGems + income;
                if (totalIncome > 0) {
                    const report = `Daily income: ${totalIncome.toLocaleString()} spheres (${spheresFromGems} from gemhearts, ${income.toLocaleString()} from markets/ledgers).`;
                    addReport(this, 'growth', report, { spheres: totalIncome, fromGems: spheresFromGems, fromMarkets: income });
                }
                
                const totalDays = Math.floor((Date.now() - this.state.startTime) / CONSTANTS.DAY_MS);
                const dayOfMonth = (totalDays % 24) + 1;
                const canSpawn = dayOfMonth >= 10 && dayOfMonth <= 22;

                if (canSpawn && !this.state.activeRun && Math.random() < 0.2) {
                    spawnEvent(this);
                }

                if (Math.random() < 0.14) {
                    this.triggerDefenseEvent();
                }

                const dayOfMonth2 = (totalDays % 24) + 1;
                if (dayOfMonth2 === 12 && !this.state.tournamentActive && !isOffline) {
                    this.state.tournamentActive = true;
                    log("Tournament of Highprinces has begun!", "text-yellow-400 font-bold");
                } else if (dayOfMonth2 !== 12) {
                    this.state.tournamentActive = false;
                }
            }
        }
    },

    triggerDefenseEvent() {
        flashScreen('alert');
        
        const attackPower = 20 + Math.floor(Math.random() * 100);
        log(`ATTACK! Parshendi raiding party detected (Power: ${attackPower}).`, "text-red-500 font-bold bg-red-900/20 border-l-4 border-red-600 pl-2");
        triggerNotification("Warcamp Attack!", "Parshendi are raiding your camp!");

        // Calculate available defense power (units not on missions)
        const availableStats = getArmyStats(this, true);
        const defensePower = availableStats.power;
        
        const success = defensePower >= attackPower;
        if (success) {
            log(`DEFENSE SUCCESSFUL. Your forces (${defensePower.toFixed(1)}) repelled the attack.`, "text-green-400");
            const reportMessage = `Parshendi raid repelled successfully. Your power: ${defensePower.toFixed(1)}, Enemy power: ${attackPower}.`;
            addReport(this, 'defense', reportMessage, { success: true, defensePower, attackPower });
        } else {
            // Defense failed - consequences
            const spheresStolen = 500 + Math.floor(Math.random() * 1500); // 500-2000 spheres
            const actualStolen = Math.min(spheresStolen, this.state.spheres);
            this.state.spheres -= actualStolen;
            
            let buildingsDestroyed = [];
            
            // 10% chance per market to destroy one
            if (this.state.buildings.market > 0) {
                for (let i = 0; i < this.state.buildings.market; i++) {
                    if (Math.random() < 0.1) {
                        this.state.buildings.market--;
                        buildingsDestroyed.push('Market');
                        break; // Only destroy one
                    }
                }
            }
            
            // 10% chance per soulcaster to destroy one
            if (this.state.buildings.soulcaster > 0) {
                for (let i = 0; i < this.state.buildings.soulcaster; i++) {
                    if (Math.random() < 0.1) {
                        this.state.buildings.soulcaster--;
                        buildingsDestroyed.push('Soulcast Bunker');
                        break; // Only destroy one
                    }
                }
            }
            
            let lossDetails = `Lost ${actualStolen.toLocaleString()} spheres.`;
            if (buildingsDestroyed.length > 0) {
                lossDetails += ` ${buildingsDestroyed.join(', ')} destroyed!`;
            }
            
            log(`DEFENSES BREACHED. Your forces (${defensePower.toFixed(1)}) were overwhelmed. ${lossDetails}`, "text-orange-500 font-bold");
            const reportMessage = `Defenses breached by Parshendi raid. Your power: ${defensePower.toFixed(1)}, Enemy power: ${attackPower}. ${lossDetails}`;
            addReport(this, 'defense', reportMessage, { success: false, defensePower, attackPower, spheresLost: actualStolen, buildingsDestroyed });
        }
    },

    // Public API methods for HTML onclick handlers
    setTab: (tab) => setTab(tab),
    openModal: (system) => openModal(system),
    closeModal: () => closeModal(),
    setThrillBid: (amount) => { gameInstance.state.thrillBid = amount; },
    closeRecapModal: () => closeRecapModal(),
    closeMissionModal: (type) => closeMissionModal(type),
    openSpanreedModal: () => openSpanreedModal(),
    closeSpanreedModal: () => closeSpanreedModal(),
    setSpanreedTab: (tab) => setSpanreedTab(tab),
    sendSpanreedMessage: () => sendSpanreedMessage(gameInstance),
    toggleReportDetails: (detailsId) => toggleReportDetails(detailsId),
    recruit: (type) => recruit(gameInstance, type),
    build: (type) => build(gameInstance, type),
    buyGemheart: () => buyGemheart(gameInstance),
    constructFabrial: (type) => constructFabrial(gameInstance, type),
    startDuel: () => startDuel(gameInstance),
    commitThrill: () => commitThrill(gameInstance),
    enterTournament: () => enterTournament(gameInstance),
    spyAction: (action) => spyAction(gameInstance, action),
    openDeployModal: (type) => openDeployModal(gameInstance, type),
    closeDeployModal: () => closeDeployModal(),
    confirmDeploy: () => confirmDeploy(gameInstance),
    requestNotificationPermission: () => requestNotificationPermission(),
    _updateModalStats: (stats) => updateModalStats(stats),
    _updateSpyNetwork: (unlocked) => updateSpyNetwork(unlocked),
    _toggleTournamentCard: (active) => toggleTournamentCard(active),
    _toggleBlackMarket: (unlocked) => toggleBlackMarket(unlocked)
};

// Expose game instance globally so HTML can call methods
window.gameInstance = gameInstance;
window.game = gameInstance; // Alias for backward compatibility

// Initialize on page load
window.addEventListener('load', () => gameInstance.init());
