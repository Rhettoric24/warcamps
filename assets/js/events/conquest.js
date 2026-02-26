// Conquest mission system - Players expand territory to build more

import { getArmyStats, getAvailableTroops } from '../military/military.js';
import { log } from '../core/utils.js';
import { addReport } from '../ui/ui-manager.js';
import { CONSTANTS } from '../core/constants.js';

/**
 * Calculate enemy force power based on current max land
 * Formula: 80 + (maxLand - 50) * 2.5
 * At 50 land: 80 power
 * At 100 land: 205 power
 * At 150 land: 330 power
 */
export function calculateEnemyPower(maxLand) {
    return Math.floor(80 + (maxLand - 50) * 2.5);
}

/**
 * Calculate land reward based on victory margin
 * Base: 10 land
 * Bonus: +1 land per 10 power of victory margin
 * Capped at max 25 land total
 */
export function calculateLandReward(playerPower, enemyPower) {
    if (playerPower <= enemyPower) {
        return 0; // No land on defeat
    }
    
    const margin = playerPower - enemyPower;
    const bonus = Math.floor(margin / 10);
    const totalLand = Math.min(10 + bonus, 25);
    
    return totalLand;
}

/**
 * Start a conquest mission
 */
export function startConquest(game) {
    // Check if enough resources
    if (game.state.spheres < 200) {
        log("Conquest requires 200 spheres.", "text-red-400");
        return false;
    }
    
    // Check if already a conquest running
    if (game.state.conquest.active) {
        log("A conquest is already in progress.", "text-orange-400");
        return false;
    }
    
    // Deduct resources
    game.state.spheres -= 200;
    
    // Calculate enemy power and land reward
    const enemyPower = calculateEnemyPower(game.state.maxLand);
    const stats = getArmyStats(game, true);
    const playerPower = Math.floor(stats.power);
    const landReward = calculateLandReward(playerPower, enemyPower);
    
    // Start conquest
    game.state.conquest.active = true;
    game.state.conquest.startTime = Date.now();
    game.state.conquest.endTime = Date.now() + CONSTANTS.DAY_MS;
    game.state.conquest.enemyPower = enemyPower;
    game.state.conquest.landReward = landReward;
    
    // Deploy army (make unavailable)
    game.state.deployments.push({
        type: 'conquest',
        startTime: game.state.conquest.startTime,
        endTime: game.state.conquest.endTime,
        troops: { ...game.state.military }
    });
    
    log(`Conquest started! Enemy force: ${enemyPower} power. Returning in 1 day.`, "text-cyan-400 font-bold");
    
    if (landReward > 0) {
        const winChance = ((playerPower / (playerPower + enemyPower)) * 100).toFixed(0);
        addReport(game, 'conquest', `Conquest deployed vs ${enemyPower} power enemy. Win chance: ~${winChance}%. Potential reward: ${landReward} land.`, {
            playerPower,
            enemyPower,
            landReward,
            winChance
        });
    } else {
        addReport(game, 'conquest', `Conquest deployed vs ${enemyPower} power enemy. Your force is too weak to claim land.`, {
            playerPower,
            enemyPower,
            landReward: 0
        });
    }
    
    return true;
}

/**
 * Resolve conquest mission - called when deployment ends
 */
export function resolveConquest(game) {
    if (!game.state.conquest.active) return;
    
    const stats = getArmyStats(game, true);
    const playerPower = Math.floor(stats.power);
    const enemyPower = game.state.conquest.enemyPower;
    const landReward = game.state.conquest.landReward;
    
    // Determine victory/defeat
    const victoryChance = playerPower / (playerPower + enemyPower);
    const victory = Math.random() < victoryChance;
    
    // Find and remove conquest deployment
    const deployIdx = game.state.deployments.findIndex(d => d.type === 'conquest');
    if (deployIdx >= 0) {
        game.state.deployments.splice(deployIdx, 1);
    }
    
    // Calculate casualties
    let casualtyRate;
    let casualtyRatePercent;
    if (victory) {
        casualtyRate = 0.08 + (Math.random() * 0.07); // 8-15%
        casualtyRatePercent = Math.floor(casualtyRate * 100);
    } else {
        casualtyRate = 0.25 + (Math.random() * 0.10); // 25-35%
        casualtyRatePercent = Math.floor(casualtyRate * 100);
    }
    
    // Apply casualties
    const unitTypes = ['bridgecrews', 'spearmen', 'archers', 'chulls', 'shardbearers'];
    const totalUnits = unitTypes.reduce((sum, type) => sum + (game.state.military[type] || 0), 0);
    const casualtiesNeeded = Math.ceil(totalUnits * casualtyRate);
    let casualtiesApplied = 0;
    
    for (const unit of unitTypes) {
        if (casualtiesApplied >= casualtiesNeeded) break;
        const current = game.state.military[unit] || 0;
        const toKill = Math.min(current, casualtiesNeeded - casualtiesApplied);
        game.state.military[unit] = current - toKill;
        casualtiesApplied += toKill;
    }
    
    // Process result
    if (victory) {
        game.state.maxLand += landReward;
        
        log(`Conquest Victory! Conquered ${landReward} land (${casualtyRatePercent}% casualties). Max land: ${game.state.maxLand}`, "text-green-400 font-bold");
        addReport(game, 'conquest', `Conquest Victory! Defeated ${enemyPower} power enemy and conquered ${landReward} land. Casualties: ${casualtyRatePercent}%.`, {
            victory: true,
            playerPower,
            enemyPower,
            landGained: landReward,
            casualties: casualtiesApplied,
            casualtyPercent: casualtyRatePercent,
            maxLand: game.state.maxLand
        });
    } else {
        log(`Conquest Defeat! No land gained (${casualtyRatePercent}% casualties).`, "text-orange-400 font-bold");
        addReport(game, 'conquest', `Conquest Defeat! Enemy force was too strong. Casualties: ${casualtyRatePercent}%.`, {
            victory: false,
            playerPower,
            enemyPower,
            landGained: 0,
            casualties: casualtiesApplied,
            casualtyPercent: casualtyRatePercent,
            maxLand: game.state.maxLand
        });
    }
    
    // Reset conquest state
    game.state.conquest.active = false;
    game.state.conquest.startTime = null;
    game.state.conquest.endTime = null;
    game.state.conquest.enemyPower = 0;
    game.state.conquest.landReward = 0;
}

/**
 * Get conquest status info
 */
export function getConquestStatus(game) {
    if (!game.state.conquest.active) {
        return null;
    }
    
    const now = Date.now();
    const timeLeft = Math.max(0, game.state.conquest.endTime - now);
    const totalTime = game.state.conquest.endTime - game.state.conquest.startTime;
    const progress = Math.floor(((totalTime - timeLeft) / totalTime) * 100);
    
    return {
        active: true,
        progress,
        timeLeft,
        enemyPower: game.state.conquest.enemyPower,
        landReward: game.state.conquest.landReward
    };
}

/**
 * Check if player can start a conquest
 */
export function canStartConquest(game) {
    if (game.state.conquest.active) return false;
    return game.state.spheres >= 200;
}
