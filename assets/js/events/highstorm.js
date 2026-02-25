// Highstorm event system - devastating weather events
import { BUILDING_DATA, CONSTANTS } from '../core/constants.js';
import { log, triggerNotification } from '../core/utils.js';
import { getBuildingCost } from '../buildings/buildings.js';
import { processCasualties } from '../military/military.js';
import { addReport } from '../ui/ui-manager.js';

// Track timeout for UI effects so we can clear it if needed
let stormOverlayTimeout = null;

/**
 * Check if a highstorm should occur and trigger it
 * @param {Object} gameState - Current game state
 */
export function checkHighstorm(gameState) {
    const storm = gameState.state.highstorm;
    
    // If no storm tracking exists, initialize it
    if (!storm) {
        gameState.state.highstorm = {
            lastStormDay: -10,
            daysSinceStorm: 10,
            nextStormProbability: 0
        };
        return;
    }
    
    storm.daysSinceStorm++;
    
    // Calculate highstorm probability
    if (storm.daysSinceStorm <= 3) {
        storm.nextStormProbability = 0; // Cannot happen 3 days after previous storm
    } else {
        // Increasing probability: 5% at day 4, then +5% each day
        storm.nextStormProbability = Math.min(0.5, (storm.daysSinceStorm - 3) * 0.05);
    }
    
    // Roll for highstorm
    if (Math.random() < storm.nextStormProbability) {
        triggerHighstorm(gameState);
    }
}

/**
 * Trigger a highstorm event with all effects
 * @param {Object} gameState - Current game state
 */
export function triggerHighstorm(gameState) {
    log("⚡ HIGHSTORM APPROACHING! ⚡", "text-cyan-300 font-bold text-lg bg-cyan-950 p-2 border border-cyan-500");
    triggerNotification("Highstorm", "A devastating highstorm strikes the Shattered Plains!");
    
    // Show visual storm effects
    showStormOverlay();
    
    // Update storm tracking
    gameState.state.highstorm.lastStormDay = gameState.state.dayCount;
    gameState.state.highstorm.daysSinceStorm = 0;
    gameState.state.highstorm.nextStormProbability = 0;
    gameState.state.highstorm.active = true;
    gameState.state.highstorm.effectsEndDay = gameState.state.dayCount + 2; // Effects last 2 days
    
    let stormReport = [];
    
    // EFFECT 1: Army Devastation
    const armyDamage = processArmyDamage(gameState);
    if (armyDamage.casualties > 0) {
        stormReport.push(`Lost ${armyDamage.casualties} troops in deployed forces`);
    }
    
    // EFFECT 2: Building Damage
    const buildingDamage = processBuildingDamage(gameState);
    if (buildingDamage.damagedCount > 0) {
        stormReport.push(`${buildingDamage.damagedCount} buildings damaged`);
    }
    
    // EFFECT 3: Fabrial Overcharge
    const fabrialEffects = processFabrialOvercharge(gameState);
    if (fabrialEffects.effects.length > 0) {
        stormReport.push(...fabrialEffects.effects);
    }
    
    // EFFECT 4: Rival Lord Chaos - All players get -20% power for 2 days
    stormReport.push("All warcamps weakened (-20% power for 2 days)");
    
    // EFFECT 5: Spy opportunities
    gameState.state.highstorm.spyBonusActive = true;
    gameState.state.highstorm.spyBonusEndDay = gameState.state.dayCount + 1; // 24 hours
    stormReport.push("Spy operations more effective (2x success for 1 day)");
    
    // EFFECT 6: Black market discount
    gameState.state.highstorm.blackMarketDiscount = true;
    gameState.state.highstorm.blackMarketEndDay = gameState.state.dayCount + 2; // 48 hours
    stormReport.push("Black market gemhearts discounted (7,500 S for 2 days)");
    
    // EFFECT 7: Postpone tournament if active
    if (gameState.state.tournamentActive) {
        gameState.state.tournamentActive = false;
        gameState.state.highstorm.tournamentPostponed = true;
        stormReport.push("Tournament postponed by 3 days");
    }
    
    // Log all effects
    log("Highstorm effects: " + stormReport.join("; "), "text-cyan-400 text-xs");
    addReport(gameState, 'storm', `Highstorm struck! ${stormReport.join("; ")}`, { 
        type: 'highstorm',
        effects: stormReport 
    });
}

/**
 * Process army casualties from highstorm
 * @param {Object} gameState - Current game state
 * @returns {Object} Summary of casualties
 */
function processArmyDamage(gameState) {
    let totalCasualties = 0;
    
    // Check all deployments
    gameState.state.deployments.forEach(deployment => {
        const units = deployment.units;
        
        // Calculate chull protection
        const chullCount = units.chulls || 0;
        const totalUnits = Object.values(units).reduce((sum, count) => sum + count, 0);
        const chullProtection = Math.min(0.5, chullCount * 0.05); // 5% reduction per chull, max 50%
        
        // Base casualty rate: 20-30% depending on deployment type
        let baseCasualtyRate = deployment.type === 'attack' ? 0.25 : 0.20;
        baseCasualtyRate *= (1 - chullProtection);
        
        // Process casualties
        const casualties = countCasualties(gameState, units, baseCasualtyRate);
        totalCasualties += casualties;
        
        log(`Deployment took ${casualties} casualties from highstorm (${Math.round(chullProtection * 100)}% protected by chulls).`, "text-orange-400 text-xs");
    });
    
    // Check active plateau run
    if (gameState.state.activeRun && gameState.state.activeRun.playerForces) {
        const units = gameState.state.activeRun.playerForces.units;
        
        // Plateau runs are hit hardest (40% base rate)
        const chullCount = units.chulls || 0;
        const chullProtection = Math.min(0.5, chullCount * 0.05);
        let baseCasualtyRate = 0.40 * (1 - chullProtection);
        
        const casualties = countCasualties(gameState, units, baseCasualtyRate);
        totalCasualties += casualties;
        
        log(`Plateau run forces devastated: ${casualties} casualties from highstorm!`, "text-red-400 text-xs");
    }
    
    return { casualties: totalCasualties };
}

/**
 * Count and process casualties for a unit group
 */
function countCasualties(gameState, units, baseRate) {
    let count = 0;
    for (let unitType in units) {
        const unitCount = units[unitType];
        let lost = 0;
        
        let effectiveRate = baseRate;
        if (unitType === 'shardbearers') effectiveRate = 0.01; // Shardbearers very resistant
        if (unitType === 'bridgecrews') effectiveRate = Math.min(0.9, baseRate * 3); // Bridgecrews vulnerable
        
        for (let i = 0; i < unitCount; i++) {
            if (Math.random() < effectiveRate) lost++;
        }
        
        if (lost > 0) {
            gameState.state.military[unitType] = Math.max(0, gameState.state.military[unitType] - lost);
            count += lost;
            
            if (unitType === 'shardbearers') {
                log("⚠️ A SHARDBEARER LOST IN THE STORM! ⚠️", "text-red-600 font-bold bg-red-950 p-1 border border-red-500");
            }
        }
    }
    return count;
}

/**
 * Damage random buildings
 * @param {Object} gameState - Current game state
 * @returns {Object} Summary of damage
 */
function processBuildingDamage(gameState) {
    // Initialize damaged buildings tracking if needed
    if (!gameState.state.damagedBuildings) {
        gameState.state.damagedBuildings = {};
    }
    
    // Get list of buildings player owns
    const ownedBuildings = [];
    for (let building in gameState.state.buildings) {
        const count = gameState.state.buildings[building];
        if (count > 0 && building !== 'whisper_tower') { // Whisper tower can't be damaged
            ownedBuildings.push(building);
        }
    }
    
    if (ownedBuildings.length === 0) {
        return { damagedCount: 0 };
    }
    
    // Calculate protection
    const shelterCount = gameState.state.buildings.shelter || 0;
    const gravityRigCount = gameState.state.fabrials.gravity_lift || 0;
    const protectedBuildings = shelterCount + (gravityRigCount * 2);
    
    // Damage 2-3 random buildings, minus protection
    const targetDamage = Math.floor(Math.random() * 2) + 2; // 2-3 buildings
    const actualDamage = Math.max(0, targetDamage - protectedBuildings);
    
    if (actualDamage === 0) {
        log("Your shelters and gravity rigs protected all buildings from storm damage!", "text-green-400 text-xs");
        return { damagedCount: 0 };
    }
    
    // Damage random buildings
    const shuffled = ownedBuildings.sort(() => Math.random() - 0.5);
    const toBeDamaged = shuffled.slice(0, actualDamage);
    
    toBeDamaged.forEach(building => {
        gameState.state.damagedBuildings[building] = true;
        const buildingName = building.replace(/_/g, ' ');
        log(`${buildingName} damaged by highstorm!`, "text-orange-400 text-xs");
    });
    
    if (protectedBuildings > 0) {
        log(`${protectedBuildings} buildings protected from storm damage.`, "text-green-400 text-xs");
    }
    
    return { damagedCount: actualDamage };
}

/**
 * Process fabrial overcharge effects
 * @param {Object} gameState - Current game state
 * @returns {Object} Summary of effects
 */
function processFabrialOvercharge(gameState) {
    const effects = [];
    
    // Only affect Gravity Rigs and Arena Fabrials
    const gravityRigs = gameState.state.fabrials.gravity_lift || 0;
    const arenaFabrials = (gameState.state.fabrials.regen_plate || 0) + 
                          (gameState.state.fabrials.thrill_amp || 0) + 
                          (gameState.state.fabrials.half_shard || 0);
    
    // Gravity Rig Overcharge (60% positive, 40% negative)
    if (gravityRigs > 0) {
        if (Math.random() < 0.6) {
            // Positive: 3x speed boost for 3 days
            gameState.state.highstorm.gravityBoostActive = true;
            gameState.state.highstorm.gravityBoostEndDay = gameState.state.dayCount + 3;
            effects.push("Gravity Rigs overcharged (+3x speed for 3 days)");
            log("⚡ Gravity Rigs overcharged by storm energy! +3x speed for next deployment.", "text-purple-400 font-bold");
        } else {
            // Negative: Burnout for 3 days
            gameState.state.highstorm.gravityBurnout = true;
            gameState.state.highstorm.gravityBurnoutEndDay = gameState.state.dayCount + 3;
            effects.push("Gravity Rigs burned out (disabled for 3 days)");
            log("⚠️ Gravity Rigs overloaded and burned out! Disabled for 3 days.", "text-red-400");
        }
    }
    
    // Arena Fabrial Overcharge (60% positive, 40% negative)
    if (arenaFabrials > 0) {
        if (Math.random() < 0.6) {
            // Positive: Double activations for 3 days
            gameState.state.highstorm.arenaBoostActive = true;
            gameState.state.highstorm.arenaBoostEndDay = gameState.state.dayCount + 3;
            effects.push("Arena fabrials supercharged (2 uses/day for 3 days)");
            log("⚡ Arena fabrials supercharged! Can use twice per day for 3 days.", "text-purple-400 font-bold");
        } else {
            // Negative: One random arena fabrial burns out
            const burnoutOptions = [];
            if (gameState.state.fabrials.regen_plate > 0) burnoutOptions.push('regen_plate');
            if (gameState.state.fabrials.thrill_amp > 0) burnoutOptions.push('thrill_amp');
            if (gameState.state.fabrials.half_shard > 0) burnoutOptions.push('half_shard');
            
            if (burnoutOptions.length > 0) {
                const burnedFabrial = burnoutOptions[Math.floor(Math.random() * burnoutOptions.length)];
                if (!gameState.state.highstorm.burnedFabrials) {
                    gameState.state.highstorm.burnedFabrials = {};
                }
                gameState.state.highstorm.burnedFabrials[burnedFabrial] = gameState.state.dayCount + 3;
                
                const fabrialNames = {
                    regen_plate: 'Regeneration Plate',
                    thrill_amp: 'Thrill Amplifier',
                    half_shard: 'Half-Shard'
                };
                effects.push(`${fabrialNames[burnedFabrial]} burned out (3 days)`);
                log(`⚠️ ${fabrialNames[burnedFabrial]} overloaded! Disabled for 3 days.`, "text-red-400");
            }
        }
    }
    
    return { effects };
}

/**
 * Update highstorm effects each day
 * @param {Object} gameState - Current game state
 */
export function updateHighstormEffects(gameState) {
    const storm = gameState.state.highstorm;
    if (!storm) return;
    
    const currentDay = gameState.state.dayCount;
    
    // Clear main storm effects
    if (storm.effectsEndDay && currentDay >= storm.effectsEndDay) {
        storm.active = false;
        hideStormOverlay();
        log("☀️ The highstorm has passed. Skies clear...", "text-cyan-400 text-xs");
    }
    
    // Clear spy bonus
    if (storm.spyBonusEndDay && currentDay >= storm.spyBonusEndDay) {
        storm.spyBonusActive = false;
        log("Storm chaos subsiding - spy operations return to normal.", "text-slate-400 text-xs");
    }
    
    // Clear black market discount
    if (storm.blackMarketEndDay && currentDay >= storm.blackMarketEndDay) {
        storm.blackMarketDiscount = false;
        log("Black market prices return to normal.", "text-slate-400 text-xs");
    }
    
    // Clear gravity boost
    if (storm.gravityBoostEndDay && currentDay >= storm.gravityBoostEndDay) {
        storm.gravityBoostActive = false;
        log("Gravity Rig overcharge dissipated.", "text-slate-400 text-xs");
    }
    
    // Clear gravity burnout
    if (storm.gravityBurnoutEndDay && currentDay >= storm.gravityBurnoutEndDay) {
        storm.gravityBurnout = false;
        log("Gravity Rigs repaired and operational.", "text-green-400 text-xs");
    }
    
    // Clear arena boost
    if (storm.arenaBoostEndDay && currentDay >= storm.arenaBoostEndDay) {
        storm.arenaBoostActive = false;
        log("Arena fabrial overcharge faded.", "text-slate-400 text-xs");
    }
    
    // Clear burned fabrials
    if (storm.burnedFabrials) {
        for (let fabrial in storm.burnedFabrials) {
            if (currentDay >= storm.burnedFabrials[fabrial]) {
                delete storm.burnedFabrials[fabrial];
                const fabrialNames = {
                    regen_plate: 'Regeneration Plate',
                    thrill_amp: 'Thrill Amplifier',
                    half_shard: 'Half-Shard'
                };
                log(`${fabrialNames[fabrial]} repaired and operational.`, "text-green-400 text-xs");
            }
        }
    }
    
    // Restore postponed tournament after 3 days
    if (storm.tournamentPostponed && currentDay >= storm.lastStormDay + 3) {
        storm.tournamentPostponed = false;
        // Don't auto-restart tournament - let normal schedule handle it
    }
}

/**
 * Check if a building is damaged
 * @param {Object} gameState - Current game state
 * @param {string} buildingType - Building key
 * @returns {boolean} True if damaged
 */
export function isBuildingDamaged(gameState, buildingType) {
    return gameState.state.damagedBuildings && gameState.state.damagedBuildings[buildingType] === true;
}

/**
 * Repair a damaged building
 * @param {Object} gameState - Current game state
 * @param {string} buildingType - Building key
 */
export function repairBuilding(gameState, buildingType) {
    if (!isBuildingDamaged(gameState, buildingType)) {
        log("This building is not damaged.", "text-red-400");
        return;
    }
    
    const repairCost = Math.floor(getBuildingCost(gameState, buildingType) * 0.25);
    
    if (gameState.state.spheres < repairCost) {
        log(`Cannot repair. Need ${repairCost.toLocaleString()} spheres, have ${Math.floor(gameState.state.spheres).toLocaleString()}.`, "text-red-400");
        return;
    }
    
    gameState.state.spheres -= repairCost;
    delete gameState.state.damagedBuildings[buildingType];
    
    const buildingName = buildingType.replace(/_/g, ' ');
    log(`Repaired ${buildingName} for ${repairCost.toLocaleString()} spheres.`, "text-green-400");
}

/**
 * Get chull protection bonus for a unit group
 * @param {Object} units - Unit composition
 * @returns {number} Protection multiplier (0-0.5)
 */
export function getChullProtection(units) {
    const chullCount = units.chulls || 0;
    return Math.min(0.5, chullCount * 0.05); // 5% per chull, max 50%
}

/**
 * Check if highstorm spy bonus is active
 * @param {Object} gameState - Current game state
 * @returns {boolean}
 */
export function isSpyBonusActive(gameState) {
    return gameState.state.highstorm?.spyBonusActive === true;
}

/**
 * Check if black market discount is active
 * @param {Object} gameState - Current game state
 * @returns {boolean}
 */
export function isBlackMarketDiscountActive(gameState) {
    return gameState.state.highstorm?.blackMarketDiscount === true;
}

/**
 * Check if gravity rig boost is active
 * @param {Object} gameState - Current game state
 * @returns {boolean}
 */
export function isGravityBoostActive(gameState) {
    return gameState.state.highstorm?.gravityBoostActive === true && !isGravityBurnout(gameState);
}

/**
 * Check if gravity rig is burned out
 * @param {Object} gameState - Current game state
 * @returns {boolean}
 */
export function isGravityBurnout(gameState) {
    return gameState.state.highstorm?.gravityBurnout === true;
}

/**
 * Check if arena fabrial boost is active
 * @param {Object} gameState - Current game state
 * @returns {boolean}
 */
export function isArenaBoostActive(gameState) {
    return gameState.state.highstorm?.arenaBoostActive === true;
}

/**
 * Check if a specific arena fabrial is burned out
 * @param {Object} gameState - Current game state
 * @param {string} fabrialType - Fabrial key
 * @returns {boolean}
 */
export function isFabrialBurnedOut(gameState, fabrialType) {
    return gameState.state.highstorm?.burnedFabrials?.[fabrialType] > gameState.state.dayCount;
}

/**
 * Get highstorm power debuff multiplier (affects all players post-storm)
 * @param {Object} gameState - Current game state
 * @returns {number} Multiplier (1.0 = no debuff, 0.8 = -20%)
 */
export function getStormPowerDebuff(gameState) {
    if (gameState.state.highstorm?.active === true) {
        return 0.8; // -20% power during storm and 2 days after
    }
    return 1.0;
}
/**
 * Show flashing storm overlay effect (lasts 10 seconds real-time)
 */
export function showStormOverlay() {
    // Clear any existing timeout
    if (stormOverlayTimeout) clearTimeout(stormOverlayTimeout);
    
    const overlay = document.getElementById('screen-overlay');
    if (overlay) {
        overlay.innerHTML = '<div class="highstorm-overlay"></div>';
        overlay.classList.add('highstorm-active');
        
        // Also add storm effect to the game container if it exists
        const gameContainer = document.getElementById('game-container');
        if (gameContainer && !gameContainer.classList.contains('highstorm-active')) {
            gameContainer.classList.add('highstorm-active');
        }
    }
    
    // Auto-hide after 10 seconds of real time
    stormOverlayTimeout = setTimeout(() => {
        hideStormOverlay();
        stormOverlayTimeout = null;
    }, 10000);
}

/**
 * Hide flashing storm overlay effect
 */
export function hideStormOverlay() {
    // Clear any pending timeout
    if (stormOverlayTimeout) clearTimeout(stormOverlayTimeout);
    stormOverlayTimeout = null;
    
    const overlay = document.getElementById('screen-overlay');
    if (overlay) {
        overlay.innerHTML = '';
        overlay.classList.remove('highstorm-active');
    }
    
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.classList.remove('highstorm-active');
    }
}