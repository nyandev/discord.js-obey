import { Channel, GuildChannel, Intents, Message, TextChannel } from 'discord.js';

import { Arguments, Client, Command, CommandError, Permission } from '../lib';


class TestCommand extends Command {
  static options = {
    name: 'test',
    description: "tests stuff"
  };

  async run(message: Message, args: Arguments) {
    if (message.channel instanceof TextChannel)
      message.channel.send("oon tää kissa");
  }
}

async function start() {
  const token = process.env.DISCORD_TOKEN;
  if (!token)
    throw new Error("missing token");

  const clientOpts = {
    globalPrefix: '$',
    errorHandler: async (error: CommandError, message: Message) => { console.log(error) },
    permissionsGetter: () => Permission.User,
    intents: Intents.NON_PRIVILEGED
  };

  const client = new Client(clientOpts);

  client.registerCommands([TestCommand]);

  await client.login(token);
  console.log("client started");
}

start();
