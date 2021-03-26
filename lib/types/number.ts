import { GuildChannel, Message, TextChannel } from 'discord.js';

import { ParsedArgument } from '../parser';


const regex = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export function parse(arg: string, key: string): ParsedArgument {
  if (!regex.test(arg))
    return invalid(arg, key);

  const value = Number(arg);
  if (Number.isNaN(value))
    return invalid(arg, key);

  return success(value);
}

function invalid(value: string, key: string) {
  return {
    success: false,
    error: {
      type: 'wrong-argument-type',
      key,
      value,
      expectedType: 'number'
    }
  } as const;
}

function success(value: number) {
  return { success: true, value } as const;
}
