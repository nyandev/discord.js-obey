import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  Message,
  Snowflake
} from 'discord.js';

import { Command, CommandConstructor } from './command';


interface ClientOptions extends DiscordClientOptions {
  errorHandler?: ErrorHandler;
  globalPrefix: string;
  permissionsGetter: PermissionsGetter;
}

export const enum CommandError {
  GuildOnly,
  MissingPermissions,
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

    let command;
    for (const i of words.keys()) {
      const match = this.commands.get(words.slice(0, i + 1).join(' '));
      if (match)
        command = match;
      else
        break;
    }

    if (!command) {
      this.error(CommandError.UnknownCommand, message);
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

    command.run(message, {arguments: "parsing wip"});
  }

  private error(error: CommandError, message: Message): void {
    if (this.errorHandler)
      this.errorHandler(error, message);
  }

  registerCommands(commands: CommandConstructor[]): void {
    for (const commandConstructor of commands) {
      const command = new commandConstructor(this);
      if (this.commands.has(command.name))
        throw new Error(`Duplicate command name: ${command.name}`);
      this.commands.set(command.name, command);
    }
  }
}
