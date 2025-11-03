import { Injectable } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { UserService } from '../users/user.service';
import { CodeService } from '../codes/code.service';

interface Session {
  step: 'lang' | 'select_lang' | 'name' | 'phone' | 'code';
  lang: 'tm' | 'ru';
  botMsg?: number;
  userMsg?: number;
}

@Injectable()
export class BotService {
  private bot: Telegraf;
  private sessions = new Map<number, Session>();
  private t = {
    tm: {
      welcome: `🏆 TMValesco

🌐 www.valescooil.com
📞 +99363883444

👋 Salam! Dili saýlaň:`,
      chooseLang: "🌍 Dili saýlaň:",
      enterName: "✍️ Adyňyzy giriziň:",
      enterPhone: "📱 Telefon belgiňizi iberiň:",
      shareContact: "📲 Kontakt paýlaşmak",
      validCode: `✅ Hormatly sarp ediji‼️
🎊 Siz VALESCO LUBRICANTS brendiniň asyl önümini satyn aldyňyz!
🛍 Has köp VALESCO LUBRICANTS önümlerini satyn alyň we 🎁 sowgatly aksiýada gatnaşyň‼️
ℹ️ Önüm hakda has giňişleýin maglumat almak üçin web sahypamyza giriň 👉 http://www.valescooil.com
🤝 Saýlanyňyz üçin sag boluň!`,
      invalidCode: `⚠️ Hormatly sarp ediji
❌ KOD NÄDOGRY! ❌
🚫 Önümiň galp bolmak ähtimallygy ýokary 🚫❓
🙏 Haýyş edýäris, bu ýagdaý barada 📞 +99363883444 belgisine habar beriň

🔄 Kody ýene bir gezek giriziň:`,
      invalidPhone: "❌ Telefon nädogry. Mysal: +99361234567",
      nameTooShort: "⚠️ At gaty gysga",
    },

    ru: {
      welcome: `🏆 TMValesco

🌐 www.valescooil.com
📞 +99363883444

👋 Здравствуйте! Выберите язык:`,
      chooseLang: "🌍 Выберите язык:",
      enterName: "✍️ Введите ваше имя:",
      enterPhone: "📱 Отправьте ваш номер телефона:",
      shareContact: "📲 Поделиться контактом",
      validCode: `✅ Уважаемый потребитель‼️
🎊 Вы приобрели оригинальный продукт бренда VALESCO LUBRICANTS!
🛍 Покупайте больше продуктов брэнда VALESCO LUBRICANTS и участвуйте в 🎁 призовой акции‼️
ℹ️ Для большей информации о продукции зайдите на наш сайт 👉 http://www.valescooil.com
🤝 Благодарим за выбор!`,
      invalidCode: `⚠️ Уважаемый потребитель
❌ КОД НЕ ЯВЛЯЕТСЯ ДЕЙСТВИТЕЛЬНЫМ! ❌
🚫 Высокая вероятность того, что продукт контрафактный 🚫❓
🙏 Пожалуйста, сообщите об этом случае по номеру 📞 +99363883444

🔄 Введите код еще раз:`,
      invalidPhone: "❌ Неверный номер телефона. Пример: +99361234567",
      nameTooShort: "⚠️ Имя слишком короткое",
    },
  };

  constructor(
    private userService: UserService,
    private codeService: CodeService,
  ) {
    this.bot = new Telegraf(process.env.BOT_TOKEN!);
    this.setup();
  }

  private async del(ctx: Context, chatId: number) {
    const s = this.sessions.get(chatId);
    if (s?.botMsg) {
      try { await ctx.telegram.deleteMessage(chatId, s.botMsg); } catch {}
    }
    if (s?.userMsg) {
      try { await ctx.telegram.deleteMessage(chatId, s.userMsg); } catch {}
    }
  }

  private async send(ctx: Context, chatId: number, text: string, extra = {}) {
    await this.del(ctx, chatId);
    const msg = await ctx.replyWithHTML(text, extra);
    let s = this.sessions.get(chatId);
    if (!s) {
      s = { step: 'lang', lang: 'tm' };
      this.sessions.set(chatId, s);
    }
    s.botMsg = msg.message_id;
    this.sessions.set(chatId, s);
    return msg;
  }

  // 🔹 Qo‘zg‘aluvchi emojili xabar yuboruvchi funksiya
  private async sendAnimatedText(ctx: Context, chatId: number, text: string) {
    const msg = await ctx.telegram.sendMessage(chatId, text, {
      entities: [
        { offset: 0, length: 2, type: 'custom_emoji', custom_emoji_id: '5201979228303668332' },
        { offset: 4, length: 2, type: 'custom_emoji', custom_emoji_id: '5206230361163445465' },
        { offset: 6, length: 2, type: 'custom_emoji', custom_emoji_id: '5208576512818689138' },
        { offset: 8, length: 2, type: 'custom_emoji', custom_emoji_id: '5206189266916357406' },
        { offset: 10, length: 2, type: 'custom_emoji', custom_emoji_id: '5206211454717409052' },
        { offset: 12, length: 2, type: 'custom_emoji', custom_emoji_id: '5206421092071126420' },
        { offset: 14, length: 2, type: 'custom_emoji', custom_emoji_id: '5206720219363424618' },
        { offset: 18, length: 2, type: 'custom_emoji', custom_emoji_id: '5462950031143216831' },
        { offset: 42, length: 2, type: 'custom_emoji', custom_emoji_id: '5440660757194744323' },
        { offset: 63, length: 1, type: 'custom_emoji', custom_emoji_id: '5427009714745517609' },
        { offset: 80, length: 2, type: 'custom_emoji', custom_emoji_id: '5201921903375169816' },
        { offset: 125, length: 2, type: 'custom_emoji', custom_emoji_id: '5436040291507247633' },
        { offset: 133, length: 2, type: 'custom_emoji', custom_emoji_id: '5440660757194744323' },
        { offset: 137, length: 2, type: 'custom_emoji', custom_emoji_id: '5406809207947142040' },
      ],
    });
    return msg;
  }

  private setup() {
    this.bot.start(async (ctx) => {
      const chatId = ctx.from!.id;
      this.sessions.delete(chatId);
      const user = await this.userService.findByChatId(chatId);

      if (user?.registered) {
        const lang = (user.language === 'tm' || user.language === 'ru') ? user.language : 'tm';
        this.sessions.set(chatId, { step: 'select_lang', lang });

        await this.send(ctx, chatId, this.t[lang].chooseLang, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Türkmençe", callback_data: 'lang_tm' },
                { text: "Русский", callback_data: 'lang_ru' }
              ]
            ]
          },
        });
      } else {
        this.sessions.set(chatId, { step: 'lang', lang: 'tm' });
        await ctx.replyWithHTML(this.t.tm.welcome, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Türkmençe", callback_data: 'lang_tm' },
                { text: "Русский", callback_data: 'lang_ru' }
              ]
            ]
          },
        });
      }
    });

    this.bot.action(/lang_(.+)/, async (ctx) => {
      const chatId = ctx.from!.id;
      const lang = ctx.match![1] as 'tm' | 'ru';
      const s = this.sessions.get(chatId);

      await ctx.answerCbQuery();

      if (s?.step === 'select_lang') {
        await this.userService.upsert({ chatId, language: lang });
        this.sessions.set(chatId, { ...s, step: 'code', lang });

        // 🔹 Animatsiyali enterCode xabar
        const animText =
          lang === 'tm'
            ? `😎  😎😎😎😎😎😎\n\n📣 Hormatly sarp ediji‼️\n😎 VALESCO LUBRICANTS\n✅ Brendiň asyl önümini satyn alyp, siz 🎉 sowgatly aksiýada gatnaşýarsyňyz‼️\n\n📲 STIKER KODYNY GIRIZIŇ`
            : `😎  😎😎😎😎😎😎\n\n📣 Уважаемый потребитель‼️\n😎 VALESCO LUBRICANTS\n✅ Купив оригинальный продукт бренда, Вы становитесь участником 🎉 призовой акции‼️\n\n📲 ВВЕДИТЕ КОД СО СТИКЕРА`;

        await this.sendAnimatedText(ctx, chatId, animText);
      } else {
        this.sessions.set(chatId, { ...s, step: 'name', lang });
        await this.send(ctx, chatId, this.t[lang].enterName);
      }
    });

    this.bot.on('text', async (ctx) => {
      const chatId = ctx.from!.id;
      const text = ctx.message?.text?.trim();
      if (!text) return;

      const s = this.sessions.get(chatId);
      if (!s) return;

      const lang = s.lang;
      const tr = this.t[lang];
      const session = { ...s, userMsg: ctx.message!.message_id };
      this.sessions.set(chatId, session);

      if (s.step === 'name') {
        if (text.length < 2) return ctx.reply(tr.nameTooShort);
        await this.userService.upsert({ chatId, name: text, language: lang });
        this.sessions.set(chatId, { ...session, step: 'phone' });
        await this.send(ctx, chatId, tr.enterPhone, {
          reply_markup: {
            keyboard: [[{ text: tr.shareContact, request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else if (s.step === 'phone') {
        const phone = text;
        const clean = phone.replace(/\D/g, '');
        if (clean.length !== 11 || !clean.startsWith('993')) {
          return ctx.reply(tr.invalidPhone);
        }
        const formatted = '+' + clean;
        await this.userService.upsert({ chatId, phone: formatted, registered: true });
        this.sessions.set(chatId, { ...session, step: 'code' });

        // 🔹 EnterCode bosqichida animatsiyali text
        const animText =
          lang === 'tm'
            ? `😎  😎😎😎😎😎😎\n\n📣 Hormatly sarp ediji‼️\n😎 VALESCO LUBRICANTS\n✅ Brendiň asyl önümini satyn alyp, siz 🎉 sowgatly aksiýada gatnaşýarsyňyz‼️\n\n📲 STIKER KODYNY GIRIZIŇ`
            : `😎  😎😎😎😎😎😎\n\n📣 Уважаемый потребитель‼️\n😎 VALESCO LUBRICANTS\n✅ Купив оригинальный продукт бренда, Вы становитесь участником 🎉 призовой акции‼️\n\n📲 ВВЕДИТЕ КОД СО СТИКЕРА`;

        await this.sendAnimatedText(ctx, chatId, animText);
      } else if (s.step === 'code') {
        const user = await this.userService.findByChatId(chatId);
        if (!user?.registered) return;

        const code = text.toUpperCase().trim();
        const valid = await this.codeService.isValid(code);

        if (valid && user) {
          await this.codeService.markUsed(code, user.id);
          await this.send(ctx, chatId, tr.validCode);
          console.log("DOGRY KOD:", { name: user.name, phone: user.phone, code });
        } else {
          await ctx.replyWithHTML(`<b>${tr.invalidCode}</b>`);
          console.log("NÄDOGRY KOD:", { chatId, code });
        }
      }
    });

    this.bot.on('contact', async (ctx) => {
      const chatId = ctx.from!.id;
      const s = this.sessions.get(chatId);
      if (s?.step === 'phone' && ctx.message?.contact) {
        let phone = ctx.message.contact.phone_number;
        const clean = phone.replace(/\D/g, '');
        if (clean.length !== 11 || !clean.startsWith('993')) {
          return ctx.reply(this.t[s.lang].invalidPhone);
        }
        phone = '+' + clean;
        await this.userService.upsert({ chatId, phone, registered: true });
        this.sessions.set(chatId, { ...s, step: 'code' });

        const animText =
          s.lang === 'tm'
            ? `😎  😎😎😎😎😎😎\n\n📣 Hormatly sarp ediji‼️\n😎 VALESCO LUBRICANTS\n✅ Brendiň asyl önümini satyn alyp, siz 🎉 sowgatly aksiýada gatnaşýarsyňyz‼️\n\n📲 STIKER KODYNY GIRIZIŇ`
            : `😎  😎😎😎😎😎😎\n\n📣 Уважаемый потребитель‼️\n😎 VALESCO LUBRICANTS\n✅ Купив оригинальный продукт бренда, Вы становитесь участником 🎉 призовой акции‼️\n\n📲 ВВЕДИТЕ КОД СО СТИКЕРА`;

        await this.sendAnimatedText(ctx, chatId, animText);
      }
    });

    this.bot.launch();
    console.log("Bot işe başlady");
  }
}
