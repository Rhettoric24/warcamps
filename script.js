const game = {
            username: null,
            state: {
                spheres: 15000, 
                gemhearts: 0,
                military: {
                    bridgecrews: 20, spearmen: 100, archers: 0,
                    shardbearers: 0, chulls: 0,
                    noble: 0, spy: 0, ghostblood: 0
                },
                arena: {
                    level: 1,
                    xp: 0,
                    hp: 3,
                    maxHp: 3,
                    maxThrill: 10,
                    wins: 0,
                    dailyDuels: 0
                },
                tournamentActive: false,
                activeDuel: null, 
                deployments: [], 
                buildings: { 
                    soulcaster: 0, market: 0, training_camp: 0,
                    monastery: 0, shelter: 0, spy_network: 0, research_library: 0
                },
                fabrials: {
                    heatrial: 0,
                    ledger: 0,
                    gravity_lift: 0
                },
                startTime: Date.now(),
                lastTickTime: Date.now(),
                activeRun: null, 
                pendingDeployType: null
            },

            npcPrinces: {
                sadeas:   { name: "Sadeas", agents: 15, spheres: 15000, gemhearts: 2, provisions: 200, shardbearers: 2, power: 150, bridgecrews: 40, spearmen: 50, archers: 30, chulls: 5, fabrials: ["Gravity-Spanning Rig"], championLevel: 5 },
                vargo:    { name: "Taravangian", agents: 50, spheres: 5000, gemhearts: 10, provisions: 500, shardbearers: 0, power: 40, bridgecrews: 10, spearmen: 10, archers: 5, chulls: 2, fabrials: ["Heatrial", "Ledger"], championLevel: 2 },
                sebarial: { name: "Sebarial", agents: 10, spheres: 80000, gemhearts: 5, provisions: 1000, shardbearers: 0, power: 20, bridgecrews: 5, spearmen: 5, archers: 0, chulls: 50, fabrials: ["Ledger"], championLevel: 1 },
                dalinar:  { name: "Dalinar", agents: 20, spheres: 5000, gemhearts: 0, provisions: 100, shardbearers: 1, power: 120, bridgecrews: 20, spearmen: 40, archers: 20, chulls: 10, fabrials: ["Gravity-Spanning Rig", "Heatrial"], championLevel: 6 }
            },

            unitStats: {
                bridgecrews: { power: 0.1, survival: 0.25, carry: 2, speed: 0.01, cost: 5 }, 
                spearmen:    { power: 1, survival: 0.7, carry: 1, speed: 0, cost: 10 },
                archers:     { power: 1, survival: 0.9, carry: 1, speed: 0, cost: 15 },
                chulls:      { power: 0.5, survival: 0.8, carry: 10, speed: -0.02, cost: 50 }, 
                shardbearers:{ power: 0, survival: 0.99, carry: 2, speed: 0, multiplier: 2.0, cost: 0 },
                noble:       { power: 0, survival: 0.5, cost: 50, spy: 1 },
                spy:         { power: 0, survival: 0.7, cost: 150, spy: 2 },
                ghostblood:  { power: 0, survival: 0.9, cost: 600, spy: 5 }
            },

            buildingData: {
                soulcaster:    { baseCost: 150, cap: 50, income: 0, powerMod: 0, survivalMod: 0, scale: 'exponential' },
                market:        { baseCost: 250, cap: 0, income: 100, powerMod: 0, survivalMod: 0, scale: 'exponential' },
                training_camp: { baseCost: 7000, cap: 0, income: 0, powerMod: 0.1, survivalMod: 0, scale: 'linear' },
                monastery:     { baseCost: 7000, cap: 0, income: 0, powerMod: 0, survivalMod: 0.05, scale: 'linear' },
                spy_network:   { baseCost: 5000, cap: 0, income: 0, powerMod: 0, survivalMod: 0, max: 1 },
                research_library: { baseCost: 10000, cap: 0, income: 0, powerMod: 0, survivalMod: 0, max: 1 },
                shelter:       { baseCost: 100, cap: 10, income: 0, powerMod: 0, survivalMod: 0 } 
            },

            fabrialData: {
                heatrial: { cost: 3, name: "Heatrial System" },
                ledger: { cost: 5, name: "Synchronized Ledger" },
                gravity_lift: { cost: 7, name: "Gravity-Spanning Rig" }
            },

            constants: {
                DAY_MS: 3600000, // 1 Hour in ms
                UI_UPDATE_RATE: 1000 
            },

            loadGame() {
                if(!this.username) return;
                const saved = localStorage.getItem(`highprince_save_v18_${this.username}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Handle migration of fabrials from boolean to numbers
                    let newFabrials = {...this.state.fabrials};
                    if (parsed.fabrials) {
                         for(let k in parsed.fabrials) {
                             if(typeof parsed.fabrials[k] === 'boolean') {
                                 newFabrials[k] = parsed.fabrials[k] ? 1 : 0;
                             } else {
                                 newFabrials[k] = parsed.fabrials[k];
                             }
                         }
                    }

                    this.state = {
                        ...this.state,
                        ...parsed,
                        military: { ...this.state.military, ...parsed.military },
                        buildings: { ...this.state.buildings, ...parsed.buildings },
                        fabrials: newFabrials,
                        arena: { ...this.state.arena, ...parsed.arena }
                    };
                    if(parsed.activeRun) this.state.activeRun = parsed.activeRun;
                    if(parsed.deployments) this.state.deployments = parsed.deployments;
                    if(parsed.activeDuel) this.state.activeDuel = parsed.activeDuel;
                }
            },

            saveGame() {
                if(this.username) {
                    localStorage.setItem(`highprince_save_v18_${this.username}`, JSON.stringify(this.state));
                }
            },

            init() {
                // Wait for login
                document.getElementById('username-input').addEventListener('keypress', (e) => {
                    if(e.key === 'Enter') this.login();
                });
            },

            login() {
                const input = document.getElementById('username-input');
                const name = input.value.trim();
                if(!name) return;

                this.username = name;
                document.getElementById('player-name-display').innerText = name;
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('game-container').classList.remove('hidden');

                this.loadGame(); // Load data specific to this user
                this.processOfflineTime();
                this.updateUI();
                setInterval(() => this.loop(), this.constants.UI_UPDATE_RATE);
                
                this.log(`Welcome, Highprince ${name}. Warcamp Command online.`, "text-cyan-400 font-bold");
                this.updateNotificationButton();
            },
            
            requestNotificationPermission() {
                if (!("Notification" in window)) {
                    alert("This browser does not support desktop notifications");
                } else {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            this.log("Notifications enabled!", "text-green-400");
                            new Notification("Warcamp Command", { body: "Notifications are now active." });
                        }
                        this.updateNotificationButton();
                    });
                }
            },

            updateNotificationButton() {
                const btn = document.getElementById('btn-notifications');
                if (!btn) return;
                
                if (Notification.permission === "granted") {
                    btn.className = "text-xs bg-green-900/40 text-green-400 border border-green-700 px-2 py-1 rounded transition-colors cursor-default font-bold";
                    btn.innerHTML = "🔔 On";
                    btn.title = "Desktop Alerts Active";
                } else if (Notification.permission === "denied") {
                    btn.className = "text-xs bg-red-900/40 text-red-400 border border-red-700 px-2 py-1 rounded transition-colors cursor-not-allowed font-bold";
                    btn.innerHTML = "🔕 Off";
                    btn.title = "Notifications Blocked";
                } else {
                     // Default state
                    btn.className = "text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-2 py-1 rounded transition-colors font-bold";
                    btn.innerHTML = "🔔 Alerts";
                    btn.title = "Enable Desktop Alerts";
                }
            },
            
            triggerNotification(title, body) {
                if (Notification.permission === "granted") {
                    new Notification(title, { body: body });
                }
                
                // Also play sound
                this.playAlarm();
            },
            
            playAlarm() {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.value = 440;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
                osc.stop(ctx.currentTime + 0.5);
            },
            
            startTitleFlash() {
                if(this.titleInterval) return;
                let state = false;
                this.titleInterval = setInterval(() => {
                    document.title = state ? "⚠️ PLATEAU RUN! ⚠️" : "Highprince: Warcamp Sim";
                    state = !state;
                }, 1000);
            },
            
            stopTitleFlash() {
                if(this.titleInterval) {
                    clearInterval(this.titleInterval);
                    this.titleInterval = null;
                    document.title = "Highprince: Warcamp Sim";
                }
            },

            processOfflineTime() {
                const now = Date.now();
                const elapsed = now - this.state.lastTickTime;
                
                if(elapsed >= this.constants.DAY_MS) {
                     const daysPassed = Math.floor(elapsed / this.constants.DAY_MS);
                     this.processDailyTicks(daysPassed, true); // true = offline mode
                     this.state.lastTickTime = now;
                     this.saveGame();
                     this.log(`Offline for ${daysPassed} days. Resources updated.`, "text-cyan-400");
                }
            },

            loop() {
                const now = Date.now();
                if (now - this.state.lastTickTime >= this.constants.DAY_MS) {
                    this.processDailyTicks(1);
                    this.state.lastTickTime = now;
                    this.saveGame();
                }

                if (this.state.activeRun) {
                    const run = this.state.activeRun;
                    if (run.phase === 'WARNING') {
                        const timeLeft = (run.warnEndTime - now) / 1000;
                        document.getElementById('plateau-timer').innerText = `WARNING: ${timeLeft.toFixed(1)}s`;
                        if (now >= run.warnEndTime) {
                            run.phase = 'OPEN';
                            run.openEndTime = now + this.constants.DAY_MS; 
                            document.getElementById('plateau-label').innerText = "MUSTER PHASE";
                            document.getElementById('plateau-label').className = "absolute top-0 right-0 bg-green-600 text-[10px] font-bold px-2 py-1";
                            document.getElementById('plateau-actions').classList.remove('hidden');
                            document.getElementById('muster-leaderboard').classList.remove('hidden');
                            this.updateRunButtonState(); 
                            this.stopTitleFlash(); // Stop flashing once user sees muster phase
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
                        
                        if (Math.random() < 0.05) this.simulateNPCJoin(); 
                        if (now >= run.openEndTime) {
                            this.resolveRun();
                        }
                    }
                }

                this.checkDeployments();
                this.updateUI();
            },

            processDailyTicks(count, isOffline = false) {
                for (let i = 0; i < count; i++) {
                    this.state.spheres += (this.state.gemhearts * 20);
                    
                    let income = this.state.buildings.market * this.buildingData.market.income;
                    if (this.state.fabrials.ledger > 0) income *= (1 + (0.5 * this.state.fabrials.ledger));
                    this.state.spheres += income;
                    
                    this.state.arena.dailyDuels = 0;
                    if (this.state.arena.hp <= 0) {
                         this.state.arena.hp = this.state.arena.maxHp;
                         this.log("A new day! Your champion has recovered.", "text-green-400");
                    }
                    
                    // IF ONLINE, process random events
                    if (!isOffline) {
                        // PR only between day 10 and 22
                        const totalDays = Math.floor((Date.now() - this.state.startTime) / this.constants.DAY_MS);
                        const dayOfMonth = (totalDays % 24) + 1;
                        const canSpawn = dayOfMonth >= 10 && dayOfMonth <= 22;

                        if (canSpawn && !this.state.activeRun && Math.random() < 0.2) {
                            this.spawnEvent();
                        }

                        if (Math.random() < 0.14) {
                            this.triggerDefenseEvent();
                        }
                    }

                    // Tournament check (ALWAYS run to keep calendar sync)
                    const totalDays = Math.floor((Date.now() - this.state.startTime) / this.constants.DAY_MS);
                    const dayOfMonth = (totalDays % 24) + 1;
                    if (dayOfMonth === 12 && !this.state.tournamentActive && !isOffline) {
                        this.state.tournamentActive = true;
                        this.log("Tournament of Highprinces has begun!", "text-yellow-400 font-bold");
                    } else if (dayOfMonth !== 12) {
                        this.state.tournamentActive = false;
                    }
                }
            },

            triggerDefenseEvent() {
                const screen = document.getElementById('screen-overlay');
                screen.classList.add('alert-flash');
                setTimeout(() => screen.classList.remove('alert-flash'), 4000);

                const attackPower = 20 + Math.floor(Math.random() * 100);
                const defenseStats = this.getArmyStats(true); 
                const defensePower = defenseStats.power;

                this.log(`ATTACK! Parshendi raiding party detected (Power: ${attackPower}).`, "text-red-500 font-bold bg-red-900/20 border-l-4 border-red-600 pl-2");
                this.triggerNotification("Warcamp Attack!", "Parshendi are raiding your camp!");

                if (defensePower >= attackPower) {
                    this.log(`DEFENSE SUCCESSFUL. Your garrison (${defensePower.toFixed(0)}) repelled the raid.`, "text-green-400");
                } else {
                    let lossMsg = "DEFENSES BREACHED. ";
                    if (this.state.spheres > 0) {
                        const lostSpheres = Math.floor(this.state.spheres * 0.2);
                        this.state.spheres -= lostSpheres;
                        lossMsg += `Lost ${lostSpheres} Spheres. `;
                    }
                    if (this.state.gemhearts > 0 && Math.random() < 0.5) {
                        this.state.gemhearts--;
                        lossMsg += `A Gemheart was stolen! `;
                    }
                    const avail = this.getAvailableTroops();
                    this.processCasualties(avail, 0.2);
                    this.log(lossMsg, "text-orange-500");
                }
            },

            spawnEvent() {
                const now = Date.now();
                this.state.activeRun = {
                    id: Math.floor(Math.random() * 999),
                    phase: 'WARNING',
                    warnEndTime: now + 30000, 
                    difficulty: Math.random() > 0.5 ? 'Medium' : 'Hard',
                    enemyPower: 50 + Math.floor(Math.random() * 100),
                    participants: [],
                    playerForces: null 
                };
                
                document.getElementById('plateau-event-container').classList.remove('hidden');
                document.getElementById('screen-overlay').classList.add('warn-flash');
                setTimeout(() => document.getElementById('screen-overlay').classList.remove('warn-flash'), 2000);
                this.log(`SCOUT REPORT: Chasmfiend spotted! 30 seconds to muster.`, "text-orange-400 font-bold");
                
                this.triggerNotification("Plateau Run Detected!", "A Chasmfiend has been spotted. Muster your forces!");
                this.startTitleFlash();
                
                this.simulateNPCJoin(true);
            },

            simulateNPCJoin(force = false) {
                if (!this.state.activeRun) return;
                const availableNPCs = Object.values(this.npcPrinces).filter(n => 
                    !this.state.activeRun.participants.find(p => p.name === n.name)
                );
                if (availableNPCs.length === 0) return;
                const npc = availableNPCs[Math.floor(Math.random() * availableNPCs.length)];
                const npcSpeed = 1.0 + (npc.bridgecrews * 0.01);
                this.state.activeRun.participants.push({
                    name: npc.name,
                    power: npc.power,
                    speed: npcSpeed,
                    isPlayer: false
                });
                if(document.getElementById('muster-leaderboard').offsetParent !== null) {
                    this.updateEventUI();
                }
            },

            openDeployModal(type) {
                if (type === 'run') {
                    if(!this.state.activeRun || this.state.activeRun.phase !== 'OPEN') {
                        this.log("Deployment window is closed.", "text-red-400");
                        return;
                    }
                    if(this.state.activeRun.playerForces) {
                        this.log("You have already committed forces to this run.", "text-yellow-400");
                        return;
                    }
                }
                this.state.pendingDeployType = type;
                const avail = this.getAvailableTroops();
                ['bridgecrews', 'spearmen', 'archers', 'shardbearers', 'chulls'].forEach(u => {
                    const total = this.state.military[u];
                    const available = avail[u] || 0;
                    document.getElementById(`avail-modal-${u}`).innerText = `${available}/${total}`;
                    const input = document.getElementById(`deploy-${u}`);
                    input.max = available;
                    input.value = 0;
                });
                document.getElementById('deploy-type-label').innerText = type === 'run' ? "PLATEAU RUN FORCE" : (type === 'scout' ? "SCOUTING PARTY" : "RAIDING WARBAND");
                document.getElementById('deploy-modal').classList.add('open');
            },

            closeDeployModal() {
                document.getElementById('deploy-modal').classList.remove('open');
            },

            confirmDeploy() {
                const units = {};
                let total = 0;
                ['bridgecrews', 'spearmen', 'archers', 'shardbearers', 'chulls'].forEach(u => {
                    const val = parseInt(document.getElementById(`deploy-${u}`).value) || 0;
                    units[u] = val;
                    total += val;
                });
                if (total === 0) {
                    this.log("You must assign at least one unit.", "text-red-400");
                    return;
                }
                const avail = this.getAvailableTroops();
                for (let u in units) {
                    if (units[u] > (avail[u] || 0)) {
                        this.log(`Not enough ${u} available!`, "text-red-400");
                        return;
                    }
                }
                let power = 0;
                let speed = 1.0;
                for(let u in units) {
                    const s = this.unitStats[u];
                    power += units[u] * s.power;
                    if(s.multiplier) power *= (s.multiplier * units[u]);
                    speed += (units[u] * s.speed); 
                }
                if (this.state.fabrials.gravity_lift > 0) speed *= (1 + (0.5 * this.state.fabrials.gravity_lift));
                speed = Math.max(0.1, speed);

                if (this.state.pendingDeployType === 'run' && this.state.activeRun) {
                    this.state.activeRun.playerForces = { units, power, speed };
                    this.state.activeRun.participants.push({
                        name: "You",
                        power: power,
                        speed: speed,
                        isPlayer: true
                    });
                    this.updateRunButtonState();
                    this.log(`Forces committed. Speed Rating: ${(speed*100).toFixed(0)}%.`, "text-cyan-400");
                    this.saveGame();
                    this.closeDeployModal();
                    return;
                }

                const baseDays = this.state.pendingDeployType === 'scout' ? 3 : 2;
                const durationMs = (baseDays * this.constants.DAY_MS) / speed;
                const deployment = {
                    id: Date.now(),
                    type: this.state.pendingDeployType,
                    units: units,
                    returnTime: Date.now() + durationMs,
                    startDay: new Date().toLocaleTimeString()
                };
                this.state.deployments.push(deployment);
                const actualHours = (durationMs / 3600000).toFixed(1);
                this.log(`Army deployed for ${this.state.pendingDeployType}. Speed: ${(speed*100).toFixed(0)}%. Return: ${actualHours} hrs.`, "text-blue-400");
                this.saveGame();
                this.closeDeployModal();
                this.updateUI();
            },

            updateRunButtonState() {
                const btn = document.getElementById('btn-muster');
                const actions = document.getElementById('plateau-actions');
                if (this.state.activeRun && this.state.activeRun.playerForces) {
                    actions.innerHTML = `<p class="text-green-400 font-bold text-center text-xs border border-green-900 bg-green-900/20 p-2 rounded">FORCES COMMITTED</p>`;
                } else if (this.state.activeRun) {
                    actions.innerHTML = `
                        <p class="text-xs text-center text-slate-300 mb-2">Coalition forming. Muster your forces.</p>
                        <button id="btn-muster" onclick="game.openDeployModal('run')" class="w-full btn-alethi py-3 rounded font-bold text-sm mb-2">
                            MUSTER FORCES
                        </button>
                    `;
                }
            },

            resolveRun() {
                const run = this.state.activeRun;
                this.state.activeRun = null;
                document.getElementById('plateau-event-container').classList.add('hidden');
                document.getElementById('muster-leaderboard').classList.add('hidden');
                this.stopTitleFlash();
                const totalAlliedPower = run.participants.reduce((acc, p) => acc + p.power, 0);
                const victory = totalAlliedPower >= run.enemyPower;
                const sortedParticipants = run.participants.sort((a, b) => b.speed - a.speed);
                const gemheartWinner = sortedParticipants[0];
                const result = {
                    victory: victory,
                    totalPower: totalAlliedPower,
                    enemyPower: run.enemyPower,
                    gemheartWon: victory && gemheartWinner.isPlayer,
                    gemheartWinnerName: victory ? gemheartWinner.name : null,
                    lootShare: 0
                };
                if (victory && run.playerForces) {
                    const totalLoot = Math.floor(Math.random() * 50000) + 25000;
                    let potentialShare = (run.playerForces.power / totalAlliedPower) * totalLoot;
                    let carryCap = 0;
                    for(let u in run.playerForces.units) {
                        carryCap += run.playerForces.units[u] * this.unitStats[u].carry;
                    }
                    result.lootShare = Math.floor(Math.min(potentialShare, carryCap));
                }
                this.log("The Coalition has departed for the Plateau.", "text-slate-400 italic");
                if (run.playerForces) {
                    const durationMs = 2 * this.constants.DAY_MS;
                    this.state.deployments.push({
                        id: Date.now(),
                        type: 'run',
                        units: run.playerForces.units,
                        returnTime: Date.now() + durationMs, 
                        runResult: result 
                    });
                } else {
                    if (victory) this.log(`News: The Coalition defeated the Parshendi. ${gemheartWinner.name} took the Gemheart.`, "text-slate-500");
                    else this.log(`News: The Coalition was defeated.`, "text-red-900");
                }
                this.saveGame();
            },

            checkDeployments() {
                const now = Date.now();
                const finished = this.state.deployments.filter(d => now >= d.returnTime);
                this.state.deployments = this.state.deployments.filter(d => now < d.returnTime);
                finished.forEach(d => {
                    this.resolveMission(d);
                });
            },

            resolveMission(deployment) {
                let power = 0;
                let carry = 0;
                for (let u in deployment.units) {
                    const count = deployment.units[u];
                    const stats = this.unitStats[u];
                    power += count * stats.power;
                    carry += count * stats.carry;
                    if(stats.multiplier && count > 0) power *= (stats.multiplier * count);
                }
                if (deployment.type === 'run') {
                    const res = deployment.runResult;
                    if (res.victory) {
                        this.log(`CAMPAIGN VICTORY! Coalition Power ${Math.floor(res.totalPower)} crushed ${res.enemyPower}.`, "text-green-400 font-bold");
                        if (res.gemheartWon) {
                            this.state.gemhearts++;
                            this.log(`GEMHEART SECURED! Your army was the fastest.`, "text-cyan-400 font-bold border-l-4 border-cyan-400 pl-2");
                        } else {
                            this.log(`${res.gemheartWinnerName} secured the Gemheart before you arrived.`, "text-yellow-500");
                        }
                        this.state.spheres += res.lootShare;
                        this.log(`You returned with ${res.lootShare.toLocaleString()} spheres.`, "text-slate-300");
                        
                        this.processCasualties(deployment.units, 0.05);
                    } else {
                        this.log(`CAMPAIGN DEFEAT. The Parshendi (${res.enemyPower}) held the plateau.`, "text-red-500 font-bold");
                        this.processCasualties(deployment.units, 0.3); 
                        this.log("Heavy casualties sustained in the rout.", "text-orange-500");
                    }
                    return; 
                }
                
                const carryBonus = 1 + (carry * 0.01);
                
                if (deployment.type === 'scout') {
                    if (Math.random() > 0.1) {
                        const baseSpheres = Math.floor(Math.random() * 300);
                        const spheres = Math.floor(baseSpheres * carryBonus);
                        this.state.spheres += spheres;
                        this.log(`Scouts returned with ${spheres} spheres (Carry Bonus: ${(carryBonus-1)*100}%).`, "text-green-300");
                    } else {
                        this.log("Scouting party lost.", "text-red-500");
                        this.processCasualties(deployment.units, 1.0);
                    }
                } else if (deployment.type === 'attack') {
                    const enemyPower = 50 + Math.floor(Math.random() * 50);
                    if (power > enemyPower) {
                        const baseLoot = Math.floor(Math.random() * 1000) + 500;
                        const spheres = Math.floor(baseLoot * carryBonus);
                        this.state.spheres += spheres;
                        let msg = `Raid successful! Looted ${spheres} spheres.`;
                        if (Math.random() < 0.15) {
                            this.state.gemhearts++;
                            msg += " AND A GEMHEART!";
                        }
                        this.log(msg, "text-cyan-400 font-bold");
                        this.processCasualties(deployment.units, 0.1);
                    } else {
                        this.log("Raid failed.", "text-red-500");
                        this.processCasualties(deployment.units, 0.5);
                    }
                }
            },

            processCasualties(units, baseRate) {
                let report = [];
                let totalLost = 0;
                for (let u in units) {
                    const count = units[u];
                    let lost = 0;
                    let effectiveRate = baseRate;
                    if (u === 'shardbearers') effectiveRate = 0.005; 
                    if (u === 'bridgecrews') effectiveRate = 0.9;
                    for(let i=0; i<count; i++) { if(Math.random() < effectiveRate) lost++; }
                    if (lost > 0) {
                        this.state.military[u] = Math.max(0, this.state.military[u] - lost);
                        totalLost += lost;
                        report.push(`${lost} ${u}`);
                        if (u === 'shardbearers') {
                            this.log("A SHARDBEARER HAS FALLEN!", "text-red-600 font-bold bg-red-950 p-1 border border-red-500");
                        }
                    }
                }
                if (report.length > 0) {
                    this.log(`Casualties: ${report.join(", ")}.`, "text-orange-500 text-xs");
                }
            },

            getAvailableTroops() {
                const avail = { ...this.state.military };
                this.state.deployments.forEach(d => {
                    for (let u in d.units) { if (avail[u]) avail[u] -= d.units[u]; }
                });
                if (this.state.activeRun && this.state.activeRun.playerForces) {
                    const committed = this.state.activeRun.playerForces.units;
                    for (let u in committed) { if (avail[u]) avail[u] -= committed[u]; }
                }
                return avail;
            },

            getArmyStats(availableOnly = false) {
                let basePower = 0; let totalCarry = 0; let speedMod = 1.0; let unitMultiplier = 1.0; let currentPop = 0;
                let counts = availableOnly ? this.getAvailableTroops() : this.state.military;
                for (const [unit, count] of Object.entries(counts)) {
                    if (this.unitStats[unit]) {
                        const stats = this.unitStats[unit];
                        if (!stats.spy) {
                            currentPop += count;
                            basePower += count * stats.power;
                            totalCarry += count * stats.carry;
                            speedMod += count * stats.speed;
                            if (stats.multiplier) { for(let i=0; i<count; i++) unitMultiplier *= stats.multiplier; }
                        } else { currentPop += count; }
                    }
                }
                const trainingBonus = 1 + (this.state.buildings.training_camp * this.buildingData.training_camp.powerMod);
                const survivalBonus = (this.state.buildings.monastery * this.buildingData.monastery.survivalMod);
                let provisionCap = 150 + (this.state.buildings.soulcaster * 50); 
                if (this.state.fabrials.heatrial > 0) provisionCap *= (1 + (0.5 * this.state.fabrials.heatrial));
                return { power: basePower * unitMultiplier * trainingBonus, carry: totalCarry, speed: Math.max(0.1, speedMod), pop: currentPop, cap: Math.floor(provisionCap), survivalBonus: survivalBonus };
            },
            getSpyPower() {
                let power = 0;
                if (this.state.military.noble) power += this.state.military.noble * this.unitStats.noble.spy;
                if (this.state.military.spy) power += this.state.military.spy * this.unitStats.spy.spy;
                if (this.state.military.ghostblood) power += this.state.military.ghostblood * this.unitStats.ghostblood.spy;
                return power;
            },
            
            getBuildingCost(type) {
                const data = this.buildingData[type];
                if (!data) return 0;
                if (data.scale === 'exponential') {
                    const owned = this.state.buildings[type] || 0;
                    return data.baseCost * Math.pow(2, Math.floor(owned / 10));
                }
                if (data.scale === 'linear') {
                    const owned = this.state.buildings[type] || 0;
                    return data.baseCost + (owned * 5000);
                }
                return data.baseCost;
            },

            updateUI() {
                this.updateTimeUI();
                const stats = this.getArmyStats(false); 
                const availStats = this.getArmyStats(true); 
                const availTroops = this.getAvailableTroops();
                const spyPower = this.getSpyPower();
                
                document.getElementById('res-spheres').innerText = Math.floor(this.state.spheres).toLocaleString();
                document.getElementById('res-gemhearts').innerText = this.state.gemhearts;
                document.getElementById('res-pop-current').innerText = stats.pop; 
                document.getElementById('res-food-cap').innerText = stats.cap;
                document.getElementById('stat-power').innerText = Math.floor(availStats.power);
                document.getElementById('stat-avail').innerText = availStats.pop; 
                document.getElementById('stat-speed').innerText = Math.round((stats.speed - 1) * 100) + "%";
                document.getElementById('stat-agents').innerText = spyPower;
                document.getElementById('arena-daily').innerText = `${5 - this.state.arena.dailyDuels}/5`;
                
                for (const unit in this.state.military) {
                    const el = document.getElementById('det-' + unit);
                    if (el) { const tot = this.state.military[unit]; const av = availTroops[unit]; el.innerText = `${av}/${tot}`; }
                }
                const totalSpies = (this.state.military.noble || 0) + (this.state.military.spy || 0) + (this.state.military.ghostblood || 0);
                const spyEl = document.getElementById('det-spies-total');
                if(spyEl) spyEl.innerText = totalSpies;
                const chullEl = document.getElementById('det-chulls');
                if(chullEl) chullEl.innerText = this.state.military.chulls;
                
                // Arena & Black Market Logic (RESTORED)
                if (this.state.military.shardbearers > 0) {
                    document.getElementById('tab-arena').classList.remove('hidden');
                } else {
                    document.getElementById('tab-arena').classList.add('hidden');
                }

                if (this.state.buildings.market >= 30) {
                    document.getElementById('black-market-option').classList.remove('hidden');
                } else {
                    document.getElementById('black-market-option').classList.add('hidden');
                }
                
                // Update Buildings Buttons
                for (const bld in this.state.buildings) {
                    const el = document.getElementById('own-' + bld);
                    if (el) el.innerText = this.state.buildings[bld];
                    
                    const btn = document.getElementById('btn-build-' + bld);
                    if (btn) {
                        const data = this.buildingData[bld];
                        const owned = this.state.buildings[bld];
                        if (data.max && owned >= data.max) {
                            btn.innerText = "MAX";
                            btn.disabled = true;
                            btn.classList.add('opacity-50', 'cursor-not-allowed');
                        } else {
                            const cost = this.getBuildingCost(bld);
                            btn.innerText = `${cost.toLocaleString()} S`;
                            btn.disabled = this.state.spheres < cost;
                            if (this.state.spheres < cost) btn.classList.add('opacity-50', 'cursor-not-allowed');
                            else btn.classList.remove('opacity-50', 'cursor-not-allowed');
                        }
                    }
                }

                // FIX: Correctly toggle Espionage TAB visibility
                if (this.state.buildings.spy_network > 0) {
                    document.getElementById('tab-spy').classList.remove('hidden');
                    // Ensure the content inside is also accessible if the tab is clicked, but we handle tab content visibility in setTab
                    // Just in case, unlock recruiting:
                    document.getElementById('spy-recruit-locked').classList.add('hidden');
                    document.getElementById('spy-recruit-unlocked').classList.remove('hidden');
                } else {
                    document.getElementById('tab-spy').classList.add('hidden');
                    // Hide content logic as fallback
                    document.getElementById('spy-recruit-locked').classList.remove('hidden');
                    document.getElementById('spy-recruit-unlocked').classList.add('hidden');
                }

                if (this.state.buildings.research_library > 0) {
                    document.getElementById('tab-fabrial').classList.remove('hidden');
                } else {
                    document.getElementById('tab-fabrial').classList.add('hidden');
                }

                for (let fab in this.state.fabrials) {
                    const btn = document.getElementById('btn-fab-' + fab);
                    if (btn) {
                        // REMOVED 'OWNED' CHECK FOR MULTIPLE PURCHASES
                        const cost = this.fabrialData[fab].cost;
                        btn.disabled = this.state.gemhearts < cost;
                        
                        const count = this.state.fabrials[fab] || 0;
                        if (this.state.gemhearts < cost) btn.classList.add('opacity-50', 'cursor-not-allowed');
                        else btn.classList.remove('opacity-50', 'cursor-not-allowed');
                        
                         const container = btn.parentElement; 
                         const descP = container.querySelector('div p:last-child');
                         if(descP) {
                             let baseDesc = "";
                             if(fab === 'heatrial') baseDesc = "Increases Provision Cap by 1.5x (Stackable)";
                             if(fab === 'ledger') baseDesc = "Increases Market Income by 1.5x (Stackable)";
                             if(fab === 'gravity_lift') baseDesc = "Increases Army Speed by 2.0x (Stackable)";
                             
                             descP.innerText = `${baseDesc} | Owned: ${count}`;
                         }
                    }
                }
                
                document.getElementById('arena-level').innerText = this.state.arena.level;
                document.getElementById('arena-hp').innerText = `${this.state.arena.hp}/${this.state.arena.maxHp}`;
                // MISSING THRILL UPDATE HERE
                document.getElementById('arena-thrill').innerText = `${this.state.arena.maxThrill || 10}`;

                // MISSING COMBAT VIEW TOGGLE HERE
                if(this.state.activeDuel) {
                     // Update combat stats
                     document.getElementById('combat-player-hp').innerText = `HP: ${this.state.activeDuel.playerHp}/${this.state.activeDuel.playerMaxHp}`;
                     document.getElementById('combat-player-thrill').innerText = `Thrill: ${this.state.activeDuel.playerThrill}`;
                     document.getElementById('combat-enemy-hp').innerText = `HP: ${this.state.activeDuel.enemyHp}/${this.state.activeDuel.enemyMaxHp}`;
                     document.getElementById('combat-enemy-thrill').innerText = `Thrill: ${this.state.activeDuel.enemyThrill}`;
                     
                     // Toggle Views
                     document.getElementById('arena-lobby').classList.add('hidden');
                     document.getElementById('arena-combat').classList.remove('hidden');
                     
                     // Update Log
                     const log = document.getElementById('combat-log');
                     log.innerHTML = this.state.activeDuel.log.map(l => `<p>${l}</p>`).join('');
                     log.scrollTop = log.scrollHeight;
                } else {
                     document.getElementById('arena-lobby').classList.remove('hidden');
                     document.getElementById('arena-combat').classList.add('hidden');
                }
                
                if (this.state.tournamentActive) {
                    document.getElementById('tournament-active').classList.remove('hidden');
                    if (document.getElementById('arena-lobby')) {
                         document.getElementById('arena-lobby').classList.add('opacity-50');
                    }
                } else {
                    document.getElementById('tournament-active').classList.add('hidden');
                    if (document.getElementById('arena-lobby')) {
                         document.getElementById('arena-lobby').classList.remove('opacity-50');
                    }
                }

                const depList = document.getElementById('active-deployments');
                depList.innerHTML = '';
                if (this.state.deployments.length === 0) {
                    depList.innerHTML = '<p class="text-xs text-slate-500 italic text-center">No active missions.</p>';
                } else {
                    this.state.deployments.forEach(d => {
                        const timeLeft = Math.max(0, (d.returnTime - Date.now()) / 1000).toFixed(0);
                        
                        // Human readable format for missions
                        const hrs = Math.floor(timeLeft / 3600);
                        const mins = Math.floor((timeLeft % 3600) / 60);
                        const secs = Math.floor(timeLeft % 60);
                        
                        let timeStr = `${secs}s`;
                        if (hrs > 0) timeStr = `${hrs}h ${mins}m`;
                        else if (mins > 0) timeStr = `${mins}m ${secs}s`;

                        const div = document.createElement('div');
                        div.className = "bg-blue-900/30 border border-blue-800 p-2 rounded flex justify-between items-center text-[10px]";
                        div.innerHTML = `<div><span class="font-bold text-cyan-300 uppercase">${d.type}</span><span class="text-slate-400 block">Returns: ${timeStr}</span></div><div class="text-right"><span class="block">Units: ${Object.values(d.units).reduce((a,b)=>a+b,0)}</span></div>`;
                        depList.appendChild(div);
                    });
                }
            },
            
            updateEventUI() {
                const run = this.state.activeRun;
                if(!run) return;
                const leaderboardEl = document.getElementById('leaderboard-content');
                if(leaderboardEl) {
                    leaderboardEl.innerHTML = '';
                    const sorted = [...run.participants].sort((a,b) => b.speed - a.speed);
                    sorted.forEach((p, idx) => {
                        const div = document.createElement('div');
                        div.className = "flex justify-between text-[10px] text-slate-400";
                        div.innerHTML = `<span>${idx+1}. ${p.name}</span> <span class="text-orange-300 font-bold">${(p.speed*100).toFixed(0)}% Speed</span>`;
                        leaderboardEl.appendChild(div);
                    });
                }
            },

            build(type) {
                const data = this.buildingData[type];
                if (!data) return;
                if (data.max && this.state.buildings[type] >= data.max) return;
                const cost = this.getBuildingCost(type);
                if (this.state.spheres >= cost) {
                    this.state.spheres -= cost;
                    this.state.buildings[type]++;
                    this.log(`Constructed ${type.replace('_', ' ')}.`, "text-green-400 text-xs");
                    this.saveGame();
                    this.updateUI();
                }
            },
            buyGemheart() {
                if (this.state.spheres >= 10000) {
                    this.state.spheres -= 10000;
                    this.state.gemhearts++;
                    this.log("Purchased a Gemheart from the black market.", "text-yellow-400 font-bold");
                    this.saveGame();
                    this.updateUI();
                } else {
                    this.log("Insufficient spheres for Gemheart purchase.", "text-red-400");
                }
            },
            constructFabrial(type) {
                const data = this.fabrialData[type];
                if (this.state.fabrials[type]) return;

                if (this.state.gemhearts >= data.cost) {
                    this.state.gemhearts -= data.cost;
                    this.state.fabrials[type] = (this.state.fabrials[type] || 0) + 1; 
                    this.log(`Fabricated ${data.name}.`, "text-purple-400 font-bold");
                    this.saveGame();
                    this.updateUI();
                }
            },
            recruit(type) {
                let amount = 1;
                if(['noble', 'spy', 'ghostblood'].includes(type)) {
                     const spyInput = document.getElementById('recruit-amount-spy');
                     if(spyInput) amount = Math.max(1, parseInt(spyInput.value) || 1);
                } else {
                     const milInput = document.getElementById('recruit-amount');
                     if(milInput) amount = Math.max(1, parseInt(milInput.value) || 1);
                }
                const stats = this.getArmyStats(false); 
                if (stats.pop + amount > stats.cap) { this.log("Provision Cap Reached!", "text-red-400"); return; }
                if (type === 'shardbearers') {
                    amount = 1; 
                    if (this.state.gemhearts >= amount) {
                        this.state.gemhearts -= amount;
                        if (!this.state.military.shardbearers) this.state.military.shardbearers = 0;
                        this.state.military.shardbearers += amount;
                        this.log(`Recruited ${amount} Shardbearer(s).`, "text-cyan-400 font-bold");
                    } else {
                        this.log(`Not enough Gemhearts! Need ${amount}.`, "text-red-400");
                        return;
                    }
                } else {
                    const costPer = this.unitStats[type].cost;
                    const totalCost = costPer * amount;
                    if (this.state.spheres >= totalCost) {
                        this.state.spheres -= totalCost; 
                        if (!this.state.military[type]) this.state.military[type] = 0;
                        this.state.military[type] += amount;
                        this.log(`Recruited ${amount} ${type}.`, "text-slate-300");
                    } else {
                        this.log("Not enough spheres!", "text-red-400");
                        return;
                    }
                }
                this.saveGame();
                this.updateUI();
            },
            spyAction(action) {
                const targetKey = document.getElementById('spy-target').value;
                const target = this.npcPrinces[targetKey];
                const myAgents = this.getSpyPower();
                if (myAgents === 0) return;
                if (action === 'military' && myAgents > target.agents) {
                     this.log(`MILITARY [${targetKey.toUpperCase()}]: Power: ${target.power} | Shards: ${target.shardbearers} | Spears: ${target.spearmen}`, "text-green-300");
                } else if (action === 'resources' && myAgents > target.agents) {
                     this.log(`RESOURCES [${targetKey.toUpperCase()}]: Spheres: ${target.spheres} | Gems: ${target.gemhearts} | Food: ${target.provisions}`, "text-green-300");
                } else if (action === 'fabrials' && myAgents > target.agents) {
                     this.log(`TECH [${targetKey.toUpperCase()}]: ${target.fabrials.join(", ")}`, "text-purple-300");
                } else if (action === 'champion' && myAgents > target.agents) {
                     this.log(`CHAMPION [${targetKey.toUpperCase()}]: Level ${target.championLevel}`, "text-red-300");
                } else if (action === 'intel' && myAgents > target.agents) {
                    this.log(`INTEL: ${targetKey.toUpperCase()} Power: ${target.power}`, "text-cyan-400");
                } else if (action === 'steal_spheres' && myAgents >= target.agents * 1.5) {
                    this.state.spheres += 500; this.log("Stole 500 spheres.", "text-yellow-400");
                } else if (action === 'steal_shards' && myAgents >= target.agents * 3 && target.shardbearers > 0) {
                    target.shardbearers--; this.state.military.shardbearers++; this.log("Stole Shardblade!", "text-cyan-400");
                } else {
                    const spyTypes = ['noble', 'spy', 'ghostblood'];
                    const available = spyTypes.filter(t => this.state.military[t] > 0);
                    if(available.length > 0) {
                        const lossType = available[Math.floor(Math.random() * available.length)];
                        this.state.military[lossType]--;
                        this.log(`Spy mission failed. A ${lossType} was caught.`, "text-red-500");
                    } else { this.log("Spy mission failed.", "text-red-500"); }
                }
            },
            startDuel() {
                if (this.state.arena.hp <= 0) {
                    this.log("Champion is injured and cannot fight until tomorrow.", "text-red-500");
                    return;
                }
                if (this.state.arena.dailyDuels >= 5) {
                    this.log("Champion is exhausted. Wait for tomorrow.", "text-yellow-400");
                    return;
                }
                this.state.arena.dailyDuels++;
                this.state.activeDuel = {
                    playerHp: this.state.arena.hp,
                    playerMaxHp: this.state.arena.maxHp,
                    playerThrill: this.state.arena.maxThrill || 10,
                    enemyHp: Math.max(3, this.state.arena.level + 1), 
                    enemyMaxHp: Math.max(3, this.state.arena.level + 1),
                    enemyThrill: (this.state.arena.maxThrill || 10) + Math.floor(Math.random() * 3),
                    log: ["Duel Started. Place your bids."]
                };
                this.updateUI();
            },
            commitThrill() {
                if(!this.state.activeDuel) return;
                const input = document.getElementById('thrill-input');
                let bid = parseInt(input.value) || 0;
                if(bid < 0) bid = 0;
                if(bid > this.state.activeDuel.playerThrill) bid = this.state.activeDuel.playerThrill;
                let enemyBid = Math.floor(Math.random() * (this.state.activeDuel.enemyThrill + 1));
                this.state.activeDuel.playerThrill -= bid;
                this.state.activeDuel.enemyThrill -= enemyBid;
                let msg = `You pushed ${bid}. Enemy pushed ${enemyBid}. `;
                let color = "text-slate-300";
                if (bid > enemyBid) {
                    this.state.activeDuel.enemyHp--;
                    msg += "YOU HIT!";
                    color = "text-green-400";
                } else if (enemyBid > bid) {
                    this.state.activeDuel.playerHp--;
                    msg += "ENEMY HIT!";
                    color = "text-red-400";
                } else {
                    msg += "CLASH!";
                    color = "text-yellow-200";
                }
                this.state.activeDuel.log.push(`<span class="${color}">${msg}</span>`);
                if (this.state.activeDuel.playerHp <= 0) {
                    this.state.arena.hp = 0;
                    this.log("Duel Lost. Champion Injured.", "text-red-600 font-bold");
                    this.state.activeDuel = null;
                } else if (this.state.activeDuel.enemyHp <= 0) {
                    this.state.arena.hp = this.state.activeDuel.playerHp; 
                    const reward = 1000 + (100 * this.state.arena.level); 
                    const xpGain = 10;
                    this.state.spheres += reward;
                    this.state.arena.xp += xpGain;
                    this.log(`Duel Won! +${reward} S, +${xpGain} XP`, "text-green-400 font-bold");
                    if (this.state.arena.xp >= this.state.arena.level * 100) {
                        this.state.arena.level++;
                        this.state.arena.xp = 0;
                        this.state.arena.maxHp++;
                        this.state.arena.maxThrill = (this.state.arena.maxThrill || 10) + 1;
                        this.state.arena.hp = this.state.arena.maxHp;
                        this.log("Champion Level Up! +1 HP, +1 Thrill.", "text-yellow-400 font-bold");
                    }
                    this.state.activeDuel = null;
                } else {
                    if(this.state.activeDuel.playerThrill === 0 && this.state.activeDuel.enemyThrill === 0) {
                        this.state.arena.hp = this.state.activeDuel.playerHp;
                        this.log("Duel ended in Draw (Exhaustion).", "text-slate-400");
                        this.state.activeDuel = null;
                    }
                }
                this.updateUI();
                if(this.state.activeDuel) {
                    document.getElementById('thrill-input').max = this.state.activeDuel.playerThrill;
                    document.getElementById('thrill-input').value = Math.min(1, this.state.activeDuel.playerThrill);
                }
            },
            enterTournament() {
                if (!this.state.tournamentActive) return;
                if (this.state.arena.hp <= 0) {
                    this.log("Champion is injured! Cannot enter tournament.", "text-red-500 font-bold");
                    return;
                }
                const chance = 0.3 + (this.state.arena.level * 0.05);
                if (Math.random() < chance) {
                    this.state.gemhearts++;
                    this.log("TOURNAMENT CHAMPION! You won a Gemheart!", "text-purple-400 font-bold text-lg");
                } else {
                    this.log("Eliminated from tournament. Better luck next month.", "text-slate-400");
                }
                this.state.tournamentActive = false; 
                this.updateUI();
            },
            log(msg, color = 'text-slate-200') {
                const logEl = document.getElementById('game-log');
                if (logEl) {
                    const entry = document.createElement('div');
                    entry.className = `log-entry ${color}`;
                    entry.innerHTML = msg;
                    logEl.prepend(entry);
                }
            },
            setTab(tab) {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.getElementById('tab-' + tab).classList.add('active');
                document.getElementById('panel-build').classList.add('hidden');
                document.getElementById('panel-military').classList.add('hidden');
                document.getElementById('panel-spy').classList.add('hidden');
                document.getElementById('panel-fabrial').classList.add('hidden');
                document.getElementById('panel-arena').classList.add('hidden');
                document.getElementById('panel-' + tab).classList.remove('hidden');
            },
            updateTimeUI() {
                const elapsed = Date.now() - this.state.startTime;
                const totalDays = Math.floor(elapsed / this.constants.DAY_MS);
                const daysPerYear = 168; // 7 months * 24 days
                const years = Math.floor(totalDays / daysPerYear) + 1;
                const remainingDays = totalDays % daysPerYear;
                const months = Math.floor(remainingDays / 24) + 1;
                const days = (remainingDays % 24) + 1;
                document.getElementById('display-date').innerText = `Year ${years}, Month ${months}, Day ${days}`;
                const msNext = this.constants.DAY_MS - (elapsed % this.constants.DAY_MS);
                const secs = Math.ceil(msNext / 1000);
                let timeStr = `${secs}s`;
                if (secs > 60) {
                    const mins = Math.floor(secs / 60);
                    const s = secs % 60;
                    timeStr = `${mins}m ${s}s`;
                }
                document.getElementById('display-time').innerText = `Next Day: ${timeStr}`;
            },
            sendChat() {
                const input = document.getElementById('chat-input');
                if (!input.value.trim()) return;
                const chatBox = document.getElementById('chat-box');
                chatBox.innerHTML += `<p><b class="text-blue-300">You:</b> ${input.value}</p>`;
                input.value = '';
            }
        };


        window.onload = () => game.init();
