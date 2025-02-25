import { useState, useCallback, useEffect, useMemo } from "react";
import Head from "next/head";
import Image from "next/image";
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
  Alert,
  Tabs,
  Tab,
  Dropdown, // Added for dropdowns
} from "react-bootstrap";
import styles from '../styles/Combat.module.css';
import debounce from 'lodash/debounce';

// ---- Constants Section ----
const defaultPlayer = {
  name: "Kaito Brewmaster",
  gold: 5,
  health: 100,
  maxHealth: 100,
  xp: 0,
  level: 1,
  inventory: [
    { name: "Water", quantity: 2 },
    { name: "Herbs", quantity: 1 },
  ],
  inventorySlots: 10,
  rareItems: [],
  recipes: [
    { name: "Herbal Tea", ingredients: ["Water", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Spicy Sake", ingredients: ["Water", "Pepper"], type: "sell", baseGold: 20 },
    { name: "Mist Potion", ingredients: ["Mist Essence", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Golden Elixir", ingredients: ["Golden Herb", "Mist Essence"], type: "sell", baseGold: 50 },
    { name: "Weak Healing Potion", ingredients: ["Water", "Herbs"], type: "heal", healPercent: 0.2, sellValue: 15 },
    { name: "Medium Healing Potion", ingredients: ["Water", "Mist Essence"], type: "heal", healPercent: 0.4, sellValue: 25 },
    { name: "Strong Healing Potion", ingredients: ["Mist Essence", "Shadow Root"], type: "heal", healPercent: 0.6, sellValue: 40 },
    { name: "Lucky Gather Potion", ingredients: ["Herbs", "Golden Herb"], type: "gather", effect: { rareChanceBoost: 0.1, duration: 300000 } }, // +10% rare drop chance, 5 min
    { name: "Swift Gather Potion", ingredients: ["Pepper", "Mist Essence"], type: "gather", effect: { cooldownReduction: 0.2, duration: 300000 } }, // -20% cooldown, 5 min
    { name: "Combat Blade", ingredients: ["Iron Ore", "Wood"], type: "equip", bonus: { damage: 5 } },
    { name: "Steel Axe", ingredients: ["Iron Ore", "Iron Ore"], type: "equip", bonus: { damage: 8 } },
    { name: "Shadow Dagger", ingredients: ["Shadow Root", "Iron Ore"], type: "equip", bonus: { damage: 6 } },
    { name: "Leather Armor", ingredients: ["Herbs", "Wood"], type: "armor", bonus: { defense: 5 }, unlockLevel: 10 },
    { name: "Chainmail", ingredients: ["Iron Ore", "Shadow Root"], type: "armor", bonus: { defense: 10 }, unlockLevel: 10 },
    { name: "Plate Armor", ingredients: ["Iron Ore", "Mist Crystal"], type: "armor", bonus: { defense: 15 }, unlockLevel: 10 },
  ],
    // ... recipes
  equipment: { weapon: null, armor: null },
  quests: [],
  skills: [
    { name: "Basic Attack", uses: 0, level: 1, effect: { damage: 10 }, tree: "Warrior" },
  ],
  stats: { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 },
  lastLogin: null,
  dailyTasks: [],
  weeklyTasks: [],
  guild: null,
  avatar: "default",
  trait: null,
};

const towns = [
  {
    name: "Sakura Village",
    ingredients: ["Water", "Herbs", "Wood"],
    rareIngredients: [{ name: "Golden Herb", chance: 0.1 }], // New: Rare drops
    gatherCooldown: 0.5,
    rewardMultiplier: 1,
    demand: { "Herbal Tea": 1.0, "Spicy Sake": 0.8, "Mist Potion": 0.5, "Golden Elixir": 1.5 },
    npcOffers: [{ ingredient: "Pepper", price: 5 }, { ingredient: "Mist Essence", price: 7 }],
    npcs: [
      { name: "Hana the Herbalist", dialogue: "Greetings! I need Herbs for my remedies. Can you gather 5 for me?", quest: { id: "herbQuest", description: "Gather 5 Herbs for Hana", progress: 0, target: 5, reward: { gold: 60, xp: 60 } } },
    ],
  },
  {
    name: "Iron Port",
    ingredients: ["Pepper", "Sugar", "Iron Ore"],
    rareIngredients: [{ name: "Iron Shard", chance: 0.1 }],
    gatherCooldown: 1,
    rewardMultiplier: 2,
    demand: { "Herbal Tea": 0.7, "Spicy Sake": 1.2, "Mist Potion": 0.9, "Golden Elixir": 1.2 },
    npcOffers: [{ ingredient: "Water", price: 5 }, { ingredient: "Shadow Root", price: 8 }],
    npcs: [
      { name: "Captain Toru", dialogue: "Ahoy! We need a sturdy Combat Blade for our next voyage. Craft one for us!", quest: { id: "bladeQuest", description: "Craft a Combat Blade for Toru", progress: 0, target: 1, reward: { gold: 80, xp: 80 } } },
    ],
  },
  {
    name: "Mist Hollow",
    ingredients: ["Mist Essence", "Shadow Root"],
    rareIngredients: [{ name: "Mist Crystal", chance: 0.2 }],
    gatherCooldown: 2,
    rewardMultiplier: 4,
    demand: { "Herbal Tea": 0.6, "Spicy Sake": 0.9, "Mist Potion": 1.5, "Golden Elixir": 1.8 },
    npcOffers: [{ ingredient: "Herbs", price: 6 }, { ingredient: "Sugar", price: 5 }],
    npcs: [
      { name: "Mystic Rei", dialogue: "The shadows grow restless. Defeat 3 Bandits to restore peace.", quest: { id: "banditQuest", description: "Defeat 3 Bandits for Rei", progress: 0, target: 3, reward: { gold: 100, xp: 100 } } },
    ],
  },
];

const allIngredients = ["Water", "Herbs", "Pepper", "Sugar", "Mist Essence", "Shadow Root", "Iron Ore", "Wood", "Golden Herb", "Iron Shard", "Mist Crystal"];
const rareItems = ["Golden Herb", "Iron Shard", "Mist Crystal"];



const weatherTypes = [
  { type: "sunny", gatherBonus: null, combatModifier: 1.0, demandBonus: { "Spicy Sake": 1.1 } },
  { type: "rainy", gatherBonus: { ingredient: "Water", chance: 0.5 }, combatModifier: 0.9, demandBonus: { "Herbal Tea": 1.2 } },
  { type: "foggy", gatherBonus: { ingredient: "Mist Essence", chance: 0.3 }, combatModifier: 0.8, demandBonus: { "Mist Potion": 1.3 } },
];

const enemies = [
  { name: "Bandit", health: 80, damage: 10, gold: 10, drop: "Shadow Root", dropChance: 0.2 },
  { name: "Shadow Ninja", health: 60, damage: 15, gold: 15, drop: "Mist Essence", dropChance: 0.3 },
  { name: "Golem", health: 120, damage: 8, gold: 20, drop: "Iron Ore", dropChance: 0.25 },
];

const skillTrees = {
  Warrior: [
    { name: "Double Strike", uses: 0, level: 0, effect: { damage: 10 }, cost: { gold: 50 } }, // Base 10
    { name: "Stun", uses: 0, level: 0, effect: { damage: 5, stunChance: 0.2 }, cost: { gold: 75 } },
  ],
  Herbalist: [
    { name: "Efficient Brewing", uses: 0, level: 0, effect: { costReduction: 0.2 }, cost: { gold: 50 } },
    { name: "Potent Mix", uses: 0, level: 0, effect: { healBonus: 10 }, cost: { gold: 75 } },
  ],
  Explorer: [
    { name: "Quick Gather", uses: 0, level: 0, effect: { cooldownReduction: 0.1 }, cost: { gold: 50 } },
    { name: "Lucky Find", uses: 0, level: 0, effect: { rareChance: 0.05 }, cost: { gold: 75 } },
  ],
};

// ---- Home Component ----
const Home = () => {
  const defaultPlayerMemo = useMemo(() => defaultPlayer, []);
  const [player, setPlayer] = useState(defaultPlayerMemo);
  const [currentTown, setCurrentTown] = useState("Sakura Village");
  const [gameMessage, setGameMessage] = useState("Welcome to Kaito's Adventure!");
  const [modals, setModals] = useState({
    craft: false,
    healing: false,
    market: false,
    gather: false,
    combat: false,
    leaderboard: false,
    quests: false,
    daily: false,
    stats: false,
    community: false,
    customize: false,
    npc: false,
    travel: false,
    skills: false,
    events: false,
    guild: false,
    guide: false,
  });
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lastGatherTimes, setLastGatherTimes] = useState({});
  const [lastQueuedGatherTime, setLastQueuedGatherTime] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [queuedCountdown, setQueuedCountdown] = useState(null);
  const [combatState, setCombatState] = useState(null);
  const [combatResult, setCombatResult] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [townLevels, setTownLevels] = useState({ "Sakura Village": 1, "Iron Port": 1, "Mist Hollow": 1 });
  const [activeTab, setActiveTab] = useState("drinks");
  const [weather, setWeather] = useState(weatherTypes[0]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventTimer, setEventTimer] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [travelDestination, setTravelDestination] = useState(null);
  const [gatherBuff, setGatherBuff] = useState(null); // Added for gathering potions

  // ---- Persistence ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedPlayer = localStorage.getItem("player");
      if (savedPlayer) {
        const parsedPlayer = JSON.parse(savedPlayer);
        setPlayer({
          ...defaultPlayerMemo,
          ...parsedPlayer,
          recipes: [...defaultPlayerMemo.recipes],
          skills: parsedPlayer.skills || defaultPlayerMemo.skills,
          weeklyTasks: parsedPlayer.weeklyTasks || [],
          inventorySlots: parsedPlayer.inventorySlots || 10,
          rareItems: parsedPlayer.rareItems || [],
        });
      } else {
        // No saved data, show guide
        setModals(prev => ({ ...prev, guide: true }));
      }
      setCurrentTown(localStorage.getItem("currentTown") || "Sakura Village");
      setLastGatherTimes(JSON.parse(localStorage.getItem("lastGatherTimes")) || {});
      setLastQueuedGatherTime(parseInt(localStorage.getItem("lastQueuedGatherTime"), 10) || null);
      setTownLevels(JSON.parse(localStorage.getItem("townLevels")) || { "Sakura Village": 1, "Iron Port": 1, "Mist Hollow": 1 });
    } catch (e) {
      console.error("Error loading from localStorage:", e);
    }
  }, [defaultPlayerMemo]);

  const saveToLocalStorage = useCallback(
    debounce(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("player", JSON.stringify(player));
        localStorage.setItem("currentTown", currentTown);
        localStorage.setItem("lastGatherTimes", JSON.stringify(lastGatherTimes));
        localStorage.setItem("lastQueuedGatherTime", lastQueuedGatherTime ? lastQueuedGatherTime.toString() : null);
        localStorage.setItem("townLevels", JSON.stringify(townLevels));
      }
    }, 500),
    [player, currentTown, lastGatherTimes, lastQueuedGatherTime, townLevels]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      saveToLocalStorage();
    }
    return () => saveToLocalStorage.cancel();
  }, [saveToLocalStorage]);

  const toggleIngredient = useCallback((item) => {
    setSelectedIngredients(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  }, []);

  // ---- Weather System ----
  useEffect(() => {
    const changeWeather = () => {
      const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      setWeather(newWeather);
      setGameMessage(`The weather changes to ${newWeather.type}!`);
    };
    if (typeof window !== "undefined") {
      changeWeather();
      const interval = setInterval(changeWeather, 300000);
      return () => clearInterval(interval);
    }
  }, []);

  // ---- Dynamic Events ----
  useEffect(() => {
    const triggerEvent = () => {
      if (Math.random() < 0.3) {
        const events = [
          { type: "festival", description: "A festival boosts demand for 24 hours!", effect: () => setTownLevels(prev => ({ ...prev, [currentTown]: prev[currentTown] + 0.5 })), duration: 24 * 60 * 60 * 1000 },
          { type: "raid", description: "Bandits raid the town for 1 hour!", effect: () => setModals(prev => ({ ...prev, combat: true })), duration: 60 * 60 * 1000 },
          { type: "storm", description: "A storm reduces gathering for 12 hours!", effect: () => {}, duration: 12 * 60 * 60 * 1000 },
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        setCurrentEvent(event);
        setGameMessage(event.description);
        event.effect();
        setEventTimer(Date.now() + event.duration);
      }
    };
    if (typeof window !== "undefined") {
      triggerEvent();
      const interval = setInterval(triggerEvent, 300000);
      return () => clearInterval(interval);
    }
  }, [currentTown]);

  useEffect(() => {
    if (eventTimer && Date.now() >= eventTimer) {
      setCurrentEvent(null);
      setEventTimer(null);
      setGameMessage("The event has ended!");
    }
  }, [eventTimer]);

  // ---- XP and Leveling ----
  const updateXP = useCallback((xpGain) => {
    setPlayer(prev => {
      const newXP = prev.xp + xpGain;
      const newLevel = Math.floor(newXP / 150) + 1;
      let updatedPlayer = { ...prev, xp: newXP, level: newLevel };
      if (newLevel > prev.level) {
        updatedPlayer.maxHealth = 100 + (newLevel - 1) * 10;
        updatedPlayer.health = updatedPlayer.maxHealth;
        setGameMessage(`Level up! Reached Level ${newLevel}. Max Health increased to ${updatedPlayer.maxHealth}!`);
      }
      return updatedPlayer;
    });
  }, []);

  const xpProgress = useMemo(() => {
    const xpForNext = player.level * 150;
    const xpForCurrent = (player.level - 1) * 150;
    return Math.min(((player.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100, 100);
  }, [player.xp, player.level]);

  // ---- Quests ----
  const addQuest = useCallback((quest) => {
    setPlayer(prev => ({
      ...prev,
      quests: prev.quests.length < 3 ? [...prev.quests, quest] : prev.quests,
    }));
  }, []);

  const completeQuest = useCallback((questId) => {
    setPlayer(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.progress < quest.target) return prev;
      setGameMessage(`Quest "${quest.description}" completed!`);
      return {
        ...prev,
        gold: prev.gold + quest.reward.gold,
        xp: prev.xp + quest.reward.xp,
        level: Math.floor((prev.xp + quest.reward.xp) / 150) + 1,
        quests: prev.quests.filter(q => q.id !== questId),
      };
    });
  }, []);

  // ---- Daily and Weekly Tasks ----
  const completeDailyTask = useCallback((taskId) => {
    setPlayer(prev => {
      const task = prev.dailyTasks.find(t => t.id === taskId);
      if (!task || task.progress < task.target) return prev;
      setGameMessage(`${task.description} completed!`);
      return {
        ...prev,
        gold: prev.gold + (task.reward.gold || 0),
        xp: prev.xp + (task.reward.xp || 0),
        level: Math.floor((prev.xp + (task.reward.xp || 0)) / 150) + 1,
        dailyTasks: prev.dailyTasks.map(t => t.id === taskId ? { ...t, completed: true } : t),
      };
    });
  }, []);

  const completeWeeklyTask = useCallback((taskId) => {
    setPlayer(prev => {
      const task = prev.weeklyTasks.find(t => t.id === taskId);
      if (!task || task.progress < task.target) return prev;
      setGameMessage(`${task.description} completed!`);
      return {
        ...prev,
        gold: prev.gold + (task.reward.gold || 0),
        xp: prev.xp + (task.reward.xp || 0),
        level: Math.floor((prev.xp + (task.reward.xp || 0)) / 150) + 1,
        weeklyTasks: prev.weeklyTasks.map(t => t.id === taskId ? { ...t, completed: true } : t),
      };
    });
  }, []);

  // ---- Skills Progression ----
  const updateSkillLevel = useCallback((skillName) => {
    setPlayer(prev => {
      const skills = prev.skills.map(skill => {
        if (skill.name === skillName) {
          const newUses = skill.uses + 1;
          const newLevel = Math.min(Math.floor(newUses / 5) + 1, 5);
          return {
            ...skill,
            uses: newUses,
            level: newLevel,
            effect: {
              ...skill.effect,
              damage: skill.effect.damage ? skill.effect.damage * (1 + (newLevel - 1) * 0.05) : undefined, // 5% per level
              healBonus: skill.effect.healBonus ? skill.effect.healBonus + (newLevel - 1) * 2 : undefined,
              costReduction: skill.effect.costReduction ? skill.effect.costReduction + (newLevel - 1) * 0.05 : undefined,
              cooldownReduction: skill.effect.cooldownReduction ? skill.effect.cooldownReduction + (newLevel - 1) * 0.02 : undefined,
              rareChance: skill.effect.rareChance ? skill.effect.rareChance + (newLevel - 1) * 0.01 : undefined,
              stunChance: skill.effect.stunChance ? skill.effect.stunChance + (newLevel - 1) * 0.05 : undefined,
            },
          };
        }
        return skill;
      });
      return { ...prev, skills };
    });
  }, []);

  const unlockSkill = useCallback((skillName, tree) => {
    setPlayer(prev => {
      const skill = skillTrees[tree].find(s => s.name === skillName);
      if (prev.gold < skill.cost.gold || prev.skills.some(s => s.name === skillName)) {
        setGameMessage("Not enough gold or skill already unlocked!");
        return prev;
      }
      return {
        ...prev,
        gold: prev.gold - skill.cost.gold,
        skills: [...prev.skills, { ...skill, level: 1 }],
      };
    });
    setGameMessage(`${skillName} unlocked!`);
  }, []);


  // ---- Crafting (must come before combat hooks that use it) ----
  const getAvailableIngredients = useMemo(() => {
    return allIngredients.map(name => {
      const item = player.inventory.find(i => i.name === name);
      return {
        name,
        quantity: item?.quantity ?? 0,
        owned: !!item,
      };
    });
  }, [player.inventory]);


  const craftItem = useCallback((type, onSuccess) => {
    const recipe = player.recipes.find(r =>
      r.type === type &&
      r.ingredients.every(ing => selectedIngredients.includes(ing)) &&
      r.ingredients.length === selectedIngredients.length &&
      (!r.unlockLevel || player.level >= r.unlockLevel)
    );
    if (!recipe) {
      setGameMessage(`No matching ${type === "heal" ? "healing potion" : type === "gather" ? "gathering potion" : "item"} recipe for these ingredients${type !== "heal" && type !== "gather" && player.level < 10 ? " or level too low" : ""}!`);
      return;
    }

    const available = getAvailableIngredients;
    const hasEnough = recipe.ingredients.every(ing => {
      const item = available.find(i => i.name === ing);
      return item && item.owned && item.quantity > 0;
    });
    if (!hasEnough) {
      setGameMessage("You don’t have enough of the required ingredients!");
      return;
    }

    setPlayer(prev => {
      const costReduction = prev.skills.some(s => s.name === "Efficient Brewing") ? prev.skills.find(s => s.name === "Efficient Brewing").effect.costReduction : 0;
      const newInventory = prev.inventory.map(item =>
        recipe.ingredients.includes(item.name) ? { ...item, quantity: item.quantity - (Math.random() < costReduction ? 0 : 1) } : item
      ).filter(item => item.quantity > 0);

      const task = prev.dailyTasks.find(t => t.description === "Craft 3 potions");
      const updatedTasks = task
        ? prev.dailyTasks.map(t => t.description === "Craft 3 potions" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
        : prev.dailyTasks;
      if (task && task.progress + 1 >= task.target) completeDailyTask("craftPotions");

      const traitBonus = player.trait === "craftsman" ? 0.1 : 0;
      const successChance = 0.8 + traitBonus;
      const isSuccess = Math.random() < successChance;

      if (isSuccess) {
        const existingItem = prev.inventory.find(item => item.name === recipe.name);
        const updatedInventory = existingItem
          ? newInventory.map(item => item.name === recipe.name ? { ...item, quantity: Math.min(item.quantity + 1, prev.inventorySlots) } : item)
          : [...newInventory, { name: recipe.name, quantity: 1 }];
        const bladeQuest = prev.quests.find(q => q.id === "bladeQuest" && recipe.name === "Combat Blade");
        const updatedQuests = bladeQuest
          ? prev.quests.map(q => q.id === "bladeQuest" ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
          : prev.quests;

        if (recipe.type === "gather") {
          setGatherBuff({
            type: recipe.effect.rareChanceBoost ? "rareChanceBoost" : "cooldownReduction",
            value: recipe.effect.rareChanceBoost || recipe.effect.cooldownReduction,
            expires: Date.now() + recipe.effect.duration,
          });
          setGameMessage(`You crafted ${recipe.name}! It’s in your inventory and boosts gathering for ${recipe.effect.duration / 60000} minutes!`);
        }

        return {
          ...prev,
          inventory: updatedInventory,
          stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 },
          dailyTasks: updatedTasks,
          quests: updatedQuests,
        };
      }
      return { ...prev, inventory: newInventory };
    });

    const isSuccess = Math.random() < (0.8 + (player.trait === "craftsman" ? 0.1 : 0));
    if (isSuccess) {
      updateXP(type === "heal" || type === "gather" ? 10 : 20);
      if (recipe.type !== "gather") {
        setGameMessage(`You crafted ${recipe.name}! It is now in your inventory. (+${type === "heal" || type === "gather" ? 10 : 20} XP)`);
      }
    } else {
      setGameMessage(`Crafting ${recipe.name} failed! Ingredients lost.`);
    }

    setSelectedIngredients([]);
    setModals(prev => ({ ...prev, [type === "heal" || type === "gather" ? "craft" : "craft"]: false }));
    if (onSuccess && type !== "heal" && type !== "gather") onSuccess(recipe);
  }, [player.recipes, player.trait, player.skills, player.inventorySlots, player.level, selectedIngredients, getAvailableIngredients, updateXP, completeDailyTask, completeQuest, setGameMessage, setModals, setSelectedIngredients]);

  // After craftItem
const useGatherPotion = useCallback((potionName) => {
  const potion = player.inventory.find(item => item.name === potionName);
  if (!potion || potion.quantity === 0) {
    setGameMessage("You don’t have this potion!");
    return;
  }
  const recipe = player.recipes.find(r => r.name === potionName && r.type === "gather");
  if (!recipe) {
    setGameMessage("This isn’t a gathering potion!");
    return;
  }
  setPlayer(prev => ({
    ...prev,
    inventory: prev.inventory.map(item => item.name === potionName ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0),
  }));
  setGatherBuff({
    type: recipe.effect.rareChanceBoost ? "rareChanceBoost" : "cooldownReduction",
    value: recipe.effect.rareChanceBoost || recipe.effect.cooldownReduction,
    expires: Date.now() + recipe.effect.duration,
  });
  setGameMessage(`Used ${potionName}! Gathering boosted for ${recipe.effect.duration / 60000} minutes.`);
}, [player.inventory, player.recipes]);


  
// ---- Combat ----
const startCombat = useCallback(() => {
  if (player.health <= 0) {
    setGameMessage("You’re at 0 health! Craft a healing potion in combat to survive.");
  }
  const enemy = enemies[Math.floor(Math.random() * enemies.length)];
  const levelScaleHealth = 1 + (player.level - 1) * 0.15;
  const levelScaleDamage = 1 + (player.level - 1) * 0.05;
  const weatherMod = weather.combatModifier;
  setCombatState({
    playerHealth: player.health > player.maxHealth ? player.maxHealth : player.health,
    enemy: {
      ...enemy,
      health: Math.round(enemy.health * levelScaleHealth * weatherMod),
      damage: Math.round(enemy.damage * levelScaleDamage * weatherMod),
      gold: Math.round(enemy.gold * levelScaleHealth),
    },
    enemyHealth: Math.round(enemy.health * levelScaleHealth * weatherMod),
    isAttacking: false,
    log: player.health <= 0 ? ["You’re at 0 health! Craft a potion quickly!"] : [],
  });
  setCombatResult(null);
  setModals(prev => ({ ...prev, combat: true }));
  if (player.health > 0) {
    setGameMessage(`Combat started against ${enemy.name} (HP: ${Math.round(enemy.health * levelScaleHealth * weatherMod)}, Damage: ${Math.round(enemy.damage * levelScaleDamage * weatherMod)})`);
  }
}, [player.health, player.level, player.maxHealth, weather]);

const attackEnemy = useCallback((skillName = "Basic Attack") => {
  if (!combatState || combatState.isAttacking) return;
  setCombatState(prev => ({ ...prev, isAttacking: true }));
  setTimeout(() => {
    setCombatState(prev => {
      if (!prev) return null;
      const skill = player.skills.find(s => s.name === skillName) || { name: "Basic Attack", effect: { damage: 10 }, level: 1 };
      const weaponDamage = player.equipment.weapon ? player.recipes.find(r => r.name === player.equipment.weapon)?.bonus.damage || 0 : 0;
      const armorDefense = player.equipment.armor ? player.recipes.find(r => r.name === player.equipment.armor)?.bonus.defense || 0 : 0;
      const traitBonus = player.trait === "warrior" ? 5 : 0;
      const baseDamage = skill.effect.damage || 10;
      const doubledDamage = skill.name === "Double Strike" ? baseDamage * 2 : baseDamage;
      const scaledDamage = doubledDamage * (1 + (skill.level - 1) * 0.05);
      const cappedDamage = Math.min(scaledDamage, 50);
      const totalDamage = Math.round(cappedDamage + weaponDamage + traitBonus);
      const newEnemyHealth = Math.max(prev.enemyHealth - totalDamage, 0);
      const attackMessage = `Kaito uses ${skill.name} for ${totalDamage} damage (Base: ${baseDamage}, Doubled: ${doubledDamage}, Scaled: ${scaledDamage.toFixed(1)}, Capped: ${cappedDamage}, +Weapon: ${weaponDamage}, +Trait: ${traitBonus})`;
      let newLog = [...prev.log, attackMessage];

      if (skill.effect.stunChance && Math.random() < skill.effect.stunChance) {
        newLog.push(`${prev.enemy.name} is stunned!`);
      }

      if (newEnemyHealth <= 0) {
        const dropChance = Math.random() < prev.enemy.dropChance * (player.skills.some(s => s.name === "Lucky Find") ? 1 + player.skills.find(s => s.name === "Lucky Find").effect.rareChance : 1);
        const drop = dropChance ? prev.enemy.drop : null;
        const baseXP = prev.enemy.name === "Bandit" ? 20 : prev.enemy.name === "Shadow Ninja" ? 25 : 30;
        const xpGain = baseXP + (player.level - 1) * 2;
        setPlayer(p => {
          let newInventory = [...p.inventory];
          let newRareItems = [...p.rareItems];
          if (drop) {
            const existingItem = newInventory.find(item => item.name === drop);
            newInventory = existingItem
              ? newInventory.map(item => item.name === drop ? { ...item, quantity: Math.min(item.quantity + 1, p.inventorySlots) } : item)
              : [...newInventory, { name: drop, quantity: 1 }];
            if (rareItems.includes(drop)) newRareItems.push(drop);
          }
          const enemyTask = p.dailyTasks.find(t => t.id === "defeatEnemies");
          const updatedTasks = enemyTask && !enemyTask.completed
            ? p.dailyTasks.map(t => t.id === "defeatEnemies" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
            : p.dailyTasks;
          if (enemyTask && enemyTask.progress + 1 >= enemyTask.target) completeDailyTask("defeatEnemies");
          return {
            ...p,
            gold: p.gold + prev.enemy.gold,
            inventory: newInventory,
            rareItems: newRareItems,
            stats: { ...p.stats, enemiesDefeated: p.stats.enemiesDefeated + 1 },
            dailyTasks: updatedTasks,
          };
        });
        updateXP(xpGain);
        updateSkillLevel(skillName);
        setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold!${drop ? " Dropped: " + drop : ""} (+${xpGain} XP)`);
        setCombatResult({ type: "win", message: `Victory! You defeated ${prev.enemy.name}!` });
        setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
        return null;
      }

      const rawDamage = skill.effect.stunChance && Math.random() < skill.effect.stunChance ? 0 : prev.enemy.damage;
      const reducedDamage = Math.max(rawDamage - armorDefense, 0);
      const newPlayerHealth = Math.max(prev.playerHealth - reducedDamage, 0);
      newLog.push(`${prev.enemy.name} deals ${reducedDamage} damage to Kaito!`);

      if (newPlayerHealth <= 0) {
        setPlayer(p => ({ ...p, health: newPlayerHealth }));
        setGameMessage("You were defeated!");
        setCombatResult({ type: "fail", message: `Defeat! ${prev.enemy.name} overpowered you!` });
        setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
        return null;
      }

      setPlayer(p => ({ ...p, health: newPlayerHealth }));
      updateXP(15);
      updateSkillLevel(skillName);
      return { ...prev, playerHealth: newPlayerHealth, enemyHealth: newEnemyHealth, log: newLog, isAttacking: false };
    });
  }, 1000);
}, [combatState, player.equipment, player.recipes, player.trait, player.skills, player.inventory, player.maxHealth, updateXP, updateSkillLevel, completeDailyTask]);

// ---- Potions (single definition, keeping the latest version with || fix) ----
const craftPotionInCombat = useCallback((potionName) => {
  if (!combatState || combatState.isAttacking) return;
  setCombatState(prev => ({ ...prev, isAttacking: true }));
  setTimeout(() => {
    setPlayer(prev => {
      const recipe = prev.recipes.find(r => r.name === potionName && r.type === "heal");
      if (!recipe) {
        setGameMessage("No such healing potion recipe!");
        setCombatState(prevState => ({ ...prevState, isAttacking: false }));
        return prev;
      }
      const available = getAvailableIngredients;
      const hasEnough = recipe.ingredients.every(ing => {
        const item = available.find(i => i.name === ing);
        return item && item.owned && item.quantity > 0;
      });
      if (!hasEnough) {
        setGameMessage("Not enough ingredients to craft this potion!");
        setCombatState(prevState => ({ ...prevState, isAttacking: false }));
        return prev;
      }
      const costReduction = prev.skills.some(s => s.name === "Efficient Brewing") ? prev.skills.find(s => s.name === "Efficient Brewing").effect.costReduction : 0;
      const healBonus = prev.skills.some(s => s.name === "Potent Mix") ? prev.skills.find(s => s.name === "Potent Mix").effect.healBonus : 0;
      const newInventory = prev.inventory.map(item =>
        recipe.ingredients.includes(item.name) ? { ...item, quantity: item.quantity - (Math.random() < costReduction ? 0 : 1) } : item
      ).filter(item => item.quantity > 0);
      const healAmount = Math.round(prev.maxHealth * recipe.healPercent) + healBonus;
      const newHealth = Math.min(prev.health + healAmount, prev.maxHealth);
      setGameMessage(`Crafted and used ${potionName} to heal ${healAmount} HP!`);
      setCombatState(prevState => ({
        ...prevState,
        playerHealth: newHealth,
        log: [...prevState.log, `Kaito crafts and uses ${potionName} to heal ${healAmount} HP`],
        isAttacking: false,
      }));
      return { ...prev, health: newHealth, inventory: newInventory };
    });
  }, 1000);
}, [combatState, player.recipes, player.skills, player.inventory, player.maxHealth, getAvailableIngredients]);

//use effect?

useEffect(() => {
  const checkBuffExpiration = () => {
    if (gatherBuff && Date.now() >= gatherBuff.expires) {
      setGatherBuff(null);
      setGameMessage("Your gathering potion effect has worn off!");
    }
  };
  const interval = setInterval(checkBuffExpiration, 1000);
  return () => clearInterval(interval);
}, [gatherBuff]);

    // ---- Leaderboard ----
    const fetchLeaderboardData = useCallback(() => {
      const mockPlayers = [
        { name: player.name, level: player.level, gold: player.gold },
        { name: "Shinobi", level: Math.max(1, player.level + Math.floor(Math.random() * 3) - 1), gold: Math.floor(player.gold * (0.8 + Math.random() * 0.4)) },
        { name: "Aiko", level: Math.max(1, player.level + Math.floor(Math.random() * 3) - 1), gold: Math.floor(player.gold * (0.8 + Math.random() * 0.4)) },
        { name: "Ryu", level: Math.max(1, player.level + Math.floor(Math.random() * 3) - 1), gold: Math.floor(player.gold * (0.8 + Math.random() * 0.4)) },
      ].sort((a, b) => b.level - a.level || b.gold - a.gold); // Fixed syntax here
      setLeaderboardData(mockPlayers.slice(0, 4));
      if (mockPlayers[0].name === player.name) {
        setGameMessage("You’re #1 on the leaderboard! Claim 100 gold next login!");
      }
    }, [player.level, player.gold, player.name]);
  
    useEffect(() => {
      if (typeof window !== "undefined") {
        fetchLeaderboardData();
        const interval = setInterval(fetchLeaderboardData, 10000);
        return () => clearInterval(interval);
      }
    }, [fetchLeaderboardData]);
  
    // ---- Equipment ----
    const equipItem = useCallback((itemName) => {
      setPlayer(prev => {
        const item = prev.recipes.find(r => r.name === itemName && (r.type === "equip" || r.type === "armor"));
        if (!item) return prev;
        return {
          ...prev,
          equipment: {
            ...prev.equipment,
            [item.type === "equip" ? "weapon" : "armor"]: itemName
          }
        };
      });
    }, []);
  
    // ---- Town Upgrades ----
    const upgradeTown = useCallback((townName, salesCount) => {
      if (salesCount >= 10) {
        setTownLevels(prev => ({
          ...prev,
          [townName]: Math.min(prev[townName] + 1, 3),
        }));
      }
    }, []);
  
    
  // ---- Market ----
  const sellDrink = useCallback((drinkName) => {
    const recipe = player.recipes.find(r => (r.type === "sell" || r.type === "heal") && r.name === drinkName);
    if (!recipe || !recipe.sellValue) {
      setGameMessage("This item cannot be sold!");
      return;
    }
  
    const drinkInInventory = player.inventory.find(item => item.name === drinkName);
    if (!drinkInInventory || drinkInInventory.quantity === 0) {
      setGameMessage("You don’t have any of this item to sell!");
      return;
    }
  
    const currentTownData = towns.find(t => t.name === currentTown);
    const demandMultiplier = (currentTownData.demand[drinkName] || 1.0) * (currentEvent?.type === "festival" ? 1.5 : 1) * (weather.demandBonus[drinkName] || 1);
    const reward = Math.floor(recipe.sellValue * currentTownData.rewardMultiplier * demandMultiplier);
  
    setPlayer(prev => {
      const sellTask = prev.weeklyTasks.find(t => t.description === "Sell 10 Spicy Sakes" && drinkName === "Spicy Sake");
      const updatedWeeklyTasks = sellTask
        ? prev.weeklyTasks.map(t => t.description === "Sell 10 Spicy Sakes" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
        : prev.weeklyTasks;
      if (sellTask && sellTask.progress + 1 >= sellTask.target) completeWeeklyTask("sellDrinks");
      return {
        ...prev,
        inventory: prev.inventory.map(item => item.name === drinkName ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0),
        gold: prev.gold + reward,
        stats: { ...prev.stats, itemsSold: prev.stats.itemsSold + 1 },
        weeklyTasks: updatedWeeklyTasks,
      };
    });
    updateXP(reward * 2);
    upgradeTown(currentTown, player.stats.itemsSold + 1);
    setGameMessage(`You sold ${drinkName} for ${reward} gold! (+${reward * 2} XP)`);
  }, [player.inventory, player.recipes, currentTown, currentEvent, weather, updateXP, upgradeTown, player.stats.itemsSold, completeWeeklyTask]);

  // ---- Inventory Upgrades ----
  const upgradeInventory = useCallback(() => {
    setPlayer(prev => {
      if (prev.gold < 50) {
        setGameMessage("Not enough gold to upgrade inventory!");
        return prev;
      }
      return { ...prev, gold: prev.gold - 50, inventorySlots: prev.inventorySlots + 5 };
    });
    setGameMessage("Inventory upgraded! +5 slots.");
  }, [player.gold]);

  // ----guild----
  const joinGuild = useCallback((guildName) => {
    setPlayer(prev => {
      if (prev.guild) {
        setGameMessage("You’re already in a guild!");
        return prev;
      }
      return { ...prev, guild: { name: guildName, progress: 0, target: 100 } };
    });
    setGameMessage(`Joined ${guildName}! Contribute gold to guild goals.`);
  }, []);
  
  const contributeToGuild = useCallback(() => {
    setPlayer(prev => {
      if (!prev.guild || prev.gold < 10) {
        setGameMessage("Not enough gold or no guild!");
        return prev;
      }
      const newProgress = prev.guild.progress + 10;
      if (newProgress >= prev.guild.target) {
        setGameMessage(`${prev.guild.name} goal completed! Earned 50 gold!`);
        return { ...prev, guild: { ...prev.guild, progress: 0 }, gold: prev.gold + 40 }; // Net +40 after contribution
      }
      return { ...prev, guild: { ...prev.guild, progress: newProgress }, gold: prev.gold - 10 };
    });
  }, []);
  
  // ---- Gathering ----

// Updated gatherSingle
const gatherSingle = useCallback(() => {
  const town = towns.find(t => t.name === currentTown);
  const now = Date.now();
  const cooldownReduction = (player.skills.some(s => s.name === "Quick Gather") ? player.skills.find(s => s.name === "Quick Gather").effect.cooldownReduction : 0) +
    (gatherBuff && gatherBuff.type === "cooldownReduction" && now < gatherBuff.expires ? gatherBuff.value : 0);
  if (lastGatherTimes[currentTown] && (now - lastGatherTimes[currentTown]) < town.gatherCooldown * 60 * 1000 * (1 - cooldownReduction)) {
    setGameMessage("Gather cooldown active!");
    return;
  }
  const ingredient = currentEvent?.type === "storm" ? null : town.ingredients[Math.floor(Math.random() * town.ingredients.length)];
  if (!ingredient) {
    setGameMessage("Gathering halted by the storm!");
    return;
  }
  setPlayer(prev => {
    let newInventory = prev.inventory.find(i => i.name === ingredient)
      ? prev.inventory.map(i => i.name === ingredient ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventorySlots) } : i)
      : [...prev.inventory, { name: ingredient, quantity: 1 }];
    let newRareItems = [...prev.rareItems];
    const rareChanceBoost = gatherBuff && gatherBuff.type === "rareChanceBoost" && now < gatherBuff.expires ? gatherBuff.value : 0;
    const rareDrop = town.rareIngredients.find(r => Math.random() < r.chance * (prev.skills.some(s => s.name === "Lucky Find") ? 1 + prev.skills.find(s => s.name === "Lucky Find").effect.rareChance : 1) + rareChanceBoost);
    if (rareDrop) {
      newInventory = newInventory.find(i => i.name === rareDrop.name)
        ? newInventory.map(i => i.name === rareDrop.name ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventorySlots) } : i)
        : [...newInventory, { name: rareDrop.name, quantity: 1 }];
      newRareItems.push(rareDrop.name);
      setGameMessage(`Rare find! You gathered a ${rareDrop.name}!`);
    }
    if (weather.gatherBonus && Math.random() < weather.gatherBonus.chance) {
      const bonusItem = newInventory.find(i => i.name === weather.gatherBonus.ingredient);
      newInventory = bonusItem
        ? newInventory.map(i => i.name === weather.gatherBonus.ingredient ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventorySlots) } : i)
        : [...newInventory, { name: weather.gatherBonus.ingredient, quantity: 1 }];
      setGameMessage(`Weather bonus! You gathered an extra ${weather.gatherBonus.ingredient}!`);
    }
    const herbQuest = prev.quests.find(q => q.id === "herbQuest" && ingredient === "Herbs");
    const updatedQuests = herbQuest
      ? prev.quests.map(q => q.id === herbQuest.id ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
      : prev.quests;
    if (herbQuest && herbQuest.progress + 1 >= herbQuest.target) completeQuest("herbQuest");
    return {
      ...prev,
      inventory: newInventory,
      rareItems: newRareItems,
      quests: updatedQuests,
      stats: { ...prev.stats, gathers: prev.stats.gathers + 1 },
    };
  });
  setLastGatherTimes(prev => ({ ...prev, [currentTown]: now }));
  if (!gameMessage.includes("Rare find") && !gameMessage.includes("Weather bonus")) setGameMessage(`You gathered ${ingredient}!`);
}, [currentTown, lastGatherTimes, weather, completeQuest, player.skills, player.inventorySlots, currentEvent, gatherBuff]);

// Updated queueGathers
const queueGathers = useCallback((count) => {
  const town = towns.find(t => t.name === currentTown);
  const now = Date.now();
  if (player.gold < count) {
    setGameMessage("Not enough gold!");
    return;
  }
  if (lastQueuedGatherTime && (now - lastQueuedGatherTime) < 3 * 60 * 1000) {
    setGameMessage("Queued gather cooldown active!");
    return;
  }
  setPlayer(prev => {
    let newInventory = [...prev.inventory];
    let newRareItems = [...prev.rareItems];
    const rareChanceBoost = gatherBuff && gatherBuff.type === "rareChanceBoost" && now < gatherBuff.expires ? gatherBuff.value : 0;
    for (let i = 0; i < count; i++) {
      const ingredient = currentEvent?.type === "storm" ? null : town.ingredients[Math.floor(Math.random() * town.ingredients.length)];
      if (!ingredient) continue;
      const existingItem = newInventory.find(item => item.name === ingredient);
      newInventory = existingItem
        ? newInventory.map(item => item.name === ingredient ? { ...item, quantity: Math.min(item.quantity + 1, prev.inventorySlots) } : item)
        : [...newInventory, { name: ingredient, quantity: 1 }];
      if (weather.gatherBonus && Math.random() < weather.gatherBonus.chance) {
        const bonusItem = newInventory.find(i => i.name === weather.gatherBonus.ingredient);
        newInventory = bonusItem
          ? newInventory.map(i => i.name === weather.gatherBonus.ingredient ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventorySlots) } : i)
          : [...newInventory, { name: weather.gatherBonus.ingredient, quantity: 1 }];
      }
      const rareDrop = town.rareIngredients.find(r => Math.random() < r.chance * (prev.skills.some(s => s.name === "Lucky Find") ? 1 + prev.skills.find(s => s.name === "Lucky Find").effect.rareChance : 1) + rareChanceBoost);
      if (rareDrop) {
        newInventory = newInventory.find(i => i.name === rareDrop.name)
          ? newInventory.map(i => i.name === rareDrop.name ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventorySlots) } : i)
          : [...newInventory, { name: rareDrop.name, quantity: 1 }];
        newRareItems.push(rareDrop.name);
      }
    }
    const herbQuest = prev.quests.find(q => q.id === "herbQuest");
    const updatedQuests = herbQuest
      ? prev.quests.map(q => q.id === herbQuest.id ? { ...q, progress: Math.min(q.progress + count, q.target) } : q)
      : prev.quests;
    if (herbQuest && herbQuest.progress + count >= herbQuest.target) completeQuest("herbQuest");
    return {
      ...prev,
      inventory: newInventory,
      rareItems: newRareItems,
      gold: prev.gold - count,
      quests: updatedQuests,
      stats: { ...prev.stats, gathers: prev.stats.gathers + count },
    };
  });
  setLastQueuedGatherTime(now);
  setGameMessage(`You queued ${count} gathers!`);
}, [player.gold, player.inventorySlots, lastQueuedGatherTime, currentTown, weather, completeQuest, currentEvent, gatherBuff]);
 
 
  // ---- Countdowns ----
  const formatCountdown = useCallback(seconds => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateCountdowns = () => {
      const now = Date.now();
      const lastNormalTime = lastGatherTimes[currentTown];
      if (lastNormalTime) {
        const townData = towns.find(t => t.name === currentTown);
        const cooldownReduction = player.skills.some(s => s.name === "Quick Gather") ? player.skills.find(s => s.name === "Quick Gather").effect.cooldownReduction : 0;
        const cooldownSeconds = townData.gatherCooldown * 60 * (1 - cooldownReduction);
        const remainingSeconds = Math.max(cooldownSeconds - Math.floor((now - lastNormalTime) / 1000), 0);
        setCountdown(remainingSeconds);
        if (remainingSeconds === 0 && lastNormalTime) setGameMessage(`You can gather in ${currentTown} again!`);
      } else {
        setCountdown(null);
      }

      if (lastQueuedGatherTime) {
        const remainingSeconds = Math.max(3 * 60 - Math.floor((now - lastQueuedGatherTime) / 1000), 0);
        setQueuedCountdown(remainingSeconds);
        if (remainingSeconds === 0 && lastQueuedGatherTime) setGameMessage("You can queue gathers for gold again!");
      } else {
        setQueuedCountdown(null);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [lastGatherTimes, lastQueuedGatherTime, currentTown, player.skills]);

  // ---- Inventory ----
  const sortInventory = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      inventory: [...prev.inventory].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, []);

  // ---- Community Event ----
  const mockCommunityEvent = useCallback(() => ({
    description: "Community Goal: Contribute 500 gold total! Current: " + (Math.min(500, Math.floor(Math.random() * 600))) + "/500",
    action: () => {
      setPlayer(prev => {
        if (prev.gold < 50) {
          setGameMessage("Need 50 gold to contribute!");
          return prev;
        }
        const contribution = 50;
        setGameMessage("You contributed 50 gold to the community goal!");
        if (Math.random() < 0.2) { // 20% chance of goal completion
          setGameMessage("Community goal completed! Earned 100 gold!");
          return { ...prev, gold: prev.gold - contribution + 100 };
        }
        return { ...prev, gold: prev.gold - contribution };
      });
      setModals(prev => ({ ...prev, community: false }));
    },
  }), []);

  // ---- Travel ----
  const travel = useCallback((town) => {
    setTravelDestination(town);
    setModals(prev => ({ ...prev, travel: true }));
    setTimeout(() => {
      setCurrentTown(town);
      updateXP(2);
      setGameMessage(`You arrived at ${town}! (+2 XP)`);
      setModals(prev => ({ ...prev, travel: false }));
      setTravelDestination(null);
    }, 5000);
  }, [updateXP]);

  // ---- Character Customization ----
  const customizeCharacter = useCallback((newName, newAvatar, newTrait) => {
    setPlayer(prev => ({
      ...prev,
      name: newName || prev.name,
      avatar: newAvatar || prev.avatar,
      trait: newTrait || prev.trait,
    }));
    setModals(prev => ({ ...prev, customize: false }));
    setGameMessage(`Character customized! Welcome, ${newName || prev.name}!`);
  }, []);

  // ---- Modal Toggle ----
  const toggleModal = useCallback((modal) => {
    setModals(prev => ({ ...prev, [modal]: !prev[modal] }));
  }, []);

  // ---- Render ----
  return (
    <div style={{ minHeight: "100vh", maxHeight: "100vh", overflowY: "auto", background: "url('/background.jpg') center/cover" }}>
      <Head><title>Kaito's Adventure</title></Head>
      <Container fluid className="py-3 py-md-5" style={{ paddingTop: "50px" }}>
        <Button variant="info" style={{ position: "absolute", top: "10px", left: "10px", zIndex: 1000 }} onClick={() => toggleModal("leaderboard")}>Leaderboard</Button>
        <Row className="justify-content-center">
          <Col md={10}>
            <Card className={`text-center ${styles.gildedCard}`} style={{ background: "rgba(255, 255, 255, 0.9)", maxHeight: "80vh", overflowY: "auto" }}>
              <Card.Body className="p-3" style={{ paddingBottom: "clamp(2rem, 5vh, 4rem)" }}>
                <Card.Title as="h1" className="mb-3 text-danger" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>
                  <Image src={`/avatars/${player.avatar}.jpg`} alt="Avatar" width={32} height={32} style={{ marginRight: "10px" }} />
                  {player.name} (Level {player.level})
                </Card.Title>
                <Card.Text>Health: {player.health}/{player.maxHealth} | Gold: {player.gold} | XP: {player.xp}</Card.Text>
                <ProgressBar now={xpProgress} label={`${Math.round(xpProgress)}%`} variant="success" className="my-2" style={{ width: "50%", margin: "0 auto" }} />
                <Card.Text>Current Town: {currentTown} (Level {townLevels[currentTown]}) | Weather: {weather.type}</Card.Text>
                {currentEvent && (
                  <Card.Text className="text-warning">
                    {currentEvent.description} {eventTimer ? `(${formatCountdown(Math.max(0, Math.floor((eventTimer - Date.now()) / 1000)))})` : ""}
                  </Card.Text>
                )}
                <Card.Text className="mb-4 text-muted">{gameMessage}</Card.Text>
                <h2>Inventory (Max: {player.inventorySlots})</h2>
                <Button variant="outline-secondary" size="sm" onClick={sortInventory} className="mb-2">Sort Inventory</Button>
                <Button variant="outline-primary" size="sm" onClick={upgradeInventory} className="mb-2 ml-2">Upgrade Slots (50g)</Button>
                <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "min(400px, 90vw)", maxHeight: "30vh", overflowY: "auto" }}>
  {player.inventory.map(item => (
    <ListGroup.Item key={item.name}>
      {item.name}: {item.quantity}
      {(player.recipes.find(r => r.name === item.name && (r.type === "equip" || r.type === "armor"))) && (
        <Button variant="outline-primary" size="sm" className="ml-2" onClick={() => equipItem(item.name)}>Equip</Button>
      )}
      {(player.recipes.find(r => r.name === item.name && r.type === "gather")) && (
        <Button variant="outline-success" size="sm" className="ml-2" onClick={() => useGatherPotion(item.name)}>Use</Button>
      )}
    </ListGroup.Item>
  ))}
</ListGroup>
                <Card.Text>Rare Items: {player.rareItems.join(", ") || "None"}</Card.Text>
                <Card.Text>Equipped: Weapon: {player.equipment.weapon || "None"} | Armor: {player.equipment.armor || "None"}</Card.Text>
                <h2 className="mt-4">Available Ingredients in {currentTown}</h2>
                <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "min(400px, 90vw)", maxHeight: "20vh", overflowY: "auto" }}>
                  {getAvailableIngredients.map(item => (
                    <ListGroup.Item key={item.name}>
                      {item.name}: {item.owned ? item.quantity : towns.find(t => t.name === currentTown).ingredients.includes(item.name) ? "∞ (Town)" : "0"}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
              {/* Bottom Navigation Bar */}
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255, 255, 255, 0.9)", padding: "0.5rem 0", borderTop: "1px solid #ccc" }}>
                <Container>
                  <Row className="flex-wrap justify-content-center">
                    <Col xs="auto" className="mb-2">
                      <Dropdown>
                        <Dropdown.Toggle variant="primary" size="sm">Craft</Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => toggleModal("craft")}>Craft Items</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("healing")}>Craft Healing Potion</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>
                    <Col xs="auto" className="mb-2">
                      <Button variant="danger" size="sm" onClick={startCombat}>Combat</Button>
                    </Col>
                    <Col xs="auto" className="mb-2">
                      <Dropdown>
                        <Dropdown.Toggle variant="success" size="sm">Town</Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => toggleModal("market")}>Visit Market</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("gather")}>Gather Ingredient</Dropdown.Item>
                          <Dropdown.Header>Travel</Dropdown.Header>
                          {towns.map(town => (
                            <Dropdown.Item
                              key={town.name}
                              onClick={() => travel(town.name)}
                              disabled={currentTown === town.name || modals.travel}
                            >
                              {town.name}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>
                    <Col xs="auto" className="mb-2">
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-info" size="sm">Quests ({player.quests.length})</Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => toggleModal("quests")}>Quests</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("daily")}>Tasks</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>
                    <Col xs="auto" className="mb-2">
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" size="sm">Stats</Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => toggleModal("stats")}>Stats</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("skills")}>Skills</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("leaderboard")}>Leaderboard</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>
                    <Col xs="auto" className="mb-2">
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-dark" size="sm">More</Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => toggleModal("community")}>Community</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("customize")}>Customize</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("events")}>Events</Dropdown.Item>
                          <Dropdown.Item onClick={() => toggleModal("guild")}>Guild {player.guild ? `(${player.guild.name})` : ""}</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>
                  </Row>
                  {countdown !== null && countdown > 0 && <p className="mt-1 text-center" style={{ fontSize: "0.875rem" }}>Gather: {formatCountdown(countdown)}</p>}
                  {queuedCountdown !== null && queuedCountdown > 0 && <p className="mt-1 text-center" style={{ fontSize: "0.875rem" }}>Queued: {formatCountdown(queuedCountdown)}</p>}
                </Container>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
      {/* Modals remain unchanged for brevity, but apply max-height as suggested */}

     <Modal show={modals.quests} onHide={() => toggleModal("quests")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Quests</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <ListGroup variant="flush">
      {player.quests.map(quest => (
        <ListGroup.Item key={quest.id}>
          {quest.description} - {quest.progress}/{quest.target}<br />
          Reward: {quest.reward.gold ? `${quest.reward.gold} Gold` : ""} {quest.reward.xp ? `${quest.reward.xp} XP` : ""}
        </ListGroup.Item>
      ))}
    </ListGroup>
    <Button variant="primary" onClick={() => addQuest(towns.find(t => t.name === currentTown).npcs[0].quest)} className="mt-3" disabled={player.quests.length >= 3}>Accept New Quest</Button>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("quests")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.leaderboard} onHide={() => toggleModal("leaderboard")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Leaderboard</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <ListGroup variant="flush">
      {leaderboardData.map((entry, index) => (
        <ListGroup.Item key={index}>{index + 1}. {entry.name} - Level {entry.level} - {entry.gold} Gold</ListGroup.Item>
      ))}
    </ListGroup>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("leaderboard")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.craft} onHide={() => toggleModal("craft")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Craft Items</Modal.Title></Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Form>
            <h5>Select Ingredients:</h5>
            {getAvailableIngredients.map(item => (
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
          <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} id="craft-tabs" className="mt-3">
            <Tab eventKey="drinks" title="Drinks">
              <p className="mt-3">Known Sellable Recipes:</p>
              <ul>{player.recipes.filter(r => r.type === "sell").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")}</li>)}</ul>
            </Tab>
            <Tab eventKey="weapons" title="Weapons">
              <p className="mt-3">Known Weapon Recipes:</p>
              <ul>{player.recipes.filter(r => r.type === "equip").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Bonus: +{r.bonus.damage} Damage)</li>)}</ul>
            </Tab>
            <Tab eventKey="armor" title="Armor">
              <p className="mt-3">Known Armor Recipes (Unlocks at Level 10):</p>
              <ul>{player.recipes.filter(r => r.type === "armor").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Defense: {r.bonus.defense}) {r.unlockLevel > player.level ? "(Locked)" : ""}</li>)}</ul>
            </Tab>
            <Tab eventKey="potions" title="Potions">
              <p className="mt-3">Known Potion Recipes:</p>
              <ul>
                {player.recipes.filter(r => r.type === "heal" || r.type === "gather").map(r => (
                  <li key={r.name}>
                    {r.name}: {r.ingredients.join(", ")}
                    {r.type === "heal" && ` (Heal: ${r.healPercent * 100}% HP, Sell: ${r.sellValue} gold)`}
                    {r.type === "gather" && ` (Effect: ${r.effect.rareChanceBoost ? `+${r.effect.rareChanceBoost * 100}% Rare Chance` : `-${r.effect.cooldownReduction * 100}% Cooldown`}, ${r.effect.duration / 60000} min)`}
                  </li>
                ))}
              </ul>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => toggleModal("craft")}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            const selectedRecipe = player.recipes.find(r => 
              r.ingredients.every(ing => selectedIngredients.includes(ing)) && 
              r.ingredients.length === selectedIngredients.length
            );
            craftItem(selectedRecipe ? selectedRecipe.type : activeTab);
          }}>Craft</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={modals.healing} onHide={() => toggleModal("healing")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Healing Potions</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <p>You can craft healing potions for sale in the market in Craft Items, but battle healing potions can only be crafted in combat.</p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => toggleModal("healing")}>Close</Button>
  </Modal.Footer>
</Modal>

<Modal show={modals.gather} onHide={() => toggleModal("gather")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Gather Options in {currentTown}</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <Card className="mb-3">
      <Card.Body>
        <Card.Title>Normal Gather</Card.Title>
        <Card.Text>Gather one ingredient for free (cooldown varies by town). {weather.gatherBonus ? `Bonus: ${weather.gatherBonus.chance * 100}% chance for ${weather.gatherBonus.ingredient}` : ""}</Card.Text>
        <Button variant="warning" onClick={gatherSingle} disabled={countdown > 0}>Gather Now</Button>
      </Card.Body>
    </Card>
    <Card>
      <Card.Body>
        <Card.Title>Queue Gathers for Gold</Card.Title>
        <Card.Text>Pay 1 gold per gather, up to 5 (3-minute global cooldown).</Card.Text>
        <div>
          {[1, 2, 3, 4, 5].map(count => (
            <Button
              key={count}
              variant="outline-warning"
              className="m-1"
              onClick={() => queueGathers(count)}
              disabled={player.gold < count || queuedCountdown > 0}
            >
              {count} ({count} gold)
            </Button>
          ))}
        </div>
      </Card.Body>
    </Card>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("gather")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.combat} onHide={() => toggleModal("combat")} centered className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Body className="p-0" style={{ maxHeight: "80vh", overflowY: "auto" }}>
    <Card className="border-0">
      <Card.Header className="bg-danger text-center text-white"><h3>Combat Arena</h3></Card.Header>
      <Card.Body className={styles.combatBody}>
        {combatState && (
          <Row>
            <Col md={5} className="text-center">
              <h4>Kaito</h4>
              <div className={`${styles.healthBar} mb-3`}>
                <div className={styles.healthFill} style={{ width: `${(combatState.playerHealth / player.maxHealth) * 100}%` }} />
              </div>
              <p>Health: {combatState.playerHealth}/{player.maxHealth}</p>
              <div className={combatState.isAttacking ? styles.attacking : ""}>[Kaito Placeholder]</div>
            </Col>
            <Col md={2} className="align-items-center d-flex justify-content-center"><h2>VS</h2></Col>
            <Col md={5} className="text-center">
              <h4>{combatState.enemy.name}</h4>
              <div className={`${styles.healthBar} mb-3`}>
                <div className={styles.healthFill} style={{ width: `${(combatState.enemyHealth / combatState.enemy.health) * 100}%` }} />
              </div>
              <p>Health: {combatState.enemyHealth}/{combatState.enemy.health}</p>
              <div className={combatState.isAttacking ? styles.enemyHit : ""}>[Enemy Placeholder]</div>
            </Col>
          </Row>
        )}
        <div className="mt-3 text-center">
          <Button variant="danger" onClick={() => attackEnemy("Basic Attack")} disabled={!combatState || combatState?.isAttacking || combatResult} className="m-1">Basic Attack</Button>
          <Form inline className="d-inline-block m-1">
            <Form.Select
              onChange={(e) => attackEnemy(e.target.value)}
              disabled={!combatState || combatState?.isAttacking || combatResult}
              style={{ width: "auto", display: "inline-block" }}
            >
              <option value="">Select Skill</option>
              {player.skills
                .filter(s => s.level > 0 && (s.tree === "Warrior" || s.effect.damage || s.effect.stunChance))
                .map(skill => (
                  <option key={skill.name} value={skill.name}>
                    {skill.name} (Lv {skill.level})
                  </option>
                ))}
            </Form.Select>
          </Form>
          <Form inline className="d-inline-block m-1">
            <Form.Select
              onChange={(e) => craftPotionInCombat(e.target.value)}
              disabled={!combatState || combatState?.isAttacking || combatResult}
              style={{ width: "auto", display: "inline-block" }}
            >
              <option value="">Craft Potion</option>
              {player.recipes
                .filter(r => r.type === "heal")
                .map(recipe => (
                  <option key={recipe.name} value={recipe.name}>
                    {recipe.name} ({recipe.ingredients.join(", ")})
                  </option>
                ))}
            </Form.Select>
          </Form>
        </div>
        {combatState && (
          <ListGroup className="mt-3" style={{ maxHeight: "20vh", overflowY: "auto" }}>
            {combatState.log.map((entry, idx) => <ListGroup.Item key={idx}>{entry}</ListGroup.Item>)}
          </ListGroup>
        )}
        {combatResult && (
          <Alert variant={combatResult.type === "win" ? "success" : "danger"} className={styles.combatResult}>
            {combatResult.message}
          </Alert>
        )}
      </Card.Body>
      <Card.Footer className="text-center">
        <Button variant="secondary" onClick={() => toggleModal("combat")} disabled={combatResult}>Flee</Button>
      </Card.Footer>
    </Card>
  </Modal.Body>
</Modal>

<Modal show={modals.market} onHide={() => toggleModal("market")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>{currentTown} Market</Modal.Title></Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <h5>Sell Your Items:</h5>
          <ListGroup className="mb-3">
            {player.inventory.filter(item => player.recipes.some(r => r.name === item.name && (r.type === "sell" || r.type === "heal"))).map(item => {
              const recipe = player.recipes.find(r => r.name === item.name);
              const townData = towns.find(t => t.name === currentTown);
              const demandMultiplier = (townData.demand[item.name] || 1.0) * (currentEvent?.type === "festival" ? 1.5 : 1) * (weather.demandBonus[item.name] || 1);
              const price = Math.floor((recipe.baseGold || recipe.sellValue) * townData.rewardMultiplier * demandMultiplier);
              return (
                <ListGroup.Item key={item.name} className="align-items-center d-flex justify-content-between">
                  <span>{item.name}: {item.quantity} (Sells for {price} gold each)</span>
                  <Button variant="outline-success" size="sm" onClick={() => sellDrink(item.name)} disabled={item.quantity === 0}>Sell One</Button>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          <h5>NPC Buyers:</h5>
    <ListGroup>
      {towns.find(t => t.name === currentTown).npcOffers.map((offer, idx) => (
        <ListGroup.Item key={idx} className="align-items-center d-flex justify-content-between">
          <span>{offer.ingredient} (Buy for {Math.floor(offer.price / townLevels[currentTown])} gold)</span>
          <Button variant="outline-primary" size="sm" onClick={() => buyIngredient(offer.ingredient, offer.price)} disabled={player.gold < Math.floor(offer.price / townLevels[currentTown])}>Buy One</Button>
        </ListGroup.Item>
      ))}
    </ListGroup>

          <Button variant="outline-info" className="mt-3" onClick={() => { setSelectedNPC(towns.find(t => t.name === currentTown).npcs[0]); toggleModal("npc"); }}>Talk to NPC</Button>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("market")}>Close</Button></Modal.Footer>
      </Modal>

<Modal show={modals.npc} onHide={() => toggleModal("npc")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Talk to {selectedNPC?.name}</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <p>{selectedNPC?.dialogue}</p>
    {selectedNPC?.quest && !player.quests.some(q => q.id === selectedNPC.quest.id) && (
      <Button variant="primary" onClick={() => addQuest(selectedNPC.quest)}>Accept Quest</Button>
    )}
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("npc")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.daily} onHide={() => toggleModal("daily")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Daily & Weekly Tasks</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <p>Daily Login Bonus: 20 Gold (Claimed today)</p>
    <h5>Daily Challenges:</h5>
    <ListGroup variant="flush">
      {player.dailyTasks.map(task => (
        <ListGroup.Item key={task.id}>
          {task.description} - {task.progress}/{task.target}<br />
          Reward: {task.reward.gold ? `${task.reward.gold} Gold` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}<br />
          Time Left: {formatCountdown(Math.max(0, Math.floor((task.expires - Date.now()) / 1000)))}
          {task.completed && " (Completed)"}
        </ListGroup.Item>
      ))}
    </ListGroup>
    <h5 className="mt-3">Weekly Challenges:</h5>
    <ListGroup variant="flush">
      {player.weeklyTasks.map(task => (
        <ListGroup.Item key={task.id}>
          {task.description} - {task.progress}/{task.target}<br />
          Reward: {task.reward.gold ? `${task.reward.gold} Gold` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}<br />
          Time Left: {formatCountdown(Math.max(0, Math.floor((task.expires - Date.now()) / 1000)))}
          {task.completed && " (Completed)"}
        </ListGroup.Item>
      ))}
    </ListGroup>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("daily")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.stats} onHide={() => toggleModal("stats")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Lifetime Stats</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <ListGroup variant="flush">
      <ListGroup.Item>Enemies Defeated: {player.stats.enemiesDefeated}</ListGroup.Item>
      <ListGroup.Item>Potions Crafted: {player.stats.potionsCrafted}</ListGroup.Item>
      <ListGroup.Item>Items Sold: {player.stats.itemsSold}</ListGroup.Item>
      <ListGroup.Item>Gathers Performed: {player.stats.gathers}</ListGroup.Item>
    </ListGroup>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("stats")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.community} onHide={() => toggleModal("community")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Community Events</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <p>{mockCommunityEvent().description}</p>
    <Button variant="primary" onClick={mockCommunityEvent().action}>Perform Action</Button>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("community")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.customize} onHide={() => toggleModal("customize")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Customize Character</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <Form>
      <Form.Group>
        <Form.Label>Name</Form.Label>
        <Form.Control type="text" defaultValue={player.name} id="customName" />
      </Form.Group>
      <Form.Group>
        <Form.Label>Avatar</Form.Label>
        <Form.Control as="select" defaultValue={player.avatar} id="customAvatar">
          <option value="default">Default</option>
          <option value="warrior">Warrior</option>
          <option value="craftsman">Craftsman</option>
        </Form.Control>
      </Form.Group>
      <Form.Group>
        <Form.Label>Trait</Form.Label>
        <Form.Control as="select" defaultValue={player.trait} id="customTrait">
          <option value={null}>None</option>
          <option value="warrior">Warrior (+5 Combat Damage)</option>
          <option value="craftsman">Craftsman (+10% Craft Success)</option>
        </Form.Control>
      </Form.Group>
      <Button variant="primary" onClick={() => customizeCharacter(
        document.getElementById("customName").value,
        document.getElementById("customAvatar").value,
        document.getElementById("customTrait").value
      )}>Save</Button>
    </Form>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("customize")}>Close</Button></Modal.Footer>
</Modal>

      <Modal show={modals.guild} onHide={() => toggleModal("guild")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Guild</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    {player.guild ? (
      <>
        <p>Member of: {player.guild.name}</p>
        <p>Goal Progress: {player.guild.progress}/{player.guild.target} Gold</p>
        <Button variant="primary" onClick={contributeToGuild}>Contribute 10 Gold</Button>
      </>
    ) : (
      <>
        <p>Join a guild to contribute to collective goals!</p>
        <Button variant="outline-primary" onClick={() => joinGuild("Dragon Clan")}>Join Dragon Clan</Button>
        <Button variant="outline-primary" onClick={() => joinGuild("Mist Guardians")}>Join Mist Guardians</Button>
      </>
    )}
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("guild")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.skills} onHide={() => toggleModal("skills")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Skills</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <Tabs defaultActiveKey="Warrior" id="skill-tabs" className="mb-3">
      {Object.keys(skillTrees).map(tree => (
        <Tab eventKey={tree} title={tree} key={tree}>
          <ListGroup variant="flush">
            {skillTrees[tree].map(skill => {
              const playerSkill = player.skills.find(s => s.name === skill.name);
              return (
                <ListGroup.Item key={skill.name}>
                  {skill.name} - Level {playerSkill ? playerSkill.level : 0} (Uses: {playerSkill ? playerSkill.uses : 0})
                  <br />
                  {skill.effect.damage && `Damage: ${playerSkill ? playerSkill.effect.damage : skill.effect.damage}`}
                  {skill.effect.healBonus && ` Heal Bonus: ${playerSkill ? playerSkill.effect.healBonus : skill.effect.healBonus}`}
                  {skill.effect.costReduction && ` Cost Reduction: ${(playerSkill ? playerSkill.effect.costReduction : skill.effect.costReduction) * 100}%`}
                  {skill.effect.cooldownReduction && ` Cooldown Reduction: ${(playerSkill ? playerSkill.effect.cooldownReduction : skill.effect.cooldownReduction) * 100}%`}
                  {skill.effect.rareChance && ` Rare Chance: ${(playerSkill ? playerSkill.effect.rareChance : skill.effect.rareChance) * 100}%`}
                  {skill.effect.stunChance && ` Stun Chance: ${(playerSkill ? playerSkill.effect.stunChance : skill.effect.stunChance) * 100}%`}
                  {!playerSkill && (
                    <Button variant="outline-primary" size="sm" className="ml-2" onClick={() => unlockSkill(skill.name, tree)}>
                      Unlock ({skill.cost.gold} Gold)
                    </Button>
                  )}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Tab>
      ))}
    </Tabs>
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("skills")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.events} onHide={() => toggleModal("events")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Current Events</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    {currentEvent ? (
      <p>{currentEvent.description} (Time Left: {formatCountdown(Math.max(0, Math.floor((eventTimer - Date.now()) / 1000)))})</p>
    ) : (
      <p>No active events right now.</p>
    )}
  </Modal.Body>
  <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("events")}>Close</Button></Modal.Footer>
</Modal>

<Modal show={modals.travel} backdrop="static" keyboard={false} className={styles.travelModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Body className={styles.travelBody} style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <div className={styles.travelContent}>
      <Image src="/travel-chibi.jpg" alt="Traveling Chibi" width={100} height={100} className={styles.travelChibi} />
      <p>Traveling to {travelDestination}...</p>
    </div>
  </Modal.Body>
</Modal>

<Modal show={modals.guide} onHide={() => toggleModal("guide")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
  <Modal.Header closeButton><Modal.Title>Welcome to Kaito's Adventure!</Modal.Title></Modal.Header>
  <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
    <h5>Overview</h5>
    <p>Welcome to <em>Kaito's Adventure</em>, a browser-based RPG where you play as Kaito Brewmaster. Start with 5 gold, 100 health, and a small inventory (Water x2, Herbs x1) in Sakura Village. Explore, craft, fight, and rise to the top!</p>
    
    <h5>Core Mechanics</h5>
    <ol>
      <li><strong>Towns & Travel</strong>: Explore Sakura Village, Iron Port, Mist Hollow. Travel via "Town" dropdown (+2 XP).</li>
      <li><strong>Gathering</strong>: Single (free, cooldown) or Queue (1 gold each, 3-min cooldown). Weather boosts: Rainy (Water), Foggy (Mist Essence).</li>
      <li><strong>Crafting</strong>: Make sellable items (e.g., Herbal Tea), weapons, armor (level 10+), healing potions. 80% success (+10% Craftsman trait).</li>
      <li><strong>Combat</strong>: Fight Bandits, Ninjas, Golems. Craft potions in-combat to heal (even at 0 health!). Earn gold, XP, drops.</li>
      <li><strong>Market</strong>: Sell items/potions, buy ingredients. Prices vary by town demand.</li>
      <li><strong>Quests & Tasks</strong>: NPC quests (max 3), daily (e.g., 2 enemies), weekly (e.g., 10 Sakes).</li>
      <li><strong>Progression</strong>: 150 XP/level (+10 HP), unlock skills, upgrade inventory (+5 slots, 50 gold).</li>
      <li><strong>Guilds</strong>: Join, contribute 10 gold to 100-gold goals (+50 gold).</li>
      <li><strong>Events</strong>: Festivals (boost demand), raids (combat), storms (reduce gathering).</li>
    </ol>
    
    <h5>Objectives</h5>
    <p><strong>Short-Term</strong>: Gather, craft, sell, complete quests. <strong>Long-Term</strong>: Level up, unlock skills/armor, top the leaderboard.</p>
    
    <h5>Tips</h5>
    <ul>
      <li>Start in Sakura: Craft Herbal Tea, sell for gold.</li>
      <li>0 Health? Enter combat, craft a potion fast (keep Water/Herbs).</li>
      <li>Get "Efficient Brewing" (cheaper crafts), "Quick Gather" (faster gathers).</li>
      <li>Upgrade inventory early (50 gold).</li>
      <li>Sell Strong Healing Potions in Mist Hollow (1.2x demand).</li>
    </ul>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="primary" onClick={() => toggleModal("guide")}>Got it!</Button>
  </Modal.Footer>
</Modal>
    </div>
  );
};

export default Home;