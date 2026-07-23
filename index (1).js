const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const Database = require("better-sqlite3");
const TelegramBot = require("node-telegram-bot-api");

// ================= BOT CONFIG =================
const BOT_TOKEN = "8847834994:AAHXr8wLivDcr2UcVWbOszbRpebPqp-dbwI";
const CHAT_IDS = ["-1003991110285"];
const CHECK_INTERVAL = 3000;
const ADMIN_IDS = [1574411746];
const OWNER_ID = 1574411746;

// ================= BOT INIT =================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================= DATABASE INIT =================
const DB_PATH = path.join(__dirname, "gacha_bot.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    country_code TEXT,
    assigned_number TEXT,
    is_banned INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS combos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code TEXT UNIQUE,
    custom_name TEXT,
    numbers TEXT
  );
  CREATE TABLE IF NOT EXISTS otp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT,
    otp TEXT,
    cli TEXT,
    dt TEXT,
    sent_to_user INTEGER DEFAULT 0,
    sent_to_group INTEGER DEFAULT 0,
    timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const insertSetting = db.prepare("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)");
insertSetting.run("force_sub", "on");
insertSetting.run("channel_1", "https://t.me/maxgunsotp");
insertSetting.run("channel_1_id", "@maxgunsotp");
insertSetting.run("channel_2", "https://t.me/Mypwni");
insertSetting.run("channel_2_id", "@maxgunsotp");
insertSetting.run("owner_1", "https://t.me/pwkuni");

// ================= WEB PANEL CONFIG =================
const WEB_PANELS = [
  {
    name: "LAMIX SMS",
    baseUrl: "http://51.210.208.26/ints",
    loginUrl: "http://51.210.208.26/ints/login",
    signinUrl: "http://51.210.208.26/ints/signin",
    smsApiUrl: "http://51.210.208.26/ints/client/res/data_smscdr.php",
    username: "dindaaa",
    password: "dindaaa"
  },
];

// ================= FILE DATABASE (legacy OTP dedup) =================
const SENT_FILE = path.join(__dirname, "sent_otp_prtn.json");

// ================= COUNTRY PREFIXES =================
const COUNTRY_PREFIXES = {
  "1": ["🇺🇸#US"], "7": ["🇷🇺#RU"], "20": ["🇪🇬#EG"], "27": ["🇿🇦#ZA"],
  "30": ["🇬🇷#GR"], "31": ["🇳🇱#NL"], "32": ["🇧🇪#BE"], "33": ["🇫🇷#FR"],
  "34": ["🇪🇸#ES"], "36": ["🇭🇺#HU"], "39": ["🇮🇹#IT"], "40": ["🇷🇴#RO"],
  "41": ["🇨🇭#CH"], "43": ["🇦🇹#AT"], "44": ["🇬🇧#UK"], "45": ["🇩🇰#DK"],
  "46": ["🇸🇪#SE"], "47": ["🇳🇴#NO"], "48": ["🇵🇱#PL"], "49": ["🇩🇪#DE"],
  "51": ["🇵🇪#PE"], "52": ["🇲🇽#MX"], "53": ["🇨🇺#CU"], "54": ["🇦🇷#AR"],
  "55": ["🇧🇷#BR"], "56": ["🇨🇱#CL"], "57": ["🇨🇴#CO"], "58": ["🇻🇪#VE"],
  "60": ["🇲🇾#MY"], "61": ["🇦🇺#AU"], "62": ["🇮🇩#ID"], "63": ["🇵🇭#PH"],
  "64": ["🇳🇿#NZ"], "65": ["🇸🇬#SG"], "66": ["🇹🇭#TH"],
  "81": ["🇯🇵#JP"], "82": ["🇰🇷#KR"], "84": ["🇻🇳#VN"], "86": ["🇨🇳#CN"],
  "90": ["🇹🇷#TR"], "91": ["🇮🇳#IN"], "92": ["🇵🇰#PK"], "93": ["🇦🇫#AF"],
  "94": ["🇱🇰#LK"], "95": ["🇲🇲#MM"], "98": ["🇮🇷#IR"],
  "212": ["🇲🇦#MA"], "213": ["🇩🇿#DZ"], "216": ["🇹🇳#TN"], "218": ["🇱🇾#LY"],
  "234": ["🇳🇬#NG"], "254": ["🇰🇪#KE"], "255": ["🇹🇿#TZ"], "256": ["🇺🇬#UG"],
  "880": ["🇧🇩#BD"], "886": ["🇹🇼#TW"], "960": ["🇲🇻#MV"],
  "961": ["🇱🇧#LB"], "962": ["🇯🇴#JO"], "963": ["🇸🇾#SY"], "964": ["🇮🇶#IQ"],
  "965": ["🇰🇼#KW"], "966": ["🇸🇦#SA"], "967": ["🇾🇪#YE"], "968": ["🇴🇲#OM"],
  "971": ["🇦🇪#AE"], "972": ["🇮🇱#IL"], "973": ["🇧🇭#BH"], "974": ["🇶🇦#QA"],
  "975": ["🇧🇹#BT"], "976": ["🇲🇳#MN"], "977": ["🇳🇵#NP"],
  "992": ["🇹🇯#TJ"], "993": ["🇹🇲#TM"], "994": ["🇦🇿#AZ"], "995": ["🇬🇪#GE"],
  "996": ["🇰🇬#KG"], "998": ["🇺🇿#UZ"],
  "850": ["🇰🇵#KP"], "852": ["🇭🇰#HK"], "853": ["🇲🇴#MO"],
  "855": ["🇰🇭#KH"], "856": ["🇱🇦#LA"], "670": ["🇹🇱#TL"],
  "673": ["🇧🇳#BN"], "380": ["🇺🇦#UA"], "258": ["🇿🇼#MZ"], "375": ["🇧🇾#BY"],
};

const CLI_MAP = {
  WHATSAPP: "#WS", TELEGRAM: "#TG", FACEBOOK: "#FB", INSTAGRAM: "#IG",
  TIKTOK: "#TT", VIBER: "#VB", WECHAT: "#WT", LINE: "#LINE",
  SIGNAL: "#SG", SNAPCHAT: "#SC", MESSENGER: "#MS", IMO: "#IMO"
};

// ================= HELPERS =================
function log(msg) {
  const t = new Date().toLocaleTimeString("id-ID", { hour12: false });
  console.log(`[${t}] ${msg}`);
}

function maskNumber(number) {
  if (!number) return "XXXX";
  const str = String(number).replace(/\D/g, "");
  if (str.length > 6) return str.slice(0, 3) + "xxx" + str.slice(-4);
  return str;
}

function extractOTP(msg) {
  if (!msg) return "CODE";
  const m = msg.match(/\b(\d{4,8})\b/);
  if (m) return m[1];
  const m2 = msg.match(/\b(\d{3}-\d{3})\b/);
  if (m2) return m2[1].replace("-", "");
  return "MSG";
}

function identifyCountry(number) {
  if (!number) return "🌍";
  const clean = number.replace(/\D/g, "");
  for (let len of [3, 2, 1]) {
    const p = clean.substring(0, len);
    if (COUNTRY_PREFIXES[p]) return COUNTRY_PREFIXES[p];
  }
  return "🌍";
}

function getFlag(countryCode) {
  const entry = COUNTRY_PREFIXES[countryCode];
  if (!entry) return "🌍";
  return entry[0].split("#")[0] || "🌍";
}

// normalizeNumber: strip non-digit + strip leading zero
function normalizeNumber(raw) {
  if (!raw) return "";
  let n = String(raw).replace(/\D/g, "");
  n = n.replace(/^0+/, "");
  return n;
}

// ================= SENT STORAGE =================
let lastSent = new Set();

function loadSent() {
  if (!fs.existsSync(SENT_FILE)) fs.writeFileSync(SENT_FILE, "[]");
  try {
    const data = JSON.parse(fs.readFileSync(SENT_FILE));
    lastSent = new Set(data);
    log(`📂 Database termuat: ${lastSent.size} history.`);
  } catch (e) {
    log(`⚠️ Gagal load database: ${e}`);
  }
}

function saveSent() {
  try {
    const arr = [...lastSent];
    if (arr.length > 5000) arr.splice(0, arr.length - 5000);
    fs.writeFileSync(SENT_FILE, JSON.stringify(arr, null, 2));
  } catch (e) {
    log(`⚠️ Gagal simpan database: ${e}`);
  }
}

// ================= DB HELPERS =================
function isAdmin(userId) {
  return ADMIN_IDS.includes(userId) || userId === OWNER_ID;
}

function isBanned(userId) {
  const row = db.prepare("SELECT is_banned FROM users WHERE user_id=?").get(userId);
  return row && row.is_banned === 1;
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM bot_settings WHERE key=?").get(key);
  return row ? row.value : "";
}

function setSetting(key, value) {
  db.prepare("REPLACE INTO bot_settings (key, value) VALUES (?, ?)").run(key, value);
}

function getUser(userId) {
  return db.prepare("SELECT * FROM users WHERE user_id=?").get(userId);
}

function saveUser(userId, data = {}) {
  const existing = getUser(userId);
  db.prepare(`
    INSERT OR REPLACE INTO users (user_id, username, first_name, last_name, country_code, assigned_number, is_banned)
    VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT is_banned FROM users WHERE user_id=?), 0))
  `).run(
    userId,
    data.username || (existing && existing.username) || "",
    data.first_name || (existing && existing.first_name) || "",
    data.last_name || (existing && existing.last_name) || "",
    data.country_code !== undefined ? data.country_code : (existing && existing.country_code),
    data.assigned_number !== undefined ? data.assigned_number : (existing && existing.assigned_number),
    userId
  );
}

function getAllCombos() {
  return db.prepare("SELECT country_code, custom_name FROM combos").all();
}

function getCombo(countryCode) {
  const row = db.prepare("SELECT numbers, custom_name FROM combos WHERE country_code=?").get(countryCode);
  if (!row) return { numbers: [], name: countryCode };
  return { numbers: JSON.parse(row.numbers || "[]"), name: row.custom_name || countryCode };
}

function saveCombo(countryCode, numbers, customName) {
  db.prepare("INSERT OR REPLACE INTO combos (country_code, custom_name, numbers) VALUES (?, ?, ?)")
    .run(countryCode, customName || countryCode, JSON.stringify(numbers));
}

function deleteCombo(countryCode) {
  db.prepare("DELETE FROM combos WHERE country_code=?").run(countryCode);
}

function getAvailableNumbers(countryCode) {
  const { numbers } = getCombo(countryCode);
  const usedRows = db.prepare("SELECT assigned_number FROM users WHERE assigned_number IS NOT NULL AND assigned_number != ''").all();
  const used = new Set(usedRows.map(r => r.assigned_number));
  return numbers.filter(n => !used.has(n));
}

function assignNumber(userId, number) {
  db.prepare("UPDATE users SET assigned_number=? WHERE user_id=?").run(number, userId);
}

function releaseNumber(oldNumber) {
  if (!oldNumber) return;
  db.prepare("UPDATE users SET assigned_number=NULL WHERE assigned_number=?").run(oldNumber);
}

// getUserByNumber pakai normalizeNumber buat match konsisten
function getUserByNumber(number) {
  const normalized = normalizeNumber(number);
  if (!normalized) return null;
  let row = db.prepare("SELECT user_id FROM users WHERE assigned_number=?").get(normalized);
  if (row) return row.user_id;
  const allAssigned = db.prepare("SELECT user_id, assigned_number FROM users WHERE assigned_number IS NOT NULL AND assigned_number != ''").all();
  for (const r of allAssigned) {
    if (normalizeNumber(r.assigned_number) === normalized) return r.user_id;
  }
  return null;
}

function isForceSubEnabled() {
  return getSetting("force_sub") !== "off";
}

// ================= FORCE SUB =================
async function checkUserMembership(userId) {
  if (!isForceSubEnabled()) return true;
  const ch1Id = getSetting("channel_1_id");
  const ch2Id = getSetting("channel_2_id");
  const channels = [ch1Id, ch2Id].filter(c => c && c.trim() !== "");
  if (!channels.length) return true;
  for (const channelId of channels) {
    try {
      const member = await bot.getChatMember(channelId, userId);
      if (["left", "kicked", "restricted"].includes(member.status)) return false;
    } catch (e) {
      log(`⚠️ Gagal cek member ${channelId}: ${e.message}`);
    }
  }
  return true;
}

function buildForcSubMessage() {
  const ch1Url = getSetting("channel_1");
  const ch2Url = getSetting("channel_2");
  const ch1Id = getSetting("channel_1_id");
  const ch2Id = getSetting("channel_2_id");
  const keyboard = [];
  if (ch1Url && ch1Id) keyboard.push([{ text: `📢 Join Channel 1 (${ch1Id})`, url: ch1Url }]);
  if (ch2Url && ch2Id) keyboard.push([{ text: `📢 Join Channel 2 (${ch2Id})`, url: ch2Url }]);
  keyboard.push([{ text: "✅ Udah Join, Cek Lagi", callback_data: "check_sub" }]);
  return {
    text: `🔒 *Akses Ditolak!*\n\nLo harus join channel dulu sebelum bisa pakai bot ini.\n\nJoin semua channel di bawah, lalu klik cek:`,
    keyboard: { inline_keyboard: keyboard }
  };
}

// ================= MENU BUILDERS =================
function buildCountryMenu(userId) {
  const combos = getAllCombos();
  const keyboard = combos.map(c => [{
    text: `${getFlag(c.country_code)} ${c.custom_name || c.country_code}`,
    callback_data: `country_${c.country_code}`
  }]);
  if (isAdmin(userId)) {
    keyboard.push([{ text: "🔐 Panel Admin", callback_data: "admin_panel" }]);
  }
  return { inline_keyboard: keyboard };
}

function buildAdminMenu() {
  const forceSubStatus = isForceSubEnabled() ? "✅ ON" : "❌ OFF";
  return {
    inline_keyboard: [
      [{ text: "📥 Tambah Combo (Teks)", callback_data: "admin_add_combo" }, { text: "📄 Upload .txt", callback_data: "admin_add_combo_txt" }],
      [{ text: "🗑️ Hapus Combo", callback_data: "admin_del_combo" }, { text: "📊 Statistik", callback_data: "admin_stats" }],
      [{ text: "👥 List User", callback_data: "admin_list_users" }, { text: "📢 Broadcast", callback_data: "admin_broadcast" }],
      [{ text: "🚫 Ban User", callback_data: "admin_ban" }, { text: "✅ Unban User", callback_data: "admin_unban" }],
      [{ text: `🔒 Force Sub: ${forceSubStatus}`, callback_data: "toggle_force_sub" }],
      [{ text: "📌 Set Channel 1", callback_data: "admin_set_ch1" }, { text: "📌 Set Channel 2", callback_data: "admin_set_ch2" }],
      [{ text: "🔙 Tutup Panel", callback_data: "close_admin" }],
    ]
  };
}

// ================= USER STATES =================
const userStates = {};

// ================= /start HANDLER =================
bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (isBanned(userId)) {
    bot.sendMessage(chatId, "🚫 Lo dibanned dari bot ini.");
    return;
  }

  if (!getUser(userId)) {
    for (const adminId of ADMIN_IDS) {
      bot.sendMessage(adminId,
        `🆕 User baru masuk:\n🆔 \`${userId}\`\n👤 @${msg.from.username || "none"}\nNama: ${msg.from.first_name || ""} ${msg.from.last_name || ""}`,
        { parse_mode: "Markdown" }
      ).catch(() => {});
    }
  }

  saveUser(userId, {
    username: msg.from.username || "",
    first_name: msg.from.first_name || "",
    last_name: msg.from.last_name || ""
  });

  const isMember = await checkUserMembership(userId);
  if (!isMember) {
    const { text, keyboard } = buildForcSubMessage();
    bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  const combos = getAllCombos();
  if (!combos.length) {
    if (isAdmin(userId)) {
      bot.sendMessage(chatId, "⚠️ Belum ada combo. Tambah dulu lewat panel admin.", {
        reply_markup: { inline_keyboard: [[{ text: "🔐 Panel Admin", callback_data: "admin_panel" }]] }
      });
    } else {
      bot.sendMessage(chatId, "⚠️ Belum ada nomor tersedia. Hubungi admin.");
    }
    return;
  }

  bot.sendMessage(chatId, "🌍 *Pilih Negara Lu Ngab* 👇", {
    reply_markup: buildCountryMenu(userId),
    parse_mode: "Markdown"
  });
});

// ================= CALLBACK HANDLER =================
bot.on("callback_query", async (call) => {
  const userId = call.from.id;
  const data = call.data;
  const chatId = call.message.chat.id;
  const msgId = call.message.message_id;

  // Admin bypass semua check langsung lolos
  if (!isAdmin(userId)) {
    if (isBanned(userId) && data !== "check_sub") {
      bot.answerCallbackQuery(call.id, { text: "🚫 Lo dibanned.", show_alert: true });
      return;
    }
    if (data !== "check_sub" && !data.startsWith("admin_") && !data.startsWith("del_combo_") && data !== "toggle_force_sub" && data !== "close_admin") {
      const isMember = await checkUserMembership(userId);
      if (!isMember) {
        bot.answerCallbackQuery(call.id, { text: "🔒 Join channel dulu!", show_alert: true });
        return;
      }
    }
  }

  // ---- CHECK SUB ----
  if (data === "check_sub") {
    bot.answerCallbackQuery(call.id, { text: "⏳ Lagi cek..." });
    const isMember = await checkUserMembership(userId);
    if (!isMember) {
      bot.answerCallbackQuery(call.id, { text: "❌ Lo belum join semua channel!", show_alert: true });
      return;
    }
    const combos = getAllCombos();
    if (!combos.length) {
      bot.editMessageText("✅ Verifikasi sukses!\n\n⚠️ Belum ada nomor. Hubungi admin.", {
        chat_id: chatId, message_id: msgId
      });
      return;
    }
    bot.editMessageText("🌍 *Pilih Negara Lu Ngab* 👇", {
      chat_id: chatId, message_id: msgId,
      reply_markup: buildCountryMenu(userId),
      parse_mode: "Markdown"
    });
    return;
  }

  // ---- COUNTRY SELECTION ----
  if (data.startsWith("country_")) {
    const code = data.slice(8);
    const available = getAvailableNumbers(code);
    if (!available.length) {
      bot.answerCallbackQuery(call.id, { text: "❌ Semua nomor lagi dipake, coba lagi ntar.", show_alert: true });
      return;
    }
    const user = getUser(userId);
    if (user && user.assigned_number) releaseNumber(user.assigned_number);
    const picked = available[Math.floor(Math.random() * available.length)];
    const pickedNorm = normalizeNumber(picked);
    assignNumber(userId, pickedNorm);
    saveUser(userId, { country_code: code, assigned_number: pickedNorm });

    const flag = getFlag(code);
    const { name } = getCombo(code);
    bot.editMessageText(
      `📱 *Number:* \`${pickedNorm}\`\n🌍 *Country:* ${flag} ${name}\n⏳ *Nungguin OTP Masuk...*`,
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Ganti Nomor", callback_data: `change_num_${code}` }],
            [{ text: "🌍 Ganti Negara", callback_data: "back_to_countries" }],
            [{ text: "👑 Owner", url: getSetting("owner_1") || "https://t.me/pwkuni" }]
          ]
        }
      }
    );
    return;
  }

  // ---- CHANGE NUMBER ----
  if (data.startsWith("change_num_")) {
    const code = data.slice(11);
    const resolvedCode = code || (getUser(userId) && getUser(userId).country_code) || "";
    if (!resolvedCode) {
      bot.answerCallbackQuery(call.id, { text: "❌ Pilih negara dulu.", show_alert: true });
      return;
    }
    const available = getAvailableNumbers(resolvedCode);
    if (!available.length) {
      bot.answerCallbackQuery(call.id, { text: "❌ Semua nomor dipake.", show_alert: true });
      return;
    }
    const user = getUser(userId);
    if (user && user.assigned_number) releaseNumber(user.assigned_number);
    const picked = available[Math.floor(Math.random() * available.length)];
    const pickedNorm = normalizeNumber(picked);
    assignNumber(userId, pickedNorm);
    saveUser(userId, { assigned_number: pickedNorm });

    const flag = getFlag(resolvedCode);
    const { name } = getCombo(resolvedCode);
    bot.editMessageText(
      `📱 *Number:* \`${pickedNorm}\`\n🌍 *Country:* ${flag} ${name}\n⏳ *Nungguin OTP Masuk...*`,
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Ganti Nomor", callback_data: `change_num_${resolvedCode}` }],
            [{ text: "🌍 Ganti Negara", callback_data: "back_to_countries" }],
            [{ text: "👑 Owner", url: getSetting("owner_1") || "https://t.me/pwkuni" }]
          ]
        }
      }
    );
    return;
  }

  // ---- BACK TO COUNTRIES ----
  if (data === "back_to_countries") {
    const combos = getAllCombos();
    if (!combos.length) {
      bot.answerCallbackQuery(call.id, { text: "❌ Tidak ada combo.", show_alert: true });
      return;
    }
    bot.editMessageText("🌍 *Pilih Negara Lu Ngab* 👇", {
      chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
      reply_markup: buildCountryMenu(userId)
    });
    return;
  }

  // ---- ADMIN PANEL ----
  if (data === "admin_panel") {
    if (!isAdmin(userId)) {
      bot.answerCallbackQuery(call.id, { text: "🚫 Bukan admin.", show_alert: true });
      return;
    }
    bot.editMessageText("🔐 *Panel Admin*\n\nPilih aksi:", {
      chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
      reply_markup: buildAdminMenu()
    });
    return;
  }

  if (data === "close_admin") {
    bot.editMessageText("🔐 Panel Admin ditutup.", { chat_id: chatId, message_id: msgId });
    return;
  }

  if (data === "admin_add_combo") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "waiting_combo_input", msgId, chatId };
    bot.editMessageText(
      "📥 Kirim nomor-nomor combo nya.\n\nFormat: satu nomor per baris atau dipisah koma.\nCantumkan kode negara (contoh: `6281234567890`)\n\nBot otomatis detect negara dari prefixnya.",
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
      }
    );
    return;
  }

  if (data === "admin_add_combo_txt") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "waiting_combo_txt_file", msgId, chatId };
    bot.editMessageText(
      "📄 *Upload File .txt*\n\nKirim file `.txt` berisi daftar nomor.\nSatu nomor per baris atau pisah koma.\nPakai kode negara lengkap.\n\nContoh:\n`6281234567890\n6289876543210`",
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
      }
    );
    return;
  }

  if (data === "admin_del_combo") {
    if (!isAdmin(userId)) return;
    const combos = getAllCombos();
    if (!combos.length) {
      bot.answerCallbackQuery(call.id, { text: "❌ Belum ada combo.", show_alert: true });
      return;
    }
    const kb = combos.map(c => [{ text: `🗑️ ${c.custom_name || c.country_code}`, callback_data: `del_combo_${c.country_code}` }]);
    kb.push([{ text: "🔙 Back", callback_data: "admin_panel" }]);
    bot.editMessageText("Pilih combo yang mau dihapus:", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: kb }
    });
    return;
  }

  if (data.startsWith("del_combo_")) {
    if (!isAdmin(userId)) return;
    const code = data.slice(10);
    deleteCombo(code);
    bot.editMessageText(`✅ Combo +${code} udah dihapus.`, {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
    });
    return;
  }

  if (data === "admin_stats") {
    if (!isAdmin(userId)) return;
    const combos = getAllCombos();
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_banned=0").get().c;
    const totalBanned = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_banned=1").get().c;
    const totalOtp = db.prepare("SELECT COUNT(*) as c FROM otp_logs").get().c;
    const otpToUser = db.prepare("SELECT COUNT(*) as c FROM otp_logs WHERE sent_to_user=1").get().c;
    let comboDetail = "";
    for (const c of combos) {
      const { numbers } = getCombo(c.country_code);
      const available = getAvailableNumbers(c.country_code).length;
      comboDetail += `${getFlag(c.country_code)} ${c.custom_name}: ${numbers.length} total | ${available} available\n`;
    }
    bot.editMessageText(
      `📊 *Statistik Bot:*\n\n👥 User Aktif: ${totalUsers}\n🚫 User Banned: ${totalBanned}\n🌐 Negara: ${combos.length}\n🔑 Total OTP Masuk: ${totalOtp}\n🎯 OTP ke User Gacha: ${otpToUser}\n\n*Stok per Negara:*\n${comboDetail || "-"}`,
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
      }
    );
    return;
  }

  if (data === "admin_list_users") {
    if (!isAdmin(userId)) return;
    const users = db.prepare("SELECT user_id, username, assigned_number, is_banned FROM users LIMIT 30").all();
    let txt = "👥 *Daftar User:*\n\n";
    for (const u of users) {
      txt += `🆔 \`${u.user_id}\` @${u.username || "?"} | 📞 ${u.assigned_number || "-"} | ${u.is_banned ? "🚫" : "✅"}\n`;
    }
    bot.editMessageText(txt || "Kosong.", {
      chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
    });
    return;
  }

  if (data === "admin_ban") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "ban_user", msgId, chatId };
    bot.editMessageText("🚫 Kirim ID user yang mau dibanned:", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
    });
    return;
  }

  if (data === "admin_unban") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "unban_user", msgId, chatId };
    bot.editMessageText("✅ Kirim ID user yang mau di-unban:", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
    });
    return;
  }

  if (data === "admin_broadcast") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "broadcast_all", msgId, chatId };
    bot.editMessageText("📢 Kirim pesan broadcast ke semua user:\n\n(support Markdown)", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
    });
    return;
  }

  if (data === "toggle_force_sub") {
    if (!isAdmin(userId)) return;
    if (isForceSubEnabled()) {
      setSetting("force_sub", "off");
      bot.answerCallbackQuery(call.id, { text: "❌ Force sub dimatiin" });
    } else {
      setSetting("force_sub", "on");
      bot.answerCallbackQuery(call.id, { text: "✅ Force sub diidupin" });
    }
    bot.editMessageText("🔐 *Panel Admin*\n\nPilih aksi:", {
      chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
      reply_markup: buildAdminMenu()
    });
    return;
  }

  if (data === "admin_set_ch1") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "set_channel_1", msgId, chatId };
    bot.editMessageText(
      "📌 *Set Channel 1*\n\nKirim dalam format:\n`@username|https://t.me/username`",
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
      }
    );
    return;
  }

  if (data === "admin_set_ch2") {
    if (!isAdmin(userId)) return;
    userStates[userId] = { state: "set_channel_2", msgId, chatId };
    bot.editMessageText(
      "📌 *Set Channel 2*\n\nKirim dalam format:\n`@username|https://t.me/username`",
      {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] }
      }
    );
    return;
  }
});

// ================= DOCUMENT HANDLER (.txt upload) =================
bot.on("document", async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (!isAdmin(userId)) return;
  const stateObj = userStates[userId];
  if (!stateObj || stateObj.state !== "waiting_combo_txt_file") return;
  delete userStates[userId];

  const doc = msg.document;
  const fileName = doc.file_name || "";
  if (!fileName.toLowerCase().endsWith(".txt")) {
    bot.sendMessage(chatId, `❌ File harus .txt!\n\nLo kirim: \`${fileName}\``, { parse_mode: "Markdown" });
    return;
  }

  try {
    bot.sendMessage(chatId, "⏳ Lagi proses file...");
    const fileInfo = await bot.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "text" });
    const rawText = response.data;

    const lines = rawText.replace(/,/g, "\n").split("\n");
    const phones = [];
    for (let line of lines) {
      const norm = normalizeNumber(line.trim());
      if (norm.length >= 8) phones.push(norm);
    }

    if (!phones.length) {
      bot.sendMessage(chatId, "❌ Gak nemu nomor valid di file!");
      return;
    }

    const sortedPrefixes = Object.keys(COUNTRY_PREFIXES).sort((a, b) => b.length - a.length);
    const grouped = {};
    for (const phone of phones) {
      for (const prefix of sortedPrefixes) {
        if (phone.startsWith(prefix)) {
          if (!grouped[prefix]) grouped[prefix] = [];
          grouped[prefix].push(phone);
          break;
        }
      }
    }

    if (!Object.keys(grouped).length) {
      bot.sendMessage(chatId, "❌ Gagal detect negara!\nPastikan nomor pakai kode negara lengkap.");
      return;
    }

    let resultText = `✅ *File berhasil diproses!*\n\n📄 \`${fileName}\`\n📞 Total valid: ${phones.length}\n\n*Per negara:*\n`;
    for (const [code, nums] of Object.entries(grouped)) {
      const flagEntry = COUNTRY_PREFIXES[code] ? COUNTRY_PREFIXES[code][0] : "🌍";
      const flag = flagEntry.split("#")[0];
      const countryTag = flagEntry.split("#")[1] || code;
      const { numbers: existing } = getCombo(code);
      const merged = [...new Set([...existing, ...nums])];
      saveCombo(code, merged, `+${code} ${countryTag}`);
      resultText += `${flag} +${code}: ${nums.length} baru | ${merged.length} total\n`;
    }

    bot.sendMessage(chatId, resultText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "🔐 Panel Admin", callback_data: "admin_panel" }]] }
    });
    log(`📄 [ADMIN] File ${fileName}: ${phones.length} nomor`);
  } catch (e) {
    log(`❌ Gagal proses file txt: ${e.message}`);
    bot.sendMessage(chatId, `❌ Error: \`${e.message}\``, { parse_mode: "Markdown" });
  }
});

// ================= TEXT MESSAGE HANDLER =================
bot.on("message", async (msg) => {
  const userId = msg.from.id;
  const text = msg.text;
  if (!text || text.startsWith("/")) return;
  const stateObj = userStates[userId];
  if (!stateObj) return;
  const state = typeof stateObj === "string" ? stateObj : stateObj.state;
  delete userStates[userId];

  if (state === "waiting_combo_input") {
    const lines = text.replace(/,/g, "\n").split("\n");
    const phones = [];
    for (let line of lines) {
      const norm = normalizeNumber(line.trim());
      if (norm.length >= 8) phones.push(norm);
    }
    if (!phones.length) { bot.sendMessage(msg.chat.id, "❌ Gak nemu nomor yang valid."); return; }
    const sortedPrefixes = Object.keys(COUNTRY_PREFIXES).sort((a, b) => b.length - a.length);
    const countOcc = {};
    for (const p of phones.slice(0, 30)) {
      for (const prefix of sortedPrefixes) {
        if (p.startsWith(prefix)) { countOcc[prefix] = (countOcc[prefix] || 0) + 1; break; }
      }
    }
    const sorted = Object.entries(countOcc).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) { bot.sendMessage(msg.chat.id, "❌ Gagal detect negara."); return; }
    const [detectedCode] = sorted[0];
    const flagEntry = COUNTRY_PREFIXES[detectedCode] ? COUNTRY_PREFIXES[detectedCode][0] : "🌍";
    const flag = flagEntry.split("#")[0];
    const countryTag = flagEntry.split("#")[1] || detectedCode;
    const { numbers: existing } = getCombo(detectedCode);
    const merged = [...new Set([...existing, ...phones])];
    saveCombo(detectedCode, merged, `+${detectedCode} ${countryTag}`);
    bot.sendMessage(msg.chat.id,
      `✅ *Combo Berhasil Ditambah!*\n\n${flag} +${detectedCode} ${countryTag}\n📞 Baru: ${phones.length} nomor\n📊 Total stok: ${merged.length} nomor`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (state === "ban_user") {
    const uid = parseInt(text.trim());
    if (!uid) { bot.sendMessage(msg.chat.id, "❌ ID ngaco."); return; }
    db.prepare("UPDATE users SET is_banned=1 WHERE user_id=?").run(uid);
    bot.sendMessage(msg.chat.id, `✅ User \`${uid}\` udah dibanned.`, { parse_mode: "Markdown" });
    try { bot.sendMessage(uid, "🚫 Lo dibanned dari bot ini oleh admin."); } catch (_) {}
    return;
  }

  if (state === "unban_user") {
    const uid = parseInt(text.trim());
    if (!uid) { bot.sendMessage(msg.chat.id, "❌ ID ngaco."); return; }
    db.prepare("UPDATE users SET is_banned=0 WHERE user_id=?").run(uid);
    bot.sendMessage(msg.chat.id, `✅ User \`${uid}\` udah di-unban.`, { parse_mode: "Markdown" });
    try { bot.sendMessage(uid, "✅ Lo di-unban, kirim /start lagi."); } catch (_) {}
    return;
  }

  if (state === "broadcast_all") {
    const allUsers = db.prepare("SELECT user_id FROM users WHERE is_banned=0").all();
    let ok = 0, fail = 0;
    for (const u of allUsers) {
      try { await bot.sendMessage(u.user_id, text, { parse_mode: "Markdown" }); ok++; }
      catch (_) { fail++; }
      await new Promise(r => setTimeout(r, 50));
    }
    bot.sendMessage(msg.chat.id, `📢 Broadcast selesai!\n✅ Terkirim: ${ok}\n❌ Gagal: ${fail}`);
    return;
  }

  if (state === "set_channel_1") {
    const parts = text.trim().split("|");
    if (parts.length !== 2) { bot.sendMessage(msg.chat.id, "❌ Format salah. `@id|https://t.me/x`", { parse_mode: "Markdown" }); return; }
    setSetting("channel_1_id", parts[0].trim());
    setSetting("channel_1", parts[1].trim());
    bot.sendMessage(msg.chat.id, `✅ Channel 1 → ${parts[0].trim()}`);
    return;
  }

  if (state === "set_channel_2") {
    const parts = text.trim().split("|");
    if (parts.length !== 2) { bot.sendMessage(msg.chat.id, "❌ Format salah. `@id|https://t.me/x`", { parse_mode: "Markdown" }); return; }
    setSetting("channel_2_id", parts[0].trim());
    setSetting("channel_2", parts[1].trim());
    bot.sendMessage(msg.chat.id, `✅ Channel 2 → ${parts[0].trim()}`);
    return;
  }
});

// ================= RATE LIMIT QUEUE =================
const sendQueue = [];
let sendingBusy = false;

async function queueSend(fn) {
  return new Promise((resolve, reject) => {
    sendQueue.push({ fn, resolve, reject });
    if (!sendingBusy) drainQueue();
  });
}

async function drainQueue() {
  if (!sendQueue.length) { sendingBusy = false; return; }
  sendingBusy = true;
  const { fn, resolve, reject } = sendQueue.shift();
  try { resolve(await fn()); } catch (e) { reject(e); }
  await new Promise(r => setTimeout(r, 350));
  drainQueue();
}

// ================= TELEGRAM SENDER =================
// Style OTP persis file referensi:
//   button kiri  = OTP dengan copy_text (native Telegram copy) + style success (hijau)
//   button kanan = 💬 Message                                  + style danger  (merah)
//   button bawah = 👑 Owner (link)
async function sendToTelegram(number, otp, cli, date, panelName) {
  try {
    const country = identifyCountry(number);
    const cliShort = CLI_MAP[cli?.toUpperCase()] || cli || "UNKNOWN";
    const countryStr = Array.isArray(country) ? country[0] : country;

    const rawNumber = normalizeNumber(number);
    const masked = maskNumber(rawNumber);

    // Format pesan grup: FLAG #ID #WS nomor (sama persis referensi)
    const messageText = `${countryStr} ${cliShort} ${masked}`;

    // ============================================================
    // BUTTON STYLE PERSIS FILE REFERENSI:
    // kiri  = OTP + copy_text + style: "success"  (hijau)
    // kanan = 💬 Message      + style: "danger"   (merah)
    // bawah = 👑 Owner (url)
    // ============================================================
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: String(otp),
            copy_text: { text: String(otp) },
            style: "success"
          },
          {
            text: "💬 Message",
            callback_data: "cb_msg",
            style: "danger"
          }
        ],
        [
          { text: "👑 Owner", url: getSetting("owner_1") || "https://t.me/pwkuni" }
        ]
      ]
    };

    for (const chatId of CHAT_IDS) {
      await queueSend(() =>
        bot.sendMessage(chatId, messageText, {
          parse_mode: "HTML",
          reply_markup: keyboard
        })
      );
    }

    // ===== RCV DELIVERY: kirim OTP ke user yang pegang nomor ini =====
    const assignedUserId = getUserByNumber(rawNumber);
    let sentToUser = 0;

    if (assignedUserId) {
      const userData = getUser(assignedUserId);
      const userCountryCode = (userData && userData.country_code)
        ? userData.country_code
        : (() => {
            const sortedPfx = Object.keys(COUNTRY_PREFIXES).sort((a, b) => b.length - a.length);
            for (const p of sortedPfx) { if (rawNumber.startsWith(p)) return p; }
            return "";
          })();

      // Pesan ke user: format referensi (Markdown, OTP backtick = bisa di-tap copy)
      const userMsg =
        `🎰 *OTP GACHA MASUK!*\n\n` +
        `🔑 Kode: \`${otp}\`\n` +
        `📞 Nomor: \`${rawNumber}\`\n` +
        `${countryStr} ${cliShort}\n` +
        `⏰ ${date || new Date().toLocaleString("id-ID")}`;

      // Button user: kiri OTP copy_text success, kanan ganti nomor, bawah owner
      const userKeyboard = {
        inline_keyboard: [
          [
            {
              text: String(otp),
              copy_text: { text: String(otp) },
              style: "success"
            },
            {
              text: "🔄 Ganti Nomor",
              callback_data: `change_num_${userCountryCode}`,
              style: "danger"
            }
          ],
          [
            { text: "👑 Owner", url: getSetting("owner_1") || "https://t.me/pwkuni" }
          ]
        ]
      };

      try {
        await queueSend(() =>
          bot.sendMessage(assignedUserId, userMsg, {
            parse_mode: "Markdown",
            reply_markup: userKeyboard
          })
        );
        sentToUser = 1;
        log(`🎯 [GACHA] OTP → user ${assignedUserId} (${masked})`);
      } catch (e) {
        const errMsg = e.message || String(e);
        log(`❌ [GACHA] Gagal kirim ke user ${assignedUserId}: ${errMsg}`);
        if (errMsg.includes("bot was blocked") || errMsg.includes("chat not found") || errMsg.includes("Forbidden")) {
          for (const adminId of ADMIN_IDS) {
            bot.sendMessage(adminId,
              `⚠️ *OTP Gagal ke User!*\n\n🆔 User: \`${assignedUserId}\`\n📞 Nomor: \`${rawNumber}\`\n🔑 OTP: \`${otp}\`\n❌ Error: \`${errMsg}\`\n\n_User belum /start bot atau udah block._`,
              { parse_mode: "Markdown" }
            ).catch(() => {});
          }
        }
      }
    } else {
      log(`ℹ️ [GACHA] Nomor ${masked} tidak ada user yang pegang`);
    }

    db.prepare(`INSERT INTO otp_logs (num, otp, cli, dt, sent_to_user, sent_to_group, timestamp) VALUES (?, ?, ?, ?, ?, 1, ?)`)
      .run(rawNumber, String(otp), cli || "", date || "", sentToUser, new Date().toISOString());

    log(`✈️ [${panelName}] Berhasil dikirim! (${masked} - ${otp})`);
    return true;
  } catch (e) {
    log(`❌ [${panelName}] Gagal kirim Telegram: ${e.message}`);
    return false;
  }
}

// ================= WORKER CLASS =================
class SmsPanelWorker {
  constructor(config) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.loginUrl = config.loginUrl;
    this.signinUrl = config.signinUrl;
    this.smsApiUrl = config.smsApiUrl;
    this.username = config.username;
    this.password = config.password;
    this.isLoggedIn = false;
    this.cookieJar = new CookieJar();
    this.session = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": this.baseUrl,
        "Referer": this.loginUrl
      },
    }));
  }

  solveCaptcha(html) {
    try {
      const $ = cheerio.load(html);
      const parentText = $("input[name='capt']").parent().text().trim();
      const match = parentText.match(/What is (\d+)\s*([\+\-])\s*(\d+)\s*=\s*\?/);
      if (match) return match[2] === "+" ? parseInt(match[1]) + parseInt(match[3]) : parseInt(match[1]) - parseInt(match[3]);
      return 5;
    } catch { return 5; }
  }

  async login() {
    try {
      log(`🔑[${this.name}] Akses login...`);
      const page = await this.session.get(this.loginUrl);
      const capt = this.solveCaptcha(page.data);
      const res = await this.session.post(this.signinUrl, new URLSearchParams({
        username: this.username, password: this.password, capt: capt
      }).toString());
      if (res.data && (res.data.includes("dashboard") || res.data.includes("logout"))) {
        log(`✅ [${this.name}] Login Berhasil! Bot standby...`);
        this.isLoggedIn = true;
        return true;
      }
      log(`❌ [${this.name}] Login Gagal. Mencoba lagi nanti...`);
      return false;
    } catch (e) {
      log(`⚠️ [${this.name}] Error saat login: ${e.message}`);
      return false;
    }
  }

  async checkSMS() {
    try {
      const now = new Date();
      const today = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const params = new URLSearchParams();
      params.append("draw", "1");
      params.append("start", "0");
      params.append("length", "20");
      params.append("fdate1", `${yesterday.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })} 00:00:00`);
      params.append("fdate2", `${today} 23:59:59`);
      params.append("fg", "0");

      const r = await this.session.post(this.smsApiUrl, params.toString(), {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      let data;
      try { data = (typeof r.data === "string") ? JSON.parse(r.data) : r.data; }
      catch { this.isLoggedIn = false; return false; }

      const rows = data.aaData || data.data || [];
      for (const row of rows) {
        let sms = "", number = "", cli = "", date = "";
        if (Array.isArray(row)) {
          date = row[0]; number = row[2]; cli = row[3]; sms = row[4];
        } else {
          date = row.date || row.calldate;
          number = row.number || row.num;
          sms = row.sms || row.message || row.msg;
          cli = row.cli || row.service;
        }
        if (!sms || sms === "N/A" || !number) continue;

        const otp = extractOTP(sms);
        const normNum = normalizeNumber(number);
        const uniqueKey = `${normNum}-${otp}-${date}`;

        if (!lastSent.has(uniqueKey)) {
          log(`🔥 [${this.name}] SMS BARU: ${normNum} | OTP: ${otp}`);
          const success = await sendToTelegram(number, otp, cli, date, this.name);
          if (success) { lastSent.add(uniqueKey); saveSent(); }
        }
      }
      return true;
    } catch (e) {
      log(`⚠️ [${this.name}] checkSMS error: ${e.message}`);
      this.isLoggedIn = false;
      return false;
    }
  }

  async startLoop() {
    while (true) {
      if (!this.isLoggedIn) {
        await this.login();
        if (!this.isLoggedIn) await new Promise(r => setTimeout(r, 5000));
      } else {
        const ok = await this.checkSMS();
        if (!ok) log(`⚠️ [${this.name}] Sesi terputus. Menyiapkan login ulang...`);
      }
      await new Promise(r => setTimeout(r, CHECK_INTERVAL));
    }
  }
}

// ================= MAIN =================
async function main() {
  log("🚀 BOT MULTI-PANEL + GACHA v1 Dinda STARTED...");
  loadSent();
  if (!WEB_PANELS.length) { log("❌ Tidak ada daftar web panel di config!"); return; }
  for (const config of WEB_PANELS) {
    new SmsPanelWorker(config).startLoop();
  }
}

process.on("SIGINT", () => { log("💾 Menyimpan data sebelum keluar..."); saveSent(); db.close(); process.exit(); });
process.on("uncaughtException", (e) => log(`⚠️ Uncaught: ${e.message}`));
process.on("unhandledRejection", (e) => log(`⚠️ Unhandled: ${e}`));

main();
