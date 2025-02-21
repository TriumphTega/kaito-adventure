import { useState, useCallback, useEffect, useMemo } from "react";
import Head from "next/head";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  ListGroup,
  Modal,
  Form,
  ProgressBar,
} from "react-bootstrap";
import styles from '../styles/Combat.module.css';
import debounce from 'lodash/debounce';

// --- Player State Management ---
// Purpose: Defines the initial player state, including new features like xp, level, equipment, etc.
// Integration: This is the core state object saved to localStorage and synced with server later.
const defaultPlayer = {
  name: "Kaito Brewmaster",
  gold: 5,
  health: 100,
  xp: 0, // Experience points for leveling
  level: 1, // Current player level
  inventory: [
    { name: "Water", quantity: 2 },
    { name: "Herbs", quantity: 1 },
  ],
  recipes: [
    { name: "Herbal Tea", ingredients: ["Water", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Spicy Sake", ingredients: ["Water", "Pepper"], type: "sell", baseGold: 20 },
    { name: "Mist Potion", ingredients: ["Mist Essence", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Weak Healing Potion", ingredients: ["Water", "Herbs"], type: "heal", healAmount: 20 },
    { name: "Medium Healing Potion", ingredients: ["Water", "Mist Essence"], type: "heal", healAmount: 40 },
    { name: "Strong Healing Potion", ingredients: ["Mist Essence", "Shadow Root"], type: "heal", healAmount: 60 },
    { name: "Combat Blade", ingredients: ["Pepper", "Shadow Root"], type: "equip", bonus: { damage: 5 } }, // New equipment recipe
  ],
  equipment: { weapon: null }, // Equipped items (e.g., { weapon: "Combat Blade" })
  quests: [], // Active quests (e.g., { id, description, progress, reward })
  skills: [], // Unlocked combat skills (e.g., { name, levelReq, effect })
  stats: { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 }, // Lifetime stats
  lastLogin: null, // Tracks daily rewards
  dailyTasks: [], // Daily challenges (e.g., { description, progress, reward, completed })
};

export default function Home() {
  // --- State Initialization ---
  // Purpose: Sets up all game states, memoized where possible for performance.
  // Integration: Junior devs can add new states here; ensure they’re saved in localStorage below.
  const defaultPlayerMemo = useMemo(() => defaultPlayer, []);
  const [player, setPlayer] = useState(defaultPlayerMemo);
  const [currentTown, setCurrentTown] = useState("Sakura Village");
  const [gameMessage, setGameMessage] = useState("Welcome to Kaito's Adventure!");
  const [showCraftModal, setShowCraftModal] = useState(false);
  const [showHealingModal, setShowHealingModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showGatherModal, setShowGatherModal] = useState(false);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showQuestsModal, setShowQuestsModal] = useState(false); // New: Quests modal
  const [showDailyModal, setShowDailyModal] = useState(false); // New: Daily rewards modal
  const [showStatsModal, setShowStatsModal] = useState(false); // New: Stats modal
  const [showCommunityModal, setShowCommunityModal] = useState(false); // New: Community modal
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lastGatherTimes, setLastGatherTimes] = useState({});
  const [lastQueuedGatherTime, setLastQueuedGatherTime] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [queuedCountdown, setQueuedCountdown] = useState(null);
  const [combatState, setCombatState] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [townLevels, setTownLevels] = useState({ "Sakura Village": 1, "Iron Port": 1, "Mist Hollow": 1 }); // New: Town progression

  const towns = useMemo(() => [
    {
      name: "Sakura Village",
      ingredients: ["Water", "Herbs"],
      gatherCooldown: 1,
      rewardMultiplier: 1,
      demand: { "Herbal Tea": 1.0, "Spicy Sake": 0.8, "Mist Potion": 0.5 },
      npcOffers: [{ ingredient: "Pepper", price: 5 }, { ingredient: "Mist Essence", price: 7 }],
    },
    {
      name: "Iron Port",
      ingredients: ["Pepper", "Sugar"],
      gatherCooldown: 2,
      rewardMultiplier: 2,
      demand: { "Herbal Tea": 0.7, "Spicy Sake": 1.2, "Mist Potion": 0.9 },
      npcOffers: [{ ingredient: "Water", price: 5 }, { ingredient: "Shadow Root", price: 8 }],
    },
    {
      name: "Mist Hollow",
      ingredients: ["Mist Essence", "Shadow Root"],
      gatherCooldown: 3,
      rewardMultiplier: 4,
      demand: { "Herbal Tea": 0.6, "Spicy Sake": 0.9, "Mist Potion": 1.5 },
      npcOffers: [{ ingredient: "Herbs", price: 6 }, { ingredient: "Sugar", price: 5 }],
    },
  ], []);
  const allIngredients = useMemo(() => ["Water", "Herbs", "Pepper", "Sugar", "Mist Essence", "Shadow Root"], []);

  // --- Local Storage Load ---
  // Purpose: Fetches all game state from localStorage on mount, ensuring persistence across sessions.
  // Integration: Add new states here to load them; they must match saveToLocalStorage keys.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlayer = localStorage.getItem("player");
      if (savedPlayer) setPlayer(JSON.parse(savedPlayer)); // Loads xp, level, inventory, etc.

      const savedTown = localStorage.getItem("currentTown");
      if (savedTown) setCurrentTown(savedTown);

      const savedGatherTimes = localStorage.getItem("lastGatherTimes");
      if (savedGatherTimes) setLastGatherTimes(JSON.parse(savedGatherTimes));

      const savedQueuedTime = localStorage.getItem("lastQueuedGatherTime");
      if (savedQueuedTime) setLastQueuedGatherTime(parseInt(savedQueuedTime, 10));

      const savedTownLevels = localStorage.getItem("townLevels");
      if (savedTownLevels) setTownLevels(JSON.parse(savedTownLevels));
    }
  }, []);

  // --- Local Storage Save ---
  // Purpose: Saves all game state to localStorage with debouncing to avoid excessive writes.
  // Integration: Ensure all states (e.g., player, townLevels) are saved here for persistence.
  const saveToLocalStorage = useCallback(
    debounce(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("player", JSON.stringify(player)); // Saves xp, level, quests, etc.
        localStorage.setItem("currentTown", currentTown);
        localStorage.setItem("lastGatherTimes", JSON.stringify(lastGatherTimes));
        localStorage.setItem("lastQueuedGatherTime", lastQueuedGatherTime ? lastQueuedGatherTime.toString() : null);
        localStorage.setItem("townLevels", JSON.stringify(townLevels));
      }
    }, 500),
    [player, currentTown, lastGatherTimes, lastQueuedGatherTime, townLevels]
  );

  useEffect(() => {
    saveToLocalStorage();
    return () => saveToLocalStorage.cancel();
  }, [player, currentTown, lastGatherTimes, lastQueuedGatherTime, townLevels, saveToLocalStorage]);

  // --- Leaderboard and Server Prep ---
  // Purpose: Simulates fetching leaderboard data; preps for server sync by mocking API calls.
  // Integration: Replace mock data with real fetch("/api/leaderboard") when server is ready.
  const fetchLeaderboardData = useCallback(() => {
    const mockPlayers = [
      { name: "Kaito", level: player.level, gold: player.gold },
      { name: "Shinobi", level: Math.floor(Math.random() * 10) + 1, gold: Math.floor(Math.random() * 100) },
      { name: "Aiko", level: Math.floor(Math.random() * 10) + 1, gold: Math.floor(Math.random() * 100) },
      { name: "Ryu", level: Math.floor(Math.random() * 10) + 1, gold: Math.floor(Math.random() * 100) },
    ].sort((a, b) => b.level - a.level || b.gold - a.gold);
    setLeaderboardData(mockPlayers.slice(0, 4));
    // Future: fetch("/api/leaderboard").then(res => setLeaderboardData(res.data));
  }, [player.level, player.gold]);

  useEffect(() => {
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  // --- XP and Leveling System ---
  // Purpose: Manages XP gains and level progression; saved in player state.
  // Integration: Call updateXP wherever XP is earned (e.g., combat, crafting).
  const updateXP = useCallback((xpGain) => {
    setPlayer((prev) => {
      const newXP = prev.xp + xpGain;
      const newLevel = Math.floor(newXP / 100) + 1;
      return { ...prev, xp: newXP, level: newLevel };
    });
  }, []);

  const xpProgress = useMemo(() => {
    const xpForNextLevel = 100;
    return Math.min((player.xp % xpForNextLevel) / xpForNextLevel * 100, 100);
  }, [player.xp]);

  // --- Quests/Missions ---
  // Purpose: Adds NPC-driven quests for goals and rewards; stored in player.quests.
  // Integration: Call addQuest to assign new quests; update progress in action functions.
  const addQuest = useCallback(() => {
    const questsList = [
      { id: "gatherHerbs", description: "Gather 5 Herbs", progress: 0, target: 5, reward: { gold: 50, xp: 50 } },
      { id: "defeatBandits", description: "Defeat 3 Bandits", progress: 0, target: 3, reward: { gold: 75, xp: 75 } },
    ];
    const newQuest = questsList[Math.floor(Math.random() * questsList.length)];
    setPlayer((prev) => ({
      ...prev,
      quests: prev.quests.length < 3 ? [...prev.quests, newQuest] : prev.quests, // Max 3 active quests
    }));
  }, []);

  const completeQuest = useCallback((questId) => {
    setPlayer((prev) => {
      const quest = prev.quests.find((q) => q.id === questId);
      if (!quest || quest.progress < quest.target) return prev;
      return {
        ...prev,
        gold: prev.gold + quest.reward.gold,
        xp: prev.xp + quest.reward.xp,
        level: Math.floor((prev.xp + quest.reward.xp) / 100) + 1,
        quests: prev.quests.filter((q) => q.id !== questId),
      };
    });
    setGameMessage(`Quest completed!`);
  }, []);

  // --- Equipment/Upgrades ---
  // Purpose: Allows crafting and equipping gear for bonuses; stored in player.equipment.
  // Integration: Equip via inventory UI; apply bonuses in combat/healing logic.
  const equipItem = useCallback((itemName) => {
    setPlayer((prev) => {
      const item = prev.recipes.find((r) => r.name === itemName && r.type === "equip");
      if (!item) return prev;
      return { ...prev, equipment: { weapon: itemName } };
    });
  }, []);

  // --- Town Progression ---
  // Purpose: Levels up towns based on activity; affects NPC offers and rewards.
  // Integration: Update town levels in sellDrink or other town interactions.
  const upgradeTown = useCallback((townName, salesCount) => {
    if (salesCount >= 10) {
      setTownLevels((prev) => ({
        ...prev,
        [townName]: Math.min(prev[townName] + 1, 3), // Max level 3
      }));
    }
  }, []);

  // --- Combat Skills/Abilities ---
  // Purpose: Unlocks skills at levels; used in combat for effects.
  // Integration: Add skills here; trigger in combat modal via buttons.
  const availableSkills = useMemo(() => [
    { name: "Healing Strike", levelReq: 3, effect: { heal: 10, damage: 0 } },
    { name: "Power Slash", levelReq: 5, effect: { heal: 0, damage: 15 } },
  ], []);

  useEffect(() => {
    setPlayer((prev) => ({
      ...prev,
      skills: availableSkills.filter((skill) => prev.level >= skill.levelReq && !prev.skills.some((s) => s.name === skill.name)),
    }));
  }, [player.level, availableSkills]);

  const useSkill = useCallback((skillName) => {
    const skill = player.skills.find((s) => s.name === skillName);
    if (!skill || !combatState) return;
    setCombatState((prev) => ({
      ...prev,
      playerHealth: Math.min(prev.playerHealth + skill.effect.heal, player.health),
      enemyHealth: Math.max(prev.enemyHealth - skill.effect.damage, 0),
      log: [...prev.log, `Kaito uses ${skillName}!`],
    }));
  }, [combatState, player.health, player.skills]);

  // --- Daily Rewards/Challenges ---
  // Purpose: Gives daily bonuses and tasks; tracks lastLogin and dailyTasks.
  // Integration: Check daily reset in UI; update tasks in actions.
  const checkDailyReset = useCallback(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (!player.lastLogin || now - player.lastLogin > oneDay) {
      setPlayer((prev) => ({
        ...prev,
        lastLogin: now,
        gold: prev.gold + 20, // Daily login bonus
        dailyTasks: [
          { description: "Craft 3 potions", progress: 0, target: 3, reward: { xp: 50 }, completed: false },
          { id: "defeatEnemies", description: "Defeat 2 enemies", progress: 0, target: 2, reward: { gold: 30 }, completed: false },
        ],
      }));
    }
  }, [player.lastLogin]);

  const completeDailyTask = useCallback((taskId) => {
    setPlayer((prev) => {
      const task = prev.dailyTasks.find((t) => t.id === taskId);
      if (!task || task.progress < task.target) return prev;
      return {
        ...prev,
        gold: prev.gold + (task.reward.gold || 0),
        xp: prev.xp + (task.reward.xp || 0),
        level: Math.floor((prev.xp + (task.reward.xp || 0)) / 100) + 1,
        dailyTasks: prev.dailyTasks.map((t) =>
          t.id === taskId ? { ...t, completed: true } : t
        ),
      };
    });
  }, []);

  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  // --- Multiplayer Elements (Client-Side Mock) ---
  // Purpose: Simulates trading/community events; preps for server sync.
  // Integration: Extend fetchLeaderboardData for trades; add community modal actions.
  const mockCommunityEvent = useCallback(() => {
    const events = [
      { description: "Trade 2 Herbs for 10 gold with Aiko", action: () => {
        if (player.inventory.find((i) => i.name === "Herbs")?.quantity >= 2) {
          setPlayer((prev) => ({
            ...prev,
            inventory: prev.inventory.map((i) =>
              i.name === "Herbs" ? { ...i, quantity: i.quantity - 2 } : i
            ).filter((i) => i.quantity > 0),
            gold: prev.gold + 10,
          }));
          setGameMessage("Traded 2 Herbs for 10 gold with Aiko!");
        }
      }},
    ];
    return events[Math.floor(Math.random() * events.length)];
  }, [player.inventory]);

  // --- Inventory Management ---
  // Purpose: Adds sorting and limits to inventory; stored in player.inventory.
  // Integration: Call sortInventory from UI; enforce limits in crafting/gathering.
  const sortInventory = useCallback(() => {
    setPlayer((prev) => ({
      ...prev,
      inventory: [...prev.inventory].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, []);

  const enforceInventoryLimits = useCallback((newItem) => {
    setPlayer((prev) => {
      const existingItem = prev.inventory.find((i) => i.name === newItem.name);
      if (existingItem && existingItem.quantity >= 10) return prev; // Max 10 per item
      let newInventory;
      if (existingItem) {
        newInventory = prev.inventory.map((i) =>
          i.name === newItem.name ? { ...i, quantity: Math.min(i.quantity + 1, 10) } : i
        );
      } else {
        newInventory = [...prev.inventory, { name: newItem.name, quantity: 1 }];
      }
      return { ...prev, inventory: newInventory };
    });
  }, []);

  // --- Stats Tracking ---
  // Purpose: Records lifetime stats; stored in player.stats.
  // Integration: Update stats in action functions (e.g., combat, crafting).
  const updateStats = useCallback((statKey, increment = 1) => {
    setPlayer((prev) => ({
      ...prev,
      stats: { ...prev.stats, [statKey]: (prev.stats[statKey] || 0) + increment },
    }));
  }, []);

  // --- Core Gameplay Functions ---
  // Purpose: Core mechanics like gathering, crafting, combat; update stats/quests here.
  const getAvailableIngredients = useMemo(() => {
    const currentTownData = towns.find((t) => t.name === currentTown);
    const townLevel = townLevels[currentTown];
    const townIngredients = currentTownData.ingredients.map((name) => ({
      name,
      quantity: Infinity * townLevel, // Higher town level increases availability
    }));
    
    const allIngredientsMap = {};
    player.inventory.forEach((item) => {
      allIngredientsMap[item.name] = { name: item.name, quantity: item.quantity, owned: true };
    });
    townIngredients.forEach((item) => {
      if (!allIngredientsMap[item.name]) {
        allIngredientsMap[item.name] = { name: item.name, quantity: 0, owned: false };
      }
    });
    allIngredients.forEach((name) => {
      if (!allIngredientsMap[name]) {
        allIngredientsMap[name] = { name, quantity: 0, owned: false };
      }
    });

    return Object.values(allIngredientsMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [player.inventory, currentTown, towns, allIngredients, townLevels]);

  const canGatherNormal = useCallback(() => {
    const lastTime = lastGatherTimes[currentTown];
    if (!lastTime) return true;
    const currentTownData = towns.find((t) => t.name === currentTown);
    const cooldownMinutes = currentTownData.gatherCooldown;
    const now = Date.now();
    const timeSinceLastGather = (now - lastTime) / (1000 * 60);
    return timeSinceLastGather >= cooldownMinutes;
  }, [lastGatherTimes, currentTown, towns]);

  const canGatherQueued = useCallback(() => {
    if (!lastQueuedGatherTime) return true;
    const cooldownMinutes = 3;
    const now = Date.now();
    const timeSinceLastQueued = (now - lastQueuedGatherTime) / (1000 * 60);
    return timeSinceLastQueued >= cooldownMinutes;
  }, [lastQueuedGatherTime]);

  const gatherSingle = useCallback(() => {
    if (!canGatherNormal()) {
      const currentTownData = towns.find((t) => t.name === currentTown);
      const remainingTime = Math.ceil(
        currentTownData.gatherCooldown - (Date.now() - lastGatherTimes[currentTown]) / (1000 * 60)
      );
      setGameMessage(`You must wait ${remainingTime} minute(s) to gather again in ${currentTown}!`);
      setShowGatherModal(false);
      return;
    }

    const currentTownData = towns.find((t) => t.name === currentTown);
    const availableToGather = currentTownData.ingredients.filter(
      (ing) => !player.inventory.some((item) => item.name === ing && item.quantity >= 10) // Updated limit to 10
    );
    if (availableToGather.length === 0) {
      setGameMessage("No new ingredients to gather here or max quantity reached!");
      setShowGatherModal(false);
      return;
    }

    const randomIngredient = availableToGather[Math.floor(Math.random() * availableToGather.length)];
    enforceInventoryLimits({ name: randomIngredient });
    const now = Date.now();
    setLastGatherTimes((prev) => ({
      ...prev,
      [currentTown]: now,
    }));
    updateXP(10);
    updateStats("gathers");
    setPlayer((prev) => {
      const herbQuest = prev.quests.find((q) => q.id === "gatherHerbs");
      if (herbQuest && randomIngredient === "Herbs") {
        const updatedQuests = prev.quests.map((q) =>
          q.id === "gatherHerbs" ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q
        );
        if (herbQuest.progress + 1 >= herbQuest.target) completeQuest("gatherHerbs");
        return { ...prev, quests: updatedQuests };
      }
      return prev;
    });
    setGameMessage(`You gathered 1 ${randomIngredient}! (+10 XP)`);
    setShowGatherModal(false);
  }, [canGatherNormal, currentTown, player.inventory, player.quests, lastGatherTimes, towns, updateXP, updateStats, enforceInventoryLimits, completeQuest]);

  const queueGathers = useCallback((count) => {
    if (!canGatherQueued()) {
      const remainingTime = Math.ceil(3 - (Date.now() - lastQueuedGatherTime) / (1000 * 60));
      setGameMessage(`You must wait ${remainingTime} minute(s) to queue gathers again!`);
      setShowGatherModal(false);
      return;
    }

    const cost = count * 1;
    if (player.gold < cost) {
      setGameMessage("Not enough gold to queue gathers!");
      setShowGatherModal(false);
      return;
    }

    const currentTownData = towns.find((t) => t.name === currentTown);
    const availableToGather = currentTownData.ingredients.filter(
      (ing) => !player.inventory.some((item) => item.name === ing && item.quantity >= 10)
    );
    if (availableToGather.length === 0) {
      setGameMessage("No new ingredients to gather here or max quantity reached!");
      setShowGatherModal(false);
      return;
    }

    setPlayer((prev) => {
      let newInventory = [...prev.inventory];
      let gathered = [];
      for (let i = 0; i < count && availableToGather.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableToGather.length);
        const ingredient = availableToGather[randomIndex];
        const existingItem = newInventory.find((item) => item.name === ingredient);
        if (existingItem) {
          newInventory = newInventory.map((item) =>
            item.name === ingredient ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item
          );
        } else {
          newInventory.push({ name: ingredient, quantity: 1 });
        }
        gathered.push(ingredient);
        if (newInventory.find((item) => item.name === ingredient).quantity >= 10) {
          availableToGather.splice(randomIndex, 1);
        }
      }
      const herbQuest = prev.quests.find((q) => q.id === "gatherHerbs");
      if (herbQuest) {
        const herbCount = gathered.filter((i) => i === "Herbs").length;
        const updatedQuests = prev.quests.map((q) =>
          q.id === "gatherHerbs" ? { ...q, progress: Math.min(q.progress + herbCount, q.target) } : q
        );
        if (herbQuest.progress + herbCount >= herbQuest.target) completeQuest("gatherHerbs");
        return {
          ...prev,
          inventory: newInventory,
          gold: prev.gold - cost,
          quests: updatedQuests,
        };
      }
      return {
        ...prev,
        inventory: newInventory,
        gold: prev.gold - cost,
      };
    });
    const now = Date.now();
    setLastQueuedGatherTime(now);
    updateXP(count * 15);
    updateStats("gathers", count);
    setGameMessage(`You queued ${count} gathers for ${cost} gold! Gathered: ${Array(count).fill().map(() => availableToGather[Math.floor(Math.random() * availableToGather.length)]).join(", ")} (+${count * 15} XP)`);
    setShowGatherModal(false);
  }, [canGatherQueued, currentTown, player.gold, player.inventory, player.quests, lastQueuedGatherTime, towns, updateXP, updateStats, completeQuest]);

  const buyIngredient = useCallback((ingredient, price) => {
    if (player.gold < price) {
      setGameMessage("Not enough gold to buy this ingredient!");
      return;
    }

    setPlayer((prev) => {
      const existingItem = prev.inventory.find((item) => item.name === ingredient);
      let newInventory;
      if (existingItem) {
        newInventory = prev.inventory.map((item) =>
          item.name === ingredient ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item
        );
      } else {
        newInventory = [...prev.inventory, { name: ingredient, quantity: 1 }];
      }
      return {
        ...prev,
        inventory: newInventory,
        gold: prev.gold - price,
      };
    });
    updateXP(5);
    setGameMessage(`You bought 1 ${ingredient} for ${price} gold! (+5 XP)`);
  }, [player.gold, player.inventory, updateXP]);

  const startCombat = useCallback(() => {
    const enemyType = Math.random() < 0.7 ? "weak" : "strong";
    const enemy = enemyType === "weak"
      ? { name: "Bandit", health: 20, damage: 10, gold: 5 }
      : { name: "Ogre", health: 40, damage: 30, gold: 15 };
    setCombatState({
      enemy,
      playerHealth: player.health,
      enemyHealth: enemy.health,
      log: [`Combat started against ${enemy.name}!`],
      isAttacking: false,
    });
    setShowCombatModal(true);
  }, [player.health]);

  const attackEnemy = useCallback(() => {
    if (!combatState || combatState.isAttacking) return;
    setCombatState((prev) => ({
      ...prev,
      isAttacking: true,
    }));

    setTimeout(() => {
      setCombatState((prev) => {
        const weaponBonus = player.equipment.weapon
          ? player.recipes.find((r) => r.name === player.equipment.weapon)?.bonus.damage || 0
          : 0;
        const playerDamage = Math.floor(Math.random() * 10) + 10 + weaponBonus;
        const newEnemyHealth = Math.max(prev.enemyHealth - playerDamage, 0);
        let newLog = [...prev.log, `Kaito deals ${playerDamage} damage to ${prev.enemy.name}!`];

        if (newEnemyHealth <= 0) {
          const dropChance = Math.random() < 0.1;
          const drop = dropChance ? "Mist Essence" : null;
          setPlayer((prevP) => {
            let newInventory = [...prevP.inventory];
            if (drop) {
              const existingItem = newInventory.find((item) => item.name === drop);
              if (existingItem) {
                newInventory = newInventory.map((item) =>
                  item.name === drop ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item
                );
              } else {
                newInventory.push({ name: drop, quantity: 1 });
              }
            }
            const banditQuest = prevP.quests.find((q) => q.id === "defeatBandits" && prev.enemy.name === "Bandit");
            const updatedQuests = banditQuest
              ? prevP.quests.map((q) =>
                  q.id === "defeatBandits" ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q
                )
              : prevP.quests;
            if (banditQuest && banditQuest.progress + 1 >= banditQuest.target) completeQuest("defeatBandits");
            const enemyTask = prevP.dailyTasks.find((t) => t.id === "defeatEnemies");
            const updatedTasks = enemyTask
              ? prevP.dailyTasks.map((t) =>
                  t.id === "defeatEnemies" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t
                )
              : prevP.dailyTasks;
            if (enemyTask && enemyTask.progress + 1 >= enemyTask.target) completeDailyTask("defeatEnemies");
            return {
              ...prevP,
              gold: prevP.gold + prev.enemy.gold,
              inventory: newInventory,
              quests: updatedQuests,
              stats: { ...prevP.stats, enemiesDefeated: prevP.stats.enemiesDefeated + 1 },
              dailyTasks: updatedTasks,
            };
          });
          updateXP(prev.enemy.gold * 10);
          setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold!${drop ? ` Dropped: ${drop}` : ""} (+${prev.enemy.gold * 10} XP)`);
          setShowCombatModal(false);
          return null;
        }

        const enemyDamage = prev.enemy.damage;
        const newPlayerHealth = Math.max(prev.playerHealth - enemyDamage, 0);
        newLog.push(`${prev.enemy.name} deals ${enemyDamage} damage to Kaito!`);

        if (newPlayerHealth <= 0) {
          setPlayer((p) => ({ ...p, health: 0 }));
          setGameMessage("You were defeated!");
          setShowCombatModal(false);
          return null;
        }

        setPlayer((p) => ({ ...p, health: newPlayerHealth }));
        updateXP(20);
        return {
          ...prev,
          playerHealth: newPlayerHealth,
          enemyHealth: newEnemyHealth,
          log: newLog,
          isAttacking: false,
        };
      });
    }, 1000);
  }, [combatState, player, updateXP, completeQuest, completeDailyTask]);

  const toggleIngredient = useCallback((item) => {
    setSelectedIngredients((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }, []);

  const craftDrink = useCallback(() => {
    const selected = [...selectedIngredients];
    const recipe = player.recipes.find(
      (r) =>
        r.type === "sell" &&
        r.ingredients.every((ing) => selected.includes(ing)) &&
        selected.length === r.ingredients.length
    );

    if (!recipe) {
      setGameMessage("No matching sellable recipe for these ingredients!");
      return;
    }

    const available = getAvailableIngredients;
    const hasEnough = recipe.ingredients.every((ing) => {
      const item = available.find((i) => i.name === ing);
      return item && (item.owned ? item.quantity > 0 : true);
    });
    if (!hasEnough) {
      setGameMessage("You don’t have enough of the required ingredients!");
      return;
    }

    const successChance = 0.8;
    const isSuccess = Math.random() < successChance;

    setPlayer((prev) => {
      const newInventory = prev.inventory.map((item) => {
        if (recipe.ingredients.includes(item.name)) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter((item) => item.quantity > 0);

      if (isSuccess) {
        const existingDrink = prev.inventory.find((item) => item.name === recipe.name);
        let updatedInventory;
        if (existingDrink) {
          updatedInventory = newInventory.map((item) =>
            item.name === recipe.name ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item
          );
        } else {
          updatedInventory = [...newInventory, { name: recipe.name, quantity: 1 }];
        }
        const task = prev.dailyTasks.find((t) => t.description === "Craft 3 potions");
        const updatedTasks = task
          ? prev.dailyTasks.map((t) =>
              t.description === "Craft 3 potions" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t
            )
          : prev.dailyTasks;
        if (task && task.progress + 1 >= task.target) completeDailyTask("craftPotions");
        return {
          ...prev,
          inventory: updatedInventory,
          stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 },
          dailyTasks: updatedTasks,
        };
      }
      return { ...prev, inventory: newInventory };
    });

    if (isSuccess) {
      updateXP(30);
      setGameMessage(`You crafted ${recipe.name}! It’s now in your inventory. (+30 XP)`);
    } else {
      setGameMessage(`Crafting ${recipe.name} failed! Ingredients lost.`);
    }

    setSelectedIngredients([]);
    setShowCraftModal(false);
  }, [player, selectedIngredients, getAvailableIngredients, updateXP, completeDailyTask]);

  const craftHealingPotion = useCallback(() => {
    const selected = [...selectedIngredients];
    const recipe = player.recipes.find(
      (r) =>
        r.type === "heal" &&
        r.ingredients.every((ing) => selected.includes(ing)) &&
        selected.length === r.ingredients.length
    );

    if (!recipe) {
      setGameMessage("No matching healing potion recipe for these ingredients!");
      return;
    }

    const available = getAvailableIngredients;
    const hasEnough = recipe.ingredients.every((ing) => {
      const item = available.find((i) => i.name === ing);
      return item && (item.owned ? item.quantity > 0 : true);
    });
    if (!hasEnough) {
      setGameMessage("You don’t have enough of the required ingredients!");
      return;
    }

    setPlayer((prev) => {
      const newInventory = prev.inventory.map((item) => {
        if (recipe.ingredients.includes(item.name)) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter((item) => item.quantity > 0);

      const newHealth = Math.min(prev.health + recipe.healAmount, 100);
      const task = prev.dailyTasks.find((t) => t.description === "Craft 3 potions");
      const updatedTasks = task
        ? prev.dailyTasks.map((t) =>
            t.description === "Craft 3 potions" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t
          )
        : prev.dailyTasks;
      if (task && task.progress + 1 >= task.target) completeDailyTask("craftPotions");
      return {
        ...prev,
        inventory: newInventory,
        health: newHealth,
        stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 },
        dailyTasks: updatedTasks,
      };
    });

    updateXP(10); // Reduced from 25
    setGameMessage(`You crafted ${recipe.name} and healed ${recipe.healAmount} health! (+10 XP)`);
    setSelectedIngredients([]);
    setShowHealingModal(false);
  }, [player, selectedIngredients, getAvailableIngredients, updateXP, completeDailyTask]);

  const sellDrink = useCallback((drinkName) => {
    const recipe = player.recipes.find((r) => r.name === drinkName && r.type === "sell");
    if (!recipe) {
      setGameMessage("This item cannot be sold!");
      return;
    }

    const drinkInInventory = player.inventory.find((item) => item.name === drinkName);
    if (!drinkInInventory || drinkInInventory.quantity === 0) {
      setGameMessage("You don’t have any of this drink to sell!");
      return;
    }

    const currentTownData = towns.find((t) => t.name === currentTown);
    const demandMultiplier = currentTownData.demand[drinkName] || 1.0;
    const rewardMultiplier = currentTownData.rewardMultiplier * townLevels[currentTown];
    const reward = Math.floor(recipe.baseGold * rewardMultiplier * demandMultiplier);

    setPlayer((prev) => ({
      ...prev,
      inventory: prev.inventory
        .map((item) => (item.name === drinkName ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
      gold: prev.gold + reward,
      stats: { ...prev.stats, itemsSold: prev.stats.itemsSold + 1 },
    }));
    updateXP(reward * 2);
    upgradeTown(currentTown, player.stats.itemsSold + 1);
    setGameMessage(`You sold ${drinkName} for ${reward} gold! (+${reward * 2} XP)`);
  }, [player, currentTown, towns, townLevels, updateXP, upgradeTown]);

  const travel = useCallback((town) => {
    setCurrentTown(town);
    updateXP(5);
    setGameMessage(`You arrived at ${town}! (+5 XP)`);
  }, [updateXP]);

  useEffect(() => {
    const updateCountdowns = () => {
      const now = Date.now();

      const lastNormalTime = lastGatherTimes[currentTown];
      if (lastNormalTime) {
        const currentTownData = towns.find((t) => t.name === currentTown);
        const cooldownSeconds = currentTownData.gatherCooldown * 60;
        const elapsedSeconds = Math.floor((now - lastNormalTime) / 1000);
        const remainingSeconds = Math.max(cooldownSeconds - elapsedSeconds, 0);
        setCountdown(remainingSeconds);
        if (remainingSeconds === 0 && lastNormalTime) {
          setGameMessage("You can gather ingredients again in " + currentTown + "!");
        }
      } else {
        setCountdown(null);
      }

      if (lastQueuedGatherTime) {
        const cooldownSeconds = 3 * 60;
        const elapsedSeconds = Math.floor((now - lastQueuedGatherTime) / 1000);
        const remainingSeconds = Math.max(cooldownSeconds - elapsedSeconds, 0);
        setQueuedCountdown(remainingSeconds);
        if (remainingSeconds === 0 && lastQueuedGatherTime) {
          setGameMessage("You can queue gathers for gold again!");
        }
      } else {
        setQueuedCountdown(null);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [lastGatherTimes, lastQueuedGatherTime, currentTown, towns]);

  const formatCountdown = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }, []);

  // --- UI Rendering ---
  // Purpose: Renders the game UI with all features; modals for new interactions.
  // Integration: Add new buttons/modals here; keep styling consistent with Combat.module.css.
  return (
    <div style={{ minHeight: "100vh", background: "url('/background.jpg') center/cover" }}>
      <Head>
        <title>Kaito's Adventure</title>
      </Head>
      <Container className="py-5">
        <Button
          variant="info"
          style={{ position: "absolute", top: "10px", left: "10px" }}
          onClick={() => setShowLeaderboardModal(true)}
        >
          Leaderboard
        </Button>

        <Row className="justify-content-center">
          <Col md={10}>
            <Card className="text-center" style={{ background: "rgba(255, 255, 255, 0.9)" }}>
              <Card.Body className="p-4">
                <Card.Title as="h1" className="mb-3 text-danger">{player.name} (Level {player.level})</Card.Title>
                <Card.Text>Health: {player.health} | Gold: {player.gold} | XP: {player.xp}</Card.Text>
                <ProgressBar
                  now={xpProgress}
                  label={`${Math.round(xpProgress)}%`}
                  variant="success"
                  className="my-2"
                  style={{ width: "50%", margin: "0 auto" }}
                />
                <Card.Text>Current Town: {currentTown} (Level {townLevels[currentTown]})</Card.Text>
                <Card.Text className="mb-4 text-muted">{gameMessage}</Card.Text>
                <h2>Inventory</h2>
                <Button variant="outline-secondary" size="sm" onClick={sortInventory} className="mb-2">
                  Sort Inventory
                </Button>
                <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "400px" }}>
                  {player.inventory.map((item) => (
                    <ListGroup.Item key={item.name}>
                      {item.name}: {item.quantity}
                      {player.recipes.find((r) => r.name === item.name && r.type === "equip") && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="ml-2"
                          onClick={() => equipItem(item.name)}
                        >
                          Equip
                        </Button>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Card.Text>Equipped: {player.equipment.weapon || "None"}</Card.Text>
                <h2 className="mt-4">Available Ingredients in {currentTown}</h2>
                <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "400px" }}>
                  {getAvailableIngredients.map((item) => (
                    <ListGroup.Item key={item.name}>
                      {item.name}: {item.owned ? item.quantity : towns.find(t => t.name === currentTown).ingredients.includes(item.name) ? "∞ (Town)" : "0"}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <h2 className="mt-4">Actions</h2>
                <div className="d-flex flex-wrap justify-content-center">
                  <Button variant="primary" onClick={() => setShowCraftModal(true)} className="m-3">
                    Craft a Drink
                  </Button>
                  <Button variant="info" onClick={() => setShowHealingModal(true)} className="m-3">
                    Craft Healing Potion
                  </Button>
                  <Button variant="danger" onClick={startCombat} className="m-3">
                    Start Combat
                  </Button>
                  <Button variant="warning" onClick={() => setShowGatherModal(true)} className="m-3">
                    Gather Ingredient
                  </Button>
                  <Button variant="success" onClick={() => setShowMarketModal(true)} className="m-3">
                    Visit Market
                  </Button>
                  <Button variant="outline-info" onClick={() => setShowQuestsModal(true)} className="m-3">
                    Quests ({player.quests.length})
                  </Button>
                  <Button variant="outline-warning" onClick={() => setShowDailyModal(true)} className="m-3">
                    Daily
                  </Button>
                  <Button variant="outline-secondary" onClick={() => setShowStatsModal(true)} className="m-3">
                    Stats
                  </Button>
                  <Button variant="outline-primary" onClick={() => setShowCommunityModal(true)} className="m-3">
                    Community
                  </Button>
                </div>
                {countdown !== null && countdown > 0 && (
                  <p className="mt-3">Normal Gather Cooldown: {formatCountdown(countdown)} remaining</p>
                )}
                {queuedCountdown !== null && queuedCountdown > 0 && (
                  <p className="mt-3">Queued Gather Cooldown: {formatCountdown(queuedCountdown)} remaining</p>
                )}
                <h2 className="mt-5">Travel</h2>
                <div className="d-flex flex-wrap justify-content-center">
                  {towns.map((town) => (
                    <Button
                      key={town.name}
                      variant={currentTown === town.name ? "secondary" : "success"}
                      onClick={() => travel(town.name)}
                      disabled={currentTown === town.name}
                      className="m-3"
                    >
                      {town.name}
                    </Button>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* --- Quests Modal --- */}
      <Modal show={showQuestsModal} onHide={() => setShowQuestsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Quests</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {player.quests.map((quest) => (
              <ListGroup.Item key={quest.id}>
                {quest.description} - {quest.progress}/{quest.target}
                <br />
                Reward: {quest.reward.gold ? `${quest.reward.gold} Gold` : ""} {quest.reward.xp ? `${quest.reward.xp} XP` : ""}
              </ListGroup.Item>
            ))}
          </ListGroup>
          <Button variant="primary" onClick={addQuest} className="mt-3" disabled={player.quests.length >= 3}>
            Accept New Quest
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuestsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Leaderboard Modal --- */}
      <Modal
        show={showLeaderboardModal}
        onHide={() => setShowLeaderboardModal(false)}
        dialogClassName={styles.leaderboardModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Leaderboard</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {leaderboardData.map((entry, index) => (
              <ListGroup.Item key={index}>
                {index + 1}. {entry.name} - Level {entry.level} - {entry.gold} Gold
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaderboardModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Craft Modal --- */}
      <Modal show={showCraftModal} onHide={() => setShowCraftModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Craft a Drink</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h5>Select Ingredients:</h5>
            {getAvailableIngredients.map((item) => (
              <Form.Check
                key={item.name}
                type="checkbox"
                label={`${item.name} (${item.owned ? item.quantity : "∞"})`}
                checked={selectedIngredients.includes(item.name)}
                onChange={() => toggleIngredient(item.name)}
                disabled={!item.owned || item.quantity === 0}
              />
            ))}
          </Form>
          <p className="mt-3">Known Sellable Recipes:</p>
          <ul>
            {player.recipes.filter((r) => r.type === "sell" || r.type === "equip").map((recipe) => (
              <li key={recipe.name}>
                {recipe.name}: {recipe.ingredients.join(", ")} {recipe.type === "equip" ? `(Bonus: +${recipe.bonus.damage} Damage)` : ""}
              </li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCraftModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={craftDrink}>
            Craft
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Healing Modal --- */}
      <Modal show={showHealingModal} onHide={() => setShowHealingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Craft a Healing Potion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h5>Select Ingredients:</h5>
            {getAvailableIngredients.map((item) => (
              <Form.Check
                key={item.name}
                type="checkbox"
                label={`${item.name} (${item.owned ? item.quantity : "∞"})`}
                checked={selectedIngredients.includes(item.name)}
                onChange={() => toggleIngredient(item.name)}
                disabled={!item.owned || item.quantity === 0}
              />
            ))}
          </Form>
          <p className="mt-3">Known Healing Recipes:</p>
          <ul>
            {player.recipes.filter((r) => r.type === "heal").map((recipe) => (
              <li key={recipe.name}>
                {recipe.name}: {recipe.ingredients.join(", ")} (Heals {recipe.healAmount} HP)
              </li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHealingModal(false)}>
            Cancel
          </Button>
          <Button variant="info" onClick={craftHealingPotion}>
            Craft & Use
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Gather Modal --- */}
      <Modal show={showGatherModal} onHide={() => setShowGatherModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Gather Options in {currentTown}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Normal Gather</Card.Title>
              <Card.Text>Gather one ingredient for free (cooldown varies by town).</Card.Text>
              <Button variant="warning" onClick={gatherSingle}>
                Gather Now
              </Button>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title>Queue Gathers for Gold</Card.Title>
              <Card.Text>Pay 1 gold per gather, up to 5 (3-minute global cooldown).</Card.Text>
              <div>
                {[1, 2, 3, 4, 5].map((count) => (
                  <Button
                    key={count}
                    variant="outline-warning"
                    className="m-1"
                    onClick={() => queueGathers(count)}
                    disabled={player.gold < count}
                  >
                    {count} ({count} gold)
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGatherModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Combat Modal --- */}
      <Modal
        show={showCombatModal}
        onHide={() => setShowCombatModal(false)}
        size="xl"
        centered
        dialogClassName="combat-modal"
      >
        <Modal.Body className="p-0">
          <Card className="border-0">
            <Card.Header className="bg-danger text-center text-white">
              <h3>Combat Arena</h3>
            </Card.Header>
            <Card.Body>
              {combatState && (
                <Row>
                  <Col md={5} className="text-center">
                    <h4>Kaito</h4>
                    <div className={`${styles.healthBar} mb-3`}>
                      <div
                        className={styles.healthFill}
                        style={{ width: `${(combatState.playerHealth / player.health) * 100}%` }}
                      />
                    </div>
                    <p>Health: {combatState.playerHealth}/{player.health}</p>
                    <div className={combatState.isAttacking ? styles.attacking : ""}>
                      [Kaito Placeholder]
                    </div>
                  </Col>
                  <Col md={2} className="align-items-center d-flex justify-content-center">
                    <h2>VS</h2>
                  </Col>
                  <Col md={5} className="text-center">
                    <h4>{combatState.enemy.name}</h4>
                    <div className={`${styles.healthBar} mb-3`}>
                      <div
                        className={styles.healthFill}
                        style={{ width: `${(combatState.enemyHealth / combatState.enemy.health) * 100}%` }}
                      />
                    </div>
                    <p>Health: {combatState.enemyHealth}/{combatState.enemy.health}</p>
                    <div className={combatState.isAttacking ? styles.enemyHit : ""}>
                      [Enemy Placeholder]
                    </div>
                  </Col>
                </Row>
              )}
              <div className="mt-3 text-center">
                <Button
                  variant="danger"
                  onClick={attackEnemy}
                  disabled={!combatState || combatState.isAttacking}
                  className="m-1"
                >
                  Attack
                </Button>
                {player.skills.map((skill) => (
                  <Button
                    key={skill.name}
                    variant="outline-danger"
                    onClick={() => useSkill(skill.name)}
                    disabled={!combatState || combatState.isAttacking}
                    className="m-1"
                  >
                    {skill.name}
                  </Button>
                ))}
              </div>
              {combatState && (
                <ListGroup className="mt-3" style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {combatState.log.map((entry, idx) => (
                    <ListGroup.Item key={idx}>{entry}</ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
            <Card.Footer className="text-center">
              <Button variant="secondary" onClick={() => setShowCombatModal(false)}>
                Flee
              </Button>
            </Card.Footer>
          </Card>
        </Modal.Body>
      </Modal>

      {/* --- Market Modal --- */}
      <Modal show={showMarketModal} onHide={() => setShowMarketModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{currentTown} Market</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Sell Your Drinks:</h5>
          <ListGroup className="mb-3">
            {player.inventory
              .filter((item) => player.recipes.some((r) => r.name === item.name && r.type === "sell"))
              .map((item) => {
                const recipe = player.recipes.find((r) => r.name === item.name);
                const currentTownData = towns.find((t) => t.name === currentTown);
                const demandMultiplier = currentTownData.demand[item.name] || 1.0;
                const price = Math.floor(recipe.baseGold * currentTownData.rewardMultiplier * demandMultiplier * townLevels[currentTown]);
                return (
                  <ListGroup.Item key={item.name} className="align-items-center d-flex justify-content-between">
                    <span>
                      {item.name}: {item.quantity} (Sells for {price} gold each)
                    </span>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => sellDrink(item.name)}
                      disabled={item.quantity === 0}
                    >
                      Sell One
                    </Button>
                  </ListGroup.Item>
                );
              })}
          </ListGroup>
          <h5>NPC Buyers:</h5>
          <ListGroup>
            {towns.find((t) => t.name === currentTown).npcOffers.map((offer, idx) => (
              <ListGroup.Item key={idx} className="align-items-center d-flex justify-content-between">
                <span>
                  {offer.ingredient} (Buy for {offer.price / townLevels[currentTown]} gold) {/* Higher town level lowers prices */}
                </span>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => buyIngredient(offer.ingredient, Math.floor(offer.price / townLevels[currentTown]))}
                  disabled={player.gold < Math.floor(offer.price / townLevels[currentTown])}
                >
                  Buy One
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarketModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Daily Rewards Modal --- */}
      <Modal show={showDailyModal} onHide={() => setShowDailyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Daily Rewards & Challenges</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Daily Login Bonus: 20 Gold (Claimed today)</p>
          <h5>Challenges:</h5>
          <ListGroup variant="flush">
            {player.dailyTasks.map((task) => (
              <ListGroup.Item key={task.description}>
                {task.description} - {task.progress}/{task.target}
                <br />
                Reward: {task.reward.gold ? `${task.reward.gold} Gold` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}
                {task.completed && " (Completed)"}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDailyModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Stats Modal --- */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Lifetime Stats</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>Enemies Defeated: {player.stats.enemiesDefeated}</ListGroup.Item>
            <ListGroup.Item>Potions Crafted: {player.stats.potionsCrafted}</ListGroup.Item>
            <ListGroup.Item>Items Sold: {player.stats.itemsSold}</ListGroup.Item>
            <ListGroup.Item>Gathers Performed: {player.stats.gathers}</ListGroup.Item>
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Community Modal --- */}
      <Modal show={showCommunityModal} onHide={() => setShowCommunityModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Community Events</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{mockCommunityEvent().description}</p>
          <Button variant="primary" onClick={mockCommunityEvent().action}>
            Perform Action
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCommunityModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}