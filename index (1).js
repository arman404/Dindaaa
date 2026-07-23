import os
import re
import json
import time
import sqlite3
import threading
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

# ================= BOT CONFIG =================
# Disarankan menggunakan Environment Variable untuk keamanan token
BOT_TOKEN = os.getenv("BOT_TOKEN", "8736897063:AAFyzy-SN7-GIPPZJj7ofwKnVihNj_LTQi0")
CHAT_IDS = ["-1003991110285"]
CHECK_INTERVAL = 3
ADMIN_IDS = [1574411746]
OWNER_ID = 1574411746

# ================= BOT INIT =================
bot = telebot.TeleBot(BOT_TOKEN)

# ================= DATABASE INIT =================
DB_PATH = os.path.join(os.path.dirname(__file__), "gacha_bot.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
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
    """)
    cursor.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", ("force_sub", "on"))
    cursor.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", ("channel_1", "https://t.me/maxgunsotp"))
    cursor.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", ("channel_1_id", "@maxgunsotp"))
    cursor.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", ("channel_2", "https://t.me/Mypwni"))
    cursor.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", ("channel_2_id", "@maxgunsotp"))
    cursor.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)", ("owner_1", "https://t.me/pwkuni"))
    conn.commit()
    conn.close()

init_db()

# ================= WEB PANEL CONFIG =================
WEB_PANELS = [
  {
    "name": "LAMIX SMS",
    "API_KEY": "https://api.2oo9.cloud/MXS47FLFX0U/tness/@public/api/console",
  }
]

SENT_FILE = os.path.join(os.path.dirname(__file__), "sent_otp_prtn.json")

# ================= COUNTRY PREFIXES & CLI =================
COUNTRY_PREFIXES = {
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
}

CLI_MAP = {
  "WHATSAPP": "#WS", "TELEGRAM": "#TG", "FACEBOOK": "#FB", "INSTAGRAM": "#IG",
  "TIKTOK": "#TT", "VIBER": "#VB", "WECHAT": "#WT", "LINE": "#LINE",
  "SIGNAL": "#SG", "SNAPCHAT": "#SC", "MESSENGER": "#MS", "IMO": "#IMO"
}

# ================= HELPER FUNCTIONS =================
def log(msg):
    t = datetime.now().strftime("%H:%M:%S")
    print(f"[{t}] {msg}")

def mask_number(number):
    if not number:
        return "XXXX"
    s = re.sub(r"\D", "", str(number))
    if len(s) > 6:
        return s[:3] + "xxx" + s[-4:]
    return s

def extract_otp(msg):
    if not msg:
        return "CODE"
    m = re.search(r"\b(\d{4,8})\b", msg)
    if m:
        return m.group(1)
    m2 = re.search(r"\b(\d{3}-\d{3})\b", msg)
    if m2:
        return m2.group(1).replace("-", "")
    return "MSG"

def identify_country(number):
    if not number:
        return "🌍"
    clean = re.sub(r"\D", "", str(number))
    for length in [3, 2, 1]:
        p = clean[:length]
        if p in COUNTRY_PREFIXES:
            return COUNTRY_PREFIXES[p]
    return "🌍"

def get_flag(country_code):
    entry = COUNTRY_PREFIXES.get(country_code)
    if not entry:
        return "🌍"
    return entry[0].split("#")[0] or "🌍"

def normalize_number(raw):
    if not raw:
        return ""
    n = re.sub(r"\D", "", str(raw))
    return n.lstrip("0")

# ================= SENT STORAGE =================
last_sent = set()

def load_sent():
    global last_sent
    if not os.path.exists(SENT_FILE):
        with open(SENT_FILE, "w") as f:
            json.dump([], f)
    try:
        with open(SENT_FILE, "r") as f:
            data = json.load(f)
            last_sent = set(data)
            log(f"📂 Database termuat: {len(last_sent)} history.")
    except Exception as e:
        log(f"⚠️ Gagal load database: {e}")

def save_sent():
    try:
        arr = list(last_sent)
        if len(arr) > 5000:
            arr = arr[-5000:]
        with open(SENT_FILE, "w") as f:
            json.dump(arr, f, indent=2)
    except Exception as e:
        log(f"⚠️ Gagal simpan database: {e}")

# ================= DB HELPERS =================
def is_admin(user_id):
    return user_id in ADMIN_IDS or user_id == OWNER_ID

def is_banned(user_id):
    conn = get_db()
    row = conn.execute("SELECT is_banned FROM users WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    return bool(row and row["is_banned"] == 1)

def get_setting(key):
    conn = get_db()
    row = conn.execute("SELECT value FROM bot_settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else ""

def set_setting(key, value):
    conn = get_db()
    conn.execute("REPLACE INTO bot_settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def save_user(user_id, data=None):
    if data is None:
        data = {}
    existing = get_user(user_id)
    conn = get_db()
    username = data.get("username", existing.get("username") if existing else "")
    first_name = data.get("first_name", existing.get("first_name") if existing else "")
    last_name = data.get("last_name", existing.get("last_name") if existing else "")
    country_code = data.get("country_code", existing.get("country_code") if existing else None)
    assigned_number = data.get("assigned_number", existing.get("assigned_number") if existing else None)

    conn.execute("""
        INSERT OR REPLACE INTO users (user_id, username, first_name, last_name, country_code, assigned_number, is_banned)
        VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT is_banned FROM users WHERE user_id=?), 0))
    """, (user_id, username, first_name, last_name, country_code, assigned_number, user_id))
    conn.commit()
    conn.close()

def get_all_combos():
    conn = get_db()
    rows = conn.execute("SELECT country_code, custom_name FROM combos").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_combo(country_code):
    conn = get_db()
    row = conn.execute("SELECT numbers, custom_name FROM combos WHERE country_code=?", (country_code,)).fetchone()
    conn.close()
    if not row:
        return {"numbers": [], "name": country_code}
    return {"numbers": json.loads(row["numbers"] or "[]"), "name": row["custom_name"] or country_code}

def save_combo(country_code, numbers, custom_name=None):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO combos (country_code, custom_name, numbers) VALUES (?, ?, ?)",
                 (country_code, custom_name or country_code, json.dumps(numbers)))
    conn.commit()
    conn.close()

def delete_combo(country_code):
    conn = get_db()
    conn.execute("DELETE FROM combos WHERE country_code=?", (country_code,))
    conn.commit()
    conn.close()

def get_available_numbers(country_code):
    combo = get_combo(country_code)
    numbers = combo["numbers"]
    conn = get_db()
    rows = conn.execute("SELECT assigned_number FROM users WHERE assigned_number IS NOT NULL AND assigned_number != ''").fetchall()
    conn.close()
    used = {r["assigned_number"] for r in rows}
    return [n for n in numbers if n not in used]

def assign_number(user_id, number):
    conn = get_db()
    conn.execute("UPDATE users SET assigned_number=? WHERE user_id=?", (number, user_id))
    conn.commit()
    conn.close()

def release_number(old_number):
    if not old_number:
        return
    conn = get_db()
    conn.execute("UPDATE users SET assigned_number=NULL WHERE assigned_number=?", (old_number,))
    conn.commit()
    conn.close()

def get_user_by_number(number):
    normalized = normalize_number(number)
    if not normalized:
        return None
    conn = get_db()
    row = conn.execute("SELECT user_id FROM users WHERE assigned_number=?", (normalized,)).fetchone()
    if row:
        conn.close()
        return row["user_id"]
    all_assigned = conn.execute("SELECT user_id, assigned_number FROM users WHERE assigned_number IS NOT NULL AND assigned_number != ''").fetchall()
    conn.close()
    for r in all_assigned:
        if normalize_number(r["assigned_number"]) == normalized:
            return r["user_id"]
    return None

def is_force_sub_enabled():
    return get_setting("force_sub") != "off"

# ================= FORCE SUB =================
def check_user_membership(user_id):
    if not is_force_sub_enabled():
        return True
    ch1_id = get_setting("channel_1_id")
    ch2_id = get_setting("channel_2_id")
    channels = [c for c in [ch1_id, ch2_id] if c and c.strip()]
    if not channels:
        return True
    for ch in channels:
        try:
            member = bot.get_chat_member(ch, user_id)
            if member.status in ["left", "kicked", "restricted"]:
                return False
        except Exception as e:
            log(f"⚠️ Gagal cek member {ch}: {e}")
    return True

def build_force_sub_message():
    ch1_url = get_setting("channel_1")
    ch2_url = get_setting("channel_2")
    ch1_id = get_setting("channel_1_id")
    ch2_id = get_setting("channel_2_id")
    keyboard = InlineKeyboardMarkup()
    if ch1_url and ch1_id:
        keyboard.add(InlineKeyboardButton(f"📢 Join Channel 1 ({ch1_id})", url=ch1_url))
    if ch2_url and ch2_id:
        keyboard.add(InlineKeyboardButton(f"📢 Join Channel 2 ({ch2_id})", url=ch2_url))
    keyboard.add(InlineKeyboardButton("✅ Udah Join, Cek Lagi", callback_data="check_sub"))
    text = "🔒 *Akses Ditolak!*\n\nLo harus join channel dulu sebelum bisa pakai bot ini.\n\nJoin semua channel di bawah, lalu klik cek:"
    return text, keyboard

# ================= MENU BUILDERS =================
def build_country_menu(user_id):
    combos = get_all_combos()
    keyboard = InlineKeyboardMarkup()
    for c in combos:
        flag = get_flag(c["country_code"])
        name = c["custom_name"] or c["country_code"]
        keyboard.add(InlineKeyboardButton(f"{flag} {name}", callback_data=f"country_{c['country_code']}"))
    if is_admin(user_id):
        keyboard.add(InlineKeyboardButton("🔐 Panel Admin", callback_data="admin_panel"))
    return keyboard

def build_admin_menu():
    status = "✅ ON" if is_force_sub_enabled() else "❌ OFF"
    keyboard = InlineKeyboardMarkup()
    keyboard.row(InlineKeyboardButton("📥 Tambah Combo (Teks)", callback_data="admin_add_combo"),
                 InlineKeyboardButton("📄 Upload .txt", callback_data="admin_add_combo_txt"))
    keyboard.row(InlineKeyboardButton("🗑️ Hapus Combo", callback_data="admin_del_combo"),
                 InlineKeyboardButton("📊 Statistik", callback_data="admin_stats"))
    keyboard.row(InlineKeyboardButton("👥 List User", callback_data="admin_list_users"),
                 InlineKeyboardButton("📢 Broadcast", callback_data="admin_broadcast"))
    keyboard.row(InlineKeyboardButton("🚫 Ban User", callback_data="admin_ban"),
                 InlineKeyboardButton("✅ Unban User", callback_data="admin_unban"))
    keyboard.add(InlineKeyboardButton(f"🔒 Force Sub: {status}", callback_data="toggle_force_sub"))
    keyboard.row(InlineKeyboardButton("📌 Set Channel 1", callback_data="admin_set_ch1"),
                 InlineKeyboardButton("📌 Set Channel 2", callback_data="admin_set_ch2"))
    keyboard.add(InlineKeyboardButton("🔙 Tutup Panel", callback_data="close_admin"))
    return keyboard

user_states = {}

# ================= COMMAND HANDLERS =================
@bot.message_handler(commands=['start'])
def handle_start(msg):
    user_id = msg.from_user.id
    chat_id = msg.chat.id

    if is_banned(user_id):
        bot.send_message(chat_id, "🚫 Lo dibanned dari bot ini.")
        return

    if not get_user(user_id):
        for admin_id in ADMIN_IDS:
            try:
                bot.send_message(
                    admin_id,
                    f"🆕 User baru masuk:\n🆔 `{user_id}`\n👤 @{msg.from_user.username or 'none'}\nNama: {msg.from_user.first_name or ''} {msg.from_user.last_name or ''}",
                    parse_mode="Markdown"
                )
            except Exception:
                pass

    save_user(user_id, {
        "username": msg.from_user.username or "",
        "first_name": msg.from_user.first_name or "",
        "last_name": msg.from_user.last_name or ""
    })

    if not check_user_membership(user_id):
        text, keyboard = build_force_sub_message()
        bot.send_message(chat_id, text, parse_mode="Markdown", reply_markup=keyboard)
        return

    combos = get_all_combos()
    if not combos:
        if is_admin(user_id):
            kb = InlineKeyboardMarkup()
            kb.add(InlineKeyboardButton("🔐 Panel Admin", callback_data="admin_panel"))
            bot.send_message(chat_id, "⚠️ Belum ada combo. Tambah dulu lewat panel admin.", reply_markup=kb)
        else:
            bot.send_message(chat_id, "⚠️ Belum ada nomor tersedia. Hubungi admin.")
        return

    bot.send_message(chat_id, "🌍 *Pilih Negara Lu Ngab* 👇", reply_markup=build_country_menu(user_id), parse_mode="Markdown")

# ================= CALLBACK HANDLER =================
@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    user_id = call.from_user.id
    data = call.data
    chat_id = call.message.chat.id
    msg_id = call.message.message_id

    if not is_admin(user_id):
        if is_banned(user_id) and data != "check_sub":
            bot.answer_callback_query(call.id, "🚫 Lo dibanned.", show_alert=True)
            return
        if data != "check_sub" and not data.startswith("admin_") and not data.startswith("del_combo_") and data not in ["toggle_force_sub", "close_admin"]:
            if not check_user_membership(user_id):
                bot.answer_callback_query(call.id, "🔒 Join channel dulu!", show_alert=True)
                return

    if data == "check_sub":
        bot.answer_callback_query(call.id, "⏳ Lagi cek...")
        if not check_user_membership(user_id):
            bot.answer_callback_query(call.id, "❌ Lo belum join semua channel!", show_alert=True)
            return
        combos = get_all_combos()
        if not combos:
            bot.edit_message_text("✅ Verifikasi sukses!\n\n⚠️ Belum ada nomor. Hubungi admin.", chat_id, msg_id)
            return
        bot.edit_message_text("🌍 *Pilih Negara Lu Ngab* 👇", chat_id, msg_id, reply_markup=build_country_menu(user_id), parse_mode="Markdown")
        return

    if data.startswith("country_"):
        code = data[8:]
        available = get_available_numbers(code)
        if not available:
            bot.answer_callback_query(call.id, "❌ Semua nomor lagi dipake, coba lagi ntar.", show_alert=True)
            return
        usr = get_user(user_id)
        if usr and usr.get("assigned_number"):
            release_number(usr["assigned_number"])

        import random
        picked = random.choice(available)
        picked_norm = normalize_number(picked)
        assign_number(user_id, picked_norm)
        save_user(user_id, {"country_code": code, "assigned_number": picked_norm})

        flag = get_flag(code)
        combo = get_combo(code)
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔄 Ganti Nomor", callback_data=f"change_num_{code}"))
        kb.add(InlineKeyboardButton("🌍 Ganti Negara", callback_data="back_to_countries"))
        kb.add(InlineKeyboardButton("👑 Owner", url=get_setting("owner_1") or "https://t.me/pwkuni"))

        bot.edit_message_text(
            f"📱 *Number:* `{picked_norm}`\n🌍 *Country:* {flag} {combo['name']}\n⏳ *Nungguin OTP Masuk...*",
            chat_id, msg_id, parse_mode="Markdown", reply_markup=kb
        )
        return

    if data.startswith("change_num_"):
        code = data[11:]
        usr = get_user(user_id)
        resolved_code = code or (usr.get("country_code") if usr else "")
        if not resolved_code:
            bot.answer_callback_query(call.id, "❌ Pilih negara dulu.", show_alert=True)
            return
        available = get_available_numbers(resolved_code)
        if not available:
            bot.answer_callback_query(call.id, "❌ Semua nomor dipake.", show_alert=True)
            return
        if usr and usr.get("assigned_number"):
            release_number(usr["assigned_number"])

        import random
        picked = random.choice(available)
        picked_norm = normalize_number(picked)
        assign_number(user_id, picked_norm)
        save_user(user_id, {"assigned_number": picked_norm})

        flag = get_flag(resolved_code)
        combo = get_combo(resolved_code)
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔄 Ganti Nomor", callback_data=f"change_num_{resolved_code}"))
        kb.add(InlineKeyboardButton("🌍 Ganti Negara", callback_data="back_to_countries"))
        kb.add(InlineKeyboardButton("👑 Owner", url=get_setting("owner_1") or "https://t.me/pwkuni"))

        bot.edit_message_text(
            f"📱 *Number:* `{picked_norm}`\n🌍 *Country:* {flag} {combo['name']}\n⏳ *Nungguin OTP Masuk...*",
            chat_id, msg_id, parse_mode="Markdown", reply_markup=kb
        )
        return

    if data == "back_to_countries":
        combos = get_all_combos()
        if not combos:
            bot.answer_callback_query(call.id, "❌ Tidak ada combo.", show_alert=True)
            return
        bot.edit_message_text("🌍 *Pilih Negara Lu Ngab* 👇", chat_id, msg_id, parse_mode="Markdown", reply_markup=build_country_menu(user_id))
        return

    if data == "admin_panel":
        if not is_admin(user_id):
            bot.answer_callback_query(call.id, "🚫 Bukan admin.", show_alert=True)
            return
        bot.edit_message_text("🔐 *Panel Admin*\n\nPilih aksi:", chat_id, msg_id, parse_mode="Markdown", reply_markup=build_admin_menu())
        return

    if data == "close_admin":
        bot.edit_message_text("🔐 Panel Admin ditutup.", chat_id, msg_id)
        return

    if data == "admin_add_combo":
        if not is_admin(user_id): return
        user_states[user_id] = "waiting_combo_input"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text("📥 Kirim nomor-nomor combo nya.\n\nFormat: satu nomor per baris/koma.\nCantumkan kode negara.", chat_id, msg_id, reply_markup=kb)
        return

    if data == "admin_add_combo_txt":
        if not is_admin(user_id): return
        user_states[user_id] = "waiting_combo_txt_file"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text("📄 *Upload File .txt*\n\nKirim file `.txt` berisi daftar nomor.", chat_id, msg_id, parse_mode="Markdown", reply_markup=kb)
        return

    if data == "admin_del_combo":
        if not is_admin(user_id): return
        combos = get_all_combos()
        if not combos:
            bot.answer_callback_query(call.id, "❌ Belum ada combo.", show_alert=True)
            return
        kb = InlineKeyboardMarkup()
        for c in combos:
            kb.add(InlineKeyboardButton(f"🗑️ {c['custom_name'] or c['country_code']}", callback_data=f"del_combo_{c['country_code']}"))
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text("Pilih combo yang mau dihapus:", chat_id, msg_id, reply_markup=kb)
        return

    if data.startswith("del_combo_"):
        if not is_admin(user_id): return
        code = data[10:]
        delete_combo(code)
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text(f"✅ Combo +{code} udah dihapus.", chat_id, msg_id, reply_markup=kb)
        return

    if data == "admin_stats":
        if not is_admin(user_id): return
        conn = get_db()
        total_users = conn.execute("SELECT COUNT(*) as c FROM users WHERE is_banned=0").fetchone()["c"]
        total_banned = conn.execute("SELECT COUNT(*) as c FROM users WHERE is_banned=1").fetchone()["c"]
        total_otp = conn.execute("SELECT COUNT(*) as c FROM otp_logs").fetchone()["c"]
        otp_to_user = conn.execute("SELECT COUNT(*) as c FROM otp_logs WHERE sent_to_user=1").fetchone()["c"]
        conn.close()

        combos = get_all_combos()
        combo_detail = ""
        for c in combos:
            numbers = get_combo(c["country_code"])["numbers"]
            avail = len(get_available_numbers(c["country_code"]))
            flag = get_flag(c["country_code"])
            combo_detail += f"{flag} {c['custom_name']}: {len(numbers)} total | {avail} available\n"

        txt = f"📊 *Statistik Bot:*\n\n👥 User Aktif: {total_users}\n🚫 User Banned: {total_banned}\n🌐 Negara: {len(combos)}\n🔑 Total OTP Masuk: {total_otp}\n🎯 OTP ke User Gacha: {otp_to_user}\n\n*Stok per Negara:*\n{combo_detail or '-'}"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text(txt, chat_id, msg_id, parse_mode="Markdown", reply_markup=kb)
        return

    if data == "admin_list_users":
        if not is_admin(user_id): return
        conn = get_db()
        users = conn.execute("SELECT user_id, username, assigned_number, is_banned FROM users LIMIT 30").fetchall()
        conn.close()

        txt = "👥 *Daftar User:*\n\n"
        for u in users:
            status = "🚫" if u["is_banned"] else "✅"
            txt += f"🆔 `{u['user_id']}` @{u['username'] or '?'} | 📞 {u['assigned_number'] or '-'} | {status}\n"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text(txt or "Kosong.", chat_id, msg_id, parse_mode="Markdown", reply_markup=kb)
        return

    if data == "admin_ban":
        if not is_admin(user_id): return
        user_states[user_id] = "ban_user"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text("🚫 Kirim ID user yang mau dibanned:", chat_id, msg_id, reply_markup=kb)
        return

    if data == "admin_unban":
        if not is_admin(user_id): return
        user_states[user_id] = "unban_user"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text("✅ Kirim ID user yang mau di-unban:", chat_id, msg_id, reply_markup=kb)
        return

    if data == "admin_broadcast":
        if not is_admin(user_id): return
        user_states[user_id] = "broadcast_all"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text("📢 Kirim pesan broadcast ke semua user:\n\n(support Markdown)", chat_id, msg_id, reply_markup=kb)
        return

    if data == "toggle_force_sub":
        if not is_admin(user_id): return
        if is_force_sub_enabled():
            set_setting("force_sub", "off")
            bot.answer_callback_query(call.id, "❌ Force sub dimatiin")
        else:
            set_setting("force_sub", "on")
            bot.answer_callback_query(call.id, "✅ Force sub diidupin")
        bot.edit_message_text("🔐 *Panel Admin*\n\nPilih aksi:", chat_id, msg_id, parse_mode="Markdown", reply_markup=build_admin_menu())
        return

    if data in ["admin_set_ch1", "admin_set_ch2"]:
        if not is_admin(user_id): return
        user_states[user_id] = "set_channel_1" if data == "admin_set_ch1" else "set_channel_2"
        ch_num = "1" if data == "admin_set_ch1" else "2"
        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔙 Back", callback_data="admin_panel"))
        bot.edit_message_text(f"📌 *Set Channel {ch_num}*\n\nKirim format:\n`@username|https://t.me/username`", chat_id, msg_id, parse_mode="Markdown", reply_markup=kb)
        return

# ================= DOCUMENT & TEXT HANDLER =================
@bot.message_handler(content_types=['document'])
def handle_document(msg):
    user_id = msg.from_user.id
    chat_id = msg.chat.id
    if not is_admin(user_id):
        return
    state = user_states.get(user_id)
    if state != "waiting_combo_txt_file":
        return
    user_states.pop(user_id, None)

    doc = msg.document
    if not doc.file_name.lower().endswith(".txt"):
        bot.send_message(chat_id, f"❌ File harus .txt!\n\nLo kirim: `{doc.file_name}`", parse_mode="Markdown")
        return

    try:
        bot.send_message(chat_id, "⏳ Lagi proses file...")
        file_info = bot.get_file(doc.file_id)
        downloaded_file = bot.download_file(file_info.file_path)
        raw_text = downloaded_file.decode('utf-8', errors='ignore')

        lines = raw_text.replace(",", "\n").split("\n")
        phones = []
        for line in lines:
            norm = normalize_number(line.strip())
            if len(norm) >= 8:
                phones.append(norm)

        if not phones:
            bot.send_message(chat_id, "❌ Gak nemu nomor valid di file!")
            return

        sorted_prefixes = sorted(COUNTRY_PREFIXES.keys(), key=len, reverse=True)
        grouped = {}
        for phone in phones:
            for prefix in sorted_prefixes:
                if phone.startswith(prefix):
                    grouped.setdefault(prefix, []).append(phone)
                    break

        if not grouped:
            bot.send_message(chat_id, "❌ Gagal detect negara!\nPastikan nomor pakai kode negara lengkap.")
            return

        result_text = f"✅ *File berhasil diproses!*\n\n📄 `{doc.file_name}`\n📞 Total valid: {len(phones)}\n\n*Per negara:*\n"
        for code, nums in grouped.items():
            flag_entry = COUNTRY_PREFIXES.get(code, ["🌍"])[0]
            flag = flag_entry.split("#")[0]
            country_tag = flag_entry.split("#")[1] if "#" in flag_entry else code
            existing = get_combo(code)["numbers"]
            merged = list(set(existing + nums))
            save_combo(code, merged, f"+{code} {country_tag}")
            result_text += f"{flag} +{code}: {len(nums)} baru | {len(merged)} total\n"

        kb = InlineKeyboardMarkup()
        kb.add(InlineKeyboardButton("🔐 Panel Admin", callback_data="admin_panel"))
        bot.send_message(chat_id, result_text, parse_mode="Markdown", reply_markup=kb)
        log(f"📄 [ADMIN] File {doc.file_name}: {len(phones)} nomor")
    except Exception as e:
        log(f"❌ Gagal proses file txt: {e}")
        bot.send_message(chat_id, f"❌ Error: `{e}`", parse_mode="Markdown")

@bot.message_handler(func=lambda msg: True)
def handle_text(msg):
    user_id = msg.from_user.id
    text = msg.text
    if not text or text.startswith("/"):
        return
    state = user_states.get(user_id)
    if not state:
        return
    user_states.pop(user_id, None)

    if state == "waiting_combo_input":
        lines = text.replace(",", "\n").split("\n")
        phones = [normalize_number(l.strip()) for l in lines if len(normalize_number(l.strip())) >= 8]
        if not phones:
            bot.send_message(msg.chat.id, "❌ Gak nemu nomor yang valid.")
            return
        sorted_prefixes = sorted(COUNTRY_PREFIXES.keys(), key=len, reverse=True)
        count_occ = {}
        for p in phones[:30]:
            for prefix in sorted_prefixes:
                if p.startswith(prefix):
                    count_occ[prefix] = count_occ.get(prefix, 0) + 1
                    break
        if not count_occ:
            bot.send_message(msg.chat.id, "❌ Gagal detect negara.")
            return
        detected_code = max(count_occ, key=count_occ.get)
        flag_entry = COUNTRY_PREFIXES.get(detected_code, ["🌍"])[0]
        flag = flag_entry.split("#")[0]
        country_tag = flag_entry.split("#")[1] if "#" in flag_entry else detected_code
        existing = get_combo(detected_code)["numbers"]
        merged = list(set(existing + phones))
        save_combo(detected_code, merged, f"+{detected_code} {country_tag}")
        bot.send_message(msg.chat.id, f"✅ *Combo Berhasil Ditambah!*\n\n{flag} +{detected_code} {country_tag}\n📞 Baru: {len(phones)} nomor\n📊 Total stok: {len(merged)} nomor", parse_mode="Markdown")
        return

    if state == "ban_user":
        try:
            uid = int(text.strip())
            conn = get_db()
            conn.execute("UPDATE users SET is_banned=1 WHERE user_id=?", (uid,))
            conn.commit()
            conn.close()
            bot.send_message(msg.chat.id, f"✅ User `{uid}` udah dibanned.", parse_mode="Markdown")
            try: bot.send_message(uid, "🚫 Lo dibanned dari bot ini oleh admin.")
            except: pass
        except:
            bot.send_message(msg.chat.id, "❌ ID ngaco.")
        return

    if state == "unban_user":
        try:
            uid = int(text.strip())
            conn = get_db()
            conn.execute("UPDATE users SET is_banned=0 WHERE user_id=?", (uid,))
            conn.commit()
            conn.close()
            bot.send_message(msg.chat.id, f"✅ User `{uid}` udah di-unban.", parse_mode="Markdown")
            try: bot.send_message(uid, "✅ Lo di-unban, kirim /start lagi.")
            except: pass
        except:
            bot.send_message(msg.chat.id, "❌ ID ngaco.")
        return

    if state == "broadcast_all":
        conn = get_db()
        all_users = conn.execute("SELECT user_id FROM users WHERE is_banned=0").fetchall()
        conn.close()
        ok, fail = 0, 0
        for u in all_users:
            try:
                bot.send_message(u["user_id"], text, parse_mode="Markdown")
                ok += 1
            except:
                fail += 1
            time.sleep(0.05)
        bot.send_message(msg.chat.id, f"📢 Broadcast selesai!\n✅ Terkirim: {ok}\n❌ Gagal: {fail}")
        return

    if state in ["set_channel_1", "set_channel_2"]:
        parts = text.strip().split("|")
        if len(parts) != 2:
            bot.send_message(msg.chat.id, "❌ Format salah. `@id|https://t.me/x`", parse_mode="Markdown")
            return
        key_id = "channel_1_id" if state == "set_channel_1" else "channel_2_id"
        key_url = "channel_1" if state == "set_channel_1" else "channel_2"
        set_setting(key_id, parts[0].strip())
        set_setting(key_url, parts[1].strip())
        bot.send_message(msg.chat.id, f"✅ Channel → {parts[0].strip()}")
        return

# ================= TELEGRAM SENDER =================
def send_to_telegram(number, otp, cli, date, panel_name):
    try:
        country = identify_country(number)
        cli_short = CLI_MAP.get(str(cli).upper(), cli or "UNKNOWN")
        country_str = country[0] if isinstance(country, list) else country
        raw_number = normalize_number(number)
        masked = mask_number(raw_number)

        message_text = f"{country_str} {cli_short} {masked}"

        keyboard = InlineKeyboardMarkup()
        keyboard.row(
            InlineKeyboardButton(text=str(otp), callback_data="copy_otp"),
            InlineKeyboardButton(text="💬 Message", callback_data="cb_msg")
        )
        keyboard.add(InlineKeyboardButton("👑 Owner", url=get_setting("owner_1") or "https://t.me/pwkuni"))

        for chat_id in CHAT_IDS:
            bot.send_message(chat_id, message_text, parse_mode="HTML", reply_markup=keyboard)

        assigned_user_id = get_user_by_number(raw_number)
        sent_to_user = 0

        if assigned_user_id:
            user_data = get_user(assigned_user_id)
            user_country_code = user_data.get("country_code", "") if user_data else ""

            user_msg = (
                f"🎰 *OTP GACHA MASUK!*\n\n"
                f"🔑 Kode: `{otp}`\n"
                f"📞 Nomor: `{raw_number}`\n"
                f"{country_str} {cli_short}\n"
                f"⏰ {date or datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )

            user_kb = InlineKeyboardMarkup()
            user_kb.row(
                InlineKeyboardButton(text=str(otp), callback_data="copy_otp"),
                InlineKeyboardButton(text="🔄 Ganti Nomor", callback_data=f"change_num_{user_country_code}")
            )
            user_kb.add(InlineKeyboardButton("👑 Owner", url=get_setting("owner_1") or "https://t.me/pwkuni"))

            try:
                bot.send_message(assigned_user_id, user_msg, parse_mode="Markdown", reply_markup=user_kb)
                sent_to_user = 1
                log(f"🎯 [GACHA] OTP → user {assigned_user_id} ({masked})")
            except Exception as e:
                log(f"❌ [GACHA] Gagal kirim ke user {assigned_user_id}: {e}")

        conn = get_db()
        conn.execute("""
            INSERT INTO otp_logs (num, otp, cli, dt, sent_to_user, sent_to_group, timestamp)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        """, (raw_number, str(otp), cli or "", date or "", sent_to_user, datetime.now().isoformat()))
        conn.commit()
        conn.close()

        log(f"✈️ [{panel_name}] Berhasil dikirim! ({masked} - {otp})")
        return True
    except Exception as e:
        log(f"❌ [{panel_name}] Gagal kirim Telegram: {e}")
        return False

# ================= SMS WORKER =================
class SmsPanelWorker:
    def __init__(self, config):
        self.name = config["name"]
        self.baseUrl = config["baseUrl"]
        self.loginUrl = config["loginUrl"]
        self.signinUrl = config["signinUrl"]
        self.smsApiUrl = config["smsApiUrl"]
        self.username = config["username"]
        self.password = config["password"]
        self.is_logged_in = False
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": self.baseUrl,
            "Referer": self.loginUrl
        })

    def solve_captcha(self, html):
        try:
            soup = BeautifulSoup(html, 'html.parser')
            capt_input = soup.find("input", {"name": "capt"})
            if capt_input and capt_input.parent:
                text = capt_input.parent.get_text()
                match = re.search(r"What is (\d+)\s*([\+\-])\s*(\d+)\s*=\s*\?", text)
                if match:
                    n1, op, n2 = match.groups()
                    return int(n1) + int(n2) if op == "+" else int(n1) - int(n2)
            return 5
        except:
            return 5

    def login(self):
        try:
            log(f"🔑[{self.name}] Akses login...")
            res = self.session.get(self.loginUrl, timeout=15)
            capt = self.solve_captcha(res.text)
            payload = {
                "username": self.username,
                "password": self.password,
                "capt": capt
            }
            post_res = self.session.post(self.signinUrl, data=payload, timeout=15)
            if "dashboard" in post_res.text or "logout" in post_res.text:
                log(f"✅ [{self.name}] Login Berhasil! Bot standby...")
                self.is_logged_in = True
                return True
            log(f"❌ [{self.name}] Login Gagal. Mencoba lagi nanti...")
            return False
        except Exception as e:
            log(f"⚠️ [{self.name}] Error saat login: {e}")
            return False

    def check_sms(self):
        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

            payload = {
                "draw": "1",
                "start": "0",
                "length": "20",
                "fdate1": f"{yesterday_str} 00:00:00",
                "fdate2": f"{today_str} 23:59:59",
                "fg": "0"
            }
            headers = {"X-Requested-With": "XMLHttpRequest"}
            res = self.session.post(self.smsApiUrl, data=payload, headers=headers, timeout=15)

            data = res.json()
            rows = data.get("aaData") or data.get("data") or []

            for row in rows:
                if isinstance(row, list):
                    date, number, cli, sms = row[0], row[2], row[3], row[4]
                else:
                    date = row.get("date") or row.get("calldate", "")
                    number = row.get("number") or row.get("num", "")
                    sms = row.get("sms") or row.get("message") or row.get("msg", "")
                    cli = row.get("cli") or row.get("service", "")

                if not sms or sms == "N/A" or not number:
                    continue

                otp = extract_otp(sms)
                norm_num = normalize_number(number)
                unique_key = f"{norm_num}-{otp}-{date}"

                if unique_key not in last_sent:
                    log(f"🔥 [{self.name}] SMS BARU: {norm_num} | OTP: {otp}")
                    if send_to_telegram(number, otp, cli, date, self.name):
                        last_sent.add(unique_key)
                        save_sent()
            return True
        except Exception as e:
            log(f"⚠️ [{self.name}] checkSMS error: {e}")
            self.is_logged_in = False
            return False

    def start_loop(self):
        while True:
            if not self.is_logged_in:
                self.login()
                if not self.is_logged_in:
                    time.sleep(5)
            else:
                ok = self.check_sms()
                if not ok:
                    log(f"⚠️ [{self.name}] Sesi terputus. Menyiapkan login ulang...")
            time.sleep(CHECK_INTERVAL)

# ================= MAIN =================
def run_worker(panel_config):
    worker = SmsPanelWorker(panel_config)
    worker.start_loop()

if __name__ == "__main__":
    log("🚀 BOT MULTI-PANEL + GACHA v1 (Python Version) STARTED...")
    load_sent()

    # Jalankan worker SMS di background thread
    for config in WEB_PANELS:
        t = threading.Thread(target=run_worker, args=(config,), daemon=True)
        t.start()

    # Bot Telegram Polling Utama
    try:
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
    except (KeyboardInterrupt, SystemExit):
        log("💾 Menyimpan data sebelum keluar...")
        save_sent()
