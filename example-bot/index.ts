import { Channel, GuildChannel, Intents, Message, TextChannel } from 'discord.js';

import { Arguments, Client, Command, CommandError, Permission } from '../lib';


class TestCommand extends Command {
  static options = {
    name: 'test',
    dummy: true,
    permissions: Permission.Owner
  };

  async run(message: Message, args: Arguments) {
    if (message.channel instanceof TextChannel)
      message.channel.send("oon tää kissa");
  }
}

async function errorHandler(error: CommandError, message: Message) {
  let msg;
  if (error === CommandError.UnknownCommand)
    msg = "unknown command";
  else if (error === CommandError.MissingPermissions)
    msg = "missing permissions";
  else if (error === CommandError.GuildOnly)
    msg = "not in guild";
  else if (error === CommandError.DummyCommand)
    msg = "this command is dum";

  if (msg)
    return await message.channel.send(msg);
}

async function start() {
  const token = process.env.DISCORD_TOKEN;
  if (!token)
    throw new Error("missing token");

  const clientOpts = {
    globalPrefix: '$',
    errorHandler,
    permissionsGetter: () => Permission.User,
    intents: Intents.NON_PRIVILEGED
  };

  const client = new Client(clientOpts);

  client.registerCommands([TestCommand]);

  await client.login(token);
  console.log("client started");
}

start();
