// UI updates and rendering module
import { CONSTANTS, BUILDING_DATA, FABRIAL_DATA, NPC_PRINCES } from '../core/constants.js';
import { getArmyStats, getAvailableTroops, getSpyPower } from '../military/military.js';
import { getBuildingCost } from '../buildings/buildings.js';
import { formatTime } from '../core/utils.js';
import { updateModalStats, updateSpyNetwork, toggleTournamentCard, toggleBlackMarket } from './modal-manager.js';
import { generateThrillButtons } from '../arena/arena.js';

export function updateUI(gameState) {
    updateTimeUI(gameState);
    updateResourcesUI(gameState);
    updateMilitaryUI(gameState);
    updateBuildingsUI(gameState);
    updateFabrialsUI(gameState);
    updateArenaUI(gameState);
    updateDeploymentsUI(gameState);
    updateSpyPlanningUI(gameState);
    updateTabVisibility(gameState);
    updateModalsUI(gameState);
    updateEspionageUI(gameState);
}

function updateModalsUI(gameState) {
    // Update modal visibility and stats
    const spyNetworkOwned = gameState.state.buildings.spy_network > 0;
    updateSpyNetwork(spyNetworkOwned);

    const tournamentActive = gameState.state.tournamentActive;
    toggleTournamentCard(tournamentActive);

    const blackMarketUnlocked = gameState.state.buildings.spy_network > 0;
    toggleBlackMarket(blackMarketUnlocked);

    // Collect building counts
    const buildingCounts = {
        spy_network: gameState.state.buildings.spy_network,
        research_library: gameState.state.buildings.research_library,
        market: gameState.state.buildings.market,
        soulcaster: gameState.state.buildings.soulcaster,
        training_camp: gameState.state.buildings.training_camp,
        monastery: gameState.state.buildings.monastery
    };

    // Collect spy unit counts
    const unitCounts = {
        noble: gameState.state.military.noble || 0,
        spy: gameState.state.military.spy || 0,
        ghostblood: gameState.state.military.ghostblood || 0
    };

    // Update arena modal stats
    updateModalStats({
        arenaLevel: gameState.state.arena.level,
        arenaHP: `${gameState.state.arena.hp}/${gameState.state.arena.maxHp}`,
        arenaThrill: `${gameState.state.arena.thrill}/${gameState.state.arena.maxThrill}`,
        heatrialOwned: gameState.state.fabrials.heatrial,
        ledgerOwned: gameState.state.fabrials.ledger,
        gravityLiftOwned: gameState.state.fabrials.gravity_lift,
        regenPlateOwned: gameState.state.fabrials.regen_plate,
        thrillAmpOwned: gameState.state.fabrials.thrill_amp,
        halfShardOwned: gameState.state.fabrials.half_shard,
        buildingCounts: buildingCounts,
        unitCounts: unitCounts
    });
}

export function updateTimeUI(gameState) {
    const totalDays = gameState.state.dayCount ?? 0;
    const daysPerYear = CONSTANTS.DAYS_PER_YEAR;
    const years = Math.floor(totalDays / daysPerYear) + 1;
    const remainingDays = totalDays % daysPerYear;
    const months = Math.floor(remainingDays / CONSTANTS.DAYS_PER_MONTH) + 1;
    const days = (remainingDays % CONSTANTS.DAYS_PER_MONTH) + 1;

    document.getElementById('display-date').innerText = `Year ${years}, Month ${months}, Day ${days}`;

    const lastTick = gameState.state.lastTickTime || Date.now();
    const msNext = CONSTANTS.DAY_MS - ((Date.now() - lastTick) % CONSTANTS.DAY_MS);
    const timeStr = formatTime(msNext);
    const displayTime = document.getElementById('display-time');
    if (displayTime) displayTime.innerText = `Next Day: ${timeStr}`;

    const hubTime = document.getElementById('command-hub-time');
    if (hubTime) hubTime.innerText = `Next Day: ${timeStr}`;
}

export function updateResourcesUI(gameState) {
    const stats = getArmyStats(gameState, false);
    document.getElementById('res-spheres').innerText = Math.floor(gameState.state.spheres).toLocaleString();
    document.getElementById('res-gemhearts').innerText = gameState.state.gemhearts;
    document.getElementById('res-pop-current').innerText = stats.pop;
    document.getElementById('res-food-cap').innerText = stats.cap;
}

export function updateMilitaryUI(gameState) {
    const stats = getArmyStats(gameState, false);
    const availStats = getArmyStats(gameState, true);
    const availTroops = getAvailableTroops(gameState);
    const spyPower = getSpyPower(gameState);

    document.getElementById('stat-power').innerText = Math.floor(availStats.power);
    document.getElementById('stat-avail').innerText = availStats.pop;
    document.getElementById('stat-speed').innerText = Math.round((stats.speed - 1) * 100) + "%";
    document.getElementById('stat-agents').innerText = spyPower;

    for (const unit in gameState.state.military) {
        const el = document.getElementById('det-' + unit);
        if (el) {
            const tot = gameState.state.military[unit];
            const av = availTroops[unit];
            el.innerText = `${av}/${tot}`;
        }
    }

    const totalSpies = (gameState.state.military.noble || 0) + (gameState.state.military.spy || 0) + (gameState.state.military.ghostblood || 0);
    const spyEl = document.getElementById('det-spies-total');
    if (spyEl) spyEl.innerText = totalSpies;

    const chullEl = document.getElementById('det-chulls');
    if (chullEl) chullEl.innerText = gameState.state.military.chulls;
}

export function updateBuildingsUI(gameState) {
    for (const bld in gameState.state.buildings) {
        const el = document.getElementById('own-' + bld);
        if (el) el.innerText = gameState.state.buildings[bld];

        const btn = document.getElementById('btn-build-' + bld);
        if (btn) {
            const data = BUILDING_DATA[bld];
            const owned = gameState.state.buildings[bld];
            if (data.max && owned >= data.max) {
                btn.innerText = "MAX";
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                const cost = getBuildingCost(gameState, bld);
                btn.innerText = `${cost.toLocaleString()} S`;
                btn.disabled = gameState.state.spheres < cost;
                if (gameState.state.spheres < cost) btn.classList.add('opacity-50', 'cursor-not-allowed');
                else btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
}

export function updateFabrialsUI(gameState) {
    for (let fab in gameState.state.fabrials) {
        const btn = document.getElementById('btn-fab-' + fab);
        if (btn) {
            const cost = FABRIAL_DATA[fab].cost;
            btn.disabled = gameState.state.gemhearts < cost;

            const count = gameState.state.fabrials[fab] || 0;
            if (gameState.state.gemhearts < cost) btn.classList.add('opacity-50', 'cursor-not-allowed');
            else btn.classList.remove('opacity-50', 'cursor-not-allowed');

            const container = btn.parentElement;
            const descP = container.querySelector('div p:last-child');
            if (descP) {
                let baseDesc = "";
                if (fab === 'heatrial') baseDesc = "Increases Provision Cap by 1.5x (Stackable)";
                if (fab === 'ledger') baseDesc = "Increases Market Income by 1.5x (Stackable)";
                if (fab === 'gravity_lift') baseDesc = "Increases Army Speed by 2.0x (Stackable)";

                descP.innerText = `${baseDesc} | Owned: ${count}`;
            }
        }
    }
}

export function updateArenaUI(gameState) {
    document.getElementById('arena-level').innerText = gameState.state.arena.level;
    document.getElementById('arena-hp').innerText = `${gameState.state.arena.hp}/${gameState.state.arena.maxHp}`;
    document.getElementById('arena-thrill').innerText = `${gameState.state.arena.maxThrill || 10}`;

    if (gameState.state.activeDuel) {
        document.getElementById('combat-player-hp').innerText = `HP: ${gameState.state.activeDuel.playerHp}/${gameState.state.activeDuel.playerMaxHp}`;
        document.getElementById('combat-player-thrill').innerText = `Thrill: ${gameState.state.activeDuel.playerThrill}`;
        document.getElementById('combat-enemy-hp').innerText = `HP: ${gameState.state.activeDuel.enemyHp}/${gameState.state.activeDuel.enemyMaxHp}`;
        document.getElementById('combat-enemy-thrill').innerText = `Thrill: ${gameState.state.activeDuel.enemyThrill}`;

        document.getElementById('arena-lobby').classList.add('hidden');
        document.getElementById('arena-combat').classList.remove('hidden');

        // Generate dynamic thrill buttons
        generateThrillButtons(gameState.state.activeDuel.playerThrill);

        const log = document.getElementById('combat-log');
        log.innerHTML = gameState.state.activeDuel.log.map(l => `<p>${l}</p>`).join('');
        log.scrollTop = log.scrollHeight;
        
        // Show/hide fabrial actions based on ownership
        const fabrialsContainer = document.getElementById('fabrial-actions-container');
        const hasArenaFabrials = (gameState.state.fabrials.thrill_amp || 0) > 0 || 
                                 (gameState.state.fabrials.half_shard || 0) > 0;
        if (fabrialsContainer) {
            fabrialsContainer.style.display = hasArenaFabrials ? 'block' : 'none';
        }
    } else {
        document.getElementById('arena-lobby').classList.remove('hidden');
        document.getElementById('arena-combat').classList.add('hidden');
    }

    if (gameState.state.tournamentActive) {
        document.getElementById('tournament-active').classList.remove('hidden');
        const lobby = document.getElementById('arena-lobby');
        if (lobby) lobby.classList.add('opacity-50');
    } else {
        document.getElementById('tournament-active').classList.add('hidden');
        const lobby = document.getElementById('arena-lobby');
        if (lobby) lobby.classList.remove('opacity-50');
    }
}

export function updateDeploymentsUI(gameState) {
    const depList = document.getElementById('active-deployments');
    depList.innerHTML = '';
    if (gameState.state.deployments.length === 0) {
        depList.innerHTML = '<p class="text-xs text-slate-500 italic text-center">No active missions.</p>';
    } else {
        gameState.state.deployments.forEach(d => {
            const timeLeft = Math.max(0, (d.returnTime - Date.now()) / 1000).toFixed(0);
            const hrs = Math.floor(timeLeft / 3600);
            const mins = Math.floor((timeLeft % 3600) / 60);
            const secs = Math.floor(timeLeft % 60);

            let timeStr = `${secs}s`;
            if (hrs > 0) timeStr = `${hrs}h ${mins}m`;
            else if (mins > 0) timeStr = `${mins}m ${secs}s`;

            const unitCount = d.units ? Object.values(d.units).reduce((a, b) => a + b, 0) : (d.myAgents || 0);
            const typeLabel = d.type === 'espionage' ? 'ESPIONAGE' : d.type;
            let detailLine = `Returns: ${timeStr}`;
            if (d.type === 'espionage') {
                const action = d.actionLabel || d.action || 'Mission';
                const targetName = d.targetName || NPC_PRINCES[d.targetKey]?.name || d.targetKey || 'Unknown';
                detailLine = `${action} • ${targetName} • ${timeStr}`;
            }

            const div = document.createElement('div');
            div.className = "bg-blue-900/30 border border-blue-800 p-2 rounded flex justify-between items-center text-[10px]";
            div.innerHTML = `<div><span class="font-bold text-cyan-300 uppercase">${typeLabel}</span><span class="text-slate-400 block">${detailLine}</span></div><div class="text-right"><span class="block">${d.type === 'espionage' ? 'Agents' : 'Units'}: ${unitCount}</span></div>`;
            depList.appendChild(div);
        });
    }
}

export function updateSpyPlanningUI(gameState) {
    const modal = document.getElementById('spy-planning-modal');
    if (!modal) return;

    const emptyEl = document.getElementById('spy-planning-empty');
    const activeEl = document.getElementById('spy-planning-active');
    const targetEl = document.getElementById('spy-planning-target');
    const actionEl = document.getElementById('spy-planning-action');
    const agentsEl = document.getElementById('spy-planning-agents');
    const countdownEl = document.getElementById('spy-planning-countdown');
    const returnEl = document.getElementById('spy-planning-return');

    const activeMissions = gameState.state.deployments.filter(d => d.type === 'espionage');
    if (activeMissions.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (activeEl) activeEl.classList.add('hidden');
        return;
    }

    const active = activeMissions.sort((a, b) => a.returnTime - b.returnTime)[0];
    const timeLeftMs = Math.max(0, active.returnTime - Date.now());
    const timeStr = formatTime(timeLeftMs);
    const targetName = active.targetName || NPC_PRINCES[active.targetKey]?.name || active.targetKey || 'Unknown';

    if (emptyEl) emptyEl.classList.add('hidden');
    if (activeEl) activeEl.classList.remove('hidden');
    if (targetEl) targetEl.textContent = targetName;
    if (actionEl) actionEl.textContent = active.actionLabel || active.action || 'Mission';
    if (agentsEl) agentsEl.textContent = active.myAgents || 0;
    if (countdownEl) countdownEl.textContent = timeStr;
    if (returnEl) returnEl.textContent = new Date(active.returnTime).toLocaleTimeString();
}

export function updateTabVisibility(gameState) {
    if (gameState.state.military.shardbearers > 0) {
        document.getElementById('tab-arena').classList.remove('hidden');
    } else {
        document.getElementById('tab-arena').classList.add('hidden');
    }

    if (gameState.state.buildings.market >= 30) {
        document.getElementById('black-market-option').classList.remove('hidden');
    } else {
        document.getElementById('black-market-option').classList.add('hidden');
    }

    if (gameState.state.buildings.spy_network > 0) {
        document.getElementById('tab-spy').classList.remove('hidden');
        document.getElementById('spy-recruit-locked').classList.add('hidden');
        document.getElementById('spy-recruit-unlocked').classList.remove('hidden');
    } else {
        document.getElementById('tab-spy').classList.add('hidden');
        document.getElementById('spy-recruit-locked').classList.remove('hidden');
        document.getElementById('spy-recruit-unlocked').classList.add('hidden');
    }

    if (gameState.state.buildings.research_library > 0) {
        document.getElementById('tab-fabrial').classList.remove('hidden');
    } else {
        document.getElementById('tab-fabrial').classList.add('hidden');
    }
}

export function updateEspionageUI(gameState) {
    const targetSelect = document.getElementById('spy-target-modal') || document.getElementById('spy-target');
    const displayEl = document.getElementById('espionage-suspicion-display');
    
    if (!targetSelect || !displayEl) return;
    
    const targetKey = targetSelect.value;
    const rival = gameState.state.rivals[targetKey];
    
    if (rival) {
        const daysSinceSpy = rival.daysSinceLastSpy ?? 0;
        displayEl.textContent = `Suspicion: ${rival.suspicion}/100 (${rival.suspicionLevel}) | Counter Intel: ${rival.counterIntel} | Days Since Spy: ${daysSinceSpy}`;
    } else {
        displayEl.textContent = `Suspicion: 0/100 (unknown) | Counter Intel: 0 | Days Since Spy: 0`;
    }
}

export function setTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('panel-build').classList.add('hidden');
    document.getElementById('panel-military').classList.add('hidden');
    document.getElementById('panel-spy').classList.add('hidden');
    document.getElementById('panel-fabrial').classList.add('hidden');
    document.getElementById('panel-arena').classList.add('hidden');
    document.getElementById('panel-' + tab).classList.remove('hidden');
}

// Spanreed Center - Reports & Messages
export function addReport(gameState, type, message, data = {}) {
    const report = {
        type, // 'espionage', 'battle', 'growth', 'scout', 'attack', 'plateau'
        message,
        data,
        timestamp: Date.now()
    };
    gameState.state.reports.unshift(report); // Add to beginning
    
    // Keep only last 50 reports
    if (gameState.state.reports.length > 50) {
        gameState.state.reports = gameState.state.reports.slice(0, 50);
    }
    
    updateReportsList(gameState);
}

export function updateReportsList(gameState) {
    const list = document.getElementById('reports-list');
    if (!list) return;
    
    if (gameState.state.reports.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm italic text-center py-8">No reports yet. Activity in espionage, battles, and daily growth will appear here.</p>';
        return;
    }
    
    const typeColors = {
        espionage: 'purple',
        battle: 'orange',
        scout: 'cyan',
        attack: 'orange',
        plateau: 'green',
        growth: 'blue',
        defense: 'red'
    };
    
    list.innerHTML = gameState.state.reports.map((report, index) => {
        const color = typeColors[report.type] || 'slate';
        const time = new Date(report.timestamp).toLocaleTimeString();
        const detailsId = `report-details-${index}`;
        
        // Generate detailed information HTML based on report type
        let detailsHTML = '';
        
        if (report.type === 'espionage' && report.data) {
            detailsHTML = `
                <div class="mt-2 pt-2 border-t border-${color}-500/20 space-y-1 text-xs">
                    <div><span class="text-slate-400">Target:</span> <span class="text-${color}-300">${report.data.target || 'Unknown'}</span></div>
                    <div><span class="text-slate-400">Result:</span> <span class="text-${report.data.success ? 'green' : 'red'}-400">${report.data.success ? 'SUCCESS' : 'FAILURE'}</span></div>
                    ${report.data.intel ? `<div><span class="text-slate-400">Intel:</span> <span class="text-slate-300">${report.data.intel}</span></div>` : ''}
                    ${report.data.gainInfo ? `<div><span class="text-slate-400">Gained:</span> <span class="text-cyan-300">${report.data.gainInfo}</span></div>` : ''}
                    ${report.data.capturedAgent ? `<div><span class="text-slate-400">Lost:</span> <span class="text-red-400">1 ${report.data.capturedAgent}</span></div>` : ''}
                </div>
            `;
        } else if ((report.type === 'scout' || report.type === 'attack') && report.data) {
            detailsHTML = `
                <div class="mt-2 pt-2 border-t border-${color}-500/20 space-y-1 text-xs">
                    <div><span class="text-slate-400">Result:</span> <span class="text-${report.data.success ? 'green' : 'red'}-400">${report.data.success ? 'SUCCESS' : 'FAILURE'}</span></div>
                    <div><span class="text-slate-400">Spheres:</span> <span class="text-yellow-300">+${report.data.spheres?.toLocaleString() || 0}</span></div>
                    <div><span class="text-slate-400">Casualties:</span> <span class="text-orange-400">${report.data.casualties || 0}</span></div>
                    ${report.data.gotGemheart ? `<div><span class="text-purple-400 font-bold">💎 GEMHEART CAPTURED!</span></div>` : ''}
                </div>
            `;
        } else if (report.type === 'plateau' && report.data) {
            detailsHTML = `
                <div class="mt-2 pt-2 border-t border-${color}-500/20 space-y-1 text-xs">
                    <div><span class="text-slate-400">Result:</span> <span class="text-${report.data.victory ? 'green' : 'red'}-400">${report.data.victory ? 'VICTORY' : 'DEFEAT'}</span></div>
                    <div><span class="text-slate-400">Loot Share:</span> <span class="text-yellow-300">+${report.data.spheres?.toLocaleString() || 0}</span></div>
                    <div><span class="text-slate-400">Casualties:</span> <span class="text-orange-400">${report.data.casualties || 0}</span></div>
                    ${report.data.playerGotGem ? `<div><span class="text-purple-400 font-bold">💎 GEMHEART SECURED!</span></div>` : ''}
                    ${report.data.gemheartWinnerName ? `<div><span class="text-slate-400">Gemheart Winner:</span> <span class="text-slate-300">${report.data.gemheartWinnerName}</span></div>` : ''}
                </div>
            `;
        } else if (report.type === 'growth' && report.data) {
            const missionsTotal = report.data.missionsTotal || 0;
            let missionsHTML = '';
            if (missionsTotal > 0 && report.data.missions) {
                const rows = Object.entries(report.data.missions)
                    .map(([type, count]) => `<div><span class="text-slate-400">${type.toUpperCase()}:</span> <span class="text-emerald-300">${count}</span></div>`)
                    .join('');
                missionsHTML = `
                    <div class="mt-2 pt-2 border-t border-${color}-500/20 space-y-1 text-xs">
                        <div><span class="text-slate-400">Missions Completed:</span> <span class="text-emerald-300">${missionsTotal}</span></div>
                        ${rows}
                    </div>
                `;
            }
            detailsHTML = `
                <div class="mt-2 pt-2 border-t border-${color}-500/20 space-y-1 text-xs">
                    <div><span class="text-slate-400">Total Income:</span> <span class="text-yellow-300">+${report.data.spheres?.toLocaleString() || 0} spheres</span></div>
                    <div><span class="text-slate-400">From Gemhearts:</span> <span class="text-cyan-300">+${report.data.fromGems?.toLocaleString() || 0}</span></div>
                    <div><span class="text-slate-400">From Markets:</span> <span class="text-blue-300">+${report.data.fromMarkets?.toLocaleString() || 0}</span></div>
                </div>
                ${missionsHTML}
            `;
        } else if (report.type === 'defense' && report.data) {
            detailsHTML = `
                <div class="mt-2 pt-2 border-t border-${color}-500/20 space-y-1 text-xs">
                    <div><span class="text-slate-400">Result:</span> <span class="text-${report.data.success ? 'green' : 'orange'}-400">${report.data.success ? 'REPELLED' : 'BREACHED'}</span></div>
                    <div><span class="text-slate-400">Enemy Power:</span> <span class="text-red-300">${report.data.attackPower || 0}</span></div>
                </div>
            `;
        }
        
        return `
            <div class="bg-slate-900/50 border border-${color}-500/30 rounded p-3 cursor-pointer hover:bg-slate-800/50 transition-colors" onclick="game.toggleReportDetails('${detailsId}')">
                <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                        <span id="${detailsId}-arrow" class="text-${color}-400 text-xs">▶</span>
                        <span class="text-${color}-400 text-xs font-bold uppercase">${report.type}</span>
                    </div>
                    <span class="text-slate-500 text-[10px]">${time}</span>
                </div>
                <p class="text-slate-300 text-sm ml-5">${report.message}</p>
                <div id="${detailsId}" class="hidden ml-5">
                    ${detailsHTML}
                </div>
            </div>
        `;
    }).join('');
}

export function toggleReportDetails(detailsId) {
    const detailsEl = document.getElementById(detailsId);
    const arrowEl = document.getElementById(`${detailsId}-arrow`);
    
    if (!detailsEl || !arrowEl) return;
    
    const isHidden = detailsEl.classList.contains('hidden');
    
    if (isHidden) {
        detailsEl.classList.remove('hidden');
        arrowEl.textContent = '▼';
    } else {
        detailsEl.classList.add('hidden');
        arrowEl.textContent = '▶';
    }
}

export function sendSpanreedMessage(gameState) {
    const input = document.getElementById('message-input');
    const recipientSelect = document.getElementById('message-recipient');
    
    if (!input || !recipientSelect || !input.value.trim()) return;
    
    const message = {
        from: 'You',
        to: recipientSelect.options[recipientSelect.selectedIndex].text,
        text: input.value.trim(),
        timestamp: Date.now()
    };
    
    gameState.state.messages.unshift(message);
    
    // Keep only last 50 messages
    if (gameState.state.messages.length > 50) {
        gameState.state.messages = gameState.state.messages.slice(0, 50);
    }
    
    input.value = '';
    updateMessagesList(gameState);
}

export function updateMessagesList(gameState) {
    const list = document.getElementById('messages-list');
    if (!list) return;
    
    if (gameState.state.messages.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm italic text-center py-8">No messages yet. Send a spanreed to another Highprince.</p>';
        return;
    }
    
    list.innerHTML = gameState.state.messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        return `
            <div class="bg-slate-900/50 border border-cyan-500/30 rounded p-3">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-cyan-400 text-xs font-bold">${msg.from} → ${msg.to}</span>
                    <span class="text-slate-500 text-[10px]">${time}</span>
                </div>
                <p class="text-slate-300 text-sm">${msg.text}</p>
            </div>
        `;
    }).join('');}