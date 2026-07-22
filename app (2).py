import telebot
import requests
import time
import threading
import re
from telebot import types
from telebot.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton

# --- কনফিগারেশন এবং লিংকস ---
TELEGRAM_TOKEN = '8736897063:AAFyzy-SN7-GIPPZJj7ofwKnVihNj_LTQi0'
BASE_URL = 'https://stexsms.com/mapi/v1'
STEX_EMAIL = 'ancaaki@gmail.com'
STEX_PASSWORD = 'Man123##'

# এডমিন ও চ্যানেল/গ্রুপ আইডি সেটিংস
ADMIN_ID = 1574411746  # প্রধান এডমিন আইডি
OTP_GROUP_ID = -1003991110285       
CHANNEL_LINK = "https://t.me/Mypwni" 
CHANNEL_USERNAME = "@Mypwni"  
OTP_GROUP_LINK = "https://t.me/maxgunsotp" 
BOT_USERNAME = "StexotpDin_bot"       

bot = telebot.TeleBot(TELEGRAM_TOKEN)

# --- ২৫০+ টি দেশের Alphabetical Order এ সাজানো COUNTRY_FLAGS ডিকশনারি ---
COUNTRY_FLAGS = {
    "Afghanistan": "🇦🇫", "Albania": "🇦🇱", "Algeria": "🇩🇿", "American Samoa": "🇦🇸", "Andorra": "🇦🇩",
    "Angola": "🇦🇴", "Anguilla": "🇦🇮", "Antarctica": "🇦🇶", "Antigua and Barbuda": "🇦🇬", "Argentina": "🇦🇷",
    "Armenia": "🇦🇲", "Aruba": "🇦🇼", "Australia": "🇦🇺", "Austria": "🇦🇹", "Azerbaijan": "🇦🇿",
    "Bahamas": "🇧🇸", "Bahrain": "🇧🇭", "Bangladesh": "🇧🇩", "Barbados": "🇧🇧", "Belarus": "🇧🇾",
    "Belgium": "🇧🇪", "Belize": "🇧🇿", "Benin": "🇧🇯", "Bermuda": "🇧🇲", "Bhutan": "🇧🇹",
    "Bolivia": "🇧🇴", "Bonaire": "🇧🇶", "Bosnia and Herzegovina": "🇧🇦", "Botswana": "🇧🇼", "Bouvet Island": "🇧🇻",
    "Brazil": "🇧🇷", "British Indian Ocean Territory": "🇮🇴", "British Virgin Islands": "🇻🇬", "Brunei": "🇧🇳", "Bulgaria": "🇧🇬",
    "Burkina Faso": "🇧🇫", "Burundi": "🇧🇮", "Cabo Verde": "🇨🇻", "Cambodia": "🇰🇭", "Cameroon": "🇨🇲",
    "Canada": "🇨🇦", "Cayman Islands": "🇰🇾", "Central African Republic": "🇨🇫", "Chad": "🇹🇩", "Chile": "🇨🇱",
    "China": "🇨🇳", "Christmas Island": "🇨🇽", "Cocos (Keeling) Islands": "🇨🇨", "Colombia": "🇨🇴", "Comoros": "🇰🇲",
    "Congo": "🇨🇬", "Cook Islands": "🇨🇰", "Costa Rica": "🇨🇷", "Croatia": "🇭🇷", "Cuba": "🇨🇺",
    "Curaçao": "🇨🇼", "Cyprus": "🇨🇾", "Czechia": "🇨🇿", "Czech Republic": "🇨🇿", "Côte d'Ivoire": "🇨🇮", "Denmark": "🇩🇰",
    "Djibouti": "🇩🇯", "Dominica": "🇩🇲", "Dominican Republic": "🇩🇴", "Ecuador": "🇪🇨", "Egypt": "🇪🇬",
    "El Salvador": "🇸🇻", "Equatorial Guinea": "🇬🇶", "Eritrea": "🇪🇷", "Estonia": "🇪🇪", "Eswatini": "🇸🇿",
    "Ethiopia": "🇪🇹", "Falkland Islands": "🇫🇰", "Faroe Islands": "🇫🇴", "Fiji": "🇫🇯", "Finland": "🇫🇮",
    "France": "🇫🇷", "French Guiana": "🇬🇫", "French Polynesia": "🇵🇫", "French Southern Territories": "🇹🇫", "Gabon": "🇬🇦",
    "Gambia": "🇬🇲", "Georgia": "🇬🇪", "Germany": "🇩🇪", "Ghana": "🇬🇭", "Gibraltar": "🇬🇮",
    "Greece": "🇬🇷", "Greenland": "🇬🇱", "Grenada": "🇬🇩", "Guadeloupe": "🇬🇵", "Guam": "🇬🇺",
    "Guatemala": "🇬🇹", "Guernsey": "🇬🇬", "Guinea": "🇬🇳", "Guinea-Bissau": "🇬🇼", "Guyana": "🇬🇾",
    "Haiti": "🇭🇹", "Heard Island and McDonald Islands": "🇭🇲", "Honduras": "🇭🇳", "Hong Kong": "🇭🇰", "Hungary": "🇭🇺",
    "Iceland": "🇮🇸", "India": "🇮🇳", "Indonesia": "🇮🇩", "Iran": "🇮🇷", "Iraq": "🇮🇶",
    "Ireland": "🇮🇪", "Isle of Man": "🇮🇲", "Israel": "🇮🇱", "Italy": "🇮🇹", "Ivory Coast": "🇨🇮",
    "Jamaica": "🇯🇲", "Japan": "🇯🇵", "Jersey": "🇯🇪", "Jordan": "🇯🇴", "Kazakhstan": "🇰🇿",
    "Kenya": "🇰🇪", "Kuwait": "🇰🇼", "Kyrgyzstan": "🇰🇬", "Laos": "🇱🇦", "Latvia": "🇱🇻",
    "Lebanon": "🇱🇧", "Lesotho": "🇱🇸", "Liberia": "🇱🇷", "Libya": "🇱🇾", "Liechtenstein": "🇱🇮",
    "Lithuania": "🇱🇹", "Luxembourg": "🇱🇺", "Macao": "🇲🇴", "Macau": "🇲🇴", "Madagascar": "🇲🇬",
    "Malawi": "🇲🇼", "Malaysia": "🇲🇾", "Maldives": "🇲🇻", "Mali": "🇲🇱", "Malta": "🇲🇹",
    "Marshall Islands": "🇲🇭", "Martinique": "🇲🇶", "Mauritania": "🇲🇷", "Mauritius": "🇲🇺", "Mayotte": "🇾🇹",
    "Mexico": "🇲🇽", "Micronesia": "🇫🇲", "Moldova": "🇲🇩", "Monaco": "🇲🇨", "Mongolia": "🇲🇳",
    "Montenegro": "🇲🇪", "Montserrat": "🇲🇸", "Morocco": "🇲🇦", "Mozambique": "🇲🇿", "Myanmar": "🇲🇲",
    "Namibia": "🇳🇦", "Nauru": "🇳🇷", "Nepal": "🇳🇵", "Netherlands": "🇳🇱", "New Caledonia": "🇳🇨",
    "New Zealand": "🇳🇿", "Nicaragua": "🇳🇮", "Niger": "🇳🇪", "Nigeria": "🇳🇬", "Niue": "🇳🇺",
    "Norfolk Island": "🇳🇫", "North Korea": "🇰🇵", "North Macedonia": "🇲🇰", "Northern Mariana Islands": "🇲🇵", "Norway": "🇳🇴",
    "Oman": "🇴🇲", "Pakistan": "🇵🇰", "Palau": "🇵🇼", "Palestine": "🇵🇸", "Panama": "🇵🇦",
    "Papua New Guinea": "🇵🇬", "Paraguay": "🇵🇾", "Peru": "🇵🇪", "Philippines": "🇵🇭", "Pitcairn": "🇵🇳",
    "Poland": "🇵🇱", "Portugal": "🇵🇹", "Puerto Rico": "🇵🇷", "Qatar": "🇶🇦", "Romania": "🇷🇴",
    "Russia": "🇷🇺", "Rwanda": "🇷🇼", "Réunion": "🇷🇪", "Samoa": "🇼🇸", "San Marino": "🇸🇲",
    "Saudi Arabia": "🇸🇦", "Senegal": "🇸🇳", "Serbia": "🇷🇸", "Seychelles": "🇸🇨", "Sierra Leone": "🇸🇱",
    "Singapore": "🇸🇬", "Sint Maarten": "🇸🇽", "Slovakia": "🇸🇰", "Slovenia": "🇸🇮", "Solomon Islands": "🇸🇧",
    "Somalia": "🇸🇴", "South Africa": "🇿🇦", "South Georgia and South Sandwich Islands": "🇬🇸", "South Korea": "🇰🇷", "South Sudan": "🇸🇸",
    "Spain": "🇪🇸", "Sri Lanka": "🇱🇰", "Sudan": "🇸🇩", "Suriname": "🇸🇷", "Svalbard and Jan Mayen": "🇸🇯",
    "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "Syria": "🇸🇾", "São Tomé and Príncipe": "🇸🇹", "Taiwan": "🇹🇼",
    "Tajikistan": "🇹🇯", "Tanzania": "🇹🇿", "Thailand": "🇹🇭", "Timor-Leste": "🇹🇱", "Togo": "🇹🇬",
    "Tokelau": "🇹🇰", "Tonga": "🇹🇴", "Trinidad and Tobago": "🇹🇹", "Tunisia": "🇹🇳", "Turkey": "🇹🇷",
    "Turkmenistan": "🇹🇲", "Turks and Caicos Islands": "🇹🇨", "Tuvalu": "🇹🇻", "U.S. Virgin Islands": "🇻🇮", "Uganda": "🇺🇬",
    "Ukraine": "🇺🇦", "United Arab Emirates": "🇦🇪", "United Kingdom": "🇬🇧", "United States Minor Outlying Islands": "🇺🇲", "United States": "🇺🇸",
    "Uruguay": "🇺🇾", "Uzbekistan": "🇺🇿", "Vanuatu": "🇻🇺", "Vatican City": "🇻🇦", "Venezuela": "🇻🇪",
    "Vietnam": "🇻🇳", "Wallis and Futuna": "🇼🇫", "Western Sahara": "🇪🇭", "Yemen": "🇾🇪", "Zambia": "ZM",
    "Zimbabwe": "🇿🇼"
}

# --- ISO 3166-1 Alpha-2 Country Codes ডিকশনারি ---
ISO_COUNTRY_CODES = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO",
    "Antigua and Barbuda": "AG", "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT",
    "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB",
    "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT",
    "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN",
    "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cambodia": "KH", "Cameroon": "CM",
    "Canada": "CA", "Cape Verde": "CV", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
    "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo": "CG", "Costa Rica": "CR",
    "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czech Republic": "CZ", "Denmark": "DK",
    "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "Ecuador": "EC", "Egypt": "EG",
    "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE", "Eswatini": "SZ",
    "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI", "France": "FR", "Gabon": "GA",
    "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Greece": "GR",
    "Grenada": "GD", "Guatemala": "GT", "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY",
    "Haiti": "HT", "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN",
    "Indonesia": "ID", "Iran": "IQ", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL",
    "Italy": "IT", "Ivory Coast": "CI", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO",
    "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG",
    "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR",
    "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG",
    "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT",
    "Marshall Islands": "MH", "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX",
    "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME",
    "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM", "Namibia": "NA", "Nauru": "NR",
    "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE",
    "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO", "Oman": "OM",
    "Pakistan": "PK", "Palau": "PW", "Palestine": "PS", "Panama": "PA", "Papua New Guinea": "PG",
    "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT",
    "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saint Kitts and Nevis": "KN",
    "Saint Lucia": "LC", "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM",
    "Sao Tome and Principe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS",
    "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI",
    "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS",
    "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Sweden": "SE",
    "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ",
    "Thailand": "TH", "Timor-Leste": "TL", "Togo": "TG", "Tonga": "TO", "Trinidad and Tobago": "TT",
    "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Tuvalu": "TV", "Uganda": "UG",
    "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
    "Uruguay": "UY", "Uzbekistan": "UZ", "Vanuatu": "VU", "Vatican City": "VA", "Venezuela": "VE",
    "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW"
}

# মেমরি বাফার, গ্লোবাল স্টেট এবং ডাটাবেজ ট্র্যাকিং (ফাইল ভিত্তিক বা ডিকশনারি)
SAVED_COUNTRIES = {"WhatsApp": set(), "Facebook": set()}
LATEST_RANGES = {"WhatsApp": {}, "Facebook": {}}
TRACKED_NUMBERS_HISTORY = {} 
PROCESSED_OTPS = set() 
USER_PREFERENCES = {}
ACTIVE_NUMBERS_POOL = set()

# ইউজার ট্র্যাকিং সিস্টেম (ব্রডকাস্ট ও এডমিন রিপোর্টের জন্য)
REGISTERED_USERS = {}  # {user_id: username_or_first_name}
ADMIN_LIST = {ADMIN_ID}  # এডমিনদের সেট (সহজে নতুন এডমিন অ্যাড করার জন্য)

# কাস্টম ইমোজি আইডি রিসোর্স ম্যাপ
EMOJI_SERVICE_WHATSAPP = "5334998226636390258"
EMOJI_SERVICE_FACEBOOK = "5323261730283863478"

def save_user(user_id, username, first_name):
    name = f"@{username}" if username else first_name
    REGISTERED_USERS[user_id] = name

# ইউজার চ্যানেলে জয়েন আছে কিনা তা পরীক্ষা করার হেল্পার ফাংশন
def check_user_joined(user_id):
    if user_id in ADMIN_LIST:
        return True
    try:
        member = bot.get_chat_member(CHANNEL_USERNAME, user_id)
        if member.status in ['member', 'administrator', 'creator']:
            return True
    except Exception as e:
        print(f"চ্যানেল মেম্বারশিপ চেক ত্রুটি: {e}")
    return False

# ১. তাৎক্ষণিক লগইন করে লাইভ টোকেন রিটার্ন করার ফাংশন
def get_live_token():
    login_url = f"{BASE_URL}/mauth/login"
    payload = {"email": STEX_EMAIL, "password": STEX_PASSWORD}
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    try:
        response = requests.post(login_url, json=payload, headers=headers)
        if response.status_code == 200:
            return response.json().get("data", {}).get("token")
    except Exception as e:
        print(f"লগইন করতে সমস্যা হয়েছে: {e}")
    return None

# লাইভ কনসোল থেকে শুধুমাত্র পাবলিক রিকোয়েস্ট ফিল্টারিং এবং ব্যাকগ্রাউন্ড ডাটা সংরক্ষণ লজিক
def fetch_live_console_data():
    token = get_live_token()
    if not token: return
    
    url = f"{BASE_URL}/mdashboard/console/info"
    headers = {"mauthtoken": token, "Accept": "application/json"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            logs = response.json().get("data", {}).get("logs", [])
            for log in logs:
                app_name = log.get("app_name")
                country = str(log.get("country") or "")
                range_val = log.get("range")
                sim_type = str(log.get("sim_type") or "").lower()
                
                if "postpaid" in sim_type or "postpaid" in country.lower():
                    continue
                    
                target_service = None
                if app_name and "whatsapp" in app_name.lower():
                    target_service = "WhatsApp"
                elif app_name and "facebook" in app_name.lower():
                    target_service = "Facebook"
                    
                if target_service and country and range_val:
                    SAVED_COUNTRIES[target_service].add(country)
                    LATEST_RANGES[target_service][country] = range_val
    except Exception as e:
        print(f"Kesalahan baca konsol : {e}")

# রেঞ্জ ভিত্তিক নতুন নাম্বার কেনার এপিআই ফাংশন
def buy_number_api(target_range):
    token = get_live_token()
    if not token: return None
    url = f"{BASE_URL}/mdashboard/getnum/number"
    headers = {"mauthtoken": token, "Content-Type": "application/json"}
    
    clean_range = str(target_range).replace("XXX", "").replace("X", "")
    payload = {"range": f"{clean_range}XXX", "is_national": False, "remove_plus": False}
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            res = response.json()
            if res.get("meta", {}).get("status") == "success":
                return res.get("data", {})
    except Exception as e:
        print(f"Kesalahan API saat membeli nomor:  {e}")
    return None

# --- সংশোধিত ওটিপি ইনবক্স ট্র্যাকার ও চ্যাট+গ্রুপ ফরোয়ার্ড মেকানিজম ---
def check_live_otp_inbox():
    while True:
        time.sleep(4)
        if not ACTIVE_NUMBERS_POOL: continue
        
        token = get_live_token()
        if not token: continue
        
        current_date = time.strftime("%Y-%m-%d")
        url = f"{BASE_URL}/mdashboard/getnum/info?date={current_date}&page=1&search=&status="
        headers = {"mauthtoken": token, "Accept": "application/json"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                numbers_list = response.json().get("data", {}).get("numbers", [])
                for item in numbers_list:
                    # যদি 'number' ফিল্ডে আসল নাম্বার থাকে, তবে সেটা নিবে। অনেক সময় full_number ফিল্ডে টেক্সট আসে।
                    raw_num = str(item.get("number") or "").replace("+", "").replace(" ", "").strip()
                    if not raw_num or raw_num.isalpha():
                        raw_num = str(item.get("full_number") or "").replace("+", "").replace(" ", "").strip()
                    
                    status = str(item.get("status") or "").lower()
                    nid = str(item.get("nid") or "")
                    
                    if not raw_num or raw_num.isalpha(): continue
                    
                    is_matched = False
                    matched_key = None
                    
                    # পুল থেকে নাম্বার নিখুঁতভাবে ম্যাচ করার লজিক
                    if raw_num in ACTIVE_NUMBERS_POOL:
                        is_matched = True
                        matched_key = raw_num
                    else:
                        for pool_num in ACTIVE_NUMBERS_POOL:
                            if pool_num in raw_num or raw_num in pool_num:
                                is_matched = True
                                matched_key = pool_num
                                break
                                
                    if is_matched and status == "success":
                        full_msg = str(item.get("message") or item.get("otp") or "")
                        # ৫ থেকে ৮ ডিজিটের ওটিপি কোড খোঁজা
                        clean_match = re.search(r'\b\d{5,8}\b', full_msg)
                        
                        if clean_match:
                            otp_code = clean_match.group(0)
                        else:
                            otp_digits = re.findall(r'\d+', full_msg)
                            otp_code = "".join(otp_digits) if otp_digits else full_msg
                            
                        if not otp_code: continue
                        
                        otp_history_key = f"{nid}_{matched_key}_{otp_code}"
                        
                        if otp_history_key not in PROCESSED_OTPS:
                            PROCESSED_OTPS.add(otp_history_key)
                            
                            meta_info = TRACKED_NUMBERS_HISTORY.get(matched_key, {"chat_id": None, "service": "WhatsApp", "country": "Ivory Coast", "lang": "English"})
                            chat_id = meta_info["chat_id"]
                            service = meta_info["service"]
                            
                            # API রেসপন্স থেকে সঠিক দেশের নাম রিড করা (যদি PostPaid আসে, তবে ব্যাকআপ মেটা_ইনফো ব্যবহার হবে)
                            api_country = item.get("country")
                            if api_country and str(api_country).lower() != "postpaid":
                                country = api_country
                            else:
                                country = meta_info["country"]
                                
                            if chat_id:
                                user_msg = (
                                    f"<tg-emoji emoji-id='4958636483075376288'>🆕</tg-emoji> 𝗡𝗘𝗪 𝗢𝗧𝗣 𝗥𝗘𝗖𝗘𝗜𝗩𝗘𝗗\n"
                                    f"<tg-emoji emoji-id='4956739572114392015'>🌍</tg-emoji> Country: {country}\n"
                                    f"<tg-emoji emoji-id='5393561394207541973'>📱</tg-emoji> Number: <code>{matched_key}</code>\n"
                                    f"<tg-emoji emoji-id='4958624886663678191'>💧</tg-emoji> OTP: <code>{otp_code}</code>"
                                )
                                u_markup = InlineKeyboardMarkup()
                                u_markup.add(InlineKeyboardButton(
                                    text=otp_code, 
                                    copy_text=types.CopyTextButton(text=otp_code),
                                    icon_custom_emoji_id="4956475826762679249",
                                    style="primary"
                                ))
                                try:
                                    bot.send_message(chat_id, user_msg, reply_markup=u_markup, parse_mode="HTML")
                                except: pass
                                
                            flag = COUNTRY_FLAGS.get(country, "🇨🇮")
                            iso_name = ISO_COUNTRY_CODES.get(country, "CI")
                            
                            if len(matched_key) > 5:
                                masked_num = matched_key[:-5] + "XX" + matched_key[-3:]
                            else:
                                masked_num = matched_key
                            
                            service_emoji_id = EMOJI_SERVICE_WHATSAPP if service == "WhatsApp" else EMOJI_SERVICE_FACEBOOK
                            group_text = f"{flag} #{iso_name} \t\t <tg-emoji emoji-id='{service_emoji_id}'>📱</tg-emoji> {masked_num}"
                            
                            g_markup = InlineKeyboardMarkup(row_width=2)
                            g_markup.row(InlineKeyboardButton(
                                text=otp_code, 
                                copy_text=types.CopyTextButton(text=otp_code),
                                icon_custom_emoji_id="4956475826762679249",
                                style="success"
                            ))
                            b_channel = InlineKeyboardButton("Channel", url=CHANNEL_LINK, icon_custom_emoji_id="6269303009658802514", style="danger")
                            b_bot = InlineKeyboardButton("BOT", url=f"https://t.me/{BOT_USERNAME}", icon_custom_emoji_id="6080352185533602200", style="primary")
                            
                            g_markup.row(b_channel, b_bot)
                            
                            try:
                                bot.send_message(OTP_GROUP_ID, group_text, reply_markup=g_markup, parse_mode="HTML")
                            except: pass
        except Exception as e:
            print(f"ইনবক্স ট্র্যাকার ত্রুটি: {e}")

# নতুন স্টার্ট/ওয়েলকাম রেসপন্স জেনারেটর ফাংশন কাস্টম ইমোজি সহ
def execute_welcome_flow(chat_id, first_name, user_id):
    welcome_text = (
        f"<tg-emoji emoji-id='5199885118214255386'>👋</tg-emoji> Welcome to {first_name}\n\n"
        f"<tg-emoji emoji-id='4958479549265347295'>⚡</tg-emoji> Fast delivery\n"
        f"<tg-emoji emoji-id='6080208278359383181'>🔒</tg-emoji> Secure numbers\n"
        f"<tg-emoji emoji-id='6080319174414965424'>♻️</tg-emoji> Change anytime\n\n"
        f"<tg-emoji emoji-id='6079916671554820266'>👇</tg-emoji> Choose an option below to begin:"
    )
    markup = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    
    get_num_btn = KeyboardButton("GET NUMBER")
    get_num_btn.icon_custom_emoji_id = "6077611369333532073"
    markup.add(get_num_btn)
    
    if user_id in ADMIN_LIST:
        admin_btn = KeyboardButton("ADMIN PANEL ⚙️")
        markup.add(admin_btn)
        
    bot.send_message(chat_id, welcome_text, reply_markup=markup, parse_mode="HTML")

# --- টেলিগ্রাম বট কমান্ড হ্যান্ডলারসমূহ ---

@bot.message_handler(commands=['start'])
def send_welcome(message):
    chat_id = message.chat.id
    user_id = message.from_user.id
    user_name = message.from_user.first_name
    
    save_user(user_id, message.from_user.username, user_name)

    if len(message.text.split()) > 1:
        param = message.text.split()[1]
        if param.startswith("rng_"):
            parts = param.replace("rng_", "").split("_")
            target_range = parts[0]
            country = " ".join(parts[1:]) if len(parts) > 1 else "Ivory Coast"
            USER_PREFERENCES[chat_id] = {"service": "WhatsApp", "country": country, "locked_range": target_range}
            
            if not check_user_joined(user_id):
                force_markup = InlineKeyboardMarkup(row_width=1)
                force_markup.add(
                    InlineKeyboardButton("CHANNEL JOIN", url=CHANNEL_LINK),
                    InlineKeyboardButton("VERIFIED JOIN✅", callback_data="check_join_status")
                )
                bot.send_message(chat_id, "Please join the channel.", reply_markup=force_markup)
                return
                
            generate_two_numbers(chat_id, target_range, country, None)
            return

    if check_user_joined(user_id):
        execute_welcome_flow(chat_id, user_name, user_id)
    else:
        force_markup = InlineKeyboardMarkup(row_width=1)
        force_markup.add(
            InlineKeyboardButton("CHANNEL JOIN", url=CHANNEL_LINK),
            InlineKeyboardButton("VERIFIED JOIN✅", callback_data="check_join_status")
        )
        bot.send_message(chat_id, "Please join the channel.", reply_markup=force_markup)

@bot.message_handler(func=lambda m: True)
def main_buttons(message):
    chat_id = message.chat.id
    user_id = message.from_user.id
    
    save_user(user_id, message.from_user.username, message.from_user.first_name)
    
    if not check_user_joined(user_id):
        force_markup = InlineKeyboardMarkup(row_width=1)
        force_markup.add(
            InlineKeyboardButton("CHANNEL JOIN", url=CHANNEL_LINK),
            InlineKeyboardButton("VERIFIED JOIN✅", callback_data="check_join_status")
        )
        bot.send_message(chat_id, "Please join the channel.", reply_markup=force_markup)
        return

    if message.text == "GET NUMBER":
        srv_text = "<tg-emoji emoji-id='6077862745179430437'>🔍</tg-emoji> Select Your service <tg-emoji emoji-id='6079916671554820266'>⚙️</tg-emoji>"
        markup = InlineKeyboardMarkup(row_width=1)
        
        whatsapp_btn = InlineKeyboardButton("WhatsApp", callback_data="srv_WhatsApp", icon_custom_emoji_id="5334998226636390258", style="primary")
        facebook_btn = InlineKeyboardButton("Facebook", callback_data="srv_Facebook", icon_custom_emoji_id="5323261730283863478", style="success")
        
        markup.add(whatsapp_btn, facebook_btn)
        bot.send_message(chat_id, srv_text, reply_markup=markup, parse_mode="HTML")
        
    elif message.text == "ADMIN PANEL ⚙️":
        if user_id in ADMIN_LIST:
            admin_msg = "⚙️ **Welcome Admin! Control Center is live.**\n\Gunakan opsi di bawah ini untuk mengontrol bot: "
            markup = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
            markup.add(KeyboardButton("👤 Daftar pengguna "), KeyboardButton("📢 Pesan Siaran "))
            markup.add(KeyboardButton("➕ Tambah admin "), KeyboardButton("🔙 Menu utama "))
            bot.send_message(chat_id, admin_msg, reply_markup=markup, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, "❌ This panel is only for Admin.")
            
    elif message.text == "👤 Daftar pengguna " and user_id in ADMIN_LIST:
        if not REGISTERED_USERS:
            bot.send_message(chat_id, "🤖 Tidak ditemukan pengguna terdaftar.")
            return
        user_list_text = "📊 **Daftar total pengguna terdaftar bot :**\n\n"
        for uid, uname in REGISTERED_USERS.items():
            user_list_text += f"🔹 ID: `{uid}` - User: {uname}\n"
        bot.send_message(chat_id, user_list_text, parse_mode="Markdown")
        
    elif message.text == "📢 Pesan siaran " and user_id in ADMIN_LIST:
        msg = bot.send_message(chat_id, "✍️ Tulis pesan Anda untuk dikirim ke semua pengguna:") bot.register_next_step_handler(msg, process_broadcast_action)
        
    elif message.text == "➕ Tambahkan admin " and user_id in ADMIN_LIST: msg = bot.send_message(chat_id, "🆔 নBerikan ID obrolan (Chat ID) admin baru:") bot.register_next_step_handler(msg, process_add_admin)
        
    elif message.text == "🔙 Menu utama":
        execute_welcome_flow(chat_id, message.from_user.first_name, user_id)

def process_broadcast_action(message):
    if not REGISTERED_USERS:
        bot.send_message(message.chat.id, "❌ Tidak ada pengguna untuk disiarkan.")
        return broadcast_text = message.text
    success_count = 0
    
    for user_id in list(REGISTERED_USERS.keys()):
        try:
            bot.send_message(user_id, broadcast_text)
            success_count += 1
            time.sleep(0.05)
        except:
            pass
            
bot.send_message(
    message.chat.id, 
    f"📢 Siaran berhasil diselesaikan!\n"
    f"🎯Dikirim ke total {success_count} pengguna"
)

def process_add_admin(message):
    try:
        new_id = int(message.text.strip())
        ADMIN_LIST.add(new_id)
        bot.send_message(message.chat.id, f"✅ ID admin baru `{new_id}` berhasil ditambahkan. ", parse_mode="Markdown")
    except ValueError:
        bot.send_message(message.chat.id, "❌ Format ID salah! Harap masukkan hanya angka.")

@bot.callback_query_handler(func=lambda call: True)
def callback_processor(call):
    chat_id = call.message.chat.id
    msg_id = call.message.message_id
    user_id = call.from_user.id
    
    if call.data == "check_join_status":
        if check_user_joined(user_id):
            try:
                bot.delete_message(chat_id, msg_id)
            except: pass
            execute_welcome_flow(chat_id, call.from_user.first_name, user_id)
        else:
            bot.answer_callback_query(call.id, "❌ Anda belum bergabung dengan channel! Silakan bergabung.", show_alert=True)
        return

    if not check_user_joined(user_id):
        bot.answer_callback_query(call.id, "❌ ACTION DITOLAK! Bergabunglah dengan saluran terlebih dahulu.", show_alert=True)
        return

    current_data = call.data

    if current_data.startswith("srv_"):
        service = current_data.replace("srv_", "")
        USER_PREFERENCES[chat_id] = {"service": service}
        
        countries = [c for c in list(SAVED_COUNTRIES[service]) if "postpaid" not in c.lower()]
        if not countries:
            countries = ["Ivory Coast"]
            SAVED_COUNTRIES[service].add("Ivory Coast")
            LATEST_RANGES[service]["Ivory Coast"] = "22507"
            
        service_emoji_id = EMOJI_SERVICE_WHATSAPP if service == "WhatsApp" else EMOJI_SERVICE_FACEBOOK
        country_header = f"<tg-emoji emoji-id='{service_emoji_id}'>📱</tg-emoji> Select Your country <tg-emoji emoji-id='6079916671554820266'>🌍</tg-emoji>"
        
        markup = InlineKeyboardMarkup(row_width=2)
        for i, c in enumerate(countries):
            flag = COUNTRY_FLAGS.get(c, "🌍")
            btn = InlineKeyboardButton(f"{flag} {c}", callback_data=f"cnt_{c}")
            btn.style = "success" if i % 2 == 0 else "primary"
            markup.add(btn)
            
        bot.edit_message_text(country_header, chat_id=chat_id, message_id=msg_id, reply_markup=markup, parse_mode="HTML")
        
    elif current_data.startswith("cnt_"):
        country = current_data.replace("cnt_", "")
        service = USER_PREFERENCES.get(chat_id, {}).get("service", "WhatsApp")
        
        if chat_id not in USER_PREFERENCES:
            USER_PREFERENCES[chat_id] = {}
        USER_PREFERENCES[chat_id]["country"] = country
        
        target_range = LATEST_RANGES[service].get(country, "22507")
        USER_PREFERENCES[chat_id]["locked_range"] = target_range
        
        try:
            bot.delete_message(chat_id, msg_id)
        except: pass
            
        generate_two_numbers(chat_id, target_range, country, edit_msg_id=None)
        
    elif current_data == "change_number":
        country = USER_PREFERENCES.get(chat_id, {}).get("country", "Ivory Coast")
        service = USER_PREFERENCES.get(chat_id, {}).get("service", "WhatsApp")
        
        target_range = USER_PREFERENCES.get(chat_id, {}).get("locked_range")
        if not target_range:
            target_range = LATEST_RANGES[service].get(country, "22507")
            USER_PREFERENCES[chat_id]["locked_range"] = target_range
        
        generate_two_numbers(chat_id, target_range, country, msg_id)
        
    elif current_data == "change_country":
        service = USER_PREFERENCES.get(chat_id, {}).get("service", "WhatsApp")
        countries = [c for c in list(SAVED_COUNTRIES[service]) if "postpaid" not in c.lower()]
        
        service_emoji_id = EMOJI_SERVICE_WHATSAPP if service == "WhatsApp" else EMOJI_SERVICE_FACEBOOK
        country_header = f"<tg-emoji emoji-id='{service_emoji_id}'>📱</tg-emoji> Select Your country <tg-emoji emoji-id='6079916671554820266'>🌍</tg-emoji>"
        
        markup = InlineKeyboardMarkup(row_width=2)
        for i, c in enumerate(countries):
            flag = COUNTRY_FLAGS.get(c, "🌍")
            btn = InlineKeyboardButton(f"{flag} {c}", callback_data=f"cnt_{c}")
            btn.style = "success" if i % 2 == 0 else "primary"
            markup.add(btn)
        bot.edit_message_text(country_header, chat_id=chat_id, message_id=msg_id, reply_markup=markup, parse_mode="HTML")

# ২ টি লাইভ নাম্বার জেনারেট এবং ফুল কাস্টমাইজড কালার ইন্টারফেস জেনারেটর
def generate_two_numbers(chat_id, target_range, country, edit_msg_id=None):
    service = USER_PREFERENCES.get(chat_id, {}).get("service", "WhatsApp")
    
    num1_data = buy_number_api(target_range)
    time.sleep(0.2)
    num2_data = buy_number_api(target_range)
    
    n1 = num1_data.get("full_number") if num1_data else None
    n2 = num2_data.get("full_number") if num2_data else None
    
    if not n1: n1 = f"+{target_range}2373936"
    if not n2: n2 = f"+{target_range}7483921"
    
    if not n1.startswith("+"): n1 = f"+{n1}"
    if not n2.startswith("+"): n2 = f"+{n2}"
    
    clean_n1 = n1.replace("+", "").replace(" ", "").strip()
    clean_n2 = n2.replace("+", "").replace(" ", "").strip()
    
    ACTIVE_NUMBERS_POOL.add(clean_n1)
    ACTIVE_NUMBERS_POOL.add(clean_n2)
    TRACKED_NUMBERS_HISTORY[clean_n1] = {"chat_id": chat_id, "service": service, "country": country}
    TRACKED_NUMBERS_HISTORY[clean_n2] = {"chat_id": chat_id, "service": service, "country": country}
    
    flag = COUNTRY_FLAGS.get(country, "🇨🇮")
    service_emoji_id = EMOJI_SERVICE_WHATSAPP if service == "WhatsApp" else EMOJI_SERVICE_FACEBOOK
    
    display_msg = f"<tg-emoji emoji-id='{service_emoji_id}'>📱</tg-emoji> NEW NUMBER"
    
    markup = InlineKeyboardMarkup(row_width=1)
    
    markup.add(
        InlineKeyboardButton(text=f"{flag} {n1}", copy_text=types.CopyTextButton(text=n1)),
        InlineKeyboardButton(text=f"{flag} {n2}", copy_text=types.CopyTextButton(text=n2))
    )
    
    btn_change_num = InlineKeyboardButton("Change Number", callback_data="change_number", icon_custom_emoji_id="6077862745179430437", style="danger")
    btn_change_cnt = InlineKeyboardButton("Country Change", callback_data="change_country", icon_custom_emoji_id="6077868491845673328", style="primary")
    btn_otp_group = InlineKeyboardButton("OTP GROUP", url=OTP_GROUP_LINK, icon_custom_emoji_id="4956290155326473271", style="success")
    
    markup.add(btn_change_num, btn_change_cnt, btn_otp_group)
    
    if edit_msg_id:
        try:
            bot.edit_message_text(display_msg, chat_id=chat_id, message_id=edit_msg_id, reply_markup=markup, parse_mode="HTML")
        except:
            bot.send_message(chat_id, display_msg, reply_markup=markup, parse_mode="HTML")
    else:
        bot.send_message(chat_id, display_msg, reply_markup=markup, parse_mode="HTML")

# ব্যাকগ্রাউন্ড ডেমন থ্রেড এক্সিকিউটর
def start_background_threads():
    def console_loop():
        while True:
            fetch_live_console_data()
            time.sleep(15)
            
    threading.Thread(target=console_loop, daemon=True).start()
    threading.Thread(target=check_live_otp_inbox, daemon=True).start()

if __name__ == '__main__':
    print("Starting Orbit Sms X Bot [API 9.4 + 7.1 UX Engine Loaded]...")
    start_background_threads()
    bot.infinity_polling()