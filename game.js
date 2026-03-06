(() => {
  "use strict";

  const HERO_MAX_MOVEMENT = 6;
  const SAVE_KEY = "thrones-clash-save-v1";

  const ICONS = {
    hero_north: "assets/icons/hero-north.svg",
    hero_crown: "assets/icons/hero-crown.svg",
    mine: "assets/icons/mine.svg",
    town: "assets/icons/town.svg",
    unit_levy: "assets/units/levy.svg",
    unit_archer: "assets/units/archer.svg",
    unit_raider: "assets/units/raider.svg",
    unit_knight: "assets/units/knight.svg"
  };

  const UNIT_ORDER = ["levy", "archer", "raider", "knight"];

  const UNIT_BASE_RECRUIT_AMOUNT = {
    levy: 3,
    archer: 3,
    raider: 2,
    knight: 1
  };

  const TOWN_BUILDINGS = {
    levy_hall: {
      id: "levy_hall",
      name: "Казарми ополчення",
      description: "Відкриває найм ополчення.",
      cost: { gold: 420, iron: 1, grain: 0 },
      requires: [],
      unlocks: ["levy"]
    },
    archery_range: {
      id: "archery_range",
      name: "Стрілецький двір",
      description: "Відкриває найм лучників.",
      cost: { gold: 620, iron: 1, grain: 1 },
      requires: ["levy_hall"],
      unlocks: ["archer"]
    },
    raider_pits: {
      id: "raider_pits",
      name: "Тренувальний табір",
      description: "Відкриває найм рейдерів.",
      cost: { gold: 930, iron: 2, grain: 2 },
      requires: ["archery_range"],
      unlocks: ["raider"]
    },
    knight_keep: {
      id: "knight_keep",
      name: "Лицарський замок",
      description: "Відкриває найм лицарів.",
      cost: { gold: 1450, iron: 3, grain: 3 },
      requires: ["raider_pits"],
      unlocks: ["knight"]
    }
  };

  const BUILDING_ORDER = ["levy_hall", "archery_range", "raider_pits", "knight_keep"];

  const UNIT_REQUIRED_BUILDING = {
    levy: "levy_hall",
    archer: "archery_range",
    raider: "raider_pits",
    knight: "knight_keep"
  };

  const unitCatalog = {
    levy: {
      id: "levy",
      name: "Ополчення",
      hp: 12,
      minDamage: 2,
      maxDamage: 4,
      attack: 4,
      defense: 2,
      speed: 4,
      icon: ICONS.unit_levy,
      cost: { gold: 20, iron: 0, grain: 1 }
    },
    archer: {
      id: "archer",
      name: "Лучники",
      hp: 9,
      minDamage: 3,
      maxDamage: 5,
      attack: 5,
      defense: 2,
      speed: 6,
      icon: ICONS.unit_archer,
      cost: { gold: 30, iron: 0, grain: 1 }
    },
    raider: {
      id: "raider",
      name: "Рейдери",
      hp: 16,
      minDamage: 4,
      maxDamage: 7,
      attack: 6,
      defense: 4,
      speed: 5,
      icon: ICONS.unit_raider,
      cost: { gold: 45, iron: 1, grain: 1 }
    },
    knight: {
      id: "knight",
      name: "Лицарі",
      hp: 28,
      minDamage: 7,
      maxDamage: 11,
      attack: 8,
      defense: 7,
      speed: 5,
      icon: ICONS.unit_knight,
      cost: { gold: 90, iron: 2, grain: 2 }
    }
  };

  const FACTIONS = {
    north: {
      id: 1,
      key: "north",
      name: "Північний союз",
      shortName: "N",
      heroName: "Вартовий Лір",
      colorClass: "north",
      heroIcon: ICONS.hero_north,
      resources: { gold: 1300, iron: 6, grain: 8 },
      baseIncome: { gold: 240, iron: 1, grain: 1 }
    },
    crown: {
      id: 2,
      key: "crown",
      name: "Королівська корона",
      shortName: "C",
      heroName: "Маршал Корвін",
      colorClass: "crown",
      heroIcon: ICONS.hero_crown,
      resources: { gold: 1300, iron: 6, grain: 8 },
      baseIncome: { gold: 240, iron: 1, grain: 1 }
    }
  };

  const DEFAULT_TOWN_POOL = { levy: 18, archer: 8, raider: 4, knight: 2 };
  const DEFAULT_TOWN_GROWTH = { levy: 9, archer: 4, raider: 2, knight: 1 };
  const DEFAULT_TOWN_BUILDINGS = ["levy_hall", "archery_range"];

  const MAP_PRESETS = {
    kingsroad: {
      id: "kingsroad",
      name: "Королівський тракт",
      width: 10,
      height: 7,
      terrain: [
        ["forest", "forest", "road", "hills", "plains", "plains", "road", "hills", "forest", "forest"],
        ["forest", "road", "road", "plains", "plains", "hills", "road", "road", "road", "forest"],
        ["road", "road", "plains", "plains", "forest", "hills", "plains", "forest", "road", "road"],
        ["plains", "river", "river", "plains", "forest", "road", "plains", "plains", "hills", "road"],
        ["plains", "plains", "hills", "road", "road", "road", "hills", "plains", "road", "forest"],
        ["forest", "road", "plains", "plains", "hills", "plains", "forest", "road", "road", "forest"],
        ["forest", "forest", "road", "hills", "plains", "plains", "road", "hills", "forest", "forest"]
      ],
      heroStarts: {
        north: { x: 1, y: 5 },
        crown: { x: 8, y: 1 }
      },
      heroArmies: {
        north: [
          { unitId: "levy", count: 22 },
          { unitId: "archer", count: 9 }
        ],
        crown: [
          { unitId: "levy", count: 18 },
          { unitId: "raider", count: 7 }
        ]
      },
      objects: [
        {
          id: "mine_west",
          type: "mine",
          x: 3,
          y: 2,
          ownerKey: null,
          guard: [
            { unitId: "levy", count: 9 },
            { unitId: "archer", count: 3 }
          ]
        },
        {
          id: "mine_center",
          type: "mine",
          x: 5,
          y: 4,
          ownerKey: null,
          guard: [
            { unitId: "levy", count: 12 },
            { unitId: "raider", count: 3 }
          ]
        },
        {
          id: "mine_east",
          type: "mine",
          x: 7,
          y: 3,
          ownerKey: null,
          guard: [
            { unitId: "levy", count: 10 },
            { unitId: "archer", count: 4 }
          ]
        },
        {
          id: "town_north",
          type: "town",
          x: 1,
          y: 5,
          ownerKey: "north",
          recruitPool: { levy: 18, archer: 8, raider: 4, knight: 2 },
          growth: { levy: 9, archer: 4, raider: 2, knight: 1 },
          buildings: ["levy_hall", "archery_range"],
          garrison: [
            { unitId: "levy", count: 10 },
            { unitId: "archer", count: 5 }
          ]
        },
        {
          id: "town_crown",
          type: "town",
          x: 8,
          y: 1,
          ownerKey: "crown",
          recruitPool: { levy: 18, archer: 8, raider: 4, knight: 2 },
          growth: { levy: 9, archer: 4, raider: 2, knight: 1 },
          buildings: ["levy_hall", "archery_range"],
          garrison: [
            { unitId: "levy", count: 12 },
            { unitId: "raider", count: 4 }
          ]
        }
      ]
    },
    frostmarch: {
      id: "frostmarch",
      name: "Крижаний рубіж",
      width: 10,
      height: 7,
      terrain: [
        ["hills", "road", "plains", "forest", "forest", "hills", "road", "plains", "forest", "hills"],
        ["road", "road", "plains", "river", "plains", "road", "road", "plains", "hills", "forest"],
        ["forest", "plains", "plains", "river", "plains", "hills", "forest", "road", "road", "forest"],
        ["forest", "road", "road", "road", "road", "road", "road", "road", "plains", "plains"],
        ["hills", "forest", "plains", "hills", "plains", "river", "plains", "forest", "road", "road"],
        ["plains", "road", "road", "forest", "plains", "river", "plains", "hills", "plains", "forest"],
        ["hills", "forest", "plains", "road", "hills", "plains", "road", "forest", "forest", "hills"]
      ],
      heroStarts: {
        north: { x: 1, y: 1 },
        crown: { x: 8, y: 5 }
      },
      heroArmies: {
        north: [
          { unitId: "levy", count: 20 },
          { unitId: "archer", count: 10 }
        ],
        crown: [
          { unitId: "levy", count: 20 },
          { unitId: "raider", count: 6 }
        ]
      },
      objects: [
        {
          id: "mine_north",
          type: "mine",
          x: 2,
          y: 4,
          ownerKey: null,
          guard: [
            { unitId: "levy", count: 8 },
            { unitId: "archer", count: 5 }
          ]
        },
        {
          id: "mine_mid",
          type: "mine",
          x: 5,
          y: 3,
          ownerKey: null,
          guard: [
            { unitId: "levy", count: 11 },
            { unitId: "raider", count: 2 }
          ]
        },
        {
          id: "mine_south",
          type: "mine",
          x: 7,
          y: 2,
          ownerKey: null,
          guard: [
            { unitId: "levy", count: 9 },
            { unitId: "archer", count: 4 }
          ]
        },
        {
          id: "town_north",
          type: "town",
          x: 1,
          y: 1,
          ownerKey: "north",
          recruitPool: { levy: 18, archer: 8, raider: 4, knight: 2 },
          growth: { levy: 9, archer: 4, raider: 2, knight: 1 },
          buildings: ["levy_hall", "archery_range"],
          garrison: [
            { unitId: "levy", count: 10 },
            { unitId: "archer", count: 4 }
          ]
        },
        {
          id: "town_crown",
          type: "town",
          x: 8,
          y: 5,
          ownerKey: "crown",
          recruitPool: { levy: 18, archer: 8, raider: 4, knight: 2 },
          growth: { levy: 9, archer: 4, raider: 2, knight: 1 },
          buildings: ["levy_hall", "archery_range"],
          garrison: [
            { unitId: "levy", count: 11 },
            { unitId: "raider", count: 4 }
          ]
        }
      ]
    }
  };

  let stackUid = 1;
  let state = null;

  const ui = {
    setupModal: document.getElementById("setupModal"),
    gameRoot: document.getElementById("gameRoot"),
    factionSelect: document.getElementById("factionSelect"),
    mapSelect: document.getElementById("mapSelect"),
    startGameBtn: document.getElementById("startGameBtn"),
    setupLoadBtn: document.getElementById("setupLoadBtn"),

    mapGrid: document.getElementById("mapGrid"),
    dayCounter: document.getElementById("dayCounter"),
    turnCounter: document.getElementById("turnCounter"),
    resourcePanel: document.getElementById("resourcePanel"),
    heroPanel: document.getElementById("heroPanel"),
    recruitPanel: document.getElementById("recruitPanel"),
    logPanel: document.getElementById("logPanel"),

    endTurnBtn: document.getElementById("endTurnBtn"),
    centerHeroBtn: document.getElementById("centerHeroBtn"),
    townScreenBtn: document.getElementById("townScreenBtn"),
    saveBtn: document.getElementById("saveBtn"),
    loadBtn: document.getElementById("loadBtn"),

    townModal: document.getElementById("townModal"),
    townTitle: document.getElementById("townTitle"),
    closeTownBtn: document.getElementById("closeTownBtn"),
    townBuildings: document.getElementById("townBuildings"),
    townRecruit: document.getElementById("townRecruit"),
    townNotes: document.getElementById("townNotes"),

    battleModal: document.getElementById("battleModal"),
    attackerStacks: document.getElementById("attackerStacks"),
    defenderStacks: document.getElementById("defenderStacks"),
    battleStatus: document.getElementById("battleStatus"),
    battleLog: document.getElementById("battleLog"),
    defendBtn: document.getElementById("defendBtn"),

    endgameModal: document.getElementById("endgameModal"),
    endgameTitle: document.getElementById("endgameTitle"),
    endgameText: document.getElementById("endgameText"),
    restartBtn: document.getElementById("restartBtn")
  };

  ui.startGameBtn.addEventListener("click", onStartGameClicked);
  ui.setupLoadBtn.addEventListener("click", () => loadGameFromStorage({ fromSetup: true }));

  ui.endTurnBtn.addEventListener("click", handleEndTurnClick);
  ui.centerHeroBtn.addEventListener("click", centerOnSelectedHero);
  ui.townScreenBtn.addEventListener("click", openTownScreen);
  ui.saveBtn.addEventListener("click", () => saveGameToStorage({ silent: false }));
  ui.loadBtn.addEventListener("click", () => loadGameFromStorage({ fromSetup: false }));

  ui.closeTownBtn.addEventListener("click", closeTownScreen);
  ui.townBuildings.addEventListener("click", handleTownBuildingClick);
  ui.townRecruit.addEventListener("click", handleTownRecruitClick);

  ui.defendBtn.addEventListener("click", onDefendClicked);
  ui.attackerStacks.addEventListener("click", handleStackClick);
  ui.defenderStacks.addEventListener("click", handleStackClick);
  ui.restartBtn.addEventListener("click", () => window.location.reload());

  renderSetupOptions();
  refreshGlobalButtons();

  function renderSetupOptions() {
    ui.factionSelect.innerHTML = [
      `<option value="north">${FACTIONS.north.name}</option>`,
      `<option value="crown">${FACTIONS.crown.name}</option>`
    ].join("");

    ui.mapSelect.innerHTML = Object.values(MAP_PRESETS)
      .map((preset) => `<option value="${preset.id}">${preset.name}</option>`)
      .join("");

    ui.factionSelect.value = "north";
    ui.mapSelect.value = "kingsroad";
    ui.setupLoadBtn.disabled = !hasSavedGame();
  }

  function refreshGlobalButtons() {
    const hasState = Boolean(state);
    const hasSave = hasSavedGame();

    ui.setupLoadBtn.disabled = !hasSave;

    if (!hasState) {
      ui.endTurnBtn.disabled = true;
      ui.centerHeroBtn.disabled = true;
      ui.townScreenBtn.disabled = true;
      ui.saveBtn.disabled = true;
      ui.loadBtn.disabled = !hasSave;
      return;
    }

    const humanTurn = state.currentPlayerId === state.humanPlayerId;
    const blocked = state.gameOver || Boolean(state.battle);

    ui.endTurnBtn.disabled = !humanTurn || blocked;
    ui.centerHeroBtn.disabled = false;
    ui.saveBtn.disabled = blocked;
    ui.loadBtn.disabled = !hasSave;
    ui.townScreenBtn.disabled = !canOpenTownScreen();
  }

  function onStartGameClicked() {
    const humanFactionKey = String(ui.factionSelect.value);
    const mapId = String(ui.mapSelect.value);
    startGame(humanFactionKey, mapId);
  }

  function startGame(humanFactionKey, mapId) {
    const mapPreset = MAP_PRESETS[mapId];
    const humanFaction = FACTIONS[humanFactionKey];
    const aiFaction = humanFactionKey === "north" ? FACTIONS.crown : FACTIONS.north;

    if (!mapPreset || !humanFaction) {
      return;
    }

    state = {
      version: 2,
      day: 1,
      currentPlayerId: humanFaction.id,
      humanPlayerId: humanFaction.id,
      aiPlayerId: aiFaction.id,
      selectedHeroId: `hero_${humanFaction.key}`,
      gameOver: false,
      logs: [],
      battle: null,
      townScreen: { open: false, townId: null },
      map: {
        id: mapPreset.id,
        name: mapPreset.name,
        width: mapPreset.width,
        height: mapPreset.height,
        terrain: mapPreset.terrain.map((row) => row.slice())
      },
      players: {
        [FACTIONS.north.id]: createPlayer(FACTIONS.north, humanFaction.id),
        [FACTIONS.crown.id]: createPlayer(FACTIONS.crown, humanFaction.id)
      },
      heroes: createHeroes(mapPreset),
      objects: createObjects(mapPreset)
    };

    ui.setupModal.classList.add("hidden");
    ui.gameRoot.classList.remove("hidden");
    ui.endgameModal.classList.add("hidden");
    closeTownScreen();

    addLog(
      `Кампанія "${state.map.name}" почалась. Ви граєте за ${state.players[state.humanPlayerId].name}.`
    );
    addLog("Відкривайте міста, будуйте споруди, наймайте війська та знищіть ворожого героя.");

    renderAll();
    saveGameToStorage({ silent: true });
  }

  function createPlayer(faction, humanPlayerId) {
    return {
      id: faction.id,
      key: faction.key,
      name: faction.name,
      shortName: faction.shortName,
      colorClass: faction.colorClass,
      heroIcon: faction.heroIcon,
      isHuman: faction.id === humanPlayerId,
      resources: { ...faction.resources },
      baseIncome: { ...faction.baseIncome }
    };
  }

  function createHeroes(mapPreset) {
    const heroes = [];

    for (const factionKey of ["north", "crown"]) {
      const faction = FACTIONS[factionKey];
      const start = mapPreset.heroStarts[factionKey];
      const armyTemplate = mapPreset.heroArmies[factionKey] || [
        { unitId: "levy", count: 16 },
        { unitId: "archer", count: 6 }
      ];

      heroes.push({
        id: `hero_${factionKey}`,
        playerId: faction.id,
        name: faction.heroName,
        x: start.x,
        y: start.y,
        movement: HERO_MAX_MOVEMENT,
        alive: true,
        army: buildArmyFromTemplate(armyTemplate)
      });
    }

    return heroes;
  }

  function createObjects(mapPreset) {
    return mapPreset.objects.map((obj) => {
      if (obj.type === "mine") {
        return {
          id: obj.id,
          type: "mine",
          x: obj.x,
          y: obj.y,
          owner: obj.ownerKey ? FACTIONS[obj.ownerKey].id : null,
          guard: buildArmyFromTemplate(obj.guard || [])
        };
      }

      return {
        id: obj.id,
        type: "town",
        x: obj.x,
        y: obj.y,
        owner: obj.ownerKey ? FACTIONS[obj.ownerKey].id : null,
        recruitPool: { ...(obj.recruitPool || DEFAULT_TOWN_POOL) },
        growth: { ...(obj.growth || DEFAULT_TOWN_GROWTH) },
        buildings: [...(obj.buildings || DEFAULT_TOWN_BUILDINGS)],
        lastBuildDay: null,
        garrison: buildArmyFromTemplate(obj.garrison || [])
      };
    });
  }

  function buildArmyFromTemplate(template) {
    return (template || []).map((entry) => makeStack(entry.unitId, entry.count));
  }

  function makeStack(unitId, count) {
    return {
      uid: `s${stackUid++}`,
      unitId,
      count,
      hp: unitCatalog[unitId].hp
    };
  }

  function cloneArmy(army) {
    return army
      .filter((stack) => stack.count > 0)
      .map((stack) => ({
        uid: `s${stackUid++}`,
        unitId: stack.unitId,
        count: stack.count,
        hp: stack.hp > 0 ? stack.hp : unitCatalog[stack.unitId].hp
      }));
  }

  function compactArmy(army) {
    return cloneArmy(army.filter((stack) => stack.count > 0));
  }

  function renderAll() {
    if (!state) {
      refreshGlobalButtons();
      return;
    }

    renderTopbar();
    renderMap();
    renderResources();
    renderHeroPanel();
    renderLogPanel();
    renderTownScreen();
    renderBattle();
    refreshGlobalButtons();
  }

  function renderTopbar() {
    ui.dayCounter.textContent = `Day ${state.day} - ${state.map.name}`;
    ui.turnCounter.textContent = `Хід: ${state.players[state.currentPlayerId].name}`;
  }

  function renderMap() {
    ui.mapGrid.innerHTML = "";
    ui.mapGrid.style.gridTemplateColumns = `repeat(${state.map.width}, var(--tile-size))`;
    ui.mapGrid.style.gridTemplateRows = `repeat(${state.map.height}, var(--tile-size))`;

    const selectedHero = getSelectedHero();

    for (let y = 0; y < state.map.height; y += 1) {
      for (let x = 0; x < state.map.width; x += 1) {
        const tile = document.createElement("div");
        const terrain = state.map.terrain[y][x];
        tile.className = `tile terrain-${terrain}`;
        tile.id = `tile-${x}-${y}`;

        if (selectedHero && selectedHero.x === x && selectedHero.y === y) {
          tile.classList.add("selected");
        }

        const canShowReachable =
          selectedHero &&
          selectedHero.playerId === state.humanPlayerId &&
          state.currentPlayerId === state.humanPlayerId &&
          selectedHero.movement > 0 &&
          !state.battle;

        if (canShowReachable && isReachable(selectedHero, x, y)) {
          tile.classList.add("reachable");
        }

        const tileObject = getObjectAt(x, y);
        const tileHero = getHeroAt(x, y);

        if (tileObject && tileObject.owner) {
          const ownerKey = getFactionKeyByPlayerId(tileObject.owner);
          tile.classList.add(ownerKey === "north" ? "owner-north" : "owner-crown");
        }

        if (tileHero && tileHero.alive) {
          const marker = buildMarker(
            tileHero.playerId === FACTIONS.north.id ? ICONS.hero_north : ICONS.hero_crown,
            state.players[tileHero.playerId].shortName,
            tileHero.playerId === FACTIONS.north.id ? "hero-north" : "hero-crown"
          );
          marker.title = tileHero.name;
          tile.appendChild(marker);
        } else if (tileObject) {
          if (tileObject.type === "mine") {
            const marker = buildMarker(ICONS.mine, "M", "mine");
            marker.title = "Шахта";
            tile.appendChild(marker);
          } else {
            const marker = buildMarker(ICONS.town, "T", "town");
            marker.title = "Місто";
            tile.appendChild(marker);
          }
        }

        tile.addEventListener("click", () => onTileClick(x, y));
        ui.mapGrid.appendChild(tile);
      }
    }
  }

  function buildMarker(iconPath, fallbackText, extraClass) {
    const marker = document.createElement("div");
    marker.className = `marker ${extraClass}`;

    if (iconPath) {
      const icon = document.createElement("img");
      icon.src = iconPath;
      icon.alt = "";
      marker.appendChild(icon);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "marker-fallback";
      fallback.textContent = fallbackText;
      marker.appendChild(fallback);
    }

    return marker;
  }

  function renderResources() {
    const player = state.players[state.currentPlayerId];
    const income = getIncomeForPlayer(state.currentPlayerId);

    ui.resourcePanel.innerHTML = `
      <div><strong>Золото:</strong> ${player.resources.gold}</div>
      <div><strong>+ / день:</strong> ${income.gold}</div>
      <div><strong>Залізо:</strong> ${player.resources.iron}</div>
      <div><strong>+ / день:</strong> ${income.iron}</div>
      <div><strong>Провіант:</strong> ${player.resources.grain}</div>
      <div><strong>+ / день:</strong> ${income.grain}</div>
    `;
  }

  function renderHeroPanel() {
    const hero = getSelectedHero();
    if (!hero || !hero.alive) {
      ui.heroPanel.textContent = "Активного героя немає.";
      ui.recruitPanel.innerHTML = "";
      return;
    }

    const armyHtml = renderArmyLines(hero.army);

    ui.heroPanel.innerHTML = `
      <strong>${escapeHtml(hero.name)}</strong><br>
      Сторона: ${state.players[hero.playerId].name}<br>
      Координати: (${hero.x}, ${hero.y})<br>
      Кроки: ${hero.movement}/${HERO_MAX_MOVEMENT}<br>
      <hr>
      <strong>Армія:</strong>
      <div class="hero-army-list">${armyHtml || "<span class=\"muted\">Порожньо</span>"}</div>
    `;

    renderTownQuickPanel(hero);
  }

  function renderArmyLines(army) {
    return army
      .filter((stack) => stack.count > 0)
      .map((stack) => {
        const unit = unitCatalog[stack.unitId];
        return `
          <div class="unit-line">
            <div class="unit-icon-small"><img src="${unit.icon}" alt=""></div>
            <div>${escapeHtml(unit.name)}: ${stack.count}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderTownQuickPanel(hero) {
    if (
      !hero ||
      hero.playerId !== state.humanPlayerId ||
      state.currentPlayerId !== state.humanPlayerId ||
      state.gameOver ||
      state.battle
    ) {
      ui.recruitPanel.innerHTML = "";
      return;
    }

    const town = getObjectAt(hero.x, hero.y);
    if (!town || town.type !== "town" || town.owner !== hero.playerId) {
      ui.recruitPanel.innerHTML = "";
      return;
    }

    const unlockedUnits = UNIT_ORDER.filter((unitId) => isUnitUnlockedInTown(unitId, town));

    ui.recruitPanel.innerHTML = `
      <div class="town-card-meta">
        Керування містом доступне. Споруди: ${town.buildings.length}/${BUILDING_ORDER.length}.<br>
        Відкриті війська: ${unlockedUnits.map((unitId) => unitCatalog[unitId].name).join(", ")}
      </div>
      <button class="btn primary" id="openTownInlineBtn">Відкрити місто</button>
    `;

    const inlineButton = document.getElementById("openTownInlineBtn");
    if (inlineButton) {
      inlineButton.addEventListener("click", openTownScreen);
    }
  }

  function openTownScreen() {
    if (!state || !canOpenTownScreen()) {
      return;
    }

    const town = getHumanTownUnderSelectedHero();
    if (!town) {
      return;
    }

    state.townScreen.open = true;
    state.townScreen.townId = town.id;
    renderTownScreen();
    refreshGlobalButtons();
  }

  function closeTownScreen() {
    if (state && state.townScreen) {
      state.townScreen.open = false;
      state.townScreen.townId = null;
    }
    ui.townModal.classList.add("hidden");
    refreshGlobalButtons();
  }

  function renderTownScreen() {
    if (!state || !state.townScreen?.open) {
      ui.townModal.classList.add("hidden");
      return;
    }

    const town = getObjectById(state.townScreen.townId);
    const hero = getSelectedHero();

    if (!town || town.type !== "town" || !hero || hero.x !== town.x || hero.y !== town.y) {
      closeTownScreen();
      return;
    }

    ui.townModal.classList.remove("hidden");
    ui.townTitle.textContent = `Місто ${town.id} (${state.players[town.owner].name})`;

    ui.townBuildings.innerHTML = BUILDING_ORDER.map((buildingId) => renderBuildingCard(town, buildingId)).join("");
    ui.townRecruit.innerHTML = UNIT_ORDER.map((unitId) => renderTownRecruitCard(town, hero, unitId)).join("");

    const canBuildToday = town.lastBuildDay !== state.day;
    ui.townNotes.innerHTML = `
      <div><strong>День:</strong> ${state.day}</div>
      <div><strong>Будівництво:</strong> ${canBuildToday ? "Доступно" : "Ліміт вичерпано (1 споруда / день)"}</div>
      <div><strong>Порада:</strong> Спершу добудуй споруди вгору по ланцюгу, щоб відкрити сильніших юнітів.</div>
    `;
  }

  function renderBuildingCard(town, buildingId) {
    const building = TOWN_BUILDINGS[buildingId];
    const built = town.buildings.includes(buildingId);
    const canBuild = canBuildBuilding(town, buildingId);

    const costText = formatCost(building.cost);
    const reqText = building.requires.length
      ? `Потрібно: ${building.requires.map((id) => TOWN_BUILDINGS[id].name).join(", ")}`
      : "Потрібно: стартова споруда";

    if (built) {
      return `
        <div class="town-card">
          <div class="town-card-title">${escapeHtml(building.name)} (збудовано)</div>
          <div class="town-card-meta">${escapeHtml(building.description)}</div>
          <div class="town-card-meta">Відкриває: ${building.unlocks
            .map((unitId) => unitCatalog[unitId].name)
            .join(", ")}</div>
        </div>
      `;
    }

    return `
      <div class="town-card">
        <div class="town-card-title">${escapeHtml(building.name)}</div>
        <div class="town-card-meta">${escapeHtml(building.description)}</div>
        <div class="town-card-meta">${reqText}</div>
        <div class="town-card-meta">Вартість: ${costText}</div>
        <div class="town-card-actions">
          <button class="btn" data-build="${buildingId}" ${canBuild.ok ? "" : "disabled"}>Побудувати</button>
          ${canBuild.ok ? "" : `<span class=\"town-card-meta\">${escapeHtml(canBuild.reason)}</span>`}
        </div>
      </div>
    `;
  }

  function renderTownRecruitCard(town, hero, unitId) {
    const unit = unitCatalog[unitId];
    const amount = UNIT_BASE_RECRUIT_AMOUNT[unitId] || 1;
    const pool = town.recruitPool[unitId] || 0;

    const unlocked = isUnitUnlockedInTown(unitId, town);
    const totalCost = {
      gold: unit.cost.gold * amount,
      iron: unit.cost.iron * amount,
      grain: unit.cost.grain * amount
    };

    const resources = state.players[hero.playerId].resources;
    const enough =
      resources.gold >= totalCost.gold &&
      resources.iron >= totalCost.iron &&
      resources.grain >= totalCost.grain;

    const canRecruit = unlocked && pool >= amount && enough;
    let reason = "";

    if (!unlocked) {
      reason = `Потрібна споруда: ${TOWN_BUILDINGS[UNIT_REQUIRED_BUILDING[unitId]].name}`;
    } else if (pool < amount) {
      reason = "Мало резерву юнітів у місті";
    } else if (!enough) {
      reason = "Недостатньо ресурсів";
    }

    return `
      <div class="town-card">
        <div class="stack-card-header">
          <div class="stack-icon"><img src="${unit.icon}" alt=""></div>
          <div>
            <div class="town-card-title">${escapeHtml(unit.name)}</div>
            <div class="town-card-meta">Доступно в резерві: ${pool}</div>
          </div>
        </div>
        <div class="town-card-meta">Партія найму: ${amount} | Вартість: ${formatCost(totalCost)}</div>
        <div class="town-card-actions">
          <button class="btn" data-recruit="${unitId}" data-amount="${amount}" ${canRecruit ? "" : "disabled"}>
            Найняти ${amount}
          </button>
          ${canRecruit ? "" : `<span class=\"town-card-meta\">${escapeHtml(reason)}</span>`}
        </div>
      </div>
    `;
  }

  function canOpenTownScreen() {
    if (
      !state ||
      state.gameOver ||
      state.battle ||
      state.currentPlayerId !== state.humanPlayerId
    ) {
      return false;
    }

    return Boolean(getHumanTownUnderSelectedHero());
  }

  function getHumanTownUnderSelectedHero() {
    const hero = getSelectedHero();
    if (!hero || hero.playerId !== state.humanPlayerId) {
      return null;
    }

    const town = getObjectAt(hero.x, hero.y);
    if (!town || town.type !== "town" || town.owner !== state.humanPlayerId) {
      return null;
    }

    return town;
  }

  function handleTownBuildingClick(event) {
    const button = event.target.closest("[data-build]");
    if (!button || !state || !state.townScreen?.open) {
      return;
    }

    const buildingId = String(button.dataset.build);
    const town = getObjectById(state.townScreen.townId);
    if (!town || town.type !== "town") {
      return;
    }

    buildTownBuilding(town, buildingId, { isAi: false });
  }

  function buildTownBuilding(town, buildingId, options = {}) {
    const { isAi = false } = options;

    if (!town || town.type !== "town") {
      return false;
    }

    const ownerId = town.owner;
    if (state.currentPlayerId !== ownerId) {
      return false;
    }

    const gate = canBuildBuilding(town, buildingId);
    if (!gate.ok) {
      if (!isAi) {
        addLog(`Не можна будувати: ${gate.reason}.`);
      }
      return false;
    }

    const building = TOWN_BUILDINGS[buildingId];
    const resources = state.players[ownerId].resources;
    resources.gold -= building.cost.gold;
    resources.iron -= building.cost.iron;
    resources.grain -= building.cost.grain;

    town.buildings.push(buildingId);
    town.lastBuildDay = state.day;

    addLog(`${state.players[ownerId].name} будує: ${building.name}.`);
    renderAll();
    saveGameToStorage({ silent: true });
    return true;
  }

  function canBuildBuilding(town, buildingId) {
    const building = TOWN_BUILDINGS[buildingId];
    if (!building) {
      return { ok: false, reason: "Невідома споруда" };
    }

    if (town.buildings.includes(buildingId)) {
      return { ok: false, reason: "Вже збудовано" };
    }

    if (town.lastBuildDay === state.day) {
      return { ok: false, reason: "Цього дня вже будували" };
    }

    for (const reqId of building.requires) {
      if (!town.buildings.includes(reqId)) {
        return { ok: false, reason: `Потрібно: ${TOWN_BUILDINGS[reqId].name}` };
      }
    }

    const resources = state.players[town.owner].resources;
    if (
      resources.gold < building.cost.gold ||
      resources.iron < building.cost.iron ||
      resources.grain < building.cost.grain
    ) {
      return { ok: false, reason: "Недостатньо ресурсів" };
    }

    return { ok: true, reason: "" };
  }

  function handleTownRecruitClick(event) {
    const button = event.target.closest("[data-recruit]");
    if (!button || !state || !state.townScreen?.open) {
      return;
    }

    const unitId = String(button.dataset.recruit);
    const amount = Number(button.dataset.amount || "1");

    const town = getObjectById(state.townScreen.townId);
    const hero = getSelectedHero();

    if (!town || town.type !== "town" || !hero) {
      return;
    }

    recruitFromTown(hero, town, unitId, amount, { isAi: false });
  }

  function isUnitUnlockedInTown(unitId, town) {
    const required = UNIT_REQUIRED_BUILDING[unitId];
    if (!required) {
      return true;
    }
    return town.buildings.includes(required);
  }

  function formatCost(cost) {
    return `G:${cost.gold}, I:${cost.iron}, P:${cost.grain}`;
  }

  function renderLogPanel() {
    ui.logPanel.innerHTML = state.logs
      .slice(-14)
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");
    ui.logPanel.scrollTop = ui.logPanel.scrollHeight;
  }

  function renderBattle() {
    if (!state.battle) {
      ui.battleModal.classList.add("hidden");
      return;
    }

    ui.battleModal.classList.remove("hidden");
    const battle = state.battle;
    const active = getBattleStack(battle.activeToken);
    const activeName = active ? unitCatalog[active.unitId].name : "-";
    ui.battleStatus.textContent = `Активний: ${activeName} (${battle.activeToken ? sideLabel(battle.activeToken.side) : "-"})`;

    ui.attackerStacks.innerHTML = renderBattleStacks("attacker", battle.attackerStacks, battle);
    ui.defenderStacks.innerHTML = renderBattleStacks("defender", battle.defenderStacks, battle);
    ui.battleLog.innerHTML = battle.logs
      .slice(-12)
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");
    ui.battleLog.scrollTop = ui.battleLog.scrollHeight;
  }

  function renderBattleStacks(side, stacks, battle) {
    const activeToken = battle.activeToken;
    const canTarget =
      battle.waitingForInput &&
      activeToken &&
      activeToken.side === battle.humanSide &&
      activeToken.side !== side;

    return stacks
      .filter((stack) => stack.count > 0)
      .map((stack) => {
        const unit = unitCatalog[stack.unitId];
        const isActive =
          Boolean(activeToken) && activeToken.side === side && activeToken.uid === stack.uid;

        const className = [
          "stack-card",
          isActive ? "active" : "",
          canTarget ? "targetable" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <div class="${className}" data-side="${side}" data-uid="${stack.uid}">
            <div class="stack-card-header">
              <div class="stack-icon"><img src="${unit.icon}" alt=""></div>
              <div><strong>${unit.name}</strong></div>
            </div>
            Кількість: ${stack.count}<br>
            HP верхнього: ${stack.hp}/${unit.hp}<br>
            Швидкість: ${unit.speed}
          </div>
        `;
      })
      .join("");
  }

  function handleEndTurnClick() {
    if (!state || state.currentPlayerId !== state.humanPlayerId || state.gameOver || state.battle) {
      return;
    }
    runAiTurn();
  }

  function centerOnSelectedHero() {
    if (!state) {
      return;
    }

    const hero = getSelectedHero();
    if (!hero) {
      return;
    }

    const tile = document.getElementById(`tile-${hero.x}-${hero.y}`);
    if (tile) {
      tile.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }

  function onTileClick(x, y) {
    if (
      !state ||
      state.gameOver ||
      state.currentPlayerId !== state.humanPlayerId ||
      state.battle
    ) {
      return;
    }

    const clickedHero = getHeroAt(x, y);
    if (clickedHero && clickedHero.playerId === state.humanPlayerId) {
      state.selectedHeroId = clickedHero.id;
      closeTownScreen();
      renderAll();
      return;
    }

    const hero = getSelectedHero() || getPrimaryHero(state.humanPlayerId);
    if (!hero || !hero.alive || hero.playerId !== state.humanPlayerId) {
      return;
    }

    if (hero.movement <= 0) {
      addLog(`${hero.name} більше не має кроків цього ходу.`);
      renderAll();
      return;
    }

    const moved = moveHeroTo(hero, x, y, { isAi: false });
    if (!moved) {
      return;
    }

    state.selectedHeroId = hero.id;
    renderAll();
    checkEndConditions();
    saveGameToStorage({ silent: true });
  }

  function moveHeroTo(hero, targetX, targetY, options = {}) {
    const { isAi = false, stepLimit = null } = options;

    if (!hero.alive || !inBounds(targetX, targetY)) {
      return false;
    }

    const fullPath = findPath(hero.x, hero.y, targetX, targetY, hero.playerId);
    if (!fullPath || fullPath.length < 2) {
      return false;
    }

    const maxSteps = Math.min(hero.movement, stepLimit == null ? hero.movement : stepLimit);
    const path = fullPath.slice(0, maxSteps + 1);

    let didMove = false;
    for (let index = 1; index < path.length; index += 1) {
      const step = path[index];
      hero.x = step.x;
      hero.y = step.y;
      hero.movement -= 1;
      didMove = true;

      const encounter = resolveTileEntry(hero, { isAi });
      if (encounter !== "continue") {
        break;
      }
    }

    return didMove;
  }

  function resolveTileEntry(hero, options = {}) {
    const { isAi = false } = options;
    const enemyHero = getEnemyHeroAt(hero.x, hero.y, hero.playerId);

    if (enemyHero) {
      const battleContext = { type: "hero", defenderHeroId: enemyHero.id };
      if (!isAi && hero.playerId === state.humanPlayerId) {
        startInteractiveBattle(hero, enemyHero.army, battleContext);
      } else {
        resolveAutoBattle(hero, enemyHero.army, battleContext);
      }
      return "battle";
    }

    const tileObject = getObjectAt(hero.x, hero.y);
    if (!tileObject) {
      return "continue";
    }

    if (tileObject.type === "mine") {
      if (tileObject.guard.length > 0) {
        const battleContext = { type: "mine", objectId: tileObject.id };
        if (!isAi && hero.playerId === state.humanPlayerId) {
          startInteractiveBattle(hero, tileObject.guard, battleContext);
        } else {
          resolveAutoBattle(hero, tileObject.guard, battleContext);
        }
        return "battle";
      }

      if (tileObject.owner !== hero.playerId) {
        tileObject.owner = hero.playerId;
        addLog(`${hero.name} захоплює шахту.`);
      }
    }

    if (tileObject.type === "town" && tileObject.owner !== hero.playerId) {
      if (tileObject.garrison.length > 0) {
        const battleContext = { type: "town", objectId: tileObject.id };
        if (!isAi && hero.playerId === state.humanPlayerId) {
          startInteractiveBattle(hero, tileObject.garrison, battleContext);
        } else {
          resolveAutoBattle(hero, tileObject.garrison, battleContext);
        }
        return "battle";
      }

      tileObject.owner = hero.playerId;
      addLog(`${hero.name} захоплює вороже місто.`);
    }

    return "continue";
  }

  function startInteractiveBattle(attackerHero, defenderArmy, context) {
    closeTownScreen();

    state.battle = {
      attackerHeroId: attackerHero.id,
      attackerStacks: cloneArmy(attackerHero.army),
      defenderStacks: cloneArmy(defenderArmy),
      context,
      logs: [],
      queue: [],
      activeToken: null,
      waitingForInput: false,
      humanSide: "attacker"
    };

    addBattleLog(`${attackerHero.name} вступає в бій.`);
    prepareNextBattleTurn();
    renderAll();
  }

  function resolveAutoBattle(attackerHero, defenderArmy, context) {
    const outcome = runAutoBattle(cloneArmy(attackerHero.army), cloneArmy(defenderArmy));
    attackerHero.army = compactArmy(outcome.attackerStacks);

    if (outcome.winner === "attacker") {
      addLog(`${attackerHero.name} перемагає у швидкому бою.`);
      applyDefenderOutcome(context, true, compactArmy(outcome.defenderStacks), attackerHero);
    } else {
      addLog(`${attackerHero.name} зазнає поразки.`);
      attackerHero.alive = false;
      applyDefenderOutcome(context, false, compactArmy(outcome.defenderStacks), attackerHero);
    }

    checkEndConditions();
  }

  function runAutoBattle(attackerStacks, defenderStacks) {
    let rounds = 0;

    while (hasAliveStacks(attackerStacks) && hasAliveStacks(defenderStacks) && rounds < 50) {
      rounds += 1;
      const order = buildTurnOrder(attackerStacks, defenderStacks);

      for (const token of order) {
        const actor =
          token.side === "attacker"
            ? findStack(attackerStacks, token.uid)
            : findStack(defenderStacks, token.uid);

        if (!actor || actor.count <= 0) {
          continue;
        }

        const targetPool = token.side === "attacker" ? defenderStacks : attackerStacks;
        const target = chooseBattleTarget(targetPool);
        if (!target) {
          break;
        }

        const damage = calculateDamage(actor, target);
        applyDamage(target, damage);
      }
    }

    return {
      winner: hasAliveStacks(attackerStacks) ? "attacker" : "defender",
      attackerStacks,
      defenderStacks
    };
  }

  function buildTurnOrder(attackerStacks, defenderStacks) {
    const tokens = [];

    attackerStacks.forEach((stack) => {
      if (stack.count > 0) {
        const unit = unitCatalog[stack.unitId];
        tokens.push({ side: "attacker", uid: stack.uid, speed: unit.speed, attack: unit.attack });
      }
    });

    defenderStacks.forEach((stack) => {
      if (stack.count > 0) {
        const unit = unitCatalog[stack.unitId];
        tokens.push({ side: "defender", uid: stack.uid, speed: unit.speed, attack: unit.attack });
      }
    });

    return tokens.sort((left, right) => right.speed - left.speed || right.attack - left.attack);
  }

  function prepareNextBattleTurn() {
    const battle = state.battle;
    if (!battle) {
      return;
    }

    if (!hasAliveStacks(battle.attackerStacks) || !hasAliveStacks(battle.defenderStacks)) {
      finalizeInteractiveBattle();
      return;
    }

    if (battle.queue.length === 0) {
      battle.queue = buildTurnOrder(battle.attackerStacks, battle.defenderStacks).map((token) => ({
        side: token.side,
        uid: token.uid
      }));
    }

    const nextToken = battle.queue.shift();
    const activeStack = getBattleStack(nextToken);
    if (!activeStack || activeStack.count <= 0) {
      prepareNextBattleTurn();
      return;
    }

    battle.activeToken = nextToken;
    battle.waitingForInput = nextToken.side === battle.humanSide;
    renderBattle();

    if (!battle.waitingForInput) {
      window.setTimeout(() => {
        performAiBattleAction();
      }, 450);
    }
  }

  function performAiBattleAction() {
    const battle = state.battle;
    if (!battle || !battle.activeToken) {
      return;
    }

    const attackerToken = battle.activeToken;
    const targetSide = attackerToken.side === "attacker" ? "defender" : "attacker";
    const targetPool = targetSide === "attacker" ? battle.attackerStacks : battle.defenderStacks;
    const target = chooseBattleTarget(targetPool);

    if (!target) {
      prepareNextBattleTurn();
      return;
    }

    executeBattleAttack(attackerToken, { side: targetSide, uid: target.uid });
  }

  function handleStackClick(event) {
    const card = event.target.closest(".stack-card");
    if (!card || !state || !state.battle) {
      return;
    }

    const side = String(card.dataset.side);
    const uid = String(card.dataset.uid);
    const battle = state.battle;
    const activeToken = battle.activeToken;

    if (
      !battle.waitingForInput ||
      !activeToken ||
      activeToken.side !== battle.humanSide ||
      side === activeToken.side
    ) {
      return;
    }

    executeBattleAttack(activeToken, { side, uid });
  }

  function onDefendClicked() {
    if (!state || !state.battle || !state.battle.waitingForInput || !state.battle.activeToken) {
      return;
    }

    const activeStack = getBattleStack(state.battle.activeToken);
    if (activeStack) {
      const unit = unitCatalog[activeStack.unitId];
      addBattleLog(`${unit.name} утримує позицію.`);
    }

    state.battle.waitingForInput = false;
    window.setTimeout(() => {
      prepareNextBattleTurn();
    }, 250);
  }

  function executeBattleAttack(attackerToken, targetToken) {
    const battle = state.battle;
    if (!battle) {
      return;
    }

    const attackerStack = getBattleStack(attackerToken);
    const defenderStack = getBattleStack(targetToken);
    if (!attackerStack || !defenderStack) {
      prepareNextBattleTurn();
      return;
    }

    const attackerUnit = unitCatalog[attackerStack.unitId];
    const defenderUnit = unitCatalog[defenderStack.unitId];

    const damage = calculateDamage(attackerStack, defenderStack);
    const beforeCount = defenderStack.count;
    applyDamage(defenderStack, damage);
    const losses = Math.max(0, beforeCount - defenderStack.count);

    addBattleLog(`${attackerUnit.name} б'є по ${defenderUnit.name}: ${damage} шкоди (${losses} втрат).`);

    battle.waitingForInput = false;
    renderBattle();
    window.setTimeout(() => {
      prepareNextBattleTurn();
    }, 350);
  }

  function finalizeInteractiveBattle() {
    const battle = state.battle;
    if (!battle) {
      return;
    }

    const attackerHero = getHeroById(battle.attackerHeroId);
    const attackerWon = hasAliveStacks(battle.attackerStacks);

    if (attackerHero) {
      attackerHero.army = compactArmy(battle.attackerStacks);
    }

    if (!attackerWon && attackerHero) {
      attackerHero.alive = false;
      addLog(`${attackerHero.name} впав у бою.`);
    }

    applyDefenderOutcome(
      battle.context,
      attackerWon,
      compactArmy(battle.defenderStacks),
      attackerHero
    );

    if (attackerWon && attackerHero) {
      addLog(`${attackerHero.name} перемагає в битві.`);
    }

    state.battle = null;
    renderAll();
    checkEndConditions();
    saveGameToStorage({ silent: true });
  }

  function applyDefenderOutcome(context, attackerWon, defenderSurvivors, attackerHero) {
    if (!context) {
      return;
    }

    if (context.type === "hero") {
      const defenderHero = getHeroById(context.defenderHeroId);
      if (!defenderHero) {
        return;
      }

      if (attackerWon) {
        defenderHero.alive = false;
        addLog(`${defenderHero.name} був розбитий.`);
      } else {
        defenderHero.army = compactArmy(defenderSurvivors);
      }
      return;
    }

    if (context.type === "mine") {
      const mine = getObjectById(context.objectId);
      if (!mine) {
        return;
      }

      if (attackerWon && attackerHero) {
        mine.guard = [];
        mine.owner = attackerHero.playerId;
        addLog(`${attackerHero.name} захоплює шахту.`);
      } else {
        mine.guard = compactArmy(defenderSurvivors);
      }
      return;
    }

    if (context.type === "town") {
      const town = getObjectById(context.objectId);
      if (!town) {
        return;
      }

      if (attackerWon && attackerHero) {
        town.garrison = [];
        town.owner = attackerHero.playerId;
        addLog(`${attackerHero.name} захоплює місто.`);
      } else {
        town.garrison = compactArmy(defenderSurvivors);
      }
    }
  }

  async function runAiTurn() {
    state.currentPlayerId = state.aiPlayerId;
    resetMovement(state.aiPlayerId);
    addLog(`Починається хід AI: ${state.players[state.aiPlayerId].name}.`);
    closeTownScreen();
    renderAll();
    await sleep(350);

    runAiTownManagement();
    await sleep(180);

    const hero = getPrimaryHero(state.aiPlayerId);
    if (hero && hero.alive) {
      while (hero.movement > 0 && hero.alive && !state.gameOver) {
        const target = chooseAiTarget(hero);
        if (!target) {
          break;
        }

        const path = findPath(hero.x, hero.y, target.x, target.y, hero.playerId);
        if (!path || path.length < 2) {
          break;
        }

        moveHeroTo(hero, path[1].x, path[1].y, { isAi: true, stepLimit: 1 });
        renderAll();
        if (!hero.alive || state.gameOver) {
          break;
        }

        await sleep(280);
      }
    }

    if (!state.gameOver) {
      startNewDay();
      state.currentPlayerId = state.humanPlayerId;
      resetMovement(state.humanPlayerId);
      addLog("Ваш хід.");

      const humanHero = getPrimaryHero(state.humanPlayerId);
      if (humanHero && humanHero.alive) {
        state.selectedHeroId = humanHero.id;
      }

      renderAll();
      saveGameToStorage({ silent: true });
    }
  }

  function runAiTownManagement() {
    const aiHero = getPrimaryHero(state.aiPlayerId);
    if (!aiHero || !aiHero.alive) {
      return;
    }

    const town = getObjectAt(aiHero.x, aiHero.y);
    if (!town || town.type !== "town" || town.owner !== state.aiPlayerId) {
      return;
    }

    const toBuild = BUILDING_ORDER.find((buildingId) => canBuildBuilding(town, buildingId).ok);
    if (toBuild) {
      buildTownBuilding(town, toBuild, { isAi: true });
    }

    for (const unitId of UNIT_ORDER) {
      const amount = UNIT_BASE_RECRUIT_AMOUNT[unitId] || 1;
      recruitFromTown(aiHero, town, unitId, amount, { isAi: true, silent: true, skipRender: true });
    }

    renderAll();
  }

  function chooseAiTarget(hero) {
    const candidates = [];
    const humanHero = getPrimaryHero(state.humanPlayerId);

    if (humanHero && humanHero.alive) {
      candidates.push({ x: humanHero.x, y: humanHero.y, priority: 0 });
    }

    state.objects
      .filter((object) => object.type === "mine" && object.owner !== hero.playerId)
      .forEach((mine) => candidates.push({ x: mine.x, y: mine.y, priority: 1 }));

    state.objects
      .filter((object) => object.type === "town" && object.owner !== hero.playerId)
      .forEach((town) => candidates.push({ x: town.x, y: town.y, priority: 2 }));

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const path = findPath(hero.x, hero.y, candidate.x, candidate.y, hero.playerId);
      if (!path) {
        continue;
      }

      const score = candidate.priority * 100 + path.length;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return best;
  }

  function recruitFromTown(hero, town, unitId, amount, options = {}) {
    const { isAi = false, silent = false, skipRender = false } = options;

    if (
      !state ||
      !hero ||
      !town ||
      town.type !== "town" ||
      state.gameOver ||
      state.battle
    ) {
      return false;
    }

    if (hero.playerId !== town.owner || state.currentPlayerId !== hero.playerId) {
      return false;
    }

    if (hero.x !== town.x || hero.y !== town.y) {
      return false;
    }

    const unit = unitCatalog[unitId];
    if (!unit) {
      return false;
    }

    if (!isUnitUnlockedInTown(unitId, town)) {
      if (!silent && !isAi) {
        addLog(`Недоступно: потрібна споруда ${TOWN_BUILDINGS[UNIT_REQUIRED_BUILDING[unitId]].name}.`);
      }
      return false;
    }

    const pool = town.recruitPool[unitId] || 0;
    if (pool < amount) {
      if (!silent && !isAi) {
        addLog("Недостатньо істот у резерві міста.");
      }
      if (!skipRender) {
        renderAll();
      }
      return false;
    }

    const totalCost = {
      gold: unit.cost.gold * amount,
      iron: unit.cost.iron * amount,
      grain: unit.cost.grain * amount
    };

    const resources = state.players[hero.playerId].resources;
    if (
      resources.gold < totalCost.gold ||
      resources.iron < totalCost.iron ||
      resources.grain < totalCost.grain
    ) {
      if (!silent && !isAi) {
        addLog("Недостатньо ресурсів для найму.");
      }
      if (!skipRender) {
        renderAll();
      }
      return false;
    }

    resources.gold -= totalCost.gold;
    resources.iron -= totalCost.iron;
    resources.grain -= totalCost.grain;
    town.recruitPool[unitId] -= amount;

    const existing = hero.army.find((stack) => stack.unitId === unitId);
    if (existing) {
      existing.count += amount;
      if (existing.hp <= 0) {
        existing.hp = unit.hp;
      }
    } else {
      hero.army.push(makeStack(unitId, amount));
    }

    if (!silent) {
      addLog(`${hero.name} наймає ${amount} x ${unit.name}.`);
    }

    if (!skipRender) {
      renderAll();
      saveGameToStorage({ silent: true });
    }

    return true;
  }

  function startNewDay() {
    state.day += 1;

    Object.values(state.players).forEach((player) => {
      const income = getIncomeForPlayer(player.id);
      player.resources.gold += income.gold;
      player.resources.iron += income.iron;
      player.resources.grain += income.grain;
    });

    state.objects
      .filter((object) => object.type === "town")
      .forEach((town) => {
        Object.keys(town.growth).forEach((unitId) => {
          if (isUnitUnlockedInTown(unitId, town)) {
            town.recruitPool[unitId] += town.growth[unitId];
          }
        });
      });

    addLog(`Починається день ${state.day}. Надходять щоденні ресурси.`);
  }

  function getIncomeForPlayer(playerId) {
    const base = state.players[playerId].baseIncome;
    const mineCount = state.objects.filter((object) => object.type === "mine" && object.owner === playerId)
      .length;

    return {
      gold: base.gold + mineCount * 170,
      iron: base.iron + mineCount,
      grain: base.grain + mineCount
    };
  }

  function resetMovement(playerId) {
    state.heroes.forEach((hero) => {
      if (hero.playerId === playerId && hero.alive) {
        hero.movement = HERO_MAX_MOVEMENT;
      }
    });
  }

  function findPath(startX, startY, targetX, targetY, moverPlayerId) {
    if (!inBounds(startX, startY) || !inBounds(targetX, targetY)) {
      return null;
    }

    const startKey = `${startX},${startY}`;
    const targetKey = `${targetX},${targetY}`;
    const queue = [{ x: startX, y: startY }];
    const cameFrom = new Map([[startKey, null]]);

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      const currentKey = `${current.x},${current.y}`;
      if (currentKey === targetKey) {
        break;
      }

      for (const direction of directions) {
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;
        const nextKey = `${nextX},${nextY}`;

        if (!inBounds(nextX, nextY) || cameFrom.has(nextKey)) {
          continue;
        }

        if (!isPassable(nextX, nextY, moverPlayerId, targetX, targetY)) {
          continue;
        }

        cameFrom.set(nextKey, currentKey);
        queue.push({ x: nextX, y: nextY });
      }
    }

    if (!cameFrom.has(targetKey)) {
      return null;
    }

    const path = [];
    let currentKey = targetKey;
    while (currentKey) {
      const [xStr, yStr] = currentKey.split(",");
      path.push({ x: Number(xStr), y: Number(yStr) });
      currentKey = cameFrom.get(currentKey) || null;
    }

    path.reverse();
    return path;
  }

  function isPassable(x, y, moverPlayerId, targetX, targetY) {
    const hero = getHeroAt(x, y);
    if (!hero || !hero.alive) {
      return true;
    }

    if (hero.playerId === moverPlayerId) {
      return true;
    }

    return x === targetX && y === targetY;
  }

  function isReachable(hero, x, y) {
    if (hero.x === x && hero.y === y) {
      return false;
    }

    const path = findPath(hero.x, hero.y, x, y, hero.playerId);
    if (!path) {
      return false;
    }

    return path.length - 1 <= hero.movement;
  }

  function calculateDamage(attackerStack, defenderStack) {
    const attacker = unitCatalog[attackerStack.unitId];
    const defender = unitCatalog[defenderStack.unitId];

    const perUnit = randomInt(attacker.minDamage, attacker.maxDamage);
    const base = perUnit * attackerStack.count;
    const modifier = clamp(1 + (attacker.attack - defender.defense) * 0.05, 0.35, 2.2);
    return Math.max(1, Math.round(base * modifier));
  }

  function applyDamage(stack, damage) {
    const unit = unitCatalog[stack.unitId];
    const totalHp = stackTotalHp(stack);
    const remaining = totalHp - damage;

    if (remaining <= 0) {
      stack.count = 0;
      stack.hp = 0;
      return;
    }

    const nextCount = Math.ceil(remaining / unit.hp);
    const currentHp = remaining - (nextCount - 1) * unit.hp;
    stack.count = nextCount;
    stack.hp = currentHp;
  }

  function stackTotalHp(stack) {
    if (stack.count <= 0) {
      return 0;
    }

    const unit = unitCatalog[stack.unitId];
    return (stack.count - 1) * unit.hp + stack.hp;
  }

  function chooseBattleTarget(stacks) {
    const alive = stacks.filter((stack) => stack.count > 0);
    if (alive.length === 0) {
      return null;
    }

    alive.sort((left, right) => stackTotalHp(left) - stackTotalHp(right));
    return alive[0];
  }

  function getBattleStack(token) {
    if (!state.battle || !token) {
      return null;
    }

    const pool = token.side === "attacker" ? state.battle.attackerStacks : state.battle.defenderStacks;
    return findStack(pool, token.uid);
  }

  function findStack(stacks, uid) {
    return stacks.find((stack) => stack.uid === uid) || null;
  }

  function hasAliveStacks(stacks) {
    return stacks.some((stack) => stack.count > 0);
  }

  function checkEndConditions() {
    const humanAlive = state.heroes.some((hero) => hero.playerId === state.humanPlayerId && hero.alive);
    const aiAlive = state.heroes.some((hero) => hero.playerId === state.aiPlayerId && hero.alive);

    if (!humanAlive) {
      showEndgame("Поразка", "Ваш герой загинув. Кампанія програна.");
      return true;
    }

    if (!aiAlive) {
      showEndgame("Перемога", "Ворожий герой переможений. Ви здобули трон.");
      return true;
    }

    return false;
  }

  function showEndgame(title, text) {
    state.gameOver = true;
    closeTownScreen();
    ui.endgameTitle.textContent = title;
    ui.endgameText.textContent = text;
    ui.endgameModal.classList.remove("hidden");
    ui.battleModal.classList.add("hidden");
    refreshGlobalButtons();
  }

  function getSelectedHero() {
    if (!state) {
      return null;
    }

    const hero = getHeroById(state.selectedHeroId);
    if (!hero || !hero.alive) {
      return getPrimaryHero(state.currentPlayerId);
    }

    return hero;
  }

  function getPrimaryHero(playerId) {
    return state.heroes.find((hero) => hero.playerId === playerId && hero.alive) || null;
  }

  function getHeroById(heroId) {
    return state.heroes.find((hero) => hero.id === heroId) || null;
  }

  function getHeroAt(x, y) {
    return state.heroes.find((hero) => hero.alive && hero.x === x && hero.y === y) || null;
  }

  function getEnemyHeroAt(x, y, playerId) {
    return (
      state.heroes.find(
        (hero) => hero.alive && hero.playerId !== playerId && hero.x === x && hero.y === y
      ) || null
    );
  }

  function getObjectAt(x, y) {
    return state.objects.find((object) => object.x === x && object.y === y) || null;
  }

  function getObjectById(id) {
    return state.objects.find((object) => object.id === id) || null;
  }

  function getFactionKeyByPlayerId(playerId) {
    const player = state.players[playerId];
    return player ? player.key : null;
  }

  function addLog(text) {
    state.logs.push(`[D${state.day}] ${text}`);
    if (state.logs.length > 80) {
      state.logs.shift();
    }

    renderLogPanel();
  }

  function addBattleLog(text) {
    if (!state.battle) {
      return;
    }

    state.battle.logs.push(text);
    if (state.battle.logs.length > 80) {
      state.battle.logs.shift();
    }

    renderBattle();
  }

  function hasSavedGame() {
    try {
      return Boolean(window.localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  function saveGameToStorage(options = {}) {
    const { silent = false } = options;

    if (!state) {
      return false;
    }

    if (state.battle) {
      if (!silent) {
        addLog("Під час бою збереження вимкнено.");
      }
      return false;
    }

    const snapshot = {
      version: 2,
      stackUid,
      savedAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state))
    };

    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      if (!silent) {
        addLog("Гру збережено в localStorage.");
      }
      refreshGlobalButtons();
      return true;
    } catch {
      if (!silent) {
        addLog("Помилка збереження (localStorage недоступний)." );
      }
      refreshGlobalButtons();
      return false;
    }
  }

  function loadGameFromStorage(options = {}) {
    const { fromSetup = false } = options;

    let raw = null;
    try {
      raw = window.localStorage.getItem(SAVE_KEY);
    } catch {
      raw = null;
    }

    if (!raw) {
      if (state) {
        addLog("Сейв не знайдено.");
      } else {
        window.alert("Сейв не знайдено.");
      }
      refreshGlobalButtons();
      return false;
    }

    let snapshot = null;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      if (state) {
        addLog("Сейв пошкоджений.");
      } else {
        window.alert("Сейв пошкоджений.");
      }
      return false;
    }

    if (!snapshot || !snapshot.state || !snapshot.state.map || !snapshot.state.players) {
      if (state) {
        addLog("Сейв некоректний.");
      } else {
        window.alert("Сейв некоректний.");
      }
      return false;
    }

    state = snapshot.state;
    stackUid = Number(snapshot.stackUid) || stackUid;

    if (!state.townScreen) {
      state.townScreen = { open: false, townId: null };
    }

    if (state.battle) {
      state.battle = null;
    }

    ui.setupModal.classList.add("hidden");
    ui.gameRoot.classList.remove("hidden");
    ui.endgameModal.classList.add("hidden");

    if (fromSetup) {
      addLog("Сейв завантажено.");
    } else {
      addLog("Гру завантажено з localStorage.");
    }

    closeTownScreen();
    renderAll();
    refreshGlobalButtons();
    return true;
  }

  function sideLabel(side) {
    return side === "attacker" ? "Атакуючий" : "Оборонець";
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function inBounds(x, y) {
    return x >= 0 && x < state.map.width && y >= 0 && y < state.map.height;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
