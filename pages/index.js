import { useState, useCallback, useEffect } from "react";
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
} from "react-bootstrap";
import styles from '../styles/Combat.module.css';

export default function Home() {
  const defaultPlayer = {
    name: "Kaito Brewmaster",
    gold: 5,
    health: 100,
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
    ],
  };

  // Initialize with defaults, sync with localStorage in useEffect
  const [player, setPlayer] = useState(defaultPlayer);
  const [currentTown, setCurrentTown] = useState("Sakura Village");
  const [gameMessage, setGameMessage] = useState("Welcome to Kaito's Adventure!");
  const [showCraftModal, setShowCraftModal] = useState(false);
  const [showHealingModal, setShowHealingModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showGatherModal, setShowGatherModal] = useState(false);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lastGatherTimes, setLastGatherTimes] = useState({});
  const [lastQueuedGatherTime, setLastQueuedGatherTime] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [queuedCountdown, setQueuedCountdown] = useState(null);
  const [combatState, setCombatState] = useState(null);

  const towns = [
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
  ];
  const allIngredients = ["Water", "Herbs", "Pepper", "Sugar", "Mist Essence", "Shadow Root"];

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlayer = localStorage.getItem("player");
      if (savedPlayer) setPlayer(JSON.parse(savedPlayer));

      const savedTown = localStorage.getItem("currentTown");
      if (savedTown) setCurrentTown(savedTown);

      const savedGatherTimes = localStorage.getItem("lastGatherTimes");
      if (savedGatherTimes) setLastGatherTimes(JSON.parse(savedGatherTimes));

      const savedQueuedTime = localStorage.getItem("lastQueuedGatherTime");
      if (savedQueuedTime) setLastQueuedGatherTime(parseInt(savedQueuedTime, 10));
    }
  }, []); // Empty dependency array—runs once on mount

  // Save state to localStorage on every change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("player", JSON.stringify(player));
      localStorage.setItem("currentTown", currentTown);
      localStorage.setItem("lastGatherTimes", JSON.stringify(lastGatherTimes));
      localStorage.setItem("lastQueuedGatherTime", lastQueuedGatherTime ? lastQueuedGatherTime.toString() : null);
    }
  }, [player, currentTown, lastGatherTimes, lastQueuedGatherTime]);

  const getAvailableIngredients = useCallback(() => {
    const currentTownData = towns.find((t) => t.name === currentTown);
    const townIngredients = currentTownData.ingredients.map((name) => ({ name, quantity: Infinity }));
    
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
  }, [player.inventory, currentTown]);

  const canGatherNormal = useCallback(() => {
    const lastTime = lastGatherTimes[currentTown];
    if (!lastTime) return true;
    const currentTownData = towns.find((t) => t.name === currentTown);
    const cooldownMinutes = currentTownData.gatherCooldown;
    const now = new Date().getTime();
    const timeSinceLastGather = (now - lastTime) / (1000 * 60);
    return timeSinceLastGather >= cooldownMinutes;
  }, [lastGatherTimes, currentTown]);

  const canGatherQueued = useCallback(() => {
    if (!lastQueuedGatherTime) return true;
    const cooldownMinutes = 3;
    const now = new Date().getTime();
    const timeSinceLastQueued = (now - lastQueuedGatherTime) / (1000 * 60);
    return timeSinceLastQueued >= cooldownMinutes;
  }, [lastQueuedGatherTime]);

  const gatherSingle = useCallback(() => {
    if (!canGatherNormal()) {
      const currentTownData = towns.find((t) => t.name === currentTown);
      const remainingTime = Math.ceil(
        currentTownData.gatherCooldown - (new Date().getTime() - lastGatherTimes[currentTown]) / (1000 * 60)
      );
      setGameMessage(`You must wait ${remainingTime} minute(s) to gather again in ${currentTown}!`);
      setShowGatherModal(false);
      return;
    }

    const currentTownData = towns.find((t) => t.name === currentTown);
    const availableToGather = currentTownData.ingredients.filter(
      (ing) => !player.inventory.some((item) => item.name === ing && item.quantity >= 5)
    );
    if (availableToGather.length === 0) {
      setGameMessage("No new ingredients to gather here or max quantity reached!");
      setShowGatherModal(false);
      return;
    }

    const randomIngredient = availableToGather[Math.floor(Math.random() * availableToGather.length)];
    setPlayer((prev) => {
      const existingItem = prev.inventory.find((item) => item.name === randomIngredient);
      let newInventory;
      if (existingItem) {
        newInventory = prev.inventory.map((item) =>
          item.name === randomIngredient ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newInventory = [...prev.inventory, { name: randomIngredient, quantity: 1 }];
      }
      return { ...prev, inventory: newInventory };
    });
    const now = new Date().getTime();
    setLastGatherTimes((prev) => ({
      ...prev,
      [currentTown]: now,
    }));
    setGameMessage(`You gathered 1 ${randomIngredient}!`);
    setShowGatherModal(false);
  }, [canGatherNormal, currentTown, player.inventory, lastGatherTimes]);

  const queueGathers = useCallback((count) => {
    if (!canGatherQueued()) {
      const remainingTime = Math.ceil(3 - (new Date().getTime() - lastQueuedGatherTime) / (1000 * 60));
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
      (ing) => !player.inventory.some((item) => item.name === ing && item.quantity >= 5)
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
            item.name === ingredient ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          newInventory.push({ name: ingredient, quantity: 1 });
        }
        gathered.push(ingredient);
        if (newInventory.find((item) => item.name === ingredient).quantity >= 5) {
          availableToGather.splice(randomIndex, 1);
        }
      }
      return {
        ...prev,
        inventory: newInventory,
        gold: prev.gold - cost,
      };
    });
    const now = new Date().getTime();
    setLastQueuedGatherTime(now);
    setGameMessage(`You queued ${count} gathers for ${cost} gold! Gathered: ${Array(count).fill().map(() => availableToGather[Math.floor(Math.random() * availableToGather.length)]).join(", ")}`);
    setShowGatherModal(false);
  }, [canGatherQueued, currentTown, player.gold, player.inventory, lastQueuedGatherTime]);

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
          item.name === ingredient ? { ...item, quantity: item.quantity + 1 } : item
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
    setGameMessage(`You bought 1 ${ingredient} for ${price} gold!`);
  }, [player.gold, player.inventory]);

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
        const playerDamage = Math.floor(Math.random() * 10) + 10; // 10–20 damage
        const newEnemyHealth = Math.max(prev.enemyHealth - playerDamage, 0);
        let newLog = [...prev.log, `Kaito deals ${playerDamage} damage to ${prev.enemy.name}!`];

        if (newEnemyHealth <= 0) {
          const dropChance = Math.random() < 0.1;
          const drop = dropChance ? "Mist Essence" : null;
          setPlayer((p) => {
            let newInventory = [...p.inventory];
            if (drop) {
              const existingItem = newInventory.find((item) => item.name === drop);
              if (existingItem) {
                newInventory = newInventory.map((item) =>
                  item.name === drop ? { ...item, quantity: item.quantity + 1 } : item
                );
              } else {
                newInventory.push({ name: drop, quantity: 1 });
              }
            }
            return {
              ...p,
              gold: p.gold + prev.enemy.gold,
              inventory: newInventory,
            };
          });
          setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold!${drop ? ` Dropped: ${drop}` : ""}`);
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
        return {
          ...prev,
          playerHealth: newPlayerHealth,
          enemyHealth: newEnemyHealth,
          log: newLog,
          isAttacking: false,
        };
      });
    }, 1000);
  }, [combatState, player]);

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

    const available = getAvailableIngredients();
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
        if (existingDrink) {
          return {
            ...prev,
            inventory: newInventory.map((item) =>
              item.name === recipe.name ? { ...item, quantity: item.quantity + 1 } : item
            ),
          };
        }
        return {
          ...prev,
          inventory: [...newInventory, { name: recipe.name, quantity: 1 }],
        };
      }
      return { ...prev, inventory: newInventory };
    });

    if (isSuccess) {
      setGameMessage(`You crafted ${recipe.name}! It’s now in your inventory.`);
    } else {
      setGameMessage(`Crafting ${recipe.name} failed! Ingredients lost.`);
    }

    setSelectedIngredients([]);
    setShowCraftModal(false);
  }, [player, selectedIngredients, currentTown, getAvailableIngredients]);

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

    const available = getAvailableIngredients();
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
      return { ...prev, inventory: newInventory, health: newHealth };
    });

    setGameMessage(`You crafted ${recipe.name} and healed ${recipe.healAmount} health!`);
    setSelectedIngredients([]);
    setShowHealingModal(false);
  }, [player, selectedIngredients, currentTown, getAvailableIngredients]);

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
    const reward = Math.floor(recipe.baseGold * currentTownData.rewardMultiplier * demandMultiplier);

    setPlayer((prev) => ({
      ...prev,
      inventory: prev.inventory
        .map((item) => (item.name === drinkName ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
      gold: prev.gold + reward,
    }));
    setGameMessage(`You sold ${drinkName} for ${reward} gold!`);
  }, [player, currentTown]);

  const travel = useCallback((town) => {
    setCurrentTown(town);
    setGameMessage(`You arrived at ${town}!`);
  }, []);

  useEffect(() => {
    const updateNormalCountdown = () => {
      const lastTime = lastGatherTimes[currentTown];
      if (!lastTime) {
        setCountdown(null);
        return;
      }
      const currentTownData = towns.find((t) => t.name === currentTown);
      const cooldownSeconds = currentTownData.gatherCooldown * 60;
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - lastTime) / 1000);
      const remainingSeconds = Math.max(cooldownSeconds - elapsedSeconds, 0);
      setCountdown(remainingSeconds);

      if (remainingSeconds === 0 && lastTime) {
        setGameMessage("You can gather ingredients again in " + currentTown + "!");
      }
    };

    const updateQueuedCountdown = () => {
      if (!lastQueuedGatherTime) {
        setQueuedCountdown(null);
        return;
      }
      const cooldownSeconds = 3 * 60;
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - lastQueuedGatherTime) / 1000);
      const remainingSeconds = Math.max(cooldownSeconds - elapsedSeconds, 0);
      setQueuedCountdown(remainingSeconds);

      if (remainingSeconds === 0 && lastQueuedGatherTime) {
        setGameMessage("You can queue gathers for gold again!");
      }
    };

    updateNormalCountdown();
    updateQueuedCountdown();
    const interval = setInterval(() => {
      updateNormalCountdown();
      updateQueuedCountdown();
    }, 1000);
    return () => clearInterval(interval);
  }, [lastGatherTimes, lastQueuedGatherTime, currentTown]);

  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "url('/background.jpg') center/cover" }}>
      <Head>
        <title>Kaito's Adventure</title>
      </Head>
      <Container className="py-4">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="text-center" style={{ background: "rgba(255, 255, 255, 0.9)" }}>
              <Card.Body>
                <Card.Title as="h1" className="text-danger">{player.name}</Card.Title>
                <Card.Text>Health: {player.health} | Gold: {player.gold}</Card.Text>
                <Card.Text>Current Town: {currentTown}</Card.Text>
                <Card.Text className="text-muted">{gameMessage}</Card.Text>
                <h2>Inventory</h2>
                <ListGroup variant="flush" className="mx-auto" style={{ maxWidth: "300px" }}>
                  {player.inventory.map((item, idx) => (
                    <ListGroup.Item key={idx}>
                      {item.name}: {item.quantity}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <h2 className="mt-4">Available Ingredients in {currentTown}</h2>
                <ListGroup variant="flush" className="mx-auto" style={{ maxWidth: "300px" }}>
                  {getAvailableIngredients().map((item, idx) => (
                    <ListGroup.Item key={idx}>
                      {item.name}: {item.owned ? item.quantity : towns.find(t => t.name === currentTown).ingredients.includes(item.name) ? "∞ (Town)" : "0"}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <h2 className="mt-4">Actions</h2>
                <Button variant="primary" onClick={() => setShowCraftModal(true)} className="m-2">
                  Craft a Drink
                </Button>
                <Button variant="info" onClick={() => setShowHealingModal(true)} className="m-2">
                  Craft Healing Potion
                </Button>
                <Button variant="danger" onClick={startCombat} className="m-2">
                  Start Combat
                </Button>
                <Button variant="warning" onClick={() => setShowGatherModal(true)} className="m-2">
                  Gather Ingredient
                </Button>
                <Button variant="success" onClick={() => setShowMarketModal(true)} className="m-2">
                  Visit Market
                </Button>
                {countdown !== null && countdown > 0 && (
                  <p className="mt-2">Normal Gather Cooldown: {formatCountdown(countdown)} remaining</p>
                )}
                {queuedCountdown !== null && queuedCountdown > 0 && (
                  <p className="mt-2">Queued Gather Cooldown: {formatCountdown(queuedCountdown)} remaining</p>
                )}
                <h2 className="mt-4">Travel</h2>
                <div>
                  {towns.map((town) => (
                    <Button
                      key={town.name}
                      variant={currentTown === town.name ? "secondary" : "success"}
                      onClick={() => travel(town.name)}
                      disabled={currentTown === town.name}
                      className="m-2"
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

      {/* Craft Modal */}
      <Modal show={showCraftModal} onHide={() => setShowCraftModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Craft a Drink</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h5>Select Ingredients:</h5>
            {getAvailableIngredients().map((item) => (
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
            {player.recipes.filter((r) => r.type === "sell").map((recipe) => (
              <li key={recipe.name}>
                {recipe.name}: {recipe.ingredients.join(", ")}
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

      {/* Healing Modal */}
      <Modal show={showHealingModal} onHide={() => setShowHealingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Craft a Healing Potion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h5>Select Ingredients:</h5>
            {getAvailableIngredients().map((item) => (
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

      {/* Gather Modal */}
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

      {/* Combat Modal */}
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
                >
                  Attack
                </Button>
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

      {/* Market Modal */}
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
                const price = Math.floor(recipe.baseGold * currentTownData.rewardMultiplier * demandMultiplier);
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
                  {offer.ingredient} (Buy for {offer.price} gold)
                </span>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => buyIngredient(offer.ingredient, offer.price)}
                  disabled={player.gold < offer.price}
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
    </div>
  );
}