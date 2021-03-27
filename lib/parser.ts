import { Message, TextChannel } from 'discord.js';

import { Client } from './client';
import { ArgumentSpec, Command } from './command';
import { ArgumentError } from './errors';
import { parse as parseNumber } from './types/number';
import { parse as parseTextChannel } from './types/text-channel';


interface ParsedArgumentsError {
  success: false;
  error: ArgumentError;
}
interface ParsedArgumentsSuccess {
  success: true;
  args: Arguments;
}
type ParsedArguments = ParsedArgumentsError | ParsedArgumentsSuccess;

type ArgumentType = string | number | TextChannel;
export type ParsedArgument = ParsedArgumentsError | { success: true; value: ArgumentType; };
export type Arguments = Record<string, ArgumentType | ArgumentType[]>;

interface ParsedMessage {
  args: ParsedArguments | null;
  command: Command | null;
  commandLike: boolean;
  commandName: string | null;
  prefix: string;
}

type ArgumentParser = (arg: string, key: string, message: Message) => ParsedArgument | Promise<ParsedArgument>;

const typeParsers: Record<string, ArgumentParser> = {
  'string': (arg: string) => ({ success: true, value: arg }),
  'number': parseNumber,
  'text-channel': parseTextChannel
};

export class Parser {
  constructor(private client: Client) { }

  async parseArgs(specs: ArgumentSpec[], values: string[], message: Message): Promise<ParsedArguments> {
    if (specs.length === 0)
      return (values.length === 0)
        ? { success: true, args: {} }
        : { success: false, error: { type: 'extra-arguments', maxArgs: 0 } };

    const required = specs.filter(spec => !spec.optional && !spec.catchAll);
    if (values.length < required.length) {
      const missing = required.slice(values.length).map(spec => spec.key);
      return { success: false, error: { type: 'missing-arguments', keys: missing } };
    }

    const catchAll = specs[specs.length - 1].catchAll ? specs[specs.length - 1] : null;
    const catchAllList = [];
    const args: Arguments = {};

    for (const [i, value] of values.entries()) {
      const spec = specs[i];
      let type;
      let addToCatchAll = false;

      if (!spec) {
        if (!catchAll)
          return { success: false, error: { type: 'extra-arguments', maxArgs: specs.length } };
        addToCatchAll = true;
        type = catchAll.type;
      } else {
        addToCatchAll = spec.catchAll ?? false;
        type = spec.type;
      }

      /*if (!typeParsers[type])
        return { success: false, error: ArgumentError.UnknownType };*/
      const parsed = await typeParsers[type](value, (catchAll && addToCatchAll) ? catchAll.key : spec.key, message);
      if (!parsed.success)
        return { success: false, error: parsed.error };

      if (addToCatchAll)
        catchAllList.push(parsed.value);
      else
        args[spec.key] = parsed.value;
    }
    if (catchAll)
      args[catchAll.key] = catchAllList;
    return { success: true, args };
  }

  async parseMessage(message: Message): Promise<ParsedMessage> {
    let prefix = this.client.globalPrefix;
    if (message.guild)
      prefix = this.client.getGuildPrefix(message.guild.id) ?? prefix;

    let args = null;
    let command = null;
    let commandName = null;

    const commandLike = message.content.startsWith(prefix);
    if (commandLike) {
      const content = message.content.substring(prefix.length);
      const words = content.match(/\S+/gu) ?? [];
      const commandInfo = this.client.getCommand(words);
      if (commandInfo) {
        command = commandInfo.command;
        commandName = commandInfo.calledAs;
        args = await this.parseArgs(command.args, words.slice(commandName.split(' ').length), message);
      } else {
        commandName = words[0] ?? null;
      }
    }

    return { args, command, commandLike, commandName, prefix };
  }
}
