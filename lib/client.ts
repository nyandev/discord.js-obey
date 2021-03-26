import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  Message,
  Snowflake
} from 'discord.js';

import { Command, CommandConstructor, CommandFactory } from './command';
import { Parser } from './parser';


interface ClientOptions extends DiscordClientOptions {
  errorHandler?: ErrorHandler;
  globalPrefix: string;
  permissionsGetter: PermissionsGetter;
}

export const enum CommandError {
  DummyCommand,
  GuildOnly,
  InvalidArguments,
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
  private readonly commands: Map<string, Command> = new Map();
  private readonly guildPrefixes: Map<Snowflake, string> = new Map();
  private _globalPrefix: string;
  private errorHandler?: ErrorHandler;
  private permissionsGetter: PermissionsGetter;
  private parser: Parser;

  constructor(options: ClientOptions) {
    super(options);

    this._globalPrefix = options.globalPrefix;
    this.errorHandler = options.errorHandler;
    this.permissionsGetter = options.permissionsGetter;
    this.parser = new Parser(this);

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

    const { args, command, commandLike } = await this.parser.parseMessage(message);

    if (!commandLike)
      return;

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

    if (!args || !args.success) {
      this.error(CommandError.InvalidArguments, message);
      return;
    }

    try {
      await command.run(message, args.args);
    } catch ( error ) {
      this.error(CommandError.RunError, message);
    }
  }

  private error(error: CommandError, message: Message): void {
    if (this.errorHandler)
      this.errorHandler(error, message);
  }

  getCommand(words: string[]): Command | null {
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

  get globalPrefix(): string {
    return this._globalPrefix;
  }

  set globalPrefix(prefix: string) {
    this._globalPrefix = prefix;
  }

  getGuildPrefix(guild: Snowflake): string | null {
    return this.guildPrefixes.get(guild) ?? null;
  }

  setGuildPrefix(guild: Snowflake, prefix: string): void {
    this.guildPrefixes.set(guild, prefix);
  }
}
