import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  Message,
  Snowflake
} from 'discord.js';

import { Command, CommandConstructor, CommandFactory } from './command';
import { CommandError } from './errors';
import { Parser } from './parser';


interface ClientOptions extends DiscordClientOptions {
  errorHandler?: ErrorHandler;
  globalPrefix: string;
  permissionsGetter: PermissionsGetter;
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
  private readonly aliases: Map<string, Command> = new Map();
  private readonly guildPrefixes: Map<Snowflake, string> = new Map();
  private readonly parser: Parser;
  private _globalPrefix: string;
  private errorHandler?: ErrorHandler;
  private permissionsGetter: PermissionsGetter;

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
    const { args, command, commandLike, commandName } = await this.parser.parseMessage(message);

    if (!commandLike)
      return;

    if (!command) {
      this.error({ type: 'unknown-command', commandName }, message);
      return;
    }

    if (command.dummy) {
      this.error({ type: 'dummy-command', command }, message);
      return;
    }

    if (command.guildOnly && !message.guild) {
      this.error({ type: 'guild-only-command', command }, message);
      return;
    }

    const userPermissions = await this.permissionsGetter(message.author.id, message.guild?.id);
    if (userPermissions < command.permissions) {
      this.error({ type: 'missing-permissions', command, userPermissions }, message);
      return;
    }

    if (!args) {
      this.error({
        type: 'internal-error',
        error: new Error("Parsed arguments are null (this shouldn't happen)")
      }, message);
      return;
    }

    if (!args.success) {
      this.error({ type: 'invalid-arguments', error: args.error, command }, message);
      return;
    }

    try {
      await command.run(message, args.args);
    } catch (error) {
      this.error({ type: 'run-error', error }, message);
    }
  }

  private async error(error: CommandError, message: Message): Promise<void> {
    if (this.errorHandler) {
      try {
        await this.errorHandler(error, message);
      } catch (anotherError) {
        console.log("Error executing error handler:", error, anotherError);
      }
    }
  }

  getCommand(words: string[]): { command: Command, calledAs: string } | null {
    if (words.length === 0)
      return null;

    let command = this.aliases.get(words[0]);
    if (command)
      return { command, calledAs: words[0] };

    command = this.commands.get(words[0]);
    if (!command)
      return null;

    for (const word of words.slice(1)) {
      if (command?.subcommands?.has(word))
        command = command.subcommands.get(word) as Command;
      else
        break;
    }
    return { command, calledAs: command.name };
  }

  private registerAliases(command: Command) {
    if (command.alias) {
      if (this.commands.has(command.alias) || this.aliases.has(command.alias))
        throw new Error(`Duplicate command alias: ${command.alias}`);
      this.aliases.set(command.alias, command);
    }
    for (const subcommand of command.subcommands.values())
      this.registerAliases(subcommand);
  }

  registerCommands(commands: CommandConstructor[], factory?: CommandFactory): void {
    for (const ctor of commands) {
      const command = factory
        ? factory(ctor, this, { factory })
        : new ctor(this);
      if (this.commands.has(command.name) || this.aliases.has(command.name))
        throw new Error(`Duplicate command name: ${command.name}`);
      this.commands.set(command.name, command);

      this.registerAliases(command);
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
