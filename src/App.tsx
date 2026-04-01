import React, { useState, useEffect, useRef } from "react";
import { 
  Home, 
  MessageCircle, 
  BookOpen, 
  Sun, 
  Trophy, 
  Settings, 
  ChevronLeft, 
  ArrowRight, 
  Search, 
  Plus, 
  Send, 
  Info, 
  Users, 
  Moon, 
  Calculator, 
  Scale, 
  Book, 
  Star, 
  Brain, 
  Phone, 
  Mail, 
  MessageSquare,
  X,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  CloudRain,
  ChevronDown,
  ChevronUp,
  Volume1,
  VolumeX,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  RefreshCw,
  Volume1 as VolumeHigh,
  Compass,
  Coins,
  CalendarDays,
  Map as MapIcon,
  Music,
  Bell,
  RotateCcw,
  History,
  Languages,
  ArrowLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { GoogleGenAI } from "@google/genai";
import { cn } from "./lib/utils";
import { Coordinates, CalculationMethod, PrayerTimes, Qibla } from "adhan";
import { format, addMinutes } from "date-fns";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  handleFirestoreError,
  OperationType
} from "./firebase";
import { 
  SURAHS, 
  HADITHS, 
  QUESTIONS, 
  BIO, 
  FATWAS, 
  INHERITANCE_MEMBERS,
  PRAYER_AUDIO,
  RECITERS,
  RAIN_SOUND_URL,
  DHIKR_CATEGORIES,
  DHIKRS,
  ADHAN_RECITERS,
  ALLAH_NAMES
} from "./constants";
import { Surah, Hadith, Question, BioSection, Fatwa, Reciter, Dhikr, DhikrCategory } from "./types";

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Page = "home" | "qa" | "bio" | "had" | "qz" | "dhikr";
type SubPage = "ai" | "qr" | "fw" | "inh" | "set" | "abt" | "abus" | "bang" | "all" | "qibla" | "zakat" | "tasbih" | "hijri" | "mosque" | "ramadan" | null;

// Islamic Decorative Number Component
function IslamicNumber({ num, className }: { num: number | string; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center shrink-0", className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-gold drop-shadow-sm">
        <path 
          d="M50 5 L65 20 L80 20 L80 35 L95 50 L80 65 L80 80 L65 80 L50 95 L35 80 L20 80 L20 65 L5 50 L20 35 L20 20 L35 20 Z" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="opacity-40" />
      </svg>
      <span className="text-gold-dark font-black text-[11px] z-10 font-sans">{num}</span>
    </div>
  );
}

// Logo Component
const Logo = ({ className, light = false, size = "md" }: { className?: string; light?: boolean; size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizes = {
    sm: { container: "w-8 h-8", svg: "w-7 h-7", text: "text-lg", sub: "text-[8px]" },
    md: { container: "w-10 h-10", svg: "w-9 h-9", text: "text-xl", sub: "text-[10px]" },
    lg: { container: "w-16 h-16", svg: "w-14 h-14", text: "text-3xl", sub: "text-xs" },
    xl: { container: "w-32 h-32", svg: "w-28 h-28", text: "text-5xl", sub: "text-lg" }
  };
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className, size === "xl" && "flex-col gap-6")}>
      <div className={cn("relative flex items-center justify-center bg-white/10 rounded-2xl backdrop-blur-sm shadow-inner", s.container)}>
        <svg viewBox="0 0 100 100" className={cn(s.svg, light ? "text-gold" : "text-[#2A8B8B]")}>
          {/* Arch/Dome Shape */}
          <path 
            d="M50 10 C 30 10, 20 30, 20 50 L 20 70 L 80 70 L 80 50 C 80 30, 70 10, 50 10 Z" 
            fill="none" 
            stroke={light ? "#D4AF37" : "#B8860B"} 
            strokeWidth="4" 
            className="opacity-40"
          />
          {/* Sirat Text Style Path */}
          <path 
            d="M25 60 Q 50 65, 75 60" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          {/* Decorative accents */}
          <path d="M40 30 L50 20 L60 30" fill="none" stroke="#D4AF37" strokeWidth="2" />
        </svg>
      </div>
      <div className={cn("flex flex-col leading-none", size === "xl" && "items-center text-center")}>
        <span className={cn(s.text, "font-black tracking-tight", light ? "text-white" : "text-[#2A8B8B]")}>Sirat Guide</span>
        <span className={cn(s.sub, "font-bold opacity-80", light ? "text-gold" : "text-[#B8860B]")}>ڕێبەری سیڕات</span>
      </div>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [currentSubPage, setCurrentSubPage] = useState<SubPage>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  
  // New States
  const [tasbihCount, setTasbihCount] = useState(0);
  const [zakatAmount, setZakatAmount] = useState<number>(0);
  const [zakatResult, setZakatResult] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [qiblaDir, setQiblaDir] = useState<number>(0);
  const [hijriDate, setHijriDate] = useState<string>("");
  const [isCompassPermissionGranted, setIsCompassPermissionGranted] = useState<boolean | null>(null);

  const handleOrientation = (e: any) => {
    let heading = null;
    
    if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
      heading = e.webkitCompassHeading;
    } else if (e.alpha !== null && e.alpha !== undefined) {
      // Use absolute alpha if available, otherwise fallback to relative alpha
      heading = e.absolute ? (360 - e.alpha) : e.alpha;
    }
    
    if (heading !== null) {
      setCompassHeading(heading);
      setIsCompassPermissionGranted(true);
    }
  };

  const requestCompassPermission = async () => {
    // @ts-ignore
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // @ts-ignore
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setIsCompassPermissionGranted(true);
          window.addEventListener('deviceorientation', handleOrientation, true);
          showToast("کۆمپاس چالاک کرا");
        } else {
          setIsCompassPermissionGranted(false);
          showToast("ڕێگری کرا! تکایە لە ڕێکخستنەکان ڕێگەی پێ بدە");
        }
      } catch (error) {
        console.error(error);
        setIsCompassPermissionGranted(false);
        showToast("هەڵەیەک ڕوویدا");
      }
    } else {
      // Android or browsers that don't require permission
      setIsCompassPermissionGranted(true);
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      showToast("کۆمپاس چالاک کرا");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      console.log("Attempting login...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login successful:", result.user.email);
      showToast("بە سەرکەوتوویی چوویتە ژوورەوە");
    } catch (error: any) {
      console.error("Login failed:", error);
      // Handle specific errors like popup blocked
      if (error.code === "auth/popup-blocked") {
        showToast("تکایە ڕێگە بدە بە پۆپ-ئەپ (Pop-up) لە وێبگەڕەکەتدا");
      } else if (error.code === "auth/cancelled-popup-request") {
        // User closed the popup, no need for toast
      } else {
        showToast(`هەڵەیەک ڕوویدا: ${error.message || "کێشەیەک هەیە"}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("بە سەرکەوتوویی چوویتە دەرەوە");
    } catch (error) {
      console.error("Logout failed", error);
      showToast("هەڵەیەک ڕوویدا لە کاتی چوونە دەرەوە");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Home Data
  const [dailyVerse, setDailyVerse] = useState({ t: "", r: "" });
  const [dailyHadith, setDailyHadith] = useState<Hadith | null>(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Prayer Times State
  const [selectedCity, setSelectedCity] = useState<string>("Erbil");
  const [isAdhanEnabled, setIsAdhanEnabled] = useState<boolean>(false);
  const [selectedAdhanId, setSelectedAdhanId] = useState<string>("makkah");
  const [manualOffsets, setManualOffsets] = useState<Record<string, number>>({
    fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0
  });
  const [lastPlayedPrayer, setLastPlayedPrayer] = useState<string | null>(null);
  const [apiTimings, setApiTimings] = useState<Record<string, string> | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [adhanNotification, setAdhanNotification] = useState<{ name: string; time: string } | null>(null);
  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentSubPage === "qibla") {
      // Calculate Qibla
      if (userCoords) {
        const coords = new Coordinates(userCoords.lat, userCoords.lng);
        const qibla = Qibla(coords);
        setQiblaDir(qibla);
      } else {
        // Default for Slemani if no GPS
        const coords = new Coordinates(35.5558, 45.4329);
        const qibla = Qibla(coords);
        setQiblaDir(qibla);
      }

      // Check if permission is already granted or not needed
      if (!(typeof DeviceOrientationEvent !== 'undefined' && 
          // @ts-ignore
          typeof DeviceOrientationEvent.requestPermission === 'function')) {
        window.addEventListener('deviceorientation', handleOrientation, true);
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      }

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('deviceorientationabsolute', handleOrientation);
      };
    }
  }, [currentSubPage, userCoords]);

  const adhanAudioUrl = ADHAN_RECITERS.find(r => r.id === selectedAdhanId)?.url || ADHAN_RECITERS[0].url;

  const cities = {
    "Erbil": { name: "هەولێر", coords: [36.1911, 44.0092], offsets: { fajr: 2, dhuhr: 1, asr: 1, maghrib: 2, isha: 2 }, country: "Iraq" },
    "Sulaymaniyah": { name: "سلێمانی", coords: [35.5558, 45.4329], offsets: { fajr: -4, dhuhr: 0, asr: 0, maghrib: 1, isha: 1 }, country: "Iraq" },
    "Duhok": { name: "دهۆک", coords: [36.8601, 42.9903], offsets: { fajr: 3, dhuhr: 2, asr: 2, maghrib: 3, isha: 3 }, country: "Iraq" },
    "Kirkuk": { name: "کەرکوک", coords: [35.4681, 44.3922], offsets: { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 }, country: "Iraq" },
    "Halabja": { name: "هەڵەبجە", coords: [35.1777, 45.9861], offsets: { fajr: -5, dhuhr: -1, asr: -1, maghrib: 0, isha: 0 }, country: "Iraq" },
    "Zakho": { name: "زاخۆ", coords: [37.1436, 42.6876], offsets: { fajr: 4, dhuhr: 3, asr: 3, maghrib: 4, isha: 4 }, country: "Iraq" },
    "Soran": { name: "سۆران", coords: [36.6547, 44.5318], offsets: { fajr: 1, dhuhr: 0, asr: 0, maghrib: 1, isha: 1 }, country: "Iraq" },
    "Ranya": { name: "ڕانیە", coords: [36.2551, 44.8824], offsets: { fajr: -2, dhuhr: -1, asr: -1, maghrib: 0, isha: 0 }, country: "Iraq" },
    "Kalar": { name: "کەلار", coords: [34.6333, 45.3167], offsets: { fajr: -3, dhuhr: -1, asr: -1, maghrib: 0, isha: 0 }, country: "Iraq" },
    "Akre": { name: "ئاکرێ", coords: [36.7422, 43.8933], offsets: { fajr: 2, dhuhr: 1, asr: 1, maghrib: 2, isha: 2 }, country: "Iraq" }
  };

  const fetchPrayerTimesFromApi = async (city: string, country: string, lat?: number, lng?: number) => {
    setIsApiLoading(true);
    try {
      let url = "";
      const dateStr = format(new Date(), "dd-MM-yyyy");
      if (lat && lng) {
        url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=3`;
      } else {
        url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=${country}&method=3`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 200) {
        setApiTimings(data.data.timings);
      }
    } catch (error) {
      console.error("Failed to fetch prayer times from API", error);
    } finally {
      setIsApiLoading(false);
    }
  };

  useEffect(() => {
    const cityData = cities[selectedCity as keyof typeof cities];
    if (isGpsActive && userCoords) {
      fetchPrayerTimesFromApi(selectedCity, cityData.country, userCoords.lat, userCoords.lng);
    } else {
      fetchPrayerTimesFromApi(selectedCity, cityData.country);
    }
  }, [selectedCity, userCoords, isGpsActive]);

  // Auto-update at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      const cityData = cities[selectedCity as keyof typeof cities];
      if (isGpsActive && userCoords) {
        fetchPrayerTimesFromApi(selectedCity, cityData.country, userCoords.lat, userCoords.lng);
      } else {
        fetchPrayerTimesFromApi(selectedCity, cityData.country);
      }
    }, timeToMidnight);

    return () => clearTimeout(timer);
  }, [currentTime, selectedCity, isGpsActive, userCoords]);

  const handleGpsToggle = () => {
    if (!isGpsActive) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
            setIsGpsActive(true);
            setToast("شوێنی ئێستات چالاک کرا");
          },
          (error) => {
            console.error("GPS Error", error);
            setToast("نەتوانرا شوێنی ئێستا دیاری بکرێت");
          }
        );
      } else {
        setToast("گەڕان بەدوای شوێن لەم وێبگەڕەدا پشتگیری ناکرێت");
      }
    } else {
      setIsGpsActive(false);
      setUserCoords(null);
      setToast("گەڕان بەدوای شوێن ناچالاک کرا");
    }
  };

  const getDayName = (date: Date) => {
    const days = ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];
    return days[date.getDay()];
  };

  const getPrayerTimes = (cityKey: string, date: Date = new Date()) => {
    // If API timings are available, use them for 100% accuracy as requested
    if (apiTimings) {
      const parseApiTime = (timeStr: string, d: Date) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const res = new Date(d);
        res.setHours(hours, minutes, 0, 0);
        return res;
      };

      const fajr = parseApiTime(apiTimings.Fajr, date);
      const sunrise = parseApiTime(apiTimings.Sunrise, date);
      const dhuhr = parseApiTime(apiTimings.Dhuhr, date);
      const asr = parseApiTime(apiTimings.Asr, date);
      const maghrib = parseApiTime(apiTimings.Maghrib, date);
      const isha = parseApiTime(apiTimings.Isha, date);

      const allTimes = [
        { name: "fajr", time: fajr },
        { name: "sunrise", time: sunrise },
        { name: "dhuhr", time: dhuhr },
        { name: "asr", time: asr },
        { name: "maghrib", time: maghrib },
        { name: "isha", time: isha }
      ];

      let next = "fajr";
      let isNextDay = true;
      for (let i = 0; i < allTimes.length; i++) {
        if (allTimes[i].time > date) {
          next = allTimes[i].name;
          isNextDay = false;
          break;
        }
      }

      // If all prayers passed today, the next Fajr is tomorrow
      if (isNextDay) {
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Note: For 100% accuracy, we should fetch tomorrow's timings too, 
        // but for now we assume tomorrow's Fajr is similar or we refresh at midnight.
        // To be safe, we return today's Fajr + 24h as a placeholder until midnight refresh.
        const nextFajr = new Date(fajr);
        nextFajr.setDate(nextFajr.getDate() + 1);
        return { fajr, sunrise, dhuhr, asr, maghrib, isha, next: "fajr", nextTime: nextFajr };
      }

      return { fajr, sunrise, dhuhr, asr, maghrib, isha, next, nextTime: allTimes.find(t => t.name === next)?.time || fajr };
    }

    // Fallback to local library if API fails or is loading
    const city = cities[cityKey as keyof typeof cities];
    const coords = isGpsActive && userCoords ? [userCoords.lat, userCoords.lng] : city.coords;
    const coordinates = new Coordinates(coords[0], coords[1]);
    
    // Using manual angles to match Kurdistan Ministry of Endowment standards
    const params = CalculationMethod.Other();
    params.fajrAngle = 18.5;
    params.ishaAngle = 17.5;
    
    const prayerTimes = new PrayerTimes(coordinates, date, params);
    
    // Adding city-specific offsets to match local Ministry of Endowment times perfectly
    const adjustTime = (time: Date, minutes: number, manual: number = 0) => addMinutes(time, minutes + manual);
    
    const fajr = adjustTime(prayerTimes.fajr, city.offsets.fajr, manualOffsets.fajr);
    const sunrise = prayerTimes.sunrise;
    const dhuhr = adjustTime(prayerTimes.dhuhr, city.offsets.dhuhr, manualOffsets.dhuhr);
    const asr = adjustTime(prayerTimes.asr, city.offsets.asr, manualOffsets.asr);
    const maghrib = adjustTime(prayerTimes.maghrib, city.offsets.maghrib, manualOffsets.maghrib);
    const isha = adjustTime(prayerTimes.isha, city.offsets.isha, manualOffsets.isha);

    const allTimes = [
      { name: "fajr", time: fajr },
      { name: "sunrise", time: sunrise },
      { name: "dhuhr", time: dhuhr },
      { name: "asr", time: asr },
      { name: "maghrib", time: maghrib },
      { name: "isha", time: isha }
    ];

    let next = "fajr";
    for (let i = 0; i < allTimes.length; i++) {
      if (allTimes[i].time > date) {
        next = allTimes[i].name;
        break;
      }
    }
    
    return {
      fajr,
      sunrise,
      dhuhr,
      asr,
      maghrib,
      isha,
      next
    };
  };

  useEffect(() => {
    if (isAdhanEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isAdhanEnabled]);

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { 
          body, 
          icon: "https://ais-dev-j2nruk5ktpksa2xhubqtvg-193272399390.europe-west2.run.app/logo.png",
          tag: "prayer-time"
        });
      } catch (e) {
        console.error("Notification error", e);
      }
    }
  };

  useEffect(() => {
    const checkPrayerTime = () => {
      const times = getPrayerTimes(selectedCity, currentTime);
      const now = new Date();
      const nowStr = format(now, "HH:mm");

      const prayerNames = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      const prayerKurdishNames: Record<string, string> = {
        fajr: "بەیانی",
        dhuhr: "نیوەڕۆ",
        asr: "عەسر",
        maghrib: "ئێوارە",
        isha: "خەوتنان"
      };
      
      for (const name of prayerNames) {
        const prayerTime = times[name as keyof typeof times] as Date;
        if (format(prayerTime, "HH:mm") === nowStr && lastPlayedPrayer !== name) {
          if (isAdhanEnabled) {
            if (adhanAudioRef.current) {
              adhanAudioRef.current.load();
              adhanAudioRef.current.play().catch(e => console.log("Audio playback blocked", e));
            }
            showNotification(`کاتی بانگی ${prayerKurdishNames[name]}`, `ئێستا کاتی بانگی ${prayerKurdishNames[name]}یە لە شاری ${cities[selectedCity as keyof typeof cities].name}`);
          }
          
          // Show Adhan Notification Alert
          setAdhanNotification({ name: prayerKurdishNames[name], time: nowStr });
          
          setLastPlayedPrayer(name);
          setTimeout(() => setLastPlayedPrayer(null), 61000);
          break;
        }
      }
    };

    const interval = setInterval(checkPrayerTime, 5000); 
    return () => clearInterval(interval);
  }, [isAdhanEnabled, selectedCity, lastPlayedPrayer, selectedAdhanId, apiTimings, currentTime]);

  // Q&A State
  const [qaCategory, setQaCategory] = useState("هەمووی");
  const [qaInput, setQaInput] = useState("");
  const [qaResults, setQaResults] = useState<{ q: string; a: string; c: string }[]>([]);

  // Hadith State
  const [hadithTopic, setHadithTopic] = useState("هەمووی");
  const [hadithSearch, setHadithSearch] = useState("");
  const [hadithLimit, setHadithLimit] = useState(10);

  // Quran State
  const [surahSearch, setSurahSearch] = useState("");
  const [surahFilter, setSurahFilter] = useState("all");
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [expandedAyahs, setExpandedAyahs] = useState<Set<number>>(new Set());
  const [ayahs, setAyahs] = useState<{ ar: string; ku: string }[]>([]);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState(false);

  // Fatwa State
  const [fatwaCategory, setFatwaCategory] = useState("هەمووی");

  // Inheritance State
  const [inheritanceValues, setInheritanceValues] = useState<Record<string, number>>({});
  const [inheritanceResult, setInheritanceResult] = useState<{ label: string; share: string }[] | null>(null);

  // Audio States
  const [isPlayingQuran, setIsPlayingQuran] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const quranAudioRef = useRef<HTMLAudioElement | null>(null);

  const getSurahAudioUrl = (surahNum: number) => {
    const paddedNum = surahNum.toString().padStart(3, '0');
    return `https://download.quranicaudio.com/quran/${selectedReciter.slug}/${paddedNum}.mp3`;
  };

  const toggleQuranAudio = () => {
    if (!quranAudioRef.current) return;
    if (isPlayingQuran) {
      quranAudioRef.current.pause();
    } else {
      quranAudioRef.current.play().catch(e => console.error("Audio play error:", e));
    }
    setIsPlayingQuran(!isPlayingQuran);
  };

  const handleAudioTimeUpdate = () => {
    if (quranAudioRef.current) {
      const progress = (quranAudioRef.current.currentTime / quranAudioRef.current.duration) * 100;
      setAudioProgress(progress || 0);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (quranAudioRef.current) {
      setAudioDuration(quranAudioRef.current.duration);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (quranAudioRef.current) {
      const time = (parseFloat(e.target.value) / 100) * quranAudioRef.current.duration;
      quranAudioRef.current.currentTime = time;
      setAudioProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleAyahTafsir = (id: number) => {
    const newSet = new Set(expandedAyahs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedAyahs(newSet);
  };

  const formatText = (text: string) => {
    if (!text) return "";
    const regex = /(پێغەمبەر|پێخەمبەر|محەمەد|رسول الله|نبي|پێغەمبەری|پێخەمبەری)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.match(regex)) {
        return <React.Fragment key={i}>{part} <span className="text-gold font-bold">ﷺ</span></React.Fragment>;
      }
      return part;
    });
  };

  useEffect(() => {
    // Reset Quran audio when surah or reciter changes
    if (quranAudioRef.current) {
      quranAudioRef.current.pause();
      quranAudioRef.current.load();
      setIsPlayingQuran(false);
      setAudioProgress(0);
      
      // Autoplay if surah is selected
      if (selectedSurah) {
        const playPromise = quranAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlayingQuran(true);
          }).catch(error => {
            console.log("Autoplay prevented:", error);
          });
        }
      }
    }
    setExpandedAyahs(new Set());

    // Fetch Ayahs if surah is selected
    if (selectedSurah) {
      fetchAyahs(selectedSurah.n);
    }
  }, [selectedSurah, selectedReciter]);

  const fetchAyahs = async (num: number) => {
    setIsLoadingAyahs(true);
    setAyahs([]);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,ku.asan`);
      const data = await res.json();
      if (data.code === 200) {
        const arAyahs = data.data[0].ayahs;
        const kuAyahs = data.data[1].ayahs;
        const combined = arAyahs.map((a: any, i: number) => ({
          ar: a.text,
          ku: kuAyahs[i].text
        }));
        setAyahs(combined);
      }
    } catch (error) {
      console.error("Error fetching ayahs:", error);
      showToast("کێشەیەک لە بارکردنی ئایەتەکان ڕوویدا");
    } finally {
      setIsLoadingAyahs(false);
    }
  };

  // Quiz State
  const [quizState, setQuizState] = useState<"start" | "active" | "result">("start");
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Dhikr State
  const [selectedDhikrCategory, setSelectedDhikrCategory] = useState<string>("morning");
  const [dhikrCounters, setDhikrCounters] = useState<Record<string, number>>({});
  const [favoriteDhikrs, setFavoriteDhikrs] = useState<Set<string>>(new Set());
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<string>>(new Set());

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.settings) {
          if (data.settings.isDarkMode !== undefined) setIsDarkMode(data.settings.isDarkMode);
          if (data.settings.selectedCity) setSelectedCity(data.settings.selectedCity);
          if (data.settings.isAdhanEnabled !== undefined) setIsAdhanEnabled(data.settings.isAdhanEnabled);
          if (data.settings.selectedAdhanId) setSelectedAdhanId(data.settings.selectedAdhanId);
          if (data.settings.manualOffsets) setManualOffsets(data.settings.manualOffsets);
        }
        if (data.progress) {
          if (data.progress.dhikrCounters) setDhikrCounters(data.progress.dhikrCounters);
          if (data.progress.favoriteDhikrs) setFavoriteDhikrs(new Set(data.progress.favoriteDhikrs));
          if (data.progress.completedDhikrs) setCompletedDhikrs(new Set(data.progress.completedDhikrs));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Save data to Firestore
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const saveData = async () => {
      setIsDataSyncing(true);
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          settings: {
            isDarkMode,
            selectedCity,
            isAdhanEnabled,
            selectedAdhanId,
            manualOffsets
          },
          progress: {
            dhikrCounters,
            favoriteDhikrs: Array.from(favoriteDhikrs),
            completedDhikrs: Array.from(completedDhikrs)
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      } finally {
        setIsDataSyncing(false);
      }
    };

    const timeoutId = setTimeout(saveData, 2000); // Debounce save
    return () => clearTimeout(timeoutId);
  }, [user, isAuthReady, isDarkMode, selectedCity, isAdhanEnabled, selectedAdhanId, dhikrCounters, favoriteDhikrs, completedDhikrs]);

  const handleDhikrCount = (id: string, max: number) => {
    const current = dhikrCounters[id] || 0;
    if (current < max) {
      setDhikrCounters(prev => ({ ...prev, [id]: current + 1 }));
      if (current + 1 === max) {
        setCompletedDhikrs(prev => new Set(prev).add(id));
        showToast("تەواو بوو");
      }
    }
  };

  const resetDhikr = (id: string) => {
    setDhikrCounters(prev => ({ ...prev, [id]: 0 }));
    setCompletedDhikrs(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleFavoriteDhikr = (id: string) => {
    setFavoriteDhikrs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Daily Content
    const verses = [
      {t:"بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",r:"سورەتی فاتحە - ١"},
      {t:"اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",r:"ئایەتی کورسی - بەقەرە:٢٥٥"},
      {t:"قُلْ هُوَ اللَّهُ أَحَدٌ",r:"سورەتی ئیخلاص - ١"},
      {t:"فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",r:"سورەتی شەڕح - ٥"},
      {t:"وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",r:"سورەتی طەلاق - ٣"}
    ];
    setDailyVerse(verses[Math.floor(Math.random() * verses.length)]);
    setDailyHadith(HADITHS[Math.floor(Math.random() * HADITHS.length)]);

    // Initial Chat
    setChatMessages([
      { role: "bot", content: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ" },
      { role: "bot", content: "سڵاو! من یاریدەدەری ئیسلامیم. هەر پرسیارێکی شەرعی بکە و وەڵامت دەدەمەوە بە پشتبەستن بە قورئان و سوننەت." }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleNav = (p: Page) => {
    setCurrentPage(p);
    setCurrentSubPage(null);
    window.scrollTo(0, 0);
  };

  const handleSubNav = (s: SubPage) => {
    setCurrentSubPage(s);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  // Q&A Logic
  const handleSendQA = async () => {
    if (!qaInput.trim()) {
      showToast("تکایە پرسیارەکەت بنووسە");
      return;
    }
    
    const question = qaInput.trim();
    setQaInput("");
    setIsTyping(true);
    
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: `وەک شارەزایەکی ئیسلامی وەڵامی ئەم پرسیارە بدەرەوە بە کوردی: ${question}. تەنها وەڵامێکی کورت و ڕوون بدەرەوە بە پشتبەستن بە قورئان و سوننەت.` }] }],
      });
      const text = response.text || "ببورە، کێشەیەک ڕوویدا لە وەرگرتنی وەڵام.";
      
      setQaResults(prev => [{ q: question, a: text, c: qaCategory }, ...prev]);
      showToast("وەڵام درایەوە");
    } catch (error) {
      console.error(error);
      showToast("هەڵەیەک ڕوویدا لە وەڵامدانەوە");
    } finally {
      setIsTyping(false);
    }
  };

  // AI Chat Logic
  const handleSendChat = async () => {
    if (!chatInput.trim() || isTyping) return;
    
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);
    
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: `تۆ یاریدەدەرێکی ئیسلامی زیرەکی. وەڵامی ئەم پرسیارە بدەرەوە بە کوردی: ${userMsg}. وەڵامەکەت با کورت و دۆستانە بێت و پشت بە سەرچاوە ئیسلامییەکان ببەستێت.` }] }],
      });
      const text = response.text || "ببورە، کێشەیەک ڕوویدا لە پەیوەندی کردن.";
      
      setChatMessages(prev => [...prev, { role: "bot", content: text }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: "bot", content: "ببورە، کێشەیەک ڕوویدا لە پەیوەندی کردن." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Quiz Logic
  const startQuiz = () => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuizQuestions(shuffled);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizState("active");
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
  };

  const handleQuizAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    
    const correct = quizQuestions[currentQuizIndex].c;
    setSelectedAnswer(index);
    const isCorrect = index === correct;
    setIsAnswerCorrect(isCorrect);
    
    if (isCorrect) setQuizScore(prev => prev + 10);
    
    setTimeout(() => {
      if (currentQuizIndex + 1 < quizQuestions.length) {
        setCurrentQuizIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswerCorrect(null);
      } else {
        setQuizState("result");
      }
    }, 1000);
  };

  // Inheritance Logic
  const handleInheritanceCalc = () => {
    const v = inheritanceValues;
    const results: { label: string; share: string }[] = [];
    
    if (Object.values(v).every(val => !val || val === 0)) {
      showToast("تکایە ژمارەیەک داخڵ بکە");
      return;
    }

    if (v.h > 0) {
      results.push({ label: "هاوسەر", share: (v.sn > 0 || v.sd > 0) ? "١/٨ (١٢.٥٪)" : "١/٤ (٢٥٪)" });
    }
    if (v.f > 0) {
      results.push({ label: "باوک", share: (v.sn > 0 || v.sd > 0) ? "١/٦ (١٦.٧٪)" : "١/٣ (٣٣.٣٪)" });
    }
    if (v.m > 0) {
      results.push({ label: "دایک", share: (v.sn > 0 || v.sd > 0) ? "١/٦ (١٦.٧٪)" : "١/٣ (٣٣.٣٪)" });
    }
    if (v.sn > 0) results.push({ label: "هەر کوڕێک", share: "بەشێکی یەکسان (٢ بەش)" });
    if (v.sd > 0) results.push({ label: "هەر کچێک", share: "بەشێکی یەکسان (١ بەش)" });
    
    setInheritanceResult(results);
    showToast("حیساب کرا");
  };

  return (
    <div className={cn("min-h-screen bg-[#F5F3ED] text-[#1B1B2F] font-arabic transition-colors duration-300", isDarkMode && "dark bg-[#0C1015] text-[#E4DFD4]")} dir="rtl">
      <div className="max-w-[500px] mx-auto h-screen flex flex-col relative overflow-hidden bg-inherit shadow-2xl">
        
        {/* Splash Screen */}
        <AnimatePresence>
          {showSplash && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] bg-gradient-to-br from-[#2A8B8B] to-[#1A5B5B] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center gap-6"
              >
                <Logo size="xl" light />
                <div className="mt-8 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 bg-gold rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ y: -50, opacity: 0, x: "-50%" }}
              animate={{ y: 20, opacity: 1, x: "-50%" }}
              exit={{ y: -50, opacity: 0, x: "-50%" }}
              className="fixed top-0 left-1/2 z-[1000] bg-[#2A8B8B] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        {!currentSubPage && (
          <header className="bg-gradient-to-br from-[#2A8B8B] to-[#1A5B5B] p-4 flex items-center justify-between shrink-0 z-50 shadow-md">
            <Logo light />
            <div className="flex items-center gap-2">
              {user ? (
                <button 
                  onClick={() => handleSubNav("set")}
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 hover:border-gold/50 transition-all active:scale-90"
                >
                  <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold flex items-center gap-2 hover:bg-white/20 transition-all active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  چوونە ژوورەوە
                </button>
              )}
              {isDataSyncing && (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="text-white/40"
                >
                  <RefreshCw className="w-3 h-3" />
                </motion.div>
              )}
              <button 
                onClick={() => handleSubNav("set")}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 scroll-smooth">
          <AnimatePresence mode="wait">
            {currentPage === "home" && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Daily Verse */}
                <div className="flex flex-col items-center mb-6 pt-4">
                  <Logo size="lg" className="mb-2" />
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-[#2A8B8B] to-[#1A5B5B] p-6 rounded-2xl text-white shadow-lg">
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://picsum.photos/seed/islamic/800/800')] bg-cover" />
                  <p className="text-[10px] opacity-70 mb-1">آیەتی ڕۆژ</p>
                  <p className="text-xl font-amiri leading-relaxed mb-2 text-gold">{dailyVerse.t}</p>
                  <p className="text-[11px] opacity-80">{formatText(dailyVerse.r)}</p>
                </div>

                {/* Daily Hadith */}
                <div className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                  <p className="text-[11px] text-[#5A5A6E] dark:text-[#8B95A5] mb-1">فەرمودەی ڕۆژ</p>
                  <p className="font-amiri text-base leading-relaxed text-gold">{formatText(dailyHadith?.a || "")}</p>
                  <p className="text-[10px] text-[#B8860B] mt-2 font-bold">— {formatText(dailyHadith?.s || "")}</p>
                </div>

                {/* Grid Services */}
                <h2 className="text-sm font-extrabold mt-6 mb-2">خشتەی خزمەتگوزاریەکان</h2>
                <div className="grid grid-cols-2 gap-3">
                  <ServiceCard 
                    icon={<Clock className="w-6 h-6" />} 
                    title="بانگ" 
                    desc="کاتەکانی بانگ" 
                    color="bg-blue-50 text-blue-600" 
                    onClick={() => handleSubNav("bang")}
                  />
                  <ServiceCard 
                    icon={<Brain className="w-6 h-6" />} 
                    title="یاریدەدەری AI" 
                    desc="پرسیارت بکە" 
                    color="bg-[#E4F5EC] text-[#2A8B8B]"
                    onClick={() => handleSubNav("ai")}
                  />
                  <ServiceCard 
                    icon={<Book className="w-6 h-6" />} 
                    title="قورئان" 
                    desc="خوێندنەوەی سورەتەکان" 
                    color="bg-[#FBF5E6] text-[#B8860B]"
                    onClick={() => handleSubNav("qr")}
                  />
                  <ServiceCard 
                    icon={<Scale className="w-6 h-6" />} 
                    title="فەتوا" 
                    desc="حوکمە شەرعییەکان" 
                    color="bg-red-50 text-red-600"
                    onClick={() => handleSubNav("fw")}
                  />
                  <ServiceCard 
                    icon={<Calculator className="w-6 h-6" />} 
                    title="میرات" 
                    desc="حیسابی میرات" 
                    color="bg-purple-50 text-purple-600" 
                    onClick={() => handleSubNav("inh")}
                  />
                  <ServiceCard 
                    icon={<Star className="w-6 h-6" />} 
                    title="ناوەکانی خودا" 
                    desc="٩٩ ناوی پیرۆز" 
                    color="bg-amber-50 text-amber-600" 
                    onClick={() => handleSubNav("all")}
                  />
                  <ServiceCard 
                    icon={<Compass className="w-6 h-6" />} 
                    title="قیبلەنما" 
                    desc="دۆزینەوەی قیبلە" 
                    color="bg-teal-50 text-teal-600" 
                    onClick={() => handleSubNav("qibla")}
                  />
                  <ServiceCard 
                    icon={<Coins className="w-6 h-6" />} 
                    title="زەکات" 
                    desc="حیسابی زەکات" 
                    color="bg-yellow-50 text-yellow-600" 
                    onClick={() => handleSubNav("zakat")}
                  />
                  <ServiceCard 
                    icon={<RotateCcw className="w-6 h-6" />} 
                    title="تەسبیح" 
                    desc="تەسبیحی ئەلیکترۆنی" 
                    color="bg-teal-50 text-teal-600" 
                    onClick={() => handleSubNav("tasbih")}
                  />
                  <ServiceCard 
                    icon={<CalendarDays className="w-6 h-6" />} 
                    title="ڕۆژژمێر" 
                    desc="ڕۆژژمێری کۆچی" 
                    color="bg-indigo-50 text-indigo-600" 
                    onClick={() => handleSubNav("hijri")}
                  />
                  <ServiceCard 
                    icon={<MapIcon className="w-6 h-6" />} 
                    title="مزگەوت" 
                    desc="نزیکترین مزگەوت" 
                    color="bg-cyan-50 text-cyan-600" 
                    onClick={() => handleSubNav("mosque")}
                  />
                  <ServiceCard 
                    icon={<Moon className="w-6 h-6" />} 
                    title="ڕەمەزان" 
                    desc="بەشی ڕەمەزان" 
                    color="bg-orange-50 text-orange-600" 
                    onClick={() => handleSubNav("ramadan")}
                  />
                </div>

                {/* Quick Access */}
                <h2 className="text-sm font-extrabold mt-6 mb-2">خێراترین دەستگەیشتن</h2>
                <div className="space-y-2">
                  <QuickAccessItem 
                    icon={<MessageSquare className="w-5 h-5" />} 
                    title="پرسیار و وەڵام" 
                    desc="پرسیارە شەرعییەکان بکە" 
                    color="bg-[#E4F5EC] text-[#2A8B8B]"
                    onClick={() => handleNav("qa")}
                  />
                  <QuickAccessItem 
                    icon={<BookOpen className="w-5 h-5" />} 
                    title={formatText("ژیاننامەی پێغەمبەر")} 
                    desc={formatText("سیرەی پێغەمبەر")} 
                    color="bg-[#FBF5E6] text-[#B8860B]"
                    onClick={() => handleNav("bio")}
                  />
                  <QuickAccessItem 
                    icon={<Sun className="w-5 h-5" />} 
                    title={formatText("فەرمودەکان")} 
                    desc={formatText("فەرمودەکانی پێغەمبەر")} 
                    color="bg-amber-50 text-amber-600"
                    onClick={() => handleNav("had")}
                  />
                  <QuickAccessItem 
                    icon={<Trophy className="w-5 h-5" />} 
                    title="تاقیکردنەوە" 
                    desc="زانین خۆت بپێشێنە" 
                    color="bg-purple-50 text-purple-600"
                    onClick={() => handleNav("qz")}
                  />
                  <QuickAccessItem 
                    icon={<Sun className="w-5 h-5" />} 
                    title="زیکرەکان" 
                    desc="زیکرەکانی بەیانی و ئێوارە" 
                    color="bg-[#E4F5EC] text-[#2A8B8B]"
                    onClick={() => handleNav("dhikr")}
                  />
                </div>
              </motion.div>
            )}

            {currentPage === "qa" && (
              <motion.div 
                key="qa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <MessageSquare className="text-[#2A8B8B]" />
                  پرسیار و وەڵام
                </h2>
                <div className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                  <label className="text-xs font-bold block mb-2 text-[#1B1B2F] dark:text-[#E4DFD4]">بابەت</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {["هەمووی", "نماز", "ڕۆژوو", "زەکات", "حەج", "هاوسەری", "میرات", "خواردن", "پاککی"].map(c => (
                      <button 
                        key={c}
                        onClick={() => setQaCategory(c)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border-2",
                          qaCategory === c ? "bg-[#E4F5EC] text-[#2A8B8B] border-[#2A8B8B]" : "bg-[#EDEAE3] dark:bg-[#1A2330] text-[#1B1B2F] dark:text-[#E4DFD4] border-transparent"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={qaInput}
                    onChange={(e) => setQaInput(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-[#DDD9D0] dark:border-[#232E3B] bg-[#EDEAE3] dark:bg-[#1A2330] text-sm text-[#1B1B2F] dark:text-[#E4DFD4] focus:border-[#2A8B8B] outline-none min-h-[120px] resize-none"
                    placeholder="پرسیارەکەت لێرە بنووسە..."
                  />
                  <button 
                    onClick={handleSendQA}
                    disabled={isTyping}
                    className="w-full mt-4 bg-[#2A8B8B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isTyping ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    ناردن
                  </button>
                </div>

                <div className="space-y-3">
                  {qaResults.map((res, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex gap-4"
                    >
                      <IslamicNumber num={qaResults.length - i} className="w-10 h-10" />
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <span className="bg-[#E4F5EC] text-[#2A8B8B] px-2 py-0.5 rounded-full text-[10px] font-bold">{res.c}</span>
                        </div>
                        <h4 className="text-sm font-bold mb-2 text-gold">{formatText(res.q)}</h4>
                        <div className="text-xs leading-relaxed text-[#5A5A6E] dark:text-[#8B95A5] prose dark:prose-invert">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p>
                                    {React.Children.map(children, child => 
                                      typeof child === 'string' ? formatText(child) : child
                                    )}
                                  </p>
                                )
                              }}
                            >
                              {res.a}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentPage === "bio" && (
              <motion.div 
                key="bio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative h-48 rounded-3xl overflow-hidden shadow-lg mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&q=80&w=1000" 
                    alt="Makkah" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                    <h2 className="text-2xl font-black text-white">ژیاننامەی پێغەمبەر ﷺ</h2>
                    <p className="text-xs text-gold font-bold">محەمەد بن عەبدوڵا ﷺ</p>
                  </div>
                </div>
                {BIO.map((b, i) => (
                  <div key={i} className="bg-white dark:bg-[#151C24] p-5 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                    <h3 className="text-gold text-sm font-extrabold mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4 fill-current" />
                      {formatText(b.t)}
                    </h3>
                    <p className="text-xs leading-loose text-justify text-[#1B1B2F] dark:text-[#E4DFD4]">{formatText(b.p)}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {currentPage === "had" && (
              <motion.div 
                key="had"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <Sun className="text-amber-600" />
                  فەرمودەکان
                </h2>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A6E]" />
                  <input 
                    type="text" 
                    value={hadithSearch}
                    onChange={(e) => setHadithSearch(e.target.value)}
                    placeholder="گەڕان..." 
                    className="w-full pr-10 pl-4 py-3 rounded-full border-2 border-[#DDD9D0] dark:border-[#232E3B] bg-[#EDEAE3] dark:bg-[#1A2330] text-sm outline-none focus:border-[#2A8B8B]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["هەمووی", ...Array.from(new Set(HADITHS.map(h => h.t)))].map(t => (
                    <button 
                      key={t}
                      onClick={() => setHadithTopic(t)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border-2",
                        hadithTopic === t ? "bg-[#E4F5EC] text-[#2A8B8B] border-[#2A8B8B]" : "bg-[#EDEAE3] dark:bg-[#1A2330] text-[#5A5A6E] border-transparent"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {HADITHS
                    .filter(h => (hadithTopic === "هەمووی" || h.t === hadithTopic) && (h.a.includes(hadithSearch) || h.k.includes(hadithSearch)))
                    .slice(0, hadithLimit)
                    .map((h, i) => (
                      <div key={i} className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] border-r-4 border-r-[#B8860B] shadow-sm flex gap-4">
                        <IslamicNumber num={i + 1} className="w-10 h-10" />
                        <div className="flex-1">
                          <p className="font-amiri text-lg leading-relaxed mb-2 text-gold">{formatText(h.a)}</p>
                          <p className="text-xs text-[#5A5A6E] dark:text-[#8B95A5] leading-relaxed border-t border-[#DDD9D0] dark:border-[#232E3B] pt-2 mt-2">{formatText(h.k)}</p>
                          <p className="text-[10px] text-[#B8860B] font-bold mt-2">{h.s}</p>
                        </div>
                      </div>
                    ))}
                </div>
                {hadithLimit < HADITHS.length && (
                  <button 
                    onClick={() => setHadithLimit(prev => prev + 10)}
                    className="w-full py-3 border-2 border-[#2A8B8B] text-[#2A8B8B] rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    زیاتر ببینە
                  </button>
                )}
              </motion.div>
            )}

            {currentPage === "qz" && (
              <motion.div 
                key="qz"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {quizState === "start" && (
                  <div className="text-center space-y-4">
                    <h2 className="text-lg font-extrabold flex items-center justify-center gap-2">
                      <Trophy className="text-purple-600" />
                      تاقیکردنەوەی زانیاری
                    </h2>
                    <p className="text-xs text-[#5A5A6E] dark:text-[#8B95A5]">زانین خۆت لەسەر قورئان، فەرمودە، سیرە و تاجوود بپێشێنە</p>
                    <div className="bg-white dark:bg-[#151C24] p-8 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex flex-col items-center">
                      <Brain className="w-16 h-16 text-[#2A8B8B] mb-4" />
                      <p className="text-sm mb-1">ژمارەی پرسیارەکان: <strong>١٠</strong></p>
                      <p className="text-xs text-[#5A5A6E] mb-6">پرسیارەکان هەر جارەکی هەڕەمەکی دەبن</p>
                      <button 
                        onClick={startQuiz}
                        className="w-full bg-[#2A8B8B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"
                      >
                        دەستپێکردن
                      </button>
                    </div>
                  </div>
                )}

                {quizState === "active" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#5A5A6E]">پرسیار {currentQuizIndex + 1} لە ١٠</span>
                      <span className="font-bold text-[#2A8B8B]">خاڵ: {quizScore}</span>
                    </div>
                    <div className="h-1.5 bg-[#DDD9D0] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuizIndex + 1) / 10) * 100}%` }}
                        className="h-full bg-gradient-to-r from-[#2A8B8B] to-[#B8860B]"
                      />
                    </div>
                    <div className="bg-white dark:bg-[#151C24] p-6 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                      <h3 className="text-base font-extrabold leading-relaxed text-center text-gold">
                        {formatText(quizQuestions[currentQuizIndex]?.q)}
                      </h3>
                    </div>
                      <div className="space-y-2">
                        {quizQuestions[currentQuizIndex]?.o.map((opt, i) => (
                          <button 
                            key={i}
                            onClick={() => handleQuizAnswer(i)}
                            disabled={selectedAnswer !== null}
                            className={cn(
                              "w-full p-4 rounded-xl border-2 text-right text-sm font-medium transition-all active:scale-98",
                              selectedAnswer === null ? "bg-white dark:bg-[#151C24] border-[#DDD9D0] dark:border-[#232E3B] hover:border-[#2A8B8B]" : 
                              i === quizQuestions[currentQuizIndex].c ? "bg-teal-50 border-teal-500 text-teal-700 font-bold" :
                              selectedAnswer === i ? "bg-red-50 border-red-500 text-red-700" : "opacity-50 border-[#DDD9D0]"
                            )}
                          >
                            {formatText(opt)}
                          </button>
                        ))}
                      </div>
                  </div>
                )}

                {quizState === "result" && (
                  <div className="text-center space-y-6">
                    <div className="bg-gradient-to-br from-[#B8860B] to-[#9A7209] p-10 rounded-2xl text-white shadow-xl">
                      <Trophy className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-4xl font-black">{quizScore} لە ١٠٠</p>
                      <p className="text-sm mt-2 opacity-90">
                        {quizScore >= 80 ? "مبارەک! ئەنجامێکی نایابت بوو" : quizScore >= 50 ? "باشە بەڵام هەوڵ بدە زیاتر بخوێنیت" : "پێویستە زیاتر بخوێنیت و دووبارە هەوڵ بدەیت"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <button 
                        onClick={startQuiz}
                        className="w-full bg-[#2A8B8B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"
                      >
                        دووبارە بکەرەوە
                      </button>
                      <button 
                        onClick={() => setQuizState("start")}
                        className="w-full border-2 border-[#2A8B8B] text-[#2A8B8B] py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"
                      >
                        بگەڕێرەوە
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentPage === "dhikr" && (
              <motion.div 
                key="dhikr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <Sun className="text-[#2A8B8B]" />
                  زیکرەکان
                </h2>
                
                {/* Categories */}
                <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                  {DHIKR_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setSelectedDhikrCategory(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 flex items-center gap-2",
                        selectedDhikrCategory === cat.id 
                          ? "bg-[#2A8B8B] text-white border-[#2A8B8B]" 
                          : "bg-white dark:bg-[#151C24] text-[#5A5A6E] border-transparent shadow-sm"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Dhikr List */}
                <div className="space-y-4">
                  {DHIKRS.filter(d => d.category === selectedDhikrCategory).map((d) => (
                    <div 
                      key={d.id} 
                      className={cn(
                        "bg-white dark:bg-[#151C24] p-5 rounded-2xl border-2 transition-all shadow-sm relative overflow-hidden",
                        completedDhikrs.has(d.id) ? "border-teal-500/50 bg-teal-50/30 dark:bg-teal-900/10" : "border-[#DDD9D0] dark:border-[#232E3B]"
                      )}
                    >
                      {completedDhikrs.has(d.id) && (
                        <div className="absolute top-2 left-2 text-teal-500">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                        <button 
                          onClick={() => toggleFavoriteDhikr(d.id)}
                          className={cn("p-2 rounded-full transition-all", favoriteDhikrs.has(d.id) ? "text-red-500 bg-red-50" : "text-gray-400 hover:bg-gray-100")}
                        >
                          <Star className={cn("w-5 h-5", favoriteDhikrs.has(d.id) && "fill-current")} />
                        </button>
                        <div className="text-left">
                           <span className="text-[10px] font-bold bg-[#FBF5E6] text-[#B8860B] px-2 py-0.5 rounded-full">
                             {d.c} جار
                           </span>
                        </div>
                      </div>

                      <p className="font-amiri text-xl leading-relaxed text-center mb-4 text-gold">{d.a}</p>
                      <p className="text-sm text-[#5A5A6E] dark:text-[#8B95A5] leading-relaxed mb-3 text-center border-t border-dashed border-gray-200 pt-3">{d.k}</p>
                      <p className="text-[10px] text-gold font-bold text-center italic">{d.e}</p>

                      <div className="mt-6 flex items-center justify-center gap-4">
                        <button 
                          onClick={() => resetDhikr(d.id)}
                          className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 active:rotate-180 transition-all duration-500"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        
                        <button 
                          onClick={() => handleDhikrCount(d.id, d.c)}
                          disabled={completedDhikrs.has(d.id)}
                          className={cn(
                            "w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-all active:scale-90 shadow-lg",
                            completedDhikrs.has(d.id) 
                              ? "bg-teal-500 border-teal-600 text-white" 
                              : "bg-[#2A8B8B] border-[#1A5B5B] text-white"
                          )}
                        >
                          <span className="text-2xl font-black">{dhikrCounters[d.id] || 0}</span>
                          <span className="text-[10px] opacity-80">تەسبیح</span>
                        </button>

                        <button 
                          onClick={() => showToast("دەنگەکە بەردەست نییە")}
                          className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Sub-Pages (Overlays) */}
        <AnimatePresence>
          {currentSubPage && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-[100] bg-[#F5F3ED] dark:bg-[#0C1015] flex flex-col"
            >
              <header className="bg-gradient-to-br from-[#2A8B8B] to-[#1A5B5B] p-4 flex items-center gap-4 shrink-0 shadow-md">
                <button 
                  onClick={() => {
                    if (selectedSurah) setSelectedSurah(null);
                    else setCurrentSubPage(null);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <h2 className="text-white text-base font-extrabold flex-1">
                  {currentSubPage === "ai" && "یاریدەدەری AI ئیسلامی"}
                  {currentSubPage === "qr" && (selectedSurah ? selectedSurah.a : "قورئانی پیرۆز")}
                  {currentSubPage === "fw" && "فەتوا و حوکمە شەرعییەکان"}
                  {currentSubPage === "inh" && "حیسابی میرات"}
                  {currentSubPage === "all" && "ناوە پیرۆزەکانی خودا"}
                  {currentSubPage === "set" && "ڕێکخستنەکان"}
                  {currentSubPage === "abt" && "دەربارە"}
                  {currentSubPage === "abus" && "دەربارەی ئێمە"}
                  {currentSubPage === "qibla" && "قیبلەنما"}
                  {currentSubPage === "zakat" && "حیسابی زەکات"}
                  {currentSubPage === "tasbih" && "تەسبیحی ئەلیکترۆنی"}
                  {currentSubPage === "hijri" && "ڕۆژژمێری کۆچی"}
                  {currentSubPage === "mosque" && "نزیکترین مزگەوت"}
                  {currentSubPage === "ramadan" && "بەشی ڕەمەزان"}
                </h2>
              </header>

              <div className="flex-1 overflow-y-auto p-4">
                {currentSubPage === "ai" && (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 space-y-3 pb-4">
                      {chatMessages.map((msg, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                            msg.role === "user" ? "bg-[#2A8B8B] text-white self-start rounded-br-none" : "bg-white dark:bg-[#151C24] text-[#1B1B2F] dark:text-[#E4DFD4] self-end rounded-bl-none border border-[#DDD9D0] dark:border-[#232E3B]"
                          )}
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p>
                                    {React.Children.map(children, child => 
                                      typeof child === 'string' ? formatText(child) : child
                                    )}
                                  </p>
                                )
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="bg-white dark:bg-[#151C24] p-4 rounded-2xl self-end rounded-bl-none border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                          <div className="flex gap-1">
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 bg-[#5A5A6E] rounded-full" />
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#5A5A6E] rounded-full" />
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#5A5A6E] rounded-full" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2 pt-4 border-t dark:border-[#232E3B]">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder="پرسیارەکەت بنووسە..." 
                        className="flex-1 p-3 rounded-full border-2 border-[#DDD9D0] dark:border-[#232E3B] bg-[#EDEAE3] dark:bg-[#1A2330] text-sm text-[#1B1B2F] dark:text-[#E4DFD4] outline-none focus:border-[#2A8B8B]"
                      />
                      <button 
                        onClick={handleSendChat}
                        disabled={isTyping}
                        className="w-11 h-11 rounded-full bg-[#2A8B8B] text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {currentSubPage === "qr" && !selectedSurah && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A6E]" />
                      <input 
                        type="text" 
                        value={surahSearch}
                        onChange={(e) => setSurahSearch(e.target.value)}
                        placeholder="گەڕان لە سورەتەکان..." 
                        className="w-full pr-10 pl-4 py-3 rounded-full border-2 border-[#DDD9D0] dark:border-[#232E3B] bg-[#EDEAE3] dark:bg-[#1A2330] text-sm outline-none focus:border-[#2A8B8B]"
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {["all", "مەككە", "مەدینە"].map(t => (
                        <button 
                          key={t}
                          onClick={() => setSurahFilter(t)}
                          className={cn(
                            "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-all",
                            surahFilter === t ? "bg-gold/10 text-gold-dark border-gold" : "bg-[#EDEAE3] dark:bg-[#1A2330] text-[#5A5A6E] border-transparent"
                          )}
                        >
                          {t === "all" ? "هەمووی" : t}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {SURAHS
                        .filter(s => (surahFilter === "all" || s.t === surahFilter) && (s.k.includes(surahSearch) || s.a.includes(surahSearch)))
                        .map(s => (
                          <button 
                            key={s.n}
                            onClick={() => setSelectedSurah(s)}
                            className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex items-center gap-4 active:scale-98 transition-all hover:border-gold/30 group"
                          >
                            <IslamicNumber num={s.n} className="w-10 h-10" />
                            <div className="flex-1 text-right">
                              <h3 className="text-sm font-extrabold group-hover:text-gold transition-colors">{s.k}</h3>
                              <p className="text-[10px] text-[#5A5A6E] dark:text-[#8B95A5]">{s.t} — {s.y} ئایەت</p>
                            </div>
                            <div className="text-xl font-amiri font-bold text-gold-dark">{s.a}</div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {currentSubPage === "qr" && selectedSurah && (
                  <div className="space-y-6">
                    <div className="text-center py-8 border-b dark:border-[#232E3B] bg-gradient-to-b from-gold/5 to-transparent rounded-t-3xl">
                      <IslamicNumber num={selectedSurah.n} className="w-16 h-16 mx-auto mb-4" />
                      <h2 className="text-3xl font-black font-amiri text-gold-dark drop-shadow-sm">{selectedSurah.a}</h2>
                      <p className="text-xs font-bold text-[#5A5A6E] mt-2 tracking-widest uppercase">{selectedSurah.k} — {selectedSurah.y} ئایەت</p>
                      <div className="flex justify-center gap-4 mt-3 text-[10px] text-[#5A5A6E] font-medium">
                        <span className="bg-white dark:bg-[#1A2330] px-3 py-1 rounded-full border border-[#DDD9D0] dark:border-[#232E3B]">{selectedSurah.t}</span>
                        <span className="bg-white dark:bg-[#1A2330] px-3 py-1 rounded-full border border-[#DDD9D0] dark:border-[#232E3B]">جوزە {selectedSurah.j}</span>
                      </div>
                    </div>

                    {/* Reciter Selection */}
                    <div className="bg-white dark:bg-[#151C24] p-5 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 bg-gold rounded-full" />
                        <p className="text-[11px] font-black text-[#1B1B2F] dark:text-white uppercase tracking-wider">هەڵبژاردنی قاری</p>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {RECITERS.map(r => (
                          <button 
                            key={r.id}
                            onClick={() => setSelectedReciter(r)}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 flex flex-col items-center gap-1",
                              selectedReciter.id === r.id 
                                ? "bg-gold/10 text-gold-dark border-gold shadow-sm" 
                                : "bg-[#F8F9FA] dark:bg-[#1A2330] text-[#5A5A6E] border-transparent hover:border-gold/30"
                            )}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Audio Player */}
                    <div className="bg-white dark:bg-[#151C24] p-5 rounded-2xl border-2 border-gold/20 flex flex-col gap-4 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                      
                      <div className="flex items-center gap-5 z-10">
                        <button 
                          onClick={toggleQuranAudio}
                          className="w-14 h-14 rounded-full bg-gold text-white flex items-center justify-center active:scale-90 transition-all shadow-md hover:bg-gold-dark"
                        >
                          {isPlayingQuran ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                        </button>
                        
                        <div className="flex-1">
                          <p className="text-xs font-black text-gold-dark uppercase tracking-tighter">خوێندنەوەی دەنگی</p>
                          <p className="text-[11px] font-bold text-[#1B1B2F] dark:text-white mt-0.5">{selectedSurah.k} — بە دەنگی {selectedReciter.name}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              const currentIndex = SURAHS.findIndex(s => s.n === selectedSurah.n);
                              if (currentIndex > 0) {
                                setSelectedSurah(SURAHS[currentIndex - 1]);
                              }
                            }}
                            disabled={selectedSurah.n === 1}
                            className="p-2 rounded-full hover:bg-gold/10 text-gold transition-all disabled:opacity-30"
                            title="سورەتی پێشوو"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => {
                              const currentIndex = SURAHS.findIndex(s => s.n === selectedSurah.n);
                              if (currentIndex < SURAHS.length - 1) {
                                setSelectedSurah(SURAHS[currentIndex + 1]);
                              }
                            }}
                            disabled={selectedSurah.n === 114}
                            className="p-2 rounded-full hover:bg-gold/10 text-gold transition-all disabled:opacity-30"
                            title="سورەتی داهاتوو"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="z-10 space-y-1">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={audioProgress}
                          onChange={handleAudioSeek}
                          className="w-full h-1.5 bg-[#DDD9D0] dark:bg-[#232E3B] rounded-full appearance-none cursor-pointer accent-gold"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-[#5A5A6E] dark:text-[#8B95A5] px-0.5">
                          <span>{quranAudioRef.current ? formatTime(quranAudioRef.current.currentTime) : "00:00"}</span>
                          <span>{quranAudioRef.current ? formatTime(audioDuration) : "00:00"}</span>
                        </div>
                      </div>

                      <audio 
                        ref={quranAudioRef} 
                        src={getSurahAudioUrl(selectedSurah.n)} 
                        onTimeUpdate={handleAudioTimeUpdate}
                        onLoadedMetadata={handleAudioLoadedMetadata}
                        onEnded={() => {
                          setIsPlayingQuran(false);
                          // Auto play next surah
                          const currentIndex = SURAHS.findIndex(s => s.n === selectedSurah.n);
                          if (currentIndex < SURAHS.length - 1) {
                            setSelectedSurah(SURAHS[currentIndex + 1]);
                          }
                        }}
                        className="hidden"
                      />
                    </div>

                    <div className="relative p-8 rounded-3xl border-2 border-gold/20 text-center shadow-xl overflow-hidden min-h-[160px] flex flex-col justify-center">
                      <img 
                        src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&q=80&w=1000" 
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Makkah"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative z-10">
                        <div className="text-[10px] text-gold font-black tracking-[0.3em] uppercase mb-4 drop-shadow-md">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
                        <div className="text-4xl font-amiri leading-loose text-white drop-shadow-lg">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {isLoadingAyahs ? (
                        <div className="py-20 text-center space-y-4">
                          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs font-bold text-[#5A5A6E] animate-pulse">بارکردنی ئایەتەکان...</p>
                        </div>
                      ) : (
                        ayahs.map((a, i) => (
                          <div key={i} className="bg-white dark:bg-[#151C24] p-6 rounded-3xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm hover:border-gold/30 transition-all group">
                            <div className="flex items-center justify-between mb-6">
                              <IslamicNumber num={i + 1} className="w-10 h-10" />
                              <div className="h-px flex-1 mx-4 bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
                              <div className="flex gap-2">
                                <button className="p-2 rounded-full hover:bg-gold/10 text-[#5A5A6E] transition-all"><Star className="w-4 h-4" /></button>
                                <button className="p-2 rounded-full hover:bg-gold/10 text-[#5A5A6E] transition-all"><Send className="w-4 h-4" /></button>
                              </div>
                            </div>
                            
                            <div className="space-y-6">
                              <div className="text-3xl font-amiri leading-[2.2] text-right text-black dark:text-white font-medium" dir="rtl">
                                {a.ar}
                              </div>
                              
                              <div className="bg-[#FBF8F2] dark:bg-[#1A2330] p-5 rounded-2xl border-r-4 border-gold relative">
                                <div className="absolute top-2 right-2 opacity-10">
                                  <BookOpen className="w-8 h-8 text-gold" />
                                </div>
                                <p className="text-[13px] leading-[1.8] text-[#4A4A5E] dark:text-[#E4DFD4] text-justify font-medium">
                                  {formatText(a.ku)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}


                {currentSubPage === "fw" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {["هەمووی", "نماز", "ڕۆژوو", "زەکات", "حەج", "هاوسەری", "میرات", "خواردن"].map(c => (
                        <button 
                          key={c}
                          onClick={() => setFatwaCategory(c)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border-2",
                            fatwaCategory === c ? "bg-[#E4F5EC] text-[#2A8B8B] border-[#2A8B8B]" : "bg-[#EDEAE3] dark:bg-[#1A2330] text-[#5A5A6E] border-transparent"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {FATWAS
                        .filter(f => fatwaCategory === "هەمووی" || f.q.includes(fatwaCategory) || f.a.includes(fatwaCategory))
                        .map((f, i) => (
                          <div key={i} className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] border-r-4 border-r-[#2A8B8B] shadow-sm flex gap-4">
                            <IslamicNumber num={i + 1} className="w-10 h-10" />
                            <div className="flex-1">
                              <h4 className="text-[#2A8B8B] text-sm font-extrabold mb-2 leading-relaxed">{formatText(f.q)}</h4>
                              <p className="text-xs leading-relaxed text-[#5A5A6E] dark:text-[#8B95A5]">{formatText(f.a)}</p>
                              <span className={cn("inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold mt-3", f.rc === "rhwa" ? "bg-teal-100 text-teal-800" : f.rc === "rhha" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800")}>
                                {f.r}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {currentSubPage === "inh" && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#151C24] p-5 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                      <p className="text-xs text-[#1B1B2F] dark:text-[#E4DFD4] mb-4">ئەندامانی خێزانەکەت داخڵ بکە بۆ حیسابی میرات:</p>
                      <div className="space-y-3">
                        {INHERITANCE_MEMBERS.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 bg-[#EDEAE3] dark:bg-[#1A2330] rounded-xl border border-[#DDD9D0] dark:border-[#232E3B]">
                            <label className="text-xs font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">{m.l}</label>
                            <input 
                              type="number" 
                              min="0"
                              value={inheritanceValues[m.id] || 0}
                              onChange={(e) => {
                                setInheritanceValues(prev => ({ ...prev, [m.id]: parseInt(e.target.value) || 0 }));
                                setInheritanceResult(null);
                              }}
                              className="w-14 p-2 text-center rounded-lg border-2 border-[#DDD9D0] dark:border-[#232E3B] bg-white dark:bg-[#151C24] text-sm text-[#1B1B2F] dark:text-[#E4DFD4] outline-none focus:border-[#2A8B8B]"
                            />
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={handleInheritanceCalc}
                        className="w-full mt-6 bg-[#2A8B8B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Calculator className="w-4 h-4" />
                        حیساب بکە
                      </button>
                    </div>

                    {inheritanceResult && (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-br from-[#B8860B] to-[#9A7209] p-6 rounded-2xl text-white text-center shadow-lg">
                          <Calculator className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-base font-extrabold">ئەنجامەکانی حیسابی میرات</p>
                        </div>
                        {inheritanceResult.map((res, i) => (
                          <div key={i} className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex items-center gap-4">
                            <IslamicNumber num={i + 1} className="w-8 h-8" />
                            <span className="text-sm font-bold flex-1">{res.label}</span>
                            <span className="bg-[#E4F5EC] text-[#2A8B8B] px-3 py-1 rounded-full text-xs font-bold">{res.share}</span>
                          </div>
                        ))}
                        <div className="bg-[#FBF5E6] dark:bg-[#1C1808] p-4 rounded-2xl border border-[#B8860B] shadow-sm">
                          <p className="text-xs text-[#B8860B] leading-relaxed flex gap-2">
                            <Info className="w-4 h-4 shrink-0" />
                            ئەم حیسابە گشتییە و بۆ وردەکاری زیاتر تکایە سەردانی مامۆستای شەرعی بکە. حیسابی میرات لە ئیسلامدا زانستیەکی تەکنیکی و وردە.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentSubPage === "all" && (
                  <div className="space-y-4">
                    <div className="relative h-40 rounded-3xl overflow-hidden shadow-lg mb-6">
                      <img 
                        src="https://images.unsplash.com/photo-1564121211835-e88c852648ab?auto=format&fit=crop&q=80&w=1000" 
                        alt="Islamic Art" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2A8B8B]/90 to-transparent flex flex-col justify-end p-6">
                        <h2 className="text-2xl font-black text-white">ئەسمائول حوسنا</h2>
                        <p className="text-xs text-gold font-bold">٩٩ ناوی پیرۆزی خودای گەورە</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {ALLAH_NAMES.map((n) => (
                        <motion.div 
                          key={n.n}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="bg-white dark:bg-[#151C24] p-5 rounded-3xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex gap-5 items-center group hover:border-gold/30 transition-all"
                        >
                          <IslamicNumber num={n.n} className="w-12 h-12" />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <h3 className="text-2xl font-amiri font-bold text-gold-dark group-hover:scale-110 transition-transform origin-right">{n.a}</h3>
                              <span className="text-xs font-black text-[#2A8B8B] bg-[#E4F5EC] px-3 py-1 rounded-full">{n.k}</span>
                            </div>
                            <p className="text-xs text-[#5A5A6E] dark:text-[#8B95A5] leading-relaxed">{n.m}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {currentSubPage === "set" && (
                  <div className="space-y-4">
                    {user && (
                      <div className="bg-white dark:bg-[#151C24] p-4 rounded-3xl border border-[#DDD9D0] dark:border-[#232E3B] flex items-center gap-4">
                        <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-12 h-12 rounded-full border-2 border-gold/20" referrerPolicy="no-referrer" />
                        <div className="flex-1">
                          <p className="text-sm font-black text-[#2A8B8B] dark:text-gold">{user.displayName}</p>
                          <p className="text-[10px] text-[#5A5A6E] dark:text-[#8B95A5]">{user.email}</p>
                        </div>
                        <button 
                          onClick={handleLogout}
                          className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {!user && (
                      <button 
                        onClick={handleLogin}
                        className="w-full bg-[#2A8B8B] text-white p-4 rounded-3xl font-black flex items-center justify-center gap-3 shadow-lg shadow-[#2A8B8B]/20 active:scale-95 transition-all"
                      >
                        <Users className="w-5 h-5" />
                        چوونە ژوورەوە بە ئەکاونتی گۆگڵ
                      </button>
                    )}

                    <div className="space-y-2">
                    <button 
                      onClick={toggleDarkMode}
                      className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#151C24] rounded-xl border border-[#DDD9D0] dark:border-[#232E3B] active:scale-98 transition-all"
                    >
                      <Moon className="w-5 h-5 text-[#2A8B8B]" />
                      <span className="flex-1 text-right text-sm font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">دۆخی تاریک</span>
                      <div className={cn("w-11 h-6 rounded-full relative transition-all duration-300", isDarkMode ? "bg-[#2A8B8B]" : "bg-[#DDD9D0]")}>
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", isDarkMode ? "left-1" : "left-6")} />
                      </div>
                    </button>

                    <button 
                      onClick={() => handleSubNav("abt")}
                      className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#151C24] rounded-xl border border-[#DDD9D0] dark:border-[#232E3B] active:scale-98 transition-all"
                    >
                      <Info className="w-5 h-5 text-[#2A8B8B]" />
                      <span className="flex-1 text-right text-sm font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">دەربارە</span>
                      <ChevronLeft className="w-4 h-4 text-[#5A5A6E]" />
                    </button>
                    <button 
                      onClick={() => handleSubNav("abus")}
                      className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#151C24] rounded-xl border border-[#DDD9D0] dark:border-[#232E3B] active:scale-98 transition-all"
                    >
                      <Users className="w-5 h-5 text-[#2A8B8B]" />
                      <span className="flex-1 text-right text-sm font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">دەربارەی ئێمە</span>
                      <ChevronLeft className="w-4 h-4 text-[#5A5A6E]" />
                    </button>

                    <div className="p-5 bg-white dark:bg-[#151C24] rounded-xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-[#2A8B8B]">
                        <Wrench className="w-5 h-5" />
                        <span className="text-sm font-extrabold text-[#1B1B2F] dark:text-[#E4DFD4]">چۆنیەتی دابەزاندن (Installation)</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px]">Android</span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#1B1B2F] dark:text-[#E4DFD4]">
                            لە <span className="font-bold">Chrome</span> داگرە لەسەر <span className="text-gold font-bold">Add to Home Screen</span>.
                          </p>
                        </div>
                        <div className="h-px bg-gray-100 dark:bg-gray-800" />
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                            <span className="text-orange-600 dark:text-orange-400 font-bold text-[10px]">iOS</span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#1B1B2F] dark:text-[#E4DFD4]">
                            لە <span className="font-bold">Safari</span> داگرە لەسەر <span className="text-gold font-bold">Share</span> پاشان <span className="text-gold font-bold">Add to Home Screen</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                {currentSubPage === "abt" && (
                  <div className="p-4 text-sm leading-loose text-[#1B1B2F] dark:text-[#E4DFD4] text-justify">
                    ئەم ئەپە دروستکراوە بۆ پێشکەشکردنی زانیارییە دینییەکان بە شێوەیەکی سادە و باوەڕپێکراو. بەکارهێنەران دەتوانن پرسیارە شەرعییەکان بکەن و وەڵامەکان وەربگرن پشتبەستوو بە سەرچاوە باوەڕپێکراوەکان. هەروەها ئەپەکە یارمەتیدەرە بۆ فێربوونی حوکمەکان، میرات و ڕێنماییەکانی ژیان بە گوێرەی ئایین.
                    <div className="mt-10 text-center opacity-30">
                      <Home className="w-10 h-10 mx-auto text-[#2A8B8B]" />
                      <p className="text-[10px] mt-2">وەشانی ١.٠.٠</p>
                    </div>
                  </div>
                )}

                {currentSubPage === "abus" && (
                  <div className="p-4 space-y-6">
                    <div className="text-sm leading-loose text-[#1B1B2F] dark:text-[#E4DFD4] text-justify">
                      <strong className="text-[#1B1B2F] dark:text-[#E4DFD4] block mb-2">دەربارەی ئێمە</strong>
                      ئەم ئەپە دینییە دروستکراوە بۆ یارمەتیدانی خەڵک بۆ تێگەیشتنێکی باشتر لە زانیارییە دینییەکان و وەڵامدانەوەی پرسیارە شەرعییەکان بە شێوەیەکی ڕوون و باوەڕپێکراو. ئامانجمان ئەوەیە پلاتفۆرمێکی سادە و خێرا پێشکەش بکەین کە هەمووان بتوانن بە ئاسانی سوود لێی ببینن.
                      <p className="mt-4">ئەم ئەپە لەلایەن <strong>ئەلەند ئیدریس عزیز</strong> ـەوە دروستکراوە، و بیرۆکەی سەرەکییەکەش هەر لەلایەن خۆیەوە پەیدا بووە. هەوڵدراوە بە بەکارهێنانی تەکنەلۆژیی نوێ، خزمەتگوزارییەکی باش و متمانەپێکراو پێشکەش بکرێت.</p>
                    </div>
                    <div className="pt-6 border-t dark:border-[#232E3B] space-y-3">
                      <p className="font-extrabold text-sm mb-2 text-[#1B1B2F] dark:text-[#E4DFD4]">پەیوەندی</p>
                      <ContactItem icon={<Phone />} label="0771 151 5500" />
                      <ContactItem icon={<Mail />} label="alandidris0771@gmail.com" />
                      <ContactItem 
                        icon={<MessageCircle />} 
                        label="@alandidris - چوونە تێلیگرام" 
                        onClick={() => window.open('https://t.me/alandidris','_blank')}
                      />
                    </div>
                  </div>
                )}

                {currentSubPage === "tasbih" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
                    <div className="relative">
                      <div className="w-64 h-64 rounded-full border-8 border-gold/20 flex flex-col items-center justify-center bg-white dark:bg-[#151C24] shadow-2xl">
                        <span className="text-6xl font-black text-[#2A8B8B] dark:text-gold font-mono">{tasbihCount}</span>
                        <span className="text-xs font-bold text-[#5A5A6E] mt-2 uppercase tracking-widest">تەسبیحات</span>
                      </div>
                      <button 
                        onClick={() => setTasbihCount(0)}
                        className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shadow-lg active:scale-90 transition-all"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        setTasbihCount(prev => prev + 1);
                        if ("vibrate" in navigator) navigator.vibrate(50);
                      }}
                      className="w-48 h-48 rounded-full bg-gradient-to-br from-[#2A8B8B] to-[#1A5B5B] text-white shadow-[0_20px_50px_rgba(42,139,139,0.3)] flex items-center justify-center active:scale-95 active:shadow-inner transition-all border-8 border-white/10"
                    >
                      <Plus className="w-16 h-16" />
                    </button>

                    <div className="grid grid-cols-3 gap-3 w-full">
                      {[33, 99, 100].map(target => (
                        <button 
                          key={target}
                          onClick={() => showToast(`ئامانج کرا بە ${target}`)}
                          className="py-3 rounded-2xl bg-white dark:bg-[#151C24] border-2 border-[#DDD9D0] dark:border-[#232E3B] text-xs font-bold text-[#1B1B2F] dark:text-[#E4DFD4] hover:border-gold transition-all"
                        >
                          {target} جار
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentSubPage === "zakat" && (
                  <div className="p-6 space-y-8">
                    <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-8 rounded-[2.5rem] text-white shadow-xl text-center">
                      <Coins className="w-12 h-12 mx-auto mb-4 opacity-80" />
                      <h3 className="text-2xl font-black mb-2">ژمێرەری زەکات</h3>
                      <p className="text-sm opacity-90">زەکاتی ماڵ و سامانی خۆت بە ئاسانی حیساب بکە (٢.٥٪)</p>
                    </div>

                    <div className="bg-white dark:bg-[#151C24] p-6 rounded-3xl border-2 border-[#DDD9D0] dark:border-[#232E3B] space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-[#5A5A6E] uppercase tracking-wider">بڕی پارە یان سامانی گشتی</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={zakatAmount || ""}
                            onChange={(e) => setZakatAmount(Number(e.target.value))}
                            className="w-full p-4 rounded-2xl bg-[#F5F3ED] dark:bg-[#0C1015] border-2 border-transparent focus:border-gold outline-none text-xl font-bold font-mono text-[#1B1B2F] dark:text-[#E4DFD4]"
                            placeholder="0.00"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5A5A6E]">IQD / $</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          const result = zakatAmount * 0.025;
                          setZakatResult(result);
                          showToast("حیساب کرا");
                        }}
                        className="w-full py-4 bg-[#2A8B8B] text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
                      >
                        حیسابکردن
                      </button>

                      {zakatResult !== null && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="pt-6 border-t border-dashed border-gray-200 dark:border-gray-800 text-center"
                        >
                          <p className="text-xs font-bold text-[#5A5A6E] mb-1">بڕی زەکاتی پێویست</p>
                          <p className="text-4xl font-black text-[#2A8B8B] dark:text-gold font-mono">{zakatResult.toLocaleString()}</p>
                          <p className="text-[10px] text-red-500 mt-4 font-bold">تێبینی: پێویستە ماڵەکەت گەیشتبێتە نیساب و ساڵێکی بەسەردا تێپەڕیبێت.</p>
                        </motion.div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-bold text-blue-600 mb-1 uppercase">نیسابی زێڕ</p>
                        <p className="text-sm font-black">٨٥ گرام</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                        <p className="text-[10px] font-bold text-purple-600 mb-1 uppercase">نیسابی زیو</p>
                        <p className="text-sm font-black">٥٩٥ گرام</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentSubPage === "hijri" && (
                  <div className="p-6 space-y-8">
                    <div className="bg-white dark:bg-[#151C24] p-8 rounded-[2.5rem] border-2 border-[#DDD9D0] dark:border-[#232E3B] text-center shadow-sm">
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 text-[#2A8B8B] dark:text-gold" />
                      <p className="text-xs font-bold text-[#5A5A6E] uppercase tracking-widest mb-2">بەرواری ئەمڕۆی کۆچی</p>
                      <h3 className="text-3xl font-black text-[#1B1B2F] dark:text-[#E4DFD4]">
                        {new Intl.DateTimeFormat('ar-SA-u-ca-islamic-uma-nu-latn', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }).format(new Date())}
                      </h3>
                      <p className="text-sm text-[#5A5A6E] mt-2">
                        {new Intl.DateTimeFormat('ku-IQ', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }).format(new Date())}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-[#1B1B2F] dark:text-[#E4DFD4] px-2">بۆنە ئایینییەکان (٢٠٢٦ - ٢٠٢٧)</h4>
                      <div className="space-y-3">
                        {[
                          { name: "جەژنی قوربان", date: "١٠ی زولحەججە", greg: "٢٧ی ئایاری ٢٠٢٦", color: "bg-indigo-50 text-indigo-600" },
                          { name: "سەری ساڵی کۆچی", date: "١ی موحەڕەم", greg: "١٦ی حوزەیرانی ٢٠٢٦", color: "bg-blue-50 text-blue-600" },
                          { name: "ڕۆژی عاشورا", date: "١٠ی موحەڕەم", greg: "٢٥ی حوزەیرانی ٢٠٢٦", color: "bg-red-50 text-red-600" },
                          { name: "مەولودی پێغەمبەر (د.خ)", date: "١٢ی ڕەبیعولئەووەڵ", greg: "٢٥ی ئابی ٢٠٢٦", color: "bg-teal-50 text-teal-600" },
                          { name: "شەوی ئیسرا و میعراج", date: "٢٧ی ڕەجەب", greg: "٦ی کانوونی دووەمی ٢٠٢٧", color: "bg-purple-50 text-purple-600" },
                          { name: "سەرەتای مانگی ڕەمەزان", date: "١ی ڕەمەزان", greg: "٨ی شوباتی ٢٠٢٧", color: "bg-orange-50 text-orange-600" },
                          { name: "جەژنی ڕەمەزان", date: "١ی شەووال", greg: "١٠ی ئازاری ٢٠٢٧", color: "bg-gold/10 text-gold" },
                        ].map((event, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-[#151C24] rounded-2xl border-2 border-[#DDD9D0] dark:border-[#232E3B]">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${event.color.split(' ')[1].replace('text-', 'bg-')}`} />
                              <div>
                                <p className="text-sm font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">{event.name}</p>
                                <p className="text-[10px] text-[#5A5A6E]">{event.date}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#2A8B8B] dark:text-gold">{event.greg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentSubPage === "qibla" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10 overflow-hidden">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black text-[#1B1B2F] dark:text-[#E4DFD4]">قیبلەنما</h3>
                      <p className="text-xs font-bold text-[#5A5A6E] uppercase tracking-widest">مۆبایلەکەت بە ڕێکی دابنێ</p>
                    </div>

                    <div className="relative w-80 h-80 flex items-center justify-center">
                      {/* Outer Ring with Ticks */}
                      <div className="absolute inset-0 rounded-full border-[6px] border-[#DDD9D0] dark:border-[#232E3B] shadow-lg flex items-center justify-center">
                        {[...Array(72)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`absolute w-0.5 h-2 ${i % 18 === 0 ? 'h-4 w-1 bg-red-500' : i % 2 === 0 ? 'bg-[#5A5A6E]' : 'bg-[#DDD9D0] dark:bg-[#232E3B]'}`}
                            style={{ transform: `rotate(${i * 5}deg) translateY(-148px)` }}
                          />
                        ))}
                      </div>
                      
                      {/* Rotating Compass Face */}
                      <motion.div 
                        animate={{ rotate: -compassHeading }}
                        transition={{ type: "spring", stiffness: 30, damping: 20, mass: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-full h-full relative">
                          {/* Cardinal Points */}
                          <span className="absolute top-6 left-1/2 -translate-x-1/2 font-black text-red-500 text-xl">N</span>
                          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-black text-[#1B1B2F] dark:text-[#E4DFD4] text-xl">S</span>
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-[#1B1B2F] dark:text-[#E4DFD4] text-xl">W</span>
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#1B1B2F] dark:text-[#E4DFD4] text-xl">E</span>
                          
                          {/* Qibla Indicator (Fixed to the compass face) */}
                          <div 
                            style={{ transform: `rotate(${qiblaDir}deg)` }}
                            className="absolute inset-0 flex flex-col items-center pt-10"
                          >
                            <div className="w-2 h-32 bg-gold rounded-full shadow-[0_0_25px_rgba(212,175,55,0.7)] relative">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gold rounded-full border-4 border-white dark:border-[#151C24] flex items-center justify-center shadow-xl">
                                <Compass className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Fixed Center Point */}
                      <div className="absolute w-6 h-6 rounded-full bg-white dark:bg-[#1B1B2F] border-4 border-[#2A8B8B] z-10 shadow-2xl" />
                    </div>

                    <div className="flex flex-col items-center gap-6 w-full max-w-xs">
                      <div className="bg-white dark:bg-[#151C24] p-6 rounded-[2rem] border-2 border-[#DDD9D0] dark:border-[#232E3B] w-full text-center shadow-md">
                        <p className="text-xs font-bold text-[#5A5A6E] mb-1">پلەی قیبلە</p>
                        <p className="text-4xl font-black text-[#2A8B8B] dark:text-gold font-mono">{Math.round(qiblaDir)}°</p>
                      </div>

                      {!isCompassPermissionGranted && (
                        <div className="w-full space-y-4">
                          <button 
                            onClick={requestCompassPermission}
                            className="w-full py-5 bg-[#2A8B8B] text-white rounded-2xl font-black shadow-xl hover:bg-[#1A5B5B] transition-all active:scale-95 flex items-center justify-center gap-3"
                          >
                            <Navigation className="w-6 h-6" />
                            چالاککردنی کۆمپاس
                          </button>
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800">
                            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold text-center leading-relaxed">
                              تێبینی: ئەگەر کار ناکات، تکایە بەرنامەکە لە پەڕەیەکی نوێ بکەرەوە (Open in new tab) چونکە ئەم بەشە لەناو ئەم چوارچێوەیەدا ڕەنگە ڕێگری لێ بکرێت.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                          بۆ ئەنجامێکی ڕاست، مۆبایلەکەت بە تەختی ڕابگرە و دوور بکەوەرەوە لە ئامێرە موگناتیسییەکان.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentSubPage === "mosque" && (
                  <div className="p-6 space-y-8">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl text-center">
                      <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-80" />
                      <h3 className="text-2xl font-black mb-2">دۆزینەوەی مزگەوت</h3>
                      <p className="text-sm opacity-90">نزیکترین مزگەوتەکان لە دەوروبەرت بدۆزەرەوە</p>
                    </div>

                    <button 
                      onClick={() => window.open('https://www.google.com/maps/search/mosques+near+me', '_blank')}
                      className="w-full py-6 bg-white dark:bg-[#151C24] border-2 border-[#DDD9D0] dark:border-[#232E3B] rounded-3xl flex flex-col items-center justify-center gap-3 shadow-sm active:scale-95 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center">
                        <Navigation className="w-6 h-6" />
                      </div>
                      <span className="font-black text-[#1B1B2F] dark:text-[#E4DFD4]">کردنەوەی نەخشە</span>
                      <span className="text-[10px] font-bold text-[#5A5A6E] uppercase">Google Maps</span>
                    </button>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-[#1B1B2F] dark:text-[#E4DFD4] px-2">مزگەوتە ناودارەکانی کوردستان</h4>
                      <div className="space-y-3">
                        {[
                          { name: "مزگەوتی گەورەی سلێمانی", location: "سلێمانی", icon: "🕌" },
                          { name: "مزگەوتی جەلیل خەیات", location: "هەولێر", icon: "🕌" },
                          { name: "مزگەوتی گەورەی دهۆک", location: "دهۆک", icon: "🕌" },
                          { name: "مزگەوتی کاک ئەحمەدی شێخ", location: "سلێمانی", icon: "🕌" },
                        ].map((mosque, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => window.open(`https://www.google.com/maps/search/${mosque.name}`, '_blank')}
                            className="flex items-center justify-between p-4 bg-white dark:bg-[#151C24] rounded-2xl border-2 border-[#DDD9D0] dark:border-[#232E3B] active:scale-98 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{mosque.icon}</span>
                              <div>
                                <p className="text-sm font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">{mosque.name}</p>
                                <p className="text-[10px] font-bold text-[#5A5A6E]">{mosque.location}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#5A5A6E]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentSubPage === "ramadan" && (
                  <div className="p-6 space-y-8">
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-[2.5rem] text-white shadow-xl text-center relative overflow-hidden">
                      <Moon className="w-24 h-24 absolute -right-4 -top-4 opacity-20 rotate-12" />
                      <h3 className="text-2xl font-black mb-2">بەشی ڕەمەزان</h3>
                      <p className="text-sm opacity-90">خشتەی بەربانگ و پارشێو و زانیارییەکان</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white dark:bg-[#151C24] rounded-3xl border-2 border-[#DDD9D0] dark:border-[#232E3B] text-center">
                        <p className="text-[10px] font-bold text-[#5A5A6E] uppercase mb-1">پارشێو (ئیمساک)</p>
                        <p className="text-2xl font-black text-[#2A8B8B] dark:text-gold font-mono">
                          {getPrayerTimes(selectedCity).fajr ? format(getPrayerTimes(selectedCity).fajr, "HH:mm") : "--:--"}
                        </p>
                      </div>
                      <div className="p-6 bg-white dark:bg-[#151C24] rounded-3xl border-2 border-[#DDD9D0] dark:border-[#232E3B] text-center">
                        <p className="text-[10px] font-bold text-[#5A5A6E] uppercase mb-1">بەربانگ (ئیفتار)</p>
                        <p className="text-2xl font-black text-red-500 font-mono">
                          {getPrayerTimes(selectedCity).maghrib ? format(getPrayerTimes(selectedCity).maghrib, "HH:mm") : "--:--"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-[#1B1B2F] dark:text-[#E4DFD4] px-2">دوعاکانی ڕەمەزان</h4>
                      <div className="space-y-3">
                        {[
                          { title: "دوعای بەربانگ", text: "اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ" },
                          { title: "دوعای پارشێو", text: "وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ" },
                        ].map((dua, idx) => (
                          <div key={idx} className="p-5 bg-white dark:bg-[#151C24] rounded-2xl border-2 border-[#DDD9D0] dark:border-[#232E3B] space-y-2">
                            <p className="text-xs font-black text-[#2A8B8B] dark:text-gold">{dua.title}</p>
                            <p className="text-lg font-bold text-center leading-relaxed font-serif text-[#1B1B2F] dark:text-[#E4DFD4]">{dua.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-800">
                      <div className="flex items-center gap-3 mb-3">
                        <Bell className="w-5 h-5 text-amber-600" />
                        <span className="font-black text-sm text-amber-800 dark:text-amber-200">ئامۆژگاری ڕەمەزان</span>
                      </div>
                      <p className="text-xs leading-loose text-amber-700 dark:text-amber-300">
                        بەڕۆژووبوون تەنها دوورکەوتنەوە نییە لە خواردن و خواردنەوە، بەڵکو دوورکەوتنەوەیە لە هەموو کارێکی خراپ و وتنی قسەی نەشیاو.
                      </p>
                    </div>
                  </div>
                )}

                {currentSubPage === "bang" && (
                  <div className="p-4 space-y-6 max-w-2xl mx-auto">
                    <audio ref={adhanAudioRef} src={adhanAudioUrl} />
                    
                    {/* Header Section */}
                    <div className="flex justify-between items-center bg-white/5 dark:bg-black/20 p-4 rounded-3xl border border-gold/10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-gold" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-[#1B1B2F] dark:text-[#E4DFD4]">کاتی بانگەکان</h2>
                          <p className="text-[10px] font-bold text-gold opacity-80">
                            {getDayName(currentTime)} — {format(currentTime, "yyyy/MM/dd")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h2 className="text-2xl font-black text-gold font-mono">
                          {format(currentTime, "HH:mm:ss")}
                        </h2>
                      </div>
                    </div>

                    {/* Next Prayer Hero Card */}
                    <div className="relative overflow-hidden bg-[#2A8B8B] text-white p-8 rounded-[2.5rem] shadow-2xl group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 rounded-full -ml-10 -mb-10 blur-2xl" />
                      
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-6 bg-white/10 py-1.5 px-4 rounded-full border border-white/10">
                          <MapPin className="w-3.5 h-3.5 text-gold" />
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            {cities[selectedCity as keyof typeof cities].name}
                          </span>
                        </div>

                        <p className="text-xs font-bold opacity-70 mb-2 uppercase tracking-[0.2em]">بانگی داهاتوو</p>
                        <h2 className="text-6xl font-black mb-2 tracking-tighter drop-shadow-lg">
                          {format(getPrayerTimes(selectedCity, currentTime).nextTime, "HH:mm")}
                        </h2>
                        <p className="text-xl font-bold text-gold mb-8">
                          {getPrayerTimes(selectedCity, currentTime).next === "fajr" ? "بەیانی" : 
                           getPrayerTimes(selectedCity, currentTime).next === "sunrise" ? "خۆرهەڵات" :
                           getPrayerTimes(selectedCity, currentTime).next === "dhuhr" ? "نیوەڕۆ" :
                           getPrayerTimes(selectedCity, currentTime).next === "asr" ? "عەسر" :
                           getPrayerTimes(selectedCity, currentTime).next === "maghrib" ? "ئێوارە" : "خەوتنان"}
                        </p>

                        {/* Countdown Grid */}
                        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                          {(() => {
                            const times = getPrayerTimes(selectedCity, currentTime);
                            const nextPrayerTime = times.nextTime;
                            let diff = nextPrayerTime.getTime() - currentTime.getTime();
                            if (diff < 0) diff = 0;
                            const h = Math.floor(diff / (1000 * 60 * 60));
                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            const s = Math.floor((diff % (1000 * 60)) / 1000);
                            
                            return (
                              <>
                                <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                  <p className="text-[10px] opacity-60 mb-1">کاتژمێر</p>
                                  <p className="text-2xl font-black font-mono text-gold">{h.toString().padStart(2, '0')}</p>
                                </div>
                                <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                  <p className="text-[10px] opacity-60 mb-1">خولەک</p>
                                  <p className="text-2xl font-black font-mono text-gold">{m.toString().padStart(2, '0')}</p>
                                </div>
                                <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                  <p className="text-[10px] opacity-60 mb-1">چرکە</p>
                                  <p className="text-2xl font-black font-mono text-gold">{s.toString().padStart(2, '0')}</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Prayer List - Technical Grid Style */}
                    <div className="bg-white/5 dark:bg-black/20 rounded-[2rem] border border-gold/10 overflow-hidden shadow-xl">
                      <div className="p-4 border-bottom border-gold/10 bg-gold/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gold uppercase tracking-widest">خشتەی کاتەکان</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsAdhanEnabled(!isAdhanEnabled)}
                            className={cn(
                              "p-2 rounded-xl transition-all border",
                              isAdhanEnabled ? "bg-gold text-white border-gold" : "bg-white/10 border-white/10 text-gray-400"
                            )}
                          >
                            {isAdhanEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gold/5">
                        {(() => {
                          const times = getPrayerTimes(selectedCity, currentTime);
                          const prayerList = [
                            { id: "fajr", name: "بەیانی", time: times.fajr, icon: Moon },
                            { id: "sunrise", name: "خۆرهەڵات", time: times.sunrise, icon: Sun },
                            { id: "dhuhr", name: "نیوەڕۆ", time: times.dhuhr, icon: Sun },
                            { id: "asr", name: "عەسر", time: times.asr, icon: Sun },
                            { id: "maghrib", name: "ئێوارە", time: times.maghrib, icon: CloudRain },
                            { id: "isha", name: "خەوتنان", time: times.isha, icon: Moon }
                          ];

                          return prayerList.map((p) => {
                            const isNext = times.next === p.id;
                            const isPassed = p.time < currentTime && !isNext;
                            
                            return (
                              <div 
                                key={p.id}
                                className={cn(
                                  "flex items-center justify-between p-5 transition-all",
                                  isNext ? "bg-gold/10 border-l-4 border-gold" : "hover:bg-white/5",
                                  isPassed && "opacity-40"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    isNext ? "bg-gold text-white shadow-lg" : "bg-white/5 text-gold"
                                  )}>
                                    <p.icon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className={cn("text-sm font-black", isNext ? "text-gold" : "text-[#1B1B2F] dark:text-[#E4DFD4]")}>
                                      {p.name}
                                    </p>
                                    {isNext && <p className="text-[9px] font-bold text-gold animate-pulse">بانگی داهاتوو</p>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={cn("text-xl font-black font-mono", isNext ? "text-gold" : "text-[#1B1B2F] dark:text-[#E4DFD4]")}>
                                    {format(p.time, "HH:mm")}
                                  </p>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Controls & Settings */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 dark:bg-black/20 p-4 rounded-3xl border border-gold/10">
                        <p className="text-[10px] font-black text-gold mb-3 uppercase text-center">شار هەڵبژێرە</p>
                        <select 
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-[#1B1B2F] dark:text-[#E4DFD4] outline-none cursor-pointer"
                        >
                          {Object.entries(cities).map(([key, city]) => (
                            <option key={key} value={key} className="bg-white dark:bg-[#1B1B2F]">{city.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-white/5 dark:bg-black/20 p-4 rounded-3xl border border-gold/10">
                        <p className="text-[10px] font-black text-gold mb-3 uppercase text-center">دەنگی بانگ</p>
                        <select 
                          value={selectedAdhanId}
                          onChange={(e) => setSelectedAdhanId(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-[#1B1B2F] dark:text-[#E4DFD4] outline-none cursor-pointer"
                        >
                          {ADHAN_RECITERS.map((r) => (
                            <option key={r.id} value={r.id} className="bg-white dark:bg-[#1B1B2F]">{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleGpsToggle}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black transition-all border",
                          isGpsActive 
                            ? "bg-blue-500 text-white border-blue-500 shadow-lg" 
                            : "bg-white/5 border-gold/10 text-[#1B1B2F] dark:text-[#E4DFD4] hover:bg-white/10"
                        )}
                      >
                        <Navigation className={cn("w-4 h-4", isGpsActive && "animate-pulse")} />
                        {isGpsActive ? "GPS چالاکە" : "دیاریکردنی شوێن"}
                      </button>
                      
                      <button
                        onClick={() => {
                          const cityData = cities[selectedCity as keyof typeof cities];
                          fetchPrayerTimesFromApi(selectedCity, cityData.country, userCoords?.lat, userCoords?.lng);
                          setToast("کاتەکان نوێکرانەوە");
                        }}
                        disabled={isApiLoading}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all",
                          isApiLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <RefreshCw className={cn("w-4 h-4", isApiLoading && "animate-spin")} />
                        {isApiLoading ? "چاوەڕوانبە..." : "نوێکردنەوەی کاتەکان"}
                      </button>
                    </div>

                    {/* Manual Adjustments */}
                    <div className="bg-white/5 dark:bg-black/20 p-6 rounded-[2rem] border border-gold/10">
                      <div className="flex items-center gap-2 mb-4">
                        <Wrench className="w-4 h-4 text-gold" />
                        <p className="text-sm font-black text-[#1B1B2F] dark:text-[#E4DFD4]">دەستکاری کردنی کاتەکان (خولەک)</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(manualOffsets).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-[9px] font-bold text-gold opacity-70 text-center">
                              {key === "fajr" ? "بەیانی" : key === "dhuhr" ? "نیوەڕۆ" : key === "asr" ? "عەسر" : key === "maghrib" ? "ئێوارە" : "خەوتنان"}
                            </p>
                            <div className="flex items-center justify-between bg-white/5 rounded-xl p-1 border border-white/10">
                              <button 
                                onClick={() => setManualOffsets(prev => ({ ...prev, [key]: val - 1 }))}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black font-mono">{val > 0 ? `+${val}` : val}</span>
                              <button 
                                onClick={() => setManualOffsets(prev => ({ ...prev, [key]: val + 1 }))}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-center mt-4 opacity-50 italic">
                        * دەتوانیت کاتەکان بە دەستی ڕێکبخەیت ئەگەر جیاوازی هەبوو لەگەڵ کاتی ناوچەکەت
                      </p>
                    </div>

                    {/* Test Sound Button */}
                    <button 
                      onClick={() => {
                        if (adhanAudioRef.current) {
                          adhanAudioRef.current.load();
                          adhanAudioRef.current.play().catch(e => console.log("Audio blocked", e));
                          setToast("تاقیکردنەوەی دەنگی بانگ...");
                        }
                      }}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black text-[#1B1B2F] dark:text-[#E4DFD4] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 text-gold" />
                      تاقیکردنەوەی دەنگی بانگ
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Adhan Notification Modal */}
        <AnimatePresence>
          {adhanNotification && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-[#151C24] w-full max-w-xs rounded-[40px] p-8 text-center border-4 border-gold shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gold animate-pulse" />
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Volume2 className="w-10 h-10 text-gold animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-[#1B1B2F] dark:text-[#E4DFD4] mb-2">کاتی بانگی {adhanNotification.name}</h3>
                  <p className="text-lg font-mono font-bold text-gold">{adhanNotification.time}</p>
                </div>
                <p className="text-sm text-[#5A5A6E] dark:text-[#A0AEC0] mb-8 leading-relaxed">
                  ئێستا کاتی بانگی {adhanNotification.name}ـە بەپێی کاتی شاری {isGpsActive ? "شوێنی ئێستات" : cities[selectedCity as keyof typeof cities].name}
                </p>
                <button
                  onClick={() => setAdhanNotification(null)}
                  className="w-full py-4 bg-[#2A8B8B] text-white rounded-2xl font-bold shadow-lg hover:bg-[#1A5B5B] transition-all active:scale-95"
                >
                  قبوڵکردن
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="bg-white dark:bg-[#151C24] border-t border-[#DDD9D0] dark:border-[#232E3B] flex justify-around p-2 pb-[max(env(safe-area-inset-bottom,8px),8px)] shrink-0 z-[90]">
          <NavItem active={currentPage === "home"} onClick={() => handleNav("home")} icon={<Home />} label="سەرەکی" />
          <NavItem active={currentPage === "qa"} onClick={() => handleNav("qa")} icon={<MessageSquare />} label="پرسیار" />
          <NavItem active={currentPage === "bio"} onClick={() => handleNav("bio")} icon={<BookOpen />} label="ژیاننامە" />
          <NavItem active={currentPage === "had"} onClick={() => handleNav("had")} icon={<Sun />} label="فەرمودە" />
          <NavItem active={currentPage === "qz"} onClick={() => handleNav("qz")} icon={<Trophy />} label="تاقیکردنەوە" />
        </nav>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M30%200L60%2030L30%2060L0%2030Z%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%22.5%22%2F%3E%3C%2Fsvg%3E')]" />
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-all relative min-w-[64px] active:scale-90",
        active ? "text-[#2A8B8B]" : "text-[#5A5A6E] dark:text-[#A0AEC0]"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -top-2 w-5 h-0.5 bg-[#2A8B8B] rounded-full"
        />
      )}
      <div className={cn("transition-transform duration-300 flex items-center justify-center w-5 h-5", active && "scale-110")}>
        {icon}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function ServiceCard({ icon, title, desc, color, onClick }: { icon: React.ReactNode; title: React.ReactNode; desc: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white dark:bg-[#151C24] p-4 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex flex-col items-center text-center active:scale-95 transition-all"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-2", color)}>
        {icon}
      </div>
      <h3 className="text-xs font-extrabold mb-0.5 text-[#1B1B2F] dark:text-[#E4DFD4]">{title}</h3>
      <p className="text-[10px] text-[#5A5A6E] dark:text-[#A0AEC0]">{desc}</p>
    </button>
  );
}

function QuickAccessItem({ icon, title, desc, color, onClick }: { icon: React.ReactNode; title: React.ReactNode; desc: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white dark:bg-[#151C24] p-3 rounded-2xl border border-[#DDD9D0] dark:border-[#232E3B] shadow-sm flex items-center gap-3 active:scale-98 transition-all"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        {icon}
      </div>
      <div className="text-right">
        <h3 className="text-xs font-bold text-[#1B1B2F] dark:text-[#E4DFD4]">{title}</h3>
        <p className="text-[10px] text-[#5A5A6E] dark:text-[#A0AEC0]">{desc}</p>
      </div>
    </button>
  );
}

function ContactItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 bg-white dark:bg-[#151C24] rounded-xl border border-[#DDD9D0] dark:border-[#232E3B]",
        onClick && "cursor-pointer active:scale-98"
      )}
    >
      <div className="text-[#2A8B8B] w-5 h-5 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium text-[#1B1B2F] dark:text-[#E4DFD4]">{label}</span>
    </div>
  );
}
