import { Message, TextChannel } from 'discord.js';


export async function parse(arg: string, message: Message): Promise<TextChannel | string | null> {
  if (!arg || !message.guild)
    return null;

  return null;
}
