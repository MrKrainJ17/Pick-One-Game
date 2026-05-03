/* =========================================================
   Pick One — game logic
   Sections:
     1. Data            — categories, items, image URLs
     2. State           — current game + user prefs
     3. Utilities       — shuffle, vibrate, sleep, audio, theme
     4. Bracket logic   — building rounds, finding champion
     5. Rendering       — home / matchup / bracket reveal
     6. Actions         — startGame, pickWinner, continue, share
     7. Init            — set up controls, kick off home screen
   ========================================================= */




/* ---------- 1. Data ---------- */

/**
 * Items are written as "Name <emoji>" entries joined by ", ".
 * We split on the LAST space, so multi-word names work fine
 * ("Mac and Cheese 🧀" → { name: "Mac and Cheese", emoji: "🧀" }).
 *
 * The image URL is derived from the emoji's Unicode codepoints
 * via OpenMoji, so adding new items is just a matter of writing
 * "Name <emoji>" — no need to look up image URLs by hand.
 */
function parseItems(str) {
  return str.split(", ").map(s => {
    const i = s.lastIndexOf(" ");
    const emoji = s.slice(i + 1).trim();
    return {
      name: s.slice(0, i).trim(),
      emoji,
      kind: "emoji",
      image: emojiToTwemojiUrl(emoji),       // primary — vibrant Twitter cartoons
      imageBackup: emojiToOpenMojiUrl(emoji) // secondary — covers newer codepoints Twemoji v14 lacks
    };
  });
}

/**
 * Build a Twemoji (Twitter) color SVG URL from an emoji string.
 * Lowercase hex codepoints joined by "-", with the variation selector
 * (FE0F) stripped. Pinned to v14.0.2 — the last stable release.
 */
function emojiToTwemojiUrl(emoji) {
  const cp = [...emoji]
    .map(c => c.codePointAt(0))
    .filter(c => c !== 0xFE0F)
    .map(c => c.toString(16).toLowerCase())
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`;
}

/**
 * OpenMoji URL — used as the secondary fallback when Twemoji is missing
 * a recent codepoint (e.g. Unicode 14/15 additions). Uppercase hex,
 * joined by "-", FE0F stripped.
 */
function emojiToOpenMojiUrl(emoji) {
  const cp = [...emoji]
    .map(c => c.codePointAt(0))
    .filter(c => c !== 0xFE0F)
    .map(c => c.toString(16).toUpperCase())
    .join("-");
  return `https://openmoji.org/data/color/svg/${cp}.svg`;
}

/**
 * To add a new category: append a new key here. Each category
 * needs exactly 64 items. The home screen and image URLs all
 * pick up automatically from this object.
 */
const CATEGORIES = {
  food: {
    name: "Food",
    emoji: "🍔",
    accent: "#ff6b3d",
    items: parseItems(
      "Pizza 🍕, Burger 🍔, Sushi 🍣, Tacos 🌮, Pasta 🍝, " +
      "Ramen 🍜, Steak 🥩, Fried Chicken 🍗, Hot Dog 🌭, Burrito 🌯, " +
      "Sandwich 🥪, Salad 🥗, Pancakes 🥞, Waffles 🧇, French Fries 🍟, " +
      "Bacon 🥓, Eggs 🍳, Cheese 🧀, Bread 🥖, Croissant 🥐, " +
      "Bagel 🥯, Donut 🍩, Cookie 🍪, Cake 🍰, Cupcake 🧁, " +
      "Pie 🥧, Ice Cream 🍦, Chocolate 🍫, Candy 🍬, Popcorn 🍿, " +
      "Pretzel 🥨, Nachos 🧀, Dumplings 🥟, Sushi Roll 🍱, Curry 🍛, " +
      "Soup 🍲, Stew 🥘, Noodles 🍜, Rice 🍚, Mac and Cheese 🧀, " +
      "Lasagna 🍝, Meatballs 🍝, Wings 🍗, Ribs 🍖, Brisket 🥩, " +
      "Pulled Pork 🥩, Lobster 🦞, Shrimp 🍤, Crab 🦀, Salmon 🐟, " +
      "Oysters 🦪, Tofu 🍱, Avocado 🥑, Falafel 🧆, Hummus 🥙, " +
      "Quesadilla 🌮, Enchiladas 🌯, Pad Thai 🍜, Pho 🍜, Gyro 🥙, " +
      "Kebab 🍢, Empanada 🥟, Risotto 🍚, Paella 🥘"
    )
  },
  movies: {
    name: "Movies",
    emoji: "🎬",
    accent: "#4dabf7",
    items: parseItems(
      "The Godfather 🎬, Pulp Fiction 🎬, The Dark Knight 🦇, Inception 💭, Forrest Gump 🏃, " +
      "The Matrix 🕶️, Star Wars ⚔️, Jurassic Park 🦖, Titanic 🚢, Avatar 🌍, " +
      "Avengers Endgame 🦸, The Lion King 🦁, Toy Story 🤠, Finding Nemo 🐠, Shrek 🧌, " +
      "Frozen ❄️, Up 🎈, Wall-E 🤖, Coco 💀, Spirited Away 🐉, " +
      "Back to the Future ⏰, Indiana Jones 🤠, Jaws 🦈, Rocky 🥊, The Shining 🔪, " +
      "Get Out 😱, Parasite 🏠, Whiplash 🥁, La La Land 🎹, The Social Network 💻, " +
      "Goodfellas 🔫, Fight Club 🥊, Se7en 🔪, Gladiator ⚔️, Braveheart ⚔️, " +
      "Saving Private Ryan 🪖, Schindler's List 🕯️, The Departed 🚓, No Country for Old Men 🤠, There Will Be Blood 🛢️, " +
      "Interstellar 🚀, Dune 🏜️, Mad Max 🏜️, Blade Runner 🌃, Alien 👽, " +
      "The Thing ❄️, Halloween 🎃, Scream 😱, IT 🤡, The Conjuring 👻, " +
      "John Wick 🐕, Mission Impossible 💣, Die Hard 💥, Top Gun ✈️, The Princess Bride 💍, " +
      "Home Alone 🏠, Elf 🧝, A Christmas Story 🎄, Spider-Man 🕷️, Iron Man 🤖, " +
      "Black Panther 🐆, Deadpool 🗡️, Joker 🃏, Barbie 💖"
    )
  },
  drinks: {
    name: "Drinks",
    emoji: "🍹",
    accent: "#9575cd",
    items: parseItems(
      "Water 💧, Coffee ☕, Tea 🍵, Green Tea 🍵, Iced Coffee ☕, " +
      "Espresso ☕, Latte ☕, Cappuccino ☕, Mocha ☕, Hot Chocolate ☕, " +
      "Coke 🥤, Pepsi 🥤, Sprite 🥤, Dr Pepper 🥤, Root Beer 🍺, " +
      "Mountain Dew 🥤, Lemonade 🍋, Iced Tea 🧊, Orange Juice 🍊, Apple Juice 🍎, " +
      "Cranberry Juice 🥤, Smoothie 🥤, Milkshake 🥤, Chocolate Milk 🥛, Milk 🥛, " +
      "Almond Milk 🥛, Oat Milk 🥛, Beer 🍺, IPA 🍺, Lager 🍺, " +
      "Stout 🍺, Cider 🍎, Red Wine 🍷, White Wine 🥂, Rosé 🍷, " +
      "Champagne 🍾, Margarita 🍹, Mojito 🍹, Piña Colada 🍹, Daiquiri 🍹, " +
      "Old Fashioned 🥃, Manhattan 🥃, Whiskey 🥃, Bourbon 🥃, Scotch 🥃, " +
      "Vodka 🍸, Gin and Tonic 🍸, Martini 🍸, Tequila 🥃, Sake 🍶, " +
      "Soju 🍶, Kombucha 🍵, Energy Drink ⚡, Gatorade 🥤, Red Bull ⚡, " +
      "Sparkling Water 💧, Coconut Water 🥥, Matcha 🍵, Chai 🍵, Bubble Tea 🧋, " +
      "Hot Toddy 🥃, Eggnog 🥚, Sangria 🍷, Mimosa 🥂"
    )
  },
  sports: {
    name: "Sports Teams",
    emoji: "🏆",
    accent: "#38b26e",
    items: parseItems(
      // NBA (16)
      "Lakers 💜, Celtics 🍀, Warriors 🌉, Bulls 🐂, Heat 🔥, " +
      "Knicks 🏙️, Spurs 🌵, Mavericks 🐎, Nets 🌐, Clippers ⛵, " +
      "Suns ☀️, Rockets 🚀, 76ers 🟦, Raptors 🦖, Bucks 🦌, Nuggets 💎, " +
      // NFL (16)
      "Cowboys 🤠, Patriots 🇺🇸, Packers 🧀, Steelers ⚙️, Eagles 🦅, " +
      "49ers ⛏️, Chiefs 🏹, Bills 🦬, Broncos 🐴, Giants 🗽, " +
      "Bears 🐻, Vikings ⚔️, Seahawks 🌊, Ravens 🐦‍⬛, Saints ⚜️, Dolphins 🐬, " +
      // MLB (12)
      "Yankees ⚾, Red Sox 🧦, Dodgers 🥎, Cubs 🐾, Mets 🍎, " +
      "Cardinals 🟥, Astros 👨‍🚀, Phillies 🔔, Braves 🪶, Tigers 🐯, " +
      "Blue Jays 🐦, Athletics 🟢, " +
      // NHL (8)
      "Bruins 🟫, Maple Leafs 🍁, Canadiens 🇨🇦, Lightning ⚡, " +
      "Blackhawks 🪙, Red Wings 🪽, Penguins 🐧, Avalanche ❄️, " +
      // Top international soccer clubs (12)
      "Real Madrid 👑, Barcelona 🔵, Manchester United 😈, Manchester City 🌃, " +
      "Liverpool 🔴, Arsenal 🔫, Chelsea 🦁, Bayern Munich ⭐, " +
      "Juventus ⚫, PSG 🗼, AC Milan 🇮🇹, Inter Milan 🐍"
    )
  },
  candy: {
    name: "Candy",
    emoji: "🍬",
    accent: "#ff6ab8",
    items: parseItems(
      "Snickers 🍫, Reese's 🥜, M&Ms 🍫, KitKat 🍫, Twix 🍫, " +
      "Hershey's 🍫, Milky Way 🌌, Three Musketeers 🍫, Almond Joy 🌰, Mounds 🌴, " +
      "Butterfinger 🍫, Baby Ruth 🍫, Crunch 🍫, 100 Grand 💯, Take 5 🖐️, " +
      "Skor ⭐, Heath 🍫, Skittles 🌈, Starburst ✨, Sour Patch Kids 😝, " +
      "Swedish Fish 🐟, Twizzlers 🔴, Red Vines 🟥, Gummy Bears 🐻, Gummy Worms 🐛, " +
      "Haribo 🐻, Jelly Beans 🫘, Mike and Ike 🍬, Hot Tamales 🌶️, Lemonheads 🍋, " +
      "Atomic Fireballs 🔥, Jawbreakers 🪨, Warheads 😖, Blow Pop 🍭, Tootsie Pop 🍭, " +
      "Tootsie Roll 🍫, Charleston Chew 🍫, Bit-O-Honey 🍯, Werther's 🍬, Caramels 🍮, " +
      "Toffee 🍬, Peanut Brittle 🥜, Pop Rocks 💥, Pixy Stix 🌈, Fun Dip 🌈, " +
      "Smarties 💊, SweeTarts 🍬, Nerds 🤓, Bubble Tape 🌀, Bubble Yum 🫧, " +
      "Hubba Bubba 🫧, Big League Chew 🦷, Airheads 🌬️, Laffy Taffy 😂, Now and Later 🕒, " +
      "Dum Dums 🍭, Ring Pop 💍, Push Pop 🍭, Cotton Candy 🍭, Candy Corn 🌽, " +
      "Peeps 🐥, Reese's Pieces 🟧, York Peppermint 🌿, Rolo 🍫"
    )
  },
  iceCream: {
    name: "Ice Cream Flavors",
    emoji: "🍨",
    accent: "#66c7da",
    items: parseItems(
      "Vanilla 🍦, Chocolate 🍫, Strawberry 🍓, Mint Chocolate Chip 🍃, Cookies and Cream 🍪, " +
      "Rocky Road 🪨, Pistachio 🌰, Butter Pecan 🥜, Cookie Dough 🍪, Mint 🌱, " +
      "Coffee ☕, Caramel 🍮, Salted Caramel 🧂, Chocolate Chip 🍫, Fudge 🍫, " +
      "Brownie 🍫, Birthday Cake 🎂, Cake Batter 🎂, Vanilla Bean 🌿, French Vanilla 🥐, " +
      "Chocolate Fudge 🍫, Double Chocolate 🍫, Triple Chocolate 🍫, Mocha ☕, Espresso ☕, " +
      "Tiramisu 🍰, Cheesecake 🍰, Strawberry Cheesecake 🍓, Banana 🍌, Banana Split 🍌, " +
      "Mango 🥭, Peach 🍑, Raspberry 🫐, Blueberry 🫐, Black Cherry 🍒, " +
      "Cherry 🍒, Lemon 🍋, Orange 🍊, Lime 🍈, Pineapple 🍍, " +
      "Coconut 🥥, Maple 🍁, Maple Walnut 🍁, Honey 🍯, Bubblegum 🫧, " +
      "Cotton Candy ☁️, Neapolitan 🍦, Spumoni 🍨, Sherbet 🍧, Sorbet 🍧, " +
      "Gelato 🍨, Frozen Yogurt 🥛, Soft Serve 🍦, Chocolate Hazelnut 🥜, Nutella 🍫, " +
      "Peanut Butter 🥜, Peanut Butter Cup 🥜, Rum Raisin 🍇, Eggnog 🥚, Pumpkin 🎃, " +
      "Apple Pie 🥧, Key Lime Pie 🥧, S'mores 🍫, Moose Tracks 🦌"
    )
  },
  videoGames: {
    name: "Video Games",
    emoji: "🎮",
    accent: "#8c7ae6",
    items: parseItems(
      "Mario 🍄, Zelda ⚔️, Minecraft ⛏️, Fortnite 🪂, Call of Duty 🪖, " +
      "GTA 🚗, Halo 👽, Pokemon ⚡, Tetris 🟦, Pac-Man 🟡, " +
      "Donkey Kong 🦍, Sonic 💨, Mega Man 🤖, Final Fantasy 🗡️, Skyrim 🐲, " +
      "Fallout ☢️, Witcher 🐺, Cyberpunk 🌃, Red Dead 🤠, Assassin's Creed 🗡️, " +
      "God of War ⚔️, Last of Us 🍄, Uncharted 💎, Spider-Man 🕷️, Batman 🦇, " +
      "Tomb Raider 🏺, Resident Evil 🧟, Silent Hill 🌫️, Street Fighter 👊, Mortal Kombat 🥋, " +
      "Tekken 🥋, Smash Bros 💥, Splatoon 🦑, Animal Crossing 🦝, Stardew Valley 🌾, " +
      "Among Us 👽, Roblox 🟥, Apex Legends 🎯, Overwatch 🛡️, League of Legends 🛡️, " +
      "Dota 🛡️, Valorant 💥, CS:GO 🔫, PUBG 🪂, Doom 👹, " +
      "Bioshock 🐳, Portal 🍰, Half-Life 🦀, Hollow Knight 🐛, Celeste ⛰️, " +
      "Undertale 💖, Cuphead ☕, Hades 💀, Elden Ring 💍, Dark Souls 💀, " +
      "Bloodborne 🌑, Persona 🎭, Kirby 🌟, Metroid 👾, Earthbound 🌎, " +
      "Chrono Trigger ⏰, Star Fox 🦊, Diablo 😈, Warcraft ⚔️"
    )
  },
  boardGames: {
    name: "Board Games",
    emoji: "🎲",
    accent: "#d9a55a",
    items: parseItems(
      "Monopoly 🎩, Scrabble 🔤, Catan 🏝️, Risk 🌍, Chess ♟️, " +
      "Clue 🔍, Sorry 😢, Uno 🎴, Checkers ⚫, Backgammon 🎲, " +
      "Trivial Pursuit ❓, Battleship 🚢, Operation 🩺, Mouse Trap 🐭, Connect Four 🔴, " +
      "Yahtzee 🎲, Boggle 🔡, Mastermind 🧠, Stratego 🎖️, Othello ⚪, " +
      "Pictionary 🎨, Charades 🎭, Apples to Apples 🍎, Cards Against Humanity 🃏, Codenames 🕵️, " +
      "Ticket to Ride 🚂, Pandemic 🦠, Carcassonne 🏰, Dominion 👑, Splendor 💎, " +
      "7 Wonders 🏛️, Azul 🟦, Wingspan 🦅, Gloomhaven ⚔️, Terraforming Mars 🪐, " +
      "Power Grid ⚡, Agricola 🌾, Puerto Rico 🌴, Kingdomino 👑, Coup 🤴, " +
      "Bohnanza 🫘, Jenga 🧱, Twister 🌀, Candy Land 🍭, Chutes and Ladders 🪜, " +
      "The Game of Life 🎲, Dominoes 🎲, Mahjong 🀄, Go ⚫, Shogi ♟️, " +
      "Magic the Gathering ✨, Pokemon TCG 🎴, Yu-Gi-Oh 🐉, Acquire 🏢, Diplomacy 🤝, " +
      "Cosmic Encounter 👽, King of Tokyo 👹, Munchkin 🧙, Bang 🤠, Skull 💀, " +
      "Dixit 🐰, The Resistance 🕵️, Poker 🃏, Dungeons and Dragons 🐉"
    )
  },
  singers: {
    name: "Singers",
    emoji: "🎤",
    accent: "#e85f73",
    items: parseItems(
      "Taylor Swift 🎤, Beyoncé 👑, Drake 🦉, Adele 🎵, Michael Jackson 🕺, " +
      "Bruno Mars 🎩, Rihanna 💎, Ed Sheeran 🎸, Justin Bieber 🎵, Lady Gaga 🎭, " +
      "Madonna 🎤, Whitney Houston 🎤, Mariah Carey 🦋, Celine Dion 🎤, Elton John 🎹, " +
      "Billy Joel 🎹, Stevie Wonder 🎹, Prince 💜, David Bowie ⚡, Freddie Mercury 👑, " +
      "John Lennon 🎸, Paul McCartney 🎸, Mick Jagger 🎤, Bob Dylan 🎸, Bruce Springsteen 🎸, " +
      "Bob Marley 🎶, Frank Sinatra 🎩, Elvis Presley 🕺, Aretha Franklin 🎤, Diana Ross 🎤, " +
      "Tina Turner 🎤, Cher 🎤, Dolly Parton 🤠, Johnny Cash 🤠, Willie Nelson 🤠, " +
      "Garth Brooks 🤠, Shania Twain 🤠, Carrie Underwood 🤠, Luke Bryan 🤠, Blake Shelton 🤠, " +
      "Harry Styles 🎤, Billie Eilish 🎵, Olivia Rodrigo 🎵, Dua Lipa 🎵, Ariana Grande 🎤, " +
      "Selena Gomez 🎤, Miley Cyrus 🎤, Katy Perry 🎤, Kendrick Lamar 🎤, Jay-Z 🎤, " +
      "Eminem 🎤, Kanye West 🐻, Snoop Dogg 🎤, Tupac 🎤, Biggie 🎤, " +
      "Nicki Minaj 🎤, Cardi B 🎤, Lizzo 🎤, The Weeknd 🌃, Post Malone 🎤, " +
      "Sam Smith 🎤, SZA 🎤, Doja Cat 🐱, Bad Bunny 🐰"
    )
  },
  snacks: {
    name: "Snacks",
    emoji: "🥨",
    accent: "#ff9966",
    items: parseItems(
      "Cheetos 🧀, Doritos 🌽, Lay's 🥔, Pringles 🥫, Goldfish 🐟, " +
      "Cheez-Its 🧀, Ritz 🍘, Triscuits 🌾, Wheat Thins 🍞, Saltines 🧂, " +
      "Graham Crackers 🍯, Animal Crackers 🐘, Pop Tarts 🍓, Granola Bar 🌾, Beef Jerky 🥩, " +
      "Slim Jim 🌭, Fritos 🌽, Funyuns 🧅, Combos 🥨, Bugles 📯, " +
      "Sun Chips ☀️, Tostitos 🌮, Veggie Straws 🥕, Trail Mix 🥜, Mixed Nuts 🥜, " +
      "Peanuts 🥜, Almonds 🌰, Cashews 🌰, Pistachios 🌰, Raisins 🍇, " +
      "Pretzels 🥨, String Cheese 🧀, Yogurt Tubes 🥛, Granola 🌾, Rice Cakes 🍚, " +
      "Pita Chips 🫓, Tortilla Chips 🌽, Kettle Chips 🥔, Cheese Puffs 🧀, Pork Rinds 🐷, " +
      "Fruit Cups 🍎, Apple Sauce 🍎, Energy Bar 💪, Protein Bar 💪, Chex Mix 🌾, " +
      "Cracker Jack 🍿, SmartFood 🍿, Skinny Pop 🍿, Banana Chips 🍌, Plantain Chips 🍌, " +
      "Sesame Sticks 🌾, Wasabi Peas 🟢, Sunflower Seeds 🌻, Pumpkin Seeds 🎃, Beef Sticks 🥩, " +
      "Mozzarella Sticks 🧀, Veggie Chips 🥕, Pop Chips 🥔, Vanilla Wafers 🍪, Fig Newtons 🥧, " +
      "Teddy Grahams 🧸, Quaker Chewy 🌾, Pirate's Booty 🏴, Mini Donuts 🍩"
    )
  },
  fastFood: {
    name: "Fast Food Chains",
    emoji: "🍟",
    accent: "#e84545",
    items: parseItems(
      "McDonald's 🍟, Burger King 👑, Wendy's 🍔, Chick-fil-A 🐔, Taco Bell 🔔, " +
      "Subway 🥪, KFC 🍗, Domino's 🍕, Pizza Hut 🍕, Papa John's 🍕, " +
      "Little Caesars 🍕, Chipotle 🌯, Five Guys 🍔, In-N-Out 🍔, Shake Shack 🥤, " +
      "Whataburger 🍔, White Castle 🏰, Jack in the Box 📦, Hardee's 🍔, Carl's Jr ⭐, " +
      "Sonic 💨, Arby's 🥪, Popeyes 🍗, Bojangles 🍗, Wingstop 🍗, " +
      "Panda Express 🐼, Panera 🥖, Jersey Mike's 🥪, Jimmy John's 🥖, Dunkin' 🍩, " +
      "Starbucks ☕, Tim Hortons ☕, Krispy Kreme 🍩, Cinnabon 🌀, Auntie Anne's 🥨, " +
      "Jamba Juice 🥤, Baskin-Robbins 🍦, Dairy Queen 🍦, Cold Stone 🍦, Culver's 🐄, " +
      "Steak 'n Shake 🥩, A&W 🍺, Long John Silver's 🐟, Boston Market 🍗, El Pollo Loco 🌶️, " +
      "Del Taco 🌮, Qdoba 🌯, Moe's 🌯, Sbarro 🍕, Cosi 🥖, " +
      "Sweetgreen 🥗, Pret 🥗, Quiznos 🥪, Firehouse Subs 🚒, Potbelly 🥪, " +
      "Schlotzsky's 🥪, Tropical Smoothie 🌴, Smoothie King 🥤, Krystal 💎, Wienerschnitzel 🌭, " +
      "Fatburger 🍔, Checkers 🏁, Captain D's 🐟, Roy Rogers 🤠"
    )
  },
  cereals: {
    name: "Cereals",
    emoji: "🥣",
    accent: "#ffc857",
    items: parseItems(
      "Cheerios ⭕, Honey Nut Cheerios 🍯, Frosted Flakes 🐯, Lucky Charms 🍀, Cinnamon Toast Crunch 🍞, " +
      "Froot Loops 🌈, Cocoa Puffs 🍫, Cocoa Pebbles 🦖, Reese's Puffs 🥜, Cap'n Crunch ⛵, " +
      "Apple Jacks 🍎, Corn Pops 🌽, Trix 🐰, Kix 🥣, Special K 🌟, " +
      "Wheaties 🌾, Raisin Bran ☀️, Frosted Mini Wheats ❄️, Honeycomb 🍯, Golden Grahams 🌅, " +
      "Honey Smacks 🐸, Fruity Pebbles 🌈, Smart Start ⚡, Quaker Oats 🥣, Life 🍞, " +
      "Cinnamon Life 🌰, Rice Chex 🍚, Wheat Chex 🌾, Corn Chex 🌽, Chocolate Chex 🍫, " +
      "Cinnamon Chex 🌰, Total 💯, All-Bran 🌾, Grape-Nuts 🌰, Shredded Wheat 🌾, " +
      "Bran Flakes 🌾, Corn Flakes 🌽, Rice Krispies 🍚, Cocoa Krispies 🍫, Honey Bunches of Oats 🍯, " +
      "Granola 🥣, Cracklin' Oat Bran 🌾, Crispix ✖️, Mueslix 🌰, Krave 🍫, " +
      "Boo Berry 👻, Count Chocula 🧛, Frankenberry 🧟, Multi Grain Cheerios 🌾, Banana Nut Cheerios 🍌, " +
      "Apple Cinnamon Cheerios 🍎, Frosted Cheerios ❄️, Chocolate Cheerios 🍫, French Toast Crunch 🥪, Honey Graham Oh's 🍯, " +
      "Sugar Smacks 🍬, Trix Yogurt 🐰, Kashi 🌾, Crunchy Nut 🥜, Oat Bran 🌾, " +
      "Maple Brown Sugar 🍁, Apple Jacks Frosted 🍎, Toasted Oats 🌾, Honey O's 🍯"
    )
  },
  pizzaToppings: {
    name: "Pizza Toppings",
    emoji: "🍕",
    accent: "#ff5e5b",
    items: parseItems(
      "Pepperoni 🍕, Mushrooms 🍄, Sausage 🌭, Onions 🧅, Green Peppers 🫑, " +
      "Black Olives ⚫, Bacon 🥓, Pineapple 🍍, Anchovies 🐟, Ham 🍖, " +
      "Chicken 🍗, Ground Beef 🥩, Meatballs 🍝, Salami 🍖, Prosciutto 🥓, " +
      "Fresh Tomatoes 🍅, Sun-dried Tomatoes ☀️, Spinach 🌿, Arugula 🌱, Basil 🌿, " +
      "Garlic 🧄, Jalapeños 🌶️, Banana Peppers 🌶️, Roasted Red Peppers 🫑, Artichokes 🥬, " +
      "Eggplant 🍆, Zucchini 🥒, Broccoli 🥦, Corn 🌽, Pesto 🌿, " +
      "Mozzarella 🧀, Cheddar 🧀, Parmesan 🧀, Feta 🧀, Goat Cheese 🐐, " +
      "Ricotta 🧀, Blue Cheese 🧀, Provolone 🧀, Buffalo Sauce 🥫, Ranch 🥛, " +
      "BBQ Sauce 🍖, Hot Sauce 🌶️, Honey 🍯, Truffle Oil 🟤, Egg 🍳, " +
      "Pancetta 🥓, Mortadella 🍖, Pepperoncini 🌶️, Green Olives 🫒, Caramelized Onions 🧅, " +
      "Red Onions 🧅, Shallots 🧅, Leeks 🥬, Asparagus 🟢, Cauliflower 🥦, " +
      "Butternut Squash 🎃, Pears 🍐, Figs 🟣, Apples 🍎, Capers 🟢, " +
      "Pickled Jalapeños 🌶️, Cilantro 🌿, Parsley 🌿, Hot Honey 🍯"
    )
  },
  animals: {
    name: "Animals",
    emoji: "🦁",
    accent: "#5a8f3c",
    items: parseItems(
      "Lion 🦁, Tiger 🐅, Panda 🐼, Elephant 🐘, Giraffe 🦒, " +
      "Monkey 🐒, Gorilla 🦍, Orangutan 🦧, Zebra 🦓, Horse 🐎, " +
      "Cow 🐄, Ox 🐂, Pig 🐖, Sheep 🐑, Goat 🐐, " +
      "Deer 🦌, Bison 🦬, Bear 🐻, Polar Bear 🐻‍❄️, Koala 🐨, " +
      "Sloth 🦥, Kangaroo 🦘, Fox 🦊, Wolf 🐺, Raccoon 🦝, " +
      "Skunk 🦨, Hedgehog 🦔, Otter 🦦, Beaver 🦫, Squirrel 🐿️, " +
      "Rabbit 🐰, Mouse 🐭, Hamster 🐹, Bat 🦇, Eagle 🦅, " +
      "Owl 🦉, Parrot 🦜, Peacock 🦚, Flamingo 🦩, Penguin 🐧, " +
      "Duck 🦆, Swan 🦢, Chicken 🐔, Rooster 🐓, Turkey 🦃, " +
      "Dove 🕊️, Shark 🦈, Whale 🐋, Dolphin 🐬, Octopus 🐙, " +
      "Crab 🦀, Lobster 🦞, Shrimp 🦐, Squid 🦑, Frog 🐸, " +
      "Turtle 🐢, Crocodile 🐊, Snake 🐍, Lizard 🦎, T-Rex 🦖, " +
      "Dragon 🐉, Unicorn 🦄, Butterfly 🦋, Bee 🐝"
    )
  },
  instruments: {
    name: "Musical Instruments",
    emoji: "🎸",
    accent: "#b85c8a",
    items: parseItems(
      "Acoustic Guitar 🎸, Electric Guitar 🎸, Bass Guitar 🎸, Banjo 🪕, Ukulele 🎸, " +
      "Mandolin 🪕, Violin 🎻, Viola 🎻, Cello 🎻, Double Bass 🎻, " +
      "Harp 🎵, Piano 🎹, Grand Piano 🎹, Organ 🎹, Synthesizer 🎹, " +
      "Keytar 🎹, Accordion 🪗, Harmonica 🎵, Drums 🥁, Snare Drum 🥁, " +
      "Bass Drum 🥁, Bongos 🥁, Congas 🥁, Cajón 🥁, Tambourine 🥁, " +
      "Maracas 🎵, Triangle 🔺, Cowbell 🔔, Xylophone 🎵, Marimba 🎵, " +
      "Vibraphone 🎵, Cymbals 🎵, Gong 🎵, Saxophone 🎷, Alto Sax 🎷, " +
      "Tenor Sax 🎷, Trumpet 🎺, Cornet 🎺, Trombone 🎺, French Horn 🎺, " +
      "Tuba 🎺, Flute 🪈, Piccolo 🪈, Clarinet 🎵, Oboe 🎵, " +
      "Bassoon 🎵, Recorder 🪈, Bagpipes 🎵, Pan Flute 🪈, Didgeridoo 🎵, " +
      "Sitar 🎵, Erhu 🎻, Shamisen 🎵, Lute 🎵, Dulcimer 🎵, " +
      "Theremin 🎵, Kalimba 🎵, Steelpan 🥁, DJ Turntables 🎧, Microphone 🎤, " +
      "Loop Pedal 🎵, Drum Machine 🥁, Vocoder 🎤, MIDI Controller 🎹"
    )
  },
  tvShows: {
    name: "TV Shows",
    emoji: "📺",
    accent: "#6a1b9a",
    items: parseItems(
      "Breaking Bad 🧪, The Office 📋, Friends ☕, Stranger Things 👹, Game of Thrones 🐉, " +
      "The Simpsons 🍩, SpongeBob 🟡, Family Guy 🍺, South Park ⛄, Rick and Morty 🛸, " +
      "Bojack Horseman 🐴, Better Call Saul ⚖️, The Walking Dead 🧟, Lost 🏝️, Sopranos 🍝, " +
      "The Wire 📞, Mad Men 🥃, Sex and the City 👠, Seinfeld 🥨, Cheers 🍺, " +
      "MASH 🪖, I Love Lucy 💋, The Twilight Zone 🌀, Star Trek 🖖, Doctor Who 📞, " +
      "Black Mirror 🪞, The Crown 👑, The Mandalorian 🪐, House of Cards 🃏, Westworld 🤠, " +
      "True Detective 🔍, Sherlock 🕵️, Peaky Blinders 🎩, Vikings ⚔️, The Last of Us 🍄, " +
      "Yellowstone 🐎, Succession 💰, Ted Lasso ⚽, Veep 🇺🇸, Curb Your Enthusiasm 😬, " +
      "Modern Family 👨, Parks and Rec 🌳, Brooklyn Nine-Nine 👮, New Girl 🍷, How I Met Your Mother 🍻, " +
      "Big Bang Theory 🔬, Two and a Half Men 🛋️, Frasier ☕, Will and Grace 🌈, Grey's Anatomy 🏥, " +
      "ER 🚑, House 💊, Scrubs 🩺, NCIS 🔎, CSI 🔬, " +
      "Law and Order ⚖️, 24 ⏰, The X-Files 👽, Buffy 🧛, Arrested Development 🍌, " +
      "Squid Game 🦑, Avatar Last Airbender 🌊, Naruto 🍥, Heroes 🌟"
    )
  },
  disneyMovies: {
    name: "Disney Movies",
    emoji: "🏰",
    accent: "#5dade2",
    items: parseItems(
      "The Lion King 🦁, Frozen ❄️, Moana 🌊, Toy Story 🤠, Finding Nemo 🐠, " +
      "Aladdin 🧞, Mulan ⚔️, Encanto 🦋, The Little Mermaid 🧜, Beauty and the Beast 🌹, " +
      "Cinderella 👠, Snow White 🍎, Sleeping Beauty 👸, Pocahontas 🪶, Tangled 💇, " +
      "Brave 🏹, Bambi 🦌, Dumbo 🐘, Pinocchio 🌳, Peter Pan ⚓, " +
      "The Jungle Book 🐅, 101 Dalmatians 🐶, Lady and the Tramp 🍝, Robin Hood 🦊, The Aristocats 😺, " +
      "The Rescuers 🐭, Oliver and Company 🐱, The Black Cauldron 🪄, Hercules 💪, Tarzan 🦍, " +
      "Lilo and Stitch 👽, Treasure Planet 🪐, Brother Bear 🐻, Chicken Little 🐔, Meet the Robinsons 🤖, " +
      "Bolt ⚡, The Princess and the Frog 🐸, Wreck-It Ralph 🎮, Big Hero 6 🚀, Zootopia 🐰, " +
      "Raya 🐉, Wish ⭐, Ratatouille 🐀, Up 🎈, Wall-E 🤖, " +
      "Coco 💀, Soul 🎷, Luca 🦑, Turning Red 🐼, Onward 🐎, " +
      "Inside Out 😊, Monsters Inc 👹, The Incredibles 🦸, Cars 🏎️, A Bug's Life 🐜, " +
      "Finding Dory 🐟, Mary Poppins ☂️, Enchanted ✨, Frozen 2 ❄️, Toy Story 2 🚀, " +
      "Toy Story 3 🧸, Toy Story 4 🥄, Cars 2 🌍, Cars 3 🏁"
    )
  },
  superheroes: {
    name: "Superheroes",
    emoji: "🦸",
    accent: "#d4242a",
    items: parseItems(
      "Spider-Man 🕷️, Batman 🦇, Superman 🦸, Iron Man 🤖, Wonder Woman 👑, " +
      "Captain America 🛡️, Thor ⚡, Hulk 💚, Black Panther 🐆, Doctor Strange 🪄, " +
      "Captain Marvel ⭐, Black Widow 🕸️, Hawkeye 🏹, Ant-Man 🐜, Wasp 🐝, " +
      "Vision 👁️, Scarlet Witch 🧙, Falcon 🪶, Winter Soldier ❄️, Star-Lord 🚀, " +
      "Gamora 🟢, Drax 🗡️, Rocket 🦝, Groot 🌳, Deadpool 🗡️, " +
      "Wolverine 🐾, Cyclops 👁️, Storm ⛈️, Jean Grey 🔥, Beast 🦁, " +
      "Nightcrawler 💨, Gambit 🃏, Rogue 💋, Iceman ❄️, Professor X 🧠, " +
      "Quicksilver ⚡, Daredevil 👹, Punisher 💀, Ghost Rider 🔥, Blade 🗡️, " +
      "Moon Knight 🌙, Robin 🐦, Nightwing 🦇, Batgirl 🦇, Vixen 🦊, " +
      "Static Shock ⚡, She-Hulk 💚, Squirrel Girl 🐿️, Atom 🔬, Booster Gold 🌟, " +
      "Blue Beetle 🪲, Plastic Man 🤸, Martian Manhunter 👽, Black Canary 🐦, Hawkgirl 🦅, " +
      "The Flash ⚡, Green Lantern 💚, Aquaman 🌊, Cyborg 🤖, Shazam ⚡, " +
      "Green Arrow 🏹, Supergirl 💃, Spider-Woman 🕷️, Miles Morales 🕸️"
    )
  },
  landmarks: {
    name: "World Landmarks",
    emoji: "🗽",
    accent: "#5b7c99",
    items: parseItems(
      "Eiffel Tower 🗼, Statue of Liberty 🗽, Big Ben 🕰️, Tower of London 🏰, Buckingham Palace 🏰, " +
      "Colosseum 🏛️, Leaning Tower of Pisa 🗼, Vatican 🏛️, Sagrada Família ⛪, Acropolis 🏛️, " +
      "Parthenon 🏛️, Brandenburg Gate 🏛️, Neuschwanstein Castle 🏰, Arc de Triomphe 🏛️, Louvre Pyramid 🔺, " +
      "Versailles 🏰, Hagia Sophia 🕌, Blue Mosque 🕌, Pyramids of Giza 🏜️, Sphinx 🦁, " +
      "Petra 🏜️, Mount Kilimanjaro ⛰️, Victoria Falls 💧, Table Mountain ⛰️, Taj Mahal 🕌, " +
      "Great Wall of China 🧱, Forbidden City 🏯, Terracotta Army 🗿, Mount Fuji 🗻, Tokyo Tower 🗼, " +
      "Tokyo Skytree 🗼, Shibuya Crossing 🚦, Marina Bay Sands 🏨, Petronas Towers 🏙️, Angkor Wat 🛕, " +
      "Sydney Opera House 🎭, Sydney Harbour Bridge 🌉, Uluru ⛰️, Christ the Redeemer ✝️, Machu Picchu ⛰️, " +
      "Iguazu Falls 💧, Easter Island Heads 🗿, Trevi Fountain ⛲, Mount Rushmore 🗿, Golden Gate Bridge 🌉, " +
      "Hollywood Sign 🎬, Empire State Building 🏙️, One World Trade 🏙️, White House 🏛️, Lincoln Memorial 🏛️, " +
      "Washington Monument 🗿, Las Vegas Strip 🎰, Niagara Falls 💧, Grand Canyon 🏜️, Yellowstone 🌋, " +
      "Mount Everest ⛰️, Stonehenge 🪨, Burj Khalifa 🏙️, Burj Al Arab 🏨, CN Tower 🗼, " +
      "Space Needle 🗼, Chichen Itza 🛕, Cristo de la Concordia ✝️, Times Square 🌃"
    )
  },
  destinations: {
    name: "Vacation Destinations",
    emoji: "✈️",
    accent: "#00897b",
    items: parseItems(
      "Hawaii 🌺, Paris 🗼, Tokyo 🗾, Bali 🏝️, Cancun 🏖️, " +
      "Rome 🏛️, New York 🗽, London 🇬🇧, Iceland 🌋, Maldives 🏝️, " +
      "Greece 🏛️, Italy 🍕, Spain 🥘, Switzerland ⛰️, Norway 🌌, " +
      "Sweden 🇸🇪, Finland ❄️, Denmark 🇩🇰, Amsterdam 🚲, Berlin 🇩🇪, " +
      "Vienna 🎻, Prague 🏰, Barcelona 🏟️, Madrid 🐂, Lisbon 🇵🇹, " +
      "Dublin 🍀, Edinburgh 🏰, Santorini 🌅, Mykonos 🌅, Dubai 🏗️, " +
      "Singapore 🏙️, Hong Kong 🐉, Bangkok 🍜, Phuket 🏖️, Kyoto 🏯, " +
      "Seoul 🇰🇷, Taipei 🥟, Marrakech 🐪, Sydney 🇦🇺, Melbourne ☕, " +
      "Auckland 🇳🇿, Fiji 🌺, Tahiti 🌴, Mexico City 🌮, Rio de Janeiro 🎭, " +
      "Buenos Aires 🥩, Machu Picchu 🦙, Galapagos 🐢, Costa Rica 🌴, Cuba 🚗, " +
      "Jamaica 🌴, Bahamas 🐚, Punta Cana 🌴, Aruba 🏖️, Las Vegas 🎰, " +
      "Miami 🌞, Los Angeles 🌴, San Francisco 🌉, Chicago 🏙️, New Orleans 🎷, " +
      "Niagara Falls 💦, Banff 🏔️, Yellowstone 🏞️, Grand Canyon 🏜️"
    )
  },
  holidays: {
    name: "Holidays",
    emoji: "🎉",
    accent: "#c0392b",
    items: parseItems(
      "Christmas 🎄, Halloween 🎃, Thanksgiving 🦃, Easter 🐰, Fourth of July 🇺🇸, " +
      "Valentine's Day ❤️, Hanukkah 🕎, New Year's Day 🎆, St. Patrick's Day 🍀, Mother's Day 🌸, " +
      "Father's Day 👨, Memorial Day 🇺🇸, Labor Day 👷, Veteran's Day 🪖, MLK Day ✊, " +
      "Presidents Day 🎩, Cinco de Mayo 🌮, Mardi Gras 🎭, Earth Day 🌍, Groundhog Day 🐹, " +
      "April Fools 🤡, Tax Day 💸, Bastille Day 🇫🇷, Canada Day 🇨🇦, Boxing Day 📦, " +
      "Diwali 🪔, Lunar New Year 🐉, Holi 🌈, Ramadan 🌙, Eid al-Fitr 🕌, " +
      "Eid al-Adha 🐑, Yom Kippur ✡️, Rosh Hashanah 🍎, Passover 🍷, Day of the Dead 💀, " +
      "Carnival 💃, Oktoberfest 🍺, Kwanzaa 🕯️, Juneteenth ✊, Pride Month 🏳️‍🌈, " +
      "Christmas Eve 🌙, New Year's Eve 🥂, Good Friday ✝️, Palm Sunday 🌴, Ash Wednesday 🩶, " +
      "All Saints Day 👼, Epiphany ⭐, Lent 🙏, Advent 🕯️, Pentecost 🔥, " +
      "Pancake Day 🥞, Bodhi Day 🌳, Children's Day 👶, Grandparents Day 👴, Sweetest Day 🍫, " +
      "Boss's Day 💼, Friendship Day 🤝, Teacher's Day 👨, Earth Hour 🌍, Pi Day 🥧, " +
      "Star Wars Day ⚔️, Talk Like a Pirate Day 🏴, Galentine's Day 💐, International Women's Day 👩"
    )
  },
  fruits: {
    name: "Fruits",
    emoji: "🍎",
    accent: "#ff6b9d",
    items: parseItems(
      "Apple 🍎, Banana 🍌, Strawberry 🍓, Mango 🥭, Pineapple 🍍, " +
      "Watermelon 🍉, Grapes 🍇, Peach 🍑, Blueberry 🫐, Orange 🍊, " +
      "Lemon 🍋, Lime 🍈, Kiwi 🥝, Cherry 🍒, Pear 🍐, " +
      "Avocado 🥑, Coconut 🥥, Raspberry 🫐, Blackberry ⚫, Cranberry 🔴, " +
      "Pomegranate 🟥, Papaya 🟧, Guava 🟢, Passion Fruit 🟣, Dragon Fruit 🐉, " +
      "Lychee 🟣, Rambutan 🟥, Durian 🟢, Jackfruit 🟡, Star Fruit ⭐, " +
      "Persimmon 🟠, Fig 🟣, Date 🌴, Apricot 🟠, Plum 🟣, " +
      "Nectarine 🟠, Tangerine 🍊, Clementine 🍊, Mandarin 🍊, Grapefruit 🟡, " +
      "Pomelo 🟢, Yuzu 🟡, Quince 🟡, Currant 🔴, Gooseberry 🟢, " +
      "Mulberry 🟣, Boysenberry 🟣, Loganberry 🟣, Elderberry 🟣, Cantaloupe 🟠, " +
      "Honeydew 🟢, Casaba 🟡, Galia 🟢, Asian Pear 🟡, Bosc Pear 🟫, " +
      "Bartlett Pear 🟢, Pink Lady Apple 🍎, Granny Smith 🍏, Honeycrisp 🍎, Fuji Apple 🍎, " +
      "Gala Apple 🍎, Pluot 🟣, Tamarind 🟫, Soursop 🟢"
    )
  },
  sneakers: {
    name: "Sneaker Brands",
    emoji: "👟",
    accent: "#fb8500",
    items: parseItems(
      "Nike ✅, Adidas 🟦, Jordan ✈️, New Balance ⚪, Puma 🐆, " +
      "Converse ⭐, Vans 🛹, Reebok ⚡, Under Armour 🛡️, ASICS 🇯🇵, " +
      "Brooks 🏃, Saucony 👟, Hoka 🐾, On Running ☁️, Salomon 🏔️, " +
      "Merrell 🥾, Keen 🥾, Timberland 🌲, Dr. Martens 🥾, Clarks 👞, " +
      "Allbirds 🐦, Veja 💚, Cole Haan 👞, Sperry ⛵, Crocs 🐊, " +
      "Birkenstock 🇩🇪, Teva 🌊, UGG ☁️, Fila 🐆, Skechers 👟, " +
      "Diadora 🇮🇹, Le Coq Sportif 🐔, Lacoste 🐊, K-Swiss ⭐, Champion 🏆, " +
      "Mizuno 🇯🇵, Yeezy ⚡, Off-White ⚪, Balenciaga 🖤, Common Projects 👟, " +
      "Altra 🟧, Onitsuka Tiger 🐯, Karhu 🇫🇮, KangaROOS 🦘, AVIA ✈️, " +
      "Etonic 🏃, Pony 🐎, Spalding 🏀, Kappa 🇮🇹, Umbro ⚽, " +
      "Lotto 🎲, Hummel 🐝, AND1 🏀, Anta 🇨🇳, Li-Ning 🇨🇳, " +
      "Peak 🛡️, ECCO 👟, Hush Puppies 🐶, Florsheim 👞, Bates ⛓️, " +
      "Rockport 🪨, Easy Spirit 👟, Aerosoles ☁️, Naturalizer 🌿"
    )
  },
  cookies: {
    name: "Cookies",
    emoji: "🍪",
    accent: "#8d6e63",
    items: parseItems(
      "Chocolate Chip 🍫, Oatmeal Raisin 🌾, Snickerdoodle 🌰, Sugar Cookie 🍪, Peanut Butter 🥜, " +
      "Macadamia Nut 🌰, Oreo ⚫, Chips Ahoy 🍫, Nutter Butter 🥜, Famous Amos 🍪, " +
      "Pepperidge Farm 🍪, Milano 🟫, Mint Milano 🍃, Vienna Fingers 🍪, Animal Crackers 🐘, " +
      "Teddy Grahams 🧸, Fig Newton 🟣, Vanilla Wafer 🥛, Lemon Cooler 🍋, Shortbread 🟫, " +
      "Lorna Doone 🟫, Biscotti 🇮🇹, Madeleine 🌸, Macaron 🇫🇷, Black and White ⚪, " +
      "Russian Tea Cake ❄️, Mexican Wedding 💒, Thumbprint 👍, Snowball ❄️, Spritz 🌸, " +
      "Pinwheel 🌀, Ginger Snap 🟫, Gingerbread 🟫, Molasses 🟫, Hermit 🟫, " +
      "Anzac 🇦🇺, Florentine 🇮🇹, Pizzelle 🇮🇹, Gingerbread Man 🟫, Sandies 🟫, " +
      "Vanilla Sandwich 🥛, Chocolate Sandwich 🍫, Wafer 🟫, Tagalong 🟢, Thin Mint 🍃, " +
      "Samoa 🥥, Trefoil 🟫, Do-si-do 🥜, Lemon-Up 🍋, Toffee Tastic 🟫, " +
      "Adventurefuls 🍫, Smores 🍫, Caramel deLites 🥥, Rainbow Cookie 🌈, Black Russian ⚫, " +
      "Cookie Butter 🥜, White Chocolate Macadamia 🥥, Triple Chocolate 🍫, Double Chocolate 🍫, Walnut 🌰, " +
      "Pecan 🌰, Hazelnut 🌰, Almond 🌰, Coconut 🥥"
    )
  },
  breakfast: {
    name: "Breakfast Foods",
    emoji: "🥞",
    accent: "#f4a261",
    items: parseItems(
      "Pancakes 🥞, Waffles 🧇, Bacon 🥓, Eggs 🍳, French Toast 🍞, " +
      "Bagel 🥯, Cereal 🥣, Oatmeal 🥣, Hash Browns 🥔, Toast 🍞, " +
      "English Muffin 🍞, Croissant 🥐, Muffin 🧁, Donut 🍩, Crepe 🥞, " +
      "Omelette 🍳, Scrambled Eggs 🍳, Sunny Side Up 🍳, Over Easy 🍳, Hard Boiled 🥚, " +
      "Soft Boiled 🥚, Poached 🥚, Eggs Benedict 🥚, Quiche 🥧, Frittata 🍳, " +
      "Sausage 🌭, Ham 🍖, Steak and Eggs 🥩, Chicken and Waffles 🍗, Breakfast Burrito 🌯, " +
      "Breakfast Sandwich 🥪, Breakfast Pizza 🍕, Avocado Toast 🥑, Yogurt 🍶, Greek Yogurt 🥛, " +
      "Parfait 🍨, Granola 🌾, Smoothie 🥤, Fruit Salad 🍉, Coffee ☕, " +
      "Tea 🍵, Juice 🧃, Milk 🥛, Hot Chocolate ☕, Pop-Tarts 🍓, " +
      "Toaster Strudel 🍞, Cinnamon Roll 🌀, Sticky Bun 🍯, Danish 🥐, Scone 🥐, " +
      "Biscuit 🥐, Biscuits and Gravy 🍳, Grits 🌽, Porridge 🥣, Cream of Wheat 🥣, " +
      "Congee 🍚, Shakshuka 🍳, Huevos Rancheros 🍳, Chilaquiles 🌶️, Migas 🍳, " +
      "Dim Sum 🥟, Acai Bowl 🟣, Smoked Salmon 🐟, Lox Bagel 🥯"
    )
  }
};

// Round names keyed by number of items competing in that round.
const ROUND_NAMES = {
  64: "Round of 64",
  32: "Round of 32",
  16: "Sweet 16",
  8: "Quarterfinals",
  4: "Semifinals",
  2: "Final"
};

// Number of matches per round for a 64-item bracket.
const ROUND_MATCH_COUNTS = [32, 16, 8, 4, 2, 1];
const TOTAL_ROUNDS = ROUND_MATCH_COUNTS.length;


/* ---------- 2. State ---------- */

const state = {
  screen: "home",         // 'home' | 'matchup' | 'bracket'
  category: null,
  rounds: [],             // each round = array of { a, b, winner: 0|1|null }
  currentRound: 0,
  currentMatch: 0,
  revealedThrough: -1,    // highest round index whose strikethroughs have been animated
  muted: false
};


/* ---------- 3. Utilities ---------- */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function vibrate(ms = 50) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function setAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-soft", hexToRgba(color, 0.18));
}

function hexToRgba(hex, alpha) {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return `rgba(255,107,61,${alpha})`;
  const [r, g, b] = m.map(h => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ===========================================================
   AUDIO SYSTEM (two backends)

   Strategy:
   - PRIMARY: HTML5 <audio> via a generated WAV data URL. Bypasses
     every AudioContext suspension issue. Works the same way an audio
     file on a web page does.
   - FALLBACK: Web Audio API. Only used if the HTML5 path rejects.
   - Mute is "true" / "false" in localStorage under "pickone-muted".
   =========================================================== */
const PREF_MUTED = "pickone-muted";

function loadMutePref() {
  const v = localStorage.getItem(PREF_MUTED);
  return v === "true" || v === "1"; // back-compat with old "1"
}
function saveMutePref(muted) {
  try { localStorage.setItem(PREF_MUTED, muted ? "true" : "false"); } catch {}
}

function applyMute(muted) {
  state.muted = !!muted;
  const btn = document.getElementById("sound-toggle");
  if (btn) {
    btn.textContent = state.muted ? "🔇" : "🔊";
    btn.classList.toggle("muted", state.muted);
    btn.setAttribute("aria-label", state.muted ? "Unmute sound" : "Mute sound");
  }
}

/* ----- HTML5 Audio backend (primary) -----
   Mechanical-keyboard click synthesis:
   - Short (~40ms) burst of white noise pushed through a bandpass
     IIR filter centered ~3kHz (the "tk" timbre of plastic-on-plastic
     contact)
   - Layered with a brief 200Hz sine "thock" (the bottoming-out feel)
   - 1ms attack, exponential decay
   - Six pre-baked variations with ±10% randomization on filter
     frequency, thock pitch, and noise seed so rapid taps don't sound
     robotic — the pool of <audio> elements rotates through them. */
let clickPool = [];
let clickPoolIdx = 0;

/* Direct-form-1 biquad bandpass IIR filter applied to a sample buffer.
   Used for offline (pre-baked) noise filtering. */
function bandpassIIR(samples, freq, Q, sr) {
  const w0 = 2 * Math.PI * freq / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0, b1 = 0, b2 = -alpha / a0;
  const a1 = -2 * cosw0 / a0, a2 = (1 - alpha) / a0;
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

/* Render a single mechanical-keyboard click variation as a Float32 buffer. */
function renderKeyClickSamples(sampleRate) {
  const duration = 0.045;                           // 45ms total
  const numSamples = Math.floor(sampleRate * duration);

  // ±10% randomization for variety between variations.
  const jitter = (mu, pct) => mu * (1 + (Math.random() * 2 - 1) * pct);
  const filterFreq = jitter(3000, 0.10);
  const filterQ    = 2.2 + Math.random() * 0.8;
  const thockFreq  = jitter(200, 0.10);

  // 1) White noise burst → bandpass IIR.
  const noise = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) noise[i] = Math.random() * 2 - 1;
  const filtered = bandpassIIR(noise, filterFreq, filterQ, sampleRate);

  // 2) Mix filtered noise (the "click") with a low sine "thock" and apply
  //    sharp envelopes. 1ms attack, exponential decay.
  const out = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envClick = t < 0.001 ? t / 0.001 : Math.exp(-(t - 0.001) * 95);
    const envThock = Math.exp(-t * 110);
    const thock = Math.sin(2 * Math.PI * thockFreq * t);
    let s = filtered[i] * envClick * 0.65 + thock * envThock * 0.40;
    // Soft clip via tanh — keeps peaks tame without sounding harsh.
    s = Math.tanh(s * 1.1);
    out[i] = s;
  }
  return out;
}

/* Encode Float32 samples (range -1..1) into a 16-bit mono WAV data URL. */
function samplesToWavDataURL(samples, sampleRate) {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const wstr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  wstr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  wstr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, Math.floor(s * 32767), true);
    off += 2;
  }
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

function buildClickWavDataURL() {
  return samplesToWavDataURL(renderKeyClickSamples(22050), 22050);
}

function initClickAudio() {
  if (clickPool.length) return true;
  try {
    const NUM_VARIATIONS = 6;
    for (let i = 0; i < NUM_VARIATIONS; i++) {
      const a = new Audio(buildClickWavDataURL());
      a.preload = "auto";
      a.volume = 0.5;
      clickPool.push(a);
    }
    return true;
  } catch {
    return false;
  }
}

function playClickHTML5() {
  if (!clickPool.length && !initClickAudio()) return false;
  const a = clickPool[clickPoolIdx];
  clickPoolIdx = (clickPoolIdx + 1) % clickPool.length;
  try {
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {}); // swallow autoplay rejections silently
    return true;
  } catch {
    return false;
  }
}

/* ----- Web Audio backend (fallback) ----- */
let audioCtx = null;
let audioFirstUnlocked = false;

function initAudioContext() {
  if (audioCtx) return audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    // iOS unlock — silent 1-sample buffer.
    const buf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    return audioCtx;
  } catch {
    audioCtx = null;
    return null;
  }
}

function bindFirstInteractionUnlock() {
  const events = ["pointerdown", "touchstart", "click", "keydown"];
  const handler = () => {
    if (audioFirstUnlocked) return;
    audioFirstUnlocked = true;
    initClickAudio();
    initAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    events.forEach(e => document.removeEventListener(e, handler, { capture: true }));
  };
  events.forEach(e => document.addEventListener(e, handler, { capture: true, passive: true }));
}

/* Web Audio fallback: same mechanical-click recipe (filtered noise burst
   + low-frequency sine thock) but generated fresh per tap, so each tap
   gets independent ±10% randomization — no two taps sound identical. */
function playWebAudio() {
  if (!audioCtx) initAudioContext();
  if (!audioCtx) return false;
  if (audioCtx.state === "suspended") audioCtx.resume();
  try {
    const ctx = audioCtx;
    const sr = ctx.sampleRate;
    const startAt = ctx.currentTime + 0.005;
    const duration = 0.045;

    // ±10% randomization on filter freq and thock pitch for variety.
    const jitter = (mu, pct) => mu * (1 + (Math.random() * 2 - 1) * pct);
    const filterFreq = jitter(3000, 0.10);
    const thockFreq = jitter(200, 0.10);

    // ---- White noise burst → bandpass filter → envelope ----
    const numSamples = Math.floor(sr * duration);
    const noiseBuf = ctx.createBuffer(1, numSamples, sr);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < numSamples; i++) noiseData[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = filterFreq;
    bandpass.Q.value = 2.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, startAt);
    noiseGain.gain.linearRampToValueAtTime(0.55, startAt + 0.001);   // ~1ms attack
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    noise.connect(bandpass).connect(noiseGain).connect(ctx.destination);
    noise.start(startAt);
    noise.stop(startAt + duration);

    // ---- Low sine "thock" — bottoming-out feel ----
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(thockFreq, startAt);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, startAt);
    oscGain.gain.linearRampToValueAtTime(0.4, startAt + 0.001);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.025);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + 0.03);

    return true;
  } catch {
    return false;
  }
}

function playClack() {
  if (state.muted) return;
  // Try HTML5 first; fall back to Web Audio.
  if (playClickHTML5()) return;
  playWebAudio();
}

/* --- Theme prefs (localStorage); sound prefs live in the audio block above --- */
const PREF_THEME = "pickone-theme";

function loadInitialTheme() {
  const saved = localStorage.getItem(PREF_THEME);
  if (saved === "light" || saved === "dark") return saved;
  // fall back to system
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}
function applyTheme(theme) {
  if (theme === "light") document.documentElement.classList.add("light-mode");
  else document.documentElement.classList.remove("light-mode");
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "light" ? "☀️" : "🌙";
  // also update the meta theme-color so iOS gets the right status bar
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#fafafa" : "#0f0f10");
}


/* ===========================================================
   CONFETTI — canvas particle system, ~3.5s burst
   =========================================================== */
let confettiCanvas = null;
let confettiAnim = null;

function ensureConfettiCanvas() {
  if (confettiCanvas) return confettiCanvas;
  confettiCanvas = document.createElement("canvas");
  confettiCanvas.className = "confetti-canvas";
  document.body.appendChild(confettiCanvas);
  return confettiCanvas;
}
function startConfetti() {
  stopConfetti();
  const canvas = ensureConfettiCanvas();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const colors = ["#ff4d6d", "#ffb700", "#06d6a0", "#4cc9f0", "#bd00ff", "#ff7b00", "#ff70a6"];
  const particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * w,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 5,
      vy: 2 + Math.random() * 5,
      gravity: 0.12 + Math.random() * 0.05,
      drag: 0.998,
      size: 5 + Math.random() * 9,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.3,
      shape: Math.random() < 0.55 ? "rect" : "circle"
    });
  }
  const start = performance.now();
  const duration = 3500;
  function tick(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, w, h);
    const fadeStart = duration * 0.7;
    const alpha = elapsed < fadeStart
      ? 1
      : Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
    for (const p of particles) {
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (elapsed < duration) {
      confettiAnim = requestAnimationFrame(tick);
    } else {
      stopConfetti();
    }
  }
  confettiAnim = requestAnimationFrame(tick);
}
function stopConfetti() {
  if (confettiAnim) {
    cancelAnimationFrame(confettiAnim);
    confettiAnim = null;
  }
  if (confettiCanvas) {
    const ctx = confettiCanvas.getContext("2d");
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}


/* ===========================================================
   CHAMPIONS — saved per-category winners in localStorage
   =========================================================== */
const CHAMPIONS_KEY = "pickone-champions";

function loadChampions() {
  let all;
  try {
    const raw = localStorage.getItem(CHAMPIONS_KEY);
    all = raw ? JSON.parse(raw) : {};
  } catch { return {}; }
  // Drop any saved entries whose category no longer exists in CATEGORIES
  // (e.g. after we remove a category in a future release). This auto-
  // cleans stale champions on the next load so the My Champions list
  // never renders broken old rows.
  let changed = false;
  for (const key of Object.keys(all)) {
    if (!CATEGORIES[key]) {
      delete all[key];
      changed = true;
    }
  }
  if (changed) {
    try { localStorage.setItem(CHAMPIONS_KEY, JSON.stringify(all)); } catch {}
  }
  return all;
}
function saveChampion(categoryKey, champ) {
  if (!categoryKey || !champ) return;
  const all = loadChampions();
  all[categoryKey] = {
    name: champ.name,
    emoji: champ.emoji,
    image: champ.image,
    savedAt: Date.now()
  };
  try { localStorage.setItem(CHAMPIONS_KEY, JSON.stringify(all)); } catch {}
}


/* ===========================================================
   IMAGE PRELOADING
   =========================================================== */
const loadedCategories = new Set();

/* Loading-screen preload (first time you tap a category in a session).
   All items are emoji-backed (Twemoji on jsDelivr's CDN) so a simple
   parallel preload completes in well under a second. */
function preloadCategory(catKey, onProgress) {
  return new Promise((resolve) => {
    const cat = CATEGORIES[catKey];
    if (!cat) { resolve(0); return; }
    const total = cat.items.length;
    let done = 0;
    const finalize = () => {
      done++;
      if (onProgress) onProgress(done, total);
      if (done >= total) {
        loadedCategories.add(catKey);
        resolve(total);
      }
    };
    cat.items.forEach((item) => {
      const img = new Image();
      img.onload = finalize;
      img.onerror = finalize; // failures still count so we don't hang
      img.src = item.image;
    });
  });
}

/* Called after every renderMatchup — preload the next matchup's images
   so the swap is instant. */
function preloadNextMatchup() {
  const round = state.rounds[state.currentRound];
  if (!round) return;
  const next = round[state.currentMatch + 1];
  if (!next) return;
  if (next.a) (new Image()).src = next.a.image;
  if (next.b) (new Image()).src = next.b.image;
}


/* ===========================================================
   BODY CLASSES — locks scroll on the matchup screen so tapping
   the giant buttons can't accidentally pan the page, and hides
   the footer on the immersive in-game screens.
   =========================================================== */
const FOOTER_HIDDEN_SCREENS = new Set(["matchup", "bracket", "transition", "loading"]);

function applyBodyScroll() {
  const screen = state.screen;
  document.body.classList.toggle("no-scroll", screen === "matchup");
  document.body.classList.toggle("hide-footer", FOOTER_HIDDEN_SCREENS.has(screen));
}


/* ---------- 4. Bracket logic ---------- */

function buildFirstRound(items) {
  const shuffled = shuffle(items);
  const round = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    round.push({ a: shuffled[i], b: shuffled[i + 1], winner: null });
  }
  return round;
}

function buildNextRound(prevRound) {
  if (prevRound.length === 1) return null;
  const winners = prevRound.map(m => (m.winner === 0 ? m.a : m.b));
  const round = [];
  for (let i = 0; i < winners.length; i += 2) {
    round.push({ a: winners[i], b: winners[i + 1], winner: null });
  }
  return round;
}

function getChampion() {
  const last = state.rounds[TOTAL_ROUNDS - 1];
  if (!last || last.length !== 1 || last[0].winner === null) return null;
  return last[0].winner === 0 ? last[0].a : last[0].b;
}

function isFinalReveal() {
  // we are showing the final reveal if the championship match has been decided
  return getChampion() !== null;
}

function roundLabelByMatchCount(matchCount) {
  return ROUND_NAMES[matchCount * 2] || `Round of ${matchCount * 2}`;
}

/* placeholder match used when a future round hasn't been built yet */
function placeholderMatch() {
  return { a: null, b: null, winner: null, placeholder: true };
}
function getOrPlaceholderRound(roundIdx) {
  if (state.rounds[roundIdx]) return state.rounds[roundIdx];
  const size = ROUND_MATCH_COUNTS[roundIdx];
  return Array.from({ length: size }, placeholderMatch);
}


/* ---------- 5. Rendering ---------- */

const app = document.getElementById("app");

function render() {
  applyBodyScroll();
  switch (state.screen) {
    case "home":       return renderHome();
    case "loading":    return renderLoadingScreen(state.category);
    case "matchup":    return renderMatchup();
    case "bracket":    return renderBracket();
    case "transition": return renderTransition();
    case "champion":   return renderChampion();
    case "champions":  return renderChampionsList();
  }
}

async function transition(updateFn) {
  app.classList.add("fade-out");
  await sleep(180);
  updateFn();
  void app.offsetWidth; // reflow so the new content paints before fading in
  app.classList.remove("fade-out");
}

/* ----- 5a. Home ----- */
function renderHome() {
  setAccent("#ff6b3d");
  app.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <h1 class="home-title">Pick One</h1>
        <p class="home-subtitle">64 items. One champion. Tap to choose.</p>
      </div>
      <button class="surprise-btn" id="surprise-btn">🎲 Surprise Me</button>
      <div class="category-list">
        ${Object.entries(CATEGORIES).map(([key, cat]) => `
          <button class="category-card" data-category="${key}">
            <img class="cat-icon" src="${emojiToTwemojiUrl(cat.emoji)}" alt=""
                 data-emoji="${cat.emoji}"
                 data-backup="${emojiToOpenMojiUrl(cat.emoji)}"
                 onerror="window.__pickoneImgFallback(this)" />
            <span class="info">
              <span class="name">${cat.name}</span>
              <span class="count">${cat.items.length} items</span>
            </span>
          </button>
        `).join("")}
      </div>
      <button class="champions-btn" id="champions-btn">🏆 My Champions</button>
    </div>
  `;
  app.querySelectorAll(".category-card").forEach(btn => {
    btn.addEventListener("click", () => {
      vibrate(40);
      startGame(btn.dataset.category);
    });
  });
  document.getElementById("surprise-btn").addEventListener("click", () => {
    vibrate(40);
    pickRandomCategory();
  });
  document.getElementById("champions-btn").addEventListener("click", () => {
    vibrate(40);
    state.screen = "champions";
    transition(render);
  });
}

/* ----- 5b. Matchup ----- */
function renderMatchup() {
  const round = state.rounds[state.currentRound];
  const match = round[state.currentMatch];
  app.innerHTML = `
    <div class="matchup">
      <button class="option" data-side="0" aria-label="Pick ${escapeHtml(match.a.name)}">
        <div class="option-image">
          <img src="${match.a.image}" alt="" data-emoji="${match.a.emoji}" data-backup="${match.a.imageBackup}" onload="this.classList.add('loaded')" onerror="window.__pickoneImgFallback(this)" />
        </div>
        <div class="name">${escapeHtml(match.a.name)}</div>
      </button>
      <div class="matchup-header">
        <div class="matchup-round">${roundLabelByMatchCount(round.length)}</div>
        <div class="matchup-progress">Match ${state.currentMatch + 1} / ${round.length}</div>
      </div>
      <button class="option" data-side="1" aria-label="Pick ${escapeHtml(match.b.name)}">
        <div class="option-image">
          <img src="${match.b.image}" alt="" data-emoji="${match.b.emoji}" data-backup="${match.b.imageBackup}" onload="this.classList.add('loaded')" onerror="window.__pickoneImgFallback(this)" />
        </div>
        <div class="name">${escapeHtml(match.b.name)}</div>
      </button>
    </div>
  `;
  app.querySelectorAll(".option").forEach(btn => {
    btn.addEventListener("click", () => {
      vibrate(50);
      playClack();
      pickWinner(parseInt(btn.dataset.side, 10));
    });
  });

  // Quietly preload the next matchup's images so the swap is instant.
  preloadNextMatchup();
}

/* Fallback chain for cartoon images, fired by <img onerror>:
   1. If the element still has a data-backup URL, swap to that and let
      the same handler fire again if it also fails.
   2. Otherwise replace with a span containing the native emoji char. */
window.__pickoneImgFallback = function (img) {
  const backup = img.getAttribute("data-backup");
  if (backup) {
    img.removeAttribute("data-backup");
    img.src = backup;
    return;
  }
  img.onerror = null;
  const span = document.createElement("span");
  span.className = "emoji-fallback";
  span.textContent = img.dataset.emoji;
  img.replaceWith(span);
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ----- 5c. Bracket reveal (interim + final) ----- */
function renderBracket() {
  const isFinal = isFinalReveal();
  const justFinished = state.currentRound;
  const cat = CATEGORIES[state.category];

  // Header content differs for interim vs final.
  let headerHtml;
  if (isFinal) {
    headerHtml = `
      <div class="reveal-title">${escapeHtml(cat.name)} Champion</div>
      <div class="reveal-champion" id="champion-display"></div>
    `;
  } else {
    const survivors = state.rounds[justFinished].length; // matches won = winners advancing
    const nextLabel = ROUND_NAMES[survivors] || `Round of ${survivors}`;
    headerHtml = `
      <div class="reveal-title">${roundLabelByMatchCount(state.rounds[justFinished].length)} complete</div>
      <div class="reveal-progress">${survivors} advance to ${nextLabel}</div>
    `;
  }

  // Action buttons differ too. The final round advances to the dedicated
  // champion celebration screen (where Play Again / Replay / Share live).
  const actionsHtml = isFinal
    ? `<button class="btn btn-primary" id="see-champion">See Champion 👑</button>`
    : `<button class="btn btn-primary" id="continue">Continue</button>`;

  app.innerHTML = `
    <div class="reveal">
      <div class="reveal-header">${headerHtml}</div>
      <div class="bracket"><div class="bracket-grid" id="bracket-grid"></div></div>
      <div class="reveal-actions">${actionsHtml}</div>
    </div>
  `;

  buildBracketDom(document.getElementById("bracket-grid"));

  // Pre-mark losers from previously revealed rounds (no animation).
  applyAllPriorLosers(state.revealedThrough);

  // Wire up the action buttons.
  if (isFinal) {
    document.getElementById("see-champion").addEventListener("click", () => { vibrate(40); goToChampion(); });
  } else {
    document.getElementById("continue").addEventListener("click", () => { vibrate(40); continueToNextRound(); });
  }

  // Scale the bracket to fit the viewport (no scroll needed). Wait one
  // frame so the browser has finished layout and offset/scroll metrics
  // are accurate.
  requestAnimationFrame(fitBracket);

  // Animate the just-finished round, plus the champion if we have one.
  animateBracketReveal(justFinished, isFinal);
}

/**
 * Scale the bracket grid down so the entire bracket fits in the visible
 * area without scrolling. Never scales above 1 (no upscaling on big
 * screens). The user can still pinch-zoom natively to inspect details.
 */
function fitBracket() {
  const grid = document.getElementById("bracket-grid");
  if (!grid) return;
  const bracket = grid.parentElement;
  if (!bracket) return;

  // Reset any previous transform before measuring natural dimensions.
  grid.style.transform = "";

  const natW = grid.offsetWidth;
  const natH = grid.offsetHeight;
  const availW = bracket.clientWidth;
  const availH = bracket.clientHeight;
  if (!natW || !natH || !availW || !availH) return;

  const scale = Math.min(availW / natW, availH / natH, 1);
  if (scale < 1) {
    grid.style.transform = `scale(${scale})`;
  }
}

/* ----- 5d. Round transition card ----- */
function renderTransition() {
  const round = state.rounds[state.currentRound];
  const label = roundLabelByMatchCount(round.length);
  app.innerHTML = `
    <div class="transition-card">
      <div class="transition-name">${escapeHtml(label)}</div>
    </div>
  `;
  // Hold for ~1s, then advance to the next round's matchups. transition()
  // gives us the cross-fade between this card and the first matchup.
  setTimeout(() => {
    if (state.screen !== "transition") return;
    state.screen = "matchup";
    transition(render);
  }, 1100);
}

/* ----- 5e. Champion celebration ----- */
function renderChampion() {
  const champ = getChampion();
  const cat = CATEGORIES[state.category];
  if (!champ || !cat) {
    state.screen = "home";
    transition(render);
    return;
  }
  setAccent(cat.accent);
  app.innerHTML = `
    <div class="champion-screen">
      <div class="champion-content">
        <div class="champion-crown">👑</div>
        <div class="champion-image">
          <img src="${champ.image}" alt="" data-emoji="${champ.emoji}" data-backup="${champ.imageBackup || emojiToOpenMojiUrl(champ.emoji)}" onerror="window.__pickoneImgFallback(this)" />
        </div>
        <div class="champion-name">${escapeHtml(champ.name)}</div>
        <div class="champion-category">Your ${escapeHtml(cat.name)} Champion</div>
      </div>
      <div class="champion-actions">
        <button class="btn btn-primary" id="replay-cat">Replay ${escapeHtml(cat.name)}</button>
        <button class="btn btn-secondary" id="play-again">Play Again</button>
        <button class="btn btn-secondary" id="share">Share</button>
      </div>
    </div>
  `;
  document.getElementById("replay-cat").addEventListener("click", () => {
    vibrate(40);
    stopConfetti();
    if (state.category) startGame(state.category);
  });
  document.getElementById("play-again").addEventListener("click", () => {
    vibrate(40);
    resetGame();
  });
  document.getElementById("share").addEventListener("click", () => {
    vibrate(40);
    shareResult();
  });
  // Trigger the celebration burst.
  startConfetti();
  vibrate([20, 60, 20, 60, 20]);
}

/* ----- 5f. My Champions list ----- */
function renderChampionsList() {
  setAccent("#ff6b3d");
  const champs = loadChampions();
  app.innerHTML = `
    <div class="champions-page">
      <div class="champions-header">
        <button class="back-btn" id="back-home" aria-label="Back to home">←</button>
        <h2 class="champions-title">My Champions</h2>
        <div class="back-btn-spacer"></div>
      </div>
      <div class="champions-list">
        ${Object.entries(CATEGORIES).map(([key, cat]) => {
          const c = champs[key];
          return `
            <div class="champion-row${c ? "" : " empty"}">
              <div class="row-cat">
                <span class="row-cat-emoji">${cat.emoji}</span>
                <span class="row-cat-name">${escapeHtml(cat.name)}</span>
              </div>
              <div class="row-champ">
                ${c
                  ? `<img src="${emojiToTwemojiUrl(c.emoji)}" alt="" data-emoji="${c.emoji}" data-backup="${emojiToOpenMojiUrl(c.emoji)}" onerror="window.__pickoneImgFallback(this)" />
                     <span class="row-champ-name">${escapeHtml(c.name)}</span>`
                  : `<span class="row-champ-empty">Not yet played</span>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
  document.getElementById("back-home").addEventListener("click", () => {
    vibrate(30);
    state.screen = "home";
    transition(render);
  });
}

/* ----- 5g. Loading screen (first visit per category) ----- */
function renderLoadingScreen(catKey) {
  const cat = CATEGORIES[catKey];
  if (!cat) return;
  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-content">
        <div class="loading-emoji">${cat.emoji}</div>
        <div class="loading-label">Loading ${escapeHtml(cat.name)}…</div>
        <div class="loading-bar"><div class="loading-fill" id="loading-fill"></div></div>
        <div class="loading-progress" id="loading-progress">0%</div>
      </div>
    </div>
  `;
}

/**
 * March Madness layout:
 *   [L0][L1][L2][L3][L4][ Final + Champion ][R4][R3][R2][R1][R0]
 * Each non-final round is split in half by absolute match index;
 * lower indices fill the left columns, upper indices the right.
 */
function buildBracketDom(grid) {
  // Left side: rounds 0..4, left half of each round
  for (let r = 0; r < TOTAL_ROUNDS - 1; r++) {
    grid.appendChild(makeRoundColumn(r, "left"));
  }
  // Center: final + champion
  grid.appendChild(makeFinalColumn());
  // Right side: rounds 4..0, right half of each round (mirrored visually)
  for (let r = TOTAL_ROUNDS - 2; r >= 0; r--) {
    grid.appendChild(makeRoundColumn(r, "right"));
  }
}

function makeRoundColumn(roundIdx, side) {
  const round = getOrPlaceholderRound(roundIdx);
  const half = round.length / 2;
  const start = side === "left" ? 0 : half;
  const end = side === "left" ? half : round.length;

  const col = document.createElement("div");
  col.className = `bracket-round bracket-${side}`;
  col.dataset.round = String(roundIdx);

  const label = document.createElement("div");
  label.className = "bracket-round-label";
  label.textContent = roundLabelByMatchCount(round.length);
  col.appendChild(label);

  for (let i = start; i < end; i++) {
    col.appendChild(makeMatchEl(round[i], roundIdx, i));
  }
  return col;
}

function makeFinalColumn() {
  const col = document.createElement("div");
  col.className = "bracket-final-col";

  const label = document.createElement("div");
  label.className = "bracket-round-label";
  label.textContent = "Final";
  col.appendChild(label);

  const finalRound = getOrPlaceholderRound(TOTAL_ROUNDS - 1);
  const finalMatchEl = makeMatchEl(finalRound[0], TOTAL_ROUNDS - 1, 0);
  finalMatchEl.classList.add("bracket-final-match");
  col.appendChild(finalMatchEl);

  // Champion box (filled only after the final is decided; appears via animation later).
  const champ = getChampion();
  const champEl = document.createElement("div");
  champEl.className = "champion-cell";
  champEl.id = "champion-cell";
  if (champ) {
    champEl.innerHTML = `
      <span class="slot-emoji">${champ.emoji}</span>
      <span class="slot-name">${escapeHtml(champ.name)}</span>
      <span class="crown">👑</span>
    `;
  } else {
    champEl.innerHTML = `<span class="slot-name">—</span>`;
    champEl.style.visibility = "hidden";
  }
  col.appendChild(champEl);
  return col;
}

function makeMatchEl(match, roundIdx, matchIdx) {
  const el = document.createElement("div");
  el.className = "bracket-match";
  el.dataset.round = String(roundIdx);
  el.dataset.match = String(matchIdx);
  el.appendChild(makeSlotEl(match.a, match, 0));
  el.appendChild(makeSlotEl(match.b, match, 1));
  return el;
}

function makeSlotEl(item, match, slotIdx) {
  const slot = document.createElement("div");
  slot.className = "bracket-slot";
  slot.dataset.slot = String(slotIdx);
  if (!item) {
    slot.classList.add("placeholder");
    slot.innerHTML = `<span class="slot-name">—</span>`;
    return slot;
  }
  slot.innerHTML = `
    <span class="slot-emoji">${item.emoji}</span>
    <span class="slot-name">${escapeHtml(item.name)}</span>
  `;
  // If the match has already been decided, mark the winner. Loser gets
  // marked separately during animation (or with loser-immediate for
  // already-revealed earlier rounds).
  if (match.winner !== null && slotIdx === match.winner) {
    slot.classList.add("winner");
  }
  return slot;
}

/* ----- bracket reveal animations ----- */

function applyAllPriorLosers(throughRound) {
  if (throughRound < 0) return;
  for (let r = 0; r <= throughRound; r++) {
    const round = state.rounds[r];
    if (!round) continue;
    round.forEach((match, m) => {
      if (match.winner === null) return;
      const loserSlot = match.winner === 0 ? 1 : 0;
      const el = document.querySelector(
        `.bracket-match[data-round="${r}"][data-match="${m}"] .bracket-slot[data-slot="${loserSlot}"]`
      );
      if (el) el.classList.add("loser", "loser-immediate");
    });
  }
}

async function animateBracketReveal(roundIdx, isFinal) {
  // Slow the strikethrough pace as the rounds get more dramatic.
  const perLoserMs = [22, 38, 70, 120, 220, 360];
  const round = state.rounds[roundIdx];
  if (!round) return;

  for (let m = 0; m < round.length; m++) {
    const match = round[m];
    if (match.winner === null) continue;
    const loserSlot = match.winner === 0 ? 1 : 0;
    const el = document.querySelector(
      `.bracket-match[data-round="${roundIdx}"][data-match="${m}"] .bracket-slot[data-slot="${loserSlot}"]`
    );
    if (el) el.classList.add("loser");
    await sleep(perLoserMs[roundIdx] || 60);
  }

  state.revealedThrough = roundIdx;

  if (isFinal) {
    await sleep(300);
    const champEl = document.getElementById("champion-cell");
    if (champEl) {
      champEl.style.visibility = "visible";
      champEl.classList.add("shown");
    }
    const champ = getChampion();
    const display = document.getElementById("champion-display");
    if (display && champ) {
      display.textContent = `${champ.emoji} ${champ.name}`;
      display.classList.add("shown");
    }
    vibrate(30);
    setTimeout(() => vibrate(30), 90);

    // The champion-cell appearing changes the grid's natural height,
    // so re-fit so the whole bracket still fits within the viewport.
    requestAnimationFrame(fitBracket);
  }
}


/* ---------- 6. Actions ---------- */

async function startGame(categoryKey) {
  const cat = CATEGORIES[categoryKey];
  if (!cat) return;
  state.category = categoryKey;
  setAccent(cat.accent);
  stopConfetti();

  // First time hitting this category in this session: show the loading
  // screen with a progress bar while we preload all 64 cartoon images.
  // Subsequent visits within the same session skip straight to play.
  if (!loadedCategories.has(categoryKey)) {
    state.screen = "loading";
    await transition(render);
    await preloadCategory(categoryKey, (done, total) => {
      const pct = Math.round((done / total) * 100);
      const fill = document.getElementById("loading-fill");
      const prog = document.getElementById("loading-progress");
      if (fill) fill.style.width = pct + "%";
      if (prog) prog.textContent = pct + "%";
    });
    await sleep(220); // brief 100% pause for polish
  }

  state.rounds = [buildFirstRound(cat.items)];
  state.currentRound = 0;
  state.currentMatch = 0;
  state.revealedThrough = -1;
  state.screen = "matchup";
  transition(render);
}

function pickWinner(side) {
  const round = state.rounds[state.currentRound];
  round[state.currentMatch].winner = side;

  // More matches in this round — keep voting.
  if (state.currentMatch < round.length - 1) {
    state.currentMatch++;
    transition(render);
    return;
  }

  // Round complete — show the bracket reveal (interim or final).
  state.screen = "bracket";
  transition(render);
}

function continueToNextRound() {
  const round = state.rounds[state.currentRound];
  const next = buildNextRound(round);
  if (!next) return; // shouldn't happen mid-tournament
  state.rounds.push(next);
  state.currentRound++;
  state.currentMatch = 0;
  // Route through a brief full-screen transition card before the next round.
  state.screen = "transition";
  transition(render);
}

function goToChampion() {
  const champ = getChampion();
  if (champ && state.category) saveChampion(state.category, champ);
  state.screen = "champion";
  transition(render);
}

function pickRandomCategory() {
  const keys = Object.keys(CATEGORIES);
  const random = keys[Math.floor(Math.random() * keys.length)];
  startGame(random);
}

function resetGame() {
  stopConfetti();
  state.screen = "home";
  state.category = null;
  state.rounds = [];
  state.currentRound = 0;
  state.currentMatch = 0;
  state.revealedThrough = -1;
  transition(render);
}

async function shareResult() {
  const champ = getChampion();
  const cat = CATEGORIES[state.category];
  if (!champ || !cat) return;
  const text = `My Pick One ${cat.name} champion: ${champ.emoji} ${champ.name}`;

  if (navigator.share) {
    try { await navigator.share({ title: "Pick One", text }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
      return;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Copied to clipboard");
  } catch { showToast("Could not share"); }
}

function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("shown"));
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("shown"), 2200);
}


/* ---------- Feedback modal (footer buttons) ---------- */

const FEEDBACK_KINDS = {
  feedback: {
    title:   "Type your feedback so we can improve",
    subject: "Pick One — Feedback"
  },
  category: {
    title:   "Type your category request",
    subject: "Pick One — Category Request"
  }
};
const FEEDBACK_TO = "kjjyu2012@gmail.com";

let feedbackModalOpen = null; // backdrop element when one is open

function openFeedbackModal(kind) {
  if (feedbackModalOpen) return; // only one at a time
  const cfg = FEEDBACK_KINDS[kind];
  if (!cfg) return;

  const backdrop = document.createElement("div");
  backdrop.className = "feedback-backdrop";
  backdrop.innerHTML = `
    <div class="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button type="button" class="feedback-close" aria-label="Close">×</button>
      <h2 class="feedback-title" id="feedback-title"></h2>
      <textarea class="feedback-textarea" placeholder="Type here..." rows="6"></textarea>
      <button type="button" class="feedback-send" disabled>Send</button>
    </div>
  `;
  // Set title via textContent (safer than innerHTML interpolation).
  backdrop.querySelector(".feedback-title").textContent = cfg.title;

  document.body.appendChild(backdrop);
  document.body.classList.add("modal-open");
  feedbackModalOpen = backdrop;

  const ta       = backdrop.querySelector(".feedback-textarea");
  const sendBtn  = backdrop.querySelector(".feedback-send");
  const closeBtn = backdrop.querySelector(".feedback-close");

  // Send button is disabled until at least one non-whitespace character.
  ta.addEventListener("input", () => {
    sendBtn.disabled = ta.value.trim().length === 0;
  });

  function close() {
    if (!feedbackModalOpen) return;
    feedbackModalOpen = null;
    document.body.classList.remove("modal-open");
    backdrop.classList.add("closing");
    document.removeEventListener("keydown", escHandler);
    setTimeout(() => backdrop.remove(), 180);
  }

  function escHandler(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", escHandler);

  closeBtn.addEventListener("click", () => { vibrate(20); close(); });
  // Click on the dimmed backdrop (but not the modal itself) closes too.
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  sendBtn.addEventListener("click", () => {
    const text = ta.value.trim();
    if (!text) return;
    const url = "mailto:" + FEEDBACK_TO
              + "?subject=" + encodeURIComponent(cfg.subject)
              + "&body="    + encodeURIComponent(text);
    // Trigger the user's email client. We don't await — the browser may
    // navigate away, and either way the close + toast run synchronously.
    window.location.href = url;
    vibrate(30);
    close();
    showToast("Thanks! Your email app should be opening to send your message.");
  });

  // Auto-focus the textarea so users can start typing immediately.
  // Small delay so it works after the modal is mounted on iOS.
  setTimeout(() => ta.focus(), 50);
}

function setupFeedbackButtons() {
  document.querySelectorAll(".footer-link[data-feedback-kind]").forEach(btn => {
    btn.addEventListener("click", () => {
      vibrate(20);
      openFeedbackModal(btn.dataset.feedbackKind);
    });
  });
}


/* ---------- 7. Init ---------- */

function setupControls() {
  const themeBtn = document.getElementById("theme-toggle");
  const soundBtn = document.getElementById("sound-toggle");

  // Theme: load preference (or system default), apply, wire up toggle.
  const theme = loadInitialTheme();
  applyTheme(theme);
  themeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.contains("light-mode");
    const next = isLight ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(PREF_THEME, next);
    vibrate(20);
  });

  // Sound: bind first-interaction audio unlock once, load mute pref,
  // and wire up the toggle.
  bindFirstInteractionUnlock();
  applyMute(loadMutePref());

  // Footer feedback buttons → open the in-app modal.
  setupFeedbackButtons();
  soundBtn.addEventListener("click", () => {
    applyMute(!state.muted);
    saveMutePref(state.muted);
    vibrate(20);
    if (!state.muted) playClack(); // brief preview when un-muting
  });

  // Re-fit the bracket whenever the viewport size changes.
  window.addEventListener("resize", () => {
    if (state.screen === "bracket") requestAnimationFrame(fitBracket);
  });
}

setupControls();
render();
