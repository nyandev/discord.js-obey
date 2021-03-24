import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  Message,
  Snowflake
} from 'discord.js';

import { Command, CommandConstructor, CommandFactory } from './command';


interface ClientOptions extends DiscordClientOptions {
  errorHandler?: ErrorHandler;
  globalPrefix: string;
  permissionsGetter: PermissionsGetter;
}

export const enum CommandError {
  DummyCommand,
  GuildOnly,
  MissingPermissions,
  RunError,
  UnknownCommand
}

type ErrorHandler = (error: CommandError, message: Message) => void;

export const enum Permission {
  User,
  ServerAdmin,
  ServerOwner,
  Admin,
  Owner
}

type PermissionsGetter = (user: Snowflake, guild?: Snowflake) => Permission | Promise<Permission>;

export class Client extends DiscordClient {
  readonly commands: Map<string, Command> = new Map();
  private readonly guildPrefixes: Map<Snowflake, string> = new Map();
  private globalPrefix: string;
  private errorHandler?: ErrorHandler;
  private permissionsGetter: PermissionsGetter;

  constructor(options: ClientOptions) {
    super(options);

    this.globalPrefix = options.globalPrefix;
    this.errorHandler = options.errorHandler;
    this.permissionsGetter = options.permissionsGetter;

    this.on('message', message => {
      this.dispatch(message);
    });
  }

  private async dispatch(message: Message): Promise<void> {
    let prefix = this.globalPrefix;
    if (message.guild)
      prefix = this.guildPrefixes.get(message.guild.id) ?? prefix;

    if (!message.content.startsWith(prefix))
      return;

    const content = message.content.substring(prefix.length);
    const words = content.match(/\S+/gu) ?? [];

    const command = this.getCommand(words);

    if (!command) {
      this.error(CommandError.UnknownCommand, message);
      return;
    }

    if (command.dummy) {
      this.error(CommandError.DummyCommand, message);
      return;
    }

    if (command.guildOnly && !message.guild) {
      this.error(CommandError.GuildOnly, message);
      return;
    }

    const permissions = await this.permissionsGetter(message.author.id, message.guild?.id);
    if (permissions < command.permissions) {
      this.error(CommandError.MissingPermissions, message);
      return;
    }

    try {
      await command.run(message, {arguments: "parsing wip"});
    } catch ( error ) {
      this.error(CommandError.RunError, message);
    }
  }

  private error(error: CommandError, message: Message): void {
    if (this.errorHandler)
      this.errorHandler(error, message);
  }

  private getCommand(words: string[]): Command | null {
    if (words.length === 0)
      return null;

    let command = this.commands.get(words[0]);
    if (!command)
      return null;

    for (const word of words.slice(1)) {
      if (command?.subcommands?.has(word))
        command = command.subcommands.get(word);
      else
        break;
    }
    return command || null;
  }

  registerCommands(commands: CommandConstructor[], factory?: CommandFactory): void {
    for (const ctor of commands) {
      const command = factory
        ? factory(ctor, this, { factory })
        : new ctor(this);
      if (this.commands.has(command.name))
        throw new Error(`Duplicate command name: ${command.name}`);
      this.commands.set(command.name, command);
    }
  }

  setGuildPrefix(guild: Snowflake, prefix: string) {
    this.guildPrefixes.set(guild, prefix);
  }
}
