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
  Alert,
  Tabs,
  Tab,
} from "react-bootstrap";
import styles from '../styles/Combat.module.css';
import debounce from 'lodash/debounce';

// Constants
const defaultPlayer = {
  name: "Kaito Brewmaster",
  gold: 5,
  health: 100,
  xp: 0,
  level: 1,
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
    { name: "Combat Blade", ingredients: ["Iron Ore", "Wood"], type: "equip", bonus: { damage: 5 } },
    { name: "Steel Axe", ingredients: ["Iron Ore", "Iron Ore"], type: "equip", bonus: { damage: 8 } },
    { name: "Shadow Dagger", ingredients: ["Shadow Root", "Iron Ore"], type: "equip", bonus: { damage: 6 } },
  ],
  equipment: { weapon: null },
  quests: [],
  skills: [],
  stats: { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 },
  lastLogin: null,
  dailyTasks: [],
};

const towns = [
  {
    name: "Sakura Village",
    ingredients: ["Water", "Herbs", "Wood"],
    gatherCooldown: 0.5,
    rewardMultiplier: 1,
    demand: { "Herbal Tea": 1.0, "Spicy Sake": 0.8, "Mist Potion": 0.5 },
    npcOffers: [{ ingredient: "Pepper", price: 5 }, { ingredient: "Mist Essence", price: 7 }],
  },
  {
    name: "Iron Port",
    ingredients: ["Pepper", "Sugar", "Iron Ore"],
    gatherCooldown: 1,
    rewardMultiplier: 2,
    demand: { "Herbal Tea": 0.7, "Spicy Sake": 1.2, "Mist Potion": 0.9 },
    npcOffers: [{ ingredient: "Water", price: 5 }, { ingredient: "Shadow Root", price: 8 }],
  },
  {
    name: "Mist Hollow",
    ingredients: ["Mist Essence", "Shadow Root"],
    gatherCooldown: 2,
    rewardMultiplier: 4,
    demand: { "Herbal Tea": 0.6, "Spicy Sake": 0.9, "Mist Potion": 1.5 },
    npcOffers: [{ ingredient: "Herbs", price: 6 }, { ingredient: "Sugar", price: 5 }],
  },
];

const allIngredients = ["Water", "Herbs", "Pepper", "Sugar", "Mist Essence", "Shadow Root", "Iron Ore", "Wood"];

const availableSkills = [
  { name: "Healing Strike", levelReq: 3, effect: { heal: 10, damage: 0 } },
  { name: "Power Slash", levelReq: 5, effect: { heal: 0, damage: 15 } },
];

// Home Component
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

  // Persistence
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
          skills: parsedPlayer.skills || [],
          equipment: parsedPlayer.equipment || { weapon: null },
          quests: parsedPlayer.quests || [],
          stats: parsedPlayer.stats || { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 },
          dailyTasks: parsedPlayer.dailyTasks || [],
          lastLogin: parsedPlayer.lastLogin || null,
        });
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
      if (typeof window === "undefined") return;
      localStorage.setItem("player", JSON.stringify(player));
      localStorage.setItem("currentTown", currentTown);
      localStorage.setItem("lastGatherTimes", JSON.stringify(lastGatherTimes));
      localStorage.setItem("lastQueuedGatherTime", lastQueuedGatherTime ? lastQueuedGatherTime.toString() : null);
      localStorage.setItem("townLevels", JSON.stringify(townLevels));
    }, 500),
    [player, currentTown, lastGatherTimes, lastQueuedGatherTime, townLevels]
  );

  useEffect(() => {
    saveToLocalStorage();
    return () => saveToLocalStorage.cancel();
  }, [saveToLocalStorage]);

  // XP and Leveling
  const updateXP = useCallback((xpGain) => {
    setPlayer(prev => {
      const newXP = prev.xp + xpGain;
      const newLevel = Math.floor(newXP / 150) + 1;
      return { ...prev, xp: newXP, level: newLevel };
    });
  }, [player.xp]); // Added player.xp to log current value

  }, []);

  const xpProgress = useMemo(() => {
    const xpForNext = player.level * 150;
    const xpForCurrent = (player.level - 1) * 150;
    return Math.min(((player.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100, 100);
  }, [player.xp, player.level]);

  // Quests
  const addQuest = useCallback(() => {
    const questsList = [
      { id: "gatherHerbs", description: "Gather 5 Herbs", progress: 0, target: 5, reward: { gold: 50, xp: 50 } },
      { id: "defeatBandits", description: "Defeat 3 Bandits", progress: 0, target: 3, reward: { gold: 75, xp: 75 } },
    ];
    const newQuest = questsList[Math.floor(Math.random() * questsList.length)];
    setPlayer(prev => ({
      ...prev,
      quests: prev.quests.length < 3 ? [...prev.quests, newQuest] : prev.quests,
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

  // Daily Tasks
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

  useEffect(() => {
    if (player.dailyTasks.length === 0) {
      setPlayer(prev => ({
        ...prev,
        dailyTasks: [
          { id: "defeatEnemies", description: "Defeat 2 enemies", progress: 0, target: 2, reward: { gold: 30, xp: 30 } },
          { id: "craftPotions", description: "Craft 3 potions", progress: 0, target: 3, reward: { gold: 20, xp: 20 } },
        ],
        lastLogin: prev.lastLogin || Date.now(),
      }));
    }
  }, [player.dailyTasks]);

  // Leaderboard
  const fetchLeaderboardData = useCallback(() => {
    const mockPlayers = [
      { name: "Kaito", level: player.level, gold: player.gold },
      { name: "Shinobi", level: Math.floor(Math.random() * 10) + 1, gold: Math.floor(Math.random() * 100) },
      { name: "Aiko", level: Math.floor(Math.random() * 10) + 1, gold: Math.floor(Math.random() * 100) },
      { name: "Ryu", level: Math.floor(Math.random() * 10) + 1, gold: Math.floor(Math.random() * 100) },
    ].sort((a, b) => b.level - a.level || b.gold - a.gold);
    setLeaderboardData(mockPlayers.slice(0, 4));
  }, [player.level, player.gold]);

  useEffect(() => {
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  // Equipment
  const equipItem = useCallback((itemName) => {
    setPlayer(prev => {
      const item = prev.recipes.find(r => r.name === itemName && r.type === "equip");
      if (!item) return prev;
      return { ...prev, equipment: { weapon: itemName } };
    });
  }, []);

  // Town Upgrades
  const upgradeTown = useCallback((townName, salesCount) => {
    if (salesCount >= 10) {
      setTownLevels(prev => ({
        ...prev,
        [townName]: Math.min(prev[townName] + 1, 3),
      }));
    }
  }, []);

  // Skills
  useEffect(() => {
    setPlayer(prev => {
      const currentSkills = prev.skills || [];
      const newSkills = availableSkills.filter(skill => prev.level >= skill.levelReq && !currentSkills.some(s => s.name === skill.name));
      return { ...prev, skills: [...currentSkills, ...newSkills] };
    });
  }, [player.level]);

  // Combat
  const startCombat = useCallback(() => {
    setCombatState({
      playerHealth: player.health,
      enemy: { name: "Bandit", health: 50, damage: 10, gold: 10 },
      enemyHealth: 50,
      isAttacking: false,
      log: [],
    });
    setCombatResult(null);
    setModals(prev => ({ ...prev, combat: true }));
    setGameMessage("Combat started!");
  }, [player.health]);

  const attackEnemy = useCallback(() => {
    if (!combatState || combatState.isAttacking) return;
    setCombatState(prev => ({ ...prev, isAttacking: true }));
    setTimeout(() => {
      setCombatState(prev => {
        if (!prev) return null;
        const weaponDamage = player.equipment.weapon ? player.recipes.find(r => r.name === player.equipment.weapon)?.bonus.damage || 0 : 0;
        const newEnemyHealth = Math.max(prev.enemyHealth - (10 + weaponDamage), 0);
        const newLog = [...prev.log, `Kaito attacks for ${10 + weaponDamage} damage!`];

        if (newEnemyHealth <= 0) {
          setPlayer(p => ({
            ...p,
            gold: p.gold + prev.enemy.gold,
            stats: { ...p.stats, enemiesDefeated: p.stats.enemiesDefeated + 1 },
          }));
          updateXP(prev.enemy.gold * 10);
          setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold! (+${prev.enemy.gold * 10} XP)`);
          setCombatResult({ type: "win", message: `Victory! You defeated ${prev.enemy.name}!` });
          setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
          return null;
        }

        const newPlayerHealth = Math.max(prev.playerHealth - prev.enemy.damage, 0);
        newLog.push(`${prev.enemy.name} deals ${prev.enemy.damage} damage to Kaito!`);

        if (newPlayerHealth <= 0) {
          setPlayer(p => ({ ...p, health: newPlayerHealth }));
          setGameMessage("You were defeated!");
          setCombatResult({ type: "fail", message: `Defeat! ${prev.enemy.name} overpowered you!` });
          setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
          return null;
        }

        setPlayer(p => ({ ...p, health: newPlayerHealth }));
        updateXP(15);
        return { ...prev, playerHealth: newPlayerHealth, enemyHealth: newEnemyHealth, log: newLog, isAttacking: false };
      });
    }, 1000);
  }, [combatState, player.equipment, player.recipes, updateXP]);

  const useSkill = useCallback((skillName) => {
    if (!combatState || combatState.isAttacking) return;
    const skill = player.skills.find(s => s.name === skillName);
    if (!skill) return;

    setCombatState(prev => ({ ...prev, isAttacking: true }));
    setTimeout(() => {
      setCombatState(prev => {
        if (!prev) return null;
        const newPlayerHealth = Math.min(prev.playerHealth + skill.effect.heal, 100);
        const newEnemyHealth = Math.max(prev.enemyHealth - skill.effect.damage, 0);
        const newLog = [...prev.log, `Kaito uses ${skillName}!`];

        if (newEnemyHealth <= 0) {
          const dropChance = Math.random() < 0.1;
          const drop = dropChance ? "Mist Essence" : null;
          setPlayer(p => {
            let newInventory = [...p.inventory];
            if (drop) {
              const existingItem = newInventory.find(item => item.name === drop);
              newInventory = existingItem
                ? newInventory.map(item => item.name === drop ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item)
                : [...newInventory, { name: drop, quantity: 1 }];
            }
            const banditQuest = p.quests.find(q => q.id === "defeatBandits" && prev.enemy.name === "Bandit");
            const updatedQuests = banditQuest
              ? p.quests.map(q => q.id === "defeatBandits" ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
              : p.quests;
            if (banditQuest && banditQuest.progress + 1 >= banditQuest.target) completeQuest("defeatBandits");
            const enemyTask = p.dailyTasks.find(t => t.id === "defeatEnemies");
            const updatedTasks = enemyTask
              ? p.dailyTasks.map(t => t.id === "defeatEnemies" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
              : p.dailyTasks;
            if (enemyTask && enemyTask.progress + 1 >= enemyTask.target) completeDailyTask("defeatEnemies");
            return {
              ...p,
              gold: p.gold + prev.enemy.gold,
              inventory: newInventory,
              quests: updatedQuests,
              stats: { ...p.stats, enemiesDefeated: p.stats.enemiesDefeated + 1 },
              dailyTasks: updatedTasks,
            };
          });
          updateXP(prev.enemy.gold * 10);
          setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold!${drop ? ` Dropped: ${drop}` : ""} (+${prev.enemy.gold * 10} XP)`);
          setCombatResult({ type: "win", message: `Victory! You defeated ${prev.enemy.name}!` });
          setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
          return null;
        }

        const finalPlayerHealth = Math.max(newPlayerHealth - prev.enemy.damage, 0);
        newLog.push(`${prev.enemy.name} deals ${prev.enemy.damage} damage to Kaito!`);

        if (finalPlayerHealth <= 0) {
          setPlayer(p => ({ ...p, health: finalPlayerHealth }));
          setGameMessage("You were defeated!");
          setCombatResult({ type: "fail", message: `Defeat! ${prev.enemy.name} overpowered you!` });
          setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
          return null;
        }

        setPlayer(p => ({ ...p, health: finalPlayerHealth }));
        updateXP(15);
        return { ...prev, playerHealth: finalPlayerHealth, enemyHealth: newEnemyHealth, log: newLog, isAttacking: false };
      });
    }, 1000);
  }, [combatState, player.skills, updateXP, completeQuest, completeDailyTask]);

  // Crafting
  const getAvailableIngredients = useMemo(() => {
    const townIngredients = towns.find(t => t.name === currentTown).ingredients;
    return allIngredients.map(name => ({
      name,
      quantity: player.inventory.find(i => i.name === name)?.quantity || 0,
      owned: !!player.inventory.find(i => i.name === name),
    }));
  }, [player.inventory, currentTown]);

  const toggleIngredient = useCallback((item) => {
    setSelectedIngredients(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  }, []);

  const craftItem = useCallback((type, onSuccess) => {
    const recipe = player.recipes.find(r =>
      r.type === type &&
      r.ingredients.every(ing => selectedIngredients.includes(ing)) &&
      r.ingredients.length === selectedIngredients.length
    );
    if (!recipe) {
      setGameMessage(`No matching ${type === "heal" ? "healing potion" : "item"} recipe for these ingredients!`);
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
      const newInventory = prev.inventory.map(item =>
        recipe.ingredients.includes(item.name) ? { ...item, quantity: item.quantity - 1 } : item
      ).filter(item => item.quantity > 0);

      const task = prev.dailyTasks.find(t => t.description === "Craft 3 potions");
      const updatedTasks = task
        ? prev.dailyTasks.map(t => t.description === "Craft 3 potions" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
        : prev.dailyTasks;
      if (task && task.progress + 1 >= task.target) completeDailyTask("craftPotions");

      if (type === "heal") {
        const newHealth = Math.min(prev.health + recipe.healAmount, 100);
        return {
          ...prev,
          inventory: newInventory,
          health: newHealth,
          stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 },
          dailyTasks: updatedTasks,
        };
      }

      const successChance = 0.8;
      const isSuccess = Math.random() < successChance;
      if (isSuccess) {
        const existingItem = prev.inventory.find(item => item.name === recipe.name);
        const updatedInventory = existingItem
          ? newInventory.map(item => item.name === recipe.name ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item)
          : [...newInventory, { name: recipe.name, quantity: 1 }];
        return {
          ...prev,
          inventory: updatedInventory,
          stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 },
          dailyTasks: updatedTasks,
        };
      }
      return { ...prev, inventory: newInventory };
    });

    if (type === "heal") {
      updateXP(10);
      setGameMessage(`You crafted ${recipe.name} and healed ${recipe.healAmount} health! (+10 XP)`);
    } else {
      const isSuccess = Math.random() < 0.8;
      if (isSuccess) {
        updateXP(20);
        setGameMessage(`You crafted ${recipe.name}! It’s now in your inventory. (+20 XP)`);
      } else {
        setGameMessage(`Crafting ${recipe.name} failed! Ingredients lost.`);
      }
    }

    setSelectedIngredients([]);
    setModals(prev => ({ ...prev, [type === "heal" ? "healing" : "craft"]: false }));
    if (onSuccess) onSuccess(recipe);
  }, [player.recipes, selectedIngredients, getAvailableIngredients, updateXP, completeDailyTask]);

  const craftHealingPotion = useCallback(() => craftItem("heal"), [craftItem]);

  // Market
  const sellDrink = useCallback((drinkName) => {
    const recipe = player.recipes.find(r => r.name === drinkName && r.type === "sell");
    if (!recipe) {
      setGameMessage("This item cannot be sold!");
      return;
    }

    const drinkInInventory = player.inventory.find(item => item.name === drinkName);
    if (!drinkInInventory || drinkInInventory.quantity === 0) {
      setGameMessage("You don’t have any of this drink to sell!");
      return;
    }

    const currentTownData = towns.find(t => t.name === currentTown);
    const demandMultiplier = currentTownData.demand[drinkName] || 1.0;
    const rewardMultiplier = currentTownData.rewardMultiplier * townLevels[currentTown];
    const reward = Math.floor(recipe.baseGold * rewardMultiplier * demandMultiplier);

    setPlayer(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => item.name === drinkName ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0),
      gold: prev.gold + reward,
      stats: { ...prev.stats, itemsSold: prev.stats.itemsSold + 1 },
    }));
    updateXP(reward * 2);
    upgradeTown(currentTown, player.stats.itemsSold + 1);
    setGameMessage(`You sold ${drinkName} for ${reward} gold! (+${reward * 2} XP)`);
  }, [player.inventory, player.recipes, currentTown, townLevels, updateXP, upgradeTown]);

  const buyIngredient = useCallback((ingredient, price) => {
    if (player.gold < price) {
      setGameMessage("Not enough gold!");
      return;
    }
    setPlayer(prev => {
      const newInventory = prev.inventory.find(i => i.name === ingredient)
        ? prev.inventory.map(i => i.name === ingredient ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev.inventory, { name: ingredient, quantity: 1 }];
      return { ...prev, inventory: newInventory, gold: prev.gold - price };
    });
    setGameMessage(`You bought ${ingredient} for ${price} gold!`);
  }, [player.gold]);

  // Gathering
  const gatherSingle = useCallback(() => {
    const town = towns.find(t => t.name === currentTown);
    const now = Date.now();
    if (lastGatherTimes[currentTown] && (now - lastGatherTimes[currentTown]) < town.gatherCooldown * 60 * 1000) {
      setGameMessage("Gather cooldown active!");
      return;
    }
    const ingredient = town.ingredients[Math.floor(Math.random() * town.ingredients.length)];
    setPlayer(prev => {
      const newInventory = prev.inventory.find(i => i.name === ingredient)
        ? prev.inventory.map(i => i.name === ingredient ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev.inventory, { name: ingredient, quantity: 1 }];
      const herbQuest = prev.quests.find(q => q.id === "gatherHerbs" && ingredient === "Herbs");
      const updatedQuests = herbQuest
        ? prev.quests.map(q => q.id === "gatherHerbs" ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
        : prev.quests;
      if (herbQuest && herbQuest.progress + 1 >= herbQuest.target) completeQuest("gatherHerbs");
      return {
        ...prev,
        inventory: newInventory,
        quests: updatedQuests,
        stats: { ...prev.stats, gathers: prev.stats.gathers + 1 },
      };
    });
    setLastGatherTimes(prev => ({ ...prev, [currentTown]: now }));
    setGameMessage(`You gathered ${ingredient}!`);
  }, [currentTown, lastGatherTimes, completeQuest]);

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
      for (let i = 0; i < count; i++) {
        const ingredient = town.ingredients[Math.floor(Math.random() * town.ingredients.length)];
        const existingItem = newInventory.find(item => item.name === ingredient);
        newInventory = existingItem
          ? newInventory.map(item => item.name === ingredient ? { ...item, quantity: item.quantity + 1 } : item)
          : [...newInventory, { name: ingredient, quantity: 1 }];
      }
      const herbQuest = prev.quests.find(q => q.id === "gatherHerbs");
      const updatedQuests = herbQuest
        ? prev.quests.map(q => q.id === "gatherHerbs" ? { ...q, progress: Math.min(q.progress + count, q.target) } : q)
        : prev.quests;
      if (herbQuest && herbQuest.progress + count >= herbQuest.target) completeQuest("gatherHerbs");
      return {
        ...prev,
        inventory: newInventory,
        gold: prev.gold - count,
        quests: updatedQuests,
        stats: { ...prev.stats, gathers: prev.stats.gathers + count },
      };
    });
    setLastQueuedGatherTime(now);
    setGameMessage(`You queued ${count} gathers!`);
  }, [player.gold, lastQueuedGatherTime, currentTown, completeQuest]);

  // Countdowns
  const formatCountdown = useCallback(seconds => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }, []);

  useEffect(() => {
    const updateCountdowns = () => {
      const now = Date.now();
      const lastNormalTime = lastGatherTimes[currentTown];
      if (lastNormalTime) {
        const townData = towns.find(t => t.name === currentTown);
        const cooldownSeconds = townData.gatherCooldown * 60;
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
  }, [lastGatherTimes, lastQueuedGatherTime, currentTown]);

  // Inventory
  const sortInventory = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      inventory: [...prev.inventory].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, []);

  // Community Event
  const mockCommunityEvent = useCallback(() => ({
    description: "Help rebuild the village shrine! Contribute resources.",
    action: () => {
      setPlayer(prev => ({ ...prev, gold: prev.gold + 50 }));
      setGameMessage("You contributed to the shrine and earned 50 gold!");
      setModals(prev => ({ ...prev, community: false }));
    },
  }), []);

  // Travel
  const travel = useCallback((town) => {
    setCurrentTown(town);
    updateXP(5);
    setGameMessage(`You arrived at ${town}! (+5 XP)`);
  }, [updateXP]);

  // Modal Toggle
  const toggleModal = useCallback((modal) => {
    setModals(prev => ({ ...prev, [modal]: !prev[modal] }));
  }, []);

  // Render
  return (
    <div style={{ minHeight: "100vh", background: "url('/background.jpg') center/cover" }}>
      <Head><title>Kaito's Adventure</title></Head>
      <Container className="py-5">
        <Button variant="info" style={{ position: "absolute", top: "10px", left: "10px" }} onClick={() => toggleModal("leaderboard")}>Leaderboard</Button>
        <Row className="justify-content-center">
          <Col md={10}>
            <Card className={`text-center ${styles.gildedCard}`} style={{ background: "rgba(255, 255, 255, 0.9)" }}>
              <Card.Body className="p-4">
                <Card.Title as="h1" className="mb-3 text-danger">{player.name} (Level {player.level})</Card.Title>
                <Card.Text>Health: {player.health} | Gold: {player.gold} | XP: {player.xp}</Card.Text>
                <ProgressBar now={xpProgress} label={`${Math.round(xpProgress)}%`} variant="success" className="my-2" style={{ width: "50%", margin: "0 auto" }} />
                <Card.Text>Current Town: {currentTown} (Level {townLevels[currentTown]})</Card.Text>
                <Card.Text className="mb-4 text-muted">{gameMessage}</Card.Text>
                <h2>Inventory</h2>
                <Button variant="outline-secondary" size="sm" onClick={sortInventory} className="mb-2">Sort Inventory</Button>
                <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "400px" }}>
                  {player.inventory.map(item => (
                    <ListGroup.Item key={item.name}>
                      {item.name}: {item.quantity}
                      {player.recipes.find(r => r.name === item.name && r.type === "equip") && (
                        <Button variant="outline-primary" size="sm" className="ml-2" onClick={() => equipItem(item.name)}>Equip</Button>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Card.Text>Equipped: {player.equipment.weapon || "None"}</Card.Text>
                <h2 className="mt-4">Available Ingredients in {currentTown}</h2>
                <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "400px" }}>
                  {getAvailableIngredients.map(item => (
                    <ListGroup.Item key={item.name}>
                      {item.name}: {item.owned ? item.quantity : towns.find(t => t.name === currentTown).ingredients.includes(item.name) ? "∞ (Town)" : "0"}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <h2 className="mt-4">Actions</h2>
                <div className="d-flex flex-wrap justify-content-center">
                  <Button variant="primary" onClick={() => toggleModal("craft")} className="m-3">Craft Items</Button>
                  <Button variant="info" onClick={() => toggleModal("healing")} className="m-3">Craft Healing Potion</Button>
                  <Button variant="danger" onClick={startCombat} className="m-3">Start Combat</Button>
                  <Button variant="warning" onClick={() => toggleModal("gather")} className="m-3">Gather Ingredient</Button>
                  <Button variant="success" onClick={() => toggleModal("market")} className="m-3">Visit Market</Button>
                  <Button variant="outline-info" onClick={() => toggleModal("quests")} className="m-3">Quests ({player.quests.length})</Button>
                  <Button variant="outline-warning" onClick={() => toggleModal("daily")} className="m-3">Daily</Button>
                  <Button variant="outline-secondary" onClick={() => toggleModal("stats")} className="m-3">Stats</Button>
                  <Button variant="outline-primary" onClick={() => toggleModal("community")} className="m-3">Community</Button>
                </div>
                {countdown !== null && countdown > 0 && <p className="mt-3">Normal Gather Cooldown: {formatCountdown(countdown)}</p>}
                {queuedCountdown !== null && queuedCountdown > 0 && <p className="mt-3">Queued Gather Cooldown: {formatCountdown(queuedCountdown)}</p>}
                <h2 className="mt-5">Travel</h2>
                <div className="d-flex flex-wrap justify-content-center">
                  {towns.map(town => (
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

      <Modal show={modals.quests} onHide={() => toggleModal("quests")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Quests</Modal.Title></Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {player.quests.map(quest => (
              <ListGroup.Item key={quest.id}>
                {quest.description} - {quest.progress}/{quest.target}<br />
                Reward: {quest.reward.gold ? `${quest.reward.gold} Gold` : ""} {quest.reward.xp ? `${quest.reward.xp} XP` : ""}
              </ListGroup.Item>
            ))}
          </ListGroup>
          <Button variant="primary" onClick={addQuest} className="mt-3" disabled={player.quests.length >= 3}>Accept New Quest</Button>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("quests")}>Close</Button></Modal.Footer>
      </Modal>

      <Modal show={modals.leaderboard} onHide={() => toggleModal("leaderboard")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Leaderboard</Modal.Title></Modal.Header>
        <Modal.Body>
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
        <Modal.Body>
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
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="craft-tabs" className="mt-3">
            <Tab eventKey="drinks" title="Drinks">
              <p className="mt-3">Known Sellable Recipes:</p>
              <ul>{player.recipes.filter(r => r.type === "sell").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")}</li>)}</ul>
            </Tab>
            <Tab eventKey="weapons" title="Weapons">
              <p className="mt-3">Known Weapon Recipes:</p>
              <ul>{player.recipes.filter(r => r.type === "equip").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Bonus: +{r.bonus.damage} Damage)</li>)}</ul>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => toggleModal("craft")}>Cancel</Button>
          <Button variant="primary" onClick={() => craftItem(activeTab === "drinks" ? "sell" : "equip")}>Craft</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={modals.healing} onHide={() => toggleModal("healing")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Craft a Healing Potion</Modal.Title></Modal.Header>
        <Modal.Body>
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
          <p className="mt-3">Known Healing Recipes:</p>
          <ul>{player.recipes.filter(r => r.type === "heal").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Heals {r.healAmount} HP)</li>)}</ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => toggleModal("healing")}>Cancel</Button>
          <Button variant="info" onClick={craftHealingPotion}>Craft & Use</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={modals.gather} onHide={() => toggleModal("gather")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Gather Options in {currentTown}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Normal Gather</Card.Title>
              <Card.Text>Gather one ingredient for free (cooldown varies by town).</Card.Text>
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

      <Modal show={modals.combat} onHide={() => toggleModal("combat")} size="xl" centered className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Body className="p-0">
          <Card className="border-0">
            <Card.Header className="bg-danger text-center text-white"><h3>Combat Arena</h3></Card.Header>
            <Card.Body className={styles.combatBody}>
              {combatState && (
                <Row>
                  <Col md={5} className="text-center">
                    <h4>Kaito</h4>
                    <div className={`${styles.healthBar} mb-3`}>
                      <div className={styles.healthFill} style={{ width: `${(combatState.playerHealth / 100) * 100}%` }} />
                    </div>
                    <p>Health: {combatState.playerHealth}/100</p>
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
                <Button variant="danger" onClick={attackEnemy} disabled={!combatState || combatState?.isAttacking || combatResult} className="m-1">Attack</Button>
                {player.skills.map(skill => (
                  <Button
                    key={skill.name}
                    variant="outline-danger"
                    onClick={() => useSkill(skill.name)}
                    disabled={!combatState || combatState?.isAttacking || combatResult}
                    className="m-1"
                  >
                    {skill.name}
                  </Button>
                ))}
              </div>
              {combatState && (
                <ListGroup className="mt-3" style={{ maxHeight: "150px", overflowY: "auto" }}>
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
        <Modal.Body>
          <h5>Sell Your Drinks:</h5>
          <ListGroup className="mb-3">
            {player.inventory.filter(item => player.recipes.some(r => r.name === item.name && r.type === "sell")).map(item => {
              const recipe = player.recipes.find(r => r.name === item.name);
              const townData = towns.find(t => t.name === currentTown);
              const price = Math.floor(recipe.baseGold * townData.rewardMultiplier * (townData.demand[item.name] || 1.0) * townLevels[currentTown]);
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
        <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("market")}>Close</Button></Modal.Footer>
      </Modal>

      <Modal show={modals.daily} onHide={() => toggleModal("daily")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Daily Rewards & Challenges</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>Daily Login Bonus: 20 Gold (Claimed today)</p>
          <h5>Challenges:</h5>
          <ListGroup variant="flush">
            {player.dailyTasks.map(task => (
              <ListGroup.Item key={task.id}>
                {task.description} - {task.progress}/{task.target}<br />
                Reward: {task.reward.gold ? `${task.reward.gold} Gold` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}
                {task.completed && " (Completed)"}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("daily")}>Close</Button></Modal.Footer>
      </Modal>

      <Modal show={modals.stats} onHide={() => toggleModal("stats")} className={styles.gildedModal} backdropClassName={styles.lightBackdrop}>
        <Modal.Header closeButton><Modal.Title>Lifetime Stats</Modal.Title></Modal.Header>
        <Modal.Body>
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
        <Modal.Body>
          <p>{mockCommunityEvent().description}</p>
          <Button variant="primary" onClick={mockCommunityEvent().action}>Perform Action</Button>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => toggleModal("community")}>Close</Button></Modal.Footer>
      </Modal>
    </div>
  );
};

export default Home;