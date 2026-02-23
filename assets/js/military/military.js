// Military recruitment and troop management module
import { UNIT_STATS } from '../core/constants.js';
import { log } from '../core/utils.js';
import { canRecruit } from '../core/validation.js';

export function getAvailableTroops(gameState) {
    const avail = { ...gameState.state.military };
    gameState.state.deployments.forEach(d => {
        for (let u in d.units) {
            if (avail[u]) avail[u] -= d.units[u];
        }
    });
    if (gameState.state.activeRun && gameState.state.activeRun.playerForces) {
        const committed = gameState.state.activeRun.playerForces.units;
        for (let u in committed) {
            if (avail[u]) avail[u] -= committed[u];
        }
    }
    return avail;
}

export function getArmyStats(gameState, availableOnly = false) {
    let basePower = 0;
    let totalCarry = 0;
    let speedMod = 1.0;
    let unitMultiplier = 1.0;
    let currentPop = 0;

    let counts = availableOnly ? getAvailableTroops(gameState) : gameState.state.military;

    for (const [unit, count] of Object.entries(counts)) {
        if (UNIT_STATS[unit]) {
            const stats = UNIT_STATS[unit];
            if (!stats.spy) {
                currentPop += count;
                basePower += count * stats.power;
                totalCarry += count * stats.carry;
                speedMod += count * stats.speed;
                if (stats.multiplier) {
                    for (let i = 0; i < count; i++) unitMultiplier *= stats.multiplier;
                }
            } else {
                currentPop += count;
            }
        }
    }

    const trainingBonus = 1 + (gameState.state.buildings.training_camp * 0.1); // buildingData value
    const survivalBonus = gameState.state.buildings.monastery * 0.05;
    let provisionCap = 150 + (gameState.state.buildings.soulcaster * 50);
    if (gameState.state.fabrials.heatrial > 0) {
        provisionCap *= (1 + (0.5 * gameState.state.fabrials.heatrial));
    }

    return {
        power: basePower * unitMultiplier * trainingBonus,
        carry: totalCarry,
        speed: Math.max(0.1, speedMod),
        pop: currentPop,
        cap: Math.floor(provisionCap),
        survivalBonus: survivalBonus
    };
}

export function getSpyPower(gameState) {
    let power = 0;
    if (gameState.state.military.noble) power += gameState.state.military.noble * 1; // UNIT_STATS.noble.spy
    if (gameState.state.military.spy) power += gameState.state.military.spy * 2;
    if (gameState.state.military.ghostblood) power += gameState.state.military.ghostblood * 5;
    return power;
}

export function recruit(gameState, type) {
    let amount = 1;
    if (['noble', 'spy', 'ghostblood'].includes(type)) {
        const spyInput = document.getElementById('recruit-amount-spy');
        if (spyInput) amount = Math.max(1, parseInt(spyInput.value) || 1);
    } else {
        const milInput = document.getElementById('recruit-amount');
        if (milInput) amount = Math.max(1, parseInt(milInput.value) || 1);
    }

    // Use validation framework (client-side feedback before server request)
    const validation = canRecruit(gameState, type, amount);
    if (!validation.valid) {
        log(validation.reason, "text-red-400");
        return;
    }

    // Deduct resources
    const resourceType = validation.totalCost ? 'spheres' : 'gemhearts';
    if (resourceType === 'gemhearts') {
        gameState.state.gemhearts -= validation.totalCost || validation.cost;
    } else {
        gameState.state.spheres -= validation.totalCost;
    }

    // Add units to military
    if (!gameState.state.military[type]) gameState.state.military[type] = 0;
    gameState.state.military[type] += amount;
    
    log(`Recruited ${amount} ${type}.`, "text-slate-300");
}

export function processCasualties(gameState, units, baseRate) {
    let report = [];
    let totalLost = 0;
    for (let u in units) {
        const count = units[u];
        let lost = 0;
        let effectiveRate = baseRate;
        if (u === 'shardbearers') effectiveRate = 0.005;
        if (u === 'bridgecrews') effectiveRate = 0.9;
        for (let i = 0; i < count; i++) {
            if (Math.random() < effectiveRate) lost++;
        }
        if (lost > 0) {
            gameState.state.military[u] = Math.max(0, gameState.state.military[u] - lost);
            totalLost += lost;
            report.push(`${lost} ${u}`);
            if (u === 'shardbearers') {
                log("A SHARDBEARER HAS FALLEN!", "text-red-600 font-bold bg-red-950 p-1 border border-red-500");
            }
        }
    }
    if (report.length > 0) {
        log(`Casualties: ${report.join(", ")}.`, "text-orange-500 text-xs");
    }
}
