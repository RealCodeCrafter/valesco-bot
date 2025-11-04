import { Injectable } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { UserService } from '../users/user.service';
import { CodeService } from '../codes/code.service';

interface Session {
  step: 'lang' | 'name' | 'phone' | 'code';
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
      enterName: "✍️ Adyňyzy giriziň:",
      enterPhone: "📱 Telefon belgiňizi iberiň:",
      shareContact: "📲 Kontakt paýlaşmak",
      enterCode: `🎉 Hormatly sarp ediji‼️
✅ VALESCO LUBRICANTS brendiniň asyl önümini satyn alyp, siz 🎁 sowgatly aksiýada gatnaşýarsyňyz‼️
🔢 STIKER KODYNY GIRIZIŇ:`,
      validCode: `✅ Hormatly sarp ediji‼️
🎊 Siz VALESCO LUBRICANTS brendiniň asyl önümini satyn aldyňyz!
🛍 Has köp VALESCO LUBRICANTS önümlerini satyn alyň we 🎁 sowgatly aksiýada gatnaşýarsyňyz‼️
ℹ️ Önüm hakda giňişleýin maglumat almak üçin 👉 http://www.valescooil.com
🤝 Saýlanyňyz üçin sag boluň!`,
      invalidCode: `⚠️ Hormatly sarp ediji
❌ KOD NÄDOGRY! ❌
🚫 Önümiň galp bolmak ähtimallygy ýokary 🚫❓
🙏 Haýyş edýäris, bu ýagdaý barada 📞 +99363883444 belgisine habar beriň

🔄 Kody ýene bir gezek giriziň:`,
      invalidPhone: "❌ Telefon nädogry. Rakam giriziň",
      nameTooShort: "⚠️ At gaty gysga",
    },
    ru: {
      enterName: "✍️ Введите ваше имя:",
      enterPhone: "📱 Отправьте ваш номер телефона:",
      shareContact: "📲 Поделиться контактом",
      enterCode: `🎉 Уважаемый потребитель‼️
✅ Купив оригинальный продукт бренда VALESCO LUBRICANTS Вы становитесь участником 🎁 призовой акции‼️
🔢 ВВЕДИТЕ КОД СО СТИКЕРА:`,
      validCode: `✅ Уважаемый потребитель‼️
🎊 Вы приобрели оригинальный продукт бренда VALESCO LUBRICANTS!
🛍 Покупайте больше продуктов бренда VALESCO LUBRICANTS и участвуйте в 🎁 призовой акции‼️
ℹ️ Для большей информации о продукции зайдите 👉 http://www.valescooil.com
🤝 Благодарим за выбор!`,
      invalidCode: `⚠️ Уважаемый потребитель
❌ КОД НЕ ЯВЛЯЕТСЯ ДЕЙСТВИТЕЛЬНЫМ! ❌
🚫 Высокая вероятность того, что продукт контрафактный 🚫❓
🙏 Пожалуйста, сообщите об этом случае по номеру 📞 +99363883444

🔄 Введите код еще раз:`,
      invalidPhone: "❌ Неверный номер телефона. Введите только цифры",
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
    if (!s) s = { step: 'lang', lang: 'tm' };
    s.botMsg = msg.message_id;
    this.sessions.set(chatId, s);
    return msg;
  }

  private setup() {
    // /start komandasi
    this.bot.start(async (ctx) => {
      const chatId = ctx.from!.id;
      this.sessions.delete(chatId);

      this.sessions.set(chatId, { step: 'lang', lang: 'tm' });
      const text = `
🌍 <b>Dili saýlaň</b>
🌍 <b>Выберите язык</b>
`;

      await this.send(ctx, chatId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇹🇲 Türkmençe", callback_data: 'lang_tm' },
              { text: "🇷🇺 Русский", callback_data: 'lang_ru' }
            ]
          ]
        },
      });
    });

    this.bot.action(/lang_(.+)/, async (ctx) => {
      const chatId = ctx.from!.id;
      const lang = ctx.match![1] as 'tm' | 'ru';
      await ctx.answerCbQuery();
      const s = this.sessions.get(chatId) || { step: 'lang', lang };
      this.sessions.set(chatId, { ...s, step: 'name', lang });
      await this.send(ctx, chatId, this.t[lang].enterName);
    });

    // Text xabarlar
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
        const phone = text.replace(/\D/g, '');
        if (!/^\d+$/.test(phone) || phone.length < 5) return ctx.reply(tr.invalidPhone);
        const formatted = '+' + phone;
        await this.userService.upsert({ chatId, phone: formatted, registered: true });
        this.sessions.set(chatId, { ...session, step: 'code' });
        await this.send(ctx, chatId, tr.enterCode);
      } else if (s.step === 'code') {
        const user = await this.userService.findByChatId(chatId);
        if (!user?.registered) return;
        const code = text.toUpperCase().trim();
        const valid = await this.codeService.isValid(code);
        if (valid && user) {
          await this.codeService.markUsed(code, user.id);
          await ctx.replyWithHTML(tr.validCode);
          console.log("✅ TO‘G‘RI KOD:", { name: user.name, phone: user.phone, code });
        } else {
          await ctx.replyWithHTML(tr.invalidCode);
          console.log("❌ NOTO‘G‘RI KOD:", { chatId, code });
        }
      }
    });

    // Kontakt yuborilganda
    this.bot.on('contact', async (ctx) => {
      const chatId = ctx.from!.id;
      const s = this.sessions.get(chatId);
      if (s?.step === 'phone' && ctx.message?.contact) {
        let phone = ctx.message.contact.phone_number.replace(/\D/g, '');
        if (!/^\d+$/.test(phone) || phone.length < 5) {
          return ctx.reply(this.t[s.lang].invalidPhone);
        }
        phone = '+' + phone;
        await this.userService.upsert({ chatId, phone, registered: true });
        this.sessions.set(chatId, { ...s, step: 'code' });
        await this.send(ctx, chatId, this.t[s.lang].enterCode);
      }
    });

    this.bot.launch();
    console.log("🤖 Bot ishga tushdi");
  }
}
