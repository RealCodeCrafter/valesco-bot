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
      enterCode: `🎉 Hormatly sarp ediji‼️
✅ VALESCO LUBRICANTS brendiniň asyl önümini satyn alyp, siz 🎁 sowgatly aksiýada gatnaşýarsyňyz‼️
🔢 STIKER KODYNY GIRIZIŇ:`,
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
      enterCode: `🎉 Уважаемый потребитель‼️
✅ Купив оригинальный продукт бренда VALESCO LUBRICANTS Вы становитесь участником 🎁 призовой акции‼️
🔢 ВВЕДИТЕ КОД СО СТИКЕРА:`,
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

  private async send(ctx: Context, chatId: number, text: string, extra = {}) {
    const msg = await ctx.replyWithHTML(text, extra);
    let s = this.sessions.get(chatId);
    if (!s) s = { step: 'lang', lang: 'tm' };
    s.botMsg = msg.message_id;
    this.sessions.set(chatId, s);
    return msg;
  }

  private setup() {
    // 🔹 Start command
    this.bot.start(async (ctx) => {
      const chatId = ctx.from!.id;
      this.sessions.delete(chatId);

      await ctx.replyWithHTML(this.t.tm.welcome, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Türkmençe", callback_data: 'lang_tm' },
              { text: "Русский", callback_data: 'lang_ru' }
            ]
          ],
        },
      });
    });

    // 🔹 Til tanlash
    this.bot.action(/lang_(.+)/, async (ctx) => {
      const chatId = ctx.from!.id;
      const lang = ctx.match![1] as 'tm' | 'ru';
      await ctx.answerCbQuery();
      this.sessions.set(chatId, { step: 'code', lang });
      await this.send(ctx, chatId, this.t[lang].enterCode);
    });

    // 🔹 Kod kiritish va validatsiya
    this.bot.on('text', async (ctx) => {
      const chatId = ctx.from!.id;
      const text = ctx.message.text.trim();
      const s = this.sessions.get(chatId);
      const lang = s?.lang || 'tm';
      const tr = this.t[lang];

      console.log("📩 KELGAN XABAR:", {
        chatId,
        text,
        entities: ctx.message.entities,
      });

      const user = await this.userService.findByChatId(chatId);
      if (!user) return;

      const code = text.toUpperCase().trim();
      const valid = await this.codeService.isValid(code);

      if (valid) {
        await this.codeService.markUsed(code, user.id);
        await this.send(ctx, chatId, tr.validCode);
        console.log("✅ DOGRY KOD:", { chatId, code });
      } else {
        await ctx.replyWithHTML(`<b>${tr.invalidCode}</b>`);
        console.log("❌ NÄDOGRY KOD:", { chatId, code });
      }
    });

    // 🧩 HAR QANDAY XABARNI ESLASH VA LOGGA CHIQARISH
    this.bot.on('message', async (ctx) => {
      const msg = ctx.message as any;

      console.log("\n🧠 Yangi xabar keldi:");
      console.log(JSON.stringify(msg, null, 2));

      if (msg.sticker) {
        console.log("🎟 Sticker ID:", msg.sticker.file_id);
        console.log("Sticker emoji:", msg.sticker.emoji);
      }

      if (msg.entities) {
        msg.entities.forEach((ent) => {
          if (ent.type === 'custom_emoji') {
            console.log("✨ Custom emoji:", ent);
          }
        });
      }

      if (msg.text && /[\p{Emoji}]/u.test(msg.text)) {
        console.log("😎 Emoji mavjud:", msg.text);
      }
    });


    this.bot.launch();
    console.log("🤖 Bot ishga tushdi 🚀");
  }
}
