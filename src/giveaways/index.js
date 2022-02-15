const {
  MessageEmbed,
  MessageButton,
  MessageActionRow,
  MessageSelectMenu
} = require("discord.js")
const {
  EventEmitter
} = require("events")
const chalk = require("chalk")
const {
  writeFile,
  readFile
} = require("fs/promises")

class GiveawayClient extends EventEmitter {
  constructor(client, options = {}) {
    super()

    if (!client) throwErr("client is not defined!")
    if (!options.storage || options.storage.split(".").find(c => c !== "json")) throwErr("storage is not defined!")
    if (!options.managePermission) throwErr("managePermission is not defined!")


    this.client = client
    this.options = options
    this.giveaways = []
    this.perms = options.managePermission

    this.client.on("ready", async() => {
      let f = await this.fileToArr();
      this.giveaways = f

      this.giveaways.forEach(g => {
        if (!g.ended) {
          let time = g.opt.time - Math.floor(Date.now() - g.startedAt)

          setTimeout(() => {
            let gi = this.findG(g.message)
            if (gi && !gi.ended) {
              this.end(g.message)
            }
          },
            time)
        }
      })

      return console.log(chalk.green(`[GIVEAWAY_CLIENT] Loaded All giveaways!`))
    })
  }

  start(opts = {}) {
    if (!check(opts.channel)) {
      throwErr("unable to start Giveaway / channel is not defined!")
    }
    if (!check(opts.message, "object")) {
      throwErr("unable to start Giveaway / message is not defined!")
    }
    if (!check(opts.time, "number")) {
      throwErr("unable to start Giveaway / end time is not defined!")
    }
    if (!check(opts.winners, "number")) {
      throwErr("unable to start Giveaway / winners is not defined!")
    }
    if (!check(opts.hostedBy, "boolean")) {
      throwErr("unable to start Giveaway / hostedBy is not defined!")
    }
    if (!check(opts.prize)) {
      throwErr("unable to start Giveaway / prize is not defined!")}
    if (!opts.embed) {
      opts.embed = {}
    }

    if (!check(opts.embed.title)) {
      opts.embed.title = "Click The Button To Get A Chance To Win"
    }
    if (!check(opts.embed.color)) {
      opts.embed.color = "RANDOM"
    }
    if (!check(opts.embed.footer)) {
      opts.embed.footer = `Giveaway - ${opts.winners} winners!`
    }
    if (!check(opts.embed.image)) {
      opts.embed.image = null
    }
    if (!check(opts.embed.thumbnail)) {
      opts.embed.thumbnail = null
    }
    if (!check(opts.winMessage)) {
      opts.winMessage = `{winners}, you have won {prize}\n{link}`
    }
    if (!check(opts.noWinMessage)) {
      opts.noWinMessage = `Not Enough entries  :cry:`
    }

    const embed = new MessageEmbed()
    .setTitle(`${opts.embed.title.replace("{prize}", opts.prize).replace("{winners}", opts.winners).replace("{duration}", `<t:${Math.floor(Math.floor(Date.now() + opts.time) / 1000)}:R>`).replace("{host}", opts.slash ? opts.message.user: opts.message.author)}`)
    .setFooter({
      text: `${opts.embed.footer.replace("{prize}", opts.prize).replace("{winners}", opts.winners).replace("{duration}", `<t:${Math.floor(Math.floor(Date.now() + opts.time) / 1000)}:R>`).replace("{host}", opts.slash ? opts.message.user: opts.message.author)}`
    })
    .setThumbnail(opts.embed.thumbnail)
    .setImage(opts.embed.image)
    .setDescription(opts.embed.description ? `${opts.embed.description.replace("{prize}", opts.prize).replace("{winners}", opts.winners).replace("{duration}", `<t:${Math.floor(Math.floor(Date.now() + opts.time) / 1000)}:R>`).replace("{host}", opts.slash ? opts.message.user: opts.message.author)}`: `${check(opts.emoji) ? opts.emoji: "\\🎁"} GiveAway ${check(opts.emoji) ? opts.emoji: "\\🎁"}\n\n• Prize:- ${opts.prize}\n• Winner(s):- ${opts.winners}\n• Duration:- <t:${Math.floor(Math.floor(Date.now() + opts.time) / 1000)}:R>\n${opts.hostedBy ? `• Hosted By:- ${opts.slash ? opts.message.user: opts.message.author}`: ""}`)
    .setTimestamp()
    .setColor(opts.embed.color)

    const button = new MessageButton()
    .setLabel("Enter")
    .setCustomId("g-join")
    .setEmoji(opts.emoji ? opts.emoji: "🎀")
    .setStyle("DANGER")

    let menu = new MessageSelectMenu()
    .setPlaceholder(`Only For Mods with ${this.perms} permission.`)
    .setCustomId("g-menu")
    .addOptions([{
      label: "Participants.",
      description: "Get a list of participants!",
      value: "participants"
    },
      {
        label: "Re-Roll.",
        description: "Re-Roll this giveaway and choose some other Winner(s)!",
        value: "re-roll"
      },
      {
        label: "End.",
        description: "End this giveaway!",
        value: "end"
      }])

    const row = new MessageActionRow().addComponents(button)
    const row2 = new MessageActionRow().addComponents(menu)

    return this.client.channels.cache.get(opts.channel).send({
      embeds: [embed],
      components: [row, row2],
      content: `${opts.everyonePing ? "@everyone": "** **"}`
    }).then(async msg => {
      this.giveaways.push({
        message: msg.id,
        opt: opts,
        entries: [],
        embeds: msg.embeds[0],
        startedAt: Date.now(),
        guild: msg.guild.id,
        ended: false
      })
      await this.saveG()

      setTimeout(async() => {
        await this.end(msg.id)
      },
        opts.time)
    })
  }

  async end(msgid) {
    let g = this.findG(msgid)
    if (!g) throwErr("Invalid message id")

    const winners = this.selectWinners(g)

    this.client.channels.cache.get(g.opt.channel).messages.fetch(g.message).then(msg => msg.reply(winners.length < 1 ? `${g.opt.noWinMessage.replace("{link}", `https://discord.com/channels/${g.guild}/${g.opt.channel}/${g.message}`).replace("{prize}", g.opt.prize)}`: `${g.opt.winMessage.replace("{link}", `https://discord.com/channels/${g.guild}/${g.opt.channel}/${g.message}`).replace("{winners}", `${winners.map(c => `${this.client.guilds.cache.get(g.guild)?.members.cache.get(c)}`).join(" , ")}`).replace("{prize}", g.opt.prize)}`))

    this.emit("giveawayEnd", g.opt.channel, winners, g)

    g.ended = true;

    return await this.saveG()
  }

  async reroll(msgid) {
    let g = this.findG(msgid)
    if (!g) throwErr("invalid message id")

    if (!g.ended) return throwErr("this giveaway is not ended yet!")

    return await this.end(msgid)
  }

  participants(msgid) {
    let g = this.findG(msgid)
    if (!g) return throwErr("invalid message id")

    return g.entries;
  }

  giveaways() {
    return this.giveaways
  }

  async handleInteraction(client, interaction) {
    if (interaction.isButton()) {
      if (interaction.customId === "g-join") {
        let g = this.findG(interaction.message.id)
        if (!g) return interaction.reply({
          content: g.opt.invalidGiveawayessage ? `${g.opt.invalidGiveawayMessage}`: "Invalid GiveAway!", ephemeral: true
        })
        if (g.ended) return interaction.reply({
          content: "This giveaway  is ended!", ephemeral: true
        })

        if (g.opt.ignoredRole && !intetaction.member.roles.cache.get(g.opt.ignoredRole)) return interaction.reply({
          content: g.opt.blockMessage ? `${g.opt.blockMessage}`: "Sorry, But you can't join this giveaway!", ephemeral: true
        })

        if (!g.entries.find(c => c === interaction.member.user.id)) {
          g.entries.push(interaction.member.user.id)
          interaction.reply({
            content: g.opt.joinMessage ? `${g.opt.joinMessage}`: "Successfully, joined this giveaway!", ephemeral: true
          })
          await this.saveG()
          return this.emit("giveawayJoined", g, interaction.member)
        } else {
          g.entries = g.entries.filter(c => c !== interaction.member.user.id)
          interaction.reply({
            content: g.opt.leaveMessage ? `${g.opt.leaveMessage}`: "Successfully, left this giveaway!", ephemeral: true
          })
          await this.saveG()
          return this.emit("giveawayLeft", g, interaction.member)
        }
      }
    }

    if (interaction.isSelectMenu) {
      if (interaction.customId === "g-menu") {
        await interaction.member.fetch(interaction.user.id)

        if (!interaction.member.permissions.has(this.perms)) return interaction.reply({
          content: g.opt.noPermissionMessage ? `${g.opt.noPermissionMessage}`: "You Dont Have enough permissions!",
          ephemeral: true
        })

        if (interaction.values[0] === "participants") {
          let g = this.findG(interaction.message.id)
          if (!g) return interaction.reply({
            content: g.opt.invalidGiveawayessage ? `${g.opt.invalidGiveawayMessage}`: "Invalid GiveAway!", ephemeral: true
          })

          let p = this.participants(interaction.message.id)

          p.forEach(async (c) => {
            await interaction.guild.members.fetch(c)
          })

          interaction.reply({
            content: `${p.length < 1 ?  g.opt.noParticipantsMessage ? `${g.opt.noParticipantsMessage}`: "No Participants!": `${p.map(c => interaction.guild.members.cache.get(c)).join(", ")}`}`,
            ephemeral: true
          })
        }

        if (interaction.values[0] === "re-roll") {
          let g = this.findG(interaction.message.id)
          if (!g) return interaction.reply({
            content: g.opt.invalidGiveawayessage ? `${g.opt.invalidGiveawayMessage}`: "Invalid GiveAway!", ephemeral: true
          })
          if (!g.ended) return interaction.reply({
            content: "this giveaway  is not ended yet!", ephemeral: true
          })

          interaction.reply({
            content: "Successfully, re-rolled giveaway!", ephemeral: true
          })

          return await this.reroll(interaction.message.id)
        }

        if (interaction.values[0] === "end") {
          let g = this.findG(interaction.message.id)
          if (!g) return interaction.reply({
            content: g.opt.invalidGiveawayessage ? `${g.opt.invalidGiveawayMessage}`: "Invalid GiveAway!", ephemeral: true
          })

          interaction.reply({
            content: "Successfully, ended giveaway!", ephemeral: true
          })

          return await this.end(interaction.message.id)
        }
      }
    }
  }

  selectWinners(g) {
    const winners = []

    for (let i = 0; i < g.opt.winners; i++) {
      if (g.entries.length >= 1) {
        let winner = g.entries[Math.floor(Math.random() * g.entries.length)]

        let prev = winners.includes(winner)
        if (!prev) {
          winners.push(winner)
        }
      }
    }

    return winners;
  }

  findG(msgid) {
    return this.giveaways.find(c => c.message === msgid)
  }

  async deleteG(msgid) {
    this.giveaways = this.giveaways.filter(c => c.message !== msgid)
    return await this.saveG()
  }

  async saveG() {
    return await writeFile(this.options.storage, JSON.stringify(this.giveaways))
  }

  async fileToArr() {
    let file = await readFile(this.options.storage, {
      encoding: "utf8"
    })

    return JSON.parse(file)
  }
}
function throwErr(msg) {
  throw new TypeError(chalk.red(`[GIVEAWAY_CLIENT] Error: ${msg}`))
}

function check(msg, type = "string") {
  return typeof msg === type
}

module.exports = GiveawayClient