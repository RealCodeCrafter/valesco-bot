import { Injectable } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { UserService } from '../users/user.service';
import { CodeService } from '../codes/code.service';

interface Session {
  step: 'lang' | 'select_lang' | 'name' | 'surname' | 'phone' | 'code';
  lang: 'uz' | 'ru';
  botMsg?: number;
  userMsg?: number;
}

@Injectable()
export class BotService {
  private bot: Telegraf;
  private sessions = new Map<number, Session>();

 private t = {
  uz: {
    welcome: `🔥 *Valesco Lubricants* ga xush kelibsiz! 🔥

🌍 Rasmiy saytlarimiz:
🔗 [www.valescooil.com](http://www.valescooil.com)
🔗 [www.exzap.uz](http://www.exzap.uz)

📞 Qo‘llab-quvvatlash markazi: \`1175\`

💬 Assalomu alaykum!
Iltimos, quyidagi tillardan birini tanlang 👇`,
    chooseLang: "Tilni tanlang:",
    enterName: "Ismingizni kiriting:",
    enterSurname: "Familiyangizni kiriting:",
    enterPhone: "Telefon raqamingizni yuboring:",
    shareContact: "Kontaktni yuborish",
    enterCode: `📣Hurmatli iste'molchi‼️
😎VALESCO brendining asl✅ mahsulotini sotib olib, siz sovg'ali🎉 aksiyada ishtirok etasiz‼️
📲STIKER KODINI KIRITING:`,
    validCode: `📣Hurmatli iste'molchi‼️
Siz 😎VALESCO brendining asl mahsulotini sotib oldingiz!
🛍Ko'proq 😎VALESCO mahsulotlarini sotib oling va 😎VALESCO LUBRICANTS dan 🎁sovg'ali aksiyada qatnashing‼️
✅ Mahsulot haqida ko'proq ma'lumot olish uchun bizning saytimizga kiring ⬅️http://www.valescooil.com
🤝Tanlaganingiz uchun rahmat!`,
    invalidCode: `📣Hurmatli iste'molchi⚠️
👎KOD YAROQSIZ!👎
🛑Mahsulot soxta bo'lishi ehtimoli yuqori.🛑❓❓❓
🙏Iltimos, 🔔bu holat haqida 📞1175 raqamiga xabar bering

Yana bir bor kodni kiriting:`,
    invalidPhone: "Telefon noto'g'ri. Masalan: +998901234567",
    nameTooShort: "Ism juda qisqa",
    surnameTooShort: "Familiya juda qisqa",
  },
  ru: {
    welcome: `🔥 *Valesco Lubricants* — добро пожаловать! 🔥

🌍 Наши официальные сайты:
🔗 [www.valescooil.com](http://www.valescooil.com)
🔗 [www.exzap.uz](http://www.exzap.uz)

📞 Служба поддержки: \`1175\`

💬 Здравствуйте!
Пожалуйста, выберите один из языков ниже 👇`,
    chooseLang: "Выберите язык:",
    enterName: "Введите ваше имя:",
    enterSurname: "Введите вашу фамилию:",
    enterCode: `📣Уважаемый потребитель‼️
Купив оригинальный✅ продукт бренда 😎VALESCO Вы становитесь участником призовой🎉 акции‼️
📲ВВЕДИТЕ КОД СО СТИКЕРА:`,
    validCode: `📣Уважаемый потребитель‼️
Вы приобрели оригинальный продукт бренда 😎VALESCO!
🛍Покупайте больше продуктов брэнда 😎VALESCO и участвуйте в 🎁призовой акции от 😎VALESCO LUBRICANTS‼️
✅ Для большей информации о продукции зайдите на наш сайт ⬅️http://www.valescooil.com
🤝Благодарим за выбор!`,
    invalidCode: `📣Уважаемый потребитель⚠️
👎КОД НЕ ЯВЛЯЕТСЯ ДЕЙСТВИТЕЛЬНЫМ!👎
🛑Высокая вероятность того, что продукт контрафактный.🛑❓❓❓
🙏Пожалуйста, 🔔сообщите об этом случае по номеру 📞1175

Введите код еще раз:`,
    invalidPhone: "Неверный номер телефона. Пример: +998901234567",
    nameTooShort: "Имя слишком короткое",
    surnameTooShort: "Фамилия слишком короткая",
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
      s = { step: 'lang', lang: 'uz' };
      this.sessions.set(chatId, s);
    }
    s.botMsg = msg.message_id;
    this.sessions.set(chatId, s);
    return msg;
  }

  private setup() {
    this.bot.start(async (ctx) => {
      const chatId = ctx.from!.id;
      this.sessions.delete(chatId);
      const user = await this.userService.findByChatId(chatId);

      if (user?.registered) {
        this.sessions.set(chatId, { step: 'select_lang', lang: user.language as 'uz' | 'ru' });
        await this.send(ctx, chatId, this.t[user.language as 'uz' | 'ru'].chooseLang, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "O'zbekcha", callback_data: 'lang_uz' },
                { text: "Русский", callback_data: 'lang_ru' }
              ]
            ]
          },
        });
      } else {
        this.sessions.set(chatId, { step: 'lang', lang: 'uz' });
        await ctx.replyWithHTML(this.t.uz.welcome, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "O'zbekcha", callback_data: 'lang_uz' },
                { text: "Русский", callback_data: 'lang_ru' }
              ]
            ]
          },
        });
      }
    });

    this.bot.action(/lang_(.+)/, async (ctx) => {
      const chatId = ctx.from!.id;
      const lang = ctx.match![1] as 'uz' | 'ru';
      const s = this.sessions.get(chatId);

      await ctx.answerCbQuery();

      if (s?.step === 'select_lang') {
        await this.userService.upsert({ chatId, language: lang });
        this.sessions.set(chatId, { ...s, step: 'code', lang });
        await this.send(ctx, chatId, this.t[lang].enterCode);
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
        this.sessions.set(chatId, { ...session, step: 'surname' });
        await this.send(ctx, chatId, tr.enterSurname);
      } else if (s.step === 'surname') {
        if (text.length < 2) return ctx.reply(tr.surnameTooShort);
        await this.userService.upsert({ chatId, surname: text });
        this.sessions.set(chatId, { ...session, step: 'phone' });
        await this.send(ctx, chatId, this.t.uz.enterPhone, {
          reply_markup: {
            keyboard: [[{ text: this.t.uz.shareContact, request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else if (s.step === 'phone') {
        const phone = text;
        const clean = phone.replace(/\D/g, '');
        if (clean.length !== 12 || !clean.startsWith('998')) {
          return ctx.reply(tr.invalidPhone);
        }
        const formatted = '+' + clean;
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
          await this.send(ctx, chatId, tr.validCode);
          console.log("TO'G'RI KOD:", { name: user.name, phone: user.phone, code });
        } else {
          await ctx.replyWithHTML(`<b>${tr.invalidCode}</b>`);
          console.log("XATO KOD:", { chatId, code });
        }
      }
    });

    this.bot.on('contact', async (ctx) => {
      const chatId = ctx.from!.id;
      const s = this.sessions.get(chatId);
      if (s?.step === 'phone' && ctx.message?.contact) {
        let phone = ctx.message.contact.phone_number;
        const clean = phone.replace(/\D/g, '');
        if (clean.length !== 12 || !clean.startsWith('998')) {
          return ctx.reply(this.t[s.lang].invalidPhone);
        }
        phone = '+' + clean;
        await this.userService.upsert({ chatId, phone, registered: true });
        this.sessions.set(chatId, { ...s, step: 'code' });
        await this.send(ctx, chatId, this.t[s.lang].enterCode);
      }
    });

    this.bot.launch();
    console.log("Bot ishga tushdi");
  }
}