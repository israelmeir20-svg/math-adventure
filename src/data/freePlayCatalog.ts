// src/data/freePlayCatalog.ts

export interface NoteStep {
  note: string;       // שם התو (לדוגמה: C4, G4)
  freq: number;       // תדר מדויק ב-Hz עבור Web Audio API
  duration: number;   // משך השמעה בשניות
}

export type MathPatternType = 
  | 'arithmetic_add' 
  | 'arithmetic_sub' 
  | 'geometric' 
  | 'fibonacci' 
  | 'increasing_step';

export interface ReflectionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  cookieReward: number;
  explanation: string;
}

export interface FreePlaySong {
  id: string;
  title: string;
  source: string;
  mood: 'joyful' | 'emotional' | 'classic' | 'energetic';
  suitableFor: MathPatternType[];
  notes: NoteStep[];
  reflection: ReflectionQuestion;
}

// ==========================================
// 1. קטלוג שירים חרדיים מוכרים (8-10 תווים מדויקים)
// ==========================================

export const HAREDI_FREE_PLAY_SONGS: FreePlaySong[] = [
  {
    id: 'siman-tov',
    title: 'סימן טוב ומזל טוב',
    source: 'עממי חסידי',
    mood: 'joyful',
    suitableFor: ['arithmetic_add'],
    notes: [
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'C5', freq: 523.25, duration: 0.70 },
      { note: 'B4', freq: 493.88, duration: 0.35 },
      { note: 'A4', freq: 440.00, duration: 0.35 },
      { note: 'G4', freq: 392.00, duration: 0.70 },
      { note: 'A4', freq: 440.00, duration: 0.35 },
      { note: 'B4', freq: 493.88, duration: 0.35 },
      { note: 'C5', freq: 523.25, duration: 0.80 },
    ],
    reflection: {
      question: 'איזה קסם מתמטי ניגן את "סימן טוב ומזל טוב"?',
      options: [
        'קפצנו כל פעם במספר קבוע קדימה',
        'הכפלנו כל מספר פי 2',
        'חיברנו את שני המספרים הקודמים',
      ],
      correctIndex: 0,
      cookieReward: 15,
      explanation: 'מצוין! הלכת בסדרה חשבונית עם קפיצות קבועות.',
    },
  },
  {
    id: 'vehi-sheamda',
    title: 'והיא שעמדה',
    source: 'יונתן רזאל / חב"ד',
    mood: 'emotional',
    suitableFor: ['arithmetic_add', 'fibonacci'],
    notes: [
      { note: 'E4',  freq: 329.63, duration: 0.50 },
      { note: 'G4',  freq: 392.00, duration: 0.50 },
      { note: 'B4',  freq: 493.88, duration: 0.75 },
      { note: 'A4',  freq: 440.00, duration: 0.40 },
      { note: 'G4',  freq: 392.00, duration: 0.40 },
      { note: 'F#4', freq: 369.99, duration: 0.60 },
      { note: 'E4',  freq: 329.63, duration: 0.75 },
      { note: 'B4',  freq: 493.88, duration: 0.50 },
      { note: 'C5',  freq: 523.25, duration: 0.40 },
      { note: 'B4',  freq: 493.88, duration: 0.85 },
    ],
    reflection: {
      question: 'איך המספרים עזרו לנגן את "והיא שעמדה"?',
      options: [
        'הורדנו בכל פעם כמות קבועה',
        'חיברנו בכל פעם את שני המספרים הקודמים',
        'הכפלנו כל פעם פי 3',
      ],
      correctIndex: 1,
      cookieReward: 25,
      explanation: 'מדהים! זוהי סדרת פיבונאצ\'י – שבה העבר בונה את העתיד.',
    },
  },
  {
    id: 'hamalach-hagoel',
    title: 'המלאך הגואל',
    source: 'לחן ר\' שלמה קרליבך',
    mood: 'classic',
    suitableFor: ['arithmetic_add', 'increasing_step'],
    notes: [
      { note: 'C4', freq: 261.63, duration: 0.45 },
      { note: 'E4', freq: 329.63, duration: 0.45 },
      { note: 'G4', freq: 392.00, duration: 0.65 },
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'A4', freq: 440.00, duration: 0.45 },
      { note: 'G4', freq: 392.00, duration: 0.70 },
      { note: 'F4', freq: 349.23, duration: 0.40 },
      { note: 'E4', freq: 329.63, duration: 0.40 },
      { note: 'D4', freq: 293.66, duration: 0.80 },
    ],
    reflection: {
      question: 'באיזה סדר התקדמו הצלילים של "המלאך הגואל"?',
      options: [
        'בכל צעד הוספנו דילוג גדול יותר',
        'קפיצות קבועות ושמירה על סדר',
        'הורדנו כל פעם 5',
      ],
      correctIndex: 1,
      cookieReward: 15,
      explanation: 'כל הכבוד! הקפיצות המסודרות יצרו שיר רגוע ונקי.',
    },
  },
  {
    id: 'ivdu-hashem',
    title: 'עבדו את ה׳ בשמחה',
    source: 'עממי חסידי',
    mood: 'energetic',
    suitableFor: ['geometric', 'arithmetic_add'],
    notes: [
      { note: 'D4', freq: 293.66, duration: 0.30 },
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'A4', freq: 440.00, duration: 0.35 },
      { note: 'B4', freq: 493.88, duration: 0.60 },
      { note: 'G4', freq: 392.00, duration: 0.35 },
      { note: 'B4', freq: 493.88, duration: 0.35 },
      { note: 'D5', freq: 587.33, duration: 0.65 },
      { note: 'C5', freq: 523.25, duration: 0.35 },
      { note: 'B4', freq: 493.88, duration: 0.70 },
    ],
    reflection: {
      question: 'איך גרמנו ל"עבדו את ה\' בשמחה" להיות כל כך קצבי?',
      options: [
        'הכפלנו מספרים וקפצנו מהר למעלה',
        'חיסרנו מספרים עד שהגענו לאפס',
        'חזרנו על אותו מספר בדיוק',
      ],
      correctIndex: 0,
      cookieReward: 20,
      explanation: 'מדויק! הכפלה מייצרת תאוצה וקצב מהיר במיוחד.',
    },
  },
  {
    id: 'shalom-aleichem',
    title: 'שלום עליכם',
    source: 'מסורתי',
    mood: 'classic',
    suitableFor: ['arithmetic_sub', 'arithmetic_add'],
    notes: [
      { note: 'D4',  freq: 293.66, duration: 0.45 },
      { note: 'G4',  freq: 392.00, duration: 0.45 },
      { note: 'B4',  freq: 493.88, duration: 0.45 },
      { note: 'A4',  freq: 440.00, duration: 0.35 },
      { note: 'G4',  freq: 392.00, duration: 0.45 },
      { note: 'F#4', freq: 369.99, duration: 0.40 },
      { note: 'E4',  freq: 329.63, duration: 0.40 },
      { note: 'D4',  freq: 293.66, duration: 0.80 },
    ],
    reflection: {
      question: 'מה החוקיות שסיימה את "שלום עליכם"?',
      options: [
        'ירדנו במדרגות קבועות (סדרה יורדת)',
        'קפצנו פי 10 בכל פעם',
        'חיברנו שלושה מספרים יחד',
      ],
      correctIndex: 0,
      cookieReward: 20,
      explanation: 'אלופה! סדרה חשבונית יורדת יוצרת סיום רגוע ומלודי.',
    },
  },
];

// ==========================================
// 2. עץ מנגינות מודולרי מתפצל (Branching Melody Tree)
// שתי פעימות ראשונות זהות שמתפצלות לפי הבחירה של הילדה
// ==========================================

export interface BranchingNode {
  ruleDetected: MathPatternType;
  branchName: string;
  notes: NoteStep[];
  reflection: ReflectionQuestion;
}

export const BRANCHING_MELODY_TREE = {
  // שני התווים הראשונים שמושמעים לכל סדרה שמתחילה ב-(למשל) 2 ו-4
  commonPrefix: [
    { note: 'D4', freq: 293.66, duration: 0.50 },
    { note: 'G4', freq: 392.00, duration: 0.50 },
  ],

  branches: {
    // פיצול 1: בחרה 6 (סדרה חשבונית +2) -> ניגון חסידי מתון (סולם פריגי)
    arithmetic_add: {
      ruleDetected: 'arithmetic_add',
      branchName: 'ניגון המדרגות הרגוע',
      notes: [
        { note: 'A4', freq: 440.00, duration: 0.45 },
        { note: 'Bb4', freq: 466.16, duration: 0.45 },
        { note: 'C5',  freq: 523.25, duration: 0.60 },
        { note: 'Bb4', freq: 466.16, duration: 0.40 },
        { note: 'A4',  freq: 440.00, duration: 0.40 },
        { note: 'G4',  freq: 392.00, duration: 0.85 },
      ],
      reflection: {
        question: 'השיר התקדם בצעדים מדודים. מה היה החוק?',
        options: ['הוספנו 2 בכל צעד', 'הכפלנו פי 2', 'הוספנו 10 בכל צעד'],
        correctIndex: 0,
        cookieReward: 15,
        explanation: 'נכון מאד! הוספת 2 בכל פעם יצרה סדרה חשבונית זוגית.',
      },
    },

    // פיצול 2: בחרה 8 (סדרה הנדסית x2) -> פריילאך חסידי קופצני ומהיר
    geometric: {
      ruleDetected: 'geometric',
      branchName: 'חגיגת ההכפלות השמחה',
      notes: [
        { note: 'B4', freq: 493.88, duration: 0.30 },
        { note: 'D5', freq: 587.33, duration: 0.30 },
        { note: 'G5', freq: 783.99, duration: 0.55 },
        { note: 'D5', freq: 587.33, duration: 0.30 },
        { note: 'B4', freq: 493.88, duration: 0.30 },
        { note: 'G4', freq: 392.00, duration: 0.65 },
      ],
      reflection: {
        question: 'המנגינה זינקה לגבהים מהר מאוד! למה?',
        options: ['כי הכפלנו פי 2 בכל צעד', 'כי הוספנו 1 בכל פעם', 'כי החסרנו מספרים'],
        correctIndex: 0,
        cookieReward: 30,
        explanation: 'תשובה מושלמת! סדרה הנדסית (כפל) גדלה בקצב מסחרר.',
      },
    },

    // פיצול 3: בחרה 6 ואז 10 (פיבונאצ'י: 4+6=10) -> ניגון דבקות מתעצם
    fibonacci: {
      ruleDetected: 'fibonacci',
      branchName: 'סולם הקסם המסתורי',
      notes: [
        { note: 'Bb4', freq: 466.16, duration: 0.45 },
        { note: 'D5',  freq: 587.33, duration: 0.50 },
        { note: 'Eb5', freq: 622.25, duration: 0.65 },
        { note: 'D5',  freq: 587.33, duration: 0.40 },
        { note: 'C5',  freq: 523.25, duration: 0.40 },
        { note: 'B4',  freq: 493.88, duration: 0.90 },
      ],
      reflection: {
        question: 'מה החוק המיוחד שבנה את המנגינה הזו?',
        options: [
          'כל מספר הוא סכום שני המספרים שלפניו',
          'הכפלנו כל מספר ב-5',
          'קפצנו רק במספרים אי-זוגיים',
        ],
        correctIndex: 0,
        cookieReward: 35,
        explanation: 'גאוני! זהו חוק פיבונאצ\'י – אחד מחוקי הטבע והמתמטיקה היפים ביותר.',
      },
    },
  },
};