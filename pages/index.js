import { useState } from "react";
import Head from "next/head";
import { Container, Row, Col, Button, Card, ListGroup } from "react-bootstrap";

export default function Home() {
  const [player, setPlayer] = useState({
    name: "Kaito Brewmaster",
    gold: 100,
    health: 100,
    inventory: ["Water", "Herbs", "Sugar"],
    recipes: ["Herbal Tea"],
  });
  const [currentTown, setCurrentTown] = useState("Sakura Village");
  const [gameMessage, setGameMessage] = useState("Welcome to Kaito's Adventure!");

  const towns = ["Sakura Village", "Iron Port", "Mist Hollow"];

  const craftDrink = () => {
    if (player.inventory.includes("Water") && player.inventory.includes("Herbs")) {
      setPlayer((prev) => ({
        ...prev,
        inventory: prev.inventory.filter((item) => item !== "Water" && item !== "Herbs"),
        recipes: [...prev.recipes, "Herbal Tea"],
        gold: prev.gold + 20,
      }));
      setGameMessage("You crafted and sold a Herbal Tea for 20 gold!");
    } else {
      setGameMessage("You need Water and Herbs to craft a Herbal Tea!");
    }
  };

  const fightEnemy = () => {
    const damage = Math.floor(Math.random() * 20) + 10;
    setPlayer((prev) => ({ ...prev, health: Math.max(prev.health - damage, 0) }));
    setGameMessage(`You fought an enemy and took ${damage} damage!`);
  };

  const travel = (town) => {
    setCurrentTown(town);
    setGameMessage(`You arrived at ${town}!`);
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
                <Card.Title as="h1" className="text-danger">
                  {player.name}
                </Card.Title>
                <Card.Text>
                  Health: {player.health} | Gold: {player.gold}
                </Card.Text>
                <Card.Text>Current Town: {currentTown}</Card.Text>
                <Card.Text className="text-muted">{gameMessage}</Card.Text>

                <h2>Inventory</h2>
                <ListGroup variant="flush" className="mx-auto" style={{ maxWidth: "300px" }}>
                  {player.inventory.map((item, idx) => (
                    <ListGroup.Item key={idx}>{item}</ListGroup.Item>
                  ))}
                </ListGroup>

                <h2 className="mt-4">Actions</h2>
                <Button variant="primary" onClick={craftDrink} className="m-2">
                  Craft & Sell Herbal Tea
                </Button>
                <Button variant="danger" onClick={fightEnemy} className="m-2">
                  Fight Enemy
                </Button>

                <h2 className="mt-4">Travel</h2>
                <div>
                  {towns.map((town) => (
                    <Button
                      key={town}
                      variant={currentTown === town ? "secondary" : "success"}
                      onClick={() => travel(town)}
                      disabled={currentTown === town}
                      className="m-2"
                    >
                      {town}
                    </Button>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}