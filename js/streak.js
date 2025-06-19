// streak.js
export class StreakManager {
  constructor(userId, language = 'en') {
    this.userId = userId;
    this.language = language;
    this.streak = 0;
    this.lastPracticeDate = null;
    this.startDate = null;
    this.isFirstLaunch = true;
    this.storageKey = `potok_streak_${this.userId}`;
    this.localStorageAvailable = this.checkLocalStorageAvailability();
    this.useFirebase = !!window.firebaseDb;
    window.addEventListener('firebaseReady', () => {
      this.useFirebase = true;
    });
  }

  checkLocalStorageAvailability() {
    try {
      const testKey = '__test__' + Date.now();
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async loadStreak() {
    let streakData = null;

    if (this.useFirebase && window.firebaseDb) {
      streakData = await this.loadFromFirebase();
    }

    if (!streakData && this.localStorageAvailable) {
      streakData = this.loadFromLocalStorage();
    }

    if (streakData) {
      this.streak = streakData.streak || 0;
      this.lastPracticeDate = streakData.lastPracticeDate;
      this.startDate = streakData.startDate;
      this.isFirstLaunch = streakData.isFirstLaunch ?? false;
      const needsReset = this.checkIfNeedsReset();
      if (needsReset) {
        this.resetStreak();
        await this.saveStreak();
      }
    }
  }

  async loadFromFirebase() {
    try {
      const { doc, getDoc } = window.firebaseApi;
      const docRef = doc(window.firebaseDb, 'telegram_users', this.userId.toString());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch {}
    return null;
  }

  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  checkIfNeedsReset() {
    if (!this.lastPracticeDate) return false;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    return this.lastPracticeDate !== today && this.lastPracticeDate !== yesterday;
  }

  resetStreak() {
    this.streak = 0;
    this.lastPracticeDate = null;
    this.startDate = null;
  }

  async saveStreak() {
    const streakData = {
      streak: this.streak,
      lastPracticeDate: this.lastPracticeDate,
      startDate: this.startDate,
      lastUpdate: new Date().toISOString(),
      userId: this.userId,
      isFirstLaunch: this.isFirstLaunch
    };

    if (this.useFirebase && window.firebaseDb) {
      await this.saveToFirebase(streakData);
    }

    if (this.localStorageAvailable) {
      localStorage.setItem(this.storageKey, JSON.stringify(streakData));
    }
  }

  async saveToFirebase(data) {
    try {
      const { doc, setDoc } = window.firebaseApi;
      const docRef = doc(window.firebaseDb, 'telegram_users', this.userId.toString());
      await setDoc(docRef, { ...data, totalPractices: (data.totalPractices || 0) + 1 }, { merge: true });
    } catch {}
  }

  async recordPractice(practiceType) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (this.lastPracticeDate === today) return;

    if (this.streak === 0 || this.lastPracticeDate === yesterday) {
      this.streak += 1;
      this.lastPracticeDate = today;
      if (!this.startDate) this.startDate = today;
    } else {
      this.streak = 1;
      this.lastPracticeDate = today;
      this.startDate = today;
    }

    this.isFirstLaunch = false;
    if (this.streak > 90) this.streak = 90;

    await this.saveStreak();
  }
}
