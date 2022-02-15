<p ="center">
   <img src="https://img.shields.io/npm/dt/djs-dream?style=for-the-badge">
   <img src="https://img.shields.io/npm/v/djs-dream?style=for-the-badge">
   <a href = "https://discord.gg/7UQaVPBQka" > <img src="https://img.shields.io/badge/Server-Invite-brightgreen" href = "">
   </a>
</p>

# About
+ A Multipurpose package for bot needs!

# Functions
+ - giveaways

# Giveaways
```js 
const { GiveawayManager } = require("djs-dream")

const gm = new GiveawayManager({
  client: client, // your discord client.
  storage: "./database.json", // file to store data.
  managePermission: "MANAGE_GUILD" // permission to manage Giveaways.
})

client.on("interactionCreate", async i => {
  await gm.handleInteraction(client, i) // Buttons yippe!
})

+ Functions:
+ - start({
  message: message, // message
  channel: "", // channel id to start giveaway.
  time: 5000, // end time
  winners: 5, // winners count
  hostedBy: true, whether to tell host or not not
  prize: "Something", // Prize, the most precious
  everyonePing: false, // whether ping or not
  /*embed: {
    title: "", // title of giveaway
    color: "", // color of the embed
    footer: "", // footer of the embed
    image: "", // image of the embed
    thumbnail: "", // thumbnail of the embed
  }*/
}) // start the giveaway!

+ - end(msgid) // end the giveaway!

+ - reroll(msgid) // re-roll the giveaway!

+ Check the source code to get more functions!
```