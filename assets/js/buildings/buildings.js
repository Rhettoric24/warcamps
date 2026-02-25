// Buildings and fabrials module
import { BUILDING_DATA, FABRIAL_DATA } from '../core/constants.js';
import { log } from '../core/utils.js';
import { canBuild, canConstructFabrial, canAffordResource } from '../core/validation.js';
import { isBuildingDamaged, isBlackMarketDiscountActive } from '../events/highstorm.js';

export function getBuildingCost(gameState, type) {
    const data = BUILDING_DATA[type];
    if (!data) return 0;
    if (data.scale === 'exponential') {
        const owned = gameState.state.buildings[type] || 0;
        return data.baseCost * Math.pow(2, Math.floor(owned / 10));
    }
    if (data.scale === 'linear') {
        const owned = gameState.state.buildings[type] || 0;
        return data.baseCost + (owned * 5000);
    }
    return data.baseCost;
}

export function build(gameState, type) {
    const data = BUILDING_DATA[type];
    
    // Get bulk amount from input
    let amount = 1;
    const buildInput = document.getElementById('build-amount');
    if (buildInput) amount = Math.max(1, parseInt(buildInput.value) || 1);
    
    // Handle Whisper Tower (costs Ghostbloods instead of Spheres)
    if (type === 'whisper_tower') {
        if (data.max && gameState.state.buildings.whisper_tower >= data.max) {
            log("The Whisper Tower is already built.", "text-red-400");
            return;
        }
        if (gameState.state.military.ghostblood < 10) {
            log(`Insufficient Ghostbloods. Need 10, have ${gameState.state.military.ghostblood}.`, "text-red-400");
            return;
        }
        gameState.state.military.ghostblood -= 10;
        gameState.state.buildings.whisper_tower++;
        log("The Whisper Tower constructed. Espionage capabilities enhanced.", "text-purple-400 font-bold text-lg");
        return;
    }
    
    // Build multiple buildings with bulk purchase
    let built = 0;
    for (let i = 0; i < amount; i++) {
        // Use validation framework for each building
        const validation = canBuild(gameState, type);
        if (!validation.valid) {
            if (built === 0) {
                log(validation.reason, "text-red-400 text-xs");
            }
            break;
        }

        // Deduct cost and add building
        gameState.state.spheres -= validation.cost;
        gameState.state.buildings[type]++;
        built++;
    }
    
    if (built > 0) {
        const msg = built === 1 ? `Constructed ${type.replace('_', ' ')}.` : `Constructed ${built} ${type.replace('_', ' ')}.`;
        log(msg, "text-green-400 text-xs");
    }
}

export function buyGemheart(gameState) {
    // Check for storm discount
    const cost = isBlackMarketDiscountActive(gameState) ? 7500 : 10000;
    
    const validation = canAffordResource(gameState, cost, 'spheres');
    if (!validation.valid) {
        log(validation.reason, "text-red-400");
        return;
    }

    gameState.state.spheres -= cost;
    gameState.state.gemhearts++;
    
    if (cost === 7500) {
        log("Purchased a Gemheart from the black market at storm-reduced price!", "text-yellow-400 font-bold");
    } else {
        log("Purchased a Gemheart from the black market.", "text-yellow-400 font-bold");
    }
}

export function constructFabrial(gameState, type) {
    // Get bulk amount from input
    let amount = 1;
    const fabricInput = document.getElementById('fabrial-amount');
    if (fabricInput) amount = Math.max(1, parseInt(fabricInput.value) || 1);
    
    // Construct multiple fabrials with bulk purchase
    let constructed = 0;
    for (let i = 0; i < amount; i++) {
        // Use validation framework
        const validation = canConstructFabrial(gameState, type);
        if (!validation.valid) {
            if (constructed === 0) {
                log(validation.reason, "text-red-400");
            }
            break;
        }

        // Deduct cost and add fabrial
        gameState.state.gemhearts -= validation.cost;
        gameState.state.fabrials[type] = (gameState.state.fabrials[type] || 0) + 1;
        constructed++;
    }
    
    if (constructed > 0) {
        const fabrialName = FABRIAL_DATA[type]?.name || type;
        const msg = constructed === 1 ? `Fabricated ${fabrialName}.` : `Fabricated ${constructed} ${fabrialName}.`;
        log(msg, "text-purple-400 font-bold");
    }
}

export function getEffectiveBuildingBonus(gameState, buildingType) {
    // Returns the effective multiplier for a building (0.5 if damaged, 1.0 if not)
    return isBuildingDamaged(gameState, buildingType) ? 0.5 : 1.0;
}
