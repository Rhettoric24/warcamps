// Buildings and fabrials module
import { BUILDING_DATA, FABRIAL_DATA } from '../core/constants.js';
import { log } from '../core/utils.js';
import { canBuild, canConstructFabrial, canAffordResource } from '../core/validation.js';

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
    
    // Use validation framework for normal buildings
    const validation = canBuild(gameState, type);
    if (!validation.valid) {
        log(validation.reason, "text-red-400 text-xs");
        return;
    }

    // Deduct cost and add building
    gameState.state.spheres -= validation.cost;
    gameState.state.buildings[type]++;
    log(`Constructed ${type.replace('_', ' ')}.`, "text-green-400 text-xs");
}

export function buyGemheart(gameState) {
    const validation = canAffordResource(gameState, 10000, 'spheres');
    if (!validation.valid) {
        log(validation.reason, "text-red-400");
        return;
    }

    gameState.state.spheres -= 10000;
    gameState.state.gemhearts++;
    log("Purchased a Gemheart from the black market.", "text-yellow-400 font-bold");
}

export function constructFabrial(gameState, type) {
    // Use validation framework
    const validation = canConstructFabrial(gameState, type);
    if (!validation.valid) {
        log(validation.reason, "text-red-400");
        return;
    }

    // Deduct cost and add fabrial
    gameState.state.gemhearts -= validation.cost;
    gameState.state.fabrials[type] = (gameState.state.fabrials[type] || 0) + 1;
    const fabrialName = FABRIAL_DATA[type]?.name || type;
    log(`Fabricated ${fabrialName}.`, "text-purple-400 font-bold");
}
