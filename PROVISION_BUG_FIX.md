# Provision Cost Bug - FIXED

## The Bug

**Severity:** CRITICAL - Gameplay Balance Breaking  
**Status:** ✅ FIXED

### What Was Broken

The game was **not correctly tracking provision costs** for units:

1. **Validation** (before purchase): Correctly checked provision costs
   - Bridgecrew/Spearmen/Archers: 1 provision each
   - Chulls/Shardbearers/Ghostbloods: 3 provisions each
   - Nobles/Spies: 2 provisions each

2. **Reality** (after purchase): Treated EVERY unit as 1 provision
   - Chulls used 1 provision instead of 3
   - Shardbearers used 1 provision instead of 3
   - All units incorrectly counted as 1 provision

### Impact

- ❌ **Validation was too strict** - blocked purchases that should have been allowed
- ❌ **Players couldn't recruit units** even when they had enough provision space
- ❌ **Provision cap appeared much smaller** than it actually was
- ✅ **Resources were charged correctly** (spheres/gemhearts)

### Example Before Fix

With 150 provision cap:
- Try to buy 50 chulls (should be 150 provisions)
- Validation checks: 50 × 3 = 150 ✅ Should work
- But current tracking shows: 50 existing units = 50 provisions used
- Validation blocks purchase even though you have 100 provisions free!

## The Fix

### Changes Made

**1. Added provision costs to UNIT_STATS ([constants.js](assets/js/core/constants.js))**
```javascript
// Before: No provision field
bridgecrews: { power: 0.1, survival: 0.25, carry: 0, speed: 0.01, cost: 5 }

// After: Added provision field
bridgecrews: { power: 0.1, survival: 0.25, carry: 0, speed: 0.01, cost: 5, provision: 1 }
```

All units now have correct provision costs:
- Bridgecrew/Spearmen/Archers: `provision: 1`
- Chulls/Shardbearers/Ghostbloods: `provision: 3`
- Nobles/Spies: `provision: 2`

**2. Updated getArmyStats ([military.js](assets/js/military/military.js))**
```javascript
// Before: Every unit counted as 1 provision
currentPop += count;

// After: Multiply by actual provision cost
currentPop += count * (stats.provision || 1);
```

**3. Updated validation ([validation.js](assets/js/core/validation.js))**
- Removed hardcoded provision costs
- Now uses UNIT_STATS as single source of truth
- Ensures validation and tracking use identical values

### Result

✅ Provision costs now correctly tracked  
✅ Validation and reality match  
✅ Players can recruit units when they have space  
✅ Chulls/Shardbearers properly use 3 provisions  
✅ Single source of truth (UNIT_STATS)  

## Testing Recommendations

1. Start with 150 provision cap
2. Recruit 50 chulls (should use exactly 150 provisions) ✅
3. Verify provision display shows 150/150 ✅
4. Try to recruit 1 more chull (should be blocked) ✅
5. Build soulcaster (+50 provisions)
6. Now recruit 16 more chulls (48 provisions, should work) ✅

## Impact on Balance

**Before Fix:**
- Provisions appeared scarce
- Players thought they needed more soulcasters
- High-cost units (chulls, shardbearers) seemed weak

**After Fix:**
- Provisions work as designed
- Chulls/Shardbearers properly expensive (3 provisions each)
- Soulcasters provide correct value (+50 provisions)
- Players can actually use their provision capacity

**No Economy Changes Needed** - the design was correct, just not implemented properly.
