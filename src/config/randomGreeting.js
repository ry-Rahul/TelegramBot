// Define an array of greetings
const greetings = [
  "Hey there!",
  "Hi!",
  "Hello!",
  "Greetings!",
  "Welcome!",
  "Yo!",
  "Howdy!",
];

// Function to generate a random greeting
function getRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
}

export { getRandomGreeting };
