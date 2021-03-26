import { Message } from 'discord.js';

import { Client } from './client';
import { ArgumentSpec, Arguments, Command } from './command';
import { parse as parseTextChannel } from './types/text-channel';

interface ArgumentParseError {
  success: false;
  error: string;
  data?: string[];
}

interface ArgumentParseSuccess {
  success: true;
  args: Arguments;
}

type ParsedArguments = ArgumentParseError | ArgumentParseSuccess;

interface ParsedMessage {
  args: ParsedArguments | null;
  command: Command | null;
  commandLike: boolean;
}

const typeParsers: Record<string, (arg: string, message: Message) => any> = {
  'string': (arg: string) => arg,
  'number': Number,
  'text-channel': parseTextChannel
};

export class Parser {
  constructor(private client: Client) { }

  async parseArgs(args: ArgumentSpec[], values: string[], message: Message): Promise<ParsedArguments> {
    if (args.length === 0)
      return (values.length === 0) ? { success: true, args: {} } : { success: false, error: 'extra-arguments' };

    const required = args.filter(arg => !arg.optional && !arg.catchAll);
    if (values.length < required.length) {
      const missing = required.slice(values.length).map(arg => arg.key);
      return { success: false, error: 'missing-arguments', data: missing };
    }

    const catchAll = args[args.length - 1].catchAll ? args[args.length - 1] : null;
    const catchAllList = [];
    const parsed: Arguments = {};

    for (const [i, value] of values.entries()) {
      const spec = args[i];
      let type;
      let addToCatchAll = false;

      if (!spec) {
        if (!catchAll)
          return { success: false, error: 'extra-arguments' };
        addToCatchAll = true;
        type = catchAll.type;
      } else {
        addToCatchAll = spec.catchAll ?? false;
        type = spec.type;
      }

      if (!typeParsers[type])
        return { success: false, error: 'unknown-type' };
      const parsedValue = await typeParsers[type](value, message);

      if (catchAll)
        catchAllList.push(parsedValue);
      else
        parsed[spec.key] = parsedValue;
    }
    if (catchAll)
      parsed[catchAll.key] = catchAllList;
    return { success: true, args: parsed };
  }

  async parseMessage(message: Message): Promise<ParsedMessage> {
    let prefix = this.client.globalPrefix;
    if (message.guild)
      prefix = this.client.getGuildPrefix(message.guild.id) ?? prefix;

    let args = null;
    let command = null;

    const commandLike = message.content.startsWith(prefix);
    if (commandLike) {
      const content = message.content.substring(prefix.length);
      const words = content.match(/\S+/gu) ?? [];
      command = this.client.getCommand(words);
      if (command) {
        const commandName = command.name.split(' ');
        args = await this.parseArgs(command.args, words.slice(commandName.length), message);

      }
    }
    return { args, command, commandLike };
  }
}
