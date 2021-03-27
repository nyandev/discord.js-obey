import { Channel, GuildChannel, Intents, Message, TextChannel } from 'discord.js';

import { Arguments, Client, Command, CommandConstructor, CommandConstructorOptions, CommandError, CommandOptions, Permission } from '../lib';


abstract class NyaCommand extends Command {
  constructor(client: Client, protected module: Module, options?: CommandConstructorOptions) {
    super(client, options);
  }
}

class TestTestCommand extends NyaCommand {
  static options = {
    name: 'sub',
    alias: 'sub'
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
    group: 'test test',
    permissions: Permission.Owner,
    subcommands: [
      TestTestCommand
    ],
    args: [
      { key: 'channel', type: 'text-channel' }
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

class HelpCommand extends NyaCommand {
  static options = {
    name: 'help',
    description: 'send help',
    args: [
      { key: 'command', type: 'string', catchAll: true }
    ]
  };

  async run(message: Message, args: Arguments) {
    const prefix = this.client.getPrefix(message);
    let msg = '';

    const commandName = args.command as string[];
    if (commandName.length > 0) {
      const commandInfo = this.client.getCommand(commandName, true);
      if (!commandInfo) {
        message.channel.send(`Command ${prefix}${commandName.join(' ')} not found`);
        return;
      }
      const command = commandInfo.command;
      msg = `**${prefix}${command.fullName}**`;
      if (command.argHelp)
        msg += ` \`${command.argHelp}\``;
      if (command.description)
        msg += `\n${command.description}`;
      if (command.alias)
        msg += `\nAlias: ${prefix}${command.alias}`;
      if (command.subcommands.size > 0)
        msg += `\nSubcommands: ${[...command.subcommands.keys()].join(', ')}`;
      if (command.group)
        msg += `\nGroup: ${command.group}`;
    } else {
      const commands = this.client.getCommands();
      const groups: Map<string | undefined, Command[]> = new Map();
      for (const command of commands.values()) {
        const list = groups.get(command.group);
        if (list)
          list.push(command);
        else
          groups.set(command.group, [command]);
      }
      for (const [group, commands] of groups) {
        msg += `__**${group || 'No group'}**__\n`;
        for (const command of commands) {
          msg += `**${prefix}${command.fullName}**`;
          if (command.description)
            msg += `: ${command.description}`;
          msg += '\n';
        }
        msg += '\n';
      }
    }
    message.channel.send(msg);
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
  static commands = [HelpCommand, TestCommand];
}

async function errorHandler(error: CommandError, message: Message) {
  let msg;
  if (error.type === 'unknown-command')
    message.reply("unknown command");
    //msg = "unknown command";
  else if (error.type === 'missing-permissions')
    msg = "missing permissions";
  else if (error.type === 'guild-only-command')
    msg = "not in guild";
  else if (error.type === 'dummy-command')
    msg = "this command is dum";
  else if (error.type === 'run-error')
    msg = "an error occurred while running the command";
  else if (error.type === 'invalid-arguments')
    msg = "invalid arguments";
  else
    msg = error.type;

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
