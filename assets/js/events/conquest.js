// Conquest mission system - Players expand territory to build more
// Conquest missions are now integrated with the standard deployment system

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
 * Get conquest status info from active deployments
 */
export function getConquestStatus(game) {
    const conquest = game.state.deployments.find(d => d.type === 'conquest');
    if (!conquest) {
        return null;
    }
    
    const now = Date.now();
    const timeLeft = Math.max(0, conquest.returnTime - now);
    const totalTime = conquest.returnTime - Date.now() + timeLeft;
    const progress = Math.floor(((totalTime - timeLeft) / totalTime) * 100);
    
    return {
        active: true,
        progress,
        timeLeft,
        enemyPower: conquest.enemyPower,
        landReward: conquest.landReward
    };
}

/**
 * Check if player can start a conquest
 */
export function canStartConquest(game) {
    const hasActiveConquest = game.state.deployments.some(d => d.type === 'conquest');
    if (hasActiveConquest) return false;
    return game.state.spheres >= 200;
}

