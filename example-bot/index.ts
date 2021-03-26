import { Channel, GuildChannel, Intents, Message, TextChannel } from 'discord.js';

import { Arguments, Client, Command, CommandConstructor, CommandConstructorOptions, CommandError, CommandOptions, Permission } from '../lib';


abstract class NyaCommand extends Command {
  constructor(client: Client, protected module: Module, options?: CommandConstructorOptions) {
    super(client, options);
  }
}

class TestTestCommand extends NyaCommand {
  static options = {
    name: 'test'
  };
  async run(message: Message, args: Arguments) {
    console.log(this.constructor.name, this.module.constructor.name);
    message.channel.send("oon tää kissa");
  }
}

class TestCommand extends NyaCommand {
  static options = {
    name: 'test',
    dummy: false,
    permissions: Permission.Owner,
    subcommands: {
      test: TestTestCommand
    },
    args: [
      { key: 'channel', type: 'text-channel', optional: true }
    ]
  };

  async run(message: Message, args: Arguments) {
    message.channel.send(`got ${args.channel}`);
/*
    const ch = await this.client.channels.fetch('775265183395479614');
    if (ch instanceof TextChannel)
      ch.send("oon tää kissa");
*/
  }
}

abstract class Module {
  static commands: CommandConstructor[];

  constructor(protected client: Client) {
    const commands = (this.constructor as typeof Module).commands;
    this.registerCommands(commands);
  }

  registerCommands(commands: CommandConstructor[]) {
    console.log("registering", commands);
    const factory = (ctor: CommandConstructor, client: Client, options: CommandConstructorOptions) => {
      return new ctor(client, this, options);
    };
    this.client.registerCommands(commands, factory);
  }
}

class TestModule extends Module {
  static commands = [TestCommand];
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
  else if (error === CommandError.RunError)
    msg = "an error occurred while running the command";

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
    permissionsGetter: () => Permission.Owner,
    intents: Intents.NON_PRIVILEGED
  };

  const client = new Client(clientOpts);
  const testModule = new TestModule(client);

  await client.login(token);
  console.log("client started");
}

start();
